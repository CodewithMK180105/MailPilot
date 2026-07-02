'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft, Download, CheckCircle2, XCircle, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useApiClient } from '@/hooks/use-api-client';
import { cn, formatDate } from '@/lib/utils';

interface ReportData {
  campaign: {
    id: string;
    name: string;
    subject: string;
    status: string;
    totalRecipients: number;
    sentCount: number;
    failedCount: number;
    startedAt: string | null;
    completedAt: string | null;
  };
  summary: {
    total: number;
    sent: number;
    failed: number;
    pending: number;
    processing: number;
    retrying: number;
    cancelled: number;
    successRate: number;
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function CampaignReportPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { api, status } = useApiClient();
  const [report, setReport] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadReport = useCallback(async () => {
    try {
      const data = await api.get<ReportData>(`/campaigns/${params.id}/report`);
      setReport(data);
    } catch {
      toast.error('Failed to load report');
    } finally {
      setIsLoading(false);
    }
  }, [api, params.id]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    void loadReport();
  }, [loadReport, status]);

  const handleExport = async (format: 'csv' | 'xlsx', filter: 'all' | 'sent' | 'failed') => {
    try {
      // Get auth token from session
      const sessionRes = await fetch('/api/auth/session');
      const session = await sessionRes.json() as Record<string, unknown>;
      const token = session['accessToken'] as string;

      const url = `${API_BASE}/api/v1/campaigns/${params.id}/report/export?format=${format}&filter=${filter}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        toast.error('Export failed');
        return;
      }

      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const contentDisposition = res.headers.get('content-disposition');
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] ?? `report.${format}`;
      a.href = downloadUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(downloadUrl);
      toast.success('Export downloaded');
    } catch {
      toast.error('Export failed');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push(`/campaigns/${params.id}`)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to campaign
        </button>
        <h1 className="text-2xl font-bold">Campaign Report</h1>
        <p className="text-muted-foreground mt-1">{report.campaign.name}</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Sent', value: report.summary.sent, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Failed', value: report.summary.failed, icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
          { label: 'Pending', value: report.summary.pending + report.summary.processing, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Success Rate', value: `${report.summary.successRate}%`, icon: CheckCircle2, color: 'text-primary', bg: 'bg-primary/5' },
        ].map((stat) => (
          <Card key={stat.label} className="overflow-hidden">
            <CardContent className="p-6">
              <div className={cn('inline-flex rounded-lg p-2 mb-3', stat.bg)}>
                <stat.icon className={cn('h-5 w-5', stat.color)} />
              </div>
              <p className={cn('text-3xl font-bold tabular-nums', stat.color)}>
                {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Campaign Info */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">Campaign Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {[
              { label: 'Subject', value: report.campaign.subject },
              { label: 'Total Recipients', value: report.campaign.totalRecipients.toLocaleString() },
              { label: 'Status', value: report.campaign.status },
              { label: 'Started At', value: report.campaign.startedAt ? formatDate(report.campaign.startedAt) : '—' },
              { label: 'Completed At', value: report.campaign.completedAt ? formatDate(report.campaign.completedAt) : '—' },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                <p className="font-medium">{item.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Export Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: 'All Recipients (CSV)', format: 'csv' as const, filter: 'all' as const },
              { label: 'All Recipients (Excel)', format: 'xlsx' as const, filter: 'all' as const },
              { label: 'Sent Only (CSV)', format: 'csv' as const, filter: 'sent' as const },
              { label: 'Sent Only (Excel)', format: 'xlsx' as const, filter: 'sent' as const },
              { label: 'Failed Only (CSV)', format: 'csv' as const, filter: 'failed' as const },
              { label: 'Failed Only (Excel)', format: 'xlsx' as const, filter: 'failed' as const },
            ].map((exp) => (
              <Button
                key={`${exp.format}-${exp.filter}`}
                variant="outline"
                className="justify-start text-sm h-11"
                onClick={() => handleExport(exp.format, exp.filter)}
              >
                <Download className="mr-2 h-4 w-4" />
                {exp.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
