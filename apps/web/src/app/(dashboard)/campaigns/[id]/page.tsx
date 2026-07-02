'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { toast } from 'sonner';
import {
  ArrowLeft, Pause, Play, XCircle, BarChart3, ChevronLeft, ChevronRight,
} from 'lucide-react';
import type { Campaign, CampaignProgress, EmailJob } from '@email-platform/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, formatDate, getStatusConfig, getJobStatusConfig } from '@/lib/utils';
import { useApiClient } from '@/hooks/use-api-client';

// ─── Animated Donut Chart (Signature Element) ────────────────────────────────
function DonutChart({ sent, failed, pending, total }: {
  sent: number; failed: number; pending: number; total: number;
}) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const successPct = total > 0 ? sent / total : 0;
  const failedPct = total > 0 ? failed / total : 0;
  const successOffset = circumference - successPct * circumference;
  const failedOffset = circumference - failedPct * circumference;
  const successPercent = Math.round(successPct * 100);

  return (
    <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>
      <svg
        width="180"
        height="180"
        viewBox="0 0 180 180"
        className="rotate-[-90deg]"
      >
        {/* Background track */}
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="16"
        />
        {/* Failed segment */}
        {failedPct > 0 && (
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="#EF4444"
            strokeWidth="16"
            strokeDasharray={circumference}
            strokeDashoffset={failedOffset}
            strokeLinecap="round"
            className="donut-segment"
            style={{
              transformOrigin: 'center',
              transform: `rotate(${successPct * 360}deg)`,
            }}
          />
        )}
        {/* Success segment */}
        {successPct > 0 && (
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="#16A34A"
            strokeWidth="16"
            strokeDasharray={circumference}
            strokeDashoffset={successOffset}
            strokeLinecap="round"
            className="donut-segment"
          />
        )}
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-foreground">{successPercent}%</span>
        <span className="text-xs text-muted-foreground font-medium">Success</span>
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, color,
}: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 text-center">
      <p className="text-2xl font-bold tabular-nums" style={{ color }}>
        {value.toLocaleString()}
      </p>
      <p className="text-xs text-muted-foreground mt-1 font-medium">{label}</p>
    </div>
  );
}

// ─── Jobs Table ───────────────────────────────────────────────────────────────
type JobRow = EmailJob & { recipientEmail?: string };
const colHelper = createColumnHelper<JobRow>();

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { api, status } = useApiClient();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [progress, setProgress] = useState<CampaignProgress | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [jobsPagination, setJobsPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadCampaign = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([
        api.get<Campaign>(`/campaigns/${params.id}`),
        api.get<CampaignProgress>(`/campaigns/${params.id}/progress`),
      ]);
      setCampaign(c);
      setProgress(p);
    } catch {
      toast.error('Failed to load campaign');
    } finally {
      setIsLoading(false);
    }
  }, [api, params.id]);

  const loadJobs = useCallback(async (page = 1, status = '') => {
    try {
      const qs = new URLSearchParams({ page: String(page), limit: '20' });
      if (status) qs.set('status', status);
      const data = await api.get<{
        data: EmailJob[];
        total: number;
        page: number;
        totalPages: number;
      }>(`/campaigns/${params.id}/jobs?${qs}`);
      setJobs(data.data.map((j) => ({
        ...j,
        recipientEmail: (j.recipient as { email?: string })?.email,
      })));
      setJobsPagination({ page: data.page, totalPages: data.totalPages, total: data.total });
    } catch {/* silent */}
  }, [api, params.id]);

  // Auto-polling when SENDING
  useEffect(() => {
    if (status !== 'authenticated') return;
    void loadCampaign();
    void loadJobs(1, statusFilter);
  }, [loadCampaign, loadJobs, statusFilter, status]);

  useEffect(() => {
    if (campaign?.status === 'SENDING') {
      pollRef.current = setInterval(async () => {
        const p = await api.get<CampaignProgress>(`/campaigns/${params.id}/progress`);
        setProgress(p);
        // Reload campaign to check if completed
        const c = await api.get<Campaign>(`/campaigns/${params.id}`);
        setCampaign(c);
        if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(c.status)) {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      }, 3000);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [campaign?.status, api, params.id]);

  const handleAction = async (action: 'pause' | 'resume' | 'cancel') => {
    try {
      await api.post(`/campaigns/${params.id}/${action}`);
      toast.success(`Campaign ${action}d`);
      void loadCampaign();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e.message ?? `Failed to ${action} campaign`);
    }
  };

  const columns = [
    colHelper.accessor('recipientEmail', {
      header: 'Email',
      cell: (i) => <span className="text-sm font-mono">{i.getValue() ?? '—'}</span>,
    }),
    colHelper.accessor('status', {
      header: 'Status',
      cell: (i) => {
        const config = getJobStatusConfig(i.getValue());
        return (
          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', config.className)}>
            {config.label}
          </span>
        );
      },
    }),
    colHelper.accessor('failureReason', {
      header: 'Failure Reason',
      cell: (i) => (
        <span className="text-xs text-red-500 max-w-xs truncate block">{i.getValue() ?? '—'}</span>
      ),
    }),
    colHelper.accessor('sentAt', {
      header: 'Sent At',
      cell: (i) => (
        <span className="text-xs text-muted-foreground">
          {i.getValue() ? formatDate(i.getValue()!) : '—'}
        </span>
      ),
    }),
    colHelper.accessor('attemptCount', {
      header: 'Attempts',
      cell: (i) => <span className="text-sm tabular-nums">{i.getValue()}</span>,
    }),
  ];

  const table = useReactTable({
    data: jobs,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!campaign) return null;

  const statusConfig = getStatusConfig(campaign.status);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/campaigns')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to campaigns
        </button>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{campaign.name}</h1>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border',
                  statusConfig.className,
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', statusConfig.dotClassName)} />
                {statusConfig.label}
              </span>
            </div>
            <p className="text-muted-foreground text-sm">{campaign.subject}</p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            {campaign.status === 'SENDING' && (
              <Button
                variant="outline"
                onClick={() => handleAction('pause')}
                className="border-amber-200 text-amber-600 hover:bg-amber-50"
              >
                <Pause className="mr-2 h-4 w-4" /> Pause
              </Button>
            )}
            {campaign.status === 'PAUSED' && (
              <Button
                onClick={() => handleAction('resume')}
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="mr-2 h-4 w-4" /> Resume
              </Button>
            )}
            {['SENDING', 'PAUSED'].includes(campaign.status) && (
              <Button
                variant="outline"
                onClick={() => handleAction('cancel')}
                className="border-red-200 text-red-500 hover:bg-red-50"
              >
                <XCircle className="mr-2 h-4 w-4" /> Cancel
              </Button>
            )}
            {campaign.status === 'COMPLETED' && (
              <Button asChild className="bg-primary">
                <Link href={`/campaigns/${campaign.id}/report`}>
                  <BarChart3 className="mr-2 h-4 w-4" /> View Report
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Progress Dashboard */}
      {progress && (
        <div className="mb-8">
          <div className="flex items-center gap-8">
            {/* Donut Chart */}
            <div className="flex-shrink-0">
              <DonutChart
                sent={progress.sent}
                failed={progress.failed}
                pending={progress.pending}
                total={progress.total}
              />
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-4 flex-1">
              <StatCard label="Total" value={progress.total} color="#374151" />
              <StatCard label="Sent" value={progress.sent} color="#16A34A" />
              <StatCard label="Failed" value={progress.failed} color="#DC2626" />
              <StatCard label="Pending" value={progress.pending} color="#6B7280" />
              <StatCard label="Processing" value={progress.processing} color="#2563EB" />
              <StatCard label="Retrying" value={progress.retrying} color="#D97706" />
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-6 rounded-xl border bg-card p-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>Overall Progress</span>
              <span>{progress.successPercentage}% sent successfully</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full flex">
                <div
                  className="h-full bg-green-500 transition-all duration-700"
                  style={{ width: `${(progress.sent / Math.max(progress.total, 1)) * 100}%` }}
                />
                <div
                  className="h-full bg-red-400 transition-all duration-700"
                  style={{ width: `${(progress.failed / Math.max(progress.total, 1)) * 100}%` }}
                />
              </div>
            </div>
            <div className="flex gap-4 mt-2 text-xs">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500" /> Sent
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-400" /> Failed
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-gray-200" /> Pending
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Recipients / Jobs Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">
            Recipients ({jobsPagination.total.toLocaleString()})
          </CardTitle>
          <div className="flex gap-2">
            {['', 'SENT', 'FAILED', 'PENDING', 'RETRYING'].map((s) => (
              <button
                key={s || 'all'}
                onClick={() => {
                  setStatusFilter(s);
                  void loadJobs(1, s);
                }}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                  statusFilter === s
                    ? 'bg-primary text-white border-primary'
                    : 'bg-background border-border text-muted-foreground hover:border-primary/50',
                )}
              >
                {s || 'All'}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id} className="border-b bg-muted/30">
                    {hg.headers.map((h) => (
                      <th key={h.id} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-muted/20">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
                {jobs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-muted-foreground text-sm">
                      No jobs found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {jobsPagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-xs text-muted-foreground">
                Page {jobsPagination.page} of {jobsPagination.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={jobsPagination.page <= 1}
                  onClick={() => loadJobs(jobsPagination.page - 1, statusFilter)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={jobsPagination.page >= jobsPagination.totalPages}
                  onClick={() => loadJobs(jobsPagination.page + 1, statusFilter)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
