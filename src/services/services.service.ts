import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateServiceDto, UpdateServiceDto } from "./dto/service.dto";

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.serviceEntity.findMany({ orderBy: { createdAt: "asc" } });
  }

  async findById(id: string) {
    const service = await this.prisma.serviceEntity.findUnique({ where: { id } });
    if (!service) throw new NotFoundException("Service not found");
    return service;
  }

  create(dto: CreateServiceDto) {
    return this.prisma.serviceEntity.create({ data: dto });
  }

  async update(id: string, dto: UpdateServiceDto) {
    await this.findById(id);
    return this.prisma.serviceEntity.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.serviceEntity.delete({ where: { id } });
  }
}
