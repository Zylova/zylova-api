import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBundleDto, UpdateBundleDto } from './dto/bundle.dto';

@Injectable()
export class BundleService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const now = new Date();
    return this.prisma.bundle.findMany({
      where: {
        active: true,
        AND: [
          { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
          { OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
        ],
      },
      include: {
        products: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllAdmin() {
    return this.prisma.bundle.findMany({
      include: {
        products: {
          include: { product: { select: { id: true, name: true, price: true, image: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const bundle = await this.prisma.bundle.findUnique({
      where: { id },
      include: {
        products: {
          include: { product: true },
        },
      },
    });
    if (!bundle) throw new NotFoundException('Bundle not found');
    return bundle;
  }

  async findBySlug(slug: string) {
    const bundle = await this.prisma.bundle.findUnique({
      where: { slug },
      include: {
        products: {
          include: { product: true },
        },
      },
    });
    if (!bundle) throw new NotFoundException('Bundle not found');
    return bundle;
  }

  async create(dto: CreateBundleDto) {
    const existing = await this.prisma.bundle.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new BadRequestException('Bundle slug already exists');

    const { productIds, validFrom, validUntil, ...data } = dto;

    return this.prisma.bundle.create({
      data: {
        ...data,
        validFrom: validFrom ? new Date(validFrom) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
        products: {
          create: productIds.map((productId) => ({ productId })),
        },
      },
      include: {
        products: {
          include: { product: true },
        },
      },
    });
  }

  async update(id: string, dto: UpdateBundleDto) {
    await this.findById(id);

    const { productIds, validFrom, validUntil, ...data } = dto;

    if (dto.slug) {
      const existing = await this.prisma.bundle.findUnique({ where: { slug: dto.slug } });
      if (existing && existing.id !== id) throw new BadRequestException('Bundle slug already exists');
    }

    if (productIds) {
      await this.prisma.bundleProduct.deleteMany({ where: { bundleId: id } });
      await this.prisma.bundleProduct.createMany({
        data: productIds.map((productId) => ({ bundleId: id, productId })),
      });
    }

    return this.prisma.bundle.update({
      where: { id },
      data: {
        ...data,
        ...(validFrom !== undefined ? { validFrom: validFrom ? new Date(validFrom) : null } : {}),
        ...(validUntil !== undefined ? { validUntil: validUntil ? new Date(validUntil) : null } : {}),
      },
      include: {
        products: {
          include: { product: true },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.bundle.delete({ where: { id } });
  }

  async calculateBundlePrice(bundleId: string) {
    const bundle = await this.findById(bundleId);
    const totalOriginal = bundle.products.reduce(
      (sum, bp) => sum + (bp.product.originalPrice ?? bp.product.price),
      0,
    );
    const discount = totalOriginal * (bundle.discountPercent / 100);
    return {
      totalOriginal,
      discount,
      totalDiscounted: totalOriginal - discount,
      discountPercent: bundle.discountPercent,
    };
  }
}
