import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async getWishlist(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { wishlist: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const products = await this.prisma.product.findMany({
      where: { id: { in: user.wishlist }, status: 'approved' },
      select: {
        id: true,
        name: true,
        price: true,
        image: true,
        category: true,
        rating: true,
      },
    });
    return { productIds: user.wishlist, products };
  }

  async toggle(userId: string, productId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { wishlist: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const exists = user.wishlist.includes(productId);
    const wishlist = exists
      ? user.wishlist.filter((id) => id !== productId)
      : [...user.wishlist, productId];

    await this.prisma.user.update({
      where: { id: userId },
      data: { wishlist },
    });
    return { wishlisted: !exists, wishlist };
  }
}
