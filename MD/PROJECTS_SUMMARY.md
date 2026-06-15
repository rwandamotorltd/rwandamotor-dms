# RwandaMotor — Projects Summary
**Last updated: June 2026 | Status: Production**

---

## Overview

RwandaMotor Ltd operates a multi-brand automotive dealership in Rwanda (Suzuki, Changan, Range Rover, DEEPAL, and others). Two software projects have been built and deployed:

| Project | Name | URL | Purpose |
|---|---|---|---|
| Website | rwandamotor.com | https://rwandamotor.com | Public-facing marketing site |
| DMS / CSSR | Rwandamotor - CSSR | https://app.rwandamotor.com | Internal staff platform |

Both are separate Next.js applications deployed to Vercel. The DMS is backed by a .NET 9 API running on a self-hosted Ubuntu server.

---

## Project 1 — Public Website (rwandamotor.com)

### What it is
A multilingual marketing website for RwandaMotor's dealership. Customers can browse vehicle inventory, book service appointments, and explore the brand.

### Tech Stack
| Layer | Technology |
|---|---|
| Framework | Next.js (static export) |
| Styling | Scoped CSS (`.rwm-*` classes) |
| Internationalisation | Custom lang-context — English, French, Kinyarwanda |
| Hosting | Vercel |
| Domain | rwandamotor.com (Cloudflare DNS) |

### Pages & Routes
| Route | Page |
|---|---|
| `/` | Homepage — hero, brand highlights, CTA |
| `/showroom` | Vehicle catalogue with filters |
| `/showroom/[id]` | Individual vehicle detail page |
| `/service` | Service booking and workshop info |
| `/parts` | Genuine parts catalogue |
| `/events` | Promotions and dealership events |
| `/about` | Company story and team |
| `/contact` | Contact form and map |

### Key Features
- Three-language switcher (EN / FR / RW) — persists across pages
- Vehicle showroom with brand/model filtering
- Static export — zero server costs, instant page loads
- Mobile responsive

### Location on disk
```
c:\Projects\rwandamotor\website\
```

---

## Project 2 — DMS / CSSR (app.rwandamotor.com)

### What it is
**Rwandamotor - CSSR** (Customer Service & Sales Retention) is the internal platform used by staff to manage customers, vehicles, service records, retention analytics, and import bulk data. It replaced manual tracking with a unified digital system.

### Tech Stack

**Backend**
| Layer | Technology |
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

**Frontend**
| Layer | Technology |
|---|---|
| Framework | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui |
| Data Fetching | TanStack Query (React Query) |
| Charts | Recharts |
| Animations | Framer Motion |

**Infrastructure**
| Component | Technology |
|---|---|
| Server | Ubuntu 26.04 on Hyper-V (Windows Server 2012 R2 host) |
| API Process | systemd service (`rwandamotor-api`) |
| HTTPS | Cloudflare Tunnel (`cloudflared`) |
| CI/CD | GitHub Actions — self-hosted runner on server |
| Repo | github.com/rwandamotorltd/rwandamotor-dms |
| Frontend Hosting | Vercel |

### User Roles & Accounts
| Email | Password | Role | Access |
|---|---|---|---|
| admin@rwandamotor.com | Admin@123! | Admin | Full access |
| director@rwandamotor.com | Director@123! | TechnicalDirector | Dashboard, vehicles, customers, service, retention |
| crm@rwandamotor.com | Crm@123! | CRMOfficer | Same as Director + Import Center |
| cre@rwandamotor.com | Cre@123! | CRE | Same as TechnicalDirector |

### Modules & Pages
| Route | Module | Roles |
|---|---|---|
| `/dashboard` | Executive KPIs — active customers, vehicles due, retention rate | All |
| `/vehicles` | Vehicle Registry — list, filter, bulk status updates | All |
| `/vehicles/[id]` | Vehicle 360° — full service history, warranty, retention | All |
| `/customers` | Customer Registry — list, filter, categories | All |
| `/customers/[id]` | Customer 360° — profile, vehicle history, follow-ups | All |
| `/service-records` | Workshop job cards — technician, mileage, cost | All |
| `/retention` | Retention Analytics — cohorts, trends, lost/at-risk/active | All |
| `/import` | Bulk Import — CSV/Excel upload with validation preview | Admin, CRMOfficer |
| `/admin/users` | User Management — create, edit role, enable/disable, reset password | Admin only |
| `/admin/technicians` | Technician Management — CRUD, specialization, status | Admin only |
| `/settings` | Settings stub | All |

### API Endpoints Summary
| Controller | Base | Key Operations |
|---|---|---|
| Auth | `/api/auth` | POST `/login` |
| Dashboard | `/api/dashboard` | GET `/kpis` |
| Vehicles | `/api/vehicles` | Full CRUD + bulk update + bulk delete |
| Customers | `/api/customers` | Full CRUD + bulk delete |
| Service Records | `/api/servicerecords` | Full CRUD + bulk delete |
| Technicians | `/api/technicians` | Full CRUD |
| Retention | `/api/retention` | GET analytics, cohorts, cohort vehicles |
| Import | `/api/import` | POST validate, POST process |
| Admin | `/api/admin` | User CRUD + password reset |

### Infrastructure Diagram
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

The Cloudflare Tunnel (named `odoo-rwandamotor`) serves multiple subdomains — odoo, n8n, report, api — from a single config at `/etc/cloudflared/config.yml`. Do not create separate tunnels for new subdomains; add them as routes to the existing config.

### Location on disk
```
Cowork edits:    C:\Users\APC\Claude\Projects\CSSR\
Claude Code edits: c:\Projects\rwandamotor\
```
These are two copies synced through GitHub. Always push after editing so both stay in sync.

---

## Deployment

### Website (rwandamotor.com)
Deployed as a separate Vercel project connected to the `website` folder. Pushes to `main` auto-deploy.

### DMS (app.rwandamotor.com)
Pushes to `main` on `github.com/rwandamotorltd/rwandamotor-dms` trigger GitHub Actions which:
1. Builds and publishes the .NET API to the Ubuntu server via self-hosted runner
2. Triggers a Vercel deploy hook for the frontend

```powershell
# Deploy everything
cd C:\Users\APC\Claude\Projects\CSSR
git add -A
git commit -m "feat: ..."
git push origin main
```

### Server management
```bash
sudo systemctl status rwandamotor-api    # Check API
sudo systemctl restart rwandamotor-api   # Restart API
sudo journalctl -u rwandamotor-api -f    # Live logs
sudo systemctl status cloudflared        # Check tunnel
```

---

## Known Pending Items

| Item | Notes |
|---|---|
| Domain rename `app.` → `dms.rwandamotor.com` | Vercel domain alias + Cloudflare CNAME + update AllowedOrigins |
| Link website "Staff Login" → DMS | Add `<a href="https://app.rwandamotor.com">` in website nav |
| Settings page | Currently a stub — no content |
| Notification bell | Badge is hardcoded (3) — no real notification system yet |

---

## Important Rules

- **Never run migrations manually.** EF Core `MigrateAsync()` runs on API startup automatically.
- **Cloudflare Tunnel is shared** — add new subdomains as routes in the existing config, not a new tunnel.
- **PowerShell `&&` doesn't work** — use `;` or separate commands. PowerShell 7 supports `&&`.
- **Two project folders exist** — Cowork edits `C:\Users\APC\Claude\Projects\CSSR`, Claude Code edits `c:\Projects\rwandamotor`. Push to GitHub to keep them in sync.
- **Paths with `(dashboard)` in PowerShell must be quoted** — e.g. `"frontend/src/app/(dashboard)/layout.tsx"`.
