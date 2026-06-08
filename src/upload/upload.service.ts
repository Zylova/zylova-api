import { Injectable, BadRequestException } from "@nestjs/common";
import { extname, join } from "path";
import { existsSync, mkdirSync } from "fs";
import { writeFile } from "fs/promises";
import { v4 as uuid } from "uuid";

@Injectable()
export class UploadService {
  private readonly uploadDir: string;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || "./uploads";
    if (!existsSync(this.uploadDir)) mkdirSync(this.uploadDir, { recursive: true });
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    if (!file) throw new BadRequestException("No file provided");

    const ext = extname(file.originalname);
    const filename = `${uuid()}${ext}`;
    const filepath = join(this.uploadDir, filename);

    await writeFile(filepath, file.buffer);

    return `/uploads/${filename}`;
  }
}
