import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
} from './dto/product.dto';
import { ProductStatus } from '@prisma/client';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CacheService) private readonly cache: CacheService,
  ) {}

  async findAll(query?: ProductQueryDto) {
    const cacheKey = `products:findAll:${JSON.stringify(query || {})}`;
    const cached = await this.cache.get<{ products: unknown[]; total: number; page: number; limit: number; totalPages: number }>(cacheKey);
    if (cached) return cached;

    const where: Record<string, unknown> = { status: 'approved' };

    where.NOT = { exclusive: true, sold: true };

    if (query?.category) where.category = query.category;
    if (query?.exclude) where.id = { not: query.exclude };
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query?.minPrice || query?.maxPrice) {
      const priceFilter: Record<string, number> = {};
      if (query?.minPrice) priceFilter.gte = parseFloat(query.minPrice);
      if (query?.maxPrice) priceFilter.lte = parseFloat(query.maxPrice);
      where.price = priceFilter;
    }

    let orderBy: Record<string, string> = { createdAt: 'desc' };
    if (query?.sort) {
      switch (query.sort) {
        case 'price_asc':
          orderBy = { price: 'asc' };
          break;
        case 'price_desc':
          orderBy = { price: 'desc' };
          break;
        case 'newest':
          orderBy = { createdAt: 'desc' };
          break;
        case 'bestselling':
          orderBy = { salesCount: 'desc' };
          break;
      }
    }

    const page = Math.max(1, parseInt(query?.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query?.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: where as any,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where: where as any }),
    ]);

    const result = { products, total, page, limit, totalPages: Math.ceil(total / limit) };
    await this.cache.set(cacheKey, result, 120_000);
    return result;
  }

  async incrementView(productId: string) {
    return this.prisma.product.update({
      where: { id: productId },
      data: { viewCount: { increment: 1 } },
    });
  }

  async incrementAddToCart(productId: string) {
    return this.prisma.product.update({
      where: { id: productId },
      data: { addToCartCount: { increment: 1 } },
    });
  }

  async markAsSold(productId: string) {
    return this.prisma.product.update({
      where: { id: productId },
      data: { sold: true },
    });
  }

  findAllAdmin() {
    return this.prisma.product.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findById(id: string) {
    const cacheKey = `products:findById:${id}`;
    const cached = await this.cache.get<unknown>(cacheKey);
    if (cached) return cached;

    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    await this.cache.set(cacheKey, product, 300_000);
    return product;
  }

  create(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: { ...dto, status: 'pending' },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findById(id);
    const result = await this.prisma.product.update({ where: { id }, data: dto });
    await this.cache.deletePattern(`products:.*${id}.*`);
    await this.cache.deletePattern('products:findAll:.*');
    return result;
  }

  async updateStatus(id: string, status: ProductStatus, rejectReason?: string) {
    await this.findById(id);
    const result = await this.prisma.product.update({
      where: { id },
      data: { status, rejectReason },
    });
    await this.cache.deletePattern(`products:.*`);
    return result;
  }

  async cloneProduct(productId: string) {
    const original = await this.prisma.product.findUniqueOrThrow({ where: { id: productId } });
    const { id, createdAt, updatedAt, ...data } = original;
    const result = await this.prisma.product.create({
      data: { ...data, name: `${data.name} (Copy)`, status: 'draft', sold: false },
    });
    await this.cache.deletePattern('products:findAll:.*');
    return result;
  }

  async remove(id: string) {
    await this.findById(id);
    const result = await this.prisma.product.delete({ where: { id } });
    await this.cache.deletePattern(`products:.*`);
    return result;
  }
}
