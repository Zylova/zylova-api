import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChangelogService {
  constructor(private readonly prisma: PrismaService) {}

  async findByProduct(productId: string) {
    return this.prisma.changelog.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(productId: string, version: string, content: string) {
    return this.prisma.changelog.create({
      data: { productId, version, content },
    });
  }

  async update(id: string, version: string, content: string) {
    const existing = await this.prisma.changelog.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Changelog entry not found');
    return this.prisma.changelog.update({
      where: { id },
      data: { version, content },
    });
  }

  async delete(id: string) {
    return this.prisma.changelog.delete({ where: { id } });
  }
}
