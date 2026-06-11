import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { EventsGateway } from '../events/events.gateway';
import { PaymentService } from '../payment/payment.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
    private readonly paymentService: PaymentService,
    private readonly auditService: AuditService,
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
    await this.auditService.log({
      action: 'update_user_status',
      entity: 'user',
      entityId: id,
      metadata: { role: data.role, banned: data.banned },
    });
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

    const updated = await this.prisma.contactSubmission.update({
      where: { id },
      data: { status },
    });
    await this.auditService.log({
      action: 'update_contact_status',
      entity: 'contact',
      entityId: id,
      metadata: { status },
    });
    return updated;
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

    await this.auditService.log({
      action: 'update_order_status',
      entity: 'order',
      entityId: id,
      metadata: { status, refundReason },
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
    await this.auditService.log({
      action: 'update_product_status',
      entity: 'product',
      entityId: id,
      metadata: { status, rejectReason },
    });
    this.events.notifyProductUpdated(updated);
    this.events.notifyStatsUpdated(await this._computeStats());
    return { product: updated };
  }

  async getStats() {
    const stats = await this._computeStats();
    const revenueByMonth = await this.getRevenueByMonth();
    this.events.notifyStatsUpdated(stats);
    return { ...stats, revenueByMonth };
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

  private async getRevenueByMonth() {
    const orders = await this.prisma.order.findMany({
      where: { status: 'paid' },
      select: { total: true, createdAt: true },
    });

    const monthlyMap = new Map<string, { revenue: number; orders: number }>();

    for (const order of orders) {
      const monthKey = order.createdAt.toISOString().slice(0, 7);
      const entry = monthlyMap.get(monthKey) || { revenue: 0, orders: 0 };
      entry.revenue += order.total || 0;
      entry.orders += 1;
      monthlyMap.set(monthKey, entry);
    }

    return Array.from(monthlyMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  async notifyStats() {
    const stats = await this._computeStats();
    this.events.notifyStatsUpdated(stats);
    return stats;
  }

  async listNewsletterSubscribers() {
    return this.prisma.newsletterSubscriber.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrders(page = 1, limit = 20, search?: string, status?: string) {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { id: { contains: search } },
      ];
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where: where as any }),
    ]);

    return { orders, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getAuditLogs(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count(),
    ]);
    return { logs, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async exportOrdersCSV(): Promise<string> {
    const orders = await this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const header = 'ID,Email,Items,Amount,Currency,Status,Created At\n';
    const rows = orders
      .map((o) => {
        const items = o.items as Array<{
          product?: { name?: string };
          name?: string;
        }>;
        const itemNames = items
          .map((i) => i.product?.name || i.name || 'Unknown')
          .join('; ');
        return `${o.id},"${o.email}","${itemNames}",${o.total},USD,${o.status},${o.createdAt.toISOString()}`;
      })
      .join('\n');

    return header + rows;
  }

  async exportUsersCSV(): Promise<string> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const header = 'ID,Name,Email,Role,Banned,Created At\n';
    const rows = users
      .map(
        (u) =>
          `${u.id},"${u.name || ''}",${u.email},${u.role},${u.banned},${u.createdAt.toISOString()}`,
      )
      .join('\n');

    return header + rows;
  }

  async resetUsers(emails: string[]) {
    await this.prisma.user.deleteMany();
    const created: Array<{ id: string; email: string }> = [];

    for (const email of emails) {
      const hash = await bcrypt.hash('admin123', 10);
      const user = await this.prisma.user.create({
        data: {
          email,
          password: hash,
          name: email.split('@')[0],
          role: 'ADMIN',
        },
      });
      created.push(user);
    }

    await this.auditService.log({
      action: 'reset_users',
      entity: 'user',
      metadata: { count: created.length },
    });
    await this.notifyStats();
    return {
      message: `Deleted all users, created ${created.length} admin(s)`,
      users: created.map((u) => u.email),
    };
  }
}
