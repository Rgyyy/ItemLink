import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { Item } from '../types';

export const createItem = async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await pool.connect();

  try {
    const userId = req.user?.userId;
    const {
      game_id,
      category_id,
      title,
      description,
      price,
      quantity,
      server,
      item_type,
      images
    } = req.body;

    // Validation
    if (!game_id || !title || !description || !price || !item_type) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
      return;
    }

    if (price < 0) {
      res.status(400).json({
        success: false,
        message: 'Price must be non-negative'
      });
      return;
    }

    const result = await client.query<Item>(
      `INSERT INTO items (seller_id, game_id, category_id, title, description, price, quantity, server, item_type, images)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        userId,
        game_id,
        category_id || null,
        title,
        description,
        price,
        quantity || 1,
        server || null,
        item_type,
        images || []
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Item created successfully',
      data: { item: result.rows[0] }
    });
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create item',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
};

export const getItems = async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await pool.connect();

  try {
    const {
      game_id,
      category_id,
      item_type,
      min_price,
      max_price,
      status = 'available',
      page = '1',
      limit = '20',
      sort = 'created_at',
      order = 'DESC'
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let query = `
      SELECT i.*, u.username as seller_username, g.name as game_name
      FROM items i
      JOIN users u ON i.seller_id = u.id
      JOIN games g ON i.game_id = g.id
      WHERE i.status = $1
    `;
    const params: any[] = [status];
    let paramIndex = 2;

    if (game_id) {
      query += ` AND i.game_id = $${paramIndex}`;
      params.push(game_id);
      paramIndex++;
    }

    if (category_id) {
      query += ` AND i.category_id = $${paramIndex}`;
      params.push(category_id);
      paramIndex++;
    }

    if (item_type) {
      query += ` AND i.item_type = $${paramIndex}`;
      params.push(item_type);
      paramIndex++;
    }

    if (min_price) {
      query += ` AND i.price >= $${paramIndex}`;
      params.push(min_price);
      paramIndex++;
    }

    if (max_price) {
      query += ` AND i.price <= $${paramIndex}`;
      params.push(max_price);
      paramIndex++;
    }

    const validSortFields = ['created_at', 'price', 'views'];
    const sortField = validSortFields.includes(sort as string) ? sort : 'created_at';
    const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';

    query += ` ORDER BY i.${sortField} ${sortOrder}`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string), offset);

    const result = await client.query(query, params);

    const countQuery = `SELECT COUNT(*) FROM items WHERE status = $1`;
    const countResult = await client.query(countQuery, [status]);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        items: result.rows,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get items',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
};

export const getItemById = async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    const result = await client.query<Item>(
      `SELECT i.*, u.username as seller_username, u.avatar_url as seller_avatar,
              g.name as game_name, c.name as category_name
       FROM items i
       JOIN users u ON i.seller_id = u.id
       JOIN games g ON i.game_id = g.id
       LEFT JOIN item_categories c ON i.category_id = c.id
       WHERE i.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Item not found'
      });
      return;
    }

    await client.query('UPDATE items SET views = views + 1 WHERE id = $1', [id]);

    res.json({
      success: true,
      data: { item: result.rows[0] }
    });
  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get item',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
};

export const updateItem = async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await pool.connect();

  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { title, description, price, quantity, status, images } = req.body;

    const checkResult = await client.query(
      'SELECT seller_id FROM items WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Item not found'
      });
      return;
    }

    if (checkResult.rows[0].seller_id !== userId && req.user?.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Not authorized to update this item'
      });
      return;
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex}`);
      params.push(title);
      paramIndex++;
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      params.push(description);
      paramIndex++;
    }
    if (price !== undefined) {
      updates.push(`price = $${paramIndex}`);
      params.push(price);
      paramIndex++;
    }
    if (quantity !== undefined) {
      updates.push(`quantity = $${paramIndex}`);
      params.push(quantity);
      paramIndex++;
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }
    if (images !== undefined) {
      updates.push(`images = $${paramIndex}`);
      params.push(images);
      paramIndex++;
    }

    if (updates.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
      return;
    }

    params.push(id);
    const result = await client.query<Item>(
      `UPDATE items SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    res.json({
      success: true,
      message: 'Item updated successfully',
      data: { item: result.rows[0] }
    });
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update item',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
};

export const deleteItem = async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await pool.connect();

  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const checkResult = await client.query(
      'SELECT seller_id FROM items WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Item not found'
      });
      return;
    }

    if (checkResult.rows[0].seller_id !== userId && req.user?.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Not authorized to delete this item'
      });
      return;
    }

    await client.query('DELETE FROM items WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Item deleted successfully'
    });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete item',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
};
