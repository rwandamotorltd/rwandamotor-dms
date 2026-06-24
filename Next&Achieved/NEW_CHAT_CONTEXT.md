# Rwandamotor - CSSR — New Chat Handover
**Date: June 2026 | Version: v1.0.0 | Repo: github.com/rwandamotorltd/rwandamotor-dms**

---

## What This Project Is

**Rwandamotor - CSSR** (Customer Service & Sales Retention) is the internal DMS for RwandaMotor Ltd, a multi-brand automotive dealership in Rwanda. It tracks customers, vehicles, service records, and retention analytics. Built from scratch with .NET 9 backend + Next.js 16 frontend.

---

## Critical: Two Folder Locations

| Tool | Edits this folder |
|---|---|
| **Cowork** (this session type) | `C:\Users\APC\Claude\Projects\CSSR\` |
| **Claude Code** (terminal) | `c:\Projects\rwandamotor\` |

Both sync through GitHub (`github.com/rwandamotorltd/rwandamotor-dms`). Always push after editing so the other copy stays in sync. **If you make changes in Cowork and run from `c:\Projects\rwandamotor\`, your changes won't appear** — wrong folder.

---

## Production URLs

| Service | URL | Host |
|---|---|---|
| DMS Frontend | https://app.rwandamotor.com | Vercel |
| Backend API | https://api.rwandamotor.com | Cloudflare Tunnel → Ubuntu server :5000 |
| GitHub Repo | github.com/rwandamotorltd/rwandamotor-dms | — |

---

## Tech Stack

**Backend** — `C:\Users\APC\Claude\Projects\CSSR\backend\`
- .NET 9 / ASP.NET Core, Clean Architecture (Domain / Application / Infrastructure / API)
- PostgreSQL 16 + Entity Framework Core + Npgsql
- ASP.NET Identity + JWT Bearer (roles: Admin, TechnicalDirector, CRMOfficer, CRE)
- MediatR CQRS + FluentValidation pipeline
- Quartz.NET nightly retention job
- Serilog logging

**Frontend** — `C:\Users\APC\Claude\Projects\CSSR\frontend\`
- Next.js 16, React 19, TypeScript
- Tailwind CSS v4, shadcn/ui
- TanStack Query (data fetching), Recharts (charts), Framer Motion

**Infrastructure**
- Ubuntu 26.04 on Hyper-V (Windows Server 2012 R2 host)
- systemd service: `rwandamotor-api`
- Cloudflare Tunnel named `odoo-rwandamotor` (tunnel ID: `82492e60-afe3-4e36-b81e-a5f037e1a2d6`)
- GitHub Actions CI/CD with self-hosted runner on the server
- Vercel for Next.js frontend

---

## Key Backend Files

```
backend/src/
├── RwandaMotor.Domain/Entities/
│   — ApplicationUser, Vehicle, Customer, ServiceRecord,
│     Technician, Brand, ServicePolicy, ImportLog, FollowUp
├── RwandaMotor.Application/Features/
│   ├── Auth/Commands/LoginCommand.cs
│   ├── Vehicles/       — CRUD + bulk commands/queries
│   ├── Customers/      — CRUD commands/queries
│   ├── ServiceRecords/ — CRUD commands/queries
│   ├── Technicians/    — CRUD commands/queries
│   ├── Retention/      — Analytics, cohort queries
│   ├── Import/         — Validate + Process commands
│   └── Admin/Commands/ManageUserCommand.cs  ← user CRUD + ResetPasswordCommand
├── RwandaMotor.Infrastructure/
│   ├── Persistence/ApplicationDbContext.cs
│   ├── Persistence/Migrations/    ← never run manually; MigrateAsync() on startup
│   ├── Persistence/Seed/ApplicationDbSeeder.cs
│   └── Services/ServiceIntervalEngine.cs
└── RwandaMotor.API/
    ├── Program.cs           — CORS allows app.rwandamotor.com + *.vercel.app
    ├── appsettings.Production.json
    └── Controllers/
        ├── AuthController.cs
        ├── DashboardController.cs
        ├── VehiclesController.cs
        ├── CustomersController.cs
        ├── ServiceRecordsController.cs
        ├── TechniciansController.cs
        ├── RetentionController.cs
        ├── ImportController.cs
        └── AdminController.cs  ← POST /users/{id}/reset-password
```

---

## Key Frontend Files

```
frontend/src/
├── app/
│   ├── layout.tsx                         — Root metadata: "Rwandamotor - CSSR"
│   ├── (auth)/login/page.tsx              — Clean login; no demo buttons; admin pre-filled
│   └── (dashboard)/
│       ├── layout.tsx                     — Auth guard + mobile sidebar state
│       ├── dashboard/page.tsx             — Executive KPIs
│       ├── vehicles/page.tsx              — Vehicle list + bulk actions
│       ├── vehicles/[id]/page.tsx         — Vehicle 360°
│       ├── customers/page.tsx             — Customer list
│       ├── customers/[id]/page.tsx        — Customer 360°
│       ├── service-records/page.tsx       — Job cards
│       ├── retention/page.tsx             — Retention analytics
│       ├── import/page.tsx                — Bulk CSV/Excel import
│       ├── admin/users/page.tsx           — User management + password reset modal
│       ├── admin/technicians/page.tsx     — Technician management
│       └── settings/page.tsx              — Stub (no content yet)
├── components/layout/
│   ├── sidebar.tsx   — Collapsible nav; hidden on mobile; fixed overlay when mobileOpen=true
│   └── header.tsx    — Breadcrumb + hamburger (mobile) + theme toggle
├── contexts/auth-context.tsx   — JWT auth state (login/logout/user)
├── lib/api.ts                  — All API calls (axios, typed); includes adminApi.resetPassword
└── types/index.ts              — Shared TypeScript types
```

---

## API Endpoints

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Login, returns JWT |
| GET | `/api/dashboard/kpis` | All | Executive KPI numbers |
| GET/POST/PUT/DELETE | `/api/vehicles` | All | Vehicle CRUD |
| PUT | `/api/vehicles/bulk` | All | Bulk status/policy update |
| GET/POST/PUT/DELETE | `/api/customers` | All | Customer CRUD |
| GET/POST/PUT/DELETE | `/api/servicerecords` | All | Job card CRUD |
| GET/POST/PUT/DELETE | `/api/technicians` | All | Technician CRUD |
| GET | `/api/retention/analytics` | All | Retention trends + cohorts |
| GET | `/api/retention/visit-cohorts` | All | Visit frequency by year |
| GET | `/api/retention/cohort-vehicles` | All | Vehicles in a cohort |
| POST | `/api/import/validate` | Admin, CRM | Validate CSV/Excel upload |
| POST | `/api/import/process/{id}` | Admin, CRM | Run bulk import |
| GET | `/api/admin/users` | Admin | List all users |
| POST | `/api/admin/users` | Admin | Create user |
| PUT | `/api/admin/users/{id}` | Admin | Update role / enable / disable |
| POST | `/api/admin/users/{id}/reset-password` | Admin | Reset user password |
| GET/POST/PUT/DELETE | `/api/technicians` | Admin | Technician management |

---

## User Accounts (Seeded)

| Email | Password | Role |
|---|---|---|
| admin@rwandamotor.com | Admin@123! | Admin |
| director@rwandamotor.com | Director@123! | TechnicalDirector |
| crm@rwandamotor.com | Crm@123! | CRMOfficer |
| cre@rwandamotor.com | Cre@123! | CRE |

---

## Environment Variables

**Frontend (Vercel)**
| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.rwandamotor.com/api` |
| `DISABLE_ESLINT_PLUGIN` | `true` |

**Backend (appsettings.Production.json)**
- `Jwt:Key` — injected via `${JWT_SECRET}` env var on server
- `ConnectionStrings:DefaultConnection` — injected via `${DB_PASSWORD}`

---

## Deployment

```powershell
# Push to production (triggers GitHub Actions → API deploy + Vercel frontend)
cd C:\Users\APC\Claude\Projects\CSSR
git add -A
git commit -m "feat: ..."
git push origin main
```

GitHub Actions on `main`:
1. Self-hosted runner builds .NET API and runs `/usr/local/bin/rwandamotor-deploy`
2. Curl to `VERCEL_DEPLOY_HOOK` triggers Vercel redeploy

**Server commands (SSH)**
```bash
sudo systemctl status rwandamotor-api     # Status
sudo systemctl restart rwandamotor-api    # Restart
sudo journalctl -u rwandamotor-api -f     # Live logs
sudo systemctl status cloudflared         # Tunnel status
```

---

## Technical Notes & Gotchas

| Issue | Detail |
|---|---|
| Npgsql DateTime UTC | `AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true)` in Program.cs before CreateBuilder |
| CORS policy | `SetIsOriginAllowed` — allows `app.rwandamotor.com` + any `*.vercel.app` preview URL |
| PowerShell `&&` | Doesn't work in PS5 — use `;` or separate lines |
| Paths with `(dashboard)` in PS | Must be quoted: `"frontend/src/app/(dashboard)/layout.tsx"` |
| Never run migrations manually | `MigrateAsync()` runs on API startup automatically |
| Cloudflare Tunnel is shared | Named `odoo-rwandamotor`; serves odoo, n8n, report, api. Add new subdomains as routes in `/etc/cloudflared/config.yml` — do NOT create a new tunnel |
| Two folder problem | Cowork edits `C:\Users\APC\Claude\Projects\CSSR`; Claude Code edits `c:\Projects\rwandamotor`. Push to GitHub to keep in sync |
| React hooks order | All hooks must be called before any early return — enforced by ESLint |
| JWT Audience | Set to `https://app.rwandamotor.com` in production config |

---

## Pending Work

| Item | Notes |
|---|---|
| Domain rename `app.` → `dms.rwandamotor.com` | Vercel alias + Cloudflare CNAME + add to AllowedOrigins in appsettings.Production.json |
| Link website to DMS | Add "Staff Login" link in rwandamotor.com nav pointing to DMS URL |
| Settings page | Stub only — no content implemented |
| Notification bell | Hardcoded badge (3) — no real notification system yet |
