import { Injectable, NotImplementedException } from '@nestjs/common';
import {
  IMailProvider,
  SendEmailOptions,
  SendEmailResult,
} from '../interfaces/mail-provider.interface';

@Injectable()
export class SESProvider implements IMailProvider {
  async sendEmail(_options: SendEmailOptions): Promise<SendEmailResult> {
    throw new NotImplementedException('AWS SES provider coming soon');
  }
}
