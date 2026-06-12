import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateFaqDto {
  @IsString() question: string;
  @IsString() answer: string;
  @IsOptional() @IsNumber() @Min(0) order?: number;
}

export class UpdateFaqDto {
  @IsOptional() @IsString() question?: string;
  @IsOptional() @IsString() answer?: string;
  @IsOptional() @IsNumber() @Min(0) order?: number;
}

export class FaqQueryDto {
  @IsOptional() @IsString() productId?: string;
}
