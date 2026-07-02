import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/encryption.service';
import { UpdateProfileDto, UpdateSendgridKeyDto } from './dto/users.dto';

const SAFE_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  role: true,
  isEmailVerified: true,
  sendgridFromEmail: true,
  sendgridFromName: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: SAFE_USER_SELECT,
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.sendgridFromEmail && { sendgridFromEmail: dto.sendgridFromEmail }),
        ...(dto.sendgridFromName && { sendgridFromName: dto.sendgridFromName }),
      },
      select: SAFE_USER_SELECT,
    });

    return user;
  }

  async updateSendgridKey(userId: string, dto: UpdateSendgridKeyDto) {
    // Validate key against SendGrid before storing
    const isValid = await this.validateSendgridKey(dto.apiKey);
    if (!isValid) {
      throw new BadRequestException(
        'SendGrid API key validation failed. Please check your API key is correct and active.',
      );
    }

    // Encrypt the API key — never store in plain text
    const encrypted = this.encryptionService.encryptToString(dto.apiKey);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        sendgridApiKeyEncrypted: encrypted,
        sendgridApiKeyIv: null, // IV is embedded in encrypted string
        sendgridFromEmail: dto.fromEmail,
        sendgridFromName: dto.fromName,
      },
    });

    // Never return the key
    return {
      success: true,
      message: 'SendGrid API key saved and verified successfully',
      fromEmail: dto.fromEmail,
      fromName: dto.fromName,
    };
  }

  async getSendgridStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        sendgridApiKeyEncrypted: true,
        sendgridFromEmail: true,
        sendgridFromName: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    return {
      hasKey: !!user.sendgridApiKeyEncrypted,
      fromEmail: user.sendgridFromEmail,
      fromName: user.sendgridFromName,
    };
  }

  /**
   * Decrypts and returns the user's SendGrid API key.
   * Only used internally — NEVER exposed via API response.
   */
  async getDecryptedApiKey(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        sendgridApiKeyEncrypted: true,
      },
    });

    if (!user?.sendgridApiKeyEncrypted) return null;

    try {
      return this.encryptionService.decryptFromString(user.sendgridApiKeyEncrypted);
    } catch {
      this.logger.error(`Failed to decrypt API key for user ${userId}`);
      return null;
    }
  }

  private async validateSendgridKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/scopes', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      return response.status === 200;
    } catch {
      this.logger.warn('Could not reach SendGrid to validate API key — treating as valid');
      return true;
    }
  }
}
