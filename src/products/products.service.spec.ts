import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: PrismaService;

  const mockProduct = {
    id: 'product-1',
    name: 'Test Product',
    description: 'A test product',
    price: 499,
    category: 'web' as const,
    tags: ['react', 'nextjs'],
    image: 'https://example.com/image.jpg',
    demoUrl: 'https://demo.example.com',
    features: ['Feature A', 'Feature B'],
    published: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const mockPrisma = {
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return published products', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProduct]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Product');
    });

    it('should filter by category', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProduct]);

      await service.findAll({ category: 'web' });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: 'web' }),
        }),
      );
    });

    it('should search by name or description', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProduct]);

      await service.findAll({ search: 'test' });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                name: expect.objectContaining({ contains: 'test' }),
              }),
            ]),
          }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return a product by id', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.findById('product-1');

      expect(result.name).toBe('Test Product');
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a product', async () => {
      const dto = {
        name: 'New Product',
        description: 'Description',
        price: 299,
        category: 'app' as const,
        tags: ['react'],
        image: 'https://example.com/img.jpg',
        features: ['Feature X'],
      };
      mockPrisma.product.create.mockResolvedValue({ ...mockProduct, ...dto });

      const result = await service.create(dto);

      expect(result.name).toBe('New Product');
    });
  });

  describe('update', () => {
    it('should update an existing product', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.product.update.mockResolvedValue({
        ...mockProduct,
        name: 'Updated',
      });

      const result = await service.update('product-1', { name: 'Updated' });

      expect(result.name).toBe('Updated');
    });

    it('should throw NotFoundException if product to update not found', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { name: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete an existing product', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.product.delete.mockResolvedValue(mockProduct);

      const result = await service.remove('product-1');

      expect(result.id).toBe('product-1');
    });

    it('should throw NotFoundException if product to delete not found', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
