import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateFaqDto,
  UpdateFaqDto,
  FaqQueryDto,
} from './dto/faq.dto';

@Injectable()
export class FaqService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query?: FaqQueryDto) {
    const where: Record<string, unknown> = {};
    if (query?.productId) where.productId = query.productId;
    return this.prisma.productFaq.findMany({
      where: where as any,
      orderBy: { order: 'asc' },
    });
  }

  async findById(id: string) {
    const faq = await this.prisma.productFaq.findUnique({ where: { id } });
    if (!faq) throw new NotFoundException('FAQ not found');
    return faq;
  }

  create(dto: CreateFaqDto & { productId: string }) {
    return this.prisma.productFaq.create({ data: dto });
  }

  async update(id: string, dto: UpdateFaqDto) {
    await this.findById(id);
    return this.prisma.productFaq.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.productFaq.delete({ where: { id } });
  }
}
