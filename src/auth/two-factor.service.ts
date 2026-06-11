import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000;

@Injectable()
export class TwoFactorService {
  constructor(private readonly prisma: PrismaService) {}

  private async checkLockout(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorFailedAttempts: true, twoFactorLockedUntil: true },
    });
    if (!user) return;

    if (
      user.twoFactorLockedUntil &&
      new Date() < new Date(user.twoFactorLockedUntil)
    ) {
      const remaining = Math.ceil(
        (new Date(user.twoFactorLockedUntil).getTime() - Date.now()) / 60000,
      );
      throw new BadRequestException(
        `Too many attempts. Try again in ${remaining} minute${remaining !== 1 ? 's' : ''}.`,
      );
    }

    if (user.twoFactorLockedUntil && new Date() >= new Date(user.twoFactorLockedUntil)) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { twoFactorFailedAttempts: 0, twoFactorLockedUntil: null },
      });
    }
  }

  private async recordFailedAttempt(userId: string): Promise<void> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorFailedAttempts: { increment: 1 } },
    });

    if (user.twoFactorFailedAttempts >= MAX_FAILED_ATTEMPTS) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorLockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MS),
        },
      });
    }
  }

  async generateSecret(userId: string, email: string) {
    const secret = speakeasy.generateSecret({
      name: `Zylova:${email}`,
      issuer: 'Zylova',
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret.base32 },
    });

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url || '');

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
    };
  }

  async verifyAndEnable(userId: string, token: string) {
    await this.checkLockout(userId);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret) {
      throw new UnauthorizedException('2FA not initialized');
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!verified) {
      await this.recordFailedAttempt(userId);
      throw new UnauthorizedException('Invalid 2FA code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorFailedAttempts: 0,
        twoFactorLockedUntil: null,
      },
    });

    return { enabled: true };
  }

  verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1,
    });
  }

  async disable(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: null,
        twoFactorEnabled: false,
        twoFactorFailedAttempts: 0,
        twoFactorLockedUntil: null,
      },
    });
    return { enabled: false };
  }
}
