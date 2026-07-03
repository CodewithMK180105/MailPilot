"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { toast } from "sonner";
import {
  Plus,
  Copy,
  Trash2,
  Eye,
  MailOpen,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { CampaignSummary } from "@email-platform/shared";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn, formatDateShort, getStatusConfig, successRate } from "@/lib/utils";
import { useApiClient } from "@/hooks/use-api-client";

type PaginatedCampaigns = {
  data: CampaignSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const columnHelper = createColumnHelper<CampaignSummary>();

export default function CampaignsPage() {
  const router = useRouter();
  const { api, status } = useApiClient();
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadCampaigns = useCallback(
    async (page = 1, status = "") => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: "20" });
        if (status) params.set("status", status);

        const data = await api.get<PaginatedCampaigns>(`/campaigns?${params}`);
        setCampaigns(data.data);
        setPagination({
          page: data.page,
          totalPages: data.totalPages,
          total: data.total,
        });
      } catch {
        toast.error("Failed to load campaigns");
      } finally {
        setIsLoading(false);
      }
    },
    [api],
  );

  useEffect(() => {
    if (status !== 'authenticated') return;
    void loadCampaigns(1, statusFilter);
  }, [loadCampaigns, statusFilter, status]);

  const handleDuplicate = async (id: string) => {
    try {
      await api.post(`/campaigns/${id}/duplicate`);
      toast.success("Campaign duplicated");
      void loadCampaigns(pagination.page, statusFilter);
    } catch {
      toast.error("Failed to duplicate campaign");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/campaigns/${deleteTarget.id}`);
      toast.success("Campaign deleted");
      void loadCampaigns(pagination.page, statusFilter);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e.message ?? "Failed to delete campaign");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const columns = [
    columnHelper.accessor("name", {
      header: "Campaign",
      cell: (info) => (
        <div>
          <Link
            href={`/campaigns/${info.row.original.id}`}
            className="font-medium text-foreground hover:text-primary transition-colors"
          >
            {info.getValue()}
          </Link>
          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">
            {info.row.original.subject}
          </p>
        </div>
      ),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: (info) => {
        const config = getStatusConfig(info.getValue());
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
              config.className,
            )}
          >
            <span
              className={cn("h-1.5 w-1.5 rounded-full", config.dotClassName)}
            />
            {config.label}
          </span>
        );
      },
    }),
    columnHelper.accessor("totalRecipients", {
      header: "Recipients",
      cell: (info) => (
        <span className="text-sm tabular-nums">
          {info.getValue().toLocaleString()}
        </span>
      ),
    }),
    columnHelper.accessor("sentCount", {
      header: "Sent",
      cell: (info) => (
        <span className="text-sm tabular-nums text-green-600">
          {info.getValue().toLocaleString()}
        </span>
      ),
    }),
    columnHelper.accessor("failedCount", {
      header: "Failed",
      cell: (info) => (
        <span className="text-sm tabular-nums text-red-500">
          {info.getValue().toLocaleString()}
        </span>
      ),
    }),
    columnHelper.display({
      id: "successRate",
      header: "Success %",
      cell: (info) => {
        const rate = successRate(
          info.row.original.sentCount,
          info.row.original.totalRecipients,
        );
        return (
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${rate}%` }}
              />
            </div>
            <span className="text-sm tabular-nums text-muted-foreground">
              {rate}%
            </span>
          </div>
        );
      },
    }),
    columnHelper.accessor("createdAt", {
      header: "Created",
      cell: (info) => (
        <span className="text-sm text-muted-foreground">
          {formatDateShort(info.getValue())}
        </span>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: (info) => {
        const { id, name, status } = info.row.original;
        const canDelete = ["DRAFT", "CANCELLED", "COMPLETED"].includes(status);
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => router.push(`/campaigns/${id}`)}
              title="View campaign"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleDuplicate(id)}
              title="Duplicate campaign"
            >
              <Copy className="h-4 w-4" />
            </Button>
            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                onClick={() => setDeleteTarget({ id, name })}
                title="Delete campaign"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
    }),
  ];

  const table = useReactTable({
    data: campaigns,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const statuses = [
    "",
    "DRAFT",
    "READY",
    "SENDING",
    "PAUSED",
    "COMPLETED",
    "FAILED",
    "CANCELLED",
  ];

  return (
    <div className="p-8">
      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title={`Delete "${deleteTarget?.name ?? ''}"?`}
        description="This campaign and all its data will be permanently deleted. This action cannot be undone."
        confirmLabel="Delete Campaign"
        cancelLabel="Keep Campaign"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            {pagination.total} campaign{pagination.total !== 1 ? "s" : ""} total
          </p>
        </div>
        <Button
          onClick={() => router.push("/campaigns/new")}
          className="bg-primary shadow-lg shadow-primary/20"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Campaign
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {statuses.map((s) => {
          const config = s
            ? getStatusConfig(s as CampaignSummary["status"])
            : null;
          return (
            <button
              key={s || "all"}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                statusFilter === s
                  ? "bg-primary text-white border-primary"
                  : "bg-background border-border text-muted-foreground hover:border-primary/50",
              )}
            >
              {s ? config?.label : "All Campaigns"}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <MailOpen className="h-12 w-12 text-muted-foreground/30" />
            <div className="text-center">
              <p className="text-lg font-semibold text-foreground">
                No campaigns yet
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                {statusFilter
                  ? `No campaigns with status "${statusFilter}"`
                  : "Create your first campaign to start sending emails"}
              </p>
            </div>
            {!statusFilter && (
              <Button
                onClick={() => router.push("/campaigns/new")}
                className="bg-primary mt-2"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Campaign
              </Button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b bg-muted/40">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => loadCampaigns(pagination.page - 1, statusFilter)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => loadCampaigns(pagination.page + 1, statusFilter)}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
