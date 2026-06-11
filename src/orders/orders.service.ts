import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuid } from 'uuid';
import { EventsGateway } from '../events/events.gateway';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
  ) {}

  async create(dto: CreateOrderDto) {
    const downloadToken = uuid();
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
        status: 'paid',
      },
    });

    this.events.notifyNewOrder(order);
    return order;
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

    this.events.notifyOrderUpdated(updated);
    return updated;
  }
}
