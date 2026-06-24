# CLAUDE HANDOFF — Rwandamotor CSSR
**Purpose:** Paste this entire file as your FIRST message when starting a new Claude session (Cowork or Claude Code). It gives Claude full project context instantly.

---

## WHO YOU ARE TALKING TO

- **Company:** Rwandamotor Ltd — multi-brand automotive dealership, Rwanda
- **Owner/Admin:** admin@rwandamotor.com
- **Project name:** CSSR (Customer Service & Sales Retention)
- **What it is:** A custom Dealer Management System (DMS) — NOT Odoo. Odoo runs separately on the same server for ERP. This is a purpose-built web app.

---

## LIVE URLS

| Service | URL |
|---------|-----|
| Frontend (app) | https://app.rwandamotor.com |
| Backend API | https://api.rwandamotor.com |
| GitHub repo | https://github.com/rwandamotorltd/rwandamotor-dms |

---

## TECH STACK

### Backend
- **.NET 9** — Clean Architecture: `Domain / Application / Infrastructure / API`
- **Pattern:** CQRS with MediatR
- **ORM:** Entity Framework Core 9 + Npgsql
- **Database:** PostgreSQL 16
- **Auth:** ASP.NET Core Identity + JWT Bearer tokens
- **Validation:** FluentValidation via MediatR pipeline
- **Scheduling:** Quartz.NET (nightly retention job at 02:00 UTC)
- **Logging:** Serilog → console + rolling file

### Frontend
- **Next.js 15** (App Router) + TypeScript
- **UI:** shadcn/ui + Tailwind CSS
- **State/Data:** TanStack Query (React Query) + TanStack Table
- **Charts:** Recharts
- **Animations:** Framer Motion
- **Toasts:** Sonner
- **Date formatting:** date-fns

---

## PROJECT STRUCTURE

```
CSSR/
├── backend/
│   └── src/
│       ├── RwandaMotor.Domain/         # Entities, enums, BaseEntity
│       ├── RwandaMotor.Application/    # CQRS commands/queries, interfaces, DTOs
│       ├── RwandaMotor.Infrastructure/ # EF Core, migrations, seeder, services
│       └── RwandaMotor.API/            # Controllers, middleware, Program.cs
├── frontend/
│   └── src/
│       ├── app/(dashboard)/            # All protected pages
│       ├── components/ui/              # shadcn/ui components
│       ├── contexts/auth-context.tsx   # JWT auth + permissions
│       ├── lib/api.ts                  # All API calls (axios)
│       └── types/index.ts              # All TypeScript interfaces
├── deploy/
│   ├── rwandamotor-api.service         # systemd service file
│   ├── nginx-api.conf                  # Nginx reverse proxy config
│   └── server-setup.sh                 # One-command server setup
└── .github/workflows/
    ├── ci.yml                          # Build + type-check on every push
    └── deploy.yml                      # Self-hosted runner → build + deploy API
```

---

## DEPLOYMENT ARCHITECTURE

```
Developer pushes to GitHub (main branch)
        ↓
GitHub Actions CI (ubuntu-latest)
  - dotnet build + test
  - Next.js type-check + build
        ↓ (if passes)
GitHub Actions Deploy (self-hosted runner on odoo-server)
  - dotnet publish → /tmp/rwandamotor-publish
  - sudo /usr/local/bin/rwandamotor-deploy  (copies files + restarts service)
        ↓
/opt/rwandamotor-api/  (API runtime files)
systemd: rwandamotor-api.service  (port 5000)
Nginx → Cloudflare Tunnel → api.rwandamotor.com

Frontend: Vercel auto-deploys via deploy hook
→ app.rwandamotor.com
```

**Server:** Ubuntu, hostname `odoo-server`, user `rwandamotor`
**Self-hosted runner:** `/home/rwandamotor/actions-runner/`
**API files:** `/opt/rwandamotor-api/`
**API port:** 5000 (Nginx proxies to it)

---

## USER ROLES & PERMISSIONS

| Role | Access |
|------|--------|
| Admin | Everything including Settings (users, permissions, company, sequence) |
| CRMOfficer | All operational features (job cards, vehicles, customers, service records, import, retention) — no Settings |
| TechnicalDirector | Read-only across all modules |
| CRE | Dashboard only by default |

**Permission Groups:** Admins can create named groups that override role defaults for fine-grained control (e.g. a CRMOfficer who can't delete).

---

## DATABASE ENTITIES (all tables)

| Entity | Notes |
|--------|-------|
| ApplicationUser | ASP.NET Identity user + role + permissionGroupId |
| PermissionGroup | Named groups with JSON array of permission keys |
| Customer | Soft-delete, categories: Retail/Corporate/Fleet/Government |
| Vehicle | Soft-delete, linked to Brand+Model+Customer, service policy |
| Brand | Toyota, Suzuki, etc. |
| VehicleModel | Belongs to Brand |
| ServiceRecord | Service history, auto-created when job card closes |
| ServicePart | Parts used in a service record |
| ServicePolicy | Mileage/time-based service interval rules per brand |
| Technician | Workshop technicians, soft-delete |
| WorkshopBay | Workshop bays |
| FollowUp | Customer follow-up tasks |
| ImportLog | Bulk import session tracking |
| ImportLogRow | Per-row import results |
| JobCard | Workshop intake card. Status: Open → Closed |
| JobCardSequence | Per-year sequence counter for job card numbers (OR-YYYY-NNNN) |
| SalesHistory | Auto-created on PDI job card close |
| CompanySettings | **Singleton** (fixed Guid `00000000-0000-0000-0000-000000000001`). Company info + per-doc print toggles. No soft-delete. |

**Soft-delete pattern:** All entities except CompanySettings, JobCardSequence extend `BaseEntity` which has `IsDeleted`, `DeletedAt`, `DeletedBy`. Global query filters exclude soft-deleted rows.

---

## KEY API ROUTES

```
POST   /api/auth/login
GET    /api/dashboard/kpis

GET    /api/vehicles              (paginated, filterable)
GET    /api/vehicles/{id}/360     (full vehicle profile)
POST   /api/vehicles
PUT    /api/vehicles/{id}
DELETE /api/vehicles

GET    /api/customers             (paginated)
GET    /api/customers/{id}/360
POST   /api/customers
PUT    /api/customers/{id}

GET    /api/jobcards              (paginated)
GET    /api/jobcards/{id}
POST   /api/jobcards
PUT    /api/jobcards/{id}         ← edit open job cards only
POST   /api/jobcards/{id}/convert ← close + create delivery note + service record
PUT    /api/jobcards/sequence     (Admin only)

GET    /api/servicerecords
POST   /api/servicerecords
PUT    /api/servicerecords/{id}

GET    /api/technicians
POST   /api/technicians
PUT    /api/technicians/{id}
DELETE /api/technicians/{id}

GET    /api/vehicles/brands

GET    /api/retention/analytics
GET    /api/retention/visit-cohorts
GET    /api/retention/cohort-vehicles

GET    /api/company-settings      ← any authenticated user (for print view)
PUT    /api/admin/company-settings ← Admin only

GET    /api/admin/users
POST   /api/admin/users
PUT    /api/admin/users/{id}
POST   /api/admin/users/{id}/reset-password

GET    /api/admin/permission-groups
POST   /api/admin/permission-groups
PUT    /api/admin/permission-groups/{id}
DELETE /api/admin/permission-groups/{id}

POST   /api/import/validate
POST   /api/import/process/{importLogId}
```

---

## IMPORTANT PATTERNS & DECISIONS

### 1. CompanySettings singleton
- One row in DB, fixed Guid PK `00000000-0000-0000-0000-000000000001`
- EF config: `ValueGeneratedNever()` — must set explicitly
- Seeder creates default row on first boot (never overwrites existing)
- GET is on `CompanySettingsController` (any auth) — needed for job card print
- PUT is on `AdminController` (Admin policy) — write is admin-only

### 2. ASP.NET Core auth stacking
- Class-level `[Authorize(Policy = "Admin")]` + method-level `[Authorize]` = AND (not override)
- To allow a looser policy on one endpoint, put it in a **separate controller**

### 3. Job card numbering
- Format: `OR-2026-0001`
- Sequence stored in `JobCardSequence` table (one row per year)
- Admin can reset/override sequence in Settings → Sequence tab
- PDI job cards auto-create a `SalesHistory` entry on close

### 4. Job card editing
- Only `Open` status job cards can be edited
- `UpdateJobCardCommand` validates `jobCard.Status != JobCardStatus.Open` and throws
- API returns 400 BadRequest with message if closed

### 5. Print view (job card / delivery note)
- `PrintView` component renders off-screen in a hidden div
- `printJobCard()` injects `innerHTML` into `window.open()` 
- CSS: `@page { margin: 0 }` + empty `<title>` suppresses browser date/URL headers
- Layout matches PDF template (bordered company box, numbered work items, accessories checkboxes, CLIENT/VEHICLE tables, signature blocks)
- Company info pulled from `GET /api/company-settings`

### 6. Migrations
- Manual migration `20260615120000_AddCompanySettings.cs` creates the CompanySettings table
- Migrations run automatically on API startup via `db.Database.MigrateAsync()`

---

## FRONTEND KEY FILES

| File | Purpose |
|------|---------|
| `src/lib/api.ts` | All API calls. One axios instance with JWT interceptor. |
| `src/types/index.ts` | All TypeScript interfaces matching backend DTOs |
| `src/contexts/auth-context.tsx` | Auth state, JWT decode, permissions |
| `src/app/(dashboard)/layout.tsx` | Protected layout with sidebar |
| `src/components/ui/sidebar.tsx` | Navigation sidebar (permission-aware) |
| `src/app/(dashboard)/job-cards/[id]/page.tsx` | Job card detail, print view, edit mode |
| `src/app/(dashboard)/settings/page.tsx` | Admin settings: Users, Permission Groups, Sequence, Company |

---

## KNOWN ISSUES & WORKAROUNDS

### Windows-mount file truncation (CRITICAL for Cowork/Cowork mode)
When editing files via the Claude Cowork desktop app on Windows, the Linux sandbox reads a **stale/truncated version** of recently-edited files. This means `git hash-object` captures wrong content.

**Workaround used throughout this project:**
```bash
# After editing a file, wait 2 seconds then:
new_hash=$(git hash-object -w path/to/file)
blob_lines=$(git cat-file -p $new_hash | wc -l)
# Verify blob_lines == disk lines before committing
mode=$(git ls-files -s path/to/file | awk '{print $1}')
git update-index --cacheinfo "$mode,$new_hash,path/to/file"
git commit --amend --no-edit
```

**In Claude Code:** This problem does NOT exist because Claude Code runs natively on the filesystem. No workaround needed.

### Null bytes in files
Sometimes Edit tool writes null bytes (`\0`) into files. Fix:
```bash
tr -d '\0' < file.tsx > /tmp/clean.tsx && cp /tmp/clean.tsx file.tsx
```

### CRLF line endings
Files edited on Windows may get `\r\n`. Fix before committing:
```bash
tr -d '\r' < file.cs > /tmp/clean.cs && cp /tmp/clean.cs file.cs
```

---

## CURRENT STATE (as of 2026-06-16)

### What's working
- Full vehicle + customer CRUD with 360° views
- Job card create / view / edit (open only) / close → delivery note
- Print view matching company PDF template
- Company settings (admin configures, applies to all print docs)
- User management + permission groups
- Retention analytics dashboard
- Bulk import (vehicles, customers, service records)
- Self-hosted GitHub Actions runner deploying API on push

### What to do next (backlog)
- Email delivery of job cards / delivery notes (SMTP/SendGrid — endpoint exists, `IEmailService` not yet injected)
- Service due alerts / follow-up automation (Quartz job exists, logic TBD)
- Mobile-optimised job card intake form
- Parts inventory module

---

## HOW TO RUN LOCALLY

```bash
# Backend
cd backend/src/RwandaMotor.API
# Set connection string in appsettings.Development.json
dotnet run

# Frontend
cd frontend
npm install
# Set NEXT_PUBLIC_API_URL=http://localhost:5000/api in .env.local
npm run dev
```

---

## HOW TO DEPLOY (manual)

```bash
# On odoo-server as rwandamotor user:
cd /home/rwandamotor/actions-runner/_work/rwandamotor-dms/rwandamotor-dms
git pull origin main
dotnet publish backend/src/RwandaMotor.API/RwandaMotor.API.csproj \
  -c Release -r linux-x64 --self-contained false \
  -o /tmp/rwandamotor-publish
sudo /usr/local/bin/rwandamotor-deploy
```

Or just push to `main` and the self-hosted runner does it automatically.

---

*End of handoff file. Paste this entire document as your first message in a new Claude session.*
