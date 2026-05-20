# Phantom Portal - Build & Deployment Checklist

## Pre-Deployment Verification

### Type Safety
- [x] All components have full TypeScript support
- [x] No `any` types used (all properly typed)
- [x] Type definitions in `src/types/index.ts`
- [x] Zustand stores fully typed
- [x] API client responses typed

**Action**: Run type check
```bash
npm run type-check
```

### Build Verification
- [x] No console warnings or errors
- [x] All imports resolve correctly
- [x] Tree-shaking ready (ES modules)
- [x] No circular dependencies

**Action**: Build and test
```bash
npm run build
```

### Testing
- [ ] Unit tests for stores (recommended)
- [ ] Component integration tests (recommended)
- [ ] API mock tests (recommended)
- [ ] E2E tests with real backend (recommended)

**Action**: Create test files
```bash
# Example test structure
src/__tests__/
├── stores/
│   ├── security.test.ts
│   ├── homeassistant.test.ts
│   └── notes.test.ts
├── api/
│   ├── client.test.ts
│   └── websocket.test.ts
└── panels/
    ├── SecurityPanel.test.tsx
    ├── HomePanel.test.tsx
    └── NotesPanel.test.tsx
```

### Code Quality
- [x] Error boundaries implemented
- [x] Loading states for all async operations
- [x] Error handling for API calls
- [x] WebSocket reconnection logic
- [x] Memory leak prevention (cleanup)
- [x] Responsive design mobile-first

**Action**: Code review checklist
```
✓ Review SecurityPanel.tsx
✓ Review HomePanel.tsx
✓ Review NotesPanel.tsx
✓ Review all Zustand stores
✓ Review API client and WebSocket manager
```

## Backend Integration

### Required API Endpoints
- [x] `/api/security/cameras` - GET list cameras
- [x] `/api/security/snapshot/{id}` - GET camera snapshot
- [x] `/api/security/events` - GET motion events
- [x] `/api/security/arm` - POST arm/disarm
- [x] `/api/ha/devices` - GET HA devices
- [x] `/api/ha/light/{id}` - POST light control
- [x] `/api/ha/switch/{id}` - POST switch control
- [x] `/api/ha/scene/{id}` - POST scene activation
- [x] `/api/notes` - GET/POST notes
- [x] `/api/notes/{id}` - GET/PUT/DELETE note
- [x] `/api/notes/{id}/export` - GET export
- [x] `/api/ai/generate-title` - POST AI title
- [x] `/api/ai/generate-key-points` - POST AI points
- [x] `/ws/security` - WebSocket motion events
- [x] `/ws/sync` - WebSocket note sync

**Action**: Verify backend implementation
```bash
# Test endpoints
curl http://localhost:8000/health
curl http://localhost:8000/api/security/cameras
curl http://localhost:8000/api/ha/devices
```

## Environment Configuration

### Development (.env.local)
```bash
VITE_API_BASE=http://localhost:8000
VITE_WS_SECURITY=ws://localhost:8000/ws/security
VITE_WS_SYNC=ws://localhost:8000/ws/sync
```

### Production (.env.production)
```bash
VITE_API_BASE=https://cyberdeck.tail3ab12c.ts.net
VITE_WS_SECURITY=wss://cyberdeck.tail3ab12c.ts.net/ws/security
VITE_WS_SYNC=wss://cyberdeck.tail3ab12c.ts.net/ws/sync
```

**Action**: Create environment files
```bash
cp .env.example .env.local
```

## Browser Testing

### Desktop Browsers
- [ ] Chrome/Chromium (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile Browsers
- [ ] iOS Safari
- [ ] Android Chrome
- [ ] Mobile Firefox

### Responsive Testing
- [ ] 320px (mobile)
- [ ] 768px (tablet)
- [ ] 1024px (desktop)
- [ ] 1440px (large desktop)

**Action**: Test in multiple browsers
```bash
npm run build
npm run preview
# Open in different browsers
```

## Performance Optimization

### Bundle Size
- [x] Tree-shakeable imports
- [x] No unused dependencies
- [x] Code splitting ready (Vite)

**Targets**:
- Main bundle: < 100KB gzipped
- Vendor bundle: < 150KB gzipped

**Action**: Analyze bundle
```bash
npm run build
# Check dist/ folder size
ls -lh dist/
```

### Runtime Performance
- [x] WebSocket for real-time (not polling)
- [x] Auto-save debouncing (1s)
- [x] Event pagination (100 items)
- [x] Zustand instead of Redux

**Action**: Profile in DevTools
```
- Open Chrome DevTools
- Performance tab
- Record interactions
- Check frame rate (target: 60fps)
```

## Security Checklist

- [x] HTTPS/WSS for production
- [x] CORS headers configured on backend
- [x] No sensitive data in localStorage (yet)
- [x] No inline scripts
- [x] CSP headers recommended on backend

**Action**: Security audit
```bash
# Check for console errors on localhost
npm run dev
# Check browser console
```

## Deployment Options

### Option 1: Docker Container
**File**: `frontend/Dockerfile`
```bash
docker build -f frontend/Dockerfile -t phantom-frontend:latest .
docker run -p 3000:80 phantom-frontend:latest
```

### Option 2: Static Hosting (Netlify, Vercel)
```bash
npm run build
# Deploy dist/ folder
```

### Option 3: Kubernetes
```bash
# Build and push image
docker build -t your-registry/phantom-frontend:latest .
docker push your-registry/phantom-frontend:latest

# Deploy with Helm or kubectl
kubectl apply -f k8s/frontend.yaml
```

### Option 4: systemd Service
```bash
# Build
npm run build

# Copy to production location
sudo cp -r dist/* /var/www/phantom/

# Configure nginx/apache
# Configure systemd if needed
```

## Pre-Launch Checklist

### Code Review
- [ ] All TypeScript types reviewed
- [ ] Error handling covers edge cases
- [ ] No console.log in production code
- [ ] No hardcoded credentials or secrets
- [ ] Comments added for complex logic

### Testing
- [ ] Manual smoke test on all panels
- [ ] WebSocket reconnection tested
- [ ] Error states tested
- [ ] Mobile responsiveness verified
- [ ] Performance profiled

### Documentation
- [ ] README.md updated
- [ ] INTEGRATION_GUIDE.md reviewed
- [ ] API documentation updated
- [ ] Deployment guide finalized
- [ ] Troubleshooting guide added

### DevOps
- [ ] Environment variables configured
- [ ] SSL/TLS certificates ready
- [ ] Backend API accessible
- [ ] Database migrations complete
- [ ] Monitoring/logging configured

### Monitoring
- [ ] Error tracking (Sentry) configured
- [ ] Performance monitoring active
- [ ] WebSocket connection monitoring
- [ ] API response time monitoring
- [ ] User analytics (optional)

## Post-Launch Monitoring

### Daily Checks
- [ ] Error logs reviewed
- [ ] WebSocket connections stable
- [ ] API response times normal
- [ ] No JavaScript errors in production

### Weekly Checks
- [ ] Performance metrics reviewed
- [ ] Bundle size hasn't increased
- [ ] Security updates available?
- [ ] Dependencies need updates?

### Monthly Checks
- [ ] User feedback reviewed
- [ ] Feature requests collected
- [ ] Performance optimization opportunities
- [ ] Security audit completed

## Rollback Plan

If issues occur:

1. **Quick Rollback**
```bash
# Switch to previous image tag
docker run -p 3000:80 phantom-frontend:previous
```

2. **Emergency Fix**
```bash
# Hotfix branch
git checkout -b hotfix/issue-name
# Fix issue
npm run build
# Deploy emergency build
```

3. **Communication**
- Notify users of issue
- Provide ETA for fix
- Post-mortem after resolution

## Maintenance Schedule

### Weekly
- [ ] Review error logs
- [ ] Check performance metrics
- [ ] Review user feedback

### Monthly
- [ ] Security scanning
- [ ] Dependency updates
- [ ] Performance optimization review

### Quarterly
- [ ] Full security audit
- [ ] Major dependency upgrades
- [ ] Architecture review
- [ ] Capacity planning

## Documentation Links

- [PANELS.md](./PANELS.md) - Component documentation
- [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) - Integration instructions
- [COMPONENTS_SUMMARY.md](./COMPONENTS_SUMMARY.md) - Components overview
- [CREATED_FILES.txt](./CREATED_FILES.txt) - File listing

## Support Resources

### For Developers
- React docs: https://react.dev
- Zustand docs: https://github.com/pmndrs/zustand
- Tailwind docs: https://tailwindcss.com
- Vite docs: https://vitejs.dev

### For DevOps
- Docker docs: https://docs.docker.com
- Nginx docs: https://nginx.org/en/docs/
- Kubernetes docs: https://kubernetes.io/docs/

### Troubleshooting
See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md#troubleshooting)

## Final Sign-Off

- [ ] All tests passing
- [ ] Code review completed
- [ ] Documentation complete
- [ ] Backend integration verified
- [ ] Performance acceptable
- [ ] Security audit passed
- [ ] Deployment ready

**Approved by**: ________________
**Date**: ________________
**Version**: 0.1.0
