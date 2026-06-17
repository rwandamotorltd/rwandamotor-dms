# RWANDAMOTOR LTD — DMS Project Reference

Custom Dealer Management System (CSSR) built for Rwandamotor Ltd, Kigali, Rwanda.
Tracks vehicles, customers, job cards, service records, retention, and email communication.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | .NET 9 · ASP.NET Core Web API · MediatR (CQRS) · EF Core 9 |
| Database | PostgreSQL (production) · self-hosted on Ubuntu server |
| Frontend | Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 |
| UI components | shadcn/ui · Radix UI · Framer Motion · Recharts |
| Data fetching | TanStack React Query v5 · Axios |
| Auth | JWT Bearer tokens · 8 h expiry · role + permission groups |
| Email | System.Net.Mail (SMTP) — Outlook-compatible table-based HTML |
| CI | GitHub Actions (ci.yml) — build, lint, type-check, docker build |
| CD | GitHub Actions (deploy.yml) — self-hosted runner for API, Vercel for frontend |

---

## Repository Layout

```
CSSR/
├── backend/                        .NET 9 solution
│   ├── Dockerfile
│   └── src/
│       ├── RwandaMotor.Domain/         Entities, enums, domain events
│       ├── RwandaMotor.Application/    CQRS commands/queries (MediatR)
│       ├── RwandaMotor.Infrastructure/ EF Core, migrations, services
│       └── RwandaMotor.API/            Controllers, Program.cs, appsettings
│
├── frontend/                       Next.js 16 app
│   ├── Dockerfile
│   └── src/
│       ├── app/
│       │   ├── (auth)/login/           Login page
│       │   ├── (dashboard)/            All protected pages (layout.tsx wraps all)
│       │   │   ├── layout.tsx          Sidebar + header + idle-logout (10 min)
│       │   │   ├── dashboard/          KPI cards, charts
│       │   │   ├── vehicles/           Vehicle list + [id] 360 view
│       │   │   ├── customers/          Customer list + [id] 360 view
│       │   │   ├── job-cards/          Job card list + [id] detail/print
│       │   │   ├── service-records/    Service history
│       │   │   ├── retention/          Retention analytics + cohorts
│       │   │   ├── sales/              PDI & sales history
│       │   │   ├── activity/           Audit log
│       │   │   ├── import/             Excel/CSV import centre
│       │   │   ├── settings/           Company settings, email templates, print config
│       │   │   └── admin/              User management, technicians
│       │   └── manifest.ts             PWA manifest
│       ├── components/
│       │   ├── layout/                 Sidebar, Header
│       │   ├── ui/                     shadcn primitives (Button, Dialog, …)
│       │   ├── shared/                 KpiCard, RetentionBadge
│       │   └── pwa/                    Install prompt
│       ├── contexts/auth-context.tsx   JWT auth state, login/logout
│       ├── lib/api.ts                  All Axios API calls (typed)
│       └── types/index.ts              Shared TypeScript interfaces
│
├── docker/docker-compose.yml       Local dev / docker stack
├── deploy/                         Cloudflare tunnel config
└── .github/workflows/
    ├── ci.yml                      Build + lint + type-check + docker build
    └── deploy.yml                  Push to server + trigger Vercel
```

---

## Backend — Domain Entities

| Entity | Table | Notes |
|---|---|---|
| `Vehicle` | Vehicles | Brand/Model FK, soft-delete, retention status |
| `Customer` | Customers | Category (Retail/Fleet/Corporate), soft-delete |
| `Brand` + `Model` | Brands / VehicleModels | Catalogue, seeded |
| `JobCard` | JobCards | Status: Open → InProgress → Closed; auto-generates service record on close |
| `ServiceRecord` | ServiceRecords | Auto-created from job card conversion |
| `SalesHistory` | SalesHistories | Auto-created from PDI job card |
| `Technician` | Technicians | Assigned to job cards |
| `CompanySettings` | CompanySettings | Singleton row (Id = `00000000-0000-0000-0000-000000000001`) |
| `ApplicationUser` | AspNetUsers | ASP.NET Identity + custom permissions |
| `PermissionGroup` | PermissionGroups | Named sets of permission strings |
| `AuditLog` | AuditLogs | Every create/update/delete action |
| `ImportLog` | ImportLogs | Tracks batch CSV/Excel imports |
| `FollowUp` | FollowUps | Future use — appointment/reminder foundation |

---

## Backend — Application Features (CQRS)

```
Features/
├── Auth/              LoginCommand → JWT
├── Vehicles/          GetVehiclesQuery, GetVehicle360Query, CreateVehicleCommand, Update, Delete, BulkUpdate
├── Customers/         GetCustomersQuery, GetCustomer360Query, Create, Update, Delete, DeleteAll
├── JobCards/          GetJobCardsQuery, GetJobCardQuery, CreateJobCardCommand, UpdateJobCardCommand,
│                      ConvertToDeliveryNoteCommand (closes card, sends email, creates ServiceRecord)
├── ServiceRecords/    Get, Create, Update, Delete, DeleteAll
├── Sales/             GetSalesHistoriesQuery
├── Retention/         GetRetentionAnalyticsQuery, GetVisitFrequencyCohortQuery, GetCohortVehiclesQuery
├── Dashboard/         GetDashboardKpisQuery
├── Import/            ProcessImportCommand (CSV/Excel → bulk upsert)
├── Activity/          GetActivityLogQuery (AuditLogs)
├── Admin/             GetUsersQuery, ManageUserCommand, BrandModelCommands, GetCatalogueBrandsQuery
└── PermissionGroups/  Create, Update, Delete, Assign to user
```

---

## Backend — Key Services

| Service | Path | Purpose |
|---|---|---|
| `SmtpEmailService` | Infrastructure/Services/ | Sends HTML email via SMTP; Outlook-compatible table layout |
| `JwtService` | Infrastructure/Services/ | Issues and validates JWT tokens |
| `RetentionEngine` | Infrastructure/Services/ | Evaluates vehicle retention status (Active / AtRisk / Lost) |
| `ServiceIntervalEngine` | Infrastructure/Services/ | Calculates next service date and mileage |
| `ImportService` | Infrastructure/Services/ | Parses Excel/CSV, maps to domain, bulk-inserts |
| `RetentionEvaluationJob` | Infrastructure/BackgroundJobs/ | Hosted service — runs retention sweep daily |

---

## Backend — Email

**Triggered:** when a job card is created (open email) and when converted to delivery note (thank-you email).

**Sender name:** `RWANDAMOTOR LTD` — set in `appsettings.json → Email.FromName`

**Templates:** stored on the `CompanySettings` singleton row, editable in Settings UI.

| Template field | Placeholders | When sent |
|---|---|---|
| `EmailJobCardMessage` | `{CustomerName}` | Job card opened — vehicle received |
| `EmailDeliveryNoteMessage` | `{CustomerName}`, `{VehicleModel}` | After vehicle released to customer |

**Builder:** `file static class` inside `ConvertToDeliveryNoteCommand.cs` and `CreateJobCardCommand.cs`.
Uses nested `<table>` layout with `bgcolor` attributes for full Outlook + Gmail compatibility.

---

## Frontend — API Layer

All API calls are in `frontend/src/lib/api.ts` via Axios instance pointing to `NEXT_PUBLIC_API_URL`.

| API object | Covers |
|---|---|
| `vehiclesApi` | list, get360, create, update, delete, bulkUpdate |
| `customersApi` | list, get360, create, update, delete, deleteAll |
| `jobCardsApi` | list, get, create, update, convert (→ delivery note), updateSequence |
| `serviceRecordsApi` | list, create, update, delete |
| `brandsApi` | list (with nested models) |
| `techniciansApi` | list, create, update, delete |
| `adminApi` | getUsers, manageUser, getPermissionGroups, managePGroup |
| `settingsApi` | get, update (CompanySettings) |
| `salesApi` | list |
| `retentionApi` | analytics, cohort, cohortVehicles |
| `activityApi` | list (AuditLogs) |
| `importApi` | upload (CSV/Excel) |

---

## Configuration

### Backend — `appsettings.json` (development defaults)

```
backend/src/RwandaMotor.API/appsettings.json
```

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=rwandamotordms;Username=postgres;Password=<LOCAL_PG_PASSWORD>"
  },
  "Jwt": {
    "Key":         "<min 32 char secret>",
    "Issuer":      "https://api.rwandamotor.com",
    "Audience":    "https://app.rwandamotor.com",
    "ExpiryHours": "8"
  },
  "Email": {
    "Host":            "<smtp-server>",
    "Port":            587,
    "Username":        "<smtp-login>",
    "Password":        "<smtp-password>",
    "EnableSsl":       true,
    "FromAddress":     "noreply@rwandamotor.com",
    "FromName":        "RWANDAMOTOR LTD",
    "AlertRecipient":  "admin@rwandamotor.com"
  },
  "AllowedOrigins": ["http://localhost:3000", "https://app.rwandamotor.com"]
}
```

### Backend — Production overrides (`appsettings.Production.json`)

Secrets are injected via **environment variables** on the server (not committed to git):

| Env variable | Maps to |
|---|---|
| `ConnectionStrings__DefaultConnection` | PostgreSQL connection string |
| `Jwt__Key` | JWT signing secret |
| `Email__Host` | SMTP server hostname |
| `Email__Username` | SMTP login |
| `Email__Password` | SMTP password |
| `Email__AlertRecipient` | Where retention alert emails go |

### Frontend — Environment Variable

| Variable | Where set | Value |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Vercel project settings | `https://api.rwandamotor.com/api` |

---

## Infrastructure

### Production Server

| Item | Detail |
|---|---|
| OS | Ubuntu (self-hosted GitHub Actions runner) |
| API path | `/opt/rwandamotor-api` |
| Deploy script | `/usr/local/bin/rwandamotor-deploy` (called by deploy.yml) |
| Database | PostgreSQL — local to the server, user `rwandamotor_api` |
| API port | 8080 (internal) — exposed via Cloudflare Tunnel |
| Tunnel config | `deploy/cloudflare-tunnel-addition.yml` |

### Frontend Hosting

| Item | Detail |
|---|---|
| Platform | Vercel |
| Domain | `https://app.rwandamotor.com` |
| Deploy trigger | Vercel Deploy Hook (called by `deploy.yml` via `secrets.VERCEL_DEPLOY_HOOK`) |
| Build env | `NEXT_PUBLIC_API_URL=https://api.rwandamotor.com/api` |

### GitHub Actions Secrets Required

| Secret | Purpose |
|---|---|
| `VERCEL_DEPLOY_HOOK` | URL to trigger Vercel redeploy on push to main |

### CI Pipeline (ci.yml) — runs on every push to main/develop

1. `.NET 9` — restore → build → test
2. `Node 22` — npm ci → tsc → eslint → next build
3. `Docker` — build API image + frontend image (after backend + frontend pass)

### CD Pipeline (deploy.yml) — runs on push to main only

1. Self-hosted runner: `dotnet publish` → `rwandamotor-deploy` script
2. ubuntu-latest: `curl` → Vercel deploy hook

---

## Database — PostgreSQL

```
Host:     localhost (on server) / 127.0.0.1
Port:     5432
Database: rwandamotordms
User:     rwandamotor_api
```

EF Core migrations run automatically on API startup via `db.Database.MigrateAsync()`.
A startup SQL patch in `Program.cs` also runs `ALTER TABLE … ADD COLUMN IF NOT EXISTS`
as a belt-and-suspenders guarantee for any hand-written migration columns.

**Migration files:** `backend/src/RwandaMotor.Infrastructure/Migrations/`

---

## Security

- JWT Bearer auth on all API endpoints except `POST /api/auth/login`
- Role-based: `Admin` vs `Staff` — admins bypass all permission checks
- Permission groups: named sets of dot-notation keys (e.g. `nav.vehicles`, `vehicles.delete`)
- Soft-delete on Vehicles and Customers (global EF Core query filter `IsDeleted = false`)
- Idle auto-logout after **10 minutes** of inactivity with 1-minute countdown warning

---

## Next Goal — Appointments & Reminders

**Feature:** Allow staff to book a service appointment for a customer/vehicle.
Send an automated reminder email before the appointment date.

### Planned scope

| Area | Work |
|---|---|
| Domain | New `Appointment` entity (vehicle, customer, date/time, type, status, notes) |
| Backend | `CreateAppointmentCommand`, `GetAppointmentsQuery`, `UpdateAppointmentCommand`, `CancelAppointmentCommand` |
| Background job | `AppointmentReminderJob` — runs daily, sends reminder emails 1 day and 3 days before |
| Email | Outlook-compatible reminder email template (same pattern as delivery note) |
| Frontend | `/appointments` page — calendar or list view; create/edit/cancel dialog |
| Settings | Admin-configurable reminder lead times and message template |
| Sidebar | Add "Appointments" nav item |

### Suggested `Appointment` entity fields

```
Id (Guid)
VehicleId (Guid FK)
CustomerId (Guid? FK)
AppointmentDate (DateTime)
ServiceType (enum — reuse existing)
Status (Scheduled | Confirmed | Completed | Cancelled | NoShow)
Notes (string?)
ReminderSentAt (DateTime?)   — tracks when reminder was last sent
AssignedTechnicianId (Guid? FK)
CreatedBy / UpdatedBy / CreatedAt / UpdatedAt / IsDeleted
```
