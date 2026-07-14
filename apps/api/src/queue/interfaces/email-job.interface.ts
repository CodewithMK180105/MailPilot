export interface EmailJobPayload {
  emailJobId: string;
  campaignId: string;
  recipientId: string;
  userId: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  listUnsubscribeUrl?: string;
  fromEmail: string;
  fromName: string;
  encryptedApiKey: string; // Combined iv:authTag:encrypted string
}
