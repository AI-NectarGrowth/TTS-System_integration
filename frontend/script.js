// Audio-to-Text Application - Frontend JavaScript
// Updated for better error handling and CORS support

// Configuration
const BACKEND_URL = window.location.origin; // Auto-detect current origin
console.log('Frontend loaded. Backend URL:', BACKEND_URL);

// DOM Elements
const audioFileInput = document.getElementById('audioFile');
const uploadBox = document.getElementById('uploadBox');
const transcribeBtn = document.getElementById('transcribeBtn');
const translateBtn = document.getElementById('translateBtn');
const clearBtn = document.getElementById('clearBtn');
const recordBtn = document.getElementById('recordBtn');
const stopBtn = document.getElementById('stopBtn');
const recordedAudio = document.getElementById('recordedAudio');
const recordingIndicator = document.getElementById('recordingIndicator');
const resultText = document.getElementById('resultText');
const languageBadge = document.getElementById('languageBadge');
const durationBadge = document.getElementById('durationBadge');
const segmentsContainer = document.getElementById('segmentsContainer');
const segmentsCount = document.getElementById('segmentsCount');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const loadingContainer = document.getElementById('loadingContainer');
const connectionStatus = document.getElementById('connectionStatus');
const backendUrl = document.getElementById('backendUrl');
const toast = document.getElementById('toast');
const languageSelect = document.getElementById('language');

// State variables
let mediaRecorder = null;
let audioChunks = [];
let currentAudioBlob = null;
let audioStream = null;
let backendConnected = false;

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Audio-to-Text application...');
    
    // Update backend URL display
    backendUrl.textContent = BACKEND_URL;
    console.log('Using backend URL:', BACKEND_URL);
    
    // Check backend connection
    checkBackendConnection();
    
    // Setup event listeners
    setupEventListeners();
    
    // Check if we're on HTTPS (required for microphone)
    checkHTTPS();
});

// Check if we're on HTTPS (microphone requires HTTPS or localhost)
function checkHTTPS() {
    const isLocalhost = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1';
    const isHTTPS = window.location.protocol === 'https:';
    
    if (!isHTTPS && !isLocalhost) {
        showToast(
            '⚠️ Microphone access requires HTTPS. ' +
            'Recording may not work on HTTP. Use the ngrok HTTPS URL.',
            'warning',
            5000
        );
    }
}

// Check backend connection
async function checkBackendConnection() {
    try {
        console.log('Testing backend connection to:', `${BACKEND_URL}/api/health`);
        
        const response = await fetch(`${BACKEND_URL}/api/health`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            mode: 'cors'
        });
        
        console.log('Health check response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Backend health check successful:', data);
            
            connectionStatus.innerHTML = '<i class="fas fa-circle" style="color: #4CAF50"></i> Connected to backend';
            connectionStatus.style.color = '#4CAF50';
            backendConnected = true;
            
            showToast('✅ Backend connected successfully!', 'success');
        } else {
            connectionStatus.innerHTML = '<i class="fas fa-circle" style="color: #f44336"></i> Backend connection failed';
            connectionStatus.style.color = '#f44336';
            showToast('Backend returned error: ' + response.status, 'error');
        }
    } catch (error) {
        console.error('Backend connection failed:', error);
        connectionStatus.innerHTML = '<i class="fas fa-circle" style="color: #f44336"></i> Cannot connect to backend';
        connectionStatus.style.color = '#f44336';
        
        showToast(
            `❌ Cannot connect to backend: ${error.message}. ` +
            `Make sure the Python server is running at ${BACKEND_URL}`,
            'error',
            6000
        );
    }
}

// Setup all event listeners
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // File upload handlers
    uploadBox.addEventListener('click', () => {
        audioFileInput.click();
    });
    
    uploadBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadBox.style.borderColor = '#4CAF50';
        uploadBox.style.background = '#e8f5e9';
        uploadBox.style.transform = 'scale(1.02)';
    });
    
    uploadBox.addEventListener('dragleave', () => {
        uploadBox.style.borderColor = '#667eea';
        uploadBox.style.background = '#f8f9ff';
        uploadBox.style.transform = 'scale(1)';
    });
    
    uploadBox.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadBox.style.borderColor = '#667eea';
        uploadBox.style.background = '#f8f9ff';
        uploadBox.style.transform = 'scale(1)';
        
        if (e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            handleAudioFile(file);
        }
    });
    
    audioFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            handleAudioFile(file);
        }
    });
    
    // Recording handlers
    recordBtn.addEventListener('click', startRecording);
    stopBtn.addEventListener('click', stopRecording);
    
    // Action button handlers
    transcribeBtn.addEventListener('click', () => processAudio('transcribe'));
    translateBtn.addEventListener('click', () => processAudio('translate'));
    clearBtn.addEventListener('click', clearAll);
    copyBtn.addEventListener('click', copyText);
    downloadBtn.addEventListener('click', downloadText);
    
    console.log('Event listeners setup complete');
}

// Handle audio file selection
function handleAudioFile(file) {
    if (!isAudioFile(file)) {
        showToast('❌ Please select an audio file (MP3, WAV, M4A, WEBM, MP4)', 'error');
        return;
    }
    
    // Check file size (25MB limit)
    if (file.size > 25 * 1024 * 1024) {
        showToast('❌ File too large. Maximum size is 25MB', 'error');
        return;
    }
    
    currentAudioBlob = file;
    
    // Show file info
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    showToast(`✅ File loaded: ${file.name} (${fileSizeMB} MB)`, 'success');
    
    // If it's a recording, play it
    if (file.type.includes('audio')) {
        const audioUrl = URL.createObjectURL(file);
        recordedAudio.src = audioUrl;
        recordedAudio.style.display = 'block';
    }
}

// Check if file is an audio file
function isAudioFile(file) {
    const audioTypes = [
        'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4',
        'audio/webm', 'audio/ogg', 'audio/x-m4a'
    ];
    
    const audioExtensions = ['mp3', 'wav', 'm4a', 'webm', 'mp4', 'ogg', 'mpga', 'mpeg'];
    const extension = file.name.split('.').pop().toLowerCase();
    
    return audioTypes.includes(file.type) || audioExtensions.includes(extension);
}

// Start audio recording
async function startRecording() {
    try {
        console.log('Requesting microphone access...');
        
        // Request microphone access
        audioStream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                channelCount: 1,
                sampleRate: 16000,
                echoCancellation: true,
                noiseSuppression: true
            }
        });
        
        // Create media recorder
        mediaRecorder = new MediaRecorder(audioStream);
        audioChunks = [];
        
        // Handle data available
        mediaRecorder.addEventListener('dataavailable', (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        });
        
        // Handle recording stop
        mediaRecorder.addEventListener('stop', () => {
            const audioBlob = new Blob(audioChunks, { 
                type: 'audio/webm;codecs=opus' 
            });
            
            currentAudioBlob = audioBlob;
            
            // Create audio URL for playback
            const audioUrl = URL.createObjectURL(audioBlob);
            recordedAudio.src = audioUrl;
            recordedAudio.style.display = 'block';
            
            showToast('✅ Recording saved. Ready to transcribe.', 'success');
        });
        
        // Start recording
        mediaRecorder.start(1000); // Collect data every second
        console.log('Recording started');
        
        // Update UI
        recordBtn.disabled = true;
        stopBtn.disabled = false;
        recordingIndicator.style.display = 'flex';
        
        showToast('🎤 Recording started... Speak now!', 'info');
        
    } catch (error) {
        console.error('Microphone access error:', error);
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            showToast(
                '❌ Microphone access denied. ' +
                'Please allow microphone access in your browser settings.',
                'error',
                6000
            );
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            showToast('❌ No microphone found. Please connect a microphone.', 'error');
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            showToast('❌ Microphone is in use by another application.', 'error');
        } else {
            showToast(`❌ Microphone error: ${error.message}`, 'error');
        }
    }
}

// Stop audio recording
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        
        // Stop all audio tracks
        if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop());
            audioStream = null;
        }
        
        // Update UI
        recordBtn.disabled = false;
        stopBtn.disabled = true;
        recordingIndicator.style.display = 'none';
        
        console.log('Recording stopped');
    }
}

// Process audio (transcribe or translate)
async function processAudio(action) {
    // Validate
    if (!currentAudioBlob) {
        showToast('❌ Please upload or record audio first', 'error');
        return;
    }
    
    if (!backendConnected) {
        showToast('❌ Backend not connected. Please check server.', 'error');
        return;
    }
    
    console.log(`Processing audio (${action})...`);
    
    // Show loading
    loadingContainer.style.display = 'block';
    transcribeBtn.disabled = true;
    translateBtn.disabled = true;
    transcribeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    translateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    try {
        const formData = new FormData();
        
        // Add audio file to form data
        if (currentAudioBlob instanceof File) {
            formData.append('audio', currentAudioBlob, currentAudioBlob.name);
        } else {
            // For recorded audio (Blob), create a File
            const file = new File([currentAudioBlob], 'recording.webm', { 
                type: 'audio/webm' 
            });
            formData.append('audio', file);
        }
        
        // Add language for transcription
        if (action === 'transcribe') {
            const language = languageSelect.value;
            if (language) {
                formData.append('language', language);
            }
        }
        
        // Determine endpoint
        const endpoint = action === 'transcribe' ? 'transcribe' : 'translate';
        const apiUrl = `${BACKEND_URL}/api/${endpoint}`;
        
        console.log(`Sending request to: ${apiUrl}`);
        
        // Send request
        const response = await fetch(apiUrl, {
            method: 'POST',
            body: formData,
            mode: 'cors'
        });
        
        console.log('Response status:', response.status);
        
        const result = await response.json();
        console.log('Response data:', result);
        
        if (response.ok && result.success) {
            // Update UI with results
            resultText.value = result.text;
            
            // Update badges
            languageBadge.textContent = `Language: ${result.language || 'auto-detected'}`;
            if (result.duration) {
                durationBadge.textContent = `Duration: ${result.duration.toFixed(2)}s`;
            }
            
            // Update segments
            if (result.segments && result.segments.length > 0) {
                updateSegments(result.segments);
            } else {
                segmentsContainer.innerHTML = '<p class="empty-state">No segment data available</p>';
                segmentsCount.textContent = '0 segments';
            }
            
            showToast(
                `✅ ${action === 'transcribe' ? 'Transcription' : 'Translation'} successful!`,
                'success'
            );
            
        } else {
            const errorMsg = result.error || 'Unknown error';
            showToast(`❌ ${action} failed: ${errorMsg}`, 'error');
            console.error('API error:', result);
        }
        
    } catch (error) {
        console.error('Network error:', error);
        showToast(
            `❌ Network error: ${error.message}. ` +
            'Check: 1) Backend is running 2) CORS is enabled 3) URL is correct',
            'error'
        );
    } finally {
        // Hide loading
        loadingContainer.style.display = 'none';
        transcribeBtn.disabled = false;
        translateBtn.disabled = false;
        transcribeBtn.innerHTML = '<i class="fas fa-transcript"></i> Transcribe to Text';
        translateBtn.innerHTML = '<i class="fas fa-language"></i> Translate to English';
    }
}

// Update segments display
function updateSegments(segments) {
    segmentsContainer.innerHTML = '';
    segmentsCount.textContent = `${segments.length} segments`;
    
    segments.forEach(segment => {
        const segmentElement = document.createElement('div');
        segmentElement.className = 'segment-item';
        segmentElement.innerHTML = `
            <div class="segment-time">
                ${formatTime(segment.start)} - ${formatTime(segment.end)}
            </div>
            <div class="segment-text">${segment.text}</div>
        `;
        segmentsContainer.appendChild(segmentElement);
    });
}

// Format time (seconds to MM:SS.ms)
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(5, '0')}`;
}

// Clear all inputs and results
function clearAll() {
    currentAudioBlob = null;
    audioFileInput.value = '';
    resultText.value = '';
    languageBadge.textContent = 'Language: --';
    durationBadge.textContent = 'Duration: --';
    segmentsContainer.innerHTML = '<p class="empty-state">No segments available yet</p>';
    segmentsCount.textContent = '0 segments';
    
    // Stop recording if active
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    
    // Clear audio player
    recordedAudio.src = '';
    recordedAudio.style.display = 'none';
    
    // Reset UI
    recordBtn.disabled = false;
    stopBtn.disabled = true;
    recordingIndicator.style.display = 'none';
    
    showToast('🧹 All cleared', 'info');
}

// Copy text to clipboard
async function copyText() {
    const text = resultText.value.trim();
    
    if (!text) {
        showToast('❌ No text to copy', 'error');
        return;
    }
    
    try {
        await navigator.clipboard.writeText(text);
        showToast('✅ Text copied to clipboard', 'success');
    } catch (error) {
        // Fallback for older browsers
        resultText.select();
        document.execCommand('copy');
        showToast('✅ Text copied to clipboard (fallback)', 'success');
    }
}

// Download text as file
function downloadText() {
    const text = resultText.value.trim();
    
    if (!text) {
        showToast('❌ No text to download', 'error');
        return;
    }
    
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = `transcription_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('✅ Text downloaded', 'success');
}

// Show toast notification
function showToast(message, type = 'info', duration = 3000) {
    toast.textContent = message;
    
    // Remove previous type classes
    toast.classList.remove('success', 'error', 'warning', 'info');
    
    // Add type class
    toast.classList.add(type);
    
    // Show toast
    toast.style.display = 'block';
    toast.style.opacity = '1';
    
    // Auto hide
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 300);
    }, duration);
}

// Export for debugging
window.app = {
    checkBackendConnection,
    startRecording,
    stopRecording,
    processAudio,
    clearAll,
    showToast
};

console.log('Audio-to-Text application initialized successfully!');