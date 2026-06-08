import { IsEmail, IsString, IsOptional } from "class-validator";

export class CreateContactSubmissionDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  service?: string;

  @IsString()
  message: string;
}
