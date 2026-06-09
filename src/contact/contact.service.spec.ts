import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { ContactService } from "./contact.service";
import { PrismaService } from "../prisma/prisma.service";

describe("ContactService", () => {
  let service: ContactService;
  let prisma: PrismaService;

  const mockSubmission = {
    id: "sub-1",
    name: "John Doe",
    email: "john@test.com",
    company: "Acme Inc",
    service: "web",
    message: "I need a website built with Next.js and Tailwind CSS.",
    createdAt: new Date("2026-01-01"),
  };

  const mockPrisma = {
    contactSubmission: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ContactService>(ContactService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("submit", () => {
    it("should create a contact submission", async () => {
      mockPrisma.contactSubmission.create.mockResolvedValue(mockSubmission);

      const result = await service.submit({
        name: "John Doe",
        email: "john@test.com",
        company: "Acme Inc",
        service: "web",
        message: "I need a website built with Next.js and Tailwind CSS.",
      });

      expect(result.name).toBe("John Doe");
      expect(result.email).toBe("john@test.com");
    });

    it("should handle submission without optional fields", async () => {
      const minimalSubmission = {
        id: "sub-2",
        name: "Jane Doe",
        email: "jane@test.com",
        company: null,
        service: null,
        message: "Hello",
        createdAt: new Date("2026-01-01"),
      };
      mockPrisma.contactSubmission.create.mockResolvedValue(minimalSubmission);

      const result = await service.submit({
        name: "Jane Doe",
        email: "jane@test.com",
        message: "Hello",
      });

      expect(result.name).toBe("Jane Doe");
      expect(result.company).toBeNull();
    });
  });

  describe("findAll", () => {
    it("should return all submissions ordered by newest first", async () => {
      mockPrisma.contactSubmission.findMany.mockResolvedValue([mockSubmission]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("John Doe");
      expect(mockPrisma.contactSubmission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
        }),
      );
    });
  });
});
