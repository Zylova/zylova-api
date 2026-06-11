import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already registered');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { email: dto.email, name: dto.name, password: hashedPassword },
    });

    const tokens = await this.generateTokenPair(user.id, user.email, user.role);
    return {
      ...tokens,
      user: this.sanitize(user),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (user.banned) throw new UnauthorizedException('Account is banned');

    if (!user.password)
      throw new UnauthorizedException(
        'This account uses social login. Please sign in with Google or Facebook.',
      );

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.generateTokenPair(user.id, user.email, user.role);
    return {
      ...tokens,
      user: this.sanitize(user),
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user || !user.refreshToken)
        throw new UnauthorizedException('Invalid refresh token');

      const valid = await bcrypt.compare(refreshToken, user.refreshToken);
      if (!valid)
        throw new UnauthorizedException('Invalid refresh token');

      const tokens = await this.generateTokenPair(
        user.id,
        user.email,
        user.role,
      );
      return tokens;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    return this.sanitize(user);
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user)
      return { message: 'If the email exists, a reset link has been sent' };

    const resetToken = uuid();
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    await this.emailService.send({
      to: email,
      subject: 'Reset your Zylova password',
      html: `<h2>Password Reset</h2><p>Click <a href="${resetLink}">here</a> to reset your password. This link expires in 1 hour.</p><p>If you didn't request this, please ignore this email.</p>`,
    });

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(token: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { resetToken: token, resetTokenExpiry: { gt: new Date() } },
    });

    if (!user) throw new BadRequestException('Invalid or expired reset token');

    const hashedPassword = await bcrypt.hash(password, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return { message: 'Password reset successfully' };
  }

  async findOrCreateOAuthUser(
    provider: string,
    profile: {
      email?: string;
      firstName?: string;
      lastName?: string;
      picture?: string;
      googleId?: string;
      facebookId?: string;
    },
  ) {
    if (!profile.email)
      throw new BadRequestException('Email is required from OAuth provider');

    const idField = provider === 'google' ? 'googleId' : 'facebookId';
    const profileId =
      provider === 'google' ? profile.googleId : profile.facebookId;

    // Try to find existing user by OAuth ID or email
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ [idField]: profileId }, { email: profile.email }],
      },
    });

    if (user) {
      // Link OAuth ID if not already linked
      if (!user[idField]) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { [idField]: profileId },
        });
      }
    } else {
      // Create new user
      const name =
        [profile.firstName, profile.lastName].filter(Boolean).join(' ') ||
        profile.email.split('@')[0];
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          name,
          [idField]: profileId,
          password: '', // No password for OAuth users
        },
      });
    }

    if (user.banned) throw new UnauthorizedException('Account is banned');

    const tokens = await this.generateTokenPair(user.id, user.email, user.role);
    return {
      ...tokens,
      user: this.sanitize(user),
    };
  }

  private async generateTokenPair(id: string, email: string, role: string) {
    const payload = { sub: id, email, role };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    const refreshHash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id },
      data: { refreshToken: refreshHash },
    });

    return { accessToken, refreshToken };
  }

  private sanitize(user: {
    id: string;
    email: string;
    name: string;
    role: string;
    banned: boolean;
    createdAt: Date;
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      banned: user.banned,
      createdAt: user.createdAt,
    };
  }
}
