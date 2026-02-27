// DOM Elements
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

// State
let selectedFile = null;
let transcriptionResult = null;

// Constants
const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB
const ALLOWED_TYPES = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/flac', 'audio/ogg', 'audio/webm'];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchDeviceInfo();
    setupEventListeners();
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

// Event Listeners
function setupEventListeners() {
    // Upload area click
    uploadArea.addEventListener('click', () => fileInput.click());
    
    // File input change
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    // Remove file
    removeFile.addEventListener('click', resetUpload);
    
    // Transcribe button
    transcribeBtn.addEventListener('click', startTranscription);
    
    // Copy button
    copyBtn.addEventListener('click', copyToClipboard);
    
    // Download button
    downloadBtn.addEventListener('click', downloadTranscription);
    
    // New transcription button
    newTranscriptionBtn.addEventListener('click', resetUpload);
    
    // Retry button
    retryBtn.addEventListener('click', resetUpload);
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

// Copy to clipboard
async function copyToClipboard() {
    if (!transcriptionResult || !transcriptionResult.text) {
        showToast('No text to copy', 'error');
        return;
    }

    try {
        await navigator.clipboard.writeText(transcriptionResult.text);
        showToast('Text copied to clipboard!', 'success');
    } catch (error) {
        console.error('Failed to copy:', error);
        showToast('Failed to copy text', 'error');
    }
}

// Download transcription
function downloadTranscription() {
    if (!transcriptionResult || !transcriptionResult.text) {
        showToast('No text to download', 'error');
        return;
    }

    const blob = new Blob([transcriptionResult.text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcription_${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Transcription downloaded!', 'success');
}

// Toast notifications
function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

