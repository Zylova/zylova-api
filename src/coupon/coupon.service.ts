import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CouponService {
  constructor(private readonly prisma: PrismaService) {}

  async validate(code: string, amount: number) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });
    if (!coupon) throw new NotFoundException('Invalid coupon code');
    if (!coupon.active) throw new BadRequestException('Coupon is inactive');
    if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt))
      throw new BadRequestException('Coupon has expired');
    if (
      coupon.maxUses != null &&
      coupon.maxUses > 0 &&
      coupon.usedCount >= coupon.maxUses
    )
      throw new BadRequestException('Coupon has reached max uses');
    if (coupon.minAmount && amount < coupon.minAmount)
      throw new BadRequestException(
        `Minimum amount $${coupon.minAmount} required`,
      );

    const discount =
      coupon.discountType === 'percentage'
        ? (amount * coupon.discountValue) / 100
        : coupon.discountValue;

    return {
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discount,
      total: Math.max(0, amount - discount),
    };
  }

  async use(code: string) {
    return this.prisma.coupon.update({
      where: { code: code.toUpperCase() },
      data: { usedCount: { increment: 1 } },
    });
  }

  async create(dto: {
    code: string;
    discountType: string;
    discountValue: number;
    minAmount?: number;
    maxUses?: number;
    expiresAt?: string;
  }) {
    return this.prisma.coupon.create({
      data: { ...dto, code: dto.code.toUpperCase() },
    });
  }

  async findAll() {
    return this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async deactivate(id: string) {
    return this.prisma.coupon.update({
      where: { id },
      data: { active: false },
    });
  }
}
