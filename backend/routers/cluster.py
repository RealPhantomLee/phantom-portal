"""
Ollama cluster management endpoints.
Provides cluster status, model distribution, and cluster operations.
"""

from fastapi import APIRouter
from backend.services.ollama_cluster import get_ollama_cluster

router = APIRouter(prefix="/api/cluster", tags=["cluster"])


@router.get("/status")
async def cluster_status():
    """Get cluster health and node status."""
    cluster = get_ollama_cluster()
    return {
        "nodes": [
            {
                "name": node.name,
                "url": node.url,
                "healthy": node.healthy,
                "models": list(node.loaded_models),
                "priority": node.priority
            }
            for node in cluster.nodes
        ]
    }


@router.get("/models")
async def cluster_models():
    """Get all models loaded across the cluster."""
    cluster = get_ollama_cluster()
    return await cluster.get_loaded_models()


@router.post("/pull/{model_name}")
async def pull_model(model_name: str):
    """Pull a model to the cluster (primary node)."""
    cluster = get_ollama_cluster()
    success = await cluster.ensure_model(model_name)
    return {
        "model": model_name,
        "success": success,
        "loaded_on": list(cluster.get_ollama_cluster().loaded_models.get(model_name, set()))
    }


@router.post("/health-check")
async def health_check():
    """Run health checks on all cluster nodes."""
    cluster = get_ollama_cluster()
    results = {}
    for node in cluster.nodes:
        results[node.name] = await node.health_check()
    return results
