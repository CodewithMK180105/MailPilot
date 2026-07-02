import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import { SessionProvider } from 'next-auth/react';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: {
    default: 'MailFlow — Dynamic Email Automation Platform',
    template: '%s | MailFlow',
  },
  description:
    'Send personalized bulk emails at scale using dynamic templates and your SendGrid API key. Built for modern teams.',
  keywords: ['email automation', 'bulk email', 'sendgrid', 'email marketing'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        {/* Inline theme script to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme')||'light';document.documentElement.setAttribute('data-theme',t);if(t==='dark')document.documentElement.classList.add('dark')})()`,
          }}
        />
      </head>
      <body className={inter.variable}>
        <SessionProvider>
          {children}
          <Toaster
            position="top-right"
            richColors
            toastOptions={{
              duration: 4000,
            }}
          />
        </SessionProvider>
      </body>
    </html>
  );
}

