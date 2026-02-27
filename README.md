# 🎙️ Whisper Audio Transcription Web App

A production-ready web application that provides a user-friendly interface for OpenAI's Whisper speech-to-text AI model. Upload audio files and get accurate transcriptions with automatic language detection.

## ✨ Features

- **Modern Web Interface**: Clean, responsive UI with drag-and-drop file upload
- **Multiple Audio Formats**: Supports WAV, MP3, M4A, FLAC, OGG, and WebM
- **Automatic Language Detection**: Detects and displays the spoken language
- **GPU Acceleration**: Automatically uses CUDA if available for faster transcription
- **Real-time Progress**: Visual feedback during transcription process
- **Easy Export**: Copy to clipboard or download transcription as text file
- **Error Handling**: Comprehensive validation and user-friendly error messages
- **Large File Support**: Supports files up to 1GB

## 🚀 Quick Start

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
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

### Running the Application

1. **Start the server:**
```bash
./venv/bin/python app.py
```

Or if virtual environment is activated:
```bash
python app.py
```

2. **Open your web browser and navigate to:**
```
http://localhost:5000
```

3. **Upload an audio file and click "Start Transcription"**

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

### Step 1: Upload Audio File
1. Open http://localhost:5000 in your web browser
2. Either:
   - **Drag and drop** an audio file onto the upload area, or
   - **Click** the upload area to browse and select a file
3. Supported formats: WAV, MP3, M4A, FLAC, OGG, WebM (up to 1GB)

### Step 2: Start Transcription
1. After selecting a file, you'll see the file name and size
2. Click the **"Start Transcription"** button
3. Wait while the AI processes your audio (progress indicator will show)

### Step 3: View and Export Results
1. Once complete, the transcription text will appear
2. The detected language will be shown as a badge
3. You can:
   - **Copy** the text to clipboard
   - **Download** as a .txt file
   - **Start a new transcription** with another file

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
- Request timeout protection (5 minutes)

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

