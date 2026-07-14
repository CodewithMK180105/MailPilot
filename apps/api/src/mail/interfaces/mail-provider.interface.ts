export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  listUnsubscribeUrl?: string;
  from: {
    email: string;
    name: string;
  };
  apiKey: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface IMailProvider {
  sendEmail(options: SendEmailOptions): Promise<SendEmailResult>;
}
