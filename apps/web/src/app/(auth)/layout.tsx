import { SessionProvider } from 'next-auth/react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { Mail } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <SessionProvider>
      <div className="min-h-screen flex bg-background">
        {/* Left: Form */}
        <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-16 xl:px-24">
          {/* Header */}
          <div className="flex items-center justify-between mb-12">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Mail className="h-4.5 w-4.5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground tracking-tight">MailFlow</span>
            </Link>
            <ThemeToggle />
          </div>

          {/* Form content */}
          <div className="w-full max-w-sm mx-auto lg:mx-0">
            {children}
          </div>
        </div>

        {/* Right: Brand panel */}
        <div className="hidden lg:flex flex-1 flex-col justify-center items-center bg-primary px-12 relative overflow-hidden">
          {/* Background grid */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)`,
              backgroundSize: '48px 48px',
            }}
          />

          {/* Decorative circles */}
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-white/10 rounded-full blur-3xl" />

          {/* Content */}
          <div className="relative z-10 max-w-md text-center text-white">
            <div className="flex justify-center mb-8">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <Mail className="h-10 w-10 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold mb-4 leading-tight">
              Send smarter.<br />Reach further.
            </h2>
            <p className="text-white/80 text-base leading-relaxed mb-10">
              MailFlow gives you everything you need to send personalized bulk emails at scale — powered by your own SendGrid key.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: '99.9%', label: 'Deliverability' },
                { value: '10M+', label: 'Emails sent' },
                { value: '< 1s', label: 'Queue latency' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl bg-white/10 backdrop-blur-sm p-4 border border-white/20"
                >
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-white/70 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SessionProvider>
  );
}
