import { Request, Response } from 'express';
import pool from '../config/database';
import { Game, ItemCategory } from '../types';

export const getGames = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();

  try {
    const result = await client.query<Game>(
      'SELECT * FROM games WHERE is_active = true ORDER BY name'
    );

    res.json({
      success: true,
      data: { games: result.rows }
    });
  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get games',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
};

export const getGameById = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    const result = await client.query<Game>(
      'SELECT * FROM games WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Game not found'
      });
      return;
    }

    res.json({
      success: true,
      data: { game: result.rows[0] }
    });
  } catch (error) {
    console.error('Get game error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get game',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
};

export const getGameCategories = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();

  try {
    const { gameId } = req.params;

    const result = await client.query<ItemCategory>(
      'SELECT * FROM item_categories WHERE game_id = $1 ORDER BY name',
      [gameId]
    );

    res.json({
      success: true,
      data: { categories: result.rows }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get categories',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
};
