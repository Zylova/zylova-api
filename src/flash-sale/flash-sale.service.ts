import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFlashSaleDto, UpdateFlashSaleDto } from './dto/flash-sale.dto';

@Injectable()
export class FlashSaleService {
  constructor(private readonly prisma: PrismaService) {}

  async findActive() {
    const now = new Date();
    return this.prisma.flashSale.findMany({
      where: {
        active: true,
        startTime: { lte: now },
        endTime: { gte: now },
      },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllAdmin() {
    return this.prisma.flashSale.findMany({
      include: { product: { select: { id: true, name: true, price: true, image: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const sale = await this.prisma.flashSale.findUnique({
      where: { id },
      include: { product: true },
    });
    if (!sale) throw new NotFoundException('Flash sale not found');
    return sale;
  }

  async create(dto: CreateFlashSaleDto) {
    return this.prisma.flashSale.create({
      data: {
        productId: dto.productId,
        discountPercent: dto.discountPercent,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        active: dto.active ?? true,
      },
      include: { product: true },
    });
  }

  async update(id: string, dto: UpdateFlashSaleDto) {
    await this.findById(id);
    return this.prisma.flashSale.update({
      where: { id },
      data: {
        ...(dto.discountPercent !== undefined ? { discountPercent: dto.discountPercent } : {}),
        ...(dto.startTime !== undefined ? { startTime: new Date(dto.startTime) } : {}),
        ...(dto.endTime !== undefined ? { endTime: new Date(dto.endTime) } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
      include: { product: true },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.flashSale.delete({ where: { id } });
  }

  async getProductSale(productId: string) {
    const now = new Date();
    return this.prisma.flashSale.findFirst({
      where: {
        productId,
        active: true,
        startTime: { lte: now },
        endTime: { gte: now },
      },
    });
  }
}
