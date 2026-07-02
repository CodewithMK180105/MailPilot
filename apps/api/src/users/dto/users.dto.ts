import { IsEmail, IsOptional, IsString, MinLength, Matches } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEmail()
  sendgridFromEmail?: string;

  @IsOptional()
  @IsString()
  sendgridFromName?: string;
}

export class UpdateSendgridKeyDto {
  @IsString()
  @Matches(/^SG\./, { message: 'SendGrid API key must start with SG.' })
  apiKey!: string;

  @IsEmail()
  fromEmail!: string;

  @IsString()
  @MinLength(1)
  fromName!: string;
}
