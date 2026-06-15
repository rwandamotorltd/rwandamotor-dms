# RwandaMotor DMS — Retention & Service Intelligence Platform

Enterprise-grade Dealership Management System for a multi-brand automotive dealership in Rwanda.
**Brands:** Suzuki · Changan · Renault · Fiat · Tata · Range Rover

---

## Architecture

```
rwandamotor/
├── backend/               # ASP.NET Core .NET 9 — Clean Architecture
│   └── src/
│       ├── RwandaMotor.Domain/          # Entities, Enums, Domain Events
│       ├── RwandaMotor.Application/     # CQRS, MediatR, Interfaces, DTOs
│       ├── RwandaMotor.Infrastructure/  # EF Core, Repos, Engines, JWT, Quartz
│       └── RwandaMotor.API/             # Controllers, Middleware, Swagger
├── frontend/              # Next.js 15, TypeScript, ShadCN, Recharts
│   └── src/
│       ├── app/                         # App Router pages
│       │   ├── (auth)/login/            # Login page
│       │   └── (dashboard)/             # Protected dashboard pages
│       │       ├── dashboard/           # Executive KPI dashboard
│       │       ├── vehicles/            # Vehicle Registry + 360 profile
│       │       ├── customers/           # Customer Registry
│       │       ├── service-records/     # Service History
│       │       ├── retention/           # Retention Analytics
│       │       └── import/              # Import Center
│       ├── components/                  # Shared UI components
│       ├── contexts/                    # Auth context
│       ├── lib/                         # API client, utils
│       └── types/                       # TypeScript types
├── docker/
│   └── docker-compose.yml
└── .github/workflows/ci.yml
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, TailwindCSS, ShadCN UI, Recharts, Framer Motion, TanStack Table/Query |
| Backend | ASP.NET Core .NET 9, Clean Architecture, CQRS (MediatR), EF Core |
| Database | Microsoft SQL Server 2022 |
| Auth | JWT + ASP.NET Identity, RBAC (Admin / TechnicalDirector / CRMOfficer) |
| Jobs | Quartz.NET — nightly retention evaluation |
| Infra | Docker Compose, GitHub Actions CI/CD |

---

## Quick Start (Docker)

```bash
# Start all services (SQL Server + API + Frontend)
docker compose -f docker/docker-compose.yml up -d

# App available at:
# Frontend: http://localhost:3000
# API:      http://localhost:5000
# Swagger:  http://localhost:5000/swagger
```

## Local Development

### Backend
```bash
cd backend
# Requires .NET 9 SDK
dotnet restore
dotnet ef database update --project src/RwandaMotor.Infrastructure --startup-project src/RwandaMotor.API
dotnet run --project src/RwandaMotor.API
# API: http://localhost:5000
# Swagger: http://localhost:5000/swagger
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# App: http://localhost:3000
```

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@rwandamotor.com | Admin@123! |
| Technical Director | director@rwandamotor.com | Director@123! |
| CRM Officer | crm@rwandamotor.com | CRM@123! |

---

## Key Modules

### Retention Engine
- Fully dynamic — powered by configurable `ServicePolicy` per brand/model
- Calculates: Monthly, Quarterly, Yearly, Brand, Model, Cohort retention
- Formula: `RetentionRate = (Returned Vehicles / Eligible Vehicles) × 100`
- Nightly background job (Quartz.NET) evaluates all vehicles

### Service Interval Engine
- Policy resolution: Vehicle override → Model policy → Brand policy → Default
- Suzuki: 5,000 km / 6 months
- Range Rover: 10,000 km / 12 months
- All intervals configurable via Admin UI

### Vehicle Statuses
`Active` → `DueSoon` → `Overdue` → `Lost` → `Recovered`

### Import Center
- CSV & Excel support
- Vehicle sales, customer records, service history
- Validation preview, duplicate VIN detection, rollback support

---

## Database Schema (Key Tables)
- `Brands`, `VehicleModels`, `ServicePolicies`
- `Customers`, `Vehicles`
- `ServiceRecords`, `ServiceParts`
- `Technicians`, `WorkshopBays`
- `FollowUps`, `ImportLogs`, `ImportLogRows`
- ASP.NET Identity tables (`AspNetUsers`, `AspNetRoles`, etc.)

---

## Roadmap (Future Modules)
- [ ] Parts Inventory Management
- [ ] Warranty Management
- [ ] HR & Payroll
- [ ] Workshop Job Cards & Bay Scheduling
- [ ] Manufacturer KPI Reporting (Suzuki standards)
- [ ] BI Dashboard & Export (Excel/PDF)
- [ ] Mobile PWA for workshop technicians
