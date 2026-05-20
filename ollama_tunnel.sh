#!/bin/bash
# SSH tunnel to make Ollama accessible from the main Pi
# Run this on the main Pi to forward Ollama through SSH

ssh -N -L 11434:127.0.0.1:11434 192.168.1.15 &
echo "Ollama tunnel started (PID: $!)"
echo "Ollama will be accessible at http://localhost:11434"
