# Adding Job Card Module — Chat Reference

## What Was Built

A full **Job Card management** module added to the RwandaMotor DMS (.NET 9 + Next.js).

---

## Stack Reminder

- **Backend**: .NET 9, Clean Architecture, CQRS/MediatR, EF Core 9 + Npgsql (PostgreSQL)
- **Frontend**: Next.js App Router, TanStack Query, shadcn/ui v4 (built on `@base-ui/react` — NOT Radix UI)
- **Deploy**: Push to `main` → GitHub Actions → backend on Ubuntu server `192.168.137.10`, frontend on Vercel
- **Migration**: `MigrateAsync()` runs on API startup — no manual `dotnet ef database update` needed in production

---

## New Backend Files

### Domain — `backend/src/RwandaMotor.Domain/`

| File | Purpose |
|------|---------|
| `Enums/JobCardStatus.cs` | `Open = 1`, `Closed = 2` |
| `Enums/FuelLevel.cs` | `Empty=0, Quarter=1, Half=2, ThreeQuarter=3, Full=4` |
| `Entities/JobCard.cs` | Main entity (see fields below) |
| `Entities/JobCardSequence.cs` | Per-year auto-increment sequence tracker |
| `Entities/SalesHistory.cs` | Created when a PDI job card is converted |

**JobCard entity key fields:**
- `JobCardNumber` — format `OR{YY:D2}{seq:D5}` e.g. `OR2600001`
- Vehicle snapshot: `VIN`, `PlateNumber`, `Year`, `Color`, `Transmission`, `FuelType`
- `FuelLevel` (enum), `Mileage`
- Customer snapshot: `CustomerName`, `CustomerPhone`
- `ServiceType` (enum — includes PDI)
- `AccessoriesPresent` — `List<string>` stored as `jsonb`
- `Status` (Open/Closed)
- `ReceivedByName` — auto-set from logged-in user
- `ClosedAt`, `ClosedByName`, `DeliveryNoteNumber`, `DeliveryNoteGeneratedAt`

---

### Application — `backend/src/RwandaMotor.Application/Features/JobCards/`

**Commands:**
- `CreateJobCardCommand` — fetches vehicle+customer snapshot, calls `GenerateNumberAsync()`, sets `ReceivedByName` from `ICurrentUserService`
- `ConvertToDeliveryNoteCommand` — closes job card, sets `DeliveryNoteNumber = "DN" + jobCard.JobCardNumber[2..]`, creates `SalesHistory` if ServiceType == PDI
- `UpdateJobCardSequenceCommand` — admin-only, sets `StartingSequence` for a given year

**Queries:**
- `GetJobCardsQuery` — paginated list with filters: Search, Status, ServiceType, DateFrom, DateTo
- `GetJobCardQuery` — full detail including `AccessoriesPresent` list

---

### API — `backend/src/RwandaMotor.API/Controllers/JobCardsController.cs`

| Method | Route | Auth |
|--------|-------|------|
| GET | `/api/job-cards` | All roles |
| GET | `/api/job-cards/{id}` | All roles |
| POST | `/api/job-cards` | All roles |
| POST | `/api/job-cards/{id}/convert` | All roles |
| PUT | `/api/job-cards/sequence` | Admin only |
| POST | `/api/job-cards/{id}/share` | All roles |

---

## Modified Backend Files

| File | Change |
|------|--------|
| `Application/Common/Interfaces/IApplicationDbContext.cs` | Added `DbSet<JobCard>`, `DbSet<JobCardSequence>`, `DbSet<SalesHistory>` |
| `Infrastructure/Persistence/ApplicationDbContext.cs` | Added DbSets, soft-delete filters, `jsonb` column for `AccessoriesPresent`, unique index on `JobCardSequence.Year` |
| `Application/Features/Dashboard/Queries/GetDashboardKpisQuery.cs` | Added `OpenJobCards`, `TodayJobCards`, `MonthlyJobCards`, `MonthlySalesHistory` |

---

## Migration Files

Location: `backend/src/RwandaMotor.Infrastructure/Migrations/`

| File | Notes |
|------|-------|
| `20260615042839_AddJobCards.cs` | **Real migration** — creates `JobCards`, `JobCardSequences`, `SalesHistories` tables |
| `20260615042839_AddJobCards.Designer.cs` | Auto-generated model snapshot (do not edit) |
| `20260615000000_AddJobCards.cs` | **Empty comment file** — ignore, harmless leftover |
| `ApplicationDbContextModelSnapshot.cs` | Already includes all 3 new entities |

> Migration auto-applies on server startup via `MigrateAsync()`. No manual steps needed.

---

## New Frontend Files

### Pages

**`frontend/src/app/(dashboard)/job-cards/page.tsx`** — List page
- `ACCESSORIES` constant (10 items: Jack, Spare Tyre, etc.)
- `CreateJobCardDialog` — vehicle search autocomplete, all fields, accessories checkboxes
- `ShareDialog` — pre-filled email with job card details, customizable message
- Table with actions: Print (🖨), Email (📧), Convert (→), View (📄)
- Pagination

**`frontend/src/app/(dashboard)/job-cards/[id]/page.tsx`** — Detail page
- `FuelGauge` component — color-coded bar (red=empty, amber=low, green=ok)
- `PrintView` component — hidden off-screen normally, shows only on print via CSS media query
- Print template: vehicle info table, customer table, accessories checklist (☑/☐), signature line with `ReceivedByName`
- `?print=1` URL param auto-triggers `window.print()`
- "Convert to Delivery Note" button (orange, disabled after conversion)
- Green banner when closed showing delivery note number

### Components

**`frontend/src/components/ui/checkbox.tsx`** — Custom native checkbox (no Radix dependency)
```tsx
// Uses <button role="checkbox"> — no @radix-ui/react-checkbox needed
```

---

## Modified Frontend Files

| File | Change |
|------|--------|
| `src/types/index.ts` | Added `JobCardStatus`, `FuelLevel`, `JobCardListItem`, `JobCardDetail`, `JobCardSequenceInfo` types; added 4 new KPI fields to `DashboardKpis` |
| `src/lib/api.ts` | Added `CreateJobCardPayload`, `ShareJobCardPayload`, `jobCardsApi` object with all methods |
| `src/components/layout/sidebar.tsx` | Added Job Cards nav item (ClipboardList icon, visible to all roles) between Service Records and Retention |
| `src/app/(dashboard)/dashboard/page.tsx` | Added 3 new KPI cards: Open Job Cards (warning/orange), Today's Receptions (info), Monthly Job Cards |

---

## Key Business Rules Implemented

1. **Auto-numbering**: Format `OR{YY:D2}{seq:D5}` → `OR2600001`. Per-year sequence in `JobCardSequences` table. Admin can override starting number via PUT `/api/job-cards/sequence`.

2. **Delivery Note conversion**: `DeliveryNoteNumber = "DN" + jobCardNumber[2..]` → `OR2600001` becomes `DN2600001`. Job card status → Closed. Cannot be re-opened by non-admins.

3. **PDI → Sales History**: When ServiceType = PDI and converting to delivery note, a `SalesHistory` record is auto-created.

4. **Signature**: `ReceivedByName` is set from `ICurrentUserService.UserName` at creation time and printed on the document.

5. **Print**: CSS media query hides/shows print view. `?print=1` param auto-triggers browser print dialog.

---

## Known Issue Encountered

When running `dotnet ef database update` locally or `dotnet build`, there may be build errors due to the new files. Since the app is **deployed via GitHub Actions** (not run locally), the fix is:

1. Run `dotnet build src/RwandaMotor.API` to see the exact errors
2. Fix any compilation errors
3. Push to GitHub — Actions auto-deploys, migration auto-runs

**Do NOT run locally** — the machine runs out of memory. All preview happens at https://app.rwandamotor.com after pushing to GitHub.

---

## Deploy Flow

```
git add .
git commit -m "feat: add Job Card management module"
git push origin main
         ↓
GitHub Actions
  ├── deploy-api (self-hosted runner on 192.168.137.10)
  │     dotnet publish → sudo rwandamotor-deploy → API restarts → MigrateAsync() creates tables
  └── deploy-frontend
        curl → Vercel deploy hook → Vercel rebuilds → live at https://app.rwandamotor.com
```

---

## Pending / Next Steps

- [ ] Fix build errors (run `dotnet build src/RwandaMotor.API` and paste errors)
- [ ] Push to GitHub once build passes
- [ ] Verify live at https://app.rwandamotor.com/job-cards
- [ ] Test: create job card → print → convert to delivery note → check PDI creates sales history
