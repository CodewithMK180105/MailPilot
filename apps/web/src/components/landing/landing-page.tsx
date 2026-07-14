'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  Mail,
  Zap,
  Users,
  BarChart3,
  Shield,
  ChevronDown,
  Check,
  Star,
  ArrowRight,
  Send,
  Globe,
  Clock,
  FileText,
  PlayCircle,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';

// ─── Data ───────────────────────────────────────────────────────────────────

const features = [
  {
    icon: Zap,
    title: 'Lightning-Fast Delivery',
    description:
      'Built on BullMQ with Redis-backed queues. Send millions of emails with sub-second queue latency and real-time progress tracking.',
    color: 'text-yellow-500',
    bg: 'bg-yellow-50 dark:bg-yellow-950/30',
  },
  {
    icon: FileText,
    title: 'Dynamic Templates',
    description:
      'Create reusable email templates with Handlebars syntax. Personalize every message using CSV-imported contact fields.',
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
  },
  {
    icon: Users,
    title: 'Contact Management',
    description:
      'Import thousands of contacts from CSV files. Manage, segment, and organize recipients for targeted campaigns.',
    color: 'text-green-500',
    bg: 'bg-green-50 dark:bg-green-950/30',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Analytics',
    description:
      'Monitor campaign performance live. Track sent, delivered, failed counts and view detailed logs for every email.',
    color: 'text-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-950/30',
  },
  {
    icon: Shield,
    title: 'Your Own API Key',
    description:
      'Connect your own SendGrid account. You own your data, your sending domain, and your deliverability reputation.',
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-950/30',
  },
  {
    icon: Globe,
    title: 'Multi-Provider Ready',
    description:
      'SendGrid today, more providers tomorrow. The provider-agnostic architecture lets you switch without code changes.',
    color: 'text-indigo-500',
    bg: 'bg-indigo-50 dark:bg-indigo-950/30',
  },
];

const steps = [
  {
    step: '01',
    title: 'Create Your Account',
    description:
      'Sign up and connect your SendGrid API key. Verification takes under a minute.',
    icon: Users,
  },
  {
    step: '02',
    title: 'Import Contacts',
    description:
      'Upload a CSV file with your contact list. Any custom fields become template variables automatically.',
    icon: FileText,
  },
  {
    step: '03',
    title: 'Design Your Template',
    description:
      'Write your email template using dynamic variables like {{name}}, {{company}}, or any custom field from your CSV.',
    icon: Mail,
  },
  {
    step: '04',
    title: 'Launch & Monitor',
    description:
      'Start the campaign and watch real-time delivery metrics. Every email is tracked and logged.',
    icon: Send,
  },
];

const faqs = [
  {
    q: 'Do I need a SendGrid account?',
    a: 'Yes. MailFlow uses your own SendGrid API key to send emails. This means you control your sending reputation, deliverability, and billing directly with SendGrid. Their free tier supports up to 100 emails/day.',
  },
  {
    q: 'How many emails can I send at once?',
    a: 'MailFlow uses BullMQ job queues to handle any volume. The actual sending rate is limited by your SendGrid plan, not by MailFlow itself.',
  },
  {
    q: 'Can I personalize each email in a bulk send?',
    a: 'Absolutely. Import a CSV with any columns (name, company, coupon code, etc.) and use {{variable}} placeholders in your template. Each recipient receives a uniquely personalized email.',
  },
  {
    q: 'What happens if some emails fail to send?',
    a: 'Failed emails are logged with the error reason and can be reviewed in the campaign report. You can see exactly which contacts failed and why.',
  },
  {
    q: 'Is my SendGrid API key stored securely?',
    a: 'Yes. API keys are encrypted at rest in the database and are never exposed in the frontend or API responses. Only the sending service accesses them during campaign execution.',
  },
  {
    q: 'Can I schedule campaigns to send later?',
    a: 'Scheduled sending is on the roadmap. Currently, campaigns start processing immediately when you launch them.',
  },
];

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Growth Manager at Finlo',
    avatar: 'SC',
    rating: 5,
    text: 'We switched from a $500/month tool to MailFlow using our own SendGrid key. Same results, a fraction of the cost. The real-time progress tracking is a game-changer.',
  },
  {
    name: 'Marcus Rivera',
    role: 'Founder, DevTools.io',
    avatar: 'MR',
    rating: 5,
    text: 'The dynamic template system is exactly what we needed. Being able to personalize 50,000 emails with different product recommendations per user is incredible.',
  },
  {
    name: 'Priya Nair',
    role: 'Email Marketing Lead at Bloom',
    avatar: 'PN',
    rating: 5,
    text: "Finally a tool built for technical teams. The CSV import is seamless, the queue system is rock-solid, and the logs tell you exactly what's happening with each send.",
  },
];

const stats = [
  { value: '10M+', label: 'Emails Sent' },
  { value: '99.9%', label: 'Uptime' },
  { value: '< 1s', label: 'Queue Latency' },
  { value: '50K+', label: 'Campaigns Run' },
];

// ─── Components ─────────────────────────────────────────────────────────────

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left bg-card hover:bg-muted/50 transition-colors"
        aria-expanded={open}
      >
        <span className="font-medium text-foreground text-sm">{q}</span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground flex-shrink-0 ml-4 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 pt-2 bg-card border-t border-border">
          <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Landing Page ───────────────────────────────────────────────────────

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activePreview, setActivePreview] = useState('campaigns-list');
  const { data: session } = useSession();
  const isLoggedIn = !!session;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Mail className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-foreground text-lg tracking-tight">MailFlow</span>
            </div>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-8">
              {['Features', 'How It Works', 'FAQ', 'Reviews'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(/ /g, '-')}`}
                  className="text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
                >
                  {item}
                </a>
              ))}
            </nav>

            {/* CTA */}
            <div className="hidden md:flex items-center gap-3">
              <ThemeToggle />
              {isLoggedIn ? (
                <Button size="sm" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                  <Link href="/campaigns">
                    Go to Dashboard <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/login">Sign in</Link>
                  </Button>
                  <Button size="sm" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                    <Link href="/register">Get started free</Link>
                  </Button>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="flex md:hidden items-center gap-2">
              <ThemeToggle />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background px-4 py-4 space-y-3">
            {['Features', 'How It Works', 'FAQ', 'Reviews'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/ /g, '-')}`}
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm text-muted-foreground hover:text-foreground font-medium py-2"
              >
                {item}
              </a>
            ))}
            <div className="pt-2 flex flex-col gap-2">
              <Button variant="outline" size="sm" asChild className="w-full">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button size="sm" asChild className="w-full bg-primary text-primary-foreground">
                <Link href="/register">Get started free</Link>
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.07]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-4 py-1.5 mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-muted-foreground">
              Powered by SendGrid & BullMQ
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-tight mb-6">
            Bulk email that{' '}
            <span className="gradient-text">actually scales</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-muted-foreground leading-relaxed mb-10">
            Send thousands of personalized emails using your own SendGrid key. Dynamic templates,
            CSV contacts, real-time delivery tracking — everything in one clean dashboard.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            {isLoggedIn ? (
              <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 h-12">
                <Link href="/campaigns">
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 h-12">
                  <Link href="/register">
                    Start for free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="h-12 px-8 border-border text-foreground hover:bg-muted font-medium">
                  <PlayCircle className="mr-2 h-4 w-4 text-primary" />
                  See how it works
                </Button>
              </>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl mx-auto">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-20 lg:py-28 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Features</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
              Everything you need to reach your audience
            </h2>
            <p className="mt-4 max-w-xl mx-auto text-muted-foreground text-base leading-relaxed">
              MailFlow is built for teams who want control over their email infrastructure without the complexity.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-border bg-card p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${f.bg} mb-4`}>
                  <f.icon className={`h-5 w-5 ${f.color}`} />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">How It Works</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
              From sign-up to first send in minutes
            </h2>
            <p className="mt-4 max-w-xl mx-auto text-muted-foreground text-base">
              No complex setup. No lengthy onboarding. Just a straightforward process to get your emails delivered.
            </p>
          </div>

          <div className="relative">
            {/* Connector line (desktop) */}
            <div className="hidden lg:block absolute top-12 left-[12.5%] right-[12.5%] h-px bg-border" />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {steps.map((step, i) => (
                <div key={step.step} className="relative text-center lg:text-left">
                  <div className="flex lg:block items-start gap-4">
                    {/* Step circle */}
                    <div className="relative flex-shrink-0 flex items-center justify-center mx-auto lg:mx-0 h-12 w-12 rounded-full bg-primary text-primary-foreground font-bold text-sm mb-4 z-10">
                      {i + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2 justify-center lg:justify-start">
                        <step.icon className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold text-foreground">{step.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Dashboard Preview ── */}
      <section id="dashboard-preview" className="py-20 lg:py-28 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Dashboard Preview</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
              See exactly what you're getting
            </h2>
            <p className="mt-4 max-w-xl mx-auto text-muted-foreground text-base leading-relaxed">
              A clean, real-time dashboard that shows every campaign, every stat, and every email delivery — at a glance.
            </p>
          </div>

          {/* Toggle Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-8 max-w-4xl mx-auto">
            {[
              { id: 'campaigns-list', name: 'Campaign page' },
              { id: 'reports', name: 'Reports page' },
              { id: 'view-draft', name: 'View Mail Draft page' },
              { id: 'create-draft', name: 'Create Mail Draft page' },
              { id: 'subject-editor', name: 'Subject editor' },
              { id: 'add-recipients', name: 'Add Email Recipients' },
            ].map((preview) => (
              <button
                key={preview.id}
                onClick={() => setActivePreview(preview.id)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  activePreview === preview.id
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {preview.name}
              </button>
            ))}
          </div>

          {/* Browser Chrome Mockup */}
          <div className="rounded-2xl border border-border shadow-2xl overflow-hidden bg-card max-w-5xl mx-auto">
            {/* Browser top bar */}
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/60 border-b border-border">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 mx-4 h-6 rounded-md bg-background border border-border flex items-center px-3">
                <span className="text-xs text-muted-foreground font-mono">
                  {activePreview === 'campaigns-list' && 'mailflow.app/campaigns'}
                  {activePreview === 'reports' && 'mailflow.app/campaigns/q3-product-launch/report'}
                  {activePreview === 'view-draft' && 'mailflow.app/campaigns/q3-product-launch/preview'}
                  {activePreview === 'create-draft' && 'mailflow.app/campaigns/new'}
                  {activePreview === 'subject-editor' && 'mailflow.app/campaigns/new?step=2'}
                  {activePreview === 'add-recipients' && 'mailflow.app/campaigns/new?step=3'}
                </span>
              </div>
            </div>

            {/* App Shell */}
            <div className="flex h-[540px] bg-background">
              {/* Sidebar */}
              <div className="w-48 sm:w-56 border-r border-border bg-muted/20 flex flex-col p-4 gap-1 flex-shrink-0">
                <div className="flex items-center gap-2 px-2 py-2 mb-4">
                  <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
                    <Mail className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                  <span className="font-bold text-sm text-foreground">MailFlow</span>
                </div>
                {[
                  {
                    label: 'Campaigns',
                    active: ['campaigns-list', 'reports'].includes(activePreview),
                  },
                  {
                    label: 'New Campaign',
                    active: ['create-draft', 'subject-editor', 'add-recipients', 'view-draft'].includes(activePreview),
                  },
                  { label: 'Settings', active: false },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium cursor-default ${
                      item.active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <div className={`h-1.5 w-1.5 rounded-full ${item.active ? 'bg-primary' : 'bg-transparent'}`} />
                    {item.label}
                  </div>
                ))}
              </div>

              {/* Main Content Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 transition-all duration-300">
                {/* View 1: Campaigns List */}
                {activePreview === 'campaigns-list' && (
                  <div className="space-y-5 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-foreground">Campaigns</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">4 campaigns total</p>
                      </div>
                      <div className="h-8 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 cursor-default">
                        <span className="text-base leading-none">+</span> New Campaign
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: 'Total Sent', value: '48,200', color: 'text-green-600' },
                        { label: 'Delivered', value: '47,891', color: 'text-blue-600' },
                        { label: 'Failed', value: '309', color: 'text-red-500' },
                        { label: 'Success Rate', value: '99.4%', color: 'text-primary' },
                      ].map((stat) => (
                        <div key={stat.label} className="rounded-xl border bg-card p-3">
                          <p className={`text-lg font-bold tabular-nums ${stat.color}`}>{stat.value}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      {['All', 'Completed', 'Sending', 'Draft'].map((s, i) => (
                        <div
                          key={s}
                          className={`px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium border cursor-default ${
                            i === 0
                              ? 'bg-primary text-white border-primary'
                              : 'bg-background border-border text-muted-foreground'
                          }`}
                        >
                          {s}
                        </div>
                      ))}
                    </div>

                    <div className="rounded-xl border border-border overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-muted/40">
                            {['Campaign', 'Status', 'Recipients', 'Sent', 'Success %', 'Created'].map((h) => (
                              <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { name: 'Q3 Product Launch', subject: 'Exciting news from our team', status: 'COMPLETED', statusColor: 'text-green-600 bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900', recipients: '12,400', sent: '12,348', rate: 99.6 },
                            { name: 'Summer Sale Blast', subject: 'Up to 50% off — today only', status: 'SENDING', statusColor: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900', recipients: '8,900', sent: '5,210', rate: 58.5 },
                            { name: 'Onboarding Week 1', subject: 'Welcome! Here\'s how to get started', status: 'COMPLETED', statusColor: 'text-green-600 bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900', recipients: '3,200', sent: '3,190', rate: 99.7 },
                            { name: 'Re-engagement Flow', subject: 'We miss you — come back for 20% off', status: 'DRAFT', statusColor: 'text-gray-500 bg-gray-50 border-gray-200 dark:bg-gray-900/50 dark:border-gray-800', recipients: '24,100', sent: '0', rate: 0 },
                          ].map((row) => (
                            <tr key={row.name} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                              <td className="px-3 py-2.5">
                                <p className="font-medium text-foreground text-xs">{row.name}</p>
                                <p className="text-[10px] text-muted-foreground truncate max-w-[100px] sm:max-w-[140px]">{row.subject}</p>
                              </td>
                              <td className="px-3 py-2.5">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${row.statusColor}`}>
                                  <span className="h-1 w-1 rounded-full bg-current" />
                                  {row.status}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 tabular-nums text-foreground">{row.recipients}</td>
                              <td className="px-3 py-2.5 tabular-nums text-green-600 font-medium">{row.sent}</td>
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-10 sm:w-12 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${row.rate}%` }} />
                                  </div>
                                  <span className="tabular-nums text-muted-foreground">{row.rate}%</span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-muted-foreground">Jul 1, 2025</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* View 2: Reports Page */}
                {activePreview === 'reports' && (
                  <div className="space-y-5 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between border-b pb-4">
                      <div>
                        <h3 className="text-base font-bold text-foreground">Q3 Product Launch Report</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Completed on Jul 1, 2025</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold border text-green-600 bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900">
                        COMPLETED
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: 'Emails Sent', value: '12,348', color: 'text-foreground' },
                        { label: 'Bounces / Failed', value: '52', color: 'text-red-500' },
                        { label: 'Deliverability', value: '99.6%', color: 'text-green-600' },
                        { label: 'Open Rate', value: '68.4%', color: 'text-primary' },
                      ].map((stat) => (
                        <div key={stat.label} className="rounded-xl border bg-card p-3">
                          <p className={`text-lg font-bold tabular-nums ${stat.color}`}>{stat.value}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="rounded-xl border bg-card p-4 space-y-3">
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Delivery Breakdown</h4>
                        <div className="space-y-2.5">
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Delivered</span>
                              <span className="font-medium text-foreground">12,348 (99.6%)</span>
                            </div>
                            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-green-500 rounded-full" style={{ width: '99.6%' }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Bounced / Failed</span>
                              <span className="font-medium text-foreground">52 (0.4%)</span>
                            </div>
                            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-red-500 rounded-full" style={{ width: '0.4%' }} />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border bg-card p-4 space-y-3">
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Recent Activity Logs</h4>
                        <div className="space-y-2 text-xs font-mono text-muted-foreground">
                          <div className="flex justify-between border-b pb-1 border-border">
                            <span className="text-foreground truncate max-w-[120px] sm:max-w-[180px]">jane.doe@example.com</span>
                            <span className="text-green-600 font-semibold">✓ SENT</span>
                          </div>
                          <div className="flex justify-between border-b pb-1 border-border">
                            <span className="text-foreground truncate max-w-[120px] sm:max-w-[180px]">john.smith@gmail.com</span>
                            <span className="text-green-600 font-semibold">✓ SENT</span>
                          </div>
                          <div className="flex justify-between border-b pb-1 border-border">
                            <span className="text-foreground truncate max-w-[120px] sm:max-w-[180px]">bounce-test@invalid.net</span>
                            <span className="text-red-500 font-semibold">✗ FAILED (5.1.1)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* View 3: View Mail Draft page */}
                {activePreview === 'view-draft' && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between border-b pb-4">
                      <div>
                        <h3 className="text-base font-bold text-foreground">View Mail Draft</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Previewing template render for recipient</p>
                      </div>
                      <div className="flex items-center gap-2 border px-3 py-1 rounded-md bg-muted/40 text-xs">
                        <span className="text-muted-foreground">Recipient:</span>
                        <span className="font-semibold text-foreground">john@example.com</span>
                      </div>
                    </div>

                    <div className="border rounded-xl bg-card overflow-hidden text-xs">
                      <div className="bg-muted/30 px-4 py-3 border-b space-y-1.5">
                        <div className="flex gap-2">
                          <span className="text-muted-foreground w-12">From:</span>
                          <span className="font-semibold text-foreground">growth@mailflow.app</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-muted-foreground w-12">To:</span>
                          <span className="font-semibold text-foreground">john@example.com</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-muted-foreground w-12">Subject:</span>
                          <span className="font-bold text-foreground">Welcome John, exciting news from MailFlow!</span>
                        </div>
                      </div>
                      <div className="p-4 bg-background min-h-[160px] text-muted-foreground space-y-3 font-sans leading-relaxed">
                        <p>Hi John,</p>
                        <p>
                          We are absolutely thrilled to welcome you to <strong>MailFlow</strong>. Your bulk email dashboard is now fully set up and ready to run.
                        </p>
                        <p>
                          Let us know if you have any questions along the way.
                        </p>
                        <p className="pt-2 border-t text-[10px]">
                          Best regards,<br />
                          <strong>The MailFlow Team</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* View 4: Create Mail Draft page */}
                {activePreview === 'create-draft' && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div>
                      <h3 className="text-base font-bold text-foreground">Create Mail Draft</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Step 1: Enter basic campaign details</p>
                    </div>

                    <div className="space-y-4 max-w-xl">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">Campaign Name</label>
                        <input
                          type="text"
                          readOnly
                          value="Q3 Product Launch"
                          className="w-full text-xs px-3 py-2 border rounded-lg bg-muted/40 cursor-default focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">Email Subject Line</label>
                        <input
                          type="text"
                          readOnly
                          value="Hi {{name}}, exciting news from {{company}}!"
                          className="w-full text-xs px-3 py-2 border rounded-lg bg-muted/40 cursor-default focus:outline-none"
                        />
                      </div>

                      <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg">
                        <p className="text-xs text-primary leading-relaxed">
                          <strong>💡 Pro Tip:</strong> Use double curly braces like <code className="font-mono bg-primary/10 px-1 py-0.5 rounded">{'{{variable}}'}</code> to dynamically substitute values from your recipient data sheet (e.g. name, promo_code).
                        </p>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">
                          Next: Design Body
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* View 5: Subject editor */}
                {activePreview === 'subject-editor' && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div>
                      <h3 className="text-base font-bold text-foreground">Design Email Template</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Step 2: Compose template body & preview variables</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-xs font-semibold text-foreground flex justify-between">
                          <span>Body Template (Handlebars / HTML)</span>
                          <span className="text-[10px] text-primary">Rich HTML enabled</span>
                        </label>
                        <textarea
                          readOnly
                          rows={7}
                          className="w-full text-xs px-3 py-2 border rounded-lg bg-muted/40 cursor-default font-mono focus:outline-none resize-none leading-relaxed"
                          value={`Hi {{name}},\n\nHere is your registration link for {{event_name}}:\n{{link}}\n\nSee you there!\n- The Team`}
                        />
                      </div>

                      <div className="rounded-xl border bg-card p-4 space-y-3 h-fit">
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Detected Variables</h4>
                        <div className="space-y-1.5">
                          {['name', 'event_name', 'link'].map((v) => (
                            <div key={v} className="flex items-center justify-between text-xs px-2.5 py-1 rounded bg-muted/50 border border-border">
                              <span className="font-mono text-primary font-medium">{`{{${v}}}`}</span>
                              <span className="text-[10px] text-muted-foreground">Required</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-500 pt-2 font-medium">
                          <Check className="h-3.5 w-3.5" /> Variables validated
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between pt-2 border-t">
                      <button className="px-4 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground">
                        Back
                      </button>
                      <button className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">
                        Next: Add Recipients
                      </button>
                    </div>
                  </div>
                )}

                {/* View 6: Add Email Recipients page */}
                {activePreview === 'add-recipients' && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div>
                      <h3 className="text-base font-bold text-foreground">Add Recipients</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Step 3: Upload contact sheet matching variables</p>
                    </div>

                    <div className="border-2 border-dashed border-border rounded-xl p-8 text-center bg-muted/10">
                      <Zap className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-xs font-medium text-foreground">Drag & drop your Excel or CSV file</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Supports .xlsx, .xls, .csv up to 5MB</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-foreground">Upload Preview (First 2 Rows)</label>
                        <span className="text-[10px] text-green-600 font-semibold">✓ 4 variables matched</span>
                      </div>

                      <div className="rounded-lg border border-border overflow-hidden">
                        <table className="w-full text-[10px] sm:text-xs">
                          <thead>
                            <tr className="border-b bg-muted/30">
                              <th className="px-2 py-1.5 text-left text-muted-foreground font-semibold">email</th>
                              <th className="px-2 py-1.5 text-left text-muted-foreground font-semibold">name</th>
                              <th className="px-2 py-1.5 text-left text-muted-foreground font-semibold">event_name</th>
                              <th className="px-2 py-1.5 text-left text-muted-foreground font-semibold">link</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b last:border-0">
                              <td className="px-2 py-1.5 text-foreground font-medium">john@example.com</td>
                              <td className="px-2 py-1.5 text-muted-foreground">John</td>
                              <td className="px-2 py-1.5 text-muted-foreground">Product Launch</td>
                              <td className="px-2 py-1.5 text-primary font-mono text-[9px] truncate max-w-[100px]">https://event.com/1</td>
                            </tr>
                            <tr className="border-b last:border-0">
                              <td className="px-2 py-1.5 text-foreground font-medium">jane@example.com</td>
                              <td className="px-2 py-1.5 text-muted-foreground">Jane</td>
                              <td className="px-2 py-1.5 text-muted-foreground">Product Launch</td>
                              <td className="px-2 py-1.5 text-primary font-mono text-[9px] truncate max-w-[100px]">https://event.com/2</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Caption */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Real-time data. No page refresh needed. Track every campaign as it sends.
          </p>
        </div>
      </section>

      {/* ── Highlight Banner ── */}
      <section className="py-16 bg-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="text-center lg:text-left">
              <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">
                Use your own infrastructure. Keep full control.
              </h2>
              <p className="text-white/80 max-w-lg">
                MailFlow never touches your email traffic. Your SendGrid key sends directly to your recipients — we just orchestrate the queue.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold px-8 h-12" asChild>
                <Link href="/register">Get started free</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Reviews ── */}
      <section id="reviews" className="py-20 lg:py-28 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Reviews</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
              Trusted by growth teams
            </h2>
            <p className="mt-4 text-muted-foreground">
              See what teams using MailFlow have to say.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="rounded-2xl border border-border bg-card p-6 hover:shadow-md transition-shadow duration-200"
              >
                {/* Stars */}
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-foreground leading-relaxed mb-6">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-20 lg:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">FAQ</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
              Frequently asked questions
            </h2>
            <p className="mt-4 text-muted-foreground">
              Everything you need to know about MailFlow.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 lg:py-28 bg-muted/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary mb-8 shadow-lg shadow-primary/30">
            <Mail className="h-8 w-8 text-primary-foreground" />
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight mb-4">
            Ready to send smarter?
          </h2>
          <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
            Join teams who've simplified their bulk email workflow with MailFlow.
            Free to get started — just bring your SendGrid key.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-10 h-12">
              <Link href="/register">
                Create free account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-12 px-8 border-border text-foreground hover:bg-muted font-medium">
              <Link href="/login">Sign in instead</Link>
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="flex items-center justify-center gap-6 mt-10">
            {[
              { icon: Check, text: 'No credit card required' },
              { icon: Shield, text: 'Your data stays yours' },
              { icon: Clock, text: 'Setup in under 5 minutes' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <item.icon className="h-3.5 w-3.5 text-green-500" />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Brand */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Mail className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-foreground tracking-tight">MailFlow</span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-6">
              {['Features', 'How It Works', 'FAQ'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(/ /g, '-')}`}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item}
                </a>
              ))}
            </div>

            {/* Auth */}
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button size="sm" asChild className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
                <Link href="/register">Get started</Link>
              </Button>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} MailFlow. All rights reserved.</p>
            <p>Built with Next.js, BullMQ &amp; SendGrid</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
