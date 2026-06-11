import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import * as crypto from "crypto";

@Injectable()
export class DownloadService {
  private readonly logger = new Logger(DownloadService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async getDownloadInfo(token: string) {
    const order = await this.prisma.order.findUnique({ where: { downloadToken: token } });
    if (!order) throw new NotFoundException("Invalid download token");

    const items = order.items as Array<{ id: string; name: string }>;
    const products: Array<{ id: string; name: string; hasFile: boolean; downloaded: boolean; licenseKey: string | null }> = [];

    for (const item of items) {
      const productFile = await this.prisma.productFile.findUnique({ where: { productId: item.id } });
      const existingLog = await this.prisma.downloadLog.findFirst({
        where: { token, productId: item.id },
        orderBy: { createdAt: "desc" },
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

  async downloadProduct(token: string, productId: string, ip?: string) {
    const order = await this.prisma.order.findUnique({ where: { downloadToken: token } });
    if (!order) throw new NotFoundException("Invalid download token");

    const productFile = await this.prisma.productFile.findUnique({ where: { productId } });
    if (!productFile) throw new NotFoundException("Product file not available");

    const existingLog = await this.prisma.downloadLog.findFirst({ where: { token, productId } });
    if (existingLog?.downloaded) {
      throw new BadRequestException("This product has already been downloaded. Contact support for re-download.");
    }

    const licenseKey = [
      "ZYL",
      crypto.randomBytes(4).toString("hex").toUpperCase(),
      crypto.randomBytes(4).toString("hex").toUpperCase(),
      crypto.randomBytes(2).toString("hex").toUpperCase(),
    ].join("-");

    await this.prisma.downloadLog.create({
      data: {
        token,
        productId,
        email: order.email,
        ip: ip || null,
        downloaded: true,
        downloadedAt: new Date(),
        licenseKey,
      },
    });

    this.logger.log(`Download: ${order.email} -> ${productId} (${licenseKey})`);

    const fileStream = await this.storage.getStream(productFile.filePath);
    return { stream: fileStream, fileName: productFile.fileName, licenseKey };
  }

  async saveProductFile(productId: string, file: Express.Multer.File) {
    const existing = await this.prisma.productFile.findUnique({ where: { productId } });
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
    const productFile = await this.prisma.productFile.findUnique({ where: { productId } });
    if (!productFile) throw new NotFoundException("No file uploaded for this product");
    return productFile;
  }

  async deleteProductFile(productId: string) {
    const productFile = await this.prisma.productFile.findUnique({ where: { productId } });
    if (!productFile) throw new NotFoundException("No file to delete");
    await this.storage.delete(productFile.filePath);
    await this.prisma.productFile.delete({ where: { id: productFile.id } });
  }
}
