import { IsString, IsNumber, IsArray, IsOptional, IsBoolean, Min, Max } from 'class-validator';

export class CreateBundleDto {
  @IsString() name: string;
  @IsString() slug: string;
  @IsOptional() @IsString() description?: string;
  @IsNumber() @Min(0) @Max(100) discountPercent: number;
  @IsOptional() @IsString() validFrom?: string;
  @IsOptional() @IsString() validUntil?: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsArray() @IsString({ each: true }) productIds: string[];
}

export class UpdateBundleDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(100) discountPercent?: number;
  @IsOptional() @IsString() validFrom?: string;
  @IsOptional() @IsString() validUntil?: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) productIds?: string[];
}
