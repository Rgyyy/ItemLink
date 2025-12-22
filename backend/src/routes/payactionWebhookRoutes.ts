import express from 'express';
import { handlePayActionWebhook } from '../controllers/payactionWebhookController';

const router = express.Router();

router.post('/webhook', handlePayActionWebhook);

export default router;
