import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto, UpdateCartItemDto, SyncCartDto } from './dto/cart.dto';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.cartItem.findMany({
      where: { userId },
      include: { product: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addItem(userId: string, dto: AddToCartDto) {
    const quantity = dto.quantity ?? 1;

    const existing = await this.prisma.cartItem.findUnique({
      where: { userId_productId: { userId, productId: dto.productId } },
    });

    if (existing) {
      return this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + quantity },
        include: { product: true },
      });
    }

    return this.prisma.cartItem.create({
      data: { userId, productId: dto.productId, quantity },
      include: { product: true },
    });
  }

  async updateQuantity(userId: string, productId: string, dto: UpdateCartItemDto) {
    const item = await this.prisma.cartItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (!item) throw new NotFoundException('Cart item not found');

    if (dto.quantity <= 0) {
      await this.prisma.cartItem.delete({ where: { id: item.id } });
      return { removed: true };
    }

    return this.prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity: dto.quantity },
      include: { product: true },
    });
  }

  async removeItem(userId: string, productId: string) {
    const item = await this.prisma.cartItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (!item) throw new NotFoundException('Cart item not found');
    await this.prisma.cartItem.delete({ where: { id: item.id } });
    return { removed: true };
  }

  async clear(userId: string) {
    await this.prisma.cartItem.deleteMany({ where: { userId } });
    return { cleared: true };
  }

  async sync(userId: string, dto: SyncCartDto) {
    const items = await Promise.all(
      dto.items.map(async (item) => {
        const existing = await this.prisma.cartItem.findUnique({
          where: { userId_productId: { userId, productId: item.productId } },
        });
        if (existing) {
          return this.prisma.cartItem.update({
            where: { id: existing.id },
            data: { quantity: existing.quantity + item.quantity },
            include: { product: true },
          });
        }
        return this.prisma.cartItem.create({
          data: { userId, productId: item.productId, quantity: item.quantity },
          include: { product: true },
        });
      }),
    );
    return items;
  }
}
