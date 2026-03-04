# 🎙️ Whisper Audio Transcription Web App

A production-ready web application that provides a user-friendly interface for OpenAI's Whisper speech-to-text AI model. Upload audio files and get accurate transcriptions with automatic language detection.

## ✨ Features

- **Modern Web Interface**: Clean, responsive tabbed UI with drag-and-drop file upload
- **Multiple Audio Formats**: Supports WAV, MP3, M4A, FLAC, OGG, and WebM
- **Automatic Language Detection**: Detects and displays the spoken language
- **GPU Acceleration**: Automatically uses CUDA if available for faster transcription
- **Real-time Progress**: Visual feedback during transcription and reformatting
- **Easy Export**: Copy to clipboard or download as text file
- **Error Handling**: Comprehensive validation and user-friendly error messages
- **Large File Support**: Supports audio files up to 1GB
- **AI Transcript Reformatter**: Uses a local LLM (via Ollama) to add speaker labels and organize paragraphs
- **Text File Upload**: Upload any `.txt` transcript file for AI reformatting

## 🚀 Quick Start

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- [Ollama](https://ollama.com) (for AI transcript reformatting)
- CUDA-compatible GPU (optional, for faster processing)
- 4GB+ RAM (8GB+ recommended for large files)

### Installation

1. **Clone or download this repository**
```bash
cd /path/to/whisper-app
```

2. **Create a virtual environment**
```bash
python3 -m venv venv
```

3. **Activate the virtual environment**

On Linux/Mac:
```bash
source venv/bin/activate
```

On Windows:
```bash
venv\Scripts\activate
```

4. **Install required dependencies**
```bash
pip install flask openai-whisper torch torchvision torchaudio
```

For CUDA support (NVIDIA GPU), install PyTorch with CUDA:
```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

5. **Verify installation**
```bash
python -c "import whisper; print('Whisper installed successfully')"
```

6. **Install Ollama** (for AI transcript reformatting)

Follow the instructions at https://ollama.com/download, then pull the default model:
```bash
ollama pull gemma2:9b
```

Any Ollama-compatible model can be used. To change the model, edit `LLM_MODEL` in `app.py`.

### Running the Application

1. **Start Ollama** (in a separate terminal):
```bash
ollama serve
```
*(Skip this if Ollama is already running as a system service.)*

2. **Start the Flask server:**
```bash
./venv/bin/python app.py
```

Or if virtual environment is activated:
```bash
python app.py
```

3. **Open your web browser and navigate to:**
```
http://localhost:5000
```

The server will display which device it's using (CPU or CUDA) when it starts.

## 📁 Project Structure

```
whisper-app/
├── app.py                      # Flask application backend
├── templates/
│   └── index.html             # Main web interface
├── static/
│   ├── css/
│   │   └── style.css          # Styling and animations
│   └── js/
│       └── app.js             # Client-side functionality
├── venv/                      # Python virtual environment
└── README.md                  # This file
```

## 📖 How to Use

### 🎙️ Tab 1: Transcribe Audio

1. Open http://localhost:5000 in your web browser
2. Either **drag and drop** an audio file or click to browse
3. Supported formats: WAV, MP3, M4A, FLAC, OGG, WebM (up to 1GB)
4. Click **"Start Transcription"** and wait for the result
5. Once complete, you can:
   - **Copy** the transcription to clipboard
   - **Download** as a `.txt` file
   - Click **"Reformat with AI"** to instantly reformat the transcription with speaker labels and paragraphs (result appears below)

### ✨ Tab 2: Reformat Text

Use this tab to reformat any existing transcript (e.g. from a previous Whisper run or any other source):

1. Click the **"✨ Reformat Text"** tab
2. Either:
   - **Drag and drop** a `.txt` file onto the upload area, or
   - **Paste** raw transcript text into the text box
3. Click **"Reformat with AI"**
4. Once complete, you can **Copy** or **Download** the formatted result

The AI will:
- Assign **Speaker 1**, **Speaker 2**, etc. labels based on context
- Organize text into **clear paragraphs** at topic/speaker transitions
- **Clean up** repetitive filler words (e.g. "um um um" → "um")
- **Preserve** all wording and detail exactly as spoken

## 🎨 User Interface

### Upload Section
- Drag and drop audio files or click to browse
- Visual feedback for file selection
- File size and format validation
- Real-time file information display

### Transcription Process
- Animated loading indicator
- Processing status messages
- Automatic language detection
- Non-blocking interface (browser remains responsive)

### Results Display
- Clean, readable text output
- Language badge showing detected language (40+ languages supported)
- Copy to clipboard functionality
- Download as text file option
- Start new transcription button

## 🤖 AI Reformatter

The reformatter uses [Ollama](https://ollama.com) to run a local LLM. No data leaves your machine.

### Default Model
`gemma2:9b` — pulled via `ollama pull gemma2:9b`

### Changing the Model
Edit `LLM_MODEL` in `app.py`:
```python
LLM_MODEL = "gemma2:9b"   # default
# LLM_MODEL = "mistral"   # alternatives
# LLM_MODEL = "qwen2.5:7b"
# LLM_MODEL = "llama3.1:8b"
```

Then restart the server. Pull any new model first with `ollama pull <model>`.

### Processing Time (Reformatter)
- Short transcripts (< 2,000 words): ~15–30 seconds
- Medium transcripts (2,000–10,000 words): ~30–90 seconds
- Long transcripts (10,000+ words): 2–5 minutes

*GPU acceleration applies to Ollama as well — CUDA is used automatically if available.*

## 🔧 API Endpoints

### `GET /`
Returns the main web interface

### `GET /api/device-info`
Returns information about the processing device (CPU/CUDA)

**Response:**
```json
{
  "device": "cuda"
}
```

### `POST /transcribe`
Transcribes an uploaded audio file

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: file (audio file)

**Response:**
```json
{
  "text": "Transcribed text content...",
  "language": "en"
}
```

**Error Response:**
```json
{
  "error": "Error message"
}
```

## 🎯 Supported Audio Formats

- WAV (.wav)
- MP3 (.mp3)
- M4A (.m4a)
- FLAC (.flac)
- OGG (.ogg)
- WebM (.webm)

## ⚙️ Configuration

### Model Selection
The application uses the "base" Whisper model by default. To change the model, edit `app.py`:

```python
model = whisper.load_model("base", device=DEVICE)
```

Available models: `tiny`, `base`, `small`, `medium`, `large`

### File Size Limit
Default maximum file size is 1GB. To change this, edit both `app.py` and `static/js/app.js`:

In `app.py`:
```python
app.config['MAX_CONTENT_LENGTH'] = 1024 * 1024 * 1024  # 1GB
```

In `static/js/app.js`:
```javascript
const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB
```

Also update the error messages and UI text in `templates/index.html` to reflect the new limit.

### Port Configuration
Default port is 5000. To change it, edit the last line in `app.py`:

```python
app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)
```

Note: `threaded=True` is important to prevent server blocking during transcription.

## ⚡ Performance

The application uses Flask with **threading enabled** to handle multiple requests concurrently. This prevents the server from blocking during long transcription operations, ensuring:

- Responsive UI during transcription
- Ability to serve static files while processing
- Better user experience with real-time progress updates

### Timeout Settings

The client-side timeout is set to **2 hours** to accommodate large audio files:
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
- **Very large files** (500MB-1GB / ~3-6 hour audio): 30-60+ minutes

*Times vary based on hardware, model size, and audio length. GPU acceleration significantly reduces processing time. The client timeout is set to 2 hours to accommodate very large files.*

## 🔧 Troubleshooting

### Server won't start
- Ensure port 5000 is not already in use: `lsof -i :5000`
- Check that all dependencies are installed: `pip list | grep -E "flask|whisper|torch"`
- Verify Python version: `python --version` (should be 3.8+)

### Out of memory errors
- Use a smaller Whisper model (e.g., `tiny` or `base` instead of `large`)
- Process smaller files or split large files into chunks
- Close other applications to free up RAM
- If using GPU, check VRAM usage: `nvidia-smi`

### Slow transcription
- Enable GPU acceleration by installing CUDA-enabled PyTorch
- Use a smaller model for faster processing (with slightly lower accuracy)
- Ensure no other heavy processes are running

### Browser shows "File too large" error
- Check that the file is under 1GB
- Verify the limits in both `app.py` and `static/js/app.js` match
- Clear browser cache and reload the page

### "Cannot connect to Ollama" error on Reformat tab
- Ensure Ollama is installed: https://ollama.com/download
- Start it manually: `ollama serve`
- Verify it's running: `curl http://localhost:11434`
- Pull the model if not already done: `ollama pull gemma2:9b`

### Reformat tab times out
- Very long transcripts (60,000+ words) may exceed limits
- Split the text into smaller sections and reformat each separately

### Transcription fails or returns empty text
- Verify the audio file is not corrupted
- Ensure the audio contains speech (not just music or silence)
- Try a different audio format
- Check server logs for detailed error messages

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

This project uses OpenAI's Whisper model. Please refer to the Whisper license for usage terms.

## 🙏 Acknowledgments

- OpenAI Whisper for the speech recognition model
- Flask for the web framework
- The open-source community

