import { Module } from '@nestjs/common';
import { SendGridProvider } from './providers/sendgrid.provider';
import { SESProvider } from './providers/ses.provider';
import { BrevoProvider } from './providers/brevo.provider';
import { MailProviderFactory } from './mail-provider.factory';

@Module({
  providers: [SendGridProvider, SESProvider, BrevoProvider, MailProviderFactory],
  exports: [MailProviderFactory],
})
export class MailModule {}
