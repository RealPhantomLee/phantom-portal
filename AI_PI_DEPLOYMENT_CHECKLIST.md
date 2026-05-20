# AI Pi Ollama Models — Deployment Checklist

**Project**: Phantom Portal — Distributed Inference Cluster  
**Target**: AI Pi (192.168.1.15) with 8GB RAM  
**Models**: 4 optimized for distributed tasks  
**Total Size**: ~8.5GB  
**Time to Deploy**: ~30-45 minutes  
**Status**: ✅ Ready for deployment  

---

## Pre-Deployment Checklist

- [ ] AI Pi reachable: `ping 192.168.1.15`
- [ ] Ollama running on AI Pi: `curl http://192.168.1.15:11434/api/tags`
- [ ] Main Pi has network access to AI Pi port 11434
- [ ] AI Pi has 8.5GB free disk space: `df -h` should show ~10GB available
- [ ] AI Pi has 8GB RAM: `free -h` should show 8GB total
- [ ] No models currently loaded on AI Pi: `curl http://192.168.1.15:11434/api/tags | jq '.models | length'` = 0

---

## Phase 1: Setup Script Deployment

### 1.1 Copy Setup Script to AI Pi
```bash
# From Main Pi, copy the script
scp /home/jolly/Projects/phantom/ai-pi-setup.sh 192.168.1.15:~/

# Verify it arrived
ssh 192.168.1.15 "ls -lh ~/ai-pi-setup.sh"
```

**Checklist**:
- [ ] Script copied successfully
- [ ] Script is executable: `ssh 192.168.1.15 "test -x ~/ai-pi-setup.sh && echo 'OK'"`

### 1.2 Run Setup Script on AI Pi
```bash
# SSH into AI Pi
ssh 192.168.1.15

# Run the setup script (will take 30-45 minutes)
bash ~/ai-pi-setup.sh

# Expected output:
# - [1/4] Pulling llama3.2:3b
# - [2/4] Pulling mistral:7b
# - [3/4] Pulling nomic-embed-text
# - [4/4] Pulling phi3:mini
# - JSON output showing all 4 models loaded
```

**Checklist**:
- [ ] Script execution started
- [ ] No network errors during pulls
- [ ] All 4 models show in JSON output at end
- [ ] AI Pi still responsive after script completes

---

## Phase 2: Verification on Main Pi

### 2.1 Network Connectivity
```bash
# From Main Pi, verify AI Pi is reachable
ping -c 3 192.168.1.15

# Expected: 3 packets transmitted, 3 received, 0% packet loss
```

**Checklist**:
- [ ] Ping successful
- [ ] Latency <100ms

### 2.2 Direct Model Access
```bash
# From Main Pi, check models on AI Pi
curl http://192.168.1.15:11434/api/tags | python3 -m json.tool

# Expected output:
# {
#   "models": [
#     {"name": "llama3.2:3b", ...},
#     {"name": "mistral:7b", ...},
#     {"name": "nomic-embed-text", ...},
#     {"name": "phi3:mini", ...}
#   ]
# }
```

**Checklist**:
- [ ] All 4 models visible
- [ ] Each model has valid metadata
- [ ] Response time <1s

### 2.3 Verify Code Updates
```bash
# Check that updated files exist
ls -lh /home/jolly/Projects/phantom/backend/services/ollama_cluster.py
ls -lh /home/jolly/Projects/phantom/backend/services/ai_service.py

# Verify routing logic is in place
grep -n "_route_embedding_request\|_route_llm_request" \
  /home/jolly/Projects/phantom/backend/services/ollama_cluster.py
```

**Checklist**:
- [ ] ollama_cluster.py updated (should be > 190 lines)
- [ ] ai_service.py uses nomic-embed-text
- [ ] Routing methods are present in code

---

## Phase 3: Backend Integration

### 3.1 Restart Phantom Backend
```bash
# Option A: Direct Python
cd /home/jolly/Projects/phantom
python -m backend.main

# Option B: systemd (if configured)
sudo systemctl restart phantom-backend

# Option C: Docker (if containerized)
docker-compose down && docker-compose up
```

**Checklist**:
- [ ] Backend starts without errors
- [ ] No import errors related to ollama_cluster
- [ ] Backend logs show cluster initialization

### 3.2 Monitor Backend Startup
```bash
# Watch logs for cluster initialization
tail -f /var/log/phantom/backend.log | grep -i "cluster\|initialize\|node"

# Expected log messages:
# - "Node main-pi: healthy=true, models=..."
# - "Node ai-pi: healthy=true, models=..."
```

**Checklist**:
- [ ] Cluster initialization logged
- [ ] Both nodes report as healthy
- [ ] AI Pi models detected in logs

---

## Phase 4: Cluster Health Verification

### 4.1 Query Cluster Status Endpoint
```bash
# From any machine with access to Main Pi:8000
curl http://localhost:8000/api/cluster/status | python3 -m json.tool

# Expected response:
# {
#   "nodes": [
#     {
#       "name": "main-pi",
#       "url": "http://localhost:11434",
#       "healthy": true,
#       "models": [...],
#       "priority": 0
#     },
#     {
#       "name": "ai-pi",
#       "url": "http://192.168.1.15:11434",
#       "healthy": true,
#       "models": ["llama3.2:3b", "mistral:7b", "nomic-embed-text", "phi3:mini"],
#       "priority": 1
#     }
#   ]
# }
```

**Checklist**:
- [ ] Endpoint responds with valid JSON
- [ ] main-pi shows healthy=true
- [ ] ai-pi shows healthy=true
- [ ] ai-pi shows all 4 models loaded
- [ ] Priority values correct (main-pi=0, ai-pi=1)

### 4.2 Check Loaded Models Across Cluster
```bash
curl http://localhost:8000/api/cluster/models | python3 -m json.tool

# Expected response shows models on each node:
# {
#   "main-pi": [...models on main pi...],
#   "ai-pi": ["llama3.2:3b", "mistral:7b", "nomic-embed-text", "phi3:mini"]
# }
```

**Checklist**:
- [ ] Endpoint returns valid JSON
- [ ] AI Pi section lists all 4 models
- [ ] Main Pi section shows expected models

### 4.3 Run Health Checks
```bash
curl -X POST http://localhost:8000/api/cluster/health-check | python3 -m json.tool

# Expected response:
# {
#   "main-pi": true,
#   "ai-pi": true
# }
```

**Checklist**:
- [ ] Both nodes report healthy
- [ ] Response time <2s
- [ ] No health check errors in logs

---

## Phase 5: Routing Behavior Verification

### 5.1 Test Embedding Routing (Should go to AI Pi)
```bash
# Add debug logging to see which node handles request:
# Edit phantom.config.yaml or logging.conf to enable DEBUG level

# Then make an embedding request:
curl -X POST http://localhost:8000/api/notes \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "content": "Test note for embedding"}'

# Check logs for routing info:
tail -f /var/log/phantom/backend.log | grep -i "ai-pi\|embedding\|route"

# Should see log entries showing request routed to AI Pi
```

**Checklist**:
- [ ] Embedding requests logged as going to AI Pi
- [ ] nomic-embed-text model used
- [ ] Response contains valid embedding vector

### 5.2 Test LLM Routing (Should prefer Main Pi)
```bash
# Make a chat request:
curl -X POST http://localhost:8000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "Hello"}'

# Check logs:
tail -f /var/log/phantom/backend.log | grep -i "main-pi\|route"

# Should see log entries showing preference for Main Pi
```

**Checklist**:
- [ ] Chat requests prefer Main Pi
- [ ] Routing logs show decision chain
- [ ] Fallback to AI Pi if Main Pi unavailable

### 5.3 Monitor Request Distribution
```bash
# Watch cluster logs for request distribution:
while true; do
  date
  curl -s http://localhost:8000/api/cluster/status | jq '.nodes[] | "\(.name): \(.models | length) models"'
  sleep 5
done
```

**Checklist**:
- [ ] Models remain loaded on AI Pi
- [ ] No unexpected unloading
- [ ] Response times reasonable

---

## Phase 6: Performance Validation

### 6.1 Measure Embedding Performance
```bash
# Create a test script to measure embedding latency:
cat > test_embeddings.py << 'EOF'
import time
from backend.services.ai_service import DeepSeekClient

client = DeepSeekClient()
test_text = "This is a test text for embedding performance measurement."

# Warm up
client.embed_text(test_text)

# Measure 5 requests
times = []
for i in range(5):
    start = time.time()
    embedding = client.embed_text(test_text)
    elapsed = (time.time() - start) * 1000
    times.append(elapsed)
    print(f"Request {i+1}: {elapsed:.1f}ms, embedding length: {len(embedding)}")

avg = sum(times) / len(times)
print(f"\nAverage: {avg:.1f}ms")
print(f"Expected: 5-10ms (AI Pi), >50ms (cloud)")
EOF

python test_embeddings.py
```

**Checklist**:
- [ ] Embedding latency < 20ms (indicates local/AI Pi)
- [ ] All embeddings have 384 dimensions (nomic-embed-text standard)
- [ ] No embedding errors in logs

### 6.2 Measure Chat Response Time
```bash
# Use curl with timing:
curl -w "\n\nTotal time: %{time_total}s\n" \
  -X POST http://localhost:8000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "Say hello"}'

# Expected: 1-3 seconds for complete response
```

**Checklist**:
- [ ] Chat responses complete in <3s
- [ ] Time consistent across multiple requests
- [ ] Response quality acceptable

### 6.3 Check Memory/CPU Usage
```bash
# On Main Pi
free -h  # Should show reasonable memory usage
ps aux | grep ollama | grep -v grep  # Check process memory

# On AI Pi
ssh 192.168.1.15 "free -h && ps aux | grep ollama | grep -v grep"

# Expected:
# Main Pi: 2-4GB used
# AI Pi: 6-7GB used
# Both: CPU idle or <50% during requests
```

**Checklist**:
- [ ] Memory usage reasonable
- [ ] No out-of-memory errors
- [ ] CPU not maxed out
- [ ] Thermal stable (no throttling)

---

## Phase 7: Documentation & Handoff

### 7.1 Update Project Documentation
```bash
# Ensure all docs are in place:
ls -l /home/jolly/Projects/phantom/*PI*.md
ls -l /home/jolly/Projects/phantom/DEPLOYMENT*.md

# Check for:
# - AI_PI_SETUP.md (comprehensive guide)
# - AI_PI_QUICK_REFERENCE.md (quick start)
# - DEPLOYMENT_SUMMARY.md (summary report)
# - This checklist file
```

**Checklist**:
- [ ] AI_PI_SETUP.md exists and contains instructions
- [ ] AI_PI_QUICK_REFERENCE.md has quick-start info
- [ ] DEPLOYMENT_SUMMARY.md documents changes
- [ ] All documentation accurate for deployed system

### 7.2 Verify Configuration Backups
```bash
# Backup current configuration:
cp /home/jolly/Projects/phantom/phantom.config.yaml \
   /home/jolly/Projects/phantom/phantom.config.yaml.backup-$(date +%Y%m%d)

cp /home/jolly/Projects/phantom/backend/services/ollama_cluster.py \
   /home/jolly/Projects/phantom/backend/services/ollama_cluster.py.backup-$(date +%Y%m%d)

# List backups
ls -lh /home/jolly/Projects/phantom/*.backup* 2>/dev/null
```

**Checklist**:
- [ ] Configuration backed up
- [ ] Code backed up
- [ ] Backups dated and organized

### 7.3 Document Cluster Health Baseline
```bash
# Take baseline measurements:
echo "=== Cluster Health Baseline ===" > /tmp/cluster_baseline.txt
date >> /tmp/cluster_baseline.txt
echo "" >> /tmp/cluster_baseline.txt

echo "Status:" >> /tmp/cluster_baseline.txt
curl -s http://localhost:8000/api/cluster/status | jq . >> /tmp/cluster_baseline.txt

echo "" >> /tmp/cluster_baseline.txt
echo "Models:" >> /tmp/cluster_baseline.txt
curl -s http://localhost:8000/api/cluster/models | jq . >> /tmp/cluster_baseline.txt

cat /tmp/cluster_baseline.txt
```

**Checklist**:
- [ ] Baseline captured
- [ ] Both nodes healthy
- [ ] All expected models present
- [ ] Response times reasonable

---

## Post-Deployment: Monitoring Setup

### Regular Health Checks (Daily)
```bash
#!/bin/bash
# Save as /home/jolly/Projects/phantom/check-cluster-health.sh
curl -s http://localhost:8000/api/cluster/status | jq '.nodes[] | "\(.name): \(.healthy) - \(.models | length) models"'
```

**Checklist**:
- [ ] Health check script created
- [ ] Can be run from cron
- [ ] Output easy to parse

### Log Monitoring (Optional)
```bash
# Monitor cluster routing in real-time:
# tail -f /var/log/phantom/backend.log | grep -E "cluster|route|node|healthy"

# Or save to separate log:
# supervisord config should have:
# stderr_logfile = /var/log/phantom/cluster.log
```

**Checklist**:
- [ ] Logging configured
- [ ] Can track routing decisions
- [ ] Can identify issues

---

## Troubleshooting Quick Guide

| Issue | Check | Solution |
|-------|-------|----------|
| AI Pi not in cluster status | Network connectivity | `ping 192.168.1.15`, check firewall port 11434 |
| Models not visible on AI Pi | Models actually pulled | Run setup script again, check disk space |
| Embedding requests slow | Request routing | Check if nomic-embed-text loaded on AI Pi |
| Ollama OOM on AI Pi | Memory usage | `ssh 192.168.1.15 "free -h"`, reduce model count |
| Backend won't start | Import error | Check ollama_cluster.py syntax |
| High latency spikes | Network issues | Check network stability, packet loss |

See `AI_PI_SETUP.md` → Troubleshooting section for detailed guidance.

---

## Success Criteria (All Should Be True)

- ✅ 4 models pulled to AI Pi (llama3.2:3b, mistral:7b, nomic-embed-text, phi3:mini)
- ✅ Ollama cluster recognizes both nodes as healthy
- ✅ /api/cluster/status endpoint shows both nodes
- ✅ Embedding requests route to AI Pi (< 20ms latency)
- ✅ LLM requests prefer Main Pi
- ✅ Fallback routing works (manually simulate node failure)
- ✅ No errors in logs related to cluster operations
- ✅ Memory usage stable and reasonable
- ✅ All 4 models stay resident on AI Pi
- ✅ Performance meets expectations (see Phase 6)

---

## Sign-Off

**Deployment Prepared**: 2026-05-20  
**Checked By**: Claude Code  
**Status**: Ready for production deployment  

**Next Action**: Execute Phase 1 (copy and run ai-pi-setup.sh on AI Pi)

---

## Quick Links

- **Setup Guide**: [AI_PI_SETUP.md](./AI_PI_SETUP.md)
- **Quick Reference**: [AI_PI_QUICK_REFERENCE.md](./AI_PI_QUICK_REFERENCE.md)
- **Deployment Summary**: [DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md)
- **Setup Script**: [ai-pi-setup.sh](./ai-pi-setup.sh)
- **Cluster Code**: [backend/services/ollama_cluster.py](./backend/services/ollama_cluster.py)
- **AI Service**: [backend/services/ai_service.py](./backend/services/ai_service.py)

---

**Document Version**: 1.0  
**Last Updated**: 2026-05-20
