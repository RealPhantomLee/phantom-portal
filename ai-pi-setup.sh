#!/bin/bash
# AI Pi Model Pulldown Script
# Run this on <AI_PI_IP> to pull optimal Ollama models for distributed inference
# This sets up the AI Pi with 4 specialized models for the Phantom Portal cluster

set -e  # Exit on error

echo "=========================================="
echo "AI Pi Model Pulldown (<AI_PI_IP>)"
echo "=========================================="
echo ""
echo "This script will pull 4 models (~8.5GB total) to support distributed inference"
echo "Target: AI Pi with 8GB RAM"
echo ""

# Check if Ollama is running
if ! pgrep -x "ollama" > /dev/null; then
    echo "ERROR: Ollama is not running. Start it with: ollama serve"
    exit 1
fi

echo "Ollama is running. Starting model pulldown..."
echo ""

# Model 1: Llama 3.2 3B - Fast general chat
echo "=========================================="
echo "[1/4] Pulling llama3.2:3b (2GB) — Fast general chat"
echo "=========================================="
ollama pull llama3.2:3b
echo ""

# Model 2: Mistral 7B - Strong reasoning
echo "=========================================="
echo "[2/4] Pulling mistral:7b (4GB) — Strong reasoning"
echo "=========================================="
ollama pull mistral:7b
echo ""

# Model 3: Nomic Embed Text - Embeddings (small, efficient)
echo "=========================================="
echo "[3/4] Pulling nomic-embed-text (274MB) — Semantic embeddings"
echo "=========================================="
ollama pull nomic-embed-text
echo ""

# Model 4: Phi 3 Mini - Quick QA and title generation
echo "=========================================="
echo "[4/4] Pulling phi3:mini (2.3GB) — Quick QA/titles"
echo "=========================================="
ollama pull phi3:mini
echo ""

echo "=========================================="
echo "Models Pulled Successfully!"
echo "=========================================="
echo ""

# Verify models are loaded
echo "Verifying models are accessible..."
echo ""
curl -s http://localhost:11434/api/tags | python3 -m json.tool
echo ""

echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Model distribution:"
echo "  • AI Pi (<AI_PI_IP>): llama3.2:3b, mistral:7b, nomic-embed-text, phi3:mini"
echo "  • Main Pi (localhost):  Will run models as needed"
echo ""
echo "Next steps:"
echo "  1. Update phantom.config.yaml on Main Pi (set embedding model)"
echo "  2. Update ollama_cluster.py routing logic"
echo "  3. Run: curl http://<AI_PI_IP>:11434/api/tags to verify from Main Pi"
echo ""
