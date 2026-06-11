import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuid } from 'uuid';
import { EventsGateway } from '../events/events.gateway';
import { EmailService } from '../email/email.service';
import { PaymentService } from '../payment/payment.service';

export class CreateOrderDto {
  email: string;
  items: { id: string; name: string; price: number; quantity: number }[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paymentMethod: string;
  stripeSession?: string;
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['paid'],
  paid: ['delivered', 'refunded'],
  delivered: ['completed', 'refunded'],
  refunded: [],
  completed: [],
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
    private readonly emailService: EmailService,
    private readonly paymentService: PaymentService,
  ) {}

  async create(dto: CreateOrderDto) {
    const downloadToken = uuid();
    const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    for (const item of dto.items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.id },
      });
      if (product?.exclusive && product.sold) {
        throw new BadRequestException(
          `"${product.name}" is an exclusive product and has already been sold.`,
        );
      }
    }

    const order = await this.prisma.order.create({
      data: {
        email: dto.email,
        items: dto.items,
        subtotal: dto.subtotal,
        taxRate: dto.taxRate,
        taxAmount: dto.taxAmount,
        total: dto.total,
        paymentMethod: dto.paymentMethod,
        downloadToken,
        stripeSession: dto.stripeSession,
        status: 'pending',
        tokenExpiresAt,
      },
    });

    return order;
  }

  async confirmPayment(downloadToken: string, stripeSession?: string) {
    const order = await this.prisma.order.findUnique({
      where: { downloadToken },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'pending') {
      throw new BadRequestException(
        `Cannot confirm payment: order status is "${order.status}"`,
      );
    }

    const updated = await this.prisma.order.update({
      where: { downloadToken },
      data: { status: 'paid', stripeSession },
    });

    for (const item of updated.items as Array<{
      id: string;
      name: string;
      price: number;
      quantity: number;
    }>) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.id },
      });
      if (product?.exclusive) {
        await this.prisma.product.update({
          where: { id: item.id },
          data: { sold: true },
        });
      }
    }

    this.events.notifyNewOrder(updated);

    try {
      await this.emailService.sendOrderConfirmation({
        email: updated.email,
        downloadToken: updated.downloadToken,
        items: updated.items as Array<{ name: string; price: number }>,
        total: updated.total,
        paymentMethod: updated.paymentMethod,
      });
    } catch (e) {
      this.logger.warn(
        `Failed to send order confirmation email: ${(e as Error).message}`,
      );
    }

    return updated;
  }

  async findByDownloadToken(token: string) {
    const order = await this.prisma.order.findUnique({
      where: { downloadToken: token },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async findAll() {
    return this.prisma.order.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findByEmail(email: string) {
    return this.prisma.order.findMany({
      where: { email },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: string, refundReason?: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    const allowed = VALID_TRANSITIONS[order.status] || [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Cannot transition from "${order.status}" to "${status}". Allowed: ${allowed.join(', ')}`,
      );
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status,
        ...(status === 'refunded' && refundReason ? { refundReason } : {}),
      },
    });

    if (status === 'refunded') {
      try {
        await this.paymentService.processRefund({
          id: order.id,
          stripeSession: order.stripeSession,
          paymentMethod: order.paymentMethod,
          total: order.total,
        });
      } catch (err) {
        this.logger.warn(
          `Payment gateway refund failed for order ${order.id}: ${(err as Error).message}`,
        );
      }
    }

    this.events.notifyOrderUpdated(updated);
    return updated;
  }
}
