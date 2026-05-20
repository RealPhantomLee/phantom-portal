"""
Ollama Cluster Manager — Distributes inference across multiple Ollama instances.
Supports load balancing, model pulling, and failover.
"""

import asyncio
import aiohttp
import logging
from typing import Optional
from backend.config import get_settings

log = logging.getLogger(__name__)


class OllamaNode:
    """Represents a single Ollama instance in the cluster."""

    def __init__(self, name: str, url: str, priority: int = 0, specialization: str = None):
        self.name = name
        self.url = url.rstrip('/')
        self.priority = priority  # Lower = higher priority
        self.healthy = True
        self.loaded_models = set()
        self.specialization = specialization  # e.g., "embeddings", "llm", None (general)

    async def health_check(self) -> bool:
        """Check if this node is responsive."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.url}/api/tags", timeout=aiohttp.ClientTimeout(total=5)) as resp:
                    self.healthy = resp.status == 200
                    if self.healthy:
                        data = await resp.json()
                        self.loaded_models = {m['name'] for m in data.get('models', [])}
                    return self.healthy
        except Exception as e:
            log.error(f"Health check failed for {self.name}: {e}")
            self.healthy = False
            return False

    async def pull_model(self, model: str) -> bool:
        """Pull a model to this node."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(f"{self.url}/api/pull", json={"name": model}) as resp:
                    if resp.status == 200:
                        self.loaded_models.add(model)
                        return True
                    return False
        except Exception as e:
            log.error(f"Failed to pull {model} to {self.name}: {e}")
            return False

    async def generate(self, model: str, prompt: str, **kwargs) -> dict:
        """Generate a response using this node."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.url}/api/generate",
                    json={"model": model, "prompt": prompt, **kwargs},
                    timeout=aiohttp.ClientTimeout(total=None)  # Streaming, no timeout
                ) as resp:
                    if resp.status == 200:
                        return await resp.json()
                    return {"error": f"HTTP {resp.status}"}
        except Exception as e:
            log.error(f"Generation failed on {self.name}: {e}")
            return {"error": str(e)}


class OllamaCluster:
    """Manages a cluster of Ollama instances with load balancing."""

    def __init__(self):
        self.nodes = []
        self._initialize_nodes()

    def _initialize_nodes(self):
        """Set up Ollama nodes from config."""
        settings = get_settings()

        # Main Pi (primary, general LLM)
        self.nodes.append(OllamaNode(
            name="main-pi",
            url=f"http://{settings.mosquitto.host}:11434",  # localhost on main Pi
            priority=0,
            specialization="llm"  # Chat, narration, titles, key-points
        ))

        # AI Pi (specialized for embeddings and reasoning)
        self.nodes.append(OllamaNode(
            name="ai-pi",
            url="http://192.168.1.15:11434",
            priority=1,
            specialization="embeddings"  # Embeddings + reasoning backup
        ))

    async def initialize(self):
        """Run health checks and sync models across cluster."""
        for node in self.nodes:
            await node.health_check()
            log.info(f"Node {node.name}: healthy={node.healthy}, models={len(node.loaded_models)}")

    async def ensure_model(self, model: str) -> bool:
        """Ensure a model is available on at least one healthy node."""
        healthy_nodes = [n for n in self.nodes if n.healthy]

        # Check if already loaded on any node
        for node in healthy_nodes:
            if model in node.loaded_models:
                return True

        # Pull to primary node
        if healthy_nodes:
            log.info(f"Pulling {model} to {healthy_nodes[0].name}")
            return await healthy_nodes[0].pull_model(model)

        return False

    async def generate_streaming(self, model: str, prompt: str, **kwargs):
        """Stream generation response across cluster with smart routing."""
        # Determine if this is an embedding request by checking model name
        is_embedding = self._is_embedding_model(model)

        # Get candidate nodes based on request type
        if is_embedding:
            candidate_nodes = self._route_embedding_request(model)
        else:
            candidate_nodes = self._route_llm_request(model)

        if not candidate_nodes:
            raise RuntimeError("No healthy Ollama nodes available for this request")

        # Try each candidate node
        for node in candidate_nodes:
            try:
                response = await node.generate(model, prompt, **kwargs)
                if "error" not in response:
                    return response
            except Exception as e:
                log.warning(f"Generation failed on {node.name}, trying next: {e}")
                continue

        raise RuntimeError(f"Failed to generate on any cluster node for model {model}")

    def _is_embedding_model(self, model: str) -> bool:
        """Check if model is an embedding model."""
        embedding_models = [
            "nomic-embed-text",
            "deepseek-embed",
            "mxbai-embed",
            "bge",
        ]
        return any(em in model.lower() for em in embedding_models)

    def _route_embedding_request(self, model: str) -> list:
        """Route embedding requests to specialized AI Pi node."""
        healthy_nodes = [n for n in self.nodes if n.healthy]

        # Try to use AI Pi (specialized) first
        ai_pi = next((n for n in healthy_nodes if n.name == "ai-pi"), None)
        if ai_pi and "nomic-embed-text" in ai_pi.loaded_models:
            return [ai_pi]

        # Fallback: use any healthy node with the model
        fallback = [n for n in healthy_nodes if model in n.loaded_models]
        if fallback:
            return sorted(fallback, key=lambda n: n.priority)

        # Last resort: use any healthy node (may pull model)
        return sorted(healthy_nodes, key=lambda n: n.priority)

    def _route_llm_request(self, model: str) -> list:
        """Route LLM requests (chat, narration, titles, key-points) to main Pi."""
        healthy_nodes = [n for n in self.nodes if n.healthy]

        # Prefer main Pi for general LLM tasks
        main_pi = next((n for n in healthy_nodes if n.name == "main-pi"), None)
        if main_pi:
            return [main_pi] + [n for n in healthy_nodes if n.name != "main-pi"]

        # Fallback: any healthy node with the model
        fallback = [n for n in healthy_nodes if model in n.loaded_models]
        if fallback:
            return sorted(fallback, key=lambda n: n.priority)

        # Last resort: sorted by priority
        return sorted(healthy_nodes, key=lambda n: n.priority)

    async def get_loaded_models(self) -> dict:
        """Get all models loaded across the cluster."""
        all_models = {}
        for node in self.nodes:
            all_models[node.name] = list(node.loaded_models)
        return all_models


# Singleton instance
_cluster = None


def get_ollama_cluster() -> OllamaCluster:
    """Get or initialize the Ollama cluster."""
    global _cluster
    if _cluster is None:
        _cluster = OllamaCluster()
    return _cluster
