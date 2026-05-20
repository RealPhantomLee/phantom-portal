# AI Pi Ollama Model Setup Guide

## Overview

This guide configures the AI Pi (REDACTED_LAN_IP) with 4 optimized Ollama models for distributed inference in the Phantom Portal cluster. The AI Pi will handle embeddings and specialized tasks, offloading work from the main Pi.

**Target System**: AI Pi with 8GB RAM  
**Total Model Size**: ~8.5GB  
**Status**: 0 models currently loaded

---

## Step 1: Pull Models on AI Pi (REDACTED_LAN_IP)

Run this on the AI Pi machine:

```bash
# Copy the setup script and run it
bash ai-pi-setup.sh
```

**Or run commands manually:**

```bash
# Ensure Ollama is running
# ollama serve

# Model 1: Llama 3.2 3B (2GB) — Fast general chat
ollama pull llama3.2:3b

# Model 2: Mistral 7B (4GB) — Strong reasoning
ollama pull mistral:7b

# Model 3: Nomic Embed Text (274MB) — Semantic embeddings
ollama pull nomic-embed-text

# Model 4: Phi 3 Mini (2.3GB) — Quick QA/titles
ollama pull phi3:mini
```

**Verify models are loaded:**

```bash
curl http://localhost:11434/api/tags | python3 -m json.tool
```

Expected output:
```json
{
  "models": [
    {"name": "llama3.2:3b", ...},
    {"name": "mistral:7b", ...},
    {"name": "nomic-embed-text", ...},
    {"name": "phi3:mini", ...}
  ]
}
```

**From the Main Pi, verify cluster connectivity:**

```bash
curl http://REDACTED_LAN_IP:11434/api/tags | python3 -m json.tool
```

---

## Step 2: Update phantom.config.yaml (Main Pi)

The config already points to the local Ollama cluster. Ensure this section is set:

```yaml
deepseek:
  api_key: "ollama"
  base_url: "http://localhost:11434/v1"
  model: "neural-chat"  # or any model on the cluster
  # Cluster setup: Main Pi (localhost) + AI Pi (REDACTED_LAN_IP)
```

The OpenAI-compatible API routes all requests through the cluster, which now intelligently distributes them.

---

## Step 3: Router Configuration (ollama_cluster.py)

**The updated ollama_cluster.py now includes smart routing:**

### Model Allocation

**AI Pi (REDACTED_LAN_IP) — Specialization: Embeddings**
- `llama3.2:3b` — Fast chat backup
- `mistral:7b` — Reasoning backup
- `nomic-embed-text` — PRIMARY embedding model
- `phi3:mini` — Title/QA generation

**Main Pi (localhost) — Specialization: LLM**
- Any models pulled here
- Primary for chat, narration, title suggestions, key-points extraction

### Routing Logic

The updated cluster now uses smart routing:

```python
# Embedding requests → AI Pi's nomic-embed-text
# "nomic-embed-text" request
#   → AI Pi (preferred, specialized)
#   → Fallback to any healthy node with model
#   → Last resort: any healthy node (pulls model)

# LLM requests (chat, narration, titles, key-points) → Main Pi
# "neural-chat" or other LLM request
#   → Main Pi (preferred, general LLM)
#   → Fallback to AI Pi
#   → Last resort: any healthy node

# Priority fallback order
main-pi (priority=0) → ai-pi (priority=1)
```

### Key Changes to `ollama_cluster.py`

1. **Node Specialization**: Each node is marked with a `specialization` (e.g., "embeddings", "llm")

2. **Smart Routing Methods**:
   - `_is_embedding_model(model)` — Detects embedding requests
   - `_route_embedding_request(model)` — Routes to AI Pi
   - `_route_llm_request(model)` — Routes to Main Pi

3. **Fallback Chain**: Each routing method implements graceful fallback:
   - Primary node with model loaded
   - Any healthy node with model loaded
   - Any healthy node (may trigger model pull)

---

## Step 4: AI Service Updates (ai_service.py)

**Embedding Model Update**:
- Changed from `deepseek-chat` → `nomic-embed-text`
- Routes through cluster to AI Pi
- Nomic is smaller (274MB) and faster than DeepSeek embeddings

```python
def embed_text(self, text: str) -> list[float]:
    response = self._sync_client.embeddings.create(
        model="nomic-embed-text",  # Routed to AI Pi
        input=text,
    )
    return response.data[0].embedding
```

---

## Model Usage by Task

| Task | Model | Node | Purpose |
|------|-------|------|---------|
| **Chat/Streaming** | neural-chat, llama3.2:3b | Main Pi → AI Pi | General conversation |
| **Narration** (motion alerts) | neural-chat | Main Pi → AI Pi | Security event descriptions |
| **Title Suggestions** | phi3:mini | AI Pi (optimized) | Quick generation |
| **Key Point Extraction** | neural-chat | Main Pi → AI Pi | Note summarization |
| **Embeddings** (semantic search) | nomic-embed-text | AI Pi (primary) | Note retrieval & search |
| **Reasoning Tasks** | mistral:7b | AI Pi (backup) | Complex analysis |

---

## Cluster Status Endpoints

Check cluster health on Main Pi:

```bash
# Cluster status (node health, loaded models)
curl http://localhost:8000/api/cluster/status | python3 -m json.tool

# All models in cluster
curl http://localhost:8000/api/cluster/models | python3 -m json.tool

# Health check (ping all nodes)
curl -X POST http://localhost:8000/api/cluster/health-check | python3 -m json.tool
```

---

## Troubleshooting

### AI Pi models not visible from Main Pi
```bash
# On Main Pi, check network connectivity
ping REDACTED_LAN_IP
curl http://REDACTED_LAN_IP:11434/api/tags

# Verify firewall rules allow port 11434
sudo ufw allow 11434
```

### Embedding requests timing out
- Check `nomic-embed-text` is loaded on AI Pi: `curl http://REDACTED_LAN_IP:11434/api/tags`
- Verify AI Pi Ollama is running: `ps aux | grep ollama`
- Check network latency: `ping -c 5 REDACTED_LAN_IP`

### Model pull failures
- Ensure AI Pi has 8GB available: `free -h`
- Check disk space: `df -h`
- Pull models one at a time with output: `ollama pull llama3.2:3b`

### Fallback behavior (model not found)
If a model isn't found on the preferred node, the cluster will:
1. Search for model on secondary node
2. Attempt to pull model if needed
3. Fall back to available model for task type

---

## Performance Expectations

With distributed cluster:
- **Embeddings**: 5-10ms (AI Pi, no network latency to semantic search)
- **Chat responses**: 500-2000ms (Main Pi LLM)
- **Title generation**: 300-800ms (phi3:mini on AI Pi)
- **Key point extraction**: 1-3s (mistral or neural-chat)

Estimated power draw:
- **Main Pi**: ~2-3A @ 5V (1 model loaded)
- **AI Pi**: ~2-3A @ 5V (3-4 models loaded)
- **Total**: ~10-12W at idle, ~30-40W under load

---

## Configuration Files Updated

1. **ai-pi-setup.sh** — Setup script to pull models
2. **backend/services/ollama_cluster.py** — Smart routing logic
3. **backend/services/ai_service.py** — Embedding model updated
4. **phantom.config.yaml** — Already configured for cluster

---

## Next Steps

1. **Run ai-pi-setup.sh on AI Pi** to pull models
2. **Verify connectivity** from Main Pi to AI Pi
3. **Test embedding API**: `curl http://localhost:8000/api/notes/search` (uses embeddings)
4. **Monitor cluster status** via `/api/cluster/status` endpoint
5. **Observe routing** in logs: `tail -f logs/phantom.log | grep "cluster\|routing\|node"`

---

## References

- **Llama 3.2 3B**: Fast, efficient chat model
- **Mistral 7B**: Excellent reasoning, fact recall
- **Nomic Embed Text**: Lightweight embeddings for semantic search
- **Phi 3 Mini**: Fast QA and text generation

All models are open-source and run locally on-device.
