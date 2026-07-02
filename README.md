# MailFlow — Dynamic Email Automation Platform

A production-grade, multi-tenant SaaS platform that allows users to send personalized bulk emails using dynamic Handlebars templates and uploaded recipient data (Excel/CSV), powered by each user's own SendGrid API key.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            MONOREPO                                          │
│                                                                              │
│  ┌─────────────────────┐    REST API    ┌──────────────────────────────────┐ │
│  │  apps/web           │◄─────────────►│  apps/api                        │ │
│  │  Next.js 14 (App    │               │  NestJS 10 + TypeScript           │ │
│  │  Router)            │               │                                    │ │
│  │  TypeScript         │               │  ┌──────────┐  ┌───────────────┐  │ │
│  │  ShadCN UI          │               │  │  Auth    │  │  Campaigns    │  │ │
│  │  TanStack Table     │               │  │  Module  │  │  Module       │  │ │
│  │  React Hook Form    │               │  └──────────┘  └───────────────┘  │ │
│  │  Zustand            │               │  ┌──────────┐  ┌───────────────┐  │ │
│  │  Sonner             │               │  │  Queue   │  │  Recipients   │  │ │
│  │  react-dropzone     │               │  │ (BullMQ) │  │  Module       │  │ │
│  └─────────────────────┘               │  └──────────┘  └───────────────┘  │ │
│                                        │  ┌──────────┐  ┌───────────────┐  │ │
│  ┌─────────────────────┐               │  │  Mail    │  │  Reports      │  │ │
│  │  packages/shared    │               │  │ Provider │  │  Module       │  │ │
│  │  Zod schemas        │               │  └──────────┘  └───────────────┘  │ │
│  │  TypeScript types   │               └──────────────────────────────────┘ │
│  └─────────────────────┘                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                  │                                │
         ┌────────▼────────┐             ┌─────────▼──────────┐
         │   PostgreSQL    │             │   Redis (BullMQ)    │
         │   (Prisma ORM)  │             │   Job Queue         │
         └─────────────────┘             └────────────────────┘
```

## Features

- 🔐 **Multi-tenant** — each user's data is completely isolated
- 🔑 **Per-user SendGrid keys** — encrypted with AES-256-GCM
- 📧 **Dynamic templates** — Handlebars `{{variable}}` syntax
- 📊 **Excel/CSV upload** — drag & drop, up to 10,000 recipients
- 🚀 **BullMQ queue** — reliable, retryable email delivery
- 📈 **Real-time progress** — animated donut chart, live polling
- ⏸️ **Pause/Resume/Cancel** — full campaign control
- 📥 **Export reports** — CSV and Excel downloads
- 🛡️ **Security** — JWT auth, rate limiting, input sanitization, Helmet

---

## Prerequisites

- **Node.js** 18+ (`node --version`)
- **PostgreSQL** 14+ running locally or cloud (Supabase/Render)
- **Redis** 6+ running locally or cloud (Upstash)
- **SendGrid** account (free tier: 100 emails/day)

---

## Quick Start

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd bulk-email-sender
```

### 2. Install all dependencies

```bash
npm install
```

This installs dependencies for all workspaces (`apps/web`, `apps/api`, `packages/shared`).

### 3. Generate secret keys

You need two secrets. Run these in your terminal:

```bash
# JWT Secret (32 random bytes as hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Encryption Key (32 random bytes as hex — for AES-256-GCM)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# NextAuth Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Configure environment variables

#### Backend (`apps/api/.env`)

```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/emailplatform"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="<output from step 3, #1>"
ENCRYPTION_KEY="<output from step 3, #2>"
PORT=3001
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"
GOOGLE_CLIENT_ID=""          # optional — for Google OAuth
```

#### Frontend (`apps/web/.env.local`)

```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<output from step 3, #3>"
GOOGLE_CLIENT_ID=""          # optional — same as backend
GOOGLE_CLIENT_SECRET=""      # optional — from Google Cloud Console
```

### 5. Set up the database

First, create the PostgreSQL database:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE emailplatform;
\q
```

Then run migrations:

```bash
npm run db:migrate
```

Or if using Prisma directly:

```bash
cd apps/api
npx prisma migrate dev --name init
npx prisma generate
```

### 6. Start development servers

```bash
# Start both frontend and backend concurrently
npm run dev

# Or start individually:
npm run dev:web   # Next.js on http://localhost:3000
npm run dev:api   # NestJS on http://localhost:3001
```

---

## Environment Variable Reference

### Backend (`apps/api/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection URL for BullMQ |
| `JWT_SECRET` | ✅ | Secret for signing JWT tokens (min 32 chars) |
| `ENCRYPTION_KEY` | ✅ | 32-byte hex key (64 chars) for AES-256-GCM encryption of SendGrid API keys |
| `PORT` | ❌ | API server port (default: 3001) |
| `NODE_ENV` | ❌ | `development` or `production` |
| `FRONTEND_URL` | ✅ | Next.js app URL (for CORS) |
| `GOOGLE_CLIENT_ID` | ❌ | Google OAuth Client ID (for Google sign-in) |

### Frontend (`apps/web/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | ✅ | NestJS backend URL |
| `NEXTAUTH_URL` | ✅ | Next.js app canonical URL |
| `NEXTAUTH_SECRET` | ✅ | NextAuth.js signing secret (min 32 chars) |
| `GOOGLE_CLIENT_ID` | ❌ | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | ❌ | Google OAuth Client Secret |

---

## Getting a SendGrid API Key

1. Go to [sendgrid.com](https://sendgrid.com) and create a free account
2. **Verify your sender email**: Settings → Sender Authentication → Verify a Single Sender
3. **Create an API key**: Settings → API Keys → Create API Key
   - Name it: "MailFlow"
   - Select: **Full Access**
   - Click **Create & View**
4. **Copy the key** — it starts with `SG.` and will only be shown once
5. Paste it in the registration form or in Settings → SendGrid

> **Free tier limits**: 100 emails/day. Upgrade to a paid plan for higher volume.

---

## Database Commands

```bash
# Run migrations (creates tables)
npm run db:migrate

# Generate Prisma client (after schema changes)
npm run db:generate

# Open Prisma Studio (visual database browser)
npm run db:studio

# Reset database (destructive!)
cd apps/api && npx prisma migrate reset
```

---

## API Endpoints

All API endpoints are prefixed with `/api/v1`. JWT token required for all except auth routes.

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Sign in |
| POST | `/auth/google` | Google OAuth |
| GET | `/auth/me` | Get current user |
| POST | `/auth/logout` | Sign out |

### Campaigns
| Method | Path | Description |
|--------|------|-------------|
| GET | `/campaigns` | List campaigns (paginated) |
| POST | `/campaigns` | Create campaign |
| GET | `/campaigns/:id` | Get campaign detail |
| PATCH | `/campaigns/:id` | Update campaign |
| DELETE | `/campaigns/:id` | Delete campaign |
| POST | `/campaigns/:id/duplicate` | Clone campaign |
| POST | `/campaigns/:id/validate` | Validate template vs columns |
| POST | `/campaigns/:id/send` | Start sending |
| POST | `/campaigns/:id/pause` | Pause sending |
| POST | `/campaigns/:id/resume` | Resume sending |
| POST | `/campaigns/:id/cancel` | Cancel campaign |

### Recipients
| Method | Path | Description |
|--------|------|-------------|
| POST | `/campaigns/:id/recipients/upload` | Upload Excel/CSV |
| POST | `/campaigns/:id/recipients/manual` | Manual entry |
| GET | `/campaigns/:id/recipients` | List recipients |
| DELETE | `/campaigns/:id/recipients` | Clear all recipients |

### Jobs & Progress
| Method | Path | Description |
|--------|------|-------------|
| GET | `/campaigns/:id/progress` | Real-time progress |
| GET | `/campaigns/:id/jobs` | List email jobs |

### Reports
| Method | Path | Description |
|--------|------|-------------|
| GET | `/campaigns/:id/report` | Campaign report summary |
| GET | `/campaigns/:id/report/export` | Export CSV/Excel |

### Misc
| Method | Path | Description |
|--------|------|-------------|
| POST | `/template/preview` | Render template preview |
| GET | `/users/sendgrid-status` | Check SendGrid config |
| PUT | `/users/sendgrid-key` | Update SendGrid key |

---

## Deployment

### Frontend → Vercel

1. Push to GitHub
2. Import project at [vercel.com](https://vercel.com)
3. Root directory: `apps/web`
4. Framework: Next.js
5. Add environment variables from `apps/web/.env.example`
6. Deploy

### Backend → Render.com

1. Create new "Web Service" on [render.com](https://render.com)
2. Connect your GitHub repo
3. Root directory: `apps/api`
4. Build command: `npm install && npm run build && npx prisma generate && npx prisma migrate deploy`
5. Start command: `node dist/main`
6. Add environment variables from `apps/api/.env.example`
7. Create a PostgreSQL database on Render and copy the connection string

### Redis → Upstash

1. Create account at [upstash.com](https://upstash.com)
2. Create a Redis database (free tier: 10,000 commands/day)
3. Copy the **Redis URL** (format: `rediss://default:TOKEN@HOST:PORT`)
4. Set `REDIS_URL` in your backend environment

---

## Known Limitations & Upcoming Features

### Current Limitations (v1.0)
- **Token blacklist** not implemented — logout only clears client-side token
- **Real-time updates** use polling (3s interval) — SSE/WebSockets in Phase 2
- **Email scheduling** field exists in DB but scheduling UI not implemented
- **SES and Brevo** providers are stubs (NotImplementedException)
- **Email verification** on registration not enforced (field tracked but no email sent)

### Upcoming Features (Phase 2)
- [ ] Server-Sent Events (SSE) for real-time campaign progress
- [ ] Campaign scheduling (send at future date/time)
- [ ] AWS SES provider integration
- [ ] Email open/click tracking via SendGrid webhooks
- [ ] Team workspaces and member roles
- [ ] Custom domain support
- [ ] Template library with saved templates
- [ ] A/B testing for subject lines

---

## Security Notes

- SendGrid API keys are encrypted with **AES-256-GCM** before storage — never stored in plain text
- The `ENCRYPTION_KEY` must never be rotated after first use (existing keys become unreadable)
- All API routes are protected by JWT with 7-day expiration
- Rate limiting: 100 req/min general, 5 req/min for auth routes
- CORS restricted to `FRONTEND_URL` only
- Helmet middleware applied for HTTP security headers
- All DTOs use class-validator with whitelist (unknown fields stripped)
- Multi-tenant isolation: every DB query filters by `userId`

---

## Project Structure

```
bulk-email-sender/
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── prisma/
│   │   │   └── schema.prisma   # Database schema
│   │   └── src/
│   │       ├── auth/           # Auth module (JWT, Google)
│   │       ├── campaigns/      # Campaigns CRUD + state machine
│   │       ├── common/         # Guards, filters, interceptors
│   │       ├── config/         # Configuration service
│   │       ├── jobs/           # Progress tracking
│   │       ├── mail/           # Mail providers (SendGrid)
│   │       ├── prisma/         # Prisma service
│   │       ├── queue/          # BullMQ producer + consumer
│   │       ├── recipients/     # File upload + manual entry
│   │       ├── reports/        # CSV/Excel export
│   │       ├── template/       # Handlebars engine
│   │       └── users/          # User profile + API key mgmt
│   └── web/                    # Next.js frontend
│       └── src/
│           ├── app/            # App Router pages
│           │   ├── (auth)/     # Login, Register
│           │   └── (dashboard)/# Protected pages
│           ├── components/     # UI components
│           ├── hooks/          # Custom React hooks
│           ├── lib/            # API client, utilities
│           └── stores/         # Zustand state
└── packages/
    └── shared/                 # Shared Zod schemas + TS types
```
