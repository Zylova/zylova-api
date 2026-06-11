import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  async refundOrder(order: {
    id: string;
    stripeSession?: string | null;
    paymentMethod: string;
    total: number;
  }): Promise<{ refunded: boolean; gatewayRefundId?: string; error?: string }> {
    try {
      if (order.paymentMethod === 'stripe' && order.stripeSession) {
        const secretKey = process.env.STRIPE_SECRET_KEY;
        if (!secretKey) {
          return { refunded: false, error: 'Stripe not configured' };
        }

        const stripe = new Stripe(secretKey);
        const session = await stripe.checkout.sessions.retrieve(order.stripeSession);

        const paymentIntentId = session.payment_intent as string;
        if (!paymentIntentId) {
          return { refunded: false, error: 'No PaymentIntent found for this session' };
        }

        const refund = await stripe.refunds.create({
          payment_intent: paymentIntentId,
        });

        return { refunded: true, gatewayRefundId: refund.id };
      }

      if (order.paymentMethod === 'vnpay' || order.paymentMethod === 'momo') {
        this.logger.log(
          `Manual refund required for order ${order.id} via ${order.paymentMethod}`,
        );
        return {
          refunded: false,
          error: 'Manual refund required — please process via VNPAY/MoMo merchant portal',
        };
      }

      return { refunded: false, error: `Unsupported payment method: ${order.paymentMethod}` };
    } catch (error) {
      const message = (error as Error).message;
      this.logger.error(`Refund failed for order ${order.id}: ${message}`);
      return { refunded: false, error: message };
    }
  }

  async processRefund(order: {
    id: string;
    stripeSession?: string | null;
    paymentMethod: string;
    total: number;
  }): Promise<void> {
    const result = await this.refundOrder(order);
    if (!result.refunded) {
      throw new Error(result.error || 'Refund failed');
    }
  }
}
