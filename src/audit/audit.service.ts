import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    action: string;
    entity: string;
    entityId?: string;
    adminId?: string;
    adminEmail?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.auditLog.create({ data: params as any });
  }
}
