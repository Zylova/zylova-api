import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { v4 as uuid } from "uuid";

export class CreateOrderDto {
  email: string;
  items: { id: string; name: string; price: number; quantity: number }[];
  total: number;
  stripeSession?: string;
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrderDto) {
    const downloadToken = uuid();
    return this.prisma.order.create({
      data: {
        email: dto.email,
        items: dto.items as object,
        total: dto.total,
        downloadToken,
        stripeSession: dto.stripeSession,
        status: "paid",
      },
    });
  }

  async findByDownloadToken(token: string) {
    const order = await this.prisma.order.findUnique({
      where: { downloadToken: token },
    });
    if (!order) throw new NotFoundException("Order not found");
    return order;
  }

  async findAll() {
    return this.prisma.order.findMany({ orderBy: { createdAt: "desc" } });
  }

  async findByEmail(email: string) {
    return this.prisma.order.findMany({
      where: { email },
      orderBy: { createdAt: "desc" },
    });
  }
}
