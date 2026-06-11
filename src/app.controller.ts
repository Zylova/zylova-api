import { Controller, Get, Inject } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from './prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@SkipThrottle()
@Controller()
export class AppController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get('health')
  health(): { status: string; version: string; timestamp: string } {
    return {
      status: 'ok',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('maintenance')
  getMaintenance(): Record<string, boolean> {
    let enabled = false;
    try {
      const configPath = path.join(process.cwd(), 'maintenance.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as {
          enabled: boolean;
        };
        enabled = config.enabled;
      }
    } catch {
      /* noop */
    }
    return { enabled };
  }

  @Get('db-check')
  async dbCheck(): Promise<Record<string, unknown>> {
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1 AS ok');
      const tables = await this.prisma.$queryRawUnsafe(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
      );
      return { connected: true, tables };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        connected: false,
        error: err.message,
        stack: err.stack?.split('\n').slice(0, 5).join('\n'),
      };
    }
  }
}
