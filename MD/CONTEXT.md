# RwandaMotor DMS — Project Context for New Chat

## What Is This Project

RwandaMotor is a full-stack **Dealer Management System (DMS)** built for a Rwandan multi-brand automotive dealership. It tracks vehicles, customers, service records, technicians, and retention analytics.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | .NET 9, ASP.NET Core, Clean Architecture (Domain → Application → Infrastructure → API) |
| CQRS | MediatR + FluentValidation pipeline |
| ORM | Entity Framework Core (currently SQL Server, migration to PostgreSQL planned) |
| Auth | JWT Bearer, 4 roles: Admin, TechnicalDirector, CRMOfficer, CRE |
| Frontend | Next.js 16 App Router, React 19, TypeScript |
| Styling | TailwindCSS v4, shadcn/ui |
| State/Data | TanStack Query (server-side pagination), TanStack Table |
| Animations | Framer Motion |
| Charts | Recharts |

---

## Project Structure

```
C:\Projects\rwandamotor\
├── backend\
│   └── src\
│       ├── RwandaMotor.API\          ← Controllers, Program.cs
│       ├── RwandaMotor.Application\  ← Commands, Queries, DTOs (MediatR)
│       ├── RwandaMotor.Domain\       ← Entities, enums
│       └── RwandaMotor.Infrastructure\ ← EF Core, DbContext
└── frontend\
    └── src\
        ├── app\(dashboard)\          ← Page components
        ├── components\               ← Shared UI components
        ├── lib\api.ts                ← All API calls (Axios)
        └── types\index.ts            ← All TypeScript types
```

---

## Key Patterns

- **Soft deletes**: `IsDeleted = true`, `DeletedAt`, `DeletedBy` — never hard delete
- **Filter-based bulk delete**: Backend re-applies same filter as list query, no need to send thousands of IDs
- **Select-all-across-pages UX**: Two-step — select current page → blue banner "extend to all N records" → red banner "all N selected" → delete hits `/all` endpoint
- **CSV export**: Client-side, fetches `pageSize=10000` then generates Blob download
- **Enum serialization fix**: `JsonStringEnumConverter` added globally in `Program.cs` — required for string enums like `ContactMethod`, `CustomerCategory`, `RetentionStatus`

---

## What Has Been Built (Completed Features)

### Backend

#### Critical Bug Fix
- `Program.cs`: Added `JsonStringEnumConverter` to `AddControllers().AddJsonOptions()` — fixes customer create/update silently failing because `System.Text.Json` couldn't deserialize string enums

#### Customer Endpoints (Admin only)
- `DELETE /api/customers` — bulk delete by list of GUIDs
- `DELETE /api/customers/all` — filter-based delete (search, category)
- `CustomerListItemDto` updated to include `Address` field

#### Vehicle Endpoints (Admin only)
- `DELETE /api/vehicles` — bulk delete by IDs
- `DELETE /api/vehicles/all` — filter-based (search, retentionStatus, isSoldByDealership)

#### Service Record Endpoints (Admin only)
- `DELETE /api/servicerecords` — bulk delete by IDs
- `DELETE /api/servicerecords/all` — filter-based (search, serviceType, dateFrom, dateTo)

#### Retention Endpoints
- `GET /api/retention/visit-cohorts?year=2023` — now accepts optional year param (defaults to current year)
- `GET /api/retention/cohort-vehicles` — NEW drill-down endpoint
  - Params: `serviceYear`, `saleYear?`, `modelName?`, `brandName?`, `visitBucket`
  - Visit buckets: `zero`, `one`, `two`, `moreThanTwo`, `visited`
  - Returns: list of vehicles with VIN, plate, brand, model, year, customer name/phone, visit count

### Frontend

#### Customers Page (`/customers`)
- Type column: Individual (User icon) / Company (Building2 icon) — based on category or companyName
- Address column: city + address
- Export CSV button — fetches all matching records, downloads as CSV
- Admin bulk delete with select-all-across-pages pattern
- `DeleteConfirmDialog` routes to `deleteMutation` (selected IDs) or `deleteAllMutation` (filter-based)

#### Vehicles Page (`/vehicles`)
- Export CSV button (15 columns)
- Admin bulk delete integrated into existing bulk-edit mode
- Select-all-across-pages pattern with blue/red banners

#### Service Records Page (`/service-records`)
- Admin bulk delete with select-all-across-pages pattern

#### Retention Page (`/retention`)
- **Year selector**: pills for last 10 years — user picks which year to measure visits in
- **"Comparing X vs current (Y)" badge**: amber badge shown when a non-current year is selected
- **Age-wise table** (by sale year): all count cells are clickable `VisitCell` components
- **Model-wise table** (by model): same clickable cells per model row
- **`DrillPanel`**: Framer Motion slide-over from right — fetches `getCohortVehicles()` lazily, shows vehicle list
- **`VehicleRow`**: VIN + plate, brand/model/year, customer name/phone, visit count badge, 360° View link

---

## API Client (`frontend/src/lib/api.ts`) — Key Methods

```typescript
customersApi.deleteMany(ids: string[])
customersApi.deleteAll(params?: { search?, category? })

vehiclesApi.deleteMany(ids: string[])
vehiclesApi.deleteAll(params?: { search?, retentionStatus?, isSoldByDealership? })

serviceRecordsApi.deleteMany(ids: string[])
serviceRecordsApi.deleteAll(params?: { search?, serviceType?, dateFrom?, dateTo? })

retentionApi.getVisitCohorts(year?: number)
retentionApi.getCohortVehicles(params: { serviceYear, saleYear?, modelName?, brandName?, visitBucket })
```

---

## TypeScript Types (`frontend/src/types/index.ts`) — Key Additions

```typescript
// Added to CustomerListItem
address: string | null

// Added to VisitFrequencyCohort
todayYear: number

// New type
export interface CohortVehicle {
  id: string;
  vin: string;
  plateNumber: string | null;
  brandName: string;
  modelName: string;
  year: number;
  customerName: string | null;
  customerPhone: string | null;
  visitsInYear: number;
}
```

---

## Deployment Plan (Next Steps — NOT YET DONE)

The plan is to self-host on a personal server running Ubuntu 24.04 LTS.

### Pending Deployment Tasks
1. **PostgreSQL migration** — swap EF Core provider from SQL Server to Npgsql, re-run migrations
2. **`docker-compose.yml`** — run .NET API + PostgreSQL together with one command
3. **GitHub Actions workflow** — auto-deploy to server on every `git push` to main
4. **Vercel** — deploy the Next.js frontend (free tier)

### Server Info
- OS: Ubuntu (personal server, not cloud)
- Docker: needs to be installed
- OCI CLI: installed on dev machine (Windows) but Oracle VM had capacity issues — abandoned in favour of personal server

### Environment Variables Needed
- `NEXT_PUBLIC_API_URL` — the server's public URL/IP for the frontend to call
- `ConnectionStrings__DefaultConnection` — PostgreSQL connection string for the backend
- JWT secret, any other backend config from `appsettings.json`

---

## Development Environment

- Dev machine: Windows (PowerShell)
- Backend runs locally on: `http://localhost:5000`
- Frontend runs locally on: `http://localhost:3000`
- Database: SQL Server (local, to be replaced with PostgreSQL for production)
