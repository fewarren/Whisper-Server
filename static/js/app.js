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
const progressTitle = document.getElementById('progressTitle');
const progressMessage = document.getElementById('progressMessage');
const progressNote = document.getElementById('progressNote');
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

// Diarization toggle
const diarizeToggle = document.getElementById('diarizeToggle');
const diarizeUnavailable = document.getElementById('diarizeUnavailable');
const diarizeSubtitle = document.getElementById('diarizeSubtitle');

// Inline reformat (from transcription result)
const reformatFromResultBtn = document.getElementById('reformatFromResultBtn');
const reformatInline = document.getElementById('reformatInline');
const reformatInlineProgress = document.getElementById('reformatInlineProgress');
const reformatInlineResult = document.getElementById('reformatInlineResult');
const reformatInlineText = document.getElementById('reformatInlineText');
const copyFormattedBtn = document.getElementById('copyFormattedBtn');
const downloadFormattedBtn = document.getElementById('downloadFormattedBtn');

// ── Help modal ────────────────────────────────────────────────
const appShell = document.getElementById('appShell');
const helpBtn        = document.getElementById('helpBtn');
const helpModal      = document.getElementById('helpModal');
const helpModalClose = document.getElementById('helpModalClose');
const helpModalDialog = helpModal.querySelector('.modal-dialog');

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
let selectedReformatFile = null;  // file loaded in tab-2
let transcriptionResult = null;
let reformatResult = null;        // result from tab-2 reformat
let inlineReformatResult = null;  // result from inline reformat (tab-1)

// Constants
const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10 GB
const ALLOWED_TYPES = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/flac', 'audio/ogg', 'audio/webm', 'video/mp4'];
const HELP_MODAL_FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const DEFAULT_REFORMAT_BUTTON_HTML = reformatFromResultBtn.innerHTML.trim();

let lastFocusedElement = null;

// ── Initialize ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    fetchDeviceInfo();
    fetchDiarizationStatus();
    setupEventListeners();
    setupTabListeners();
    setupReformatListeners();
    setupHelpModal();
});

/**
 * Set up event handlers that manage opening, closing, and keyboard focus behavior for the help modal.
 *
 * Registers click handlers to open and close the modal, closes the modal when clicking the overlay,
 * and handles `Escape` to close and `Tab` to trap focus while the modal is open.
 */
function setupHelpModal() {
    helpBtn.addEventListener('click', openHelpModal);
    helpModalClose.addEventListener('click', closeHelpModal);

    // Close when clicking the dark overlay (outside the dialog)
    helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) closeHelpModal();
    });

    document.addEventListener('keydown', (e) => {
        if (!helpModal.classList.contains('open')) return;

        if (e.key === 'Escape') {
            e.preventDefault();
            closeHelpModal();
            return;
        }

        if (e.key === 'Tab') {
            trapHelpModalFocus(e);
        }
    });
}

/**
 * Open the help modal, store the previously focused element, make the main app shell inert for accessibility, and move focus into the modal.
 *
 * This sets the modal's visible/ARIA state and shifts keyboard focus to the first available focusable element inside the modal (or to the dialog container as a fallback).
 */
function openHelpModal() {
    lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    helpModal.classList.add('open');
    helpModal.setAttribute('aria-hidden', 'false');

    if (appShell) {
        appShell.setAttribute('aria-hidden', 'true');
        appShell.setAttribute('inert', '');
    }

    const focusable = getHelpModalFocusableElements();
    (focusable[0] || helpModalDialog || helpModal).focus();
}

/**
 * Close the help modal, restore page accessibility state, and return focus to the previously focused element.
 *
 * Removes the modal's visible/open state and sets its `aria-hidden` attribute to true. If the application
 * shell element exists, its `aria-hidden` and `inert` attributes are removed to make the page interactive again.
 * If a previously focused element was recorded, focus is moved back to that element.
 */
function closeHelpModal() {
    helpModal.classList.remove('open');
    helpModal.setAttribute('aria-hidden', 'true');

    if (appShell) {
        appShell.removeAttribute('aria-hidden');
        appShell.removeAttribute('inert');
    }

    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
        lastFocusedElement.focus();
    }
}

/**
 * Retrieve focusable elements inside the help modal that are not marked with `aria-hidden`.
 * @returns {HTMLElement[]} An array of HTMLElements found within the help modal matching focusable selectors defined by `HELP_MODAL_FOCUSABLE` and not having the `aria-hidden` attribute.
 */
function getHelpModalFocusableElements() {
    return Array.from(helpModal.querySelectorAll(HELP_MODAL_FOCUSABLE)).filter((element) => (
        element instanceof HTMLElement && !element.hasAttribute('aria-hidden')
    ));
}

/**
 * Keep keyboard focus trapped inside the help modal when tabbing.
 *
 * When the user presses Tab or Shift+Tab, prevents focus from leaving the modal by
 * cycling focus to the first or last focusable element as appropriate. If the modal
 * has no focusable elements, focuses the modal container itself.
 *
 * @param {KeyboardEvent} event - The keyboard event for Tab navigation; the function
 *   prevents the event's default behavior when it adjusts focus.
 */
function trapHelpModalFocus(event) {
    const focusable = getHelpModalFocusableElements();
    if (!focusable.length) {
        event.preventDefault();
        helpModal.focus();
        return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (!helpModal.contains(active)) {
        event.preventDefault();
        first.focus();
        return;
    }

    if (event.shiftKey && (active === first || active === helpModal)) {
        event.preventDefault();
        last.focus();
        return;
    }

    if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
    }
}

/**
 * Populate the global `deviceInfo` element with the server-provided device code in uppercase.
 *
 * If the request fails or the response cannot be parsed, logs an error to the console and leaves `deviceInfo` unchanged.
 */
async function fetchDeviceInfo() {
    try {
        const response = await fetch('/api/device-info');
        const data = await response.json();
        deviceInfo.textContent = data.device.toUpperCase();
    } catch (error) {
        console.error('Failed to fetch device info:', error);
    }
}

// Fetch diarization availability
async function fetchDiarizationStatus() {
    try {
        const response = await fetch('/api/diarization-status');
        const data = await response.json();
        if (data.available) {
            diarizeToggle.disabled = false;
            diarizeSubtitle.textContent = 'Identify who is speaking using voice analysis';
            diarizeUnavailable.style.display = 'none';
        } else {
            diarizeToggle.disabled = true;
            diarizeSubtitle.textContent = 'Unavailable — HF_TOKEN not configured';
            diarizeUnavailable.style.display = 'flex';
        }
    } catch (error) {
        console.error('Failed to fetch diarization status:', error);
        diarizeToggle.disabled = true;
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
    downloadFormattedBtn.addEventListener('click', () => {
        downloadText(inlineReformatResult, makeFormattedFilename(selectedFile));
    });
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
    downloadReformatBtn.addEventListener('click', () => {
        downloadText(reformatResult, makeFormattedFilename(selectedReformatFile));
    });
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
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(wav|mp3|m4a|flac|ogg|webm|mp4)$/i)) {
        showToast('Please select a valid audio or MP4 video file', 'error');
        return;
    }
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        showToast('File size must be less than 10 GB', 'error');
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

/**
 * Reset the upload tab to its initial state.
 *
 * Clears the selected file and transcription state, resets the file input,
 * clears inline reformat state, and restores the upload UI (shows upload area
 * and hides file info, progress, results, and error sections).
 */
function resetUpload() {
    selectedFile = null;
    transcriptionResult = null;
    fileInput.value = '';
    resetInlineReformatState();

    uploadArea.style.display = 'block';
    fileSelected.style.display = 'none';
    progressSection.style.display = 'none';
    resultSection.style.display = 'none';
    errorSection.style.display = 'none';
    uploadSection.style.display = 'block';
}

/**
 * Reset the inline reformat UI and associated state to its initial, idle state.
 *
 * Clears any stored inline reformat result and text, hides progress/result sections,
 * and restores the reformat-from-result button to its default enabled state and label.
 */
function resetInlineReformatState() {
    inlineReformatResult = null;
    reformatInlineText.textContent = '';
    reformatInline.style.display = 'none';
    reformatInlineProgress.style.display = 'none';
    reformatInlineResult.style.display = 'none';
    reformatFromResultBtn.disabled = false;
    reformatFromResultBtn.innerHTML = DEFAULT_REFORMAT_BUTTON_HTML;
}

/**
 * Uploads the currently selected file to the server for transcription and updates the UI with progress and results.
 *
 * Sends the selected file (and the diarization flag if enabled) to the /transcribe endpoint, stores the returned transcription in the global `transcriptionResult`, and displays either the transcription result or an error message in the UI.
 */
async function startTranscription() {
    if (!selectedFile) {
        showToast('Please select a file first', 'error');
        return;
    }

    const diarize = diarizeToggle && diarizeToggle.checked && !diarizeToggle.disabled;

    // Show progress with appropriate messages
    uploadSection.style.display = 'none';
    progressSection.style.display = 'block';
    if (diarize) {
        progressTitle.textContent = 'Transcribing & identifying speakers...';
        progressMessage.textContent = 'WhisperX is transcribing, aligning, and diarizing the extracted audio.';
        progressNote.textContent = 'Speaker identification adds extra processing time. A 1-hour file may take 45-75 minutes.';
    } else {
        progressTitle.textContent = 'Transcribing your file...';
        progressMessage.textContent = 'This may take a few moments depending on the file size';
        progressNote.textContent = 'Large files (1+ hour) may take 30-60 minutes to process. Please be patient.';
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    if (diarize) formData.append('diarize', 'true');

    try {
        // 2 hour timeout for large files (diarization can take longer)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7200000);

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
            showError('Transcription timed out. The file may be too large or complex. Please try a shorter file.');
        } else {
            showError(error.message || 'An unexpected error occurred. Please try again.');
        }
    }
}

function displayResult(data) {
    resultText.textContent = data.text || 'No transcription available';
    const langName = data.language ? getLanguageName(data.language) : 'Unknown';
    languageBadge.textContent = data.diarized ? `${langName} · 🎤 Diarized` : langName;
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
    downloadText(transcriptionResult && transcriptionResult.text, makeTranscriptFilename(selectedFile));
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

// Return the base name of a File (strips extension)
function baseNameOf(file) {
    if (!file) return null;
    return file.name.replace(/\.[^.]+$/, '');
}

function sanitizeDownloadBaseName(name, fallback = 'transcript') {
    const cleaned = String(name || '')
        .trim()
        .replace(/[\\/:*?"<>|]+/g, '_')
        .replace(/\s+/g, '_')
        .replace(/_formatted$/i, '');

    return cleaned || fallback;
}

function makeTranscriptFilename(file) {
    const fallback = `transcription_${Date.now()}`;
    return `${sanitizeDownloadBaseName(baseNameOf(file), fallback)}.txt`;
}

function makeFormattedFilename(file) {
    return `${sanitizeDownloadBaseName(baseNameOf(file))}_formatted.txt`;
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
    showToast(`Downloaded ${a.download}`, 'success');
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

/**
 * Start an inline reformat of the current transcription and display the formatted text.
 *
 * If there is no transcription, shows an error toast and returns without action.
 * While running, updates inline reformat UI (shows progress, disables the reformat button) and scrolls the progress into view.
 * On success, stores the formatted text in `inlineReformatResult` and reveals the formatted result in the UI.
 * On failure, resets inline reformat state and shows an error toast with the failure message.
 */
async function startInlineReformat() {
    if (!transcriptionResult || !transcriptionResult.text) {
        showToast('No transcription to reformat', 'error');
        return;
    }

    resetInlineReformatState();
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
        resetInlineReformatState();
        showToast(error.message || 'Reformat failed', 'error');
    }
}

// ── Tab 2: Reformat file / text ───────────────────────────────
function loadReformatFile(file) {
    if (!file.name.match(/\.txt$/i) && file.type !== 'text/plain') {
        showToast('Please select a .txt file', 'error');
        return;
    }
    selectedReformatFile = file;
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
    selectedReformatFile = null;
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
    selectedReformatFile = null;
    reformatTextarea.value = '';
    reformatFileInput.value = '';
    reformatFileInfo.style.display = 'none';
    reformatProgressSection.style.display = 'none';
    reformatResultSection.style.display = 'none';
    reformatErrorSection.style.display = 'none';
    document.getElementById('reformatSection').style.display = 'block';
}

