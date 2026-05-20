# AI Pi Setup - Quick Reference

## TL;DR: 3 Steps

### 1. On AI Pi (REDACTED_LAN_IP)
```bash
bash ai-pi-setup.sh
```
Or manually:
```bash
ollama pull llama3.2:3b
ollama pull mistral:7b
ollama pull nomic-embed-text
ollama pull phi3:mini
```

### 2. Verify from Main Pi
```bash
curl http://REDACTED_LAN_IP:11434/api/tags | python3 -m json.tool
curl http://localhost:8000/api/cluster/status | python3 -m json.tool
```

### 3. Code Already Updated
- ✅ `ollama_cluster.py` — Smart routing (AI Pi for embeddings, Main Pi for LLM)
- ✅ `ai_service.py` — Uses `nomic-embed-text` for embeddings
- ✅ `phantom.config.yaml` — Points to local cluster

---

## What Gets Deployed Where

```
┌─────────────────────────────────────────┐
│ Main Pi (localhost:11434)                │
│ • Specialization: LLM tasks              │
│ • Models: as needed                      │
│ • Tasks: chat, narration, key-points     │
│ • Priority: 0 (primary)                  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ AI Pi (REDACTED_LAN_IP:11434)               │
│ • Specialization: Embeddings             │
│ • Models: (4 pulled, ~8.5GB)             │
│ │ - llama3.2:3b (2GB)                    │
│ │ - mistral:7b (4GB)                     │
│ │ - nomic-embed-text (274MB) ⭐PRIMARY  │
│ │ - phi3:mini (2.3GB)                    │
│ • Tasks: embeddings, reasoning backup    │
│ • Priority: 1 (secondary)                │
└─────────────────────────────────────────┘
```

---

## Request Routing

```
Embedding Request (nomic-embed-text)
  → Try AI Pi (specialized) ✓
  → Fallback: any healthy node
  
LLM Request (chat, narration, titles, key-points)
  → Try Main Pi (primary) ✓
  → Fallback: AI Pi
  → Last resort: any healthy node
```

---

## Check Cluster Health

```bash
# All models in cluster
curl http://localhost:8000/api/cluster/models

# Node status
curl http://localhost:8000/api/cluster/status

# Health check
curl -X POST http://localhost:8000/api/cluster/health-check
```

---

## Model Capabilities

| Model | Size | Speed | Use Case |
|-------|------|-------|----------|
| **llama3.2:3b** | 2GB | Fast | General chat, fallback |
| **mistral:7b** | 4GB | Good | Reasoning, analysis |
| **nomic-embed-text** | 274MB | Fast | Semantic search ⭐ |
| **phi3:mini** | 2.3GB | Fast | Titles, QA |

---

## Common Tasks & Routes

| Task | Request | Model | Node | Time |
|------|---------|-------|------|------|
| Chat | `POST /api/ai/chat` | neural-chat | Main Pi → AI Pi | 500-2000ms |
| Embed | `embed_text()` | nomic-embed-text | AI Pi | 5-10ms |
| Titles | `suggest_titles()` | phi3:mini | AI Pi | 300-800ms |
| Narrate | `narrate_motion_event()` | neural-chat | Main Pi → AI Pi | 500-1000ms |
| Key Points | `extract_key_points()` | neural-chat | Main Pi → AI Pi | 1-3s |

---

## Troubleshooting Checklist

- [ ] Ollama running on both Pis: `ps aux | grep ollama`
- [ ] Models pulled on AI Pi: `curl http://REDACTED_LAN_IP:11434/api/tags`
- [ ] Network connectivity: `ping REDACTED_LAN_IP`
- [ ] Port 11434 open: `curl http://REDACTED_LAN_IP:11434` should respond
- [ ] Cluster sees AI Pi: `curl http://localhost:8000/api/cluster/status`
- [ ] Disk space on AI Pi: `df -h` (need ~8.5GB)
- [ ] Memory on AI Pi: `free -h` (8GB available)

---

## Files Modified

- `ai-pi-setup.sh` — NEW: Model pulldown script
- `AI_PI_SETUP.md` — NEW: Detailed setup guide
- `backend/services/ollama_cluster.py` — UPDATED: Smart routing
- `backend/services/ai_service.py` — UPDATED: Use nomic-embed-text
- `phantom.config.yaml` — VERIFIED: Already configured

---

## Performance Targets

- **Embeddings**: 5-10ms (AI Pi local)
- **Chat**: 500-2000ms (Main Pi)
- **Titles**: 300-800ms (AI Pi)
- **Power**: ~30-40W under load (both Pis)

---

## Ready to Deploy?

```bash
# 1. Copy ai-pi-setup.sh to AI Pi and run it
scp ai-pi-setup.sh REDACTED_LAN_IP:~/
ssh REDACTED_LAN_IP "bash ~/ai-pi-setup.sh"

# 2. Verify from Main Pi
curl http://REDACTED_LAN_IP:11434/api/tags | python3 -m json.tool

# 3. Restart Phantom backend to pick up routing
# (changes to ollama_cluster.py take effect on next startup)

# 4. Test embeddings
curl http://localhost:8000/api/cluster/models
```

Done! 🚀
