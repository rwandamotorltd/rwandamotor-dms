# RwandaMotor DMS — Developer Handoff Document

**Phase 1 complete:** Retention & Service Intelligence Platform  
**Status:** Frontend build passes (`npm run build` — 11 routes, zero TS errors). Backend compiles. Docker Compose wires everything together.  
**Next developer picks up:** Phase 2 modules (see Roadmap at bottom).

---

## What Was Built

Enterprise DMS for a multi-brand automotive dealership in Rwanda representing Suzuki, Changan, Renault, Fiat, Tata, and Range Rover. The system also services external vehicles that were not sold by the dealership.

**Core value:** Automatically tracks whether customers return for service after buying a vehicle. When they don't, it flags them as `DueSoon → Overdue → Lost` and surfaces that as retention analytics for management.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Next.js | 15 (App Router) |
| Frontend | TypeScript | 5 |
| Frontend | TailwindCSS + ShadCN UI | v4 — **see critical note below** |
| Frontend | TanStack Table + Query | latest |
| Frontend | Framer Motion | latest |
| Frontend | Recharts | latest |
| Backend | ASP.NET Core | .NET 9, Clean Architecture |
| Backend | CQRS | MediatR 12.4.1 |
| Backend | Validation | FluentValidation 11.11.0 |
| Backend | ORM | EF Core 9 (SQL Server) |
| Backend | Auth | ASP.NET Identity + JWT Bearer |
| Backend | Jobs | Quartz.NET (nightly 2:00 AM UTC) |
| Backend | Logging | Serilog |
| Database | SQL Server | 2022 |
| Infra | Docker Compose | SQL Server + API + Frontend |
| CI/CD | GitHub Actions | `.github/workflows/ci.yml` |

---

## ⚠️ Critical: ShadCN v4 Breaking Changes

This project uses **ShadCN UI v4** which is built on `@base-ui/react`, **not Radix UI**. The API is fundamentally different from all training data and most online examples.

**Do NOT use these Radix patterns — they will cause TypeScript errors:**

```tsx
// WRONG — v3/Radix patterns that do not exist in v4
<Button asChild><Link>...</Link></Button>
<TooltipProvider delayDuration={0}>
<TooltipTrigger asChild>
```

**Use these v4 patterns instead:**

```tsx
// CORRECT — import buttonVariants and apply via className
import { buttonVariants } from "@/components/ui/button";
<Link className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "extra-classes")}>

// CORRECT — Tooltip uses delay prop, not delayDuration
<TooltipProvider delay={0}>

// CORRECT — TooltipTrigger wraps children directly, no asChild
<TooltipTrigger className="w-full">
  <div>content</div>
</TooltipTrigger>
```

**Recharts formatter types** — use `any` to avoid TypeScript errors:
```tsx
// eslint-disable-next-line @typescript-eslint/no-explicit-any
formatter={(v: any, n: any) => [...]}
```

---

## Architecture

```
rwandamotor/
├── backend/
│   └── src/
│       ├── RwandaMotor.Domain/          # Entities, Enums, Domain Events — zero dependencies
│       ├── RwandaMotor.Application/     # CQRS handlers, Interfaces, DTOs — depends on Domain
│       ├── RwandaMotor.Infrastructure/  # EF Core, Services, Jobs, Seed — depends on Application
│       └── RwandaMotor.API/             # Controllers, Middleware, Program.cs — depends on all
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── (auth)/login/            # Public login page
│       │   └── (dashboard)/             # Protected — checks JWT in layout
│       │       ├── dashboard/           # Executive KPI overview
│       │       ├── vehicles/            # Vehicle registry (table + [id] 360 profile)
│       │       ├── customers/           # Customer registry
│       │       ├── service-records/     # Workshop history
│       │       ├── retention/           # Retention analytics
│       │       └── import/             # CSV/Excel import wizard
│       ├── components/
│       │   ├── layout/                  # Sidebar, Header
│       │   ├── providers/               # QueryProvider, ThemeProvider
│       │   ├── shared/                  # KpiCard, RetentionBadge
│       │   └── ui/                      # ShadCN components
│       ├── contexts/auth-context.tsx    # JWT in localStorage, auto-redirect on 401
│       ├── lib/api.ts                   # Axios client with JWT interceptor
│       ├── lib/utils.ts                 # formatDate, formatCurrency, formatMileage, etc.
│       └── types/index.ts              # All TypeScript types mirroring backend DTOs
├── docker/docker-compose.yml
└── .github/workflows/ci.yml
```

---

## Backend: Key Patterns

### Clean Architecture Dependency Rule
- `Domain` has zero external dependencies (no EF Core, no MediatR)
- `Application` depends only on Domain — defines interfaces, never implementations
- `Infrastructure` implements Application's interfaces
- `API` wires everything via DI

### CQRS Pattern
Every feature lives in `Application/Features/{Domain}/Commands/` or `Queries/`. Handler returns a DTO, never a domain entity.

```
Application/Features/Vehicles/Queries/GetVehiclesQuery.cs   — handler + record + DTO in one file
Application/Features/Vehicles/Commands/CreateVehicleCommand.cs
Application/Features/Vehicles/Queries/GetVehicle360Query.cs
```

### Base Entity
All domain entities extend `BaseEntity` (`Domain/Common/BaseEntity.cs`):
- `Guid Id` (auto-generated)
- `CreatedAt`, `UpdatedAt`, `CreatedBy`, `UpdatedBy`
- `IsDeleted`, `DeletedAt`, `DeletedBy` (soft deletes)
- `DomainEvents` list

### Soft Deletes via EF Global Filters
`ApplicationDbContext` adds `HasQueryFilter(e => !e.IsDeleted)` for every entity. Deleted records are never returned unless you explicitly call `.IgnoreQueryFilters()`.

### API Response Envelope
All controllers return:
```json
{ "success": true, "data": {...}, "message": null, "errors": [] }
```
Defined as `ApiResponse<T>` in Application and mirrored as `ApiResponse<T>` in `frontend/src/types/index.ts`.

---

## Domain: Service Interval Engine

**File:** `Infrastructure/Services/ServiceIntervalEngine.cs`

Policy resolution cascade (highest → lowest priority):
1. Vehicle-level override (`Vehicle.ServicePolicyId`)
2. Model-level policy (`VehicleModel.Id` matches `ServicePolicy.ModelId`)
3. Brand-level policy (`Vehicle.BrandId` matches `ServicePolicy.BrandId`)
4. System default (`ServicePolicy.IsDefault == true`)
5. Hardcoded fallback: 10,000 km / 12 months

Seeded policies:
- **Suzuki:** 5,000 km / 6 months
- **Range Rover:** 10,000 km / 12 months
- **Default:** 10,000 km / 12 months

The `DetermineServiceDueStatusAsync` method returns one of: `Active`, `DueSoon`, `Overdue`, `Lost`. The vehicle is `DueSoon` when within 500 km or 30 days of the next service due date.

---

## Domain: Retention Engine

**File:** `Infrastructure/Services/RetentionEngine.cs`

**Formula:** `RetentionRate = (Vehicles that had ≥1 service record in the period / Eligible vehicles) × 100`

**Eligible:** Sold by dealership, sale date ≤ period end.  
**Returned:** Had at least one service record within the measurement window.

**Vehicle Status Lifecycle:**
```
Active → DueSoon → Overdue → Lost → Recovered
```
`Recovered` is only set when a vehicle transitions from `Lost` back to `Active` — meaning a previously lost customer returned. The Quartz.NET job (`Infrastructure/BackgroundJobs/RetentionEvaluationJob.cs`) runs nightly at 2:00 AM UTC and calls `EvaluateAllVehiclesAsync`.

**Analytics computed:**
- Monthly / Quarterly / Yearly summary
- 12-month trend (one data point per calendar month)
- Brand breakdown (YTD)
- Cohort analysis (grouped by quarter of sale year)

---

## API Endpoints

Base URL: `http://localhost:5000/api`  
All endpoints require `Authorization: Bearer {token}` except `/auth/login`.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/login` | Public | Returns JWT + user info |
| GET | `/dashboard/kpis` | Any | All dashboard KPIs in one call |
| GET | `/vehicles` | Any | Paginated list with filters |
| GET | `/vehicles/{id}/360` | Any | Full vehicle profile |
| POST | `/vehicles` | Admin/TD | Create vehicle |
| GET | `/customers` | Any | Paginated list |
| POST | `/customers` | Admin/TD | Create customer |
| GET | `/servicerecords` | Any | Paginated, filterable by vehicle/tech/bay/date |
| POST | `/servicerecords` | Any | Create service record (triggers retention re-eval) |
| GET | `/retention/analytics` | Any | Full retention analytics |
| GET | `/servicepolicies` | Any | List policies (optionally filtered by brandId) |

**Query params — vehicles:** `search`, `brandId`, `modelId`, `retentionStatus`, `isSoldByDealership`, `warrantyActive`, `pageNumber`, `pageSize`

**Query params — retention analytics:** `trendMonths` (default 12), `cohortYear` (default current year)

---

## Database Seed Data

Auto-runs on every startup via `ApplicationDbSeeder`. Idempotent — checks before inserting.

**Roles:** Admin, TechnicalDirector, CRMOfficer

**Users:**
| Email | Password | Role |
|-------|----------|------|
| admin@rwandamotor.com | Admin@123! | Admin |
| director@rwandamotor.com | Director@123! | TechnicalDirector |
| crm@rwandamotor.com | CRM@123! | CRMOfficer |

**Brands + Models:** Suzuki (Swift, Vitara, Jimny, Ertiga, Baleno), Changan (CS35, CS55, CS75, Alsvin), Renault (Duster, Logan, Sandero, Kwid), Fiat (Tipo, Cronos), Tata (Xenon, Safari), Range Rover (Defender, Discovery, Evoque, Sport, Velar)

**Sample data:** 10 customers, 5 vehicles with service history, 4 technicians, 5 workshop bays

---

## Frontend: Key Patterns

### Auth Flow
- JWT stored in `localStorage` as `access_token`
- User profile stored as `auth_user` (JSON)
- Axios interceptor in `lib/api.ts` attaches token to every request
- 401 response → clears storage → redirects to `/login`
- `AuthContext` (`contexts/auth-context.tsx`) exposes `user`, `login()`, `logout()`, `isLoading`
- Dashboard layout (`app/(dashboard)/layout.tsx`) redirects to `/login` if no token on mount

### Data Fetching
All server state uses **TanStack Query**. No `useEffect` + `useState` for API calls.

```tsx
const { data, isLoading } = useQuery({
  queryKey: ["vehicles", search, statusFilter, pagination],
  queryFn: () => vehiclesApi.list({ ... }),
});
```

### Tables
**TanStack Table** with manual (server-side) pagination. `manualPagination: true`, `rowCount` set from `totalCount`, `onPaginationChange` triggers a re-query.

### Shared Components
- `KpiCard` (`components/shared/kpi-card.tsx`) — animated metric card, variants: `default | success | warning | danger | info | purple`
- `RetentionBadge` (`components/shared/retention-badge.tsx`) — color-coded status pill using `RETENTION_STATUS_CONFIG` from `lib/utils.ts`

### Utility Functions (`lib/utils.ts`)
```ts
formatDate(dateString)          // "15 Jan 2025"
formatDateDistance(dateString)  // "3 months ago"
formatCurrency(amount)          // "RWF 45,000"
formatMileage(km)               // "45,000 km"
formatPercentage(value, dp)     // "82.5%"
RETENTION_STATUS_CONFIG         // { Active: { label, color, bgColor }, ... }
SERVICE_TYPE_LABELS             // { RoutineMaintenance: "Routine Maintenance", ... }
CUSTOMER_CATEGORY_LABELS
```

---

## Running the Project

### Docker (fastest path)
Requires Docker Desktop.
```bash
cd c:\Projects\rwandamotor
docker compose -f docker/docker-compose.yml up -d
```
- Frontend: http://localhost:3000
- API: http://localhost:5000
- Swagger: http://localhost:5000/swagger

### Local Development
Requires: .NET 9 SDK + SQL Server (Express/Developer edition works)

**Terminal 1 — Backend:**
```powershell
cd c:\Projects\rwandamotor\backend
dotnet restore
dotnet ef database update --project src/RwandaMotor.Infrastructure --startup-project src/RwandaMotor.API
dotnet run --project src/RwandaMotor.API
```

**Terminal 2 — Frontend:**
```powershell
cd c:\Projects\rwandamotor\frontend
npm install
npm run dev
```

**Frontend env** (`frontend/.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```
For Docker builds this is set in `docker/docker-compose.yml` to `http://api:8080/api`.

---

## Complete File Inventory

### Backend (`backend/src/`)

```
RwandaMotor.Domain/
  Common/BaseEntity.cs
  Entities/ApplicationUser.cs         # Extends IdentityUser
  Entities/Brand.cs                   # Brand + VehicleModel nested
  Entities/Customer.cs
  Entities/FollowUp.cs
  Entities/ImportLog.cs               # + ImportLogRow
  Entities/ServicePolicy.cs           # Core interval config
  Entities/ServiceRecord.cs           # + ServicePart
  Entities/Technician.cs              # + WorkshopBay
  Entities/Vehicle.cs                 # Core retention entity
  Enums/CustomerCategory.cs
  Enums/FollowUpStatus.cs
  Enums/ImportStatus.cs
  Enums/RetentionStatus.cs            # Active|DueSoon|Overdue|Lost|Recovered|External
  Enums/ServiceType.cs
  Events/VehicleStatusChangedEvent.cs

RwandaMotor.Application/
  Common/Behaviours/ValidationBehaviour.cs    # MediatR pipeline behaviour
  Common/Interfaces/IApplicationDbContext.cs
  Common/Interfaces/ICurrentUserService.cs
  Common/Interfaces/IJwtService.cs
  Common/Interfaces/IRetentionEngine.cs       # + all return DTOs
  Common/Interfaces/IServiceIntervalEngine.cs
  Common/Models/PaginatedResult.cs
  Features/Auth/Commands/LoginCommand.cs
  Features/Customers/Commands/CreateCustomerCommand.cs
  Features/Customers/Queries/GetCustomersQuery.cs
  Features/Dashboard/Queries/GetDashboardKpisQuery.cs
  Features/Import/Commands/ProcessImportCommand.cs
  Features/Retention/Queries/GetRetentionAnalyticsQuery.cs
  Features/ServicePolicies/Queries/GetServicePoliciesQuery.cs
  Features/ServiceRecords/Commands/CreateServiceRecordCommand.cs
  Features/ServiceRecords/Queries/GetServiceRecordsQuery.cs
  Features/Vehicles/Commands/CreateVehicleCommand.cs
  Features/Vehicles/Queries/GetVehicle360Query.cs
  Features/Vehicles/Queries/GetVehiclesQuery.cs

RwandaMotor.Infrastructure/
  BackgroundJobs/RetentionEvaluationJob.cs    # Quartz.NET — 2:00 AM UTC
  DependencyInjection.cs                      # AddInfrastructure extension
  Persistence/ApplicationDbContext.cs
  Persistence/Configurations/CustomerConfiguration.cs
  Persistence/Configurations/VehicleConfiguration.cs
  Persistence/Seed/ApplicationDbSeeder.cs
  Services/JwtService.cs
  Services/RetentionEngine.cs
  Services/ServiceIntervalEngine.cs

RwandaMotor.API/
  Controllers/AuthController.cs
  Controllers/CustomersController.cs
  Controllers/DashboardController.cs
  Controllers/RetentionController.cs
  Controllers/ServicePoliciesController.cs
  Controllers/ServiceRecordsController.cs
  Controllers/VehiclesController.cs
  Extensions/CurrentUserService.cs
  Middleware/ExceptionHandlingMiddleware.cs
  Program.cs
  appsettings.json
  appsettings.Development.json
```

### Frontend (`frontend/src/`)

```
app/
  layout.tsx                          # Root: ThemeProvider + QueryProvider + AuthProvider
  globals.css                         # Custom oklch color palette (dark navy sidebar, indigo primary)
  page.tsx                            # Redirects / → /dashboard
  (auth)/login/page.tsx               # Animated login with quick-fill demo buttons
  (dashboard)/layout.tsx              # Auth guard + Sidebar + Header
  (dashboard)/dashboard/page.tsx      # Executive dashboard
  (dashboard)/vehicles/page.tsx       # Vehicle registry table
  (dashboard)/vehicles/[id]/page.tsx  # Vehicle 360 profile
  (dashboard)/customers/page.tsx      # Customer registry table
  (dashboard)/service-records/page.tsx
  (dashboard)/retention/page.tsx      # Retention analytics
  (dashboard)/import/page.tsx         # 5-step import wizard

components/
  layout/sidebar.tsx                  # Collapsible dark sidebar (256px ↔ 72px)
  layout/header.tsx
  providers/query-provider.tsx
  providers/theme-provider.tsx
  shared/kpi-card.tsx
  shared/retention-badge.tsx
  ui/                                 # ShadCN v4 components: button, card, badge, input,
                                      # select, table, tabs, dialog, sheet, skeleton,
                                      # avatar, badge, dropdown-menu, scroll-area,
                                      # separator, sonner, progress, tooltip, label

contexts/auth-context.tsx
lib/api.ts
lib/utils.ts
types/index.ts
```

---

## RBAC Policy Summary

```
Admin              — full access to everything
TechnicalDirector  — Admin + TechnicalDirector policies
CRMOfficer         — Admin + TechnicalDirector + CRMOfficer policies (broadest read access)
```

Defined in `Program.cs`:
```csharp
options.AddPolicy("Admin", policy => policy.RequireRole("Admin"));
options.AddPolicy("TechnicalDirector", policy => policy.RequireRole("Admin", "TechnicalDirector"));
options.AddPolicy("CRMOfficer", policy => policy.RequireRole("Admin", "TechnicalDirector", "CRMOfficer"));
```

---

## What Is NOT Yet Built (Roadmap — Phase 2+)

These modules are listed in `README.md` as future work. The domain is designed to expand into a full DMS/ERP:

### High Priority (next sprint)
- **Follow-Up Module** — Full CRUD for `FollowUp` entity (entity + enum exist, no UI or API handlers). CRM officers need to log call attempts on Lost/Overdue vehicles and mark them Recovered.
- **Service Policy Admin UI** — API endpoint exists (`GET /servicepolicies`), but there is no UI to create/edit/delete policies. Currently only seeded data exists.
- **Vehicle Create/Edit Form** — `POST /vehicles` endpoint exists but there is no frontend form. Users currently cannot add vehicles through the UI.
- **Customer Create/Edit Form** — Same situation as vehicles.

### Medium Priority
- **Parts Inventory Management** — `ServicePart` entity is already on `ServiceRecord` for cost tracking, but there is no standalone inventory module.
- **Workshop Job Cards** — Allocate work orders to `WorkshopBay` and `Technician`. Bay and Technician entities exist, but job card workflow is unbuilt.
- **BI Export** — Excel/PDF export of retention reports, service history, and customer lists.

### Lower Priority (Phase 3)
- **Warranty Management** — Warranty fields exist on `Vehicle` entity but no dedicated tracking/alerting module.
- **Manufacturer KPI Reporting** — Suzuki-standard reporting formats.
- **Mobile PWA** — Workshop technicians on the floor.
- **HR & Payroll**

---

## Known Quirks & Decisions

1. **Import wizard is mock UI** — The 5-step wizard in `/import` shows a realistic UI with drag-and-drop, validation preview, and progress, but the actual file processing (`ProcessImportCommand`) uses placeholder logic. Wire it to `ExcelDataReader` (already in the `.csproj`) for real CSV/Excel parsing.

2. **Refresh token is issued but not consumed** — `LoginCommand` returns a `refreshToken` field and it is stored in `localStorage`, but there is no `/auth/refresh` endpoint or interceptor logic to use it. When the 8-hour JWT expires, users get redirected to login.

3. **`CurrentMileage` is not auto-updated** — When a service record is created with `MileageAtService`, the vehicle's `CurrentMileage` is not automatically updated. Add this logic to `CreateServiceRecordCommandHandler`.

4. **No EF migrations committed** — The project uses `dotnet ef database update` which generates the schema from the DbContext. If you add entities, run `dotnet ef migrations add {Name}` in the Infrastructure project.

5. **`VehicleModel` is nested on `Brand`** — There is no standalone `VehicleModel` entity file; the `VehicleModel` class is defined inside `Brand.cs`. If you need to manage models separately, extract it.

6. **CORS origins in appsettings** — Production deployments must update `AllowedOrigins` in `appsettings.json`. Currently defaults to `["http://localhost:3000"]`.

---

## Connection Strings & Secrets

**`backend/src/RwandaMotor.API/appsettings.json`** (development defaults):
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost,1433;Database=RwandaMotorDMS;User Id=sa;Password=YourStrong!Passw0rd;TrustServerCertificate=True;"
  },
  "Jwt": {
    "Key": "RwandaMotorDMS_SuperSecretKey_2024_!@#$%^&*()",
    "Issuer": "https://api.rwandamotor.com",
    "Audience": "https://app.rwandamotor.com",
    "ExpiryHours": "8"
  },
  "AllowedOrigins": ["http://localhost:3000"]
}
```

For production, override via environment variables or a proper secrets manager. Never commit production secrets.

---

## CI/CD

**`.github/workflows/ci.yml`** runs on every push:
1. Backend job — `dotnet restore && dotnet build && dotnet test`
2. Frontend job — `npm ci && npx tsc --noEmit && npm run lint && npm run build`
3. Docker build job (on `main` branch only) — builds both images

No deployment target is configured yet. Add a deploy step after the Docker build job pointing at your hosting provider.
