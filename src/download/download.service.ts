import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CdnService } from '../storage/cdn.service';
import * as crypto from 'crypto';

@Injectable()
export class DownloadService {
  private readonly logger = new Logger(DownloadService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly cdn: CdnService,
  ) {}

  async getDownloadInfo(token: string) {
    const order = await this.prisma.order.findUnique({
      where: { downloadToken: token },
    });
    if (!order) throw new NotFoundException('Invalid download token');
    if (order.status !== 'paid')
      throw new BadRequestException('Payment not confirmed yet');
    if (order.tokenExpiresAt && new Date() > new Date(order.tokenExpiresAt)) {
      throw new BadRequestException('Download token has expired');
    }

    const items = order.items as Array<{ id: string; name: string }>;
    const products: Array<{
      id: string;
      name: string;
      hasFile: boolean;
      downloaded: boolean;
      licenseKey: string | null;
    }> = [];

    for (const item of items) {
      const productFile = await this.prisma.productFile.findUnique({
        where: { productId: item.id },
      });
      const existingLog = await this.prisma.downloadLog.findFirst({
        where: { token, productId: item.id },
        orderBy: { createdAt: 'desc' },
      });

      products.push({
        id: item.id,
        name: item.name,
        hasFile: !!productFile,
        downloaded: existingLog?.downloaded || false,
        licenseKey: existingLog?.licenseKey || null,
      });
    }

    return { orderId: order.id, email: order.email, products, token };
  }

  private async getCountryFromIp(ip: string): Promise<string | null> {
    if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') return null;
    try {
      const res = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`, {
        signal: AbortSignal.timeout(2000),
      });
      const data = (await res.json()) as { countryCode?: string };
      return data.countryCode || null;
    } catch {
      return null;
    }
  }

  async downloadProduct(token: string, productId: string, ip?: string, userAgent?: string) {
    const order = await this.prisma.order.findUnique({
      where: { downloadToken: token },
    });
    if (!order) throw new NotFoundException('Invalid download token');
    if (order.status !== 'paid')
      throw new BadRequestException('Payment not confirmed yet');
    if (order.tokenExpiresAt && new Date() > new Date(order.tokenExpiresAt)) {
      throw new BadRequestException('Download token has expired');
    }

    const productFile = await this.prisma.productFile.findUnique({
      where: { productId },
    });
    if (!productFile) throw new NotFoundException('Product file not available');

    const existingLog = await this.prisma.downloadLog.findFirst({
      where: { token, productId },
    });
    if (existingLog?.downloaded) {
      throw new BadRequestException(
        'This product has already been downloaded. Contact support for re-download.',
      );
    }

    const licenseKey = [
      'ZYL',
      crypto.randomBytes(4).toString('hex').toUpperCase(),
      crypto.randomBytes(4).toString('hex').toUpperCase(),
      crypto.randomBytes(2).toString('hex').toUpperCase(),
    ].join('-');

    const geo = ip ? await this.getCountryFromIp(ip) : null;

    await this.prisma.downloadLog.create({
      data: {
        token,
        productId,
        email: order.email,
        ip: ip || null,
        userAgent: userAgent || null,
        country: geo || null,
        downloaded: true,
        downloadedAt: new Date(),
        licenseKey,
      },
    });

    this.logger.log(`Download: ${order.email} -> ${productId} (${licenseKey})`);

    // Try CDN signed URL first
    const cdnUrl = this.cdn.isEnabled()
      ? this.cdn.getSignedUrl(productFile.filePath, 900)
      : '';

    if (cdnUrl) {
      return { cdnUrl, fileName: productFile.fileName, licenseKey };
    }

    const fileStream = await this.storage.getStream(productFile.filePath);
    return { stream: fileStream, fileName: productFile.fileName, licenseKey };
  }

  async saveProductFile(productId: string, file: Express.Multer.File) {
    if (file.size > 100 * 1024 * 1024) {
      throw new BadRequestException('File size exceeds 100MB limit');
    }
    if (!file.originalname.endsWith('.zip')) {
      throw new BadRequestException('Only .zip files are allowed');
    }

    const zipMagic = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
    const fileHeader = file.buffer.slice(0, 4);
    if (!fileHeader.equals(zipMagic)) {
      throw new BadRequestException(
        'Invalid file format — only valid ZIP files are allowed',
      );
    }

    const existing = await this.prisma.productFile.findUnique({
      where: { productId },
    });
    if (existing) {
      await this.storage.delete(existing.filePath);
      await this.prisma.productFile.delete({ where: { id: existing.id } });
    }

    const fileName = `${productId}-${Date.now()}.zip`;
    const filePath = await this.storage.upload(fileName, file.buffer);

    return this.prisma.productFile.create({
      data: { productId, fileName, fileSize: file.size, filePath },
    });
  }

  async getProductFile(productId: string) {
    const productFile = await this.prisma.productFile.findUnique({
      where: { productId },
    });
    if (!productFile)
      throw new NotFoundException('No file uploaded for this product');
    return productFile;
  }

  async deleteProductFile(productId: string) {
    const productFile = await this.prisma.productFile.findUnique({
      where: { productId },
    });
    if (!productFile) throw new NotFoundException('No file to delete');
    await this.storage.delete(productFile.filePath);
    await this.prisma.productFile.delete({ where: { id: productFile.id } });
  }
}
