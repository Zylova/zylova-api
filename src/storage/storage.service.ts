import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private s3: S3Client | null = null;
  private readonly bucket: string;
  private readonly useS3: boolean;
  private readonly localDir: string;
  private readonly prefix: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('S3_BUCKET') || 'zylova-products';
    this.useS3 = !!this.config.get<string>('S3_REGION');
    this.localDir = process.env.PRODUCTS_DIR || '/app/products';
    this.prefix = this.config.get<string>('S3_PREFIX') || 'products';
  }

  onModuleInit() {
    if (this.useS3) {
      this.s3 = new S3Client({
        region: this.config.get<string>('S3_REGION'),
        endpoint: this.config.get<string>('S3_ENDPOINT'),
        credentials: {
          accessKeyId: this.config.get<string>('S3_ACCESS_KEY') || '',
          secretAccessKey: this.config.get<string>('S3_SECRET_KEY') || '',
        },
        forcePathStyle: !!this.config.get<string>('S3_ENDPOINT'),
      });
      this.logger.log(
        `S3 storage configured: bucket=${this.bucket}, region=${this.config.get('S3_REGION')}`,
      );
    } else {
      if (!fs.existsSync(this.localDir)) {
        fs.mkdirSync(this.localDir, { recursive: true });
      }
      this.logger.log(`Local storage configured: ${this.localDir}`);
    }
  }

  async upload(key: string, buffer: Buffer): Promise<string> {
    if (this.useS3 && this.s3) {
      const s3Key = `${this.prefix}/${key}`;
      const upload = new Upload({
        client: this.s3,
        params: {
          Bucket: this.bucket,
          Key: s3Key,
          Body: buffer,
          ContentType: 'application/zip',
        },
      });
      await upload.done();
      this.logger.log(`Uploaded to S3: ${s3Key}`);
      return s3Key;
    }

    const localPath = path.join(this.localDir, key);
    fs.writeFileSync(localPath, buffer);
    this.logger.log(`Saved locally: ${localPath}`);
    return localPath;
  }

  async getStream(key: string): Promise<Readable> {
    if (this.useS3 && this.s3) {
      const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
      const response = await this.s3.send(command);
      return response.Body as Readable;
    }

    return fs.createReadStream(key);
  }

  async delete(key: string): Promise<void> {
    if (this.useS3 && this.s3) {
      try {
        await this.s3.send(
          new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
        );
        this.logger.log(`Deleted from S3: ${key}`);
      } catch (e) {
        this.logger.warn(`S3 delete failed: ${key}`, e);
      }
      return;
    }

    try {
      if (fs.existsSync(key)) fs.unlinkSync(key);
    } catch (e) {
      this.logger.warn(`Local delete failed: ${key}`, e);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (this.useS3 && this.s3) {
      try {
        await this.s3.send(
          new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
        );
        return true;
      } catch {
        return false;
      }
    }

    return fs.existsSync(key);
  }
}
