import { Router } from 'express';
import { getGames, getGameById, getGameCategories } from '../controllers/gameController';

const router = Router();

router.get('/', getGames);
router.get('/:id', getGameById);
router.get('/:gameId/categories', getGameCategories);

export default router;
