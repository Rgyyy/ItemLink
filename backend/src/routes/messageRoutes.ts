import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as messageController from '../controllers/messageController';

const router = Router();

// All message routes require authentication
router.use(authenticate);

// Message routes
router.post('/', messageController.sendMessage);
router.get('/transaction/:transactionId', messageController.getMessages);
router.get('/unread-count', messageController.getUnreadCount);
router.patch('/:id/read', messageController.markAsRead);

export default router;
