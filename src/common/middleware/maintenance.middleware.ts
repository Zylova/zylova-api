import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    try {
      const configPath = path.join(process.cwd(), 'maintenance.json');
      if (!fs.existsSync(configPath)) return next();
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as {
        enabled: boolean;
      };
      if (!config.enabled) return next();
    } catch {
      return next();
    }

    const pathname = req.path;
    if (
      pathname.startsWith('/api/admin') ||
      pathname.startsWith('/api/auth') ||
      pathname.startsWith('/api/health') ||
      pathname === '/api/maintenance'
    ) {
      return next();
    }

    return res.status(503).json({
      statusCode: 503,
      message: 'Site is under maintenance. Please check back later.',
      maintenance: true,
    });
  }
}
