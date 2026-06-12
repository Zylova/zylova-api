import { Controller, Get, Param, UseGuards, Req, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { DownloadService } from './download.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import type { Request, Response } from 'express';

@ApiTags('download')
@Controller('download')
export class DownloadController {
  constructor(private readonly downloadService: DownloadService) {}

  @Get('info/:token')
  @ApiOperation({ summary: 'Get download info by token' })
  getInfo(@Param('token') token: string) {
    return this.downloadService.getDownloadInfo(token);
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Get('file/:token/:productId')
  @ApiOperation({ summary: 'Download product file (one-time)' })
  async downloadFile(
    @Param('token') token: string,
    @Param('productId') productId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const ip = req.ip;
    const userAgent = req.headers['user-agent'] || undefined;
    const result = await this.downloadService.downloadProduct(
      token,
      productId,
      ip,
      userAgent,
    );

    // If CDN URL is available, redirect to it
    if ('cdnUrl' in result && (result as { cdnUrl: string }).cdnUrl) {
      return res.redirect(302, (result as { cdnUrl: string }).cdnUrl);
    }

    const streamResult = result as { stream: NodeJS.ReadableStream; fileName: string; licenseKey: string };
    if (!streamResult.stream) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${streamResult.fileName}"`,
    );
    res.setHeader('X-License-Key', streamResult.licenseKey);

    streamResult.stream.pipe(res);
  }

  @Get('file-info/:productId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get product file info (admin)' })
  getFileInfo(@Param('productId') productId: string) {
    return this.downloadService.getProductFile(productId);
  }
}
