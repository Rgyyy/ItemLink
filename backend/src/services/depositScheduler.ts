import cron from 'node-cron';
import { processAutoDepositMatching } from '../controllers/depositRequestController';

export function startDepositMatchingScheduler() {
  const cronExpression = process.env.DEPOSIT_MATCHING_CRON || '*/10 * * * *';

  console.log(`🕐 Starting deposit matching scheduler with cron: ${cronExpression}`);

  cron.schedule(cronExpression, async () => {
    try {
      console.log('🔄 Running auto deposit matching...');
      const result = await processAutoDepositMatching();
      console.log(`✅ Auto deposit matching completed - Success: ${result.success}, Failed: ${result.failed}`);
    } catch (error) {
      console.error('❌ Auto deposit matching scheduler error:', error);
    }
  });

  console.log('✅ Deposit matching scheduler started successfully');
}
