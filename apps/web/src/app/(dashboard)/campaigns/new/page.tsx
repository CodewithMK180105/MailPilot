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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  const [subjectValue, setSubjectValue] = useState('');
  const [detectedVars, setDetectedVars] = useState<string[]>([]);
  const [invalidVars, setInvalidVars] = useState<{ raw: string; suggestion: string }[]>([]);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [previewRecipientIdx, setPreviewRecipientIdx] = useState(0);
  const [previewHtml, setPreviewHtml] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Manual entry state
  const [manualColumns, setManualColumns] = useState<string[]>(['email', 'name']);
  const [manualRows, setManualRows] = useState<Record<string, string>[]>([{ email: '', name: '' }]);
  // Add column inline input state
  const [newColumnName, setNewColumnName] = useState('');
  const [columnNameError, setColumnNameError] = useState('');
  const [showAddColumn, setShowAddColumn] = useState(false);

  const {
    register: registerStep1,
    handleSubmit: handleStep1,
    getValues: getStep1Values,
    formState: { errors: step1Errors },
  } = useForm<Step1Form>({ resolver: zodResolver(step1Schema) });

  // ─── Variable Detection (subject + body) ───────────────────────────────
  // Scans ALL {{...}} placeholders — classifies each as valid or invalid.
  const detectVars = (body: string, subject: string) => {
    const allVarRegex = /\{\{([^}]+)\}\}/g;
    const validRegex = /^[a-z0-9_]+$/;
    const validSet = new Set<string>();
    const invalidMap = new Map<string, string>(); // raw → suggestion
    for (const text of [subject, body]) {
      let match;
      const r = new RegExp(allVarRegex.source, 'g');
      while ((match = r.exec(text)) !== null) {
        const raw = match[1].trim();
        if (validRegex.test(raw)) {
          validSet.add(raw);
        } else {
          const suggestion = raw.toLowerCase().replace(/ /g, '_').replace(/[^a-z0-9_]/g, '');
          invalidMap.set(raw, suggestion || '???');
        }
      }
    }
    setDetectedVars(Array.from(validSet));
    setInvalidVars(Array.from(invalidMap.entries()).map(([raw, suggestion]) => ({ raw, suggestion })));
  };

  // ─── Subject Preview Resolver ─────────────────────────────────────────────
  // Replaces {{variable}} placeholders with actual recipient values for preview.
  const renderSubjectPreview = (subject: string, data: Record<string, string>): string => {
    return subject.replace(/\{\{([^}]+)\}\}/g, (_, key: string) => {
      const k = key.trim();
      return data[k] ?? `{{${k}}}`;
    });
  };

  // ─── Variable Name Sanitization ──────────────────────────────────────────
  // Auto-transform as user types: uppercase→lowercase, space→underscore.
  // Returns { value, error } — error is set if remaining invalid chars exist.
  const transformColumnName = (raw: string): { value: string; error: string } => {
    // Step 1: auto-convert uppercase → lowercase, space → underscore
    const transformed = raw.toLowerCase().replace(/ /g, '_');
    // Step 2: detect any remaining invalid chars
    const invalidChars = transformed.match(/[^a-z0-9_]/g);
    if (invalidChars) {
      const unique = [...new Set(invalidChars)].map((c) => `"${c}"`).join(', ');
      return {
        value: transformed,
        error: `Invalid character(s): ${unique}. Only a–z, 0–9, and _ are allowed.`,
      };
    }
    return { value: transformed, error: '' };
  };

  // Legacy helper used by addManualColumn
  const sanitizeVarName = (raw: string): string | null => {
    const { value, error } = transformColumnName(raw);
    if (error || !value) return null;
    return value;
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
    if (invalidVars.length > 0) {
      toast.error('Fix invalid template variables before proceeding');
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
      setIsUploading(true);
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
      } finally {
        setIsUploading(false);
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
    if (!campaign || isValidating) return;
    setIsValidating(true);
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
    } finally {
      setIsValidating(false);
    }
  };

  const addManualColumn = () => {
    const raw = newColumnName.trim();
    if (!raw) {
      setColumnNameError('Column name cannot be empty.');
      return;
    }
    const { value: colName, error } = transformColumnName(raw);
    if (error) {
      setColumnNameError(error);
      return;
    }
    if (!colName) {
      setColumnNameError('Column name must contain at least one letter or digit.');
      return;
    }
    if (manualColumns.includes(colName)) {
      setColumnNameError(`Column "${colName}" already exists.`);
      return;
    }
    setManualColumns((c) => [...c, colName]);
    setManualRows((rows) => rows.map((r) => ({ ...r, [colName]: '' })));
    setNewColumnName('');
    setColumnNameError('');
    setShowAddColumn(false);
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
            <p className="text-sm text-muted-foreground mt-1">
              Give your campaign a name and subject line. You can personalise both with
              dynamic variables like <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">{'{{name}}'}</code>.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStep1(onStep1)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Campaign Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g. Q3 Product Launch"
                  {...registerStep1('name')}
                />
                {step1Errors.name ? (
                  <p className="text-red-500 text-xs">{step1Errors.name.message}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Used internally — recipients won't see this.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">
                  Email Subject Line <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="subject"
                  placeholder="e.g. Hi {{name}}, exciting news from {{company}}!"
                  {...registerStep1('subject')}
                  onChange={(e) => {
                    registerStep1('subject').onChange(e);
                    setSubjectValue(e.target.value);
                    detectVars(bodyTemplate, e.target.value);
                  }}
                />
                {step1Errors.subject ? (
                  <p className="text-red-500 text-xs">{step1Errors.subject.message}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Variables like <code className="font-mono bg-muted px-1 rounded">{'{{name}}'}</code> will be replaced per recipient. Detected variables are listed on the next step.
                  </p>
                )}
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
                  className={cn(
                    'font-mono text-sm min-h-[300px] resize-none',
                    invalidVars.length > 0 && 'border-red-400 focus-visible:ring-red-400',
                  )}
                  placeholder={`Hi {{name}},\n\nWe wanted to reach out about your upcoming meeting on {{date}}.\n\nJoin here: {{meeting_link}}\n\nBest regards,\nThe Team`}
                  value={bodyTemplate}
                  onChange={(e) => {
                    setBodyTemplate(e.target.value);
                    detectVars(e.target.value, subjectValue);
                  }}
                />
                {/* Invalid variable errors */}
                {invalidVars.length > 0 && (
                  <div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-3 space-y-1.5">
                    <p className="text-xs font-semibold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                      <XCircle className="h-3.5 w-3.5" />
                      {invalidVars.length} invalid variable{invalidVars.length > 1 ? 's' : ''} — fix before continuing:
                    </p>
                    <ul className="space-y-1">
                      {invalidVars.map(({ raw, suggestion }) => (
                        <li key={raw} className="text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                          <span className="font-mono bg-red-100 dark:bg-red-900/50 px-1 py-0.5 rounded flex-shrink-0">{`{{${raw}}}`}</span>
                          <span className="text-muted-foreground">
                            → rename to{' '}
                            <code className="font-mono text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/50 px-1 rounded">{`{{${suggestion}}}`}</code>
                            {' '}(only a–z, 0–9, _ allowed)
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button onClick={onStep2Next} disabled={invalidVars.length > 0}>
                  Next: Add Recipients <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                {invalidVars.length > 0 && (
                  <p className="text-xs text-red-500 self-center">
                    Fix {invalidVars.length} invalid variable{invalidVars.length > 1 ? 's' : ''} above to continue.
                  </p>
                )}
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
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      No variables yet. Use <code className="font-mono bg-muted px-1 rounded">{'{{variable_name}}'}</code> in your subject or body.
                    </p>
                    <div className="rounded-md bg-muted/60 p-2.5 text-xs text-muted-foreground space-y-1">
                      <p className="font-medium text-foreground">Naming rules:</p>
                      <p>✓ lowercase letters, digits, underscores</p>
                      <p>✗ spaces, hyphens, special chars</p>
                      <p className="font-mono text-primary">{'{{first_name}}'} {'{{order_id}}'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
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
                    <p className="text-xs text-muted-foreground border-t pt-3">
                      <strong className="text-foreground">Next step:</strong> upload a recipient file whose column headers match each variable above.
                    </p>
                  </div>
                )}
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
                  {isUploading ? (
                    <>
                      <span className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent block mb-4" />
                      <p className="text-sm font-medium text-foreground">Validating recipients…</p>
                      <p className="text-xs text-muted-foreground mt-1">Checking dynamic variables…</p>
                    </>
                  ) : (
                    <>
                      <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
                      <p className="text-sm font-medium text-foreground">
                        {isDragActive ? 'Drop your file here' : 'Drag & drop your Excel or CSV file'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Supports .xlsx, .xls, .csv — max 5MB, 10,000 rows
                      </p>
                      <Button variant="outline" size="sm" className="mt-4" disabled={isUploading}>
                        Browse Files
                      </Button>
                    </>
                  )}
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
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 items-start">
                    <Button variant="outline" size="sm" onClick={addManualRow}>
                      <Plus className="mr-1 h-4 w-4" /> Add Row
                    </Button>
                    {showAddColumn ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <Input
                            autoFocus
                            value={newColumnName}
                            onChange={(e) => {
                              const { value, error } = transformColumnName(e.target.value);
                              setNewColumnName(value);
                              setColumnNameError(error);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { e.preventDefault(); addManualColumn(); }
                              if (e.key === 'Escape') { setShowAddColumn(false); setNewColumnName(''); setColumnNameError(''); }
                            }}
                            placeholder="e.g. first_name"
                            className={cn('h-8 w-40 text-xs', columnNameError && 'border-red-400 focus-visible:ring-red-400')}
                          />
                          <Button size="sm" className="h-8 text-xs" onClick={addManualColumn} disabled={!!columnNameError}>
                            Add
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            className="h-8 text-xs text-muted-foreground"
                            onClick={() => { setShowAddColumn(false); setNewColumnName(''); setColumnNameError(''); }}
                          >
                            Cancel
                          </Button>
                        </div>
                        {columnNameError ? (
                          <p className="text-xs text-red-500">{columnNameError}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Uppercase letters are automatically lowercased · Spaces become{' '}
                            <code className="font-mono bg-muted px-1 rounded">_</code> · Special characters are not allowed
                          </p>
                        )}
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setShowAddColumn(true)}>
                        <Plus className="mr-1 h-4 w-4" /> Add Column
                      </Button>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                      {isValidating && (
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          Validating recipients…
                        </span>
                      )}
                      <Button size="sm" onClick={handleManualSubmit} disabled={isValidating}>
                        {isValidating ? 'Saving…' : 'Save Recipients'}
                      </Button>
                    </div>
                  </div>
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
                <Select
                  value={String(previewRecipientIdx)}
                  onValueChange={(val) => {
                    const idx = parseInt(val);
                    setPreviewRecipientIdx(idx);
                    void loadPreview(idx);
                  }}
                >
                  <SelectTrigger className="h-9 w-64 text-sm">
                    <SelectValue placeholder="Select a recipient" />
                  </SelectTrigger>
                  <SelectContent>
                    {uploadResult.preview.map((row, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {row['email'] ?? `Row ${i + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="border rounded-xl overflow-hidden bg-gray-100">
              <div className="bg-white border-b px-4 py-2 text-xs text-muted-foreground">
                <strong>To:</strong>{' '}
                {uploadResult?.preview[previewRecipientIdx]?.['email'] ?? 'recipient@example.com'} •{' '}
                <strong>Subject:</strong>{' '}
                {uploadResult?.preview[previewRecipientIdx]
                  ? renderSubjectPreview(getStep1Values('subject'), uploadResult.preview[previewRecipientIdx]!)
                  : getStep1Values('subject')}
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
