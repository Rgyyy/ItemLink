import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as reviewController from '../controllers/reviewController';

const router = Router();

// Review routes
router.post('/', authenticate, reviewController.createReview);
router.get('/', reviewController.getReviews);
router.get('/:id', reviewController.getReviewById);
router.put('/:id', authenticate, reviewController.updateReview);
router.delete('/:id', authenticate, reviewController.deleteReview);

// User rating routes
router.get('/user/:userId/rating', reviewController.getUserRating);

export default router;
