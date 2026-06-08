import { Controller, Post, UseGuards, UseInterceptors, UploadedFile } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { UploadService } from "./upload.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";

@ApiTags("upload")
@Controller("upload")
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @UseInterceptors(FileInterceptor("file"))
  @ApiBearerAuth()
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Upload a file (admin)" })
  upload(@UploadedFile() file: Express.Multer.File) {
    return this.uploadService.uploadFile(file);
  }
}
