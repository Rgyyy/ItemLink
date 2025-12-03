import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const getGames = async (req: Request, res: Response): Promise<void> => {
  try {
    const games = await prisma.game.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: { games }
    });
  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get games',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getGameById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const game = await prisma.game.findUnique({
      where: { id }
    });

    if (!game) {
      res.status(404).json({
        success: false,
        message: 'Game not found'
      });
      return;
    }

    res.json({
      success: true,
      data: { game }
    });
  } catch (error) {
    console.error('Get game error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get game',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getGameCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const { gameId } = req.params;

    const categories = await prisma.itemCategory.findMany({
      where: { gameId },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get categories',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
