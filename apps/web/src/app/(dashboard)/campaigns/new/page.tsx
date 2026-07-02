'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  ArrowLeft, ArrowRight, Upload, Plus, Trash2, CheckCircle2, XCircle,
  Eye, Send, AlertTriangle, FileText, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApiClient } from '@/hooks/use-api-client';
import type { Campaign, UploadResult, ValidationResult } from '@email-platform/shared';
import { cn } from '@/lib/utils';

// ─── Schemas ──────────────────────────────────────────────────────────────────
const step1Schema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  subject: z.string().min(1, 'Email subject is required'),
});
type Step1Form = z.infer<typeof step1Schema>;

// ─── Step Indicator ──────────────────────────────────────────────────────────
const steps = [
  { id: 1, label: 'Details' },
  { id: 2, label: 'Template' },
  { id: 3, label: 'Recipients' },
  { id: 4, label: 'Preview' },
  { id: 5, label: 'Confirm' },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, idx) => (
        <div key={step.id} className="flex items-center">
          <div
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold border-2 transition-all',
              step.id < current
                ? 'bg-primary border-primary text-white'
                : step.id === current
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-background border-border text-muted-foreground',
            )}
          >
            {step.id < current ? <CheckCircle2 className="h-5 w-5" /> : step.id}
          </div>
          <span
            className={cn(
              'ml-2 text-sm font-medium hidden sm:block',
              step.id === current ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            {step.label}
          </span>
          {idx < steps.length - 1 && (
            <ChevronRight className="mx-3 h-4 w-4 text-muted-foreground" />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function NewCampaignPage() {
  const router = useRouter();
  const { api } = useApiClient();

  const [step, setStep] = useState(1);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [bodyTemplate, setBodyTemplate] = useState('');
  const [detectedVars, setDetectedVars] = useState<string[]>([]);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [previewRecipientIdx, setPreviewRecipientIdx] = useState(0);
  const [previewHtml, setPreviewHtml] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Manual entry state
  const [manualColumns, setManualColumns] = useState<string[]>(['email', 'name']);
  const [manualRows, setManualRows] = useState<Record<string, string>[]>([{ email: '', name: '' }]);

  const {
    register: registerStep1,
    handleSubmit: handleStep1,
    getValues: getStep1Values,
    formState: { errors: step1Errors },
  } = useForm<Step1Form>({ resolver: zodResolver(step1Schema) });

  // ─── Variable Detection ──────────────────────────────────────────────────
  const detectVars = (text: string) => {
    const regex = /\{\{(\w+)\}\}/g;
    const vars = new Set<string>();
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match[1]) vars.add(match[1]);
    }
    setDetectedVars(Array.from(vars));
  };

  // ─── Step 1: Details ──────────────────────────────────────────────────────
  const onStep1 = async (data: Step1Form) => {
    try {
      const created = await api.post<Campaign>('/campaigns', {
        name: data.name,
        subject: data.subject,
        bodyTemplate: bodyTemplate || '{{name}}, welcome!',
      });
      setCampaign(created);
      setStep(2);
    } catch {
      toast.error('Failed to create campaign');
    }
  };

  // ─── Step 2: Template ─────────────────────────────────────────────────────
  const onStep2Next = async () => {
    if (!campaign || !bodyTemplate.trim()) {
      toast.error('Please enter an email body template');
      return;
    }
    try {
      await api.patch(`/campaigns/${campaign.id}`, { bodyTemplate });
      setStep(3);
    } catch {
      toast.error('Failed to save template');
    }
  };

  // ─── Step 3: Upload ───────────────────────────────────────────────────────
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxSize: 5 * 1024 * 1024,
    onDrop: async (files) => {
      const file = files[0];
      if (!file || !campaign) return;
      try {
        const fd = new FormData();
        fd.append('file', file);
        const result = await api.upload<{ totalRows: number; columns: string[]; preview: Record<string, string>[]; validation: ValidationResult }>(
          `/campaigns/${campaign.id}/recipients/upload`,
          fd,
        );
        setUploadResult({ totalRows: result.totalRows, columns: result.columns, preview: result.preview });
        setValidation(result.validation);
        toast.success(`Uploaded ${result.totalRows} recipients`);
      } catch (err: unknown) {
        const e = err as { message?: string };
        toast.error(e.message ?? 'Upload failed');
      }
    },
    onDropRejected: (rejections) => {
      if (rejections[0]?.errors[0]?.code === 'file-too-large') {
        toast.error('File exceeds 5MB limit');
      } else {
        toast.error('Invalid file type. Please use .xlsx, .xls, or .csv');
      }
    },
  });

  const handleManualSubmit = async () => {
    if (!campaign) return;
    try {
      const result = await api.post<{ totalRows: number; columns: string[]; preview: Record<string, string>[]; validation: ValidationResult }>(
        `/campaigns/${campaign.id}/recipients/manual`,
        { columns: manualColumns, rows: manualRows },
      );
      setUploadResult({ totalRows: result.totalRows, columns: result.columns, preview: result.preview });
      setValidation(result.validation);
      toast.success(`Saved ${result.totalRows} recipients`);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e.message ?? 'Failed to save recipients');
    }
  };

  const addManualColumn = () => {
    const name = prompt('Column name:');
    if (!name?.trim()) return;
    const colName = name.trim();
    setManualColumns((c) => [...c, colName]);
    setManualRows((rows) => rows.map((r) => ({ ...r, [colName]: '' })));
  };

  const addManualRow = () => {
    const empty: Record<string, string> = {};
    manualColumns.forEach((c) => { empty[c] = ''; });
    setManualRows((r) => [...r, empty]);
  };

  const removeManualRow = (idx: number) => {
    setManualRows((r) => r.filter((_, i) => i !== idx));
  };

  // ─── Step 4: Preview ─────────────────────────────────────────────────────
  const loadPreview = async (idx: number) => {
    if (!uploadResult?.preview[idx]) return;
    try {
      const data = await api.post<{ rendered: string }>('/template/preview', {
        template: bodyTemplate,
        data: uploadResult.preview[idx],
      });
      setPreviewHtml(data.rendered);
    } catch {
      toast.error('Preview failed');
    }
  };

  const onStep3Next = () => {
    if (!uploadResult) {
      toast.error('Please upload or enter recipient data');
      return;
    }
    if (!validation?.isValid) {
      toast.error('Fix template variables before proceeding');
      return;
    }
    void loadPreview(0);
    setStep(4);
  };

  // ─── Step 5: Send ─────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!campaign) return;
    setIsSending(true);
    try {
      const result = await api.post<{ jobsQueued: number }>(`/campaigns/${campaign.id}/send`);
      toast.success(`${result.jobsQueued} emails queued for sending!`);
      router.push(`/campaigns/${campaign.id}`);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e.message ?? 'Failed to send campaign');
    } finally {
      setIsSending(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <button
          onClick={() => router.push('/campaigns')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to campaigns
        </button>
        <h1 className="text-2xl font-bold">New Campaign</h1>
      </div>

      <StepIndicator current={step} />

      {/* ─── Step 1: Details ─────────────────────────────────────────────── */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStep1(onStep1)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name</Label>
                <Input
                  id="name"
                  placeholder="Q1 Customer Outreach"
                  {...registerStep1('name')}
                />
                {step1Errors.name && (
                  <p className="text-red-500 text-xs">{step1Errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Email Subject</Label>
                <Input
                  id="subject"
                  placeholder="Hi {{name}}, we have something for you..."
                  {...registerStep1('subject')}
                />
                {step1Errors.subject && (
                  <p className="text-red-500 text-xs">{step1Errors.subject.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  You can use Handlebars variables like &#123;&#123;name&#125;&#125; in the subject line too.
                </p>
              </div>
              <div className="flex justify-end">
                <Button type="submit">
                  Next: Write Template <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ─── Step 2: Template ───────────────────────────────────────────── */}
      {step === 2 && (
        <div className="grid grid-cols-3 gap-6">
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>Email Body Template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>
                  Body Template{' '}
                  <span className="text-muted-foreground font-normal text-xs">
                    — Use &#123;&#123;variable&#125;&#125; for dynamic content
                  </span>
                </Label>
                <Textarea
                  className="font-mono text-sm min-h-[300px] resize-none"
                  placeholder="Hi {{name}},&#10;&#10;We wanted to reach out about your upcoming meeting on {{date}}.&#10;&#10;Join here: {{meeting_link}}&#10;&#10;Best regards,&#10;The Team"
                  value={bodyTemplate}
                  onChange={(e) => {
                    setBodyTemplate(e.target.value);
                    detectVars(e.target.value);
                  }}
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button onClick={onStep2Next}>
                  Next: Add Recipients <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Detected variables panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Detected Variables</CardTitle>
              </CardHeader>
              <CardContent>
                {detectedVars.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Type &#123;&#123;variableName&#125;&#125; in your template to detect variables
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {detectedVars.map((v) => (
                      <span
                        key={v}
                        className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-mono font-medium"
                      >
                        {'{{'}{v}{'}}'}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Tip:</strong> Your recipient file must have columns
                    matching each variable.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ─── Step 3: Recipients ─────────────────────────────────────────── */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Recipients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs defaultValue="upload">
              <TabsList className="mb-4">
                <TabsTrigger value="upload">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload File
                </TabsTrigger>
                <TabsTrigger value="manual">
                  <FileText className="mr-2 h-4 w-4" />
                  Manual Entry
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-4">
                <div
                  {...getRootProps()}
                  className={cn(
                    'border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all',
                    isDragActive
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-muted/30',
                  )}
                >
                  <input {...getInputProps()} />
                  <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
                  <p className="text-sm font-medium text-foreground">
                    {isDragActive ? 'Drop your file here' : 'Drag & drop your Excel or CSV file'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports .xlsx, .xls, .csv — max 5MB, 10,000 rows
                  </p>
                  <Button variant="outline" size="sm" className="mt-4">
                    Browse Files
                  </Button>
                </div>

                {uploadResult && (
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">
                        {uploadResult.totalRows} recipients loaded
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        Columns: {uploadResult.columns.join(', ')}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            {uploadResult.columns.map((c) => (
                              <th key={c} className="py-1.5 px-2 text-left font-semibold text-muted-foreground">
                                {c}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {uploadResult.preview.map((row, i) => (
                            <tr key={i} className="border-b last:border-0">
                              {uploadResult.columns.map((c) => (
                                <td key={c} className="py-1.5 px-2 text-foreground">
                                  {row[c] ?? ''}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="manual" className="space-y-4">
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        {manualColumns.map((col) => (
                          <th key={col} className="px-3 py-2 text-left font-semibold text-xs text-muted-foreground">
                            {col}
                          </th>
                        ))}
                        <th className="px-2 py-2 w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {manualRows.map((row, ri) => (
                        <tr key={ri} className="border-b last:border-0">
                          {manualColumns.map((col) => (
                            <td key={col} className="px-2 py-1">
                              <Input
                                value={row[col] ?? ''}
                                onChange={(e) => {
                                  const newRows = [...manualRows];
                                  newRows[ri] = { ...row, [col]: e.target.value };
                                  setManualRows(newRows);
                                }}
                                className="h-8 text-xs"
                                placeholder={col}
                              />
                            </td>
                          ))}
                          <td className="px-2 py-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500"
                              onClick={() => removeManualRow(ri)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={addManualRow}>
                    <Plus className="mr-1 h-4 w-4" /> Add Row
                  </Button>
                  <Button variant="outline" size="sm" onClick={addManualColumn}>
                    <Plus className="mr-1 h-4 w-4" /> Add Column
                  </Button>
                  <Button size="sm" onClick={handleManualSubmit} className="ml-auto">
                    Save Recipients
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            {/* Validation Panel */}
            {validation && (
              <div
                className={cn(
                  'rounded-lg border p-4',
                  validation.isValid
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200',
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  {validation.isValid ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span
                    className={cn(
                      'text-sm font-semibold',
                      validation.isValid ? 'text-green-700' : 'text-red-700',
                    )}
                  >
                    {validation.isValid
                      ? 'Template variables match — ready to send!'
                      : 'Template validation failed'}
                  </span>
                </div>
                {!validation.isValid && validation.missingVariables.length > 0 && (
                  <div>
                    <p className="text-xs text-red-600 mb-1">Missing variables in your file:</p>
                    <div className="flex flex-wrap gap-1">
                      {validation.missingVariables.map((v) => (
                        <span
                          key={v}
                          className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-xs font-mono"
                        >
                          {'{{'}{v}{'}}'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={onStep3Next} disabled={!validation?.isValid}>
                Next: Preview <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Step 4: Preview ─────────────────────────────────────────────── */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Email Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {uploadResult && (
              <div className="flex items-center gap-3">
                <Label className="text-sm">Preview recipient:</Label>
                <select
                  className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={previewRecipientIdx}
                  onChange={(e) => {
                    const idx = parseInt(e.target.value);
                    setPreviewRecipientIdx(idx);
                    void loadPreview(idx);
                  }}
                >
                  {uploadResult.preview.map((row, i) => (
                    <option key={i} value={i}>
                      {row['email'] ?? `Row ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="border rounded-xl overflow-hidden bg-gray-100">
              <div className="bg-white border-b px-4 py-2 text-xs text-muted-foreground">
                <strong>To:</strong>{' '}
                {uploadResult?.preview[previewRecipientIdx]?.['email'] ?? 'recipient@example.com'} •{' '}
                <strong>Subject:</strong> {getStep1Values('subject')}
              </div>
              {previewHtml ? (
                <iframe
                  srcDoc={previewHtml}
                  className="w-full h-[400px] border-0"
                  title="Email preview"
                  sandbox="allow-same-origin"
                />
              ) : (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  Loading preview...
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(3)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={() => setStep(5)}>
                Looks Good — Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Step 5: Confirm & Send ──────────────────────────────────────── */}
      {step === 5 && campaign && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Confirm & Send
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Campaign Name', value: campaign.name },
                { label: 'Email Subject', value: campaign.subject },
                { label: 'Total Recipients', value: uploadResult?.totalRows.toLocaleString() },
                { label: 'Template Variables', value: detectedVars.join(', ') || 'None' },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                  <p className="font-semibold text-foreground">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  Ready to send {uploadResult?.totalRows.toLocaleString()} emails
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  This will immediately queue all emails for delivery using your SendGrid account.
                  Sent emails cannot be unsent.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(4)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button
                onClick={handleSend}
                disabled={isSending}
                className="bg-primary shadow-lg shadow-primary/30 text-base px-8"
                size="lg"
              >
                {isSending ? (
                  <>
                    <span className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-5 w-5" />
                    Send {uploadResult?.totalRows.toLocaleString()} Emails Now
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
