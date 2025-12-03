import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { Transaction } from '../types';

export const createTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userId = req.user?.userId;
    const { item_id, quantity, payment_method, meeting_location, notes } = req.body;

    if (!item_id || !quantity) {
      res.status(400).json({
        success: false,
        message: 'Item ID and quantity are required'
      });
      return;
    }

    const itemResult = await client.query(
      'SELECT * FROM items WHERE id = $1 AND status = $2',
      [item_id, 'available']
    );

    if (itemResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({
        success: false,
        message: 'Item not found or not available'
      });
      return;
    }

    const item = itemResult.rows[0];

    if (item.seller_id === userId) {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        message: 'Cannot buy your own item'
      });
      return;
    }

    if (item.quantity < quantity) {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        message: 'Insufficient quantity available'
      });
      return;
    }

    const total_price = item.price * quantity;

    const transactionResult = await client.query<Transaction>(
      `INSERT INTO transactions (item_id, seller_id, buyer_id, quantity, total_price, payment_method, meeting_location, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [item_id, item.seller_id, userId, quantity, total_price, payment_method || null, meeting_location || null, notes || null]
    );

    const newQuantity = item.quantity - quantity;
    const newStatus = newQuantity === 0 ? 'sold' : 'available';

    await client.query(
      'UPDATE items SET quantity = $1, status = $2 WHERE id = $3',
      [newQuantity, newStatus, item_id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: { transaction: transactionResult.rows[0] }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create transaction',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
};

export const getTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await pool.connect();

  try {
    const userId = req.user?.userId;
    const { type = 'all', status, page = '1', limit = '20' } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let query = `
      SELECT t.*, i.title as item_title, i.images as item_images,
             seller.username as seller_username,
             buyer.username as buyer_username
      FROM transactions t
      JOIN items i ON t.item_id = i.id
      JOIN users seller ON t.seller_id = seller.id
      JOIN users buyer ON t.buyer_id = buyer.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (type === 'sales') {
      query += ` AND t.seller_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    } else if (type === 'purchases') {
      query += ` AND t.buyer_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    } else {
      query += ` AND (t.seller_id = $${paramIndex} OR t.buyer_id = $${paramIndex})`;
      params.push(userId);
      paramIndex++;
    }

    if (status) {
      query += ` AND t.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY t.created_at DESC`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string), offset);

    const result = await client.query(query, params);

    const countQuery = `
      SELECT COUNT(*) FROM transactions t
      WHERE ${type === 'sales' ? 't.seller_id = $1' :
              type === 'purchases' ? 't.buyer_id = $1' :
              '(t.seller_id = $1 OR t.buyer_id = $1)'}
    `;
    const countResult = await client.query(countQuery, [userId]);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        transactions: result.rows,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transactions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
};

export const getTransactionById = async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await pool.connect();

  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const result = await client.query<Transaction>(
      `SELECT t.*, i.title as item_title, i.description as item_description, i.images as item_images,
              seller.username as seller_username, seller.phone as seller_phone,
              buyer.username as buyer_username, buyer.phone as buyer_phone
       FROM transactions t
       JOIN items i ON t.item_id = i.id
       JOIN users seller ON t.seller_id = seller.id
       JOIN users buyer ON t.buyer_id = buyer.id
       WHERE t.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
      return;
    }

    const transaction = result.rows[0];

    if (transaction.seller_id !== userId && transaction.buyer_id !== userId && req.user?.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Not authorized to view this transaction'
      });
      return;
    }

    res.json({
      success: true,
      data: { transaction }
    });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transaction',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
};

export const updateTransactionStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await pool.connect();

  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({
        success: false,
        message: 'Status is required'
      });
      return;
    }

    const validStatuses = ['pending', 'payment_waiting', 'payment_completed', 'in_delivery', 'delivered', 'completed', 'cancelled', 'refunded'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
      return;
    }

    const checkResult = await client.query(
      'SELECT seller_id, buyer_id FROM transactions WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
      return;
    }

    const transaction = checkResult.rows[0];
    if (transaction.seller_id !== userId && transaction.buyer_id !== userId && req.user?.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Not authorized to update this transaction'
      });
      return;
    }

    const updateFields: string[] = ['status = $1'];
    const params: any[] = [status];

    if (status === 'completed') {
      updateFields.push('completed_at = CURRENT_TIMESTAMP');
    }

    const result = await client.query<Transaction>(
      `UPDATE transactions SET ${updateFields.join(', ')} WHERE id = $2 RETURNING *`,
      [...params, id]
    );

    res.json({
      success: true,
      message: 'Transaction status updated successfully',
      data: { transaction: result.rows[0] }
    });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update transaction',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
};
