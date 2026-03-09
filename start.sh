#!/usr/bin/env bash
# start.sh — Start the Whisper Transcription Server
# Stops any existing server process, verifies required components, then launches.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_PYTHON="$SCRIPT_DIR/venv/bin/python"
APP="$SCRIPT_DIR/app.py"
PORT=5000
PID_FILE="$SCRIPT_DIR/.whisper-app.pid"

# ── Local environment (gitignored) ────────────────────────────────────────────
ENV_FILE="$SCRIPT_DIR/.env.local"
if [[ -f "$ENV_FILE" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
fi

# ── Hugging Face token (required for speaker diarization) ─────────────────────
# Provide HF_TOKEN via your shell environment or a local .env.local file.

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

ok()   { echo -e "  ${GREEN}✔${RESET}  $*"; }
warn() { echo -e "  ${YELLOW}⚠${RESET}  $*"; }
fail() { echo -e "  ${RED}✘${RESET}  $*"; }
info() { echo -e "  ${CYAN}→${RESET}  $*"; }

pid_matches_app() {
    local pid="${1:-}"
    local cmd

    [[ -n "$pid" ]] || return 1
    cmd=$(ps -p "$pid" -o args= 2>/dev/null || true)
    [[ -n "$cmd" && "$cmd" == *"$APP"* ]]
}

stop_pid() {
    local pid="$1"

    kill "$pid" 2>/dev/null || true
    for _ in {1..10}; do
        if ! kill -0 "$pid" 2>/dev/null; then
            return 0
        fi
        sleep 1
    done

    kill -9 "$pid" 2>/dev/null || true
    sleep 1
}

echo -e "\n${BOLD}Whisper Transcription Server — Startup${RESET}"
echo    "──────────────────────────────────────────"

# ── Step 1: Stop any running server ──────────────────────────────────────────
echo -e "\n${BOLD}[1/4] Stopping existing server processes...${RESET}"

STOPPED_ANY=false

if [[ -f "$PID_FILE" ]]; then
    TRACKED_PID=$(tr -dc '0-9' < "$PID_FILE")
    if [[ -n "$TRACKED_PID" ]] && pid_matches_app "$TRACKED_PID"; then
        info "Stopping tracked Whisper server (PID $TRACKED_PID)..."
        stop_pid "$TRACKED_PID"
        STOPPED_ANY=true
        ok "Stopped tracked Whisper server (PID $TRACKED_PID)"
    else
        warn "Ignoring stale or unrecognized PID file at $PID_FILE"
    fi
    rm -f "$PID_FILE"
fi

PORT_PIDS=$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)
if [[ -n "$PORT_PIDS" ]]; then
    MATCHED_PIDS=()
    FOREIGN_PIDS=()

    while IFS= read -r pid; do
        [[ -n "$pid" ]] || continue
        if pid_matches_app "$pid"; then
            MATCHED_PIDS+=("$pid")
        else
            FOREIGN_PIDS+=("$pid")
        fi
    done <<< "$PORT_PIDS"

    if (( ${#MATCHED_PIDS[@]} > 0 )); then
        for pid in "${MATCHED_PIDS[@]}"; do
            info "Stopping Whisper server on port $PORT (PID $pid)..."
            stop_pid "$pid"
        done
        STOPPED_ANY=true
        ok "Stopped Whisper server process(es): ${MATCHED_PIDS[*]}"
    fi

    if (( ${#FOREIGN_PIDS[@]} > 0 )); then
        fail "Port $PORT is in use by a different process. Refusing to kill it automatically."
        for pid in "${FOREIGN_PIDS[@]}"; do
            warn "PID $pid: $(ps -p "$pid" -o args= 2>/dev/null || echo unknown)"
        done
        warn "Stop the conflicting process manually or change PORT before retrying."
        exit 1
    fi
fi

if [[ "$STOPPED_ANY" != true ]]; then
    ok "No tracked Whisper server running on port $PORT"
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
PACKAGES=(flask whisper torch requests whisperx)
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
    info "Install missing packages: ${CYAN}./venv/bin/pip install whisperx${RESET}"
    exit 1
fi

# Speaker diarization (HF_TOKEN)
if [[ -n "${HF_TOKEN:-}" ]]; then
    ok "HF_TOKEN set — speaker diarization enabled"
else
    warn "HF_TOKEN not set — speaker diarization will be disabled"
    info "To enable: add HF_TOKEN to .env.local or export HF_TOKEN='hf_...', then restart"
    info "Get a token at: ${CYAN}https://huggingface.co/settings/tokens${RESET}"
    info "Accept model license: ${CYAN}https://huggingface.co/pyannote/speaker-diarization-community-1${RESET}"
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
info "PID:   $$ (saved to $PID_FILE)"
echo    "──────────────────────────────────────────"
echo

echo $$ > "$PID_FILE"
exec "$VENV_PYTHON" "$APP"

