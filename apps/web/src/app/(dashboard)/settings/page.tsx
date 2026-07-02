'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  User, Key, CheckCircle2, XCircle, Loader2, Save, Shield, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useApiClient } from '@/hooks/use-api-client';
import type { UserProfile, SendgridStatus } from '@email-platform/shared';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

const sendgridSchema = z.object({
  apiKey: z.string().startsWith('SG.', 'Must start with SG.'),
  fromEmail: z.string().email('Valid email required'),
  fromName: z.string().min(1, 'From name required'),
});

type ProfileForm = z.infer<typeof profileSchema>;
type SendgridForm = z.infer<typeof sendgridSchema>;

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const { api, status } = useApiClient();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sendgridStatus, setSendgridStatus] = useState<SendgridStatus | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isSgLoading, setIsSgLoading] = useState(false);

  const { register: regProfile, handleSubmit: submitProfile, reset: resetProfile, formState: { errors: profileErrors } } =
    useForm<ProfileForm>({ resolver: zodResolver(profileSchema) });

  const { register: regSg, handleSubmit: submitSg, reset: resetSg, formState: { errors: sgErrors } } =
    useForm<SendgridForm>({ resolver: zodResolver(sendgridSchema) });

  useEffect(() => {
    if (status !== 'authenticated') return;
    const load = async () => {
      try {
        const [p, sg] = await Promise.all([
          api.get<UserProfile>('/users/profile'),
          api.get<SendgridStatus>('/users/sendgrid-status'),
        ]);
        setProfile(p);
        setSendgridStatus(sg);
        resetProfile({ name: p.name ?? '' });
        if (sg.fromEmail || sg.fromName) {
          resetSg({
            apiKey: '',
            fromEmail: sg.fromEmail ?? '',
            fromName: sg.fromName ?? '',
          });
        }
      } catch {
        toast.error('Failed to load settings');
      }
    };
    void load();
  }, [api, resetProfile, resetSg, status]);

  const onProfileSave = async (data: ProfileForm) => {
    setIsProfileLoading(true);
    try {
      const updated = await api.patch<UserProfile>('/users/profile', { name: data.name });
      setProfile(updated);
      await update({ name: data.name });
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setIsProfileLoading(false);
    }
  };

  const onSendgridSave = async (data: SendgridForm) => {
    setIsSgLoading(true);
    try {
      await api.put('/users/sendgrid-key', {
        apiKey: data.apiKey,
        fromEmail: data.fromEmail,
        fromName: data.fromName,
      });
      const sg = await api.get<SendgridStatus>('/users/sendgrid-status');
      setSendgridStatus(sg);
      resetSg({ apiKey: '', fromEmail: data.fromEmail, fromName: data.fromName });
      toast.success('SendGrid API key verified and saved');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e.message ?? 'Failed to save SendGrid key');
    } finally {
      setIsSgLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and email configuration</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="mb-6">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" /> Profile
          </TabsTrigger>
          <TabsTrigger value="sendgrid" className="gap-2">
            <Key className="h-4 w-4" /> SendGrid
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>Update your display name and account details.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitProfile(onProfileSave)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" placeholder="John Doe" {...regProfile('name')} />
                  {profileErrors.name && (
                    <p className="text-red-500 text-xs">{profileErrors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input value={profile?.email ?? session?.user?.email ?? ''} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
                </div>

                <Separator />

                <div className="flex justify-end">
                  <Button type="submit" disabled={isProfileLoading}>
                    {isProfileLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SendGrid Tab */}
        <TabsContent value="sendgrid">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                SendGrid Configuration
                {sendgridStatus?.hasKey ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="h-3 w-3" /> Configured
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    <XCircle className="h-3 w-3" /> Not configured
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Your SendGrid API key is encrypted with AES-256-GCM before storage.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!sendgridStatus?.hasKey && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 mb-6">
                  <p className="text-sm font-semibold text-blue-800 mb-2">
                    How to get your SendGrid API key:
                  </p>
                  <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                    <li>Create a free account at{' '}
                      <a href="https://sendgrid.com" target="_blank" rel="noopener noreferrer"
                        className="underline inline-flex items-center gap-0.5">
                        sendgrid.com <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                    <li>Verify your sender email</li>
                    <li>Settings → API Keys → Create API Key → Full Access</li>
                    <li>Copy the key (starts with SG.)</li>
                  </ol>
                </div>
              )}

              {sendgridStatus?.hasKey && (
                <div className="rounded-lg border bg-muted/30 p-4 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Current Configuration</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">From Email</p>
                      <p className="font-medium">{sendgridStatus.fromEmail ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">From Name</p>
                      <p className="font-medium">{sendgridStatus.fromName ?? '—'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">API Key</p>
                      <p className="font-mono text-xs text-muted-foreground">SG.•••••••••••••••••••••••••••••••••••</p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={submitSg(onSendgridSave)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="apiKey">
                    {sendgridStatus?.hasKey ? 'Update API Key' : 'SendGrid API Key'}
                  </Label>
                  <Input
                    id="apiKey"
                    placeholder="SG.xxxxxxxxxxxxxxxxxxxxxxxx"
                    className="font-mono text-sm"
                    {...regSg('apiKey')}
                  />
                  {sgErrors.apiKey && (
                    <p className="text-red-500 text-xs">{sgErrors.apiKey.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromEmail">From Email</Label>
                  <Input
                    id="fromEmail"
                    type="email"
                    placeholder="noreply@yourcompany.com"
                    {...regSg('fromEmail')}
                  />
                  {sgErrors.fromEmail && (
                    <p className="text-red-500 text-xs">{sgErrors.fromEmail.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Must be verified in your SendGrid account.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromName">From Name</Label>
                  <Input id="fromName" placeholder="Your Company" {...regSg('fromName')} />
                  {sgErrors.fromName && (
                    <p className="text-red-500 text-xs">{sgErrors.fromName.message}</p>
                  )}
                </div>

                <Separator />

                <div className="flex justify-end">
                  <Button type="submit" disabled={isSgLoading} className="bg-primary">
                    {isSgLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying & Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Verify & Save
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
