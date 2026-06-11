import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LicensesService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserLicenses(email: string) {
    const orders = await this.prisma.order.findMany({
      where: { email, status: 'paid' },
      orderBy: { updatedAt: 'desc' },
    });

    return Promise.all(
      orders.map(async (order) => {
        const downloadCount = await this.prisma.downloadLog.count({
          where: { token: order.downloadToken, downloaded: true },
        });
        return {
          id: order.id,
          email: order.email,
          items: order.items,
          subtotal: order.subtotal,
          taxRate: order.taxRate,
          taxAmount: order.taxAmount,
          total: order.total,
          status: order.status,
          paymentMethod: order.paymentMethod,
          downloadToken: order.downloadToken,
          tokenExpiresAt: order.tokenExpiresAt,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          downloadCount,
        };
      }),
    );
  }

  async getLicenseById(email: string, licenseId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: licenseId, email, status: 'paid' },
    });
    if (!order) return null;

    const downloadLogs = await this.prisma.downloadLog.findMany({
      where: { token: order.downloadToken, downloaded: true },
      select: { id: true, downloadedAt: true, ip: true, productId: true, licenseKey: true },
      orderBy: { downloadedAt: 'desc' },
      take: 5,
    });

    return {
      id: order.id,
      email: order.email,
      items: order.items,
      subtotal: order.subtotal,
      taxRate: order.taxRate,
      taxAmount: order.taxAmount,
      total: order.total,
      status: order.status,
      paymentMethod: order.paymentMethod,
      downloadToken: order.downloadToken,
      tokenExpiresAt: order.tokenExpiresAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      downloadLogs,
    };
  }
}
