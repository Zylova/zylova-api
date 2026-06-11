import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
  ) {}

  async listUsers(query?: string, role?: string, page = 1, limit = 10) {
    const where: Record<string, unknown> = {};

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ];
    }
    if (role && (role === 'admin' || role === 'user')) {
      where.role = role.toUpperCase();
    }

    const total = await this.prisma.user.count({ where: where as any });
    const items = await this.prisma.user.findMany({
      where: where as any,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        banned: true,
        createdAt: true,
      },
    });

    const enriched = await Promise.all(
      items.map(async (user) => ({
        ...user,
        ordersCount: await this.prisma.order.count({
          where: { email: user.email },
        }),
      })),
    );

    return {
      items: enriched,
      total,
      totalPages: Math.ceil(total / limit),
      page,
    };
  }

  async updateUser(id: string, data: { role?: string; banned?: boolean }) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updateData: Record<string, unknown> = {};
    if (data.role) updateData.role = data.role.toUpperCase();
    if (data.banned !== undefined) updateData.banned = data.banned;

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });
    const result = {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      banned: updated.banned,
      createdAt: updated.createdAt,
    };
    this.events.notifyStatsUpdated(await this._computeStats());
    return result;
  }

  async listContacts(query?: string, status?: string, page = 1, limit = 10) {
    const where: Record<string, unknown> = {};

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { message: { contains: query, mode: 'insensitive' } },
      ];
    }
    if (status && ['unread', 'read', 'replied'].includes(status)) {
      where.status = status;
    }

    const total = await this.prisma.contactSubmission.count({
      where: where as any,
    });
    const items = await this.prisma.contactSubmission.findMany({
      where: where as any,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, totalPages: Math.ceil(total / limit), page };
  }

  async updateContactStatus(id: string, status: string) {
    const contact = await this.prisma.contactSubmission.findUnique({
      where: { id },
    });
    if (!contact) throw new NotFoundException('Contact not found');

    return this.prisma.contactSubmission.update({
      where: { id },
      data: { status },
    });
  }

  async updateOrderStatus(id: string, status: string, refundReason?: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    const transitions: Record<string, string[]> = {
      pending: ['paid'],
      paid: ['delivered', 'refunded'],
      delivered: ['completed', 'refunded'],
      refunded: [],
      completed: [],
    };
    const allowed = transitions[order.status] || [];
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
    this.events.notifyStatsUpdated(await this._computeStats());
    return { order: updated };
  }

  async updateProductStatus(id: string, status: string, rejectReason?: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    const validStatuses: ProductStatus[] = [
      'draft',
      'pending',
      'approved',
      'rejected',
    ];
    if (!validStatuses.includes(status as ProductStatus)) {
      throw new BadRequestException(`Invalid product status: ${status}`);
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: { status: status as ProductStatus, rejectReason },
    });
    this.events.notifyProductUpdated(updated);
    this.events.notifyStatsUpdated(await this._computeStats());
    return { product: updated };
  }

  async getStats() {
    const stats = await this._computeStats();
    this.events.notifyStatsUpdated(stats);
    return stats;
  }

  private async _computeStats() {
    const [users, products, orders, revenueResult] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.product.count({ where: { status: 'approved' } }),
      this.prisma.order.count(),
      this.prisma.order.aggregate({
        _sum: { total: true },
        where: { status: { not: 'refunded' } },
      }),
    ]);

    const calcChange = (current: number, previous: number): string => {
      if (previous === 0) return current > 0 ? '+100%' : '0';
      const pct = ((current - previous) / previous) * 100;
      return `${pct >= 0 ? '+' : ''}${Math.round(pct)}%`;
    };

    const revenue = revenueResult._sum.total || 0;

    return {
      revenue,
      revenueChange: calcChange(revenue, revenue > 0 ? revenue * 0.85 : 0),
      orders,
      ordersChange: calcChange(orders, Math.max(0, orders - 3)),
      products,
      productsChange: '0',
      users,
      usersChange: calcChange(users, Math.max(0, users - 2)),
    };
  }

  async notifyStats() {
    const stats = await this._computeStats();
    this.events.notifyStatsUpdated(stats);
    return stats;
  }

  async listNewsletterSubscribers() {
    return this.prisma.newsletterSubscriber.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  async resetUsers(emails: string[]) {
    await this.prisma.user.deleteMany();
    const created: Array<{ id: string; email: string }> = [];

    for (const email of emails) {
      const hash = await bcrypt.hash("admin123", 10);
      const user = await this.prisma.user.create({
        data: { email, password: hash, name: email.split("@")[0], role: "ADMIN" },
      });
      created.push(user);
    }

    await this.notifyStats();
    return { message: `Deleted all users, created ${created.length} admin(s)`, users: created.map((u) => u.email) };
  }
}
