import { IsEmail, IsString, MinLength, IsOptional, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  @Matches(/^SG\./, { message: 'SendGrid API key must start with SG.' })
  sendgridApiKey?: string;

  @IsOptional()
  @IsEmail()
  sendgridFromEmail?: string;

  @IsOptional()
  @IsString()
  sendgridFromName?: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

export class GoogleAuthDto {
  @IsString()
  @MinLength(1)
  idToken!: string;
}
