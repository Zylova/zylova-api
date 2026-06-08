import { IsString, IsNumber, IsOptional, IsArray, IsEnum, IsBoolean } from "class-validator";
import { Category } from "@prisma/client";

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsNumber()
  price: number;

  @IsEnum(Category)
  category: Category;

  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @IsString()
  image: string;

  @IsOptional()
  @IsString()
  demoUrl?: string;

  @IsArray()
  @IsString({ each: true })
  features: string[];
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsEnum(Category)
  category?: Category;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  demoUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class ProductQueryDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
