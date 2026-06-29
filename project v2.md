# Rwandamotor DMS — Project Reference

> **Last updated:** 2026-06-29 (session 7)
> **Status:** Production (backend self-hosted + frontend Vercel)

---

## 1. Overview

Custom-built **Dealer Management System (DMS)** for **Rwandamotor Ltd** — a multi-brand automotive dealership in Rwanda. This is *not* Odoo; Odoo runs separately on the same server for ERP/accounting.

**Core modules:**
- Vehicle & Customer 360 profiles
- Job Cards (workshop intake → delivery note)
- Service Records & retention tracking
- Follow-ups (CRM outreach workflow)
- Appointments calendar
- Reports (monthly follow-up PDF/Excel)
- Role-based permission system (RBAC with per-user and group overrides)
- Bulk CSV import (customers, vehicles, service records, job cards)
- Catalogue import (brands + vehicle models via CSV/Excel with preview dialog)
- Activity/audit log
- Sales history (auto-created on PDI job card close)

---

## 2. Live URLs

| Service | URL |
|---|---|
| **Frontend (production)** | https://app.rwandamotor.com |
| **Backend API** | https://api.rwandamotor.com |
| **Swagger** | https://api.rwandamotor.com/swagger |
| **GitHub repo** | https://github.com/rwandamotorltd/rwandamotor-dms |
| **Vercel dashboard** | https://vercel.com/rwandamotorltd-2493s-projects/rwandamotor-dms-g8xq |
| **Vercel preview** | rwandamotor-dms-g8xq-git-preview-rwandamotorltd-2493s-projects.vercel.app |

---

## 3. Credentials & Secrets

### Server SSH
```
Host:     100.66.112.125   (Tailscale IP — odoo-server)
User:     rwandamotor
Password: Mukwagatandatu@2026
```

### Production Database
```
Engine:   PostgreSQL 16
Database: rwandamotordms
User:     rwandamotor_api
Password: RwandaApi@2026#
Host:     localhost:5432
Env file: /etc/rwandamotor/api.env
```

### Admin Account
```
Email:    admin@rwandamotor.com
```

### JWT (from /etc/rwandamotor/api.env)
```
JWT_SECRET:  (stored in api.env, not in git)
Issuer:      https://api.rwandamotor.com
Audience:    https://app.rwandamotor.com
Expiry:      8 hours
```

### Vercel (GitHub Actions secrets)
```
VERCEL_TOKEN:       (in GitHub repo secrets)
VERCEL_ORG_ID:      team_PN1B26MCXvspPgQKoJvliMVm
VERCEL_PROJECT_ID:  prj_k98hN2kHZGnTU6lTDWE0m5ofsvjA
VERCEL_DEPLOY_HOOK: (in GitHub repo secrets — triggers production deploy)
```

### Email (SMTP — not yet fully configured)
```
From:            noreply@rwandamotor.com
AlertRecipient:  admin@rwandamotor.com
Config:          EMAIL_HOST / EMAIL_USERNAME / EMAIL_PASSWORD env vars in api.env
```

---

## 4. Infrastructure

### Server (`odoo-server`)
- **OS:** Ubuntu (self-hosted runner)
- **API runtime:** .NET 9, deployed to `/opt/rwandamotor-api/`
- **Systemd service:** `rwandamotor-api` (managed via `rwandamotor-deploy`)
- **Deploy script:** `/usr/local/bin/rwandamotor-deploy` (copies `/tmp/rwandamotor-publish` → `/opt/rwandamotor-api`, restarts service)
- **Env file:** `/etc/rwandamotor/api.env` (holds DB password, JWT secret, email creds)
- **Reverse proxy:** Nginx + Cloudflare Tunnel on port 5000 → https://api.rwandamotor.com
- **Database:** PostgreSQL 16, local socket, auto-migrated on startup

### Frontend
- **Host:** Vercel
- **Framework:** Next.js 16 (App Router) with Turbopack
- **Build:** triggered by `main` branch push via Vercel Deploy Hook in GitHub Actions
- **Env var:** `NEXT_PUBLIC_API_URL=https://api.rwandamotor.com/api` (set in Vercel project settings)

---

## 5. Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Runtime | .NET 9 / C# |
| Architecture | Clean Architecture (Domain / Application / Infrastructure / API) |
| ORM | EF Core 9 + Npgsql 8 |
| Database | PostgreSQL 16 |
| Auth | ASP.NET Core Identity + JWT Bearer |
| CQRS | MediatR + FluentValidation pipeline |
| Background jobs | Quartz.NET (nightly RetentionEvaluationJob at 02:00 UTC) |
| Email | SmtpClient via `IEmailService` / `SmtpEmailService` |
| Reports | QuestPDF (PDF) + ClosedXML (Excel) |
| Logging | Serilog → Console + rolling file (`logs/rwandamotor-*.log`) |
| Serialisation | `System.Text.Json` with `JsonStringEnumConverter` (enums as strings) |

### Frontend
| Layer | Technology |
|---|---|
| Runtime | Node.js 22 |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| UI | shadcn/ui + Tailwind CSS |
| Data fetching | TanStack Query v5 |
| Tables | TanStack Table v8 |
| Charts | Recharts |
| Animation | Framer Motion |
| Toasts | Sonner |
| Date utils | date-fns |
| HTTP client | Axios (with JWT interceptor + 401 auto-redirect) |

---

## 6. Repository Structure

```
rwandamotor-dms/
├── backend/
│   └── src/
│       ├── RwandaMotor.Domain/         # Entities, Enums, Events, Common
│       ├── RwandaMotor.Application/    # CQRS Commands/Queries, Interfaces, Permissions
│       ├── RwandaMotor.Infrastructure/ # EF Core, Migrations, Services, Jobs, Reports
│       └── RwandaMotor.API/            # Controllers, Middleware, Program.cs
│
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── (auth)/login/           # Public login page
│       │   └── (dashboard)/            # Protected layout + all pages
│       │       ├── layout.tsx          # Shell: Sidebar + Header
│       │       ├── dashboard/          # Executive dashboard KPIs
│       │       ├── vehicles/           # Vehicle list + [id] 360 view
│       │       ├── customers/          # Customer list + [id] 360 view
│       │       ├── job-cards/          # Job cards list + [id] detail/print
│       │       ├── service-records/    # Service records list
│       │       ├── follow-ups/         # Follow-up list + [id] detail
│       │       ├── appointments/       # Appointments calendar (week view)
│       │       ├── reports/            # Reports hub + follow-ups/
│       │       ├── retention/          # Retention analytics + cohort
│       │       ├── import/             # Bulk CSV import with progress
│       │       ├── sales/              # PDI sales history
│       │       ├── activity/           # Audit log
│       │       ├── settings/           # Company settings + catalogue (with import preview dialog)
│       │       └── admin/              # Users + Technicians (Admin only)
│       ├── components/
│       │   ├── layout/header.tsx       # Global search + user menu (SearchDropdown at module level)
│       │   ├── layout/sidebar.tsx      # Collapsible sidebar, permission-filtered
│       │   ├── providers/              # QueryProvider, ThemeProvider
│       │   ├── shared/                 # KpiCard, RetentionBadge
│       │   └── ui/                     # shadcn/ui components
│       ├── contexts/auth-context.tsx   # Auth state + hasPermission()
│       ├── hooks/use-service-types.ts  # useServiceTypes() hook — dynamic service type list
│       ├── lib/api.ts                  # All Axios API calls + DTOs
│       └── types/index.ts              # TypeScript types mirroring backend DTOs
│
└── .github/workflows/
    ├── ci.yml                          # Build + lint + typecheck on push/PR
    └── deploy.yml                      # Deploy API (self-hosted) + Frontend (Vercel)
```

---

## 7. Backend — Domain Entities

### BaseEntity (all entities inherit)
```csharp
Guid     Id           // auto-generated
bool     IsDeleted    // soft delete (global query filter)
DateTime? DeletedAt
string?  DeletedBy
DateTime  CreatedAt
string?  CreatedBy
DateTime? UpdatedAt
string?  UpdatedBy
```

### Core Entities

| Entity | Key Fields |
|---|---|
| `Vehicle` | VIN, PlateNumber, BrandId, ModelId, Year, CustomerId, IsSoldByDealership, CurrentMileage, LastServiceDate, NextServiceDate, NextServiceMileage, LastServiceMileage, RetentionStatus, WarrantyStartDate, WarrantyEndDate, WarrantyKmLimit, ServicePolicyId, Color, FuelType, EngineNumber, Transmission, EngineCapacityCC, SaleDate, SalePrice |
| `Customer` | FullName, Phone, Email, Category, CompanyName, TaxId, City, Country, Address, PreferredContactMethod, IsActive |
| `JobCard` | JobCardNumber (`OR-YYYY-NNNNN`), VehicleId, CustomerId, ServiceType, FuelLevel, Mileage, Status (Open/Closed), AccessoriesPresent (jsonb), Notes, AdditionalInfo, TechnicianId, ReceivedByUserId, ClosedAt, ClosedByUserId, DeliveryNoteNumber, DeliveryNoteGeneratedAt |
| `JobCardSequence` | Year (unique), CurrentSequence, StartingSequence |
| `ServiceRecord` | VehicleId, TechnicianId, ServiceDate, MileageAtService, ServiceType, InvoiceNumber, LaborCost, PartsCost, TotalCost, NextServiceMileage, NextServiceDate, IsWarrantyJob, IsRecallJob, Notes, ServiceDescription |
| `ServicePart` | ServiceRecordId, PartNumber, PartName, Quantity, UnitPrice, TotalPrice |
| `FollowUp` | VehicleId, CustomerId, AssignedToUserId, Status, Priority, ContactMethod, Reason, DueDate, ContactedAt, ResolvedAt, RecoveryAchieved, Notes |
| `FollowUpInteraction` | FollowUpId, Outcome, Notes, NextContactDate, EmailType |
| `Appointment` | VehicleId, CustomerId, FollowUpId, TechnicianId, AppointmentDate, DurationMinutes, ServiceType, Status, Notes, ConfirmedAt, CompletedJobCardId |
| `Notification` | Title, Message, Type, IsRead, Link, TargetUserId (null = broadcast), VehicleId, CustomerId, FollowUpId, AppointmentId |
| `SalesHistory` | VehicleId, CustomerId, JobCardId, SaleDate, SaleType ("PDI"), VIN, PlateNumber snapshot, BrandName, ModelName, Year, DeliveryNoteNumber |
| `Brand` | Name, Code, LogoUrl, Country, IsActive |
| `VehicleModel` | BrandId, Name, Code, Segment, IsActive |
| `ServicePolicy` | BrandId (nullable), ModelId (nullable), Name, IntervalKm, IntervalMonths, DueSoonLeadDays, DueSoonLeadKm, LostThresholdMonths, IsDefault, IsActive |
| `Technician` | FullName, Phone, Email, Specialisation, IsActive |
| `PermissionGroup` | Name, Description, Permissions (jsonb string[]) |
| `CompanySettings` | **Singleton** PK=`00000000-0000-0000-0000-000000000001`, CompanyName, Address, Phone, Email, TinNumber, Website, JobCardShowHeader, JobCardShowFooter, DeliveryNoteShowHeader, DeliveryNoteShowFooter, FooterDisclaimer, EmailJobCardMessage, EmailDeliveryNoteMessage, **ServiceTypesConfig** (text/JSON — service type label + active config), **PwaOrientation** (`"portrait"` \| `"landscape"` \| `"any"`, default `"portrait"`) |
| `AuditLog` | UserId, UserEmail, UserName, Action, EntityType, EntityId, EntityLabel, OccurredAt — **immutable, never soft-deleted** |
| `ImportLog` | FileName, ImportType, Status, TotalRows, ValidRows, ImportedRows, ErrorRows, DuplicateRows, ErrorDetailsJson, StartedAt, CompletedAt, IsRolledBack |
| `ApplicationUser` | FullName, Role, PermissionGroupId, CustomPermissions (jsonb), IsActive, LastLoginAt, RefreshToken, RefreshTokenExpiry (extends IdentityUser) |

### Enums (serialized as strings in API)
```csharp
RetentionStatus:  Active, DueSoon, Overdue, Lost, Recovered, External
JobCardStatus:    Open, Closed
FuelLevel:        Empty, Quarter, Half, ThreeQuarter, Full
ServiceType:      RoutineMaintenance, OilChange, MajorService, TyreRotation, BrakeService,
                  TransmissionService, AirConditioningService, ElectricalDiagnostics,
                  BodyRepair, WarrantyRepair, RecallRepair, PDI, EmergencyRepair, Inspection, Other
CustomerCategory: Retail, Corporate, Government, NGO, Fleet, VIP, External
ContactMethod:    Phone, SMS, Email, WhatsApp, InPerson
FollowUpStatus:   Pending, Contacted, AppointmentBooked, Recovered, Unreachable, Declined, Closed
FollowUpPriority: Low, Medium, High, Critical
AppointmentStatus:Scheduled, Confirmed, Completed, Cancelled, NoShow
NotificationType: WelcomeCall, ServiceDueSoon, ServiceDue15Days, CustomerLost,
                  FollowUpDue, AppointmentReminder, AppointmentConfirmed
ImportType:       Vehicles, Customers, ServiceRecords, JobCards
ImportStatus:     Pending, Validating, Valid, Invalid, Importing, Completed, CompletedWithErrors, RolledBack, Failed
InteractionOutcome: Reached, NoAnswer, LeftMessage, CallbackScheduled,
                    ServiceReminderEmailSent, SatisfactionEmailSent, AppointmentBooked
```

---

## 8. Backend — API Controllers

| Controller | Route Prefix | Auth Policy |
|---|---|---|
| `AuthController` | `POST /api/auth/login` | Anonymous |
| `DashboardController` | `GET /api/dashboard/kpis` | `[Authorize]` |
| `VehiclesController` | `/api/vehicles` | `[Authorize]` |
| `CustomersController` | `/api/customers` | `[Authorize]` |
| `ServiceRecordsController` | `/api/servicerecords` | `[Authorize]` |
| `JobCardsController` | `/api/jobcards` | `[Authorize]` |
| `FollowUpsController` | `/api/follow-ups` | `[Authorize]` |
| `AppointmentsController` | `/api/appointments` | `[Authorize]` |
| `NotificationsController` | `/api/notifications` | `[Authorize]` |
| `ReportsController` | `/api/reports` | `[Authorize]` |
| `RetentionController` | `/api/retention` | `[Authorize]` |
| `SalesController` | `/api/sales` | `[Authorize]` |
| `ActivityController` | `/api/activity` | `[Authorize]` |
| `ImportController` | `/api/import` | `[Authorize]` |
| `CompanySettingsController` | `/api/company-settings` | `[Authorize]` |
| `TechniciansController` | `/api/technicians` | `[Authorize]` |
| `ServicePoliciesController` | `/api/servicepolicies` | `[Authorize]` |
| `AdminController` | `/api/admin` | `Admin` policy |
| `PermissionGroupsController` | `/api/admin/permission-groups` | `Admin` policy |
| `PwaController` | `/api/pwa` | Anonymous (no auth) — serves manifest orientation to Next.js |

### Authorization Policies
```csharp
"Admin"             → role == Admin
"TechnicalDirector" → role in {Admin, TechnicalDirector}
"CRMOfficer"        → role in {Admin, TechnicalDirector, CRMOfficer}
"CRE"               → role in {Admin, CRE}
```

> **IMPORTANT:** Class-level `[Authorize(Policy="Admin")]` + method-level `[Authorize]` = AND. Use separate controllers if you need mixed policy on the same resource.

### Key API Endpoints by Controller

**JobCardsController**
```
GET    /api/jobcards                       List (paged, filters: status, serviceType, search, date)
GET    /api/jobcards/{id}                  Detail
POST   /api/jobcards                       Create (generates OR-YYYY-NNNNN number)
PUT    /api/jobcards/{id}                  Update
POST   /api/jobcards/{id}/convert          Convert to delivery note (closes + creates service record)
GET    /api/jobcards/{id}/print            Print-ready HTML
POST   /api/jobcards/{id}/share            Email delivery note to customer
```

**FollowUpsController**
```
GET    /api/follow-ups                     List (paged, filters: status, priority, assignedTo)
GET    /api/follow-ups/{id}               Detail with interaction history
POST   /api/follow-ups/generate            Trigger auto-generation for overdue/dueSoon/lost
POST   /api/follow-ups/{id}/interactions   Log interaction (outcome, notes, nextContactDate)
PUT    /api/follow-ups/{id}/close          Close follow-up
POST   /api/follow-ups/{id}/send-email     Send service reminder / satisfaction email
```

**AppointmentsController**
```
GET    /api/appointments                   List (paged, filters: status, technicianId, week)
POST   /api/appointments                   Book appointment
PUT    /api/appointments/{id}              Update status/details
```

**RetentionController**
```
GET    /api/retention/summary              Summary KPIs (period: monthly/quarterly/yearly)
GET    /api/retention/trend                Month-by-month trend (last N months)
GET    /api/retention/by-brand             Rate per brand
GET    /api/retention/cohorts              Cohort retention @ 3m/6m/12m/24m
GET    /api/retention/visit-frequency      Year-wise & model-wise visit frequency
GET    /api/retention/cohort-vehicles      Vehicles in a specific cohort slot
```

**ReportsController**
```
GET    /api/reports/follow-ups/monthly     Monthly follow-up report (PDF/Excel)
```

---

## 9. Backend — Key Patterns

### ApiResponse<T> Wrapper — MANDATORY
Every controller action must return:
```csharp
return Ok(ApiResponse<T>.Ok(result));
// NOT:
return Ok(result);   // ← breaks frontend (expects .data.data wrapper)
```
```csharp
public record ApiResponse<T>(bool Success, T? Data, string? Message, IEnumerable<string>? Errors = null)
{
    public static ApiResponse<T> Ok(T data, string? message = null) => new(true, data, message);
    public static ApiResponse<T> Fail(string message, IEnumerable<string>? errors = null) => new(false, default, message, errors);
}
```

### Soft Delete + Global Filters
All domain entities have `IsDeleted` + global query filters in `OnModelCreating`:
```csharp
builder.HasQueryFilter(e => !e.IsDeleted);
```
Never hard-delete — set `IsDeleted = true` with timestamp + actor.

**CRITICAL:** EF Core applies `HasQueryFilter` silently to ALL DbSet queries. To bypass it (e.g., checking for codes across deleted rows during import), use:
```csharp
var dbCtx = _db as DbContext;
dbCtx.Set<Brand>().IgnoreQueryFilters().Select(b => b.Code).ToListAsync(ct);
```

### Partial Unique Indexes (Soft-Delete Safe)
Standard `CreateIndex(unique: true)` on a soft-delete entity causes 23505 errors on re-import (deleted rows still hold their key slots). Fix: use raw SQL partial index via migration:
```csharp
migrationBuilder.Sql(
    @"CREATE UNIQUE INDEX ""IX_Brands_Code"" ON ""Brands""(""Code"") WHERE ""IsDeleted"" = false;");
```
Applied to `IX_Brands_Code` and `IX_VehicleModels_BrandId_Code` in migration `20260625000001_PartialUniqueIndexSoftDelete`.

### Audit Log (auto)
`SaveChangesAsync` in `ApplicationDbContext` auto-creates `AuditLog` entries for all Create/Update/Delete on `BaseEntity` descendants.

### CQRS Pattern
Every feature = one or more of:
```
XxxCommand (IRequest<T>)        + XxxCommandHandler
XxxQuery   (IRequest<T>)        + XxxQueryHandler
XxxCommandValidator             (FluentValidation)
```
All under `RwandaMotor.Application/Features/{Module}/Commands|Queries/`.

### Job Card Numbering
```
Format: OR-YYYY-NNNNN   e.g. OR2600001
Table:  JobCardSequence (one row per year, auto-incremented in CreateJobCardCommand)
```

### CompanySettings Singleton
```csharp
Id = new Guid("00000000-0000-0000-0000-000000000001")
builder.HasKey(e => e.Id).ValueGeneratedNever(); // EF never auto-generates PK
```

### Npgsql Workaround — Must Be First
```csharp
// First line in Program.cs before anything else
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);
```

### Enum Serialisation
```csharp
opts.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
```
All enums are sent/received as strings (`"Active"` not `1`). Frontend types mirror exactly.

### List<T> jsonb Columns
```csharp
dataSourceBuilder.EnableDynamicJson(); // required in DependencyInjection.cs
```
Used for `JobCard.AccessoriesPresent`, `PermissionGroup.Permissions`, `ApplicationUser.CustomPermissions`.

### CORS Policy ("DmsPolicy")
- Explicit origins from `appsettings.json` (`AllowedOrigins`)
- All `*.vercel.app` origins automatically allowed (preview deployments)
- `AllowCredentials = true`

### Validation Pipeline
- FluentValidation validator per Command/Query
- MediatR pipeline: `ValidationBehaviour<TRequest, TResponse>`
- ValidationException → 400 with error list
- `ExceptionHandlingMiddleware`: `UnauthorizedAccessException` → 401, `KeyNotFoundException` → 404, generic → 500

### Pagination
```csharp
public record PaginatedResult<T>(
    IReadOnlyList<T> Items, int TotalCount, int PageNumber, int PageSize,
    int TotalPages, bool HasNextPage, bool HasPreviousPage);
```
Query params: `?pageNumber=1&pageSize=25`

---

## 10. Backend — Business Logic

### A. Retention Engine
**File:** `RwandaMotor.Infrastructure/Services/RetentionEngine.cs`

Vehicle classification (evaluated nightly or on-demand):
```
Active     → within the "DueSoon" threshold
DueSoon    → within DueSoonLeadDays of next service date, OR DueSoonLeadKm of next mileage
Overdue    → past next service date or next service mileage
Lost       → LostThresholdMonths (default 12) since last service with no visit
Recovered  → was Lost, returned for service → status changes to Recovered (then → Active on next cycle)
External   → IsSoldByDealership == false (never tracked)
```
**CRITICAL:** Always key follow-up logic off `Vehicle.RetentionStatus`, NOT raw date arithmetic. The nightly job is the single source of truth.

Key methods:
- `EvaluateVehicleStatusAsync(vehicleId)` — single re-evaluation
- `EvaluateAllVehiclesAsync()` — batch all dealership vehicles
- `GetRetentionSummaryAsync(period, asOf?)` — rate + counts
- `GetRetentionTrendAsync(months)` — monthly rolling trend
- `GetRetentionByBrandAsync(from, to)` — per-brand rate
- `GetCohortRetentionAsync(cohortYear)` — quarterly cohorts @ 3m/6m/12m/24m

### B. Service Interval Engine
**File:** `RwandaMotor.Infrastructure/Services/ServiceIntervalEngine.cs`

Policy resolution order (first match wins):
1. `Vehicle.ServicePolicyId` — vehicle-level override
2. Model-level policy: `ServicePolicy.ModelId == vehicle.ModelId`
3. Brand-level policy: `ServicePolicy.BrandId == vehicle.BrandId && ModelId == null`
4. System default: `ServicePolicy.IsDefault == true`
5. Hardcoded fallback: 5,000 km / 6 months

### C. Follow-Up Auto-Generation
**File:** `RwandaMotor.Application/Features/FollowUps/Commands/GenerateFollowUpsCommand.cs`

Runs nightly (Quartz) and on-demand via `POST /api/follow-ups/generate`:
1. **Overdue vehicles** → Reason="ServiceDueReminder", Priority=High, Notification(ServiceDueSoon)
2. **DueSoon vehicles** → Reason="ServiceDue15Days", Priority=Medium, Notification(ServiceDue15Days)
3. **Lost vehicles** → Reason="LostRecovery", Priority=Critical

Deduplication: skips if an existing Pending/InProgress follow-up with the same Reason exists for the vehicle.

### D. Job Card → Delivery Note Conversion
**File:** `RwandaMotor.Application/Features/JobCards/Commands/ConvertToDeliveryNoteCommand.cs`

Steps on `POST /api/jobcards/{id}/convert`:
1. Close job card: `Status=Closed`, `ClosedAt=now`, `DeliveryNoteNumber="DN"+JobCardNumber[2:]`
2. Auto-create ServiceRecord with next-service date/mileage from `ServiceIntervalEngine`
3. Update Vehicle: `LastServiceDate`, `LastServiceMileage`, `CurrentMileage`, `NextServiceDate`, `NextServiceMileage`
4. Trigger `RetentionEngine.EvaluateVehicleStatusAsync()` to refresh status
5. **If ServiceType == PDI:**
   - Create `SalesHistory` (SaleType="PDI")
   - Auto-generate FollowUp (Reason="WelcomeCall", Priority=High, DueDate=today)
   - Create Notification (NotificationType=WelcomeCall)

### E. Job Card Numbering
```
Format: OR + YY + 5-digit  →  e.g. OR2600001 (year 2026, sequence #1)
JobCardSequence table: one row per year, CurrentSequence auto-incremented atomically
```

### F. KPI Consistency Rule
**File:** `RwandaMotor.Application/Features/Dashboard/Queries/GetDashboardKpisQuery.cs`

Dashboard KPI counts for child records (FollowUps, ServiceRecords) must always join through their parent Vehicle's `IsDeleted` state:
```csharp
// WRONG — counts orphaned records left behind by soft-deleted vehicles:
.CountAsync(f => !f.IsDeleted && f.Status == FollowUpStatus.Pending)

// CORRECT — consistent with what list pages show:
.CountAsync(f => !f.IsDeleted && f.Status == FollowUpStatus.Pending && !f.Vehicle.IsDeleted)
```
Applied to `activeFollowUps` and `monthlyServices` counts.

---

## 11. Background Jobs (Quartz.NET)

### RetentionEvaluationJob — nightly 02:00 UTC
1. `RetentionEngine.EvaluateAllVehiclesAsync()` — recomputes status on all dealership vehicles
2. Creates `ServiceDueReminder` follow-ups for Overdue vehicles
3. Creates `ServiceDue15Days` follow-ups for DueSoon vehicles
4. Creates `LostRecovery` follow-ups for Lost vehicles
5. Sends admin alert email listing newly-due vehicles

### BackfillJobCardServiceRecordsService — startup (one-time)
Ensures closed job cards created before the auto-create-service-record feature have `ServiceRecord` rows.

### GenerateFollowUpsCommand — on-demand
`POST /api/follow-ups/generate` — same logic as nightly job, useful for demo/manual trigger.

---

## 12. Permission System

### Architecture (3-tier)
```
CustomPermissions (per-user jsonb)        ← highest priority
  └── PermissionGroupId → PermissionGroup.Permissions (jsonb)
        └── DefaultPermissions.ForRole(role)  ← fallback
```

Login response includes resolved `permissions[]` array. Frontend `hasPermission(key)` checks this array. **Admin role always returns true** regardless of array.

### All Permission Keys
```
Navigation (13):
  nav.dashboard, nav.vehicles, nav.customers, nav.serviceRecords, nav.jobCards,
  nav.retention, nav.followUps, nav.appointments, nav.reports, nav.import,
  nav.settings, nav.activity, nav.sales

Job Cards (6):
  jobCards.create, jobCards.edit, jobCards.delete, jobCards.convert,
  jobCards.print, jobCards.share

Vehicles (3):       vehicles.create, vehicles.edit, vehicles.delete
Customers (3):      customers.create, customers.edit, customers.delete
Service Records (3): serviceRecords.create, serviceRecords.edit, serviceRecords.delete

Retention:     retention.manage
Follow-ups:    followUps.view, followUps.manage
Appointments:  appointments.view, appointments.manage
Settings:      settings.users, settings.company, settings.groups
Dashboard:     dashboard.kpi, dashboard.retention, dashboard.jobCardsWidget
```

### Role Defaults (`DefaultPermissions.ForRole`)
| Role | Key Permissions |
|---|---|
| **Admin** | All 30+ keys |
| **CRMOfficer** | Full nav except admin settings; full CRUD on vehicles/customers/jobs/records/follow-ups/appointments; all dashboard widgets |
| **TechnicalDirector** | Dashboard, vehicles, customers, serviceRecords, jobCards, retention, appointments, reports; appointments.view/manage; all dashboard widgets |
| **CRE** | dashboard.kpi, nav.customers, nav.vehicles, nav.followUps, nav.appointments, followUps.view/manage, appointments.view/manage |
| **Default** | nav.dashboard only |

### Permission Groups (Settings > Groups tab)
Named sets of permission keys; assigned to users via `ApplicationUser.PermissionGroupId`. Override role defaults. Per-user `CustomPermissions` overrides groups.

**Modules shown in the permission matrix (13 total):**
Dashboard, Vehicles, Customers, Service Records, Job Cards, Retention, Follow-ups, Appointments, Reports, Import Center, Settings, Sales Records, Activity Log

---

## 13. Database Migrations

Migrations run **automatically on startup** via `db.Database.MigrateAsync()`.

| Migration | Date | Content |
|---|---|---|
| `InitialCreate` | 2026-06-11 | Customers, Vehicles, Brands, VehicleModels, ServiceRecords, ServiceParts, ServicePolicies, Technicians, WorkshopBays, FollowUps, ImportLogs, ASP.NET Identity tables |
| `AddJobCards` | 2026-06-15 | JobCardSequences, JobCards |
| `AddJobCards` (duplicate) | 2026-06-15 | Ensures JobCards table structure |
| `AddPermissionGroups` | 2026-06-15 | PermissionGroups table |
| `AddCompanySettings` | 2026-06-15 | CompanySettings singleton |
| `EnsureCompanySettingsTable` | 2026-06-16 | Belt-and-suspenders schema patch |
| `AddUserCustomPermissions` | 2026-06-16 | ApplicationUser.CustomPermissions (jsonb) |
| `AllowExternalVehicleImport` | 2026-06-16 | Vehicle.IsSoldByDealership, ImportLog/ImportLogRows tables |
| `AddAuditLog` | 2026-06-16 | AuditLog table (immutable) |
| `AddEmailTemplates` | 2026-06-17 | CompanySettings.EmailJobCardMessage, EmailDeliveryNoteMessage |
| `AddEmailTemplatesEnsure` | 2026-06-17 | Idempotent patch for email columns |
| `AddFollowUpInteractionAppointmentNotification` | 2026-06-18 | FollowUpInteraction, Appointment, Notification, SalesHistory tables |
| `AddServiceTypesConfig` | 2026-06-24 | CompanySettings.ServiceTypesConfig (text JSON column) |
| `PartialUniqueIndexSoftDelete` | 2026-06-25 | Converts `IX_Brands_Code` and `IX_VehicleModels_BrandId_Code` to partial indexes (`WHERE IsDeleted = false`) — fixes 23505 on re-import after brand deletion |
| `WideVinColumn` | 2026-06-26 | Removes VIN length restriction — accepts any length |
| `PartialUniqueVin` | 2026-06-26 | Partial unique index on `IX_Vehicles_VIN WHERE IsDeleted = false` |
| `AddPwaOrientation` | 2026-06-29 | `CompanySettings.PwaOrientation` — controls PWA manifest orientation, default `"portrait"` (column kept, feature reverted to follow-device) |

> Startup also runs an idempotent SQL patch (in `Program.cs`) that adds any missing columns to `CompanySettings` (`EmailJobCardMessage`, `EmailDeliveryNoteMessage`, `ServiceTypesConfig`). Safe to run repeatedly — uses `IF NOT EXISTS`.

---

## 14. Frontend — Pages

| Route | Page File | Purpose |
|---|---|---|
| `/dashboard` | `dashboard/page.tsx` | KPI cards (active/due/overdue/lost vehicles, retention rates, job cards, sales); retention trend chart; brand retention grid |
| `/vehicles` | `vehicles/page.tsx` | Paginated vehicle list; filters: retention status, brand, warranty, search |
| `/vehicles/[id]` | `vehicles/[id]/page.tsx` | Vehicle 360: service timeline, follow-up history, job cards, technician history, next service. **Edit Vehicle** (Brand/Model/Year + all specs). **Transfer Ownership** (customer search dialog, supports remove) |
| `/customers` | `customers/page.tsx` | Customer directory; filter by category, search |
| `/customers/[id]` | `customers/[id]/page.tsx` | Customer 360: all vehicles, service history, job cards, follow-ups |
| `/service-records` | `service-records/page.tsx` | Service record list; filter by date, vehicle, technician, service type |
| `/job-cards` | `job-cards/page.tsx` | Job card inbox; filter by status, service type, date; create new job card |
| `/job-cards/[id]` | `job-cards/[id]/page.tsx` | Job card detail; edit; convert to delivery note; print/share |
| `/retention` | `retention/page.tsx` | Retention dashboard: summary KPIs, trend chart, by-brand table, cohort analysis (Q1-Q4 2025 @ 3m/6m/12m/24m), visit frequency |
| `/follow-ups` | `follow-ups/page.tsx` | Follow-up task list; filter by status, priority, assigned user; log interaction |
| `/follow-ups/[id]` | `follow-ups/[id]/page.tsx` | Follow-up detail; full interaction history; book appointment; send email |
| `/appointments` | `appointments/page.tsx` | Weekly calendar view; book appointment; filter by technician |
| `/reports` | `reports/page.tsx` | Reports index; links to sub-reports |
| `/reports/follow-ups` | `reports/follow-ups/page.tsx` | Monthly follow-up metrics; download PDF/Excel |
| `/import` | `import/page.tsx` | CSV upload; choose type; progress tracker; error row download |
| `/sales` | `sales/page.tsx` | PDI sales history; VIN, customer, delivery note, date |
| `/activity` | `activity/page.tsx` | Audit log; filter by action, entity, user, date |
| `/settings` | `settings/page.tsx` | Company info; print header/footer toggles; email templates; brand/model catalogue with **import preview dialog** |
| `/admin/users` | `admin/users/page.tsx` | User management: create/edit/toggle; assign roles, permission groups, custom permissions |
| `/admin/technicians` | `admin/technicians/page.tsx` | Technician CRUD |

---

## 15. Frontend — Key Patterns

### API Response Unwrapping
```typescript
// The outer .data = Axios response body; the inner .data = ApiResponse<T>.data
api.get<ApiResponse<T>>('/endpoint').then(r => r.data.data!)

// For paginated:
api.get<ApiResponse<PaginatedResult<T>>>('/endpoint').then(r => r.data.data!)
```

### Auth Context
```typescript
const { user, hasPermission, login, logout } = useAuth();
// user: AuthUser | null  { userId, fullName, email, role, permissions: string[] }
// hasPermission: Admin always true; others check permissions[]
```

### Rules of Hooks + Permission Guards
Permission checks that conditionally return early MUST be placed **after all hooks**:
```typescript
export function SomePage() {
  // ALL hooks first — unconditionally
  const { hasPermission } = useAuth();
  const [state, setState] = useState(...);
  const { data } = useQuery(...);

  // Permission guard AFTER all hooks
  if (!hasPermission("some.key")) return <AccessDenied />;

  return <PageContent />;
}
```

### useSearchParams + Suspense (Next.js 16 requirement)
Any page using `useSearchParams()` must be wrapped in `<Suspense>`:
```typescript
export default function SomePage() {
  return <Suspense><SomePageContent /></Suspense>;
}
function SomePageContent() {
  const searchParams = useSearchParams();   // safe inside Suspense
}
```
Pages using this: `follow-ups/`, `vehicles/`, `job-cards/`, `job-cards/[id]/`.

### TanStack Query — Dashboard KPI Cache Invalidation
The dashboard KPIs use query key `["dashboard-kpis"]`. Any mutation that affects counts (vehicle/customer/service-record/job-card delete) must invalidate it:
```typescript
queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] });
```
The KPI query itself uses `staleTime: 0, refetchOnMount: "always", refetchInterval: 60_000` because the Next.js App Router dashboard layout may persist without a full remount.

### React Compiler Compatibility (ESLint)
The project uses `eslint-plugin-react-compiler`. Key rules:
- **`react-hooks/static-components`** — nested component definitions inside a component function are forbidden. Extract them to module level with explicit props interfaces.
- **`react-hooks/set-state-in-effect`** — `setState` inside `useEffect` without deps or on mount is flagged. For legitimate server-sync patterns, add `// eslint-disable-next-line react-hooks/set-state-in-effect` on the offending line.
- **`react-hooks/preserve-manual-memoization`** — `useCallback` deps must match what the compiler infers. Use `[setFoo, setBar]` not `[]` for stable state setters.
- **`@typescript-eslint/no-unused-expressions`** — ternary-as-statement (`s.has(id) ? s.delete(id) : s.add(id)`) is forbidden. Use `if/else`.

### TypeScript Type Narrowing
```typescript
// WRONG — TS cannot narrow through compound condition:
if (needsData && !kpis) return null;
value={kpis.someField}   // still "possibly undefined"

// RIGHT — guard inline at each usage:
{showKpi && kpis && <div>{kpis.someField}</div>}
```

### Select onValueChange Null Guard
`Select.onValueChange` returns `string | null`. Always provide a fallback:
```typescript
onValueChange={v => setState(v ?? "defaultValue")}
```

### Header — SearchDropdown Pattern
`SearchDropdown` is a **module-level** component (not nested inside `Header`) with explicit props. The search close/navigate path always clears search state:
```typescript
const handleNavigate = (url: string) => {
  router.push(url);
  setSearchText("");
  setSearchOpen(false);
  setMobileSearchOpen(false);
};
```

### Notification Bell Routing (`header.tsx`)
```typescript
if (n.link) router.push(n.link);
else if (n.followUpId) router.push("/follow-ups/" + n.followUpId);
else if (n.appointmentId) router.push("/appointments");
else router.push("/follow-ups");
```

### Sidebar Nav Permission Filtering
Items rendered only when `hasPermission(item.permission)`:
```typescript
{ href: "/vehicles",       label: "Vehicles",       permission: "nav.vehicles" }
{ href: "/customers",      label: "Customers",       permission: "nav.customers" }
{ href: "/service-records",label: "Service Records", permission: "nav.serviceRecords" }
{ href: "/job-cards",      label: "Job Cards",       permission: "nav.jobCards" }
{ href: "/follow-ups",     label: "Follow-Ups",      permission: "nav.followUps" }
{ href: "/appointments",   label: "Appointments",    permission: "nav.appointments" }
{ href: "/retention",      label: "Retention",       permission: "nav.retention" }
{ href: "/reports",        label: "Reports",         permission: "nav.reports" }
{ href: "/import",         label: "Import",          permission: "nav.import" }
{ href: "/sales",          label: "Sales History",   permission: "nav.sales" }
{ href: "/activity",       label: "Activity",        permission: "nav.activity" }
{ href: "/settings",       label: "Settings",        permission: "nav.settings" }
```

### Dynamic Service Types (hooks/use-service-types.ts)
Service type labels and visibility are **admin-managed** via `Settings → Catalogue → Service Types`.
Config stored in `CompanySettings.ServiceTypesConfig` (JSON text).

```typescript
// Returns only active types; falls back to DEFAULT_SERVICE_TYPES if config is null
export function useServiceTypes(): ServiceTypeItem[]
```

**All service-type dropdowns** (job-cards, job-cards/[id], service-records, appointments) use `useServiceTypes()`.
**Table display** of saved records still uses the static `SERVICE_TYPE_LABELS` from `utils.ts` as fallback.

### Catalogue Import Preview Dialog
Settings → Catalogue tab → "Import CSV/Excel" button opens a **two-step flow**:
1. **File pick** → `POST /api/company-settings/catalogue/preview` → returns `CataloguePreviewResult` (newBrands, newModels, existingSkipped, errorRows, rows[])
2. **Preview dialog** — scrollable table with color-coded rows (green = new, red = error, white = skip); summary chips; "Import N items" button disabled when nothing new
3. **Confirm** → `POST /api/company-settings/catalogue/import` (same file)

`CataloguePreviewRow`: `rowNumber`, `brandCode`, `brandName`, `modelCode`, `modelName`, `isNewBrand`, `isNewModel`, `hasError`, `errorMessage`.

---

## 16. Email System

`IEmailService` / `SmtpEmailService` — configured via `SmtpSettings`:
```csharp
Host, Port (587), Username, Password, EnableSsl,
FromAddress: noreply@rwandamotor.com
FromName:    RWANDAMOTOR LTD
AlertRecipient: admin@rwandamotor.com
```

Config precedence: `appsettings.json` → env vars (`EMAIL_HOST`, `EMAIL_USERNAME`, `EMAIL_PASSWORD`, `EMAIL_ALERT_RECIPIENT`, `EMAIL_PORT`).

**Email triggers:**
- Nightly retention job → admin alert email (list of newly-due vehicles)
- `POST /api/jobcards/{id}/share` → job card + custom message to customer
- Delivery note email → on conversion if configured
- `POST /api/follow-ups/{id}/send-email` → service reminder or satisfaction check

**Current status:** Nightly alert wired. Job card/delivery note email exists in API. SMTP must be configured in `api.env` to activate.

---

## 17. CI/CD Workflow

### Branch Strategy
```
main    → backend deploy to odoo-server + Vercel production deploy
preview → Vercel preview deploy only
```

> **Rule:** Always push to `preview` first (`git push origin main:preview`). Review on preview URL, then push to `main`.

### GitHub Actions

**ci.yml** — runs on push/PR to `main`:
1. Backend: `dotnet restore` → `dotnet build` → `dotnet test`
2. Frontend: `npm ci` → `tsc --noEmit` → `eslint` → `next build`

**deploy.yml** — runs on push to `main` or `preview`:

On `main` (both jobs):
- `deploy-api` (self-hosted runner): `dotnet publish` → `sudo rwandamotor-deploy` (copies + restarts systemd)
- `deploy-frontend`: `curl -X POST $VERCEL_DEPLOY_HOOK`

On `preview` only:
- `deploy-preview`: `npx vercel deploy --token=...` → preview URL

### Useful Git Commands
```bash
# Push to preview (safe — no production impact)
git push origin main:preview
# OR
git push origin HEAD:preview

# After approval, push to production
git push origin main

# Revert to specific commit and force-push preview
git reset --hard <commit-sha>
git push origin main:preview --force
```

---

## 18. Known Patterns & Pitfalls

| Situation | Fix |
|---|---|
| Controller returns 200 but frontend shows empty | Wrap result: `Ok(ApiResponse<T>.Ok(result))` |
| `useSearchParams()` runtime crash (Next.js 16) | Wrap page in `<Suspense><Content /></Suspense>` |
| Rules of Hooks violation on permission guard | Move `if (!hasPermission(...)) return` to AFTER all hooks |
| TypeScript `kpis possibly undefined` | Guard inline `{kpis && <div>{kpis.field}</div>}` — don't rely on compound guard |
| `Select.onValueChange` `null` not assignable to `string` | `onValueChange={v => setState(v ?? "defaultValue")}` |
| Follow-ups never generated (demo data) | Use `RetentionStatus` field — demo vehicles have recent service dates |
| Auth policy stacking AND logic | Class + method `[Authorize]` = AND; use separate controllers for mixed access |
| Npgsql UTC crash | `AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true)` — must be first line in Program.cs |
| `List<T>` jsonb columns | `dataSourceBuilder.EnableDynamicJson()` required in DependencyInjection.cs |
| CompanySettings migration failure | Startup idempotent SQL patch auto-adds missing columns |
| Vercel preview CORS | All `*.vercel.app` origins automatically allowed |
| PDI job card close | Creates SalesHistory + WelcomeCall follow-up + Notification automatically |
| **23505 on catalogue re-import after brand deletion** | `IX_Brands_Code` is a partial unique index (`WHERE IsDeleted = false`). When adding a new unique index on a soft-delete entity, always use `migrationBuilder.Sql()` with `WHERE "IsDeleted" = false` — never `CreateIndex(unique: true)` |
| **EF Core global filter silently excludes deleted rows** | All `_db.Brands` etc. are filtered by `!IsDeleted`. To include deleted rows, cast `_db` to `DbContext` and call `.IgnoreQueryFilters()` on the `Set<T>()` |
| **Vehicle edit brand/model showing raw UUID** | Root causes: (1) `GetBrandsQuery` filtered `IsActive` — inactive brands used on vehicles were excluded. Fixed: removed `IsActive` filter. (2) Vehicle edit was using `catalogueApi.getBrands()` (`/admin/catalogue/brands`, Admin-only) — non-Admin users got 401 → empty array. Fixed: back to `brandsApi.list()` (`/vehicles/brands`, any authenticated user). (3) Shadcn Select shows raw value string when no matching SelectItem — added fallback display of `vehicle.brandName`/`modelName`. |
| **UpdateVehicle 403 for custom-role users** | `PUT /api/vehicles/{id}` had `[Authorize(Roles = "Admin,TechnicalDirector")]` — blocked users with custom roles who had `vehicles.edit` permission. Changed to `[Authorize]` (any authenticated user); frontend `canEdit` guard is the access control. |
| **KPI shows stale counts after vehicle deletion** | `CountAsync` on child entities must add `&& !f.Vehicle.IsDeleted`. List pages join through non-deleted vehicles implicitly; KPI queries must replicate that join. |
| **React Compiler: nested component in component** | Extract to module level with explicit props interface. `react-hooks/static-components` fails CI. |
| **React Compiler: ternary-as-statement** | `s.has(id) ? s.delete(id) : s.add(id)` → use `if/else`. |
| **Dashboard KPI not refreshing after delete** | Add `queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] })` to every `onSuccess` that deletes a vehicle, customer, service record, or job card. |

---

## 19. Backlog (as of 2026-06-29)

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | **Email delivery** | Pending | SMTP credentials needed in `api.env`. Job card share + delivery note endpoints already exist. |
| 2 | **Service alerts (SMS/WhatsApp)** | Pending | Customer-facing reminders when service is due soon |
| 3 | **Mobile intake form** | Pending | Offline-capable PWA for workshop staff (job card creation on tablet/phone) |
| 4 | **Parts inventory module** | Pending | Track parts used per job card, maintain stock levels, low-stock alerts |
| 5 | **Reports module content** | Partial | `/reports` page + `nav.reports` permission exist; only monthly follow-up report implemented; retention/service reports TBD |
| 6 | **Follow-ups/Appointments/Reports in Permission Groups matrix** | ✅ Done | All three modules added to the `MODULES` array in `settings/page.tsx` (session 3, 2026-06-21) |
| 7 | **Service Types as admin-managed catalogue** | ✅ Done | `CompanySettings.ServiceTypesConfig` (JSON), admin UI in Settings → Catalogue, `useServiceTypes()` hook drives all dropdowns (session 3, 2026-06-21) |
| 8 | **Catalogue import preview dialog** | ✅ Done | Two-step flow: preview → confirm. Color-coded rows, summary chips, disabled import button when nothing new (session 4, 2026-06-25) |
| 9 | **Bulk delete job cards (Admin)** | ✅ Done | Multi-select checkbox + delete-all button for Admin role; KPI invalidation on success (sessions 3-4) |
| 10 | **Dashboard KPI live refresh on delete** | ✅ Done | All delete/bulk-delete mutations across vehicles, customers, service records, job cards invalidate `["dashboard-kpis"]` (session 4, 2026-06-25) |
| 11 | **23505 catalogue re-import fix** | ✅ Done | Partial unique indexes on Brands + VehicleModels; `IgnoreQueryFilters()` in import handler (session 4, 2026-06-25) |
| 12 | **KPI monthly-services / active-follow-ups orphan fix** | ✅ Done | Both counts now join through `!Vehicle.IsDeleted` to exclude orphaned child records (session 4, 2026-06-25) |
| 13 | **Vehicle import fix** | ✅ Done | Soft-deleted VINs now restored on re-import; batch errors surfaced; plate truncation fixed; UI explains "already in system" (session 5, 2026-06-27) |
| 14 | **Admin data purge** | ✅ Done | `POST /api/admin/purge-data` wipes all operational data; Settings → Data tab with "DELETE ALL DATA" confirmation guard (session 5, 2026-06-27) |
| 15 | **Per-page size selector on all list views** | ✅ Done | Vehicles, Customers, Service Records, Job Cards — "N / page" dropdown (25/50/100/250/500); total record count shown (session 5, 2026-06-27) |
| 16 | **PWA screen orientation** | ✅ Done | Manifest `orientation: "any"` — app follows device auto-rotation. Earlier admin-lock feature reverted per user preference (session 5-6, 2026-06-29) |
| 17 | **Edit vehicle Brand / Model / Year** | ✅ Done | "Edit Vehicle" modal on 360 page now includes Brand selector → cascading Model selector + Year. `UpdateVehicleCommand` extended with `BrandId`, `ModelId`, `Year` (session 6, 2026-06-29) |
| 18 | **Transfer Vehicle Ownership** | ✅ Done | "Transfer Ownership" button on 360 page opens search dialog (≥2 chars → live results). Reassigns `CustomerId`; supports removing owner. Same update endpoint with `CustomerId` / `ClearCustomer` (session 6, 2026-06-29) |
