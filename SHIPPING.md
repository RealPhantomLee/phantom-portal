# PHANTOM PORTAL: SHIPPING PLAN
**Status:** Backend Ready (100%) | Frontend In Progress (50%)  
**Timeline:** 2-3 weeks to MVP launch  
**Target:** Self-hosted home security + encrypted notes portal on Raspberry Pi

---

## PHASE 1: Complete Frontend (Week 1)

### 1.1 Finish React Components
**Status:** NotesPanel, SecurityPanel, HomePanel are 50% stubbed. Complete:

#### NotesPanel (`src/components/NotesPanel.tsx`)
- [ ] Wire FTS5 full-text search to `/api/notes/search`
- [ ] Add note editor (Tiptap or simple textarea)
- [ ] Implement wiki-link extraction + backlink rendering
- [ ] Add tag extraction + filtering
- [ ] Export to HTML/PDF
- **Time:** 2-3 days

#### SecurityPanel (`src/components/SecurityPanel.tsx`)
- [ ] Render live Blink camera snapshots
- [ ] Display motion event feed (MQTT-driven via WebSocket)
- [ ] Show motion event timeline with timestamps
- [ ] Add arm/disarm camera controls (POST to `/api/security/camera/arm`)
- [ ] Real-time alert badge
- **Time:** 2-3 days

#### HomePanel (`src/components/HomePanel.tsx`)
- [ ] Render Home Assistant devices (lights, switches, scenes)
- [ ] Add device control buttons (on/off toggles)
- [ ] Display device status (from `/api/home/devices`)
- [ ] Scene execution shortcuts
- **Time:** 1 day

#### ChatPanel
- [ ] DeepSeek chat interface
- [ ] Message history + context awareness
- [ ] Streaming response rendering
- **Time:** 1-2 days

### 1.2 Wire Zustand Stores
- **File:** `src/stores/`
- **Stores:** useNotesStore, useSecurityStore, useHomeStore, useChatStore
- **Action:** Wire each store to backend API routes
- **Time:** 1 day

### 1.3 API Fetch Wrappers
- **File:** `src/lib/api.ts`
- **Endpoints:** Notes CRUD, security events, device control, chat
- **Time:** 1 day

---

## PHASE 2: PWA & Service Worker (Week 1, parallel)

### 2.1 Implement Service Worker
- **File:** `public/sw.js` (or via `next-pwa`)
- **Features:** Cache assets, cache API responses, offline mode, background sync
- **Library:** Use `next-pwa` for Next.js (easier than manual)
- **Time:** 1-2 days

### 2.2 Update PWA Manifest
- **File:** `public/manifest.json`
- **Fields:** name, short_name, display (standalone), icons (192x192, 512x512), theme_color
- **Time:** 1 day

### 2.3 Test PWA on Mobile
- Deploy locally or to Tailscale (HTTPS required)
- "Add to Home Screen" on iOS Safari + Android Chrome
- Test offline mode (airplane mode on, verify cached data loads)
- **Time:** 1 day

---

## PHASE 3: Tailscale Cert Automation (Week 1, final)

### 3.1 Automate Tailscale Certificate Generation
**Current state:** Manual `tailscale cert` step required  
**Goal:** Auto-generate cert on startup, no manual intervention

**Option A: Docker Entrypoint Script (Recommended)**
```bash
#!/bin/bash
if [ ! -f /etc/tailscale/cert.pem ]; then
  echo "Generating Tailscale cert..."
  tailscale cert $(hostname).tail$(cat /var/lib/tailscale/state.key | grep -o '...$')
fi
exec "$@"
```
- **Time:** 1 day

**Option B: systemd Timer (If Running on Pi Directly)**
- Create timer unit to refresh cert weekly
- **Time:** 1 day

---

## PHASE 4: Testing & Deployment (Week 2)

### 4.1 End-to-End Testing
- [ ] Create note → search → edit → delete
- [ ] Capture motion event → view → arm camera
- [ ] Toggle light in home automation
- [ ] Send chat message → receive DeepSeek response
- [ ] Test offline (disable network, verify cached data loads)
- [ ] Test PWA install on iOS + Android

### 4.2 Deployment to Pi
- Docker Compose on Raspberry Pi
- Access via Tailscale: `https://<tailscale-hostname>.tail<...>.ts.net`
- Verify all services running + HTTPS working

### 4.3 Performance Check
- Frontend load time < 2s
- API response time < 500ms
- Motion events real-time (< 100ms latency)

---

## PHASE 5: Documentation & Launch (Week 2-3)

### 5.1 Write Installation Guide
- **File:** `INSTALLATION.md`
- **Content:** Hardware requirements (Raspberry Pi 4+), Tailscale setup, Docker Compose, access via Tailscale URL

### 5.2 Create Quick-Start Walkthrough
- **File:** `QUICKSTART.md`
- **Content:** First 5 min setup (add note, capture motion, toggle light, send chat message)

### 5.3 GitHub & Release
- Push to `RealPhantomLee/phantom-portal` (ensure public)
- Update README: "ready to ship" messaging
- Tag v0.1.0 release

### 5.4 Public Announcement
- Hacker News: "Show HN: Phantom Portal — Self-hosted home security + encrypted notes"
- Reddit: `r/selfhosted`, `r/homeautomation`
- Twitter/X with screenshots

---

## DELIVERABLES CHECKLIST

**Frontend (Week 1):**
- [ ] NotesPanel complete + wired to API
- [ ] SecurityPanel complete + live motion events
- [ ] HomePanel complete + device control
- [ ] ChatPanel complete + streaming responses
- [ ] Zustand stores implemented + wired
- [ ] API fetch wrappers in place
- [ ] Service Worker + PWA manifest
- [ ] PWA tested on iOS + Android
- [ ] Tailscale cert automation working

**Deployment (Week 2):**
- [ ] Docker Compose tested on Pi
- [ ] HTTPS working, no cert warnings
- [ ] All features verified
- [ ] Performance metrics acceptable
- [ ] Installation guide written
- [ ] Quick-start guide written
- [ ] v0.1.0 release tagged
- [ ] Launch announcement posted

---

## SUCCESS METRICS (14 days post-launch)

- ✅ 50+ GitHub stars
- ✅ 10+ people self-hosting
- ✅ 0 critical deployment bugs
- ✅ Avg API response < 500ms
- ✅ PWA installs successful iOS + Android

---

## RISK MITIGATION

| Risk | Mitigation |
|------|-----------|
| **MQTT motion events don't stream** | Test WebSocket early (Week 1). Have polling fallback. |
| **Tailscale cert generation fails** | Test cert generation in Docker locally first. Manual fallback documented. |
| **Performance issues on Pi** | Monitor Phase 4. If slow, implement image compression + pagination. |
| **DeepSeek rate limits** | Add rate limiting (10 req/min). Document in README. |
| **iOS PWA install fails** | Verify manifest.json early. Test multiple Safari versions. |

---

**Owner:** RealPhantomLee | **Status:** Ready to execute | **Last updated:** 2026-06-23
