import { ConflictException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { IsEmail } from "class-validator";

export class SubscribeDto {
  @IsEmail()
  email: string;
}

@Injectable()
export class NewsletterService {
  constructor(private readonly prisma: PrismaService) {}

  async subscribe(email: string) {
    const existing = await this.prisma.newsletterSubscriber.findUnique({ where: { email } });
    if (existing) throw new ConflictException("Email already subscribed");

    return this.prisma.newsletterSubscriber.create({ data: { email } });
  }

  findAll() {
    return this.prisma.newsletterSubscriber.findMany({ orderBy: { createdAt: "desc" } });
  }

  async unsubscribe(email: string) {
    await this.prisma.newsletterSubscriber.delete({ where: { email } });
  }

  count() {
    return this.prisma.newsletterSubscriber.count();
  }
}
