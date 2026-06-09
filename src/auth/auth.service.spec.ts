import { Test, TestingModule } from "@nestjs/testing";
import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";

jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("hashed-password"),
  compare: jest.fn().mockResolvedValue(true),
}));

describe("AuthService", () => {
  let service: AuthService;
  let prisma: PrismaService;

  const mockUser = {
    id: "uuid-1",
    email: "test@test.com",
    name: "Test User",
    password: "hashed-password",
    role: "USER" as const,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  };

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue("jwt-token"),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("register", () => {
    it("should register a new user", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const result = await service.register({
        email: "test@test.com",
        name: "Test User",
        password: "password123",
      });

      expect(result.token).toBe("jwt-token");
      expect(result.user.email).toBe("test@test.com");
      expect(result.user).not.toHaveProperty("password");
    });

    it("should throw ConflictException if email exists", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.register({ email: "test@test.com", name: "Test", password: "password123" }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("login", () => {
    it("should login with valid credentials", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.login({ email: "test@test.com", password: "password123" });

      expect(result.token).toBe("jwt-token");
      expect(result.user.email).toBe("test@test.com");
      expect(result.user).not.toHaveProperty("password");
    });

    it("should throw UnauthorizedException for invalid email", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: "wrong@test.com", password: "password123" }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException for invalid password", async () => {
      const bcrypt = require("bcrypt");
      bcrypt.compare.mockResolvedValue(false);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.login({ email: "test@test.com", password: "wrong" }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("getProfile", () => {
    it("should return sanitized user profile", async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(mockUser);

      const result = await service.getProfile("uuid-1");

      expect(result.email).toBe("test@test.com");
      expect(result).not.toHaveProperty("password");
    });
  });
});
