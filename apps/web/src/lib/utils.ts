import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { CampaignStatus } from '@email-platform/shared';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

export function getStatusConfig(status: CampaignStatus): {
  label: string;
  className: string;
  dotClassName: string;
} {
  const configs: Record<CampaignStatus, { label: string; className: string; dotClassName: string }> = {
    DRAFT: {
      label: 'Draft',
      className: 'bg-gray-100 text-gray-700 border-gray-200',
      dotClassName: 'bg-gray-400',
    },
    VALIDATING: {
      label: 'Validating',
      className: 'bg-purple-100 text-purple-700 border-purple-200',
      dotClassName: 'bg-purple-400',
    },
    READY: {
      label: 'Ready',
      className: 'bg-blue-100 text-blue-700 border-blue-200',
      dotClassName: 'bg-blue-500',
    },
    SENDING: {
      label: 'Sending',
      className: 'bg-yellow-100 text-yellow-700 border-yellow-200 status-sending',
      dotClassName: 'bg-yellow-500',
    },
    PAUSED: {
      label: 'Paused',
      className: 'bg-orange-100 text-orange-700 border-orange-200',
      dotClassName: 'bg-orange-500',
    },
    COMPLETED: {
      label: 'Completed',
      className: 'bg-green-100 text-green-700 border-green-200',
      dotClassName: 'bg-green-500',
    },
    FAILED: {
      label: 'Failed',
      className: 'bg-red-100 text-red-700 border-red-200',
      dotClassName: 'bg-red-500',
    },
    CANCELLED: {
      label: 'Cancelled',
      className: 'bg-slate-100 text-slate-600 border-slate-200',
      dotClassName: 'bg-slate-400',
    },
  };

  return configs[status] ?? configs.DRAFT;
}

export function getJobStatusConfig(status: string): {
  label: string;
  className: string;
} {
  const configs: Record<string, { label: string; className: string }> = {
    PENDING: { label: 'Pending', className: 'bg-gray-100 text-gray-600' },
    PROCESSING: { label: 'Processing', className: 'bg-blue-100 text-blue-700' },
    SENT: { label: 'Sent', className: 'bg-green-100 text-green-700' },
    FAILED: { label: 'Failed', className: 'bg-red-100 text-red-700' },
    RETRYING: { label: 'Retrying', className: 'bg-yellow-100 text-yellow-700' },
    CANCELLED: { label: 'Cancelled', className: 'bg-slate-100 text-slate-600' },
  };
  return configs[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' };
}

export function successRate(sent: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((sent / total) * 100);
}
