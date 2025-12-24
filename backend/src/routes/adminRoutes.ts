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

// Trades Management
router.get('/trades', adminController.getAllTrades);
router.put('/trades/:id', adminController.updateTrade);
router.delete('/trades/:id', adminController.deleteTrade);

// Transactions Management
router.get('/transactions', adminController.getAllTransactions);
router.put('/transactions/:id', adminController.updateTransaction);

// Reviews Management
router.get('/reviews', adminController.getAllReviews);
router.delete('/reviews/:id', adminController.deleteReview);

// Reports Management
router.get('/reports', adminController.getReports);
router.patch('/reports/:id/process', adminController.processReport);

export default router;
