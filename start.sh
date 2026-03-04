#!/usr/bin/env bash
# start.sh — Start the Whisper Transcription Server
# Stops any existing server process, verifies required components, then launches.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_PYTHON="$SCRIPT_DIR/venv/bin/python"
APP="$SCRIPT_DIR/app.py"
PORT=5000

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

ok()   { echo -e "  ${GREEN}✔${RESET}  $*"; }
warn() { echo -e "  ${YELLOW}⚠${RESET}  $*"; }
fail() { echo -e "  ${RED}✘${RESET}  $*"; }
info() { echo -e "  ${CYAN}→${RESET}  $*"; }

echo -e "\n${BOLD}Whisper Transcription Server — Startup${RESET}"
echo    "──────────────────────────────────────────"

# ── Step 1: Stop any running server ──────────────────────────────────────────
echo -e "\n${BOLD}[1/4] Stopping existing server processes...${RESET}"

PIDS=$(lsof -ti:"$PORT" 2>/dev/null || true)
if [[ -n "$PIDS" ]]; then
    echo "$PIDS" | xargs kill 2>/dev/null || true
    sleep 1
    # Force-kill anything still holding the port
    REMAINING=$(lsof -ti:"$PORT" 2>/dev/null || true)
    if [[ -n "$REMAINING" ]]; then
        echo "$REMAINING" | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
    ok "Stopped process(es) on port $PORT (PIDs: $PIDS)"
else
    ok "No process running on port $PORT"
fi

# ── Step 2: Verify Python environment ────────────────────────────────────────
echo -e "\n${BOLD}[2/4] Verifying Python environment...${RESET}"

# Virtual environment
if [[ ! -x "$VENV_PYTHON" ]]; then
    fail "Virtual environment not found at $VENV_PYTHON"
    echo -e "  Run: ${CYAN}python3 -m venv venv && ./venv/bin/pip install -r requirements.txt${RESET}"
    exit 1
fi
ok "Virtual environment found"

# Required Python packages
PACKAGES=(flask whisper torch requests)
ALL_OK=true
for pkg in "${PACKAGES[@]}"; do
    if "$VENV_PYTHON" -c "import $pkg" 2>/dev/null; then
        ok "Python package: $pkg"
    else
        fail "Python package missing: $pkg"
        ALL_OK=false
    fi
done

if [[ "$ALL_OK" != true ]]; then
    echo
    info "Install missing packages: ${CYAN}./venv/bin/pip install -r requirements.txt${RESET}"
    exit 1
fi

# CUDA availability (warning only — CPU fallback is supported)
CUDA=$("$VENV_PYTHON" -c "import torch; print(torch.cuda.is_available())" 2>/dev/null || echo "False")
if [[ "$CUDA" == "True" ]]; then
    ok "CUDA (GPU acceleration): available"
else
    warn "CUDA not available — running on CPU (transcription will be slower)"
fi

# ── Step 3: Verify Ollama ─────────────────────────────────────────────────────
echo -e "\n${BOLD}[3/4] Verifying Ollama (AI Reformatter)...${RESET}"

# Determine which model the app expects
LLM_MODEL=$(grep -m1 '^LLM_MODEL' "$APP" | sed 's/.*=.*["\x27]\(.*\)["\x27].*/\1/' || echo "gemma2:9b")

# Check if Ollama daemon is reachable
if curl -sf http://localhost:11434 >/dev/null 2>&1; then
    ok "Ollama service is reachable (localhost:11434)"
else
    warn "Ollama service is not running — attempting to start it in the background..."
    nohup ollama serve >/tmp/ollama.log 2>&1 &
    OLLAMA_PID=$!
    sleep 3
    if curl -sf http://localhost:11434 >/dev/null 2>&1; then
        ok "Ollama service started (PID $OLLAMA_PID)"
    else
        fail "Could not start Ollama. Reformatter tab will be unavailable."
        warn "Start Ollama manually: ${CYAN}ollama serve${RESET}"
        warn "Continuing server startup without reformatter support..."
    fi
fi

# Check that the required model is present
if ollama list 2>/dev/null | awk '{print $1}' | grep -qF "$LLM_MODEL"; then
    ok "Ollama model available: $LLM_MODEL"
else
    warn "Model '$LLM_MODEL' is not pulled yet. Pulling now (this may take a few minutes)..."
    if ollama pull "$LLM_MODEL"; then
        ok "Model '$LLM_MODEL' downloaded successfully"
    else
        fail "Failed to pull model '$LLM_MODEL'. Reformatter tab will not work."
        warn "Pull manually: ${CYAN}ollama pull $LLM_MODEL${RESET}"
    fi
fi

# ── Step 4: Start the server ──────────────────────────────────────────────────
echo -e "\n${BOLD}[4/4] Starting Whisper server...${RESET}"
info "URL:   http://localhost:$PORT"
info "App:   $APP"
info "Model: $LLM_MODEL"
echo    "──────────────────────────────────────────"
echo

exec "$VENV_PYTHON" "$APP"

