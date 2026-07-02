import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';

import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/encryption.service';
import { RegisterDto, LoginDto, GoogleAuthDto } from './dto/auth.dto';

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
  // Never select: passwordHash, sendgridApiKeyEncrypted, sendgridApiKeyIv
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly googleClient: OAuth2Client;
  private readonly BCRYPT_ROUNDS = 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly encryptionService: EncryptionService,
  ) {
    this.googleClient = new OAuth2Client(
      this.configService.get<string>('google.clientId'),
    );
  }

  async register(dto: RegisterDto) {
    // Check if user exists
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    // Validate SendGrid API key if provided
    let encryptedKey: string | undefined;
    if (dto.sendgridApiKey) {
      const isValid = await this.validateSendgridKey(dto.sendgridApiKey);
      if (!isValid) {
        throw new BadRequestException(
          'SendGrid API key is invalid or could not be verified. Please check your key.',
        );
      }
      encryptedKey = this.encryptionService.encryptToString(dto.sendgridApiKey);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        sendgridApiKeyEncrypted: encryptedKey ?? null,
        sendgridApiKeyIv: null, // IV is embedded in encryptedKey string
        sendgridFromEmail: dto.sendgridFromEmail ?? null,
        sendgridFromName: dto.sendgridFromName ?? null,
      },
      select: SAFE_USER_SELECT,
    });

    const token = this.generateToken(user.id, user.email, user.role);

    return { user, token };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const safeUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: SAFE_USER_SELECT,
    });

    if (!safeUser) throw new InternalServerErrorException();

    const token = this.generateToken(safeUser.id, safeUser.email, safeUser.role);

    return { user: safeUser, token };
  }

  async googleAuth(dto: GoogleAuthDto) {
    const googleClientId = this.configService.get<string>('google.clientId');

    if (!googleClientId) {
      throw new BadRequestException('Google OAuth is not configured on this server');
    }

    // Verify Google token
    let googleUserId: string;
    let email: string;
    let name: string | null = null;
    let avatarUrl: string | null = null;

    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: dto.idToken,
        audience: googleClientId,
      });
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload?.email) {
        throw new Error('Invalid Google token payload');
      }
      googleUserId = payload.sub;
      email = payload.email;
      name = payload.name ?? null;
      avatarUrl = payload.picture ?? null;
    } catch {
      throw new UnauthorizedException('Invalid Google ID token');
    }

    // Find or create user
    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleId: googleUserId }, { email }] },
      select: SAFE_USER_SELECT,
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          name,
          googleId: googleUserId,
          avatarUrl,
          isEmailVerified: true,
        },
        select: SAFE_USER_SELECT,
      });
    } else {
      // Update Google ID if missing
      const full = await this.prisma.user.findUnique({ where: { email } });
      if (full && !full.googleId) {
        user = await this.prisma.user.update({
          where: { id: full.id },
          data: { googleId: googleUserId, avatarUrl: avatarUrl ?? undefined },
          select: SAFE_USER_SELECT,
        });
      }
    }

    const token = this.generateToken(user.id, user.email, user.role);
    return { user, token };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: SAFE_USER_SELECT,
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  private generateToken(userId: string, email: string, role: string): string {
    return this.jwtService.sign({
      sub: userId,
      email,
      role,
    });
  }

  /**
   * Validates a SendGrid API key by calling their scopes endpoint
   * Uses native fetch — axios is banned
   */
  async validateSendgridKey(apiKey: string): Promise<boolean> {
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
      // Network error — treat as valid to not block registration
      this.logger.warn('Could not reach SendGrid to validate API key');
      return true;
    }
  }
}
