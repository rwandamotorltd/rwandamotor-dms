# Rwandamotor Ltd — Infrastructure Context for New Chat

Paste this at the start of a new Claude conversation to instantly brief Claude on the full infrastructure without re-explaining anything.

---

## Company

**Rwandamotor Ltd** — authorized Suzuki, Changan, and Sonalika dealership in Kigali, Rwanda. Runs an automotive workshop/after-sales service alongside vehicle sales and parts.

---

## Infrastructure Overview

A fully self-hosted ERP + analytics stack on a Linux VM inside Hyper-V. All services are live, secured, and auto-start on reboot. TLS 1.2 confirmed end-to-end as of June 11, 2026.

---

## Host & VM

| Item | Value |
|------|-------|
| **Hyper-V Host** | SAGESERVEUR (Windows Server 2012 R2) |
| **VM Name** | odoo-server |
| **OS** | Ubuntu Server 26.04 LTS |
| **RAM** | 16 GB fixed |
| **Disk** | 300 GB LVM fully expanded |
| **LAN IP** | 192.168.137.10 (static) |
| **Tailscale IP** | 100.66.112.125 |
| **SSH** | `ssh rwandamotor@100.66.112.125` |
| **NAT Switch** | RWM-NAT-switch |

---

## Running Services

| Service | Path | Port | Config | DB |
|---------|------|------|--------|----|
| PostgreSQL 16 | system | 5432 | — | — |
| Odoo 18 Community | `/opt/odoo/server/` | 8069, 8072 | `/etc/odoo/odoo.conf` | `rwandamotor` |
| n8n | `/usr/local/bin/n8n` | 5678 | `/etc/systemd/system/n8n.service` | `n8ndb` |
| Metabase | `/opt/metabase/metabase.jar` | 3000 | `/etc/systemd/system/metabase.service` | `metabasedb` |
| Nginx | system | 80 | `/etc/nginx/sites-available/` | — |
| Cloudflare Tunnel | `/usr/local/bin/cloudflared` | — | `/etc/cloudflared/config.yml` | — |
| Tailscale | system | — | — | — |

---

## Public URLs

| App | URL |
|-----|-----|
| Odoo 18 | https://odoo.rwandamotor.com |
| n8n | https://n8n.rwandamotor.com |
| Metabase | https://report.rwandamotor.com |

---

## Cloudflare Tunnel

- **Name:** odoo-rwandamotor
- **ID:** 82492e60-afe3-4e36-b81e-a5f037e1a2d6
- **Credentials:** `/home/rwandamotor/.cloudflared/82492e60-afe3-4e36-b81e-a5f037e1a2d6.json`
- **Config:** `/etc/cloudflared/config.yml`

```yaml
ingress:
  - hostname: odoo.rwandamotor.com
    service: http://localhost:8069
  - hostname: n8n.rwandamotor.com
    service: http://localhost:5678
  - hostname: report.rwandamotor.com
    service: http://localhost:3000
  - service: http_status:404
```

---

## Odoo 18 Details

| Item | Value |
|------|-------|
| Install method | Git clone from github.com/odoo/odoo branch 18.0 |
| Source | `/opt/odoo/server/` |
| Virtual env | `/opt/odoo/venv/` |
| Config | `/etc/odoo/odoo.conf` |
| Data dir | `/var/lib/odoo/` |
| Log | `/var/log/odoo/odoo.log` |
| Custom addons | `/opt/odoo/custom-addons/` |
| Database | `rwandamotor` (PostgreSQL) |
| Admin login | `admin@rwandamotor.com` |
| Workers | 9 |
| wkhtmltopdf | `/usr/local/bin/wkhtmltopdf` (patched Qt) |
| proxy_mode | True |
| list_db | False |
| System user | `odoo` |

---

## n8n Details

| Item | Value |
|------|-------|
| Binary | `/usr/local/bin/n8n` |
| Data dir | `/opt/n8n/data/` |
| Log | `/var/log/n8n/n8n.log` |
| Database | `n8ndb` (PostgreSQL) |
| DB credentials | user: `n8n` / pass: `N8nRwanda@2026!` |
| System user | `n8n` |
| Encryption key | RwandaMotorN8nKey2026SecureString |

---

## Metabase Details

| Item | Value |
|------|-------|
| JAR | `/opt/metabase/metabase.jar` |
| Log | `/var/log/metabase/metabase.log` |
| Database | `metabasedb` (PostgreSQL) |
| DB credentials | user: `metabase` / pass: `MetabaseRwanda@2026!` |
| System user | `metabase` |
| Java | OpenJDK 21 |
| Java security | TLS 1.0/1.1 disabled ✅ (fully restored) |

---

## Sage 100 / SQL Server Connection

| Item | Value |
|------|-------|
| Windows Server | 2012 R2 (physical host SAGESERVEUR) |
| SQL Server | 2012 |
| Tailscale IP | 100.92.200.63 |
| Database | SAGEDATA |
| Contents | Comptabilité + Gestion Commerciale (Sage 100 v4) |
| Metabase user | `metabase_reader` (read-only, db_datareader) |
| Connection | Tailscale VPN only — not internet exposed |
| TLS | ✅ TLS 1.2 confirmed (registry fix applied, SQL Server restarted) |
| trustServerCertificate | false ✅ |
| Schemas | `dbo` (data), `cbase` (system) |
| Firewall rule | Port 1433 open to 100.0.0.0/8 (Tailscale) only |

### Key Sage 100 Tables in dbo schema

```
F_DOCENTETE   — Document headers (invoices, orders, workshop jobs)
F_DOCLIGNE    — Document lines (products/services per document)
F_ARTICLE     — Product & parts catalog
F_COMPTET     — Clients & suppliers
F_ECRITUREC   — Accounting entries
F_ARTSTOCK    — Stock levels per depot
F_MOUVEMENT   — Stock movements
F_COMPTEG     — Chart of accounts
F_JOURNAL     — Accounting journals
F_FAMILLE     — Product families
```

Custom automotive fields in F_DOCENTETE (workshop module):
```
Type_De_Vehicule      — Vehicle brand (ISUZU, SUZUKI...)
N°_Immatriculation    — Plate number (e.g. RAE 910 T)
N°_De_Chassis         — Chassis number
Nom_Mecanicien        — Mechanic name (e.g. JASON)
Kilometrage           — Vehicle mileage (e.g. 80,361)
Date_De_Fin_Des_Travaux — Job completion date
```

---

## Backup System

| Item | Value |
|------|-------|
| Script | `/usr/local/bin/odoo-backup.sh` |
| Schedule | Daily 2:00 AM |
| Cron file | `/etc/cron.d/odoo-backup` |
| Local storage | `/backups/` — 7 days retention |
| Off-site | OneDrive `RwandamotorBackups/` — 30 days retention |
| rclone config | `/root/.config/rclone/rclone.conf` (OneDrive Business) |
| Log | `/var/log/odoo-backup.log` |

---

## Nginx Sites

| File | Server name | Upstream |
|------|------------|---------|
| `/etc/nginx/sites-available/odoo` | odoo.rwandamotor.com | localhost:8069 |
| `/etc/nginx/sites-available/n8n` | n8n.rwandamotor.com | localhost:5678 |
| `/etc/nginx/sites-available/metabase` | report.rwandamotor.com | localhost:3000 |

---

## PostgreSQL Databases

| Database | Owner | Used by |
|----------|-------|---------|
| `rwandamotor` | odoo | Odoo 18 |
| `n8ndb` | n8n | n8n |
| `metabasedb` | metabase | Metabase |

---

## Security Status (All Green ✅)

| Layer | Status |
|-------|--------|
| Zero open ports on router | ✅ |
| Cloudflare Tunnel (no port forwarding) | ✅ |
| HTTPS on all public URLs | ✅ |
| SQL Server via Tailscale only | ✅ |
| TLS 1.2 on SQL Server 2012 | ✅ Confirmed June 11 |
| Java TLS 1.0/1.1 blocked | ✅ Restored |
| Metabase read-only SQL user | ✅ |
| Odoo list_db = False | ✅ |
| Static IP | ✅ 192.168.137.10 |

---

## Pending Work (pick up here)

### 🔴 High Priority
1. **Brevo SMTP email** — Odoo outgoing mail not working (Microsoft 365 SMTP AUTH blocked by security defaults)
   - Sign up at brevo.com with `admin@rwandamotor.com`
   - In Odoo: Settings → Technical → Outgoing Mail Server
   - SMTP: `smtp-relay.brevo.com` Port: `587` TLS: STARTTLS

2. **Cloudflare Access** — protect n8n and Metabase with an auth wall
   - Cloudflare Zero Trust → Access → Applications
   - Add `n8n.rwandamotor.com` and `report.rwandamotor.com`
   - Policy: allow `@rwandamotor.com` emails only

### 🟡 Medium Priority
3. **Odoo modules to install:** Sales, Inventory, Accounting, CRM, Purchase
4. **Metabase dashboards to build:**
   - Workshop jobs by mechanic (F_DOCENTETE)
   - Vehicle service history by plate number
   - Monthly revenue trend
   - Parts stock levels (F_ARTSTOCK)
   - Top clients by revenue (F_COMPTET + F_DOCENTETE)

### 🟢 Low Priority
5. **n8n ↔ Odoo** automation workflows
6. **Fix LAN SSH** (currently only Tailscale SSH works)
7. **Odoo company setup** — logo, RWF currency, company details

---

## Quick Health Check

```bash
# All services
sudo systemctl status odoo postgresql nginx cloudflared n8n metabase --no-pager

# Ports
sudo ss -tlnp | grep -E '80|8069|5678|3000|5432'

# Resources
df -h && free -h

# Backup log
tail -10 /var/log/odoo-backup.log

# OneDrive backups
rclone ls onedrive:RwandamotorBackups
```

---

*Rwandamotor Ltd — Infrastructure Context File | June 11, 2026*
*All systems confirmed live and secured.*
