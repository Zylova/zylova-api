import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { TwoFactorService } from './two-factor.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}));

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid'),
}));

describe('AuthService', () => {
  let service: AuthService;

  const mockUser = {
    id: 'uuid-1',
    email: 'test@test.com',
    name: 'Test User',
    password: 'hashed-password',
    refreshToken: 'hashed-password',
    role: 'USER' as const,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('jwt-token'),
    verify: jest.fn(),
  };

  const mockEmailService = {
    send: jest.fn().mockResolvedValue({ sent: true }),
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  };

  const mockTwoFactorService = {
    generateSecret: jest.fn(),
    verifyAndEnable: jest.fn(),
    verifyToken: jest.fn(),
    disable: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: TwoFactorService, useValue: mockTwoFactorService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const result = await service.register({
        email: 'test@test.com',
        name: 'Test User',
        password: 'password123',
      });

      expect(result.accessToken).toBe('jwt-token');
      expect(result.refreshToken).toBe('jwt-token');
      expect(result.user.email).toBe('test@test.com');
      expect(result.user).not.toHaveProperty('password');
    });

    it('should return opaque success if email exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.register({
        email: 'test@test.com',
        name: 'Test',
        password: 'password123',
      });

      expect(result).toEqual({
        message: 'Registration successful. Please check your email to verify your account.',
      });
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.login({
        email: 'test@test.com',
        password: 'password123',
      });

      expect(result.accessToken).toBe('jwt-token');
      expect(result.refreshToken).toBe('jwt-token');
      expect(result.user.email).toBe('test@test.com');
      expect(result.user).not.toHaveProperty('password');
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'wrong@test.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const bcryptModule = jest.requireMock('bcrypt');
      bcryptModule.compare.mockResolvedValue(false);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.login({ email: 'test@test.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    beforeEach(() => {
      const bcryptModule = jest.requireMock('bcrypt');
      bcryptModule.compare.mockResolvedValue(true);
    });

    it('should return new token pair', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'uuid-1',
        email: 'test@test.com',
        role: 'USER',
      });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('new-jwt-token');

      const result = await service.refresh('valid-refresh-token');

      expect(result.accessToken).toBe('new-jwt-token');
      expect(result.refreshToken).toBe('new-jwt-token');
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refresh('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user has no refresh token', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'uuid-1',
        email: 'test@test.com',
        role: 'USER',
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        refreshToken: null,
      });

      await expect(service.refresh('valid-refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getProfile', () => {
    it('should return sanitized user profile', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(mockUser);

      const result = await service.getProfile('uuid-1');

      expect(result.email).toBe('test@test.com');
      expect(result).not.toHaveProperty('password');
    });
  });
});
