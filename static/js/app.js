// ── Tab 1: Transcribe ──────────────────────────────────────────
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadSection = document.getElementById('uploadSection');
const fileSelected = document.getElementById('fileSelected');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const removeFile = document.getElementById('removeFile');
const transcribeBtn = document.getElementById('transcribeBtn');
const progressSection = document.getElementById('progressSection');
const resultSection = document.getElementById('resultSection');
const errorSection = document.getElementById('errorSection');
const resultText = document.getElementById('resultText');
const languageBadge = document.getElementById('languageBadge');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const newTranscriptionBtn = document.getElementById('newTranscriptionBtn');
const retryBtn = document.getElementById('retryBtn');
const errorMessage = document.getElementById('errorMessage');
const toast = document.getElementById('toast');
const deviceInfo = document.getElementById('deviceInfo');

// Inline reformat (from transcription result)
const reformatFromResultBtn = document.getElementById('reformatFromResultBtn');
const reformatInline = document.getElementById('reformatInline');
const reformatInlineProgress = document.getElementById('reformatInlineProgress');
const reformatInlineResult = document.getElementById('reformatInlineResult');
const reformatInlineText = document.getElementById('reformatInlineText');
const copyFormattedBtn = document.getElementById('copyFormattedBtn');
const downloadFormattedBtn = document.getElementById('downloadFormattedBtn');

// ── Tab 2: Reformat ───────────────────────────────────────────
const reformatUploadArea = document.getElementById('reformatUploadArea');
const reformatFileInput = document.getElementById('reformatFileInput');
const reformatTextarea = document.getElementById('reformatTextarea');
const reformatFileInfo = document.getElementById('reformatFileInfo');
const reformatFileName = document.getElementById('reformatFileName');
const clearReformatFile = document.getElementById('clearReformatFile');
const reformatSubmitBtn = document.getElementById('reformatSubmitBtn');
const reformatProgressSection = document.getElementById('reformatProgressSection');
const reformatResultSection = document.getElementById('reformatResultSection');
const reformatResultText = document.getElementById('reformatResultText');
const copyReformatBtn = document.getElementById('copyReformatBtn');
const downloadReformatBtn = document.getElementById('downloadReformatBtn');
const newReformatBtn = document.getElementById('newReformatBtn');
const reformatErrorSection = document.getElementById('reformatErrorSection');
const reformatErrorMessage = document.getElementById('reformatErrorMessage');
const reformatRetryBtn = document.getElementById('reformatRetryBtn');

// ── State ─────────────────────────────────────────────────────
let selectedFile = null;
let transcriptionResult = null;
let reformatResult = null;        // result from tab-2 reformat
let inlineReformatResult = null;  // result from inline reformat (tab-1)

// Constants
const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB
const ALLOWED_TYPES = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/flac', 'audio/ogg', 'audio/webm'];

// ── Initialize ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    fetchDeviceInfo();
    setupEventListeners();
    setupTabListeners();
    setupReformatListeners();
});

// Fetch device info from server
async function fetchDeviceInfo() {
    try {
        const response = await fetch('/api/device-info');
        const data = await response.json();
        deviceInfo.textContent = data.device.toUpperCase();
    } catch (error) {
        console.error('Failed to fetch device info:', error);
    }
}

// ── Tab switching ─────────────────────────────────────────────
function setupTabListeners() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
            document.getElementById(`tab-${target}`).style.display = 'block';
        });
    });
}

// ── Tab 1 event listeners ─────────────────────────────────────
function setupEventListeners() {
    uploadArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    removeFile.addEventListener('click', resetUpload);
    transcribeBtn.addEventListener('click', startTranscription);
    copyBtn.addEventListener('click', copyToClipboard);
    downloadBtn.addEventListener('click', downloadTranscription);
    newTranscriptionBtn.addEventListener('click', resetUpload);
    retryBtn.addEventListener('click', resetUpload);

    // Inline reformat (from transcription result)
    reformatFromResultBtn.addEventListener('click', startInlineReformat);
    copyFormattedBtn.addEventListener('click', () => copyText(inlineReformatResult, 'Formatted text copied!'));
    downloadFormattedBtn.addEventListener('click', () => downloadText(inlineReformatResult, 'formatted_transcript.txt'));
}

// ── Tab 2 event listeners ─────────────────────────────────────
function setupReformatListeners() {
    reformatUploadArea.addEventListener('click', () => reformatFileInput.click());
    reformatUploadArea.addEventListener('dragover', e => { e.preventDefault(); reformatUploadArea.classList.add('drag-over'); });
    reformatUploadArea.addEventListener('dragleave', e => { e.preventDefault(); reformatUploadArea.classList.remove('drag-over'); });
    reformatUploadArea.addEventListener('drop', e => {
        e.preventDefault();
        reformatUploadArea.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) loadReformatFile(file);
    });
    reformatFileInput.addEventListener('change', e => {
        if (e.target.files[0]) loadReformatFile(e.target.files[0]);
    });
    clearReformatFile.addEventListener('click', clearReformatFileHandler);
    reformatSubmitBtn.addEventListener('click', startReformat);
    copyReformatBtn.addEventListener('click', () => copyText(reformatResult, 'Formatted text copied!'));
    downloadReformatBtn.addEventListener('click', () => downloadText(reformatResult, 'formatted_transcript.txt'));
    newReformatBtn.addEventListener('click', resetReformat);
    reformatRetryBtn.addEventListener('click', resetReformat);
}

// File handling
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        validateAndSetFile(file);
    }
}

function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    
    const file = e.dataTransfer.files[0];
    if (file) {
        validateAndSetFile(file);
    }
}

function validateAndSetFile(file) {
    // Check file type
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(wav|mp3|m4a|flac|ogg|webm)$/i)) {
        showToast('Please select a valid audio file', 'error');
        return;
    }
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        showToast('File size must be less than 1GB', 'error');
        return;
    }
    
    selectedFile = file;
    displaySelectedFile(file);
}

function displaySelectedFile(file) {
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);

    uploadArea.style.display = 'none';
    fileSelected.style.display = 'block';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function resetUpload() {
    selectedFile = null;
    transcriptionResult = null;
    fileInput.value = '';

    uploadArea.style.display = 'block';
    fileSelected.style.display = 'none';
    progressSection.style.display = 'none';
    resultSection.style.display = 'none';
    errorSection.style.display = 'none';
    uploadSection.style.display = 'block';
}

// Transcription
async function startTranscription() {
    if (!selectedFile) {
        showToast('Please select a file first', 'error');
        return;
    }

    // Show progress
    uploadSection.style.display = 'none';
    progressSection.style.display = 'block';

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
        // Create abort controller for timeout
        // 2 hour timeout for large files (1 hour audio can take 30-60 minutes to process)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7200000); // 2 hour timeout

        const response = await fetch('/transcribe', {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Transcription failed');
        }

        const data = await response.json();
        transcriptionResult = data;

        // Show result
        progressSection.style.display = 'none';
        displayResult(data);

    } catch (error) {
        console.error('Transcription error:', error);
        progressSection.style.display = 'none';

        if (error.name === 'AbortError') {
            showError('Transcription timed out. The file may be too large or complex. Please try a shorter audio file.');
        } else {
            showError(error.message || 'An unexpected error occurred. Please try again.');
        }
    }
}

function displayResult(data) {
    resultText.textContent = data.text || 'No transcription available';
    languageBadge.textContent = data.language ? getLanguageName(data.language) : 'Unknown';
    resultSection.style.display = 'block';
}

function showError(message) {
    errorMessage.textContent = message;
    errorSection.style.display = 'block';
}

// Language names mapping
function getLanguageName(code) {
    const languages = {
        'en': 'English',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
        'it': 'Italian',
        'pt': 'Portuguese',
        'nl': 'Dutch',
        'ru': 'Russian',
        'zh': 'Chinese',
        'ja': 'Japanese',
        'ko': 'Korean',
        'ar': 'Arabic',
        'hi': 'Hindi',
        'tr': 'Turkish',
        'pl': 'Polish',
        'uk': 'Ukrainian',
        'vi': 'Vietnamese',
        'th': 'Thai',
        'id': 'Indonesian',
        'ms': 'Malay',
        'fa': 'Persian',
        'he': 'Hebrew',
        'sv': 'Swedish',
        'no': 'Norwegian',
        'da': 'Danish',
        'fi': 'Finnish',
        'cs': 'Czech',
        'ro': 'Romanian',
        'hu': 'Hungarian',
        'el': 'Greek',
        'bg': 'Bulgarian',
        'sr': 'Serbian',
        'hr': 'Croatian',
        'sk': 'Slovak',
        'sl': 'Slovenian',
        'et': 'Estonian',
        'lv': 'Latvian',
        'lt': 'Lithuanian'
    };
    return languages[code] || code.toUpperCase();
}

// Copy to clipboard (transcription)
function copyToClipboard() {
    copyText(transcriptionResult && transcriptionResult.text, 'Text copied to clipboard!');
}

// Download transcription
function downloadTranscription() {
    downloadText(transcriptionResult && transcriptionResult.text, `transcription_${Date.now()}.txt`);
}

// ── Toast notifications ───────────────────────────────────────
function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── Shared helpers ────────────────────────────────────────────
function copyText(text, successMsg) {
    if (!text) { showToast('No text to copy', 'error'); return; }
    navigator.clipboard.writeText(text)
        .then(() => showToast(successMsg || 'Copied!', 'success'))
        .catch(() => showToast('Failed to copy text', 'error'));
}

function downloadText(text, filename) {
    if (!text) { showToast('No text to download', 'error'); return; }
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `transcript_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Downloaded!', 'success');
}

// Central reformat API call
async function callReformat(text) {
    const response = await fetch('/reformat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(660000)  // 11 minutes
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Reformat failed');
    }
    const data = await response.json();
    return data.formatted_text;
}

// ── Inline reformat (Tab 1, after transcription) ──────────────
async function startInlineReformat() {
    if (!transcriptionResult || !transcriptionResult.text) {
        showToast('No transcription to reformat', 'error');
        return;
    }

    // Reset prior inline result
    inlineReformatResult = null;
    reformatInlineResult.style.display = 'none';
    reformatInlineProgress.style.display = 'flex';
    reformatInline.style.display = 'block';
    reformatFromResultBtn.disabled = true;
    reformatFromResultBtn.textContent = 'Reformatting…';

    // Scroll to the progress indicator
    reformatInline.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
        const formatted = await callReformat(transcriptionResult.text);
        inlineReformatResult = formatted;
        reformatInlineText.textContent = formatted;
        reformatInlineProgress.style.display = 'none';
        reformatInlineResult.style.display = 'block';
        reformatFromResultBtn.textContent = '✓ Reformatted';
    } catch (error) {
        reformatInlineProgress.style.display = 'none';
        reformatInline.style.display = 'none';
        reformatFromResultBtn.disabled = false;
        reformatFromResultBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            Reformat with AI`;
        showToast(error.message || 'Reformat failed', 'error');
    }
}

// ── Tab 2: Reformat file / text ───────────────────────────────
function loadReformatFile(file) {
    if (!file.name.match(/\.txt$/i) && file.type !== 'text/plain') {
        showToast('Please select a .txt file', 'error');
        return;
    }
    const reader = new FileReader();
    reader.onload = e => {
        reformatTextarea.value = e.target.result;
        reformatFileName.textContent = `${file.name} (${formatFileSize(file.size)})`;
        reformatFileInfo.style.display = 'flex';
    };
    reader.onerror = () => showToast('Failed to read file', 'error');
    reader.readAsText(file);
}

function clearReformatFileHandler() {
    reformatFileInput.value = '';
    reformatTextarea.value = '';
    reformatFileInfo.style.display = 'none';
}

async function startReformat() {
    const text = reformatTextarea.value.trim();
    if (!text) {
        showToast('Please paste or upload text first', 'error');
        return;
    }

    // Show progress
    document.getElementById('reformatSection').style.display = 'none';
    reformatProgressSection.style.display = 'block';
    reformatErrorSection.style.display = 'none';
    reformatResultSection.style.display = 'none';

    try {
        const formatted = await callReformat(text);
        reformatResult = formatted;
        reformatResultText.textContent = formatted;
        reformatProgressSection.style.display = 'none';
        reformatResultSection.style.display = 'block';
    } catch (error) {
        reformatProgressSection.style.display = 'none';
        reformatErrorMessage.textContent = error.message || 'An unexpected error occurred.';
        reformatErrorSection.style.display = 'block';
    }
}

function resetReformat() {
    reformatResult = null;
    reformatTextarea.value = '';
    reformatFileInput.value = '';
    reformatFileInfo.style.display = 'none';
    reformatProgressSection.style.display = 'none';
    reformatResultSection.style.display = 'none';
    reformatErrorSection.style.display = 'none';
    document.getElementById('reformatSection').style.display = 'block';
}

