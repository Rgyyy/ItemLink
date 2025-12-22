import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { DepositRequestStatus, DepositMatchStatus } from '@prisma/client';
import crypto from 'crypto';

interface PayActionWebhookPayload {
  order_number: string;
  order_amount?: number;
  billing_name?: string;
  status?: string;
  order_status?: string; // PayAction이 실제로 보내는 필드: "매칭완료"
  payment_date?: string;
  processing_date?: string; // PayAction이 실제로 보내는 필드
  [key: string]: any;
}

/**
 * PayAction Webhook 핸들러
 * PayAction에서 입금 확인 시 webhook으로 알림을 받아 자동으로 마일리지를 충전합니다.
 */
export const handlePayActionWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🔔 PayAction webhook received!');
    console.log('📦 Full payload:', JSON.stringify(req.body, null, 2));
    console.log('📋 Headers:', JSON.stringify(req.headers, null, 2));

    const webhookKey = process.env.PAYACTION_WEBHOOK_KEY;

    if (!webhookKey) {
      console.error('❌ PAYACTION_WEBHOOK_KEY is not configured');
      res.status(500).json({
        status: 'error',
        message: 'Webhook configuration error'
      });
      return;
    }

    const signature = req.headers['x-webhook-signature'] as string;

    if (signature) {
      const computedSignature = crypto
        .createHmac('sha256', webhookKey)
        .update(JSON.stringify(req.body))
        .digest('hex');

      console.log('🔐 Signature verification:');
      console.log('  Received:', signature);
      console.log('  Computed:', computedSignature);

      if (signature !== computedSignature) {
        console.error('❌ Invalid webhook signature');
        res.status(401).json({
          status: 'error',
          message: 'Invalid signature'
        });
        return;
      }
      console.log('✅ Signature verified');
    } else {
      console.log('⚠️ No signature provided in webhook');
    }

    const payload: PayActionWebhookPayload = req.body;

    console.log('📩 Processing order:', payload.order_number);
    console.log('💰 Amount:', payload.order_amount);
    console.log('👤 Billing name:', payload.billing_name);
    console.log('📊 Status:', payload.status);
    console.log('📊 Order Status (Korean):', payload.order_status);

    if (!payload.order_number) {
      console.error('❌ Missing order_number in payload');
      res.status(400).json({
        status: 'error',
        message: 'order_number is required'
      });
      return;
    }

    console.log('🔍 Searching for deposit request with order_number:', payload.order_number);

    const depositRequest = await prisma.depositRequest.findFirst({
      where: {
        bankdaOrderId: payload.order_number
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            balance: true
          }
        }
      }
    });

    if (!depositRequest) {
      console.error(`❌ Deposit request not found for order: ${payload.order_number}`);
      console.log('💡 Checking all deposit requests with bankdaOrderId...');
      const allOrders = await prisma.depositRequest.findMany({
        where: {
          bankdaOrderId: { not: null }
        },
        select: {
          id: true,
          bankdaOrderId: true,
          amount: true,
          depositorName: true
        },
        take: 10,
        orderBy: { createdAt: 'desc' }
      });
      console.log('Recent orders in DB:', JSON.stringify(allOrders, null, 2));

      res.status(404).json({
        status: 'error',
        message: 'Deposit request not found'
      });
      return;
    }

    console.log('✅ Found deposit request:', {
      id: depositRequest.id,
      userId: depositRequest.userId,
      amount: depositRequest.amount.toString(),
      depositorName: depositRequest.depositorName,
      status: depositRequest.status,
      currentBalance: depositRequest.user.balance.toString()
    });

    if (depositRequest.status === DepositRequestStatus.APPROVED) {
      console.log(`⚠️ Order ${payload.order_number} already processed`);
      res.status(200).json({
        status: 'success',
        message: 'Already processed'
      });
      return;
    }

    console.log('🔄 Current status:', depositRequest.status);
    console.log('📊 Webhook status:', payload.status);
    console.log('📊 Webhook order_status:', payload.order_status);

    // PayAction은 order_status로 "매칭완료"를 보냅니다
    const isCompleted =
      payload.status === 'completed' ||
      payload.status === 'paid' ||
      payload.order_status === '매칭완료';

    console.log('✔️ Is completed?', isCompleted);

    if (isCompleted) {
      console.log('💳 Starting mileage charge transaction...');
      await prisma.$transaction(async (tx) => {
        await tx.depositRequest.update({
          where: { id: depositRequest.id },
          data: {
            status: DepositRequestStatus.APPROVED,
            autoMatched: true,
            processedAt: new Date()
          }
        });

        await tx.user.update({
          where: { id: depositRequest.userId },
          data: {
            balance: {
              increment: depositRequest.amount
            }
          }
        });

        await tx.paymentTransaction.create({
          data: {
            userId: depositRequest.userId,
            type: 'DEPOSIT',
            amount: depositRequest.amount,
            status: 'COMPLETED',
            paymentMethod: 'BANK_TRANSFER',
            description: `PayAction auto-confirmed - Order: ${payload.order_number}`,
            completedAt: new Date(),
            metadata: {
              depositRequestId: depositRequest.id,
              payactionOrderNumber: payload.order_number,
              payactionPayload: payload,
              webhookReceived: true
            }
          }
        });

        await tx.depositMatchingLog.create({
          data: {
            depositRequestId: depositRequest.id,
            bankdaOrderId: payload.order_number,
            bankTransactionDate: payload.payment_date ? new Date(payload.payment_date) : new Date(),
            amount: depositRequest.amount,
            depositorName: payload.billing_name || depositRequest.depositorName,
            matchStatus: DepositMatchStatus.CONFIRMED,
            matchedAt: new Date(),
            metadata: {
              payactionWebhook: payload,
              autoConfirmed: true
            }
          }
        });

        console.log('💾 Transaction completed successfully');
      });

      const updatedUser = await prisma.user.findUnique({
        where: { id: depositRequest.userId },
        select: { balance: true }
      });

      console.log('✅✅✅ PayAction webhook processed successfully! ✅✅✅');
      console.log(`   Order: ${payload.order_number}`);
      console.log(`   User: ${depositRequest.user.username}`);
      console.log(`   Amount charged: ${depositRequest.amount}`);
      console.log(`   Previous balance: ${depositRequest.user.balance}`);
      console.log(`   New balance: ${updatedUser?.balance}`);

      // PayAction이 기대하는 응답 형식
      res.status(200).json({
        status: 'success',
        message: 'OK'
      });
    } else {
      console.log(`⏸️ PayAction webhook status not completed`);
      console.log(`   status: ${payload.status}`);
      console.log(`   order_status: ${payload.order_status}`);
      console.log('❌ Mileage NOT charged - waiting for completed status or "매칭완료"');

      res.status(200).json({
        status: 'success',
        message: 'Webhook received but not processed'
      });
    }
  } catch (error) {
    console.error('❌❌❌ PayAction webhook error! ❌❌❌');
    console.error('Error details:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to process webhook',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
