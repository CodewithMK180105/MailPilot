export interface EmailJobPayload {
  emailJobId: string;
  campaignId: string;
  recipientId: string;
  userId: string;
  to: string;
  subject: string;
  html: string;
  fromEmail: string;
  fromName: string;
  encryptedApiKey: string; // Combined iv:authTag:encrypted string
}
