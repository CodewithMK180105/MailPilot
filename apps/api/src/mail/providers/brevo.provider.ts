import { Injectable, NotImplementedException } from '@nestjs/common';
import {
  IMailProvider,
  SendEmailOptions,
  SendEmailResult,
} from '../interfaces/mail-provider.interface';

@Injectable()
export class BrevoProvider implements IMailProvider {
  async sendEmail(_options: SendEmailOptions): Promise<SendEmailResult> {
    throw new NotImplementedException('Brevo provider coming soon');
  }
}
