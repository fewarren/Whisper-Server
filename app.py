from flask import Flask, request, jsonify, render_template
from tempfile import NamedTemporaryFile
import whisper
import torch
import os

# Initialize device and model
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Loading Whisper model on {DEVICE}...")
model = whisper.load_model("base", device=DEVICE)
print("Model loaded successfully!")

# Initialize Flask app
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 1024 * 1024 * 1024  # 1GB max file size

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
