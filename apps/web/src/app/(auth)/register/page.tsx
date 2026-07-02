'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Loader2, Mail, Lock, User, Key, ChevronDown, ChevronUp, ExternalLink,
} from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  sendgridApiKey: z
    .string()
    .optional()
    .refine((v) => !v || v.startsWith('SG.'), 'SendGrid API key must start with SG.'),
  sendgridFromEmail: z.string().email('Please enter a valid from email').optional().or(z.literal('')),
  sendgridFromName: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showSendgridHelp, setShowSendgridHelp] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/register`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name,
            email: data.email,
            password: data.password,
            ...(data.sendgridApiKey ? { sendgridApiKey: data.sendgridApiKey } : {}),
            ...(data.sendgridFromEmail ? { sendgridFromEmail: data.sendgridFromEmail } : {}),
            ...(data.sendgridFromName ? { sendgridFromName: data.sendgridFromName } : {}),
          }),
        },
      );

      const json = await res.json() as { error?: { message?: string } };

      if (!res.ok) {
        toast.error(json.error?.message ?? 'Registration failed. Please try again.');
        return;
      }

      toast.success('Account created! Please sign in.');
      router.push('/login');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Create your account
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Get started for free. No credit card required.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Full Name */}
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-sm font-medium text-foreground">Full Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="name"
              placeholder="John Doe"
              className="pl-10 h-10 bg-background border-border text-foreground placeholder:text-muted-foreground/60"
              {...register('name')}
            />
          </div>
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium text-foreground">Email address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              className="pl-10 h-10 bg-background border-border text-foreground placeholder:text-muted-foreground/60"
              {...register('email')}
            />
          </div>
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="Min 8 characters"
              className="pl-10 h-10 bg-background border-border text-foreground placeholder:text-muted-foreground/60"
              {...register('password')}
            />
          </div>
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Re-enter your password"
              className="pl-10 h-10 bg-background border-border text-foreground placeholder:text-muted-foreground/60"
              {...register('confirmPassword')}
            />
          </div>
          {errors.confirmPassword && (
            <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* SendGrid Section */}
        <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                SendGrid API Key{' '}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowSendgridHelp(!showSendgridHelp)}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
            >
              How to get it?
              {showSendgridHelp ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
          </div>

          {showSendgridHelp && (
            <div className="rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-3 space-y-2">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                How to get your SendGrid API key:
              </p>
              <ol className="text-xs text-blue-600 dark:text-blue-400 space-y-1 list-decimal list-inside">
                <li>
                  Create a free account at{' '}
                  <a
                    href="https://sendgrid.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline inline-flex items-center gap-0.5"
                  >
                    sendgrid.com <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </li>
                <li>Verify your sender email address</li>
                <li>Go to Settings → API Keys → Create API Key</li>
                <li>Select &quot;Full Access&quot; and create</li>
                <li>Copy the key (it starts with SG.)</li>
              </ol>
              <p className="text-xs text-blue-500 dark:text-blue-400/70">
                You can also add this later in Settings.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <Input
              id="sendgridApiKey"
              placeholder="SG.xxxxxxxxxxxxxxxxxxxxxxxx"
              className="h-10 bg-background border-border text-foreground placeholder:text-muted-foreground/60 font-mono text-xs"
              {...register('sendgridApiKey')}
            />
            {errors.sendgridApiKey && (
              <p className="text-red-500 text-xs">{errors.sendgridApiKey.message}</p>
            )}

            <Input
              id="sendgridFromEmail"
              type="email"
              placeholder="noreply@yourcompany.com"
              className="h-10 bg-background border-border text-foreground placeholder:text-muted-foreground/60"
              {...register('sendgridFromEmail')}
            />
            {errors.sendgridFromEmail && (
              <p className="text-red-500 text-xs">{errors.sendgridFromEmail.message}</p>
            )}

            <Input
              id="sendgridFromName"
              placeholder="Your Company Name"
              className="h-10 bg-background border-border text-foreground placeholder:text-muted-foreground/60"
              {...register('sendgridFromName')}
            />
          </div>
        </div>

        <Button
          type="submit"
          id="register-submit-btn"
          className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            'Create Account'
          )}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-primary hover:text-primary/80 font-medium"
          >
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
