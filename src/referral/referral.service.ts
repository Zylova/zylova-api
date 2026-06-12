import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateCode(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.referralCode) return user.referralCode;

    const code = this.generateCode(user.name);
    await this.prisma.user.update({
      where: { id: userId },
      data: { referralCode: code },
    });
    return code;
  }

  async getReferralInfo(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true, referralCommission: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const code = user.referralCode || await this.getOrCreateCode(userId);

    const [referrals, totalCommission, pendingCommission] = await Promise.all([
      this.prisma.referral.findMany({
        where: { referrerId: userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          refereeEmail: true,
          status: true,
          commission: true,
          orderAmount: true,
          createdAt: true,
          paidAt: true,
        },
      }),
      this.prisma.referral.aggregate({
        where: { referrerId: userId, status: 'paid' },
        _sum: { commission: true },
      }),
      this.prisma.referral.aggregate({
        where: { referrerId: userId, status: 'pending' },
        _sum: { commission: true },
      }),
    ]);

    return {
      code,
      totalReferrals: referrals.length,
      totalCommission: totalCommission._sum.commission || 0,
      pendingCommission: pendingCommission._sum.commission || 0,
      commissionRate: user.referralCommission || 10,
      referrals,
    };
  }

  async applyReferralCode(code: string, refereeEmail: string): Promise<void> {
    const referrer = await this.prisma.user.findUnique({
      where: { referralCode: code },
    });
    if (!referrer) throw new NotFoundException('Invalid referral code');

    const existing = await this.prisma.referral.findFirst({
      where: { refereeEmail, referrerId: referrer.id },
    });
    if (existing) return;

    await this.prisma.referral.create({
      data: {
        referrerId: referrer.id,
        refereeEmail,
        code,
        status: 'pending',
      },
    });

    this.logger.log(`Referral: ${refereeEmail} referred by ${referrer.email} (${code})`);
  }

  async recordReferralCommission(orderId: string, refereeEmail: string, orderAmount: number): Promise<void> {
    const referral = await this.prisma.referral.findFirst({
      where: { refereeEmail, status: 'pending' },
      include: { referrer: true },
    });
    if (!referral) return;

    const commissionRate = referral.referrer.referralCommission || 10;
    const commission = Math.round(orderAmount * (commissionRate / 100) * 100) / 100;

    await this.prisma.referral.update({
      where: { id: referral.id },
      data: {
        orderId,
        orderAmount,
        commission,
        status: commission > 0 ? 'pending' : 'completed',
      },
    });

    this.logger.log(`Referral commission: ${commission} (${commissionRate}%) for ${referral.referrer.email}`);
  }

  // Admin methods
  async adminListReferrals(page = 1, limit = 20, status?: string) {
    const where = status ? { status } : {};
    const [data, total] = await Promise.all([
      this.prisma.referral.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          referrer: { select: { id: true, email: true, name: true } },
          referee: { select: { id: true, email: true, name: true } },
        },
      }),
      this.prisma.referral.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async adminUpdateReferral(id: string, data: { status?: string; commission?: number }) {
    const referral = await this.prisma.referral.findUnique({ where: { id } });
    if (!referral) throw new NotFoundException('Referral not found');

    const updateData: Record<string, unknown> = {};
    if (data.status) updateData.status = data.status;
    if (data.commission !== undefined) updateData.commission = data.commission;
    if (data.status === 'paid') updateData.paidAt = new Date();

    return this.prisma.referral.update({
      where: { id },
      data: updateData as never,
    });
  }

  async adminGetReferralStats() {
    const [totalReferrals, pendingReferrals, paidReferrals, totalCommissions, paidCommissions] =
      await Promise.all([
        this.prisma.referral.count(),
        this.prisma.referral.count({ where: { status: 'pending' } }),
        this.prisma.referral.count({ where: { status: 'paid' } }),
        this.prisma.referral.aggregate({ _sum: { commission: true } }),
        this.prisma.referral.aggregate({
          where: { status: 'paid' },
          _sum: { commission: true },
        }),
      ]);

    return {
      totalReferrals,
      pendingReferrals,
      paidReferrals,
      totalCommissions: totalCommissions._sum.commission || 0,
      paidCommissions: paidCommissions._sum.commission || 0,
    };
  }

  private generateCode(name: string): string {
    const prefix = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 8);
    const suffix = crypto.randomBytes(3).toString('hex');
    return `${prefix}-${suffix}`;
  }
}
