import { z } from 'zod';

// ─── Enums ──────────────────────────────────────────────────────────────────

export const RoleEnum = z.enum(['ADMIN', 'USER']);
export type Role = z.infer<typeof RoleEnum>;

export const CampaignStatusEnum = z.enum([
  'DRAFT',
  'VALIDATING',
  'READY',
  'SENDING',
  'PAUSED',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
]);
export type CampaignStatus = z.infer<typeof CampaignStatusEnum>;

export const JobStatusEnum = z.enum([
  'PENDING',
  'PROCESSING',
  'SENT',
  'FAILED',
  'RETRYING',
  'CANCELLED',
]);
export type JobStatus = z.infer<typeof JobStatusEnum>;

// ─── Auth Schemas ────────────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  sendgridApiKey: z.string().startsWith('SG.', 'SendGrid API key must start with SG.').optional(),
  sendgridFromEmail: z.string().email('Invalid from email').optional(),
  sendgridFromName: z.string().optional(),
});
export type RegisterDto = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginDto = z.infer<typeof LoginSchema>;

export const GoogleAuthSchema = z.object({
  idToken: z.string().min(1, 'Google ID token is required'),
});
export type GoogleAuthDto = z.infer<typeof GoogleAuthSchema>;

// ─── User Schemas ────────────────────────────────────────────────────────────

export const UpdateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  sendgridFromEmail: z.string().email().optional(),
  sendgridFromName: z.string().optional(),
});
export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;

export const UpdateSendgridKeySchema = z.object({
  apiKey: z.string().startsWith('SG.', 'SendGrid API key must start with SG.'),
  fromEmail: z.string().email('Invalid from email'),
  fromName: z.string().min(1, 'From name is required'),
});
export type UpdateSendgridKeyDto = z.infer<typeof UpdateSendgridKeySchema>;

// ─── Campaign Schemas ────────────────────────────────────────────────────────

export const CreateCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(255),
  subject: z.string().min(1, 'Email subject is required').max(500),
  bodyTemplate: z.string().min(1, 'Email body template is required'),
});
export type CreateCampaignDto = z.infer<typeof CreateCampaignSchema>;

export const UpdateCampaignSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  subject: z.string().min(1).max(500).optional(),
  bodyTemplate: z.string().min(1).optional(),
});
export type UpdateCampaignDto = z.infer<typeof UpdateCampaignSchema>;

export const CampaignQuerySchema = z.object({
  status: CampaignStatusEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type CampaignQuery = z.infer<typeof CampaignQuerySchema>;

// ─── Recipients Schemas ──────────────────────────────────────────────────────

export const ManualRecipientsSchema = z.object({
  columns: z.array(z.string()).min(1),
  rows: z.array(z.record(z.string(), z.string())),
});
export type ManualRecipientsDto = z.infer<typeof ManualRecipientsSchema>;

// ─── Template Schemas ────────────────────────────────────────────────────────

export const TemplatePreviewSchema = z.object({
  template: z.string().min(1, 'Template is required'),
  data: z.record(z.string(), z.string()),
});
export type TemplatePreviewDto = z.infer<typeof TemplatePreviewSchema>;

// ─── Shared API Response Types ────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Entity Types ─────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: Role;
  isEmailVerified: boolean;
  sendgridFromEmail: string | null;
  sendgridFromName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  userId: string;
  name: string;
  subject: string;
  bodyTemplate: string;
  detectedVariables: string[];
  status: CampaignStatus;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignSummary {
  id: string;
  name: string;
  subject: string;
  status: CampaignStatus;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Recipient {
  id: string;
  campaignId: string;
  email: string;
  data: Record<string, string>;
  rowIndex: number;
  createdAt: string;
}

export interface EmailJob {
  id: string;
  campaignId: string;
  recipientId: string;
  bullJobId: string | null;
  status: JobStatus;
  attemptCount: number;
  lastAttemptAt: string | null;
  sentAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
  recipient?: {
    email: string;
    data: Record<string, string>;
  };
}

export interface CampaignProgress {
  total: number;
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  retrying: number;
  cancelled: number;
  successPercentage: number;
}

export interface SendgridStatus {
  hasKey: boolean;
  fromEmail: string | null;
  fromName: string | null;
}

export interface ValidationResult {
  isValid: boolean;
  missingVariables: string[];
  extraColumns: string[];
}

export interface UploadResult {
  totalRows: number;
  columns: string[];
  preview: Record<string, string>[];
}
