from flask import Flask, request, jsonify, render_template
from tempfile import NamedTemporaryFile
import whisper
import torch
import os
import requests as http_requests

# Initialize device and model
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
COMPUTE_TYPE = "float16" if DEVICE == "cuda" else "int8"

print(f"Loading Whisper model on {DEVICE}...")
model = whisper.load_model("base", device=DEVICE)
print("Model loaded successfully!")

# WhisperX models — lazy-loaded on first diarization request
_whisperx_model = None        # faster-whisper transcription model
_diarization_pipeline = None  # pyannote diarization pipeline

# Hugging Face token required for pyannote speaker diarization
# Set via:  export HF_TOKEN="hf_..."
HF_TOKEN = os.environ.get("HF_TOKEN", "")


def _load_whisperx_model():
    """Lazy-load the WhisperX transcription model (faster-whisper)."""
    global _whisperx_model
    if _whisperx_model is None:
        import whisperx
        print("Loading WhisperX model...")
        _whisperx_model = whisperx.load_model("base", DEVICE, compute_type=COMPUTE_TYPE)
        print("WhisperX model loaded.")
    return _whisperx_model


def _load_diarization_pipeline(hf_token: str):
    """Lazy-load the pyannote diarization pipeline."""
    global _diarization_pipeline
    if _diarization_pipeline is None:
        import whisperx
        print("Loading diarization pipeline...")
        _diarization_pipeline = whisperx.DiarizationPipeline(
            use_auth_token=hf_token, device=DEVICE
        )
        print("Diarization pipeline loaded.")
    return _diarization_pipeline

# Initialize Flask app
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 1024 * 1024 * 1024  # 1GB max file size

# Ollama configuration
OLLAMA_BASE_URL = "http://localhost:11434"
LLM_MODEL = "llama3.1:8b"

# System prompt: hard constraints enforced at the system level
REFORMAT_SYSTEM = (
    "You are a mechanical text formatter, not a writer or analyst. "
    "You apply three operations to transcript text: insert paragraph breaks, prepend speaker labels, and collapse repeated filler words. "
    "You do not write any original sentences. "
    "You do not introduce, describe, summarize, interpret, or comment on the content in any way. "
    "Every word in your output must come directly from the input transcript — nothing else. "
    "If you produce any sentence that did not come word-for-word from the input, that is an error."
)

# User prompt: concrete instructions plus a worked example so the model knows exactly what is expected
REFORMAT_PROMPT = """Apply exactly three mechanical operations to the raw transcript below. Do not write any new sentences.

OPERATIONS:
1. PARAGRAPH BREAKS — insert a blank line whenever the speaker changes or the topic clearly shifts.
2. SPEAKER LABELS — prepend "Speaker 1:", "Speaker 2:", etc. to each speaker's turn, inferred from question/answer patterns or topic shifts. Use "Speaker 1:" throughout if there is only one speaker.
3. FILLER COLLAPSE — reduce consecutive runs of the same filler word to one (e.g. "um um um" → "um"). Keep single occurrences.

EXAMPLE
Input:
yeah so um um I wanted to talk about the budget right we need to finalize it and Dave what do you think we should do about the timeline because honestly we've been going back and forth on this for weeks

Output:
Speaker 1: yeah so um I wanted to talk about the budget right we need to finalize it

Speaker 2: and Dave what do you think we should do about the timeline because honestly we've been going back and forth on this for weeks

--- END OF EXAMPLE ---

Begin your output immediately with the first speaker label. Do not write any introductory sentence before the first speaker label.

Raw transcript:
{text}

Reformatted transcript:"""

# Maximum words per chunk — sized to keep total prompt+output within Ollama's 4096-token
# default context window (system ~100 tok + template ~350 tok + chunk ~800 tok + output ~800 tok ≈ 2050).
_CHUNK_WORDS = 500


def _ollama_reformat(chunk_text: str) -> str:
    """Send a single chunk to Ollama and return the formatted text."""
    resp = http_requests.post(
        f"{OLLAMA_BASE_URL}/api/generate",
        json={
            "model": LLM_MODEL,
            "system": REFORMAT_SYSTEM,
            "prompt": REFORMAT_PROMPT.format(text=chunk_text),
            "stream": False,
            "options": {
                "temperature": 0.1,
                "num_predict": -1,   # no output-length cap
            },
        },
        timeout=300,
    )
    resp.raise_for_status()
    return resp.json().get("response", "").strip()


def _reformat_text(text: str) -> str:
    """Reformat transcript, chunking if the text is too long for one LLM call."""
    words = text.split()

    # Short enough to process in one shot
    if len(words) <= _CHUNK_WORDS:
        return _ollama_reformat(text)

    # Split into chunks and track the last speaker label so numbering stays
    # consistent across chunk boundaries.
    chunks = [
        " ".join(words[i: i + _CHUNK_WORDS])
        for i in range(0, len(words), _CHUNK_WORDS)
    ]

    parts = []
    last_speaker = None   # e.g. "Speaker 2"

    for idx, chunk in enumerate(chunks):
        # Prepend a one-line continuation hint (inside the transcript block so
        # the model treats it as metadata, not spoken words).
        if idx > 0 and last_speaker:
            hint = f"[Continuing — last speaker before this section: {last_speaker}]\n"
            chunk_input = hint + chunk
        else:
            chunk_input = chunk

        result = _ollama_reformat(chunk_input)
        parts.append(result)

        # Remember the last speaker label seen in this chunk's output
        for line in reversed(result.splitlines()):
            stripped = line.strip()
            if stripped.startswith("Speaker"):
                last_speaker = stripped.split(":")[0].strip()
                break

    return "\n\n".join(parts)

@app.route("/", methods=["GET"])
def index():
    """Serve the main web interface"""
    return render_template("index.html")

@app.route("/api/device-info", methods=["GET"])
def device_info():
    """Return information about the device being used"""
    return jsonify({"device": DEVICE})

@app.route("/api/diarization-status", methods=["GET"])
def diarization_status():
    """Return whether speaker diarization is available (HF_TOKEN set)."""
    return jsonify({"available": bool(HF_TOKEN)})


def _format_diarized_segments(segments) -> str:
    """Convert WhisperX diarized segments into a readable transcript string."""
    lines = []
    current_speaker = None
    current_words = []
    current_start = 0.0

    def _ts(secs: float) -> str:
        h, rem = divmod(int(secs), 3600)
        m, s = divmod(rem, 60)
        return f"{h:02d}:{m:02d}:{s:02d}" if h else f"{m:02d}:{s:02d}"

    def _flush():
        if current_words and current_speaker:
            lines.append(f"[{_ts(current_start)}] {current_speaker}: {' '.join(current_words)}")

    for seg in segments:
        speaker = seg.get("speaker", "SPEAKER_??")
        text = seg.get("text", "").strip()
        start = seg.get("start", 0.0)

        if speaker != current_speaker:
            _flush()
            current_speaker = speaker
            current_words = [text] if text else []
            current_start = start
        else:
            if text:
                current_words.append(text)

    _flush()
    return "\n\n".join(lines)


@app.route("/transcribe", methods=["POST"])
def transcribe():
    """Handle audio file transcription, with optional speaker diarization."""
    # Validate file upload
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    f = request.files["file"]
    if f.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    # Validate file extension
    allowed_extensions = {'.wav', '.mp3', '.m4a', '.flac', '.ogg', '.webm'}
    file_ext = os.path.splitext(f.filename)[1].lower()
    if file_ext not in allowed_extensions:
        return jsonify({"error": f"Unsupported file format. Allowed formats: {', '.join(allowed_extensions)}"}), 400

    # Check if caller wants diarization
    diarize = request.form.get("diarize", "false").lower() == "true"

    if diarize and not HF_TOKEN:
        return jsonify({
            "error": (
                "Speaker diarization requires a Hugging Face token. "
                "Set the HF_TOKEN environment variable and restart the server. "
                "Get a free token at https://huggingface.co/settings/tokens "
                "and accept the pyannote model license at "
                "https://huggingface.co/pyannote/speaker-diarization-3.1"
            )
        }), 503

    try:
        with NamedTemporaryFile(suffix=file_ext, delete=False) as tmp:
            tmp_path = tmp.name
            f.save(tmp_path)

        try:
            if diarize:
                # ── WhisperX path: transcribe + align + diarize ──────────
                import whisperx

                print(f"WhisperX transcribing: {f.filename}")
                wx_model = _load_whisperx_model()
                audio = whisperx.load_audio(tmp_path)
                wx_result = wx_model.transcribe(audio, batch_size=8)
                language = wx_result.get("language", "unknown")
                print(f"WhisperX transcription done. Language: {language}")

                # Align word-level timestamps
                print("Aligning word timestamps...")
                align_model, metadata = whisperx.load_align_model(
                    language_code=language, device=DEVICE
                )
                wx_result = whisperx.align(
                    wx_result["segments"], align_model, metadata, audio, DEVICE,
                    return_char_alignments=False
                )

                # Diarize (who spoke when)
                print("Running speaker diarization...")
                diarize_pipeline = _load_diarization_pipeline(HF_TOKEN)
                diarize_segments = diarize_pipeline(audio)

                # Assign speaker labels to words/segments
                wx_result = whisperx.assign_word_speakers(diarize_segments, wx_result)
                print("Diarization complete.")

                text = _format_diarized_segments(wx_result["segments"])
                return jsonify({
                    "text": text,
                    "language": language,
                    "diarized": True,
                })

            else:
                # ── Standard Whisper path (unchanged) ───────────────────
                print(f"Transcribing file: {f.filename}")
                result = model.transcribe(tmp_path)
                print(f"Transcription complete. Language: {result.get('language')}")
                return jsonify({
                    "text": result.get("text", "").strip(),
                    "language": result.get("language", "unknown"),
                    "diarized": False,
                })

        finally:
            os.unlink(tmp_path)

    except Exception as e:
        print(f"Transcription error: {str(e)}")
        return jsonify({"error": f"Transcription failed: {str(e)}"}), 500

@app.route("/reformat", methods=["POST"])
def reformat():
    """Reformat transcript text using local LLM via Ollama"""
    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"error": "No text provided"}), 400

    text = data.get("text", "").strip()
    if not text:
        return jsonify({"error": "Text is empty"}), 400
    if len(text) > 500000:
        return jsonify({"error": "Text too large. Maximum 500,000 characters."}), 400

    try:
        word_count = len(text.split())
        chunk_count = max(1, (word_count + _CHUNK_WORDS - 1) // _CHUNK_WORDS)
        print(f"Reformatting {len(text)} chars / {word_count} words "
              f"via {LLM_MODEL} ({chunk_count} chunk(s))...")
        formatted_text = _reformat_text(text)
        print(f"Reformatting complete. Output: {len(formatted_text)} chars.")
        return jsonify({"formatted_text": formatted_text})

    except http_requests.exceptions.ConnectionError:
        return jsonify({"error": "Cannot connect to Ollama. Please ensure Ollama is running (run: ollama serve)."}), 503
    except http_requests.exceptions.Timeout:
        return jsonify({"error": "LLM processing timed out. Try with a shorter text."}), 504
    except Exception as e:
        print(f"Reformat error: {str(e)}")
        return jsonify({"error": f"Reformat failed: {str(e)}"}), 500


@app.errorhandler(413)
def request_entity_too_large(error):
    """Handle file too large error"""
    return jsonify({"error": "File too large. Maximum size is 1GB"}), 413

@app.errorhandler(500)
def internal_server_error(error):
    """Handle internal server errors"""
    return jsonify({"error": "Internal server error occurred"}), 500

if __name__ == "__main__":
    print(f"Starting Whisper Transcription Server on http://0.0.0.0:5000")
    print(f"Device: {DEVICE}")
    # Enable threading to prevent blocking during transcription
    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)
