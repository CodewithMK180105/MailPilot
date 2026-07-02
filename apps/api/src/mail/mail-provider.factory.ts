import { Injectable } from '@nestjs/common';
import { SendGridProvider } from './providers/sendgrid.provider';
import { SESProvider } from './providers/ses.provider';
import { BrevoProvider } from './providers/brevo.provider';
import { IMailProvider } from './interfaces/mail-provider.interface';

export type MailProviderType = 'sendgrid' | 'ses' | 'brevo';

@Injectable()
export class MailProviderFactory {
  constructor(
    private readonly sendGridProvider: SendGridProvider,
    private readonly sesProvider: SESProvider,
    private readonly brevoProvider: BrevoProvider,
  ) {}

  getProvider(type: MailProviderType = 'sendgrid'): IMailProvider {
    switch (type) {
      case 'sendgrid':
        return this.sendGridProvider;
      case 'ses':
        return this.sesProvider;
      case 'brevo':
        return this.brevoProvider;
      default:
        return this.sendGridProvider;
    }
  }
}
