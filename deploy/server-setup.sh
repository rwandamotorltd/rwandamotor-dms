#!/bin/bash
# RwandaMotor DMS — First-Time Server Setup
# Run once on the Ubuntu server as a user with sudo rights.
# Usage: bash server-setup.sh
set -e

echo "=== RwandaMotor DMS — Server Setup ==="

# ── 1. Install .NET 9 runtime ──────────────────────────────────────────────
echo "[1/8] Installing .NET 9 runtime..."
wget -q https://packages.microsoft.com/config/ubuntu/$(lsb_release -rs)/packages-microsoft-prod.deb -O /tmp/packages-microsoft-prod.deb
sudo dpkg -i /tmp/packages-microsoft-prod.deb
sudo apt-get update -q
sudo apt-get install -y aspnetcore-runtime-9.0

# ── 2. Create system user ──────────────────────────────────────────────────
echo "[2/8] Creating system user 'rwandamotor'..."
sudo useradd -r -s /bin/false -d /opt/rwandamotor-api rwandamotor 2>/dev/null || echo "  (user already exists)"

# ── 3. Create directories ──────────────────────────────────────────────────
echo "[3/8] Creating directories..."
sudo mkdir -p /opt/rwandamotor-api
sudo mkdir -p /var/log/rwandamotor
sudo mkdir -p /etc/rwandamotor
sudo chown rwandamotor:rwandamotor /opt/rwandamotor-api /var/log/rwandamotor

# ── 4. Create PostgreSQL database and user ─────────────────────────────────
echo "[4/8] Creating PostgreSQL database..."
sudo -u postgres psql <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rwandamotor_api') THEN
    CREATE ROLE rwandamotor_api LOGIN PASSWORD 'CHANGE_THIS_PASSWORD';
  END IF;
END \$\$;
CREATE DATABASE rwandamotordms OWNER rwandamotor_api;
GRANT ALL PRIVILEGES ON DATABASE rwandamotordms TO rwandamotor_api;
SQL
echo "  ✅ Database 'rwandamotordms' ready."

# ── 5. Create env file (fill in secrets) ──────────────────────────────────
echo "[5/8] Creating env file at /etc/rwandamotor/api.env..."
if [ ! -f /etc/rwandamotor/api.env ]; then
  sudo cp "$(dirname "$0")/api.env.example" /etc/rwandamotor/api.env
  sudo chmod 600 /etc/rwandamotor/api.env
  sudo chown rwandamotor:rwandamotor /etc/rwandamotor/api.env
  echo "  ⚠️  IMPORTANT: Edit /etc/rwandamotor/api.env and set real passwords/secrets before continuing."
  echo "  Run: sudo nano /etc/rwandamotor/api.env"
  read -p "  Press Enter once you have filled in /etc/rwandamotor/api.env..."
else
  echo "  (already exists, skipping)"
fi

# ── 6. Install systemd service ─────────────────────────────────────────────
echo "[6/8] Installing systemd service..."
sudo cp "$(dirname "$0")/rwandamotor-api.service" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable rwandamotor-api
echo "  ✅ Service enabled (will start after first deploy)."

# ── 7. Install Nginx site ──────────────────────────────────────────────────
echo "[7/8] Installing Nginx site..."
sudo cp "$(dirname "$0")/nginx-api.conf" /etc/nginx/sites-available/rwandamotor-api
sudo ln -sf /etc/nginx/sites-available/rwandamotor-api /etc/nginx/sites-enabled/rwandamotor-api
sudo nginx -t && sudo systemctl reload nginx
echo "  ✅ Nginx configured for api.rwandamotor.com."

# ── 8. Cloudflare tunnel reminder ─────────────────────────────────────────
echo "[8/8] Cloudflare Tunnel..."
echo "  Add to /etc/cloudflared/config.yml (before the 404 catch-all):"
echo "    - hostname: api.rwandamotor.com"
echo "      service: http://localhost:5000"
echo "  Then run: sudo systemctl restart cloudflared"
echo ""
echo "=== Setup complete ==="
echo "Next steps:"
echo "  1. Fill in /etc/rwandamotor/api.env if not done yet"
echo "  2. Update Cloudflare tunnel config"
echo "  3. Push to GitHub main branch — GitHub Actions will deploy the API"
echo "  4. After first deploy, run migrations manually once:"
echo "     cd /opt/rwandamotor-api"
echo "     ASPNETCORE_ENVIRONMENT=Production dotnet RwandaMotor.API.dll --migrate-only"
