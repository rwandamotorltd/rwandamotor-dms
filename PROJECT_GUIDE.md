# Rwandamotor — Full Project Guide
**Last updated: June 2026 | Version: v1.0.0**

---

## 1. Overview

Rwandamotor Ltd operates a multi-brand automotive dealership in Rwanda (Suzuki, Changan, Range Rover, DEEPAL, and others). Two software projects support the business:

| Project | Name | Purpose | Audience |
|---|---|---|---|
| **CSSR / DMS** | Rwandamotor - CSSR | Customer Service & Sales Retention internal platform | Staff (Admin, Director, CRM, CRE) |
| **Website** | rwandamotor.com | Public-facing marketing site | Customers, public |

These are **two completely separate Next.js applications** on the same machine, deployed independently.

---

## 2. Project Locations on Your Machine

This is critical — two different tools (Cowork and Claude Code) work in different folders:

| Project | Cowork edits here | Claude Code edits here |
|---|---|---|
| DMS / CSSR | `C:\Users\APC\Claude\Projects\CSSR\frontend` | `c:\Projects\rwandamotor\frontend` |
| Website | _(not managed by Cowork)_ | `c:\Projects\rwandamotor\website` |
| Backend API | `C:\Users\APC\Claude\Projects\CSSR\backend` | `c:\Projects\rwandamotor\backend` |

> **Why changes "didn't take effect":** Cowork edits `C:\Users\APC\Claude\Projects\CSSR\frontend` but if you run `npm run dev` from `c:\Projects\rwandamotor\frontend`, you're running a different folder. Always run the DMS from the CSSR folder below.

### Running locally

```powershell
# Terminal 1 — Public website (port 3000)
cd c:\Projects\rwandamotor\website
npm run dev

# Terminal 2 — DMS / CSSR (port 3001)
cd C:\Users\APC\Claude\Projects\CSSR\frontend
npm run dev -- -p 3001

# Terminal 3 — Backend API (port 5000) — only needed if testing locally
cd C:\Users\APC\Claude\Projects\CSSR\backend\src\RwandaMotor.API
dotnet run
```

Access points:
- Website: http://localhost:3000
- DMS: http://localhost:3001
- API (Swagger): http://localhost:5000/swagger

---

## 3. Production URLs

| Service | URL | Hosting |
|---|---|---|
| Public Website | https://rwandamotor.com | Vercel |
| DMS / CSSR | https://app.rwandamotor.com | Vercel |
| Backend API | https://api.rwandamotor.com | Cloudflare Tunnel → Ubuntu Server |

> **Planned rename:** `app.rwandamotor.com` → `dms.rwandamotor.com` (just a Vercel domain alias + Cloudflare DNS CNAME).

---

## 4. Tech Stack

### DMS / CSSR Backend
| Component | Technology |
|---|---|
| Runtime | .NET 9 / ASP.NET Core |
| Architecture | Clean Architecture (Domain / Application / Infrastructure / API) |
| Database | PostgreSQL 16 |
| ORM | Entity Framework Core + Npgsql |
| Auth | ASP.NET Identity + JWT Bearer tokens |
| CQRS | MediatR with FluentValidation pipeline |
| Background Jobs | Quartz.NET (nightly retention evaluation) |
| Logging | Serilog (console + daily rolling file) |
| API Docs | Swagger / OpenAPI |

### DMS / CSSR Frontend
| Component | Technology |
|---|---|
| Framework | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui |
| Data Fetching | TanStack Query (React Query) |
| Charts | Recharts |
| Animations | Framer Motion |

### Website
| Component | Technology |
|---|---|
| Framework | Next.js (static export) |
| Styling | Scoped CSS (`.rwm-*` classes) |
| i18n | Custom lang-context (EN/FR/RW) |
| Routes | `/`, `/showroom`, `/showroom/[id]`, `/service`, `/parts`, `/events`, `/about`, `/contact` |

### Infrastructure
| Component | Technology |
|---|---|
| Server | Ubuntu 26.04 on Hyper-V (Windows Server 2012 R2 host) |
| API Process | systemd service (`rwandamotor-api`) |
| HTTPS Tunnel | Cloudflare Tunnel (`cloudflared`) — tunnel ID: `82492e60-afe3-4e36-b81e-a5f037e1a2d6` |
| CI/CD | GitHub Actions — self-hosted runner on server + Vercel deploy hook |
| Repo | github.com/rwandamotorltd/rwandamotor-dms |

---

## 5. Infrastructure Diagram

```
Browser
  │
  ├── rwandamotor.com ──────────────→ Vercel (Website — static)
  │
  ├── app.rwandamotor.com ──────────→ Vercel (DMS frontend)
  │                                        │ NEXT_PUBLIC_API_URL
  │                                        ↓
  └── api.rwandamotor.com ─────────→ Cloudflare Tunnel
                                           │
                                    Ubuntu Server :5000
                                           │
                                    .NET 9 API (systemd)
                                           │
                                    PostgreSQL 16 (local)
```

The Cloudflare Tunnel (`odoo-rwandamotor`) serves multiple subdomains from a single config at `/etc/cloudflared/config.yml` on the server. It handles HTTPS automatically — no port forwarding needed.

---

## 6. DMS Features & Modules

### User Roles
| Role | Access |
|---|---|
| **Admin** | Full access — users, technicians, all data, import |
| **TechnicalDirector** | Dashboard, vehicles, customers, service records, retention (no import, no admin) |
| **CRMOfficer** | Same as TechnicalDirector + Import Center |
| **CRE** | Customer Retention Executive — same as TechnicalDirector |

### Seeded Accounts
| Email | Password | Role |
|---|---|---|
| admin@rwandamotor.com | Admin@123! | Admin |
| director@rwandamotor.com | Director@123! | TechnicalDirector |
| crm@rwandamotor.com | Crm@123! | CRMOfficer |
| cre@rwandamotor.com | Cre@123! | CRE |

### Pages / Routes
| Route | Page | Roles |
|---|---|---|
| `/dashboard` | Executive Dashboard — KPIs | All |
| `/vehicles` | Vehicle Registry — list, filter, bulk actions | All |
| `/vehicles/[id]` | Vehicle 360° — full history | All |
| `/customers` | Customer Registry | All |
| `/customers/[id]` | Customer 360° | All |
| `/service-records` | Workshop job cards | All |
| `/retention` | Retention Analytics — cohorts, trends | All |
| `/import` | Bulk Import (CSV/Excel) | Admin, CRMOfficer |
| `/admin/users` | User Management | Admin only |
| `/admin/technicians` | Technician Management | Admin only |
| `/settings` | Settings | All |

### API Endpoints (summary)
| Controller | Base Path | Key Endpoints |
|---|---|---|
| Auth | `/api/auth` | POST `/login` |
| Dashboard | `/api/dashboard` | GET `/kpis` |
| Vehicles | `/api/vehicles` | GET, POST, PUT, DELETE, PUT `/bulk`, DELETE `/all` |
| Customers | `/api/customers` | GET, POST, PUT, DELETE, DELETE `/all` |
| Service Records | `/api/servicerecords` | GET, POST, PUT, DELETE, DELETE `/all` |
| Technicians | `/api/technicians` | GET, POST, PUT `/{id}`, DELETE `/{id}` |
| Retention | `/api/retention` | GET `/analytics`, GET `/visit-cohorts`, GET `/cohort-vehicles` |
| Import | `/api/import` | POST `/validate`, POST `/process/{id}` |
| Service Policies | `/api/servicepolicies` | GET |
| Admin | `/api/admin` | GET `/users`, POST `/users`, PUT `/users/{id}`, POST `/users/{id}/reset-password` |

---

## 7. Backend Architecture

### Clean Architecture Layers
```
RwandaMotor.Domain          — Entities, Enums, Events (no dependencies)
RwandaMotor.Application     — Commands, Queries, Interfaces, Behaviours
RwandaMotor.Infrastructure  — EF Core, Identity, Services, Jobs, Seeder
RwandaMotor.API             — Controllers, Middleware, Program.cs
```

### Domain Entities
- `ApplicationUser` — ASP.NET Identity user with `FullName`, `IsActive`
- `Vehicle` — plate, VIN, brand/model, mileage, warranty, retention status
- `Customer` — contact, category (Retail/Fleet/Corporate/VIP), active flag
- `ServiceRecord` — job card linking vehicle, customer, technician
- `Technician` — employee with specialization, certification, soft-delete
- `Brand` — vehicle brand catalogue
- `ServicePolicy` — service interval rules per brand
- `ImportLog` — tracks bulk import operations
- `FollowUp` — customer follow-up tasks

### Key Technical Fixes Applied
| Issue | Fix |
|---|---|
| Npgsql DateTime UTC error | `AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true)` before `CreateBuilder` in Program.cs |
| ERR_NAME_NOT_RESOLVED for api.rwandamotor.com | Manual CNAME in Cloudflare DNS (Name: `api`, Target: tunnel ID, Proxied ON) |
| Windows DNS not resolving Cloudflare domains | Set DNS to 8.8.8.8 on `vEthernet (External-Internet)` adapter |
| Next.js 16 `eslint` not in NextConfig type | Removed from next.config.ts; added `DISABLE_ESLINT_PLUGIN=true` in Vercel env vars |

---

## 8. Frontend Architecture

### Key Files
```
frontend/src/
├── app/
│   ├── layout.tsx                    — Root layout, metadata, providers
│   ├── page.tsx                      — Redirects to /dashboard
│   ├── (auth)/login/page.tsx         — Login page
│   └── (dashboard)/
│       ├── layout.tsx                — Dashboard shell (sidebar + header)
│       ├── dashboard/page.tsx        — Executive KPIs
│       ├── vehicles/page.tsx         — Vehicle list
│       ├── vehicles/[id]/page.tsx    — Vehicle 360°
│       ├── customers/page.tsx        — Customer list
│       ├── customers/[id]/page.tsx   — Customer 360°
│       ├── service-records/page.tsx  — Job cards
│       ├── retention/page.tsx        — Analytics
│       ├── import/page.tsx           — Bulk import
│       ├── admin/users/page.tsx      — User management
│       └── admin/technicians/page.tsx — Technician management
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx               — Navigation sidebar (collapsible + mobile drawer)
│   │   └── header.tsx                — Top bar (breadcrumb, search, theme, hamburger)
│   ├── shared/
│   │   ├── kpi-card.tsx              — Dashboard KPI widget
│   │   └── retention-badge.tsx       — Color-coded retention status badge
│   ├── ui/                           — shadcn/ui components
│   └── providers/                    — Theme + TanStack Query providers
├── contexts/
│   └── auth-context.tsx              — JWT auth state (login, logout, user)
├── lib/
│   └── api.ts                        — All API calls (axios, typed)
└── types/
    └── index.ts                      — Shared TypeScript types
```

### Environment Variables
| Variable | Local | Production (Vercel) |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:5000/api` | `https://api.rwandamotor.com/api` |
| `DISABLE_ESLINT_PLUGIN` | _(not needed)_ | `true` |

---

## 9. Changes Made in This Session (June 2026)

### Branding — "Rwandamotor DMS" → "Rwandamotor - CSSR"
| File | What changed |
|---|---|
| `frontend/src/app/layout.tsx` | Page title metadata |
| `frontend/src/components/layout/header.tsx` | Subtitle text |
| `frontend/src/components/layout/sidebar.tsx` | "DMS Platform" → "CSSR Platform" |
| `frontend/src/app/(auth)/login/page.tsx` | Heading + footer text |

### Login Page Cleanup
- Removed demo credential buttons for Director and CRM
- Admin credentials still pre-filled in email/password inputs (no visible button)
- Clean, professional login form only

### Mobile Responsiveness
| File | What changed |
|---|---|
| `frontend/src/app/(dashboard)/layout.tsx` | Added `mobileOpen` state, backdrop overlay, passes `onMenuClick` to Header |
| `frontend/src/components/layout/header.tsx` | Added hamburger `Menu` button (hidden on `md+`), accepts `onMenuClick` prop |
| `frontend/src/components/layout/sidebar.tsx` | Hidden on mobile by default (`hidden md:flex`), shows as fixed overlay when `mobileOpen=true`, X close button on mobile |

### Admin — Password Reset
**Backend:**
- `ManageUserCommand.cs` — Added `ResetPasswordCommand` + validator + handler (uses Identity's `GeneratePasswordResetTokenAsync` + `ResetPasswordAsync`)
- `AdminController.cs` — Added `POST /api/admin/users/{id}/reset-password`

**Frontend:**
- `api.ts` — Added `adminApi.resetPassword(userId, newPassword)`
- `admin/users/page.tsx` — Complete rewrite:
  - Fixed React Hooks violation (all hooks now before early return)
  - Added `ResetPasswordModal` with new password + confirm fields + show/hide toggle
  - Key icon button (amber) on each user row opens the modal
  - Email shown as sub-row on mobile (responsive table)
  - `overflow-x-auto` on table container

### Technicians Page (previous session)
- Fixed all edit fields (phone, email, specialization, certificationLevel, isActive)
- Specialization dropdown with 10 preset options
- Delete button with confirmation modal
- Active/Inactive badge
- "Show all / Active only" toggle

---

## 10. Deployment

### How to push changes to production

All changes go live automatically when you push to the `main` branch:

```powershell
# From C:\Users\APC\Claude\Projects\CSSR (Cowork's folder)
git add -A
git commit -m "feat: rebrand to CSSR, mobile responsiveness, admin password reset"
git push origin main
```

GitHub Actions then:
1. Builds and deploys the .NET API to `/opt/rwandamotor-api` on the Ubuntu server and restarts the systemd service
2. Triggers a Vercel deploy hook to redeploy the frontend

**Frontend-only changes** can also be deployed via Vercel dashboard → Deployments → Redeploy.

### Server management (SSH into server)
```bash
# Check API status
sudo systemctl status rwandamotor-api

# Restart API
sudo systemctl restart rwandamotor-api

# View live logs
sudo journalctl -u rwandamotor-api -f

# Check Cloudflare Tunnel
sudo systemctl status cloudflared
```

---

## 11. Known Issues & Pending Work

| Item | Status | Notes |
|---|---|---|
| Domain rename `app.` → `dms.rwandamotor.com` | Pending | Vercel domain alias + Cloudflare CNAME |
| Website deployment to Vercel | Pending | New Vercel project for `c:\Projects\rwandamotor\website` |
| Link website "Staff Login" → DMS | Pending | Simple `<a href="https://dms.rwandamotor.com">` in website nav |
| Settings page | Stub | No content yet |
| Notifications (bell icon = 3) | Hardcoded | Badge is static, no real notification system |
| `AllowedOrigins` in appsettings | Needs update | Add `https://dms.rwandamotor.com` when domain is renamed |

---

## 12. Important Warnings

**Never run migrations manually on production.** EF Core `MigrateAsync()` runs automatically on API startup. Just deploy and restart the service.

**The Cloudflare Tunnel is named `odoo-rwandamotor`** but serves rwandamotor DMS, odoo, n8n, and report — do not create a separate tunnel for a new subdomain. Add it as a route in the existing tunnel config at `/etc/cloudflared/config.yml`.

**Do not add `&&` in PowerShell 5.** Use `;` instead or run commands on separate lines. PowerShell 7 supports `&&`.

**Two separate project folders exist on this machine.** Cowork (this session) edits `C:\Users\APC\Claude\Projects\CSSR`. Claude Code (other sessions) edits `c:\Projects\rwandamotor`. After making changes in either tool, always `git push` so both stay in sync via the shared GitHub repo.
