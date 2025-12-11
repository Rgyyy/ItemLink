import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import * as adminController from '../controllers/adminController';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// Dashboard
router.get('/dashboard/stats', adminController.getDashboardStats);

// Users Management
router.get('/users', adminController.getAllUsers);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Items Management
router.get('/items', adminController.getAllItems);
router.put('/items/:id', adminController.updateItem);
router.delete('/items/:id', adminController.deleteItem);

// Games Management
router.get('/games', adminController.getAllGames);
router.post('/games', adminController.createGame);
router.put('/games/:id', adminController.updateGame);
router.delete('/games/:id', adminController.deleteGame);

// Transactions Management
router.get('/transactions', adminController.getAllTransactions);
router.put('/transactions/:id', adminController.updateTransaction);

// Reviews Management
router.get('/reviews', adminController.getAllReviews);
router.delete('/reviews/:id', adminController.deleteReview);

export default router;
