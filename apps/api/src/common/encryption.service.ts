import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const hexKey = this.configService.get<string>('encryption.key');
    if (!hexKey || hexKey.length !== 64) {
      throw new Error(
        'ENCRYPTION_KEY must be a 32-byte (64 hex character) string. Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
      );
    }
    this.key = Buffer.from(hexKey, 'hex');
  }

  /**
   * Generates a random 12-byte IV for AES-256-GCM
   */
  generateIv(): Buffer {
    return crypto.randomBytes(12);
  }

  /**
   * Encrypts plaintext using AES-256-GCM
   * Returns { encrypted: hex string, iv: hex string, authTag: hex string }
   */
  encrypt(plaintext: string): { encrypted: string; iv: string; authTag: string } {
    const iv = this.generateIv();
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag,
    };
  }

  /**
   * Decrypts encrypted hex string using AES-256-GCM
   * iv and authTag must be hex strings
   */
  decrypt(encrypted: string, iv: string, authTag: string): string {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(iv, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Convenience: encrypt and store as combined string "iv:authTag:encrypted"
   */
  encryptToString(plaintext: string): string {
    const { encrypted, iv, authTag } = this.encrypt(plaintext);
    return `${iv}:${authTag}:${encrypted}`;
  }

  /**
   * Convenience: decrypt from combined "iv:authTag:encrypted" string
   */
  decryptFromString(combined: string): string {
    const parts = combined.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted string format');
    }
    const [iv, authTag, encrypted] = parts;
    return this.decrypt(encrypted, iv, authTag);
  }
}
