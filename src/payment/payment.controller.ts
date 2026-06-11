import { Controller, Post, Body, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { ModuleRef } from '@nestjs/core';
import { OrdersService } from '../orders/orders.service';

@ApiTags('payment')
@Controller('payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly moduleRef: ModuleRef,
  ) {}

  @Post('stripe-webhook')
  @ApiOperation({ summary: 'Stripe webhook handler' })
  async handleStripeWebhook(
    @Body() body: any,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = Buffer.from(JSON.stringify(body));
    const result = this.paymentService.handleStripeWebhook(signature, rawBody);

    if (result.downloadToken && !result.expired) {
      const ordersService = this.moduleRef.get(OrdersService, {
        strict: false,
      });
      await ordersService.confirmPayment(result.downloadToken);
    }

    return { received: true };
  }
}
