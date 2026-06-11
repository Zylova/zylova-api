import { IsEmail, IsString, IsOptional, IsIn } from 'class-validator';

export class CreateContactSubmissionDto {
  @IsString() name: string;
  @IsEmail() email: string;
  @IsOptional() @IsString() company?: string;
  @IsOptional() @IsString() service?: string;
  @IsString() message: string;
}

export class UpdateContactStatusDto {
  @IsString()
  @IsIn(['unread', 'read', 'replied'])
  status: string;
}
