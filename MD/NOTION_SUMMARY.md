# RwandaMotor DMS — Project Summary

## What Was Built

**RwandaMotor DMS** is a custom Dealer Management System for RwandaMotor Ltd, a multi-brand automotive dealership in Rwanda. It replaces manual tracking with a unified platform for customer retention, vehicle service history, and operational intelligence.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | .NET 9, ASP.NET Core, Clean Architecture |
| Database | PostgreSQL 16 with Entity Framework Core |
| Authentication | JWT Bearer tokens with role-based access |
| Frontend | Next.js 16, React 19, Tailwind CSS v4, shadcn/ui |
| Charts & Tables | Recharts, TanStack Query & Table |
| Server | Ubuntu 26.04 on Hyper-V (Windows Server 2012 R2) |
| Frontend Hosting | Vercel (app.rwandamotor.com) |
| API Access | Cloudflare Tunnel → api.rwandamotor.com |
| CI/CD | GitHub Actions with self-hosted runner on server |

---

## Key Features

- **Customer Management** — Full customer profiles with contact details, vehicle history, and retention status
- **Vehicle Registry** — VIN tracking, brand/model catalogue (Suzuki, Changan, Range Rover, DEEPAL, etc.), warranty tracking
- **Service Records** — Workshop job cards with technician and bay assignment
- **Retention Analytics** — Cohort analysis, visit frequency, lost/at-risk/active customer segmentation
- **Executive Dashboard** — KPIs: active customers, vehicles due for service, retention rate, revenue indicators
- **Import Center** — Bulk data import for customer and vehicle records
- **User Management** — Four roles: Admin, TechnicalDirector, CRMOfficer, CRE
- **Nightly Background Job** — Quartz.NET job that auto-updates retention statuses overnight

---

## Infrastructure

```
Browser → app.rwandamotor.com (Vercel)
             ↓ API calls
         api.rwandamotor.com
             ↓ Cloudflare Tunnel
         Ubuntu Server (localhost:5000)
             ↓
         .NET 9 API (systemd service)
             ↓
         PostgreSQL 16
```

- **Cloudflare Tunnel** handles HTTPS with no port forwarding — same tunnel serves odoo, n8n, report, and api subdomains
- **GitHub Actions** self-hosted runner lives on the server — pushes to `main` trigger automatic deploy
- **Auto-migration** — EF Core migrations run on API startup, database is always up to date

---

## User Accounts (Seeded)

| Email | Password | Role |
|---|---|---|
| admin@rwandamotor.com | Admin@123! | Admin |
| director@rwandamotor.com | Director@123! | TechnicalDirector |
| crm@rwandamotor.com | Crm@123! | CRMOfficer |
| cre@rwandamotor.com | Cre@123! | CRE |

---

## URLs

| Service | URL |
|---|---|
| Frontend App | https://app.rwandamotor.com |
| Backend API | https://api.rwandamotor.com |
| GitHub Repo | github.com/rwandamotorltd/rwandamotor-dms |

---

## Current Version

**v1.0.0** — First production release, June 2026
