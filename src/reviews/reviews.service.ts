import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: {
    productId: string;
    email: string;
    name: string;
    rating: number;
    comment?: string;
  }) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const review = await this.prisma.review.create({
      data: {
        productId: dto.productId,
        email: dto.email,
        name: dto.name,
        rating: dto.rating,
        comment: dto.comment,
        approved: false,
      },
    });

    return review;
  }

  async findByProduct(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const approvedReviews = await this.prisma.review.findMany({
      where: { productId, approved: true },
      orderBy: { createdAt: 'desc' },
    });

    const averageRating =
      approvedReviews.length > 0
        ? approvedReviews.reduce((sum, r) => sum + r.rating, 0) /
          approvedReviews.length
        : null;

    return {
      reviews: approvedReviews,
      averageRating: averageRating,
      totalReviews: approvedReviews.length,
    };
  }

  findAll() {
    return this.prisma.review.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async approve(id: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');

    const updated = await this.prisma.review.update({
      where: { id },
      data: { approved: true },
    });

    return updated;
  }

  async delete(id: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');

    return this.prisma.review.delete({ where: { id } });
  }
}
