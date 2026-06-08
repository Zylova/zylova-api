import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from "./dto/product.dto";

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query?: ProductQueryDto) {
    const where: Record<string, unknown> = { published: true };

    if (query?.category) where.category = query.category;
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
      ];
    }

    return this.prisma.product.findMany({ where, orderBy: { createdAt: "desc" } });
  }

  async findById(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException("Product not found");
    return product;
  }

  create(dto: CreateProductDto) {
    return this.prisma.product.create({ data: dto });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findById(id);
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.product.delete({ where: { id } });
  }
}
