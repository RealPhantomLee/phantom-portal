# Phantom Portal - Deployment Guide

## Prerequisites

- Raspberry Pi 5 running Linux
- Python 3.14+ installed
- Node.js 20+ installed
- Tailscale installed and configured with Raspberry Pi
- Mosquitto MQTT broker installed (`sudo apt install mosquitto`)

## Step 1: Generate TLS Certificate

This is **critical** for PWA service workers. HTTPS is required.

```bash
# Run on the Raspberry Pi with Tailscale authenticated
tailscale cert cyberdeck.REDACTED_TAILNET.ts.net

# Cert will be placed at:
# ~/.local/share/tailscale/certs/cyberdeck.REDACTED_TAILNET.ts.net.crt
# ~/.local/share/tailscale/certs/cyberdeck.REDACTED_TAILNET.ts.net.key
```

## Step 2: Clone/Prepare Project

```bash
cd /home/jolly/Projects/phantom

# Create Python virtual environment
python3.14 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## Step 3: Configure Secrets

```bash
# Copy example config
cp phantom.config.example.yaml phantom.config.yaml

# Edit with real values:
# - deepseek.api_key: Your DeepSeek API key
# - telegram.bot_token: Your Telegram bot token
# - telegram.chat_id: Your Telegram chat ID
# - home_assistant.url & token: HA access details
# - blink.username & password: Blink account credentials
# - web_push.vapid_*: Generate with: python -m pywebpush --gen-vapid

nano phantom.config.yaml
```

### Generate VAPID Keys for Web Push

```bash
source venv/bin/activate
python -m pywebpush --gen-vapid
# Output will be JSON with private_key and public_key
# Copy the values into phantom.config.yaml under web_push section
```

## Step 4: Run Database Migrations

```bash
source venv/bin/activate
python -c "from backend.db.connection import run_migrations_sync; run_migrations_sync()"
```

This will create the SQLite database at `data/phantom.db` with all tables.

## Step 5: Start Services

### Option A: Systemd (Recommended for Raspberry Pi)

```bash
# Copy systemd service files
sudo cp deploy/systemd/*.service /etc/systemd/system/
sudo cp deploy/systemd/*.timer /etc/systemd/system/

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable phantom-backend phantom-motion phantom-storage.timer
sudo systemctl start phantom-backend phantom-motion

# Check status
systemctl status phantom-backend
journalctl -u phantom-backend -f
```

### Option B: Manual (Development)

**Terminal 1 - Backend:**
```bash
cd /home/jolly/Projects/phantom
source venv/bin/activate
uvicorn backend.main:app --host 0.0.0.0 --port 8000 \
  --ssl-certfile ~/.local/share/tailscale/certs/cyberdeck.REDACTED_TAILNET.ts.net.crt \
  --ssl-keyfile ~/.local/share/tailscale/certs/cyberdeck.REDACTED_TAILNET.ts.net.key
```

**Terminal 2 - Motion Monitor:**
```bash
cd /home/jolly/Projects/phantom
source venv/bin/activate
python services/motion_monitor.py
```

**Terminal 3 - Frontend:**
```bash
cd /home/jolly/Projects/phantom/frontend
pnpm install
pnpm dev
```

### Option C: Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Step 6: Access the Portal

From any Tailscale-connected device, visit:

```
https://cyberdeck.REDACTED_TAILNET.ts.net
```

You should see:
- ✅ The Phantom Portal landing page (dark theme)
- ✅ Three tabs: Notes | Security | Home
- ✅ Installation prompt for PWA on mobile

## Testing Checklist

### Backend Health

```bash
# From Tailscale device
curl https://cyberdeck.REDACTED_TAILNET.ts.net/health
# Expected: {"status":"ok","service":"phantom-portal"}
```

### API Endpoints

```bash
# Create a note
curl -X POST https://cyberdeck.REDACTED_TAILNET.ts.net/api/notes \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","content":"Hello [[world]]"}'

# List notes
curl https://cyberdeck.REDACTED_TAILNET.ts.net/api/notes

# Get cameras
curl https://cyberdeck.REDACTED_TAILNET.ts.net/api/security/cameras

# Get HA devices
curl https://cyberdeck.REDACTED_TAILNET.ts.net/api/ha/devices
```

### Real-Time Features

```bash
# Subscribe to motion events
websocat wss://cyberdeck.REDACTED_TAILNET.ts.net/ws/security

# In another terminal, trigger a motion event in Blink
# You should see the event in the websocat output
```

### PWA Installation

On mobile device:
1. Visit https://cyberdeck.REDACTED_TAILNET.ts.net
2. Tap "Install" button (browser-specific, usually in URL bar)
3. Confirm installation
4. App should appear on home screen

Test that push notifications work when you close the app.

## Monitoring

### Systemd Logs

```bash
# Backend
journalctl -u phantom-backend -f -n 50

# Motion monitor
journalctl -u phantom-motion -f -n 50

# All Phantom services
journalctl -u "phantom*" -f
```

### SQLite Database

```bash
sqlite3 data/phantom.db
> .tables
> SELECT COUNT(*) FROM notes;
> SELECT COUNT(*) FROM security_events;
```

### MQTT

```bash
# Subscribe to motion events
mosquitto_sub -h localhost -t "kageki/camera/motion"

# Or use mosquitto_pub to test
mosquitto_pub -h localhost -t "kageki/camera/motion" -m '{"timestamp":"2026-05-16T10:00:00Z","camera":"front","confidence":0.95}'
```

## Troubleshooting

### Service Won't Start

Check logs:
```bash
journalctl -u phantom-backend -n 30
```

Common issues:
- Missing VAPID keys in config
- Database locked (another process has it)
- Wrong Tailscale cert path
- Port 8000 already in use

### MQTT Connection Errors

```bash
# Check Mosquitto is running
systemctl status mosquitto
mosquitto_sub -h localhost -t "$SYS/broker/uptime"

# If not responding, restart:
sudo systemctl restart mosquitto
```

### Frontend Not Loading

- Clear browser cache: DevTools → Storage → Clear Site Data
- Check Nginx logs: `journalctl -u nginx -f`
- Verify frontend built: `ls frontend/dist/`

### PWA Service Worker Errors

Browser console will show exact error. Common causes:
- HTTPS cert not valid (wrong hostname, self-signed not trusted)
- Service worker script failed to load
- Browser cache corrupted (clear site data)

### Notes Not Syncing

```bash
# Check WebSocket connection in browser DevTools (Network tab)
# Watch for /ws/sync

# Backend should be broadcasting sync events
journalctl -u phantom-backend -f | grep -i "sync\|broadcast"
```

## Backup & Recovery

### Backup Database

```bash
# Daily backup (add to crontab)
cp /home/jolly/Projects/phantom/data/phantom.db \
   /home/jolly/Projects/phantom/data/phantom.db.$(date +%Y%m%d)

# Keep last 7 backups
find /home/jolly/Projects/phantom/data -name "phantom.db.*" -mtime +7 -delete
```

### Restore from Backup

```bash
cp /home/jolly/Projects/phantom/data/phantom.db.20260516 \
   /home/jolly/Projects/phantom/data/phantom.db

# Restart backend
systemctl restart phantom-backend
```

## Scaling Considerations

- **Single user**: Current SQLite setup is perfect
- **Multiple devices**: Add Tailscale ACL to control access
- **Disaster recovery**: Backup database daily, keep 30-day archive
- **Performance**: SQLite can handle millions of notes without issues

## Future: Migrate to Ollama

When ready to switch from DeepSeek to Ollama:

1. Install Ollama: `curl https://ollama.ai/install.sh | sh`
2. Pull model: `ollama pull llama2:13b-chat`
3. Update config:
   ```yaml
   ai:
     provider: ollama
     base_url: http://localhost:11434/v1
     model: llama2:13b-chat
   ```
4. Restart backend: `systemctl restart phantom-backend`

Zero code changes required — config-driven provider swap.

## Support

For issues, check:
1. Logs: `journalctl -u phantom-backend -f`
2. Database: `sqlite3 data/phantom.db ".schema"`
3. Config: `cat phantom.config.yaml` (values only, not secrets)
4. Connectivity: `ping cyberdeck.REDACTED_TAILNET.ts.net` (from Tailscale device)
