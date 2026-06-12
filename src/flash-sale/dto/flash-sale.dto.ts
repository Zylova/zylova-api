import { IsString, IsNumber, IsBoolean, IsOptional, Min, Max } from 'class-validator';

export class CreateFlashSaleDto {
  @IsString() productId: string;
  @IsNumber() @Min(0) @Max(100) discountPercent: number;
  @IsString() startTime: string;
  @IsString() endTime: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateFlashSaleDto {
  @IsOptional() @IsNumber() @Min(0) @Max(100) discountPercent?: number;
  @IsOptional() @IsString() startTime?: string;
  @IsOptional() @IsString() endTime?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}
