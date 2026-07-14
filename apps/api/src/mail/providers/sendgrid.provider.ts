import { Injectable, Logger } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';
import {
  IMailProvider,
  SendEmailOptions,
  SendEmailResult,
} from '../interfaces/mail-provider.interface';

@Injectable()
export class SendGridProvider implements IMailProvider {
  private readonly logger = new Logger(SendGridProvider.name);

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    // Set the API key for this specific send — do not use a global key
    sgMail.setApiKey(options.apiKey);

    try {
      const fromDomain = options.from.email.split('@')[1] || 'mailflow.app';
      const randomId = Math.random().toString(36).substring(2, 15);
      const messageId = `<${Date.now()}.${randomId}@${fromDomain}>`;

      const headers: Record<string, string> = {
        'Message-ID': messageId,
      };

      if (options.listUnsubscribeUrl) {
        headers['List-Unsubscribe'] = `<${options.listUnsubscribeUrl}>`;
      }

      // Strip HTML tags for clean plain-text fallback
      const plainText = options.text || options.html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const [response] = await sgMail.send({
        to: options.to,
        from: {
          email: options.from.email,
          name: options.from.name,
        },
        replyTo: options.replyTo || options.from.email,
        subject: options.subject,
        html: options.html,
        text: plainText,
        headers,
      });

      const sgMessageId = response.headers?.['x-message-id'] as string | undefined;
      return { success: true, messageId: sgMessageId || messageId };
    } catch (err: unknown) {
      const error = err as { code?: number; response?: { body?: { errors?: { message: string }[] } } };
      const statusCode = error.code ?? 0;
      const sgErrors = error.response?.body?.errors;
      const errorMessage = sgErrors?.[0]?.message ?? String(err);

      this.logger.warn(
        `SendGrid error for ${options.to}: [${statusCode}] ${errorMessage}`,
      );

      return {
        success: false,
        error: this.mapSendGridError(statusCode, errorMessage),
      };
    }
  }

  private mapSendGridError(statusCode: number, message: string): string {
    switch (statusCode) {
      case 400:
        return `Bad request: ${message}`;
      case 401:
        return 'Invalid SendGrid API key — please update your API key in Settings';
      case 403:
        return `Forbidden: ${message} — check your SendGrid sender verification`;
      case 413:
        return 'Email content too large';
      case 429:
        return 'SendGrid rate limit exceeded — will retry automatically';
      case 500:
      case 502:
      case 503:
        return `SendGrid service error (${statusCode}) — will retry automatically`;
      default:
        return message || 'Unknown SendGrid error';
    }
  }
}
