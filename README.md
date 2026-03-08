# 🎙️ Whisper Audio/Video Transcription Web App

A production-ready web application built around **WhisperX** (OpenAI Whisper + CTranslate2) and **pyannote.audio**. Upload audio files or MP4 videos and get accurate, timestamped transcriptions with optional speaker identification — all running 100% locally on your hardware.

## 📝 Recent Update

- Added end-to-end **MP4 video transcription** support by extracting the audio track automatically via `ffmpeg`
- Updated the UI and Help dialog to clearly advertise **Audio / Video** transcription support
- Added a safer secret-handling flow so `HF_TOKEN` can stay in local-only files instead of tracked source

## ✨ Features

- **Modern Web Interface**: Clean, responsive tabbed UI with drag-and-drop file upload and in-app Help dialog
- **Multiple Input Formats**: Supports WAV, MP3, M4A, FLAC, OGG, WebM, and MP4 (up to 10 GB)
- **Automatic Language Detection**: Detects and displays the spoken language (40+ languages)
- **GPU Acceleration**: Automatically uses CUDA if available for faster transcription
- **Speaker Identification**: Optional diarization via pyannote.audio — labels each speaker (`SPEAKER_00`, `SPEAKER_01`, …) with timestamps, running entirely locally
- **Real-time Progress**: Visual feedback during transcription and reformatting
- **Smart Output Filenames**: Downloaded files are named after the original audio/text file (e.g. `interview.txt`, `interview_formatted.txt`)
- **AI Transcript Reformatter**: Uses a local LLM via [Ollama](https://ollama.com) (`llama3.1:8b`) to add speaker labels and organize paragraphs — no data leaves your machine
- **Text File Upload**: Upload any `.txt` transcript for AI reformatting on Tab 2
- **Error Handling**: Comprehensive validation and user-friendly error messages

## 🚀 Quick Start

### Prerequisites

- Python 3.10 or higher
- [Ollama](https://ollama.com) (for AI transcript reformatting)
- CUDA-compatible GPU with 4 GB+ VRAM (strongly recommended; CPU-only is supported but slow)
- 8 GB+ RAM (16 GB+ recommended for large files)
- `ffmpeg` installed and on `PATH`

### Installation

1. **Clone or download this repository**
```bash
cd /opt/whisper-app          # adjust to your path
```

2. **Create and activate a virtual environment**
```bash
python3 -m venv venv
source venv/bin/activate     # Linux / macOS
```

3. **Install PyTorch with CUDA support** (NVIDIA GPU)
```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```
*For CPU-only, omit the `--index-url` flag.*

4. **Install the remaining dependencies**
```bash
pip install flask requests openai-whisper whisperx pyannote.audio
```

5. **Install Ollama and pull the LLM model**

Follow instructions at https://ollama.com/download, then:
```bash
ollama pull llama3.1:8b
```

Any Ollama-compatible model can be used. To change it, edit `LLM_MODEL` in `app.py`.

### Hugging Face Token (for Speaker Identification)

Speaker Identification uses the free, gated `pyannote/speaker-diarization-community-1` model. To enable it:

1. Create a free Hugging Face account and generate a token at
   https://huggingface.co/settings/tokens
2. Accept the licence at
   https://huggingface.co/pyannote/speaker-diarization-community-1
3. Copy the example env file and add your token:
   ```bash
   cp .env.local.example .env.local
   ```
4. Edit `.env.local` and set:
   ```bash
   HF_TOKEN=hf_your_token_here
   ```
5. Run `./start.sh` — it auto-loads `.env.local` if present.

#### Optional: use a dedicated local start script instead

If you prefer keeping the token in a startup script instead of `.env.local`:

```bash
cp start.local.sh.example start.local.sh
```

Then edit `start.local.sh`, set your real `HF_TOKEN`, and run:

```bash
./start.local.sh
```

`start.local.sh` is gitignored, so it will stay local to your machine.

> **Note:** The HF token is only needed once for the initial model download (~1 GB). After that, everything runs completely offline.

### Running the Application

```bash
./start.sh
```

`start.sh` auto-loads `.env.local` (if present) and starts the Flask server. Open your browser at:

```
http://localhost:5000
```

The header will show whether the server is using **CPU** or **CUDA**.

## 📁 Project Structure

```
whisper-app/
├── app.py                      # Flask backend (WhisperX, diarization, Ollama)
├── start.sh                    # Startup script (loads .env.local, launches server)
├── start.local.sh.example      # Example local launcher with HF_TOKEN placeholder
├── .env.local.example          # Example local secrets file for HF_TOKEN
├── templates/
│   └── index.html             # Main web interface (tabbed UI + help modal)
├── static/
│   ├── css/
│   │   └── style.css          # Dark-theme styling and animations
│   └── js/
│       └── app.js             # Client-side logic (upload, poll, download)
├── venv/                      # Python virtual environment
└── README.md                  # This file
```

## 📖 How to Use

> **Quick help is also available inside the app** — click the **❓ Help** button in the top-right of the header.

### 🎙️ Tab 1: Transcribe Audio / Video

1. Open http://localhost:5000 in your web browser.
2. Either **drag and drop** an audio file or MP4 video, or click to browse. Supported formats: WAV, MP3, M4A, FLAC, OGG, WebM, MP4 (up to 10 GB). MP4 uploads are transcribed by automatically extracting the audio track via `ffmpeg`.
3. *(Optional)* Enable the **Speaker Identification** toggle to detect distinct voices. Each speaker is labelled `SPEAKER_00`, `SPEAKER_01`, … with timestamps.
4. Click **"Start Transcription"** and wait for the result.
5. Once complete, you can:
   - **Copy** the transcription to clipboard
   - **Download** as a `.txt` file — named after your source file (e.g. `interview.txt`, `meeting.txt`)
   - Click **"Reformat with AI"** to add speaker labels and clean paragraphs (result appears below the transcription; download is named `interview_formatted.txt`)

### ✨ Tab 2: Reformat Text

Use this tab to reformat any existing transcript — not just files produced by this tool:

1. Click the **"✨ Reformat Text"** tab.
2. Either:
   - **Drag and drop** a `.txt` file onto the upload area, or
   - **Paste** raw transcript text into the text box.
3. Click **"Reformat with AI"**.
4. Once complete, **Copy** or **Download** the formatted result. The downloaded file is named after your input file with `_formatted` appended.

The AI reformatter will:
- Assign **Speaker 1**, **Speaker 2**, etc. labels based on context
- Organize text into **clear paragraphs** at topic/speaker transitions
- **Clean up** repetitive filler words (e.g. `"um um um"` → `"um"`)
- **Preserve** all wording and detail exactly as spoken

## 🤖 AI Reformatter

The reformatter uses [Ollama](https://ollama.com) to run a local LLM. No data leaves your machine.

### Default Model
`llama3.1:8b` — pull with `ollama pull llama3.1:8b`

### Changing the Model
Edit `LLM_MODEL` in `app.py`:
```python
LLM_MODEL = "llama3.1:8b"   # default
# LLM_MODEL = "mistral"
# LLM_MODEL = "qwen2.5:7b"
# LLM_MODEL = "gemma2:9b"
```
Pull any new model first with `ollama pull <model>`, then restart the server.

### Processing Time (Reformatter)
- Short transcripts (< 2,000 words): ~15–30 seconds
- Medium transcripts (2,000–10,000 words): ~30–90 seconds
- Long transcripts (10,000+ words): 2–5 minutes

*GPU acceleration applies to Ollama as well — CUDA is used automatically if available.*

## 🎤 Speaker Identification

Speaker Identification is powered by **WhisperX** (forced alignment) and **pyannote.audio** (diarization). It runs entirely on your GPU — no audio is sent anywhere.

- The toggle is **automatically disabled** if `HF_TOKEN` is not set in the environment.
- The first request downloads the `pyannote/speaker-diarization-community-1` model (~1 GB) from Hugging Face and caches it permanently.
- Adds roughly **20–50 %** to processing time and uses additional GPU VRAM.

### Speaker Identification Setup (one-time)

1. Accept the free licence:
   https://huggingface.co/pyannote/speaker-diarization-community-1
2. Put your token in `.env.local` (see the setup section above), then run `./start.sh`.

## 🔧 API Endpoints

### `GET /`
Returns the main web interface.

### `GET /api/device-info`
Returns the processing device in use.

```json
{ "device": "cuda" }
```

### `GET /api/diarization-status`
Returns whether speaker identification is available (i.e. `HF_TOKEN` is set).

```json
{ "available": true }
```

### `POST /transcribe`
Transcribes an uploaded audio file or MP4 video file.

**Request** — `multipart/form-data`:
| Field | Type | Description |
|---|---|---|
| `file` | file | Audio or MP4 video file (WAV, MP3, M4A, FLAC, OGG, WebM, MP4) |
| `diarize` | string | `"true"` to enable speaker identification |

**Response:**
```json
{
  "text": "SPEAKER_00 [00:00:01 → 00:00:04]: Hello, welcome to the meeting.\nSPEAKER_01 [00:00:05 → 00:00:09]: Thank you for having me.",
  "language": "en",
  "diarized": true
}
```

**Error response:**
```json
{ "error": "Error message" }
```

### `POST /reformat`
Reformats plain text using the local LLM.

**Request** — `multipart/form-data`:
| Field | Type | Description |
|---|---|---|
| `text` | string | Raw transcript text to reformat |

**Response:**
```json
{ "formatted_text": "Speaker 1: Hello, welcome to the meeting. …" }
```

## 🎯 Supported Input Formats

- WAV (.wav)
- MP3 (.mp3)
- M4A (.m4a)
- FLAC (.flac)
- OGG (.ogg)
- WebM (.webm)
- MP4 video (.mp4) — audio track extracted automatically for transcription

## ⚙️ Configuration

### Whisper / WhisperX Model
The application currently uses:

- `openai-whisper` **`base`** for standard transcription
- `WhisperX` **`base`** (lazy-loaded) when Speaker Identification is enabled

To change the defaults, edit the model-loading calls in `app.py`:

```python
model = whisper.load_model("base", device=DEVICE)
_whisperx_model = whisperx.load_model("base", DEVICE, compute_type=COMPUTE_TYPE)
```

Smaller models are faster but less accurate. If you want higher accuracy and have the VRAM for it, you can move up to `small`, `medium`, or larger Whisper/WhisperX variants.

### LLM Model (Reformatter)
Edit `LLM_MODEL` in `app.py` and pull the model via Ollama before restarting:

```python
LLM_MODEL = "llama3.1:8b"   # default
```

### File Size Limit
Default is 10 GB. To change, update both `app.py` and `static/js/app.js`:

```python
# app.py
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024 * 1024  # 10 GB
```

```javascript
// static/js/app.js
const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10 GB
```

### Port
Default port is 5000. Edit the last line of `app.py`:

```python
app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)
```

`threaded=True` is required to keep the UI responsive during transcription.

## ⚡ Performance

The application uses Flask with **threading enabled** to handle multiple requests concurrently. This prevents the server from blocking during long transcription operations, ensuring:

- Responsive UI during transcription
- Ability to serve static files while processing
- Better user experience with real-time progress updates

### Timeout Settings

The client-side timeout is set to **2 hours** to accommodate large media files:
- 1-hour audio files typically take 30-60 minutes to process
- Timeout can be adjusted in `static/js/app.js` (line 172)
- Change `7200000` (milliseconds) to desired timeout value

For large files or production use, consider using a production WSGI server like Gunicorn with multiple workers.

## 🔒 Security Considerations

- File type validation on both client and server side
- File size limits to prevent resource exhaustion
- Temporary file handling with automatic cleanup
- Input sanitization and error handling
- Request timeout protection (2 hours for transcription, 11 minutes for reformatting)
- All AI processing is local — no audio or text is sent to external services

## 💻 System Requirements

### Minimum Requirements
- **CPU**: Dual-core processor (2.0 GHz or higher)
- **RAM**: 4GB (8GB recommended)
- **Storage**: 5GB free space (for models and temporary files)
- **OS**: Linux, macOS, or Windows 10/11

### Recommended for Large Files (500MB+)
- **CPU**: Quad-core processor or better
- **RAM**: 16GB or more
- **GPU**: NVIDIA GPU with 4GB+ VRAM (for CUDA acceleration)
- **Storage**: 10GB+ free space

### Processing Time Estimates
- **Small files** (< 10MB / ~10 min audio): 5-30 seconds
- **Medium files** (10-100MB / ~10-60 min audio): 30 seconds - 5 minutes
- **Large files** (100-500MB / ~1-3 hour audio): 5-30 minutes
- **Very large files** (500MB-10GB / very long audio/video): 30-60+ minutes

*Times vary based on hardware, model size, and audio length. GPU acceleration significantly reduces processing time. The client timeout is set to 2 hours to accommodate very large files.*

## 🔧 Troubleshooting

### Server won't start
- Ensure port 5000 is free: `lsof -i :5000`
- Check dependencies: `./venv/bin/pip list | grep -E "flask|whisperx|torch|pyannote"`
- Verify Python version: `./venv/bin/python --version` (3.10+ required)

### Speaker Identification toggle is greyed out
- `HF_TOKEN` is not set — add it to `.env.local` (or export it in your shell), then restart via `./start.sh`.

### 403 Forbidden from Hugging Face
- You need to accept the free model licence at
  https://huggingface.co/pyannote/speaker-diarization-community-1
  (log in first, then click **"Agree and access repository"**).

### Out of memory errors
- Use a smaller Whisper model (e.g. `small` or `medium`) by changing `WHISPER_MODEL` in `app.py`.
- Disable speaker identification for very long files.
- Check VRAM usage: `nvidia-smi`

### Slow transcription
- Verify CUDA is being used — the header should show **CUDA**.
- Use a smaller Whisper model for faster processing.
- Ensure no other GPU-heavy processes are running.

### "Cannot connect to Ollama" error
- Start Ollama: `ollama serve`
- Verify it's running: `curl http://localhost:11434`
- Pull the model if needed: `ollama pull llama3.1:8b`

### Reformat tab times out
- Very long transcripts (60,000+ words) can exceed the 11-minute limit.
- Split into smaller sections and reformat each separately.

### Transcription fails or returns empty text
- Ensure the audio contains speech (not just music or silence).
- Try converting the file to WAV first: `ffmpeg -i input.mp3 output.wav`
- Check the server terminal for the full Python traceback.

## 🚀 Production Deployment

For production use, consider:

1. **Use a production WSGI server** (e.g., Gunicorn, uWSGI):
```bash
./venv/bin/gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

2. **Set up a reverse proxy** (e.g., Nginx) for SSL/TLS

3. **Enable HTTPS** for secure file uploads

4. **Configure proper logging** and monitoring

5. **Set up rate limiting** to prevent abuse

6. **Use a task queue** (e.g., Celery) for handling long-running transcriptions

7. **Implement user authentication** if needed

## 📝 License

This project uses several open-source models and libraries. Please refer to their individual licences:

- [OpenAI Whisper](https://github.com/openai/whisper) — MIT licence
- [WhisperX](https://github.com/m-bain/whisperX) — BSD-2-Clause licence
- [pyannote.audio](https://github.com/pyannote/pyannote-audio) — MIT licence (model weights require HF licence acceptance)
- [Ollama](https://ollama.com) — MIT licence

## 🙏 Acknowledgments

- **OpenAI** for the Whisper speech-recognition model
- **Max Bain** for WhisperX (faster-whisper backend + forced alignment)
- **Hervé Bredin** and the pyannote team for the speaker diarization pipeline
- **Flask** for the lightweight web framework
- The open-source community

