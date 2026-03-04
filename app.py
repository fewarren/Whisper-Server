from flask import Flask, request, jsonify, render_template
from tempfile import NamedTemporaryFile
import whisper
import torch
import os
import requests as http_requests

# Initialize device and model
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Loading Whisper model on {DEVICE}...")
model = whisper.load_model("base", device=DEVICE)
print("Model loaded successfully!")

# Initialize Flask app
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 1024 * 1024 * 1024  # 1GB max file size

# Ollama configuration
OLLAMA_BASE_URL = "http://localhost:11434"
LLM_MODEL = "llama3.1:8b"

# System prompt: hard constraints enforced at the system level
REFORMAT_SYSTEM = (
    "You are a transcript formatter. "
    "Your sole job is to add paragraph breaks and speaker labels to a raw transcript. "
    "You must reproduce every spoken word exactly as given — no exceptions. "
    "Never summarize, analyze, interpret, condense, or omit anything. "
    "Never add headings, bullet points, bold text, commentary, analysis, or any words "
    "that were not spoken by a participant. "
    "Output only the reformatted transcript text."
)

# User prompt: the formatting task
REFORMAT_PROMPT = """Format the following raw transcript by applying these three changes only:

1. PARAGRAPH BREAKS — insert a blank line at each natural topic shift or speaker change.
2. SPEAKER LABELS — prefix each speaker's turn with "Speaker 1:", "Speaker 2:", etc., inferred from context (question/answer patterns, topic shifts, conversational turns). Use "Speaker 1:" throughout if only one speaker is present.
3. FILLER COLLAPSE — reduce runs of the same repeated filler word to one (e.g. "um um um" → "um"). Keep single occurrences.

Every word from the original transcript must appear in the output. Do not add, remove, or change any spoken word.

Raw transcript:
{text}

Reformatted transcript:"""

@app.route("/", methods=["GET"])
def index():
    """Serve the main web interface"""
    return render_template("index.html")

@app.route("/api/device-info", methods=["GET"])
def device_info():
    """Return information about the device being used"""
    return jsonify({"device": DEVICE})

@app.route("/transcribe", methods=["POST"])
def transcribe():
    """Handle audio file transcription"""
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

    try:
        # Save file temporarily and transcribe
        with NamedTemporaryFile(suffix=file_ext, delete=True) as tmp:
            f.save(tmp.name)
            print(f"Transcribing file: {f.filename}")
            result = model.transcribe(tmp.name)
            print(f"Transcription complete. Language: {result.get('language')}")

        return jsonify({
            "text": result.get("text", "").strip(),
            "language": result.get("language", "unknown")
        })

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
        prompt = REFORMAT_PROMPT.format(text=text)
        print(f"Sending text ({len(text)} chars) to {LLM_MODEL} for reformatting...")
        response = http_requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={
                "model": LLM_MODEL,
                "system": REFORMAT_SYSTEM,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.1,
                    "top_p": 0.9,
                    "num_predict": -1,   # unlimited — output must match input length
                }
            },
            timeout=600  # 10 minute timeout for LLM
        )
        if response.status_code != 200:
            return jsonify({"error": f"LLM service error: {response.text}"}), 500

        result = response.json()
        formatted_text = result.get("response", "").strip()
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
