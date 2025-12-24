import { Router } from 'express';
import {
  createReport,
  getMyReports,
  getReportById
} from '../controllers/reportController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, createReport);
router.get('/my', authenticate, getMyReports);
router.get('/:id', authenticate, getReportById);

export default router;
