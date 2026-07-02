'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, Chrome } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error('Invalid email or password. Please try again.');
      } else {
        toast.success('Welcome back!');
        router.push('/campaigns');
        router.refresh();
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await signIn('google', { callbackUrl: '/campaigns' });
    } catch {
      toast.error('Google sign-in failed. Please try again.');
      setIsGoogleLoading(false);
    }
  };

  return (
    <div>
      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Sign in to your account
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Enter your credentials to access your dashboard.
        </p>
      </div>

      {/* Google Sign In */}
      <Button
        type="button"
        variant="outline"
        className="w-full mb-6 h-10 font-medium border-border text-foreground hover:bg-muted"
        onClick={handleGoogleSignIn}
        disabled={isGoogleLoading}
        id="google-signin-btn"
      >
        {isGoogleLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Chrome className="mr-2 h-4 w-4 text-muted-foreground" />
        )}
        Continue with Google
      </Button>

      {/* Divider */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2.5 text-muted-foreground font-medium">
            Or sign in with email
          </span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium text-foreground">
            Email address
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              className="pl-10 h-10 bg-background border-border text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-primary"
              autoComplete="email"
              {...register('email')}
            />
          </div>
          {errors.email && (
            <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </Label>
            <a href="#" className="text-xs text-primary hover:text-primary/80 font-medium">
              Forgot password?
            </a>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              className="pl-10 h-10 bg-background border-border text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-primary"
              autoComplete="current-password"
              {...register('password')}
            />
          </div>
          {errors.password && (
            <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
          )}
        </div>

        <Button
          type="submit"
          id="login-submit-btn"
          className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign in'
          )}
        </Button>
      </form>

      {/* Footer link */}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link
          href="/register"
          className="text-primary hover:text-primary/80 font-medium"
        >
          Create one free
        </Link>
      </p>
    </div>
  );
}
