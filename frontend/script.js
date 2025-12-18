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
const conversationContainer = document.getElementById('conversationContainer');
const conversationCount = document.getElementById('conversationCount');
const diarizationBadge = document.getElementById('diarizationBadge');
const soapCard = document.getElementById('soapCard');
const soapContainer = document.getElementById('soapContainer');
const soapSubjective = document.getElementById('soapSubjective');
const soapObjective = document.getElementById('soapObjective');
const soapAssessment = document.getElementById('soapAssessment');
const soapPlan = document.getElementById('soapPlan');
const copySoapBtn = document.getElementById('copySoapBtn');
const downloadSoapBtn = document.getElementById('downloadSoapBtn');
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
let currentConversation = null; // Store conversation for SOAP generation

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
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': '1'
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
    copySoapBtn.addEventListener('click', copySOAPNotes);
    downloadSoapBtn.addEventListener('click', toggleExportMenu);
    
    // SOAP Edit/Save handlers
    const editSoapBtn = document.getElementById('editSoapBtn');
    const saveSoapBtn = document.getElementById('saveSoapBtn');
    if (editSoapBtn) editSoapBtn.addEventListener('click', toggleEditMode);
    if (saveSoapBtn) saveSoapBtn.addEventListener('click', toggleEditMode);
    
    // Export format handlers
    const exportPDF = document.getElementById('exportPDF');
    const exportWord = document.getElementById('exportWord');
    const exportText = document.getElementById('exportText');
    if (exportPDF) exportPDF.addEventListener('click', (e) => {
        e.preventDefault();
        downloadSOAPAsPDF();
        toggleExportMenu();
    });
    if (exportWord) exportWord.addEventListener('click', (e) => {
        e.preventDefault();
        downloadSOAPAsWord();
        toggleExportMenu();
    });
    if (exportText) exportText.addEventListener('click', (e) => {
        e.preventDefault();
        downloadSOAPAsText();
        toggleExportMenu();
    });
    
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
        
        // Send request with ngrok header
        const response = await fetch(apiUrl, {
            method: 'POST',
            body: formData,
            mode: 'cors',
            headers: {
                'ngrok-skip-browser-warning': '1'
            }
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
            
            // Update diarization status
            diarizationBadge.textContent = `Diarization: ${result.diarization_available ? 'Active' : 'Basic'}`;
            diarizationBadge.style.background = result.diarization_available ? 
                'linear-gradient(135deg, var(--sky-blue) 0%, var(--light-blue) 100%)' : 
                'rgba(0, 119, 182, 0.3)';
            
            // Display conversation if available
            if (result.conversation && result.conversation.length > 0) {
                displayConversation(result.conversation);
                
                // Automatically generate SOAP notes after transcription
                if (action === 'transcribe') {
                    console.log('Auto-generating SOAP notes...');
                    setTimeout(() => generateSOAPNotes(), 500); // Small delay for better UX
                }
            } else {
                conversationContainer.innerHTML = '<p class="empty-state">No conversation detected</p>';
                conversationCount.textContent = '0 turns';
            }
            
            // Update segments (legacy)
            if (result.segments && result.segments.length > 0) {
                updateSegments(result.segments);
            } else {
                segmentsContainer.innerHTML = '<p class="empty-state">No segment data available</p>';
                segmentsCount.textContent = '0 segments';
            }
            
            // Show transcription section
            document.getElementById('transcriptionSection').style.display = 'block';
            
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
        transcribeBtn.innerHTML = '<i class="fas fa-file-medical"></i> Generate SOAP Notes and Transcribe Text';
        translateBtn.innerHTML = '<i class="fas fa-language"></i> Translate to English';
    }
}

// Display conversation with speaker diarization
function displayConversation(conversation) {
    conversationContainer.innerHTML = '';
    conversationCount.textContent = `${conversation.length} turns`;
    
    // Store conversation for SOAP generation
    currentConversation = conversation;
    
    conversation.forEach(turn => {
        const turnElement = document.createElement('div');
        const speakerClass = turn.speaker.toLowerCase();
        turnElement.className = `conversation-turn ${speakerClass}`;
        
        // Choose icon based on speaker
        const icon = turn.speaker === 'Doctor' ? 'fa-user-md' : 'fa-user';
        
        turnElement.innerHTML = `
            <div class="speaker-bubble">
                <div class="speaker-label">
                    <i class="fas ${icon}"></i>
                    ${turn.speaker}
                </div>
                <div class="speaker-text">${turn.text}</div>
                <div class="speaker-time">
                    ${formatTime(turn.start)} - ${formatTime(turn.end)}
                </div>
            </div>
        `;
        conversationContainer.appendChild(turnElement);
    });
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
    currentConversation = null;
    audioFileInput.value = '';
    resultText.value = '';
    languageBadge.textContent = 'Language: --';
    durationBadge.textContent = 'Duration: --';
    diarizationBadge.textContent = 'Diarization: --';
    segmentsContainer.innerHTML = '<p class="empty-state">No segments available yet</p>';
    segmentsCount.textContent = '0 segments';
    conversationContainer.innerHTML = '<p class="empty-state">No conversation detected yet</p>';
    conversationCount.textContent = '0 turns';
    
    // Hide sections
    document.getElementById('soapSection').style.display = 'none';
    document.getElementById('transcriptionSection').style.display = 'none';
    
    // Clear SOAP content
    soapSubjective.textContent = '';
    soapObjective.textContent = '';
    soapAssessment.textContent = '';
    soapPlan.textContent = '';
    
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

// Generate SOAP Notes
async function generateSOAPNotes() {
    if (!currentConversation || currentConversation.length === 0) {
        showToast('⚠️ No conversation available to generate SOAP notes', 'warning');
        return;
    }
    
    try {
        showToast('🤖 Generating SOAP notes with AI...', 'info');
        
        const response = await fetch(`${BACKEND_URL}/api/generate-soap`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': '1'
            },
            body: JSON.stringify({
                conversation: currentConversation
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            // Display SOAP notes
            soapSubjective.textContent = result.soap_sections.subjective || 'N/A';
            soapObjective.textContent = result.soap_sections.objective || 'N/A';
            soapAssessment.textContent = result.soap_sections.assessment || 'N/A';
            soapPlan.textContent = result.soap_sections.plan || 'N/A';
            
            // Show SOAP section (first)
            document.getElementById('soapSection').style.display = 'block';
            
            // Scroll to top to show SOAP notes first
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            showToast('✅ SOAP notes generated successfully!', 'success');
        } else {
            showToast(`❌ Failed to generate SOAP notes: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('SOAP generation error:', error);
        showToast(`❌ Error: ${error.message}`, 'error');
    }
}

// Copy SOAP Notes
function copySOAPNotes() {
    const soapText = `SUBJECTIVE:\n${soapSubjective.textContent}\n\nOBJECTIVE:\n${soapObjective.textContent}\n\nASSESSMENT:\n${soapAssessment.textContent}\n\nPLAN:\n${soapPlan.textContent}`;
    
    navigator.clipboard.writeText(soapText).then(() => {
        showToast('✅ SOAP notes copied to clipboard!', 'success');
    }).catch(err => {
        showToast('❌ Failed to copy SOAP notes', 'error');
    });
}

// Download SOAP Notes as Text
function downloadSOAPAsText() {
    const soapText = `MEDICAL SOAP NOTES\n${'='.repeat(50)}\n\nS (SUBJECTIVE):\n${soapSubjective.textContent}\n\nO (OBJECTIVE):\n${soapObjective.textContent}\n\nA (ASSESSMENT):\n${soapAssessment.textContent}\n\nP (PLAN):\n${soapPlan.textContent}\n\n${'='.repeat(50)}\nGenerated: ${new Date().toLocaleString()}`;
    
    const blob = new Blob([soapText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SOAP_Notes_${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('✅ SOAP notes downloaded as text!', 'success');
}

// Download SOAP Notes as PDF
async function downloadSOAPAsPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Set colors
        const darkForest = [27, 33, 26];
        const oliveGreen = [98, 129, 65];
        const sageGreen = [139, 174, 102];
        
        // Title
        doc.setFontSize(20);
        doc.setTextColor(...darkForest);
        doc.text('MEDICAL SOAP NOTES', 105, 20, { align: 'center' });
        
        // Date
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 28, { align: 'center' });
        
        let yPos = 45;
        const leftMargin = 20;
        const rightMargin = 190;
        const lineHeight = 7;
        const maxWidth = rightMargin - leftMargin;
        
        // Helper function to add section
        const addSection = (title, content, color) => {
            // Section header
            doc.setFillColor(...color);
            doc.rect(leftMargin, yPos - 5, rightMargin - leftMargin, 10, 'F');
            doc.setFontSize(12);
            doc.setTextColor(255, 255, 255);
            doc.text(title, leftMargin + 3, yPos);
            yPos += 12;
            
            // Section content
            doc.setFontSize(10);
            doc.setTextColor(...darkForest);
            const lines = doc.splitTextToSize(content || 'N/A', maxWidth - 6);
            lines.forEach(line => {
                if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                }
                doc.text(line, leftMargin + 3, yPos);
                yPos += lineHeight;
            });
            yPos += 5;
        };
        
        // Add sections
        addSection('S - SUBJECTIVE', soapSubjective.textContent, sageGreen);
        addSection('O - OBJECTIVE', soapObjective.textContent, oliveGreen);
        addSection('A - ASSESSMENT', soapAssessment.textContent, sageGreen);
        addSection('P - PLAN', soapPlan.textContent, oliveGreen);
        
        // Save PDF
        doc.save(`SOAP_Notes_${new Date().getTime()}.pdf`);
        showToast('✅ SOAP notes downloaded as PDF!', 'success');
    } catch (error) {
        console.error('PDF generation error:', error);
        showToast('❌ Failed to generate PDF', 'error');
    }
}

// Download SOAP Notes as Word (using RTF format for better compatibility)
async function downloadSOAPAsWord() {
    try {
        // Check if docx library is loaded
        if (typeof docx === 'undefined') {
            console.warn('docx library not loaded, falling back to RTF format');
            downloadSOAPAsRTF();
            return;
        }
        
        const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = docx;
        
        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    // Title
                    new Paragraph({
                        text: 'MEDICAL SOAP NOTES',
                        heading: HeadingLevel.HEADING_1,
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 200 }
                    }),
                    
                    // Date
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `Generated: ${new Date().toLocaleString()}`,
                                size: 20,
                                color: '666666'
                            })
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 400 }
                    }),
                    
                    // Subjective
                    new Paragraph({
                        text: 'S - SUBJECTIVE',
                        heading: HeadingLevel.HEADING_2,
                        spacing: { before: 200, after: 100 }
                    }),
                    new Paragraph({
                        text: soapSubjective.textContent || 'N/A',
                        spacing: { after: 300 }
                    }),
                    
                    // Objective
                    new Paragraph({
                        text: 'O - OBJECTIVE',
                        heading: HeadingLevel.HEADING_2,
                        spacing: { before: 200, after: 100 }
                    }),
                    new Paragraph({
                        text: soapObjective.textContent || 'N/A',
                        spacing: { after: 300 }
                    }),
                    
                    // Assessment
                    new Paragraph({
                        text: 'A - ASSESSMENT',
                        heading: HeadingLevel.HEADING_2,
                        spacing: { before: 200, after: 100 }
                    }),
                    new Paragraph({
                        text: soapAssessment.textContent || 'N/A',
                        spacing: { after: 300 }
                    }),
                    
                    // Plan
                    new Paragraph({
                        text: 'P - PLAN',
                        heading: HeadingLevel.HEADING_2,
                        spacing: { before: 200, after: 100 }
                    }),
                    new Paragraph({
                        text: soapPlan.textContent || 'N/A',
                        spacing: { after: 300 }
                    })
                ]
            }]
        });
        
        const blob = await Packer.toBlob(doc);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SOAP_Notes_${new Date().getTime()}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('✅ SOAP notes downloaded as Word!', 'success');
    } catch (error) {
        console.error('Word generation error:', error);
        // Fallback to RTF format
        downloadSOAPAsRTF();
    }
}

// Fallback: Download SOAP Notes as RTF (Rich Text Format - opens in Word)
function downloadSOAPAsRTF() {
    try {
        // RTF document structure
        let rtf = '{\\rtf1\\ansi\\deff0\n';
        rtf += '{\\fonttbl{\\f0 Calibri;}{\\f1 Calibri Bold;}}\n';
        rtf += '{\\colortbl;\\red27\\green33\\blue26;\\red98\\green129\\blue65;}\n';
        
        // Title
        rtf += '\\qc\\f1\\fs32\\b MEDICAL SOAP NOTES\\b0\\fs22\\par\n';
        rtf += `\\qc\\fs18 Generated: ${new Date().toLocaleString()}\\fs22\\par\n`;
        rtf += '\\par\\par\n';
        
        // Helper function to escape RTF special characters
        const escapeRTF = (text) => {
            if (!text) return 'N/A';
            return text
                .replace(/\\/g, '\\\\')
                .replace(/{/g, '\\{')
                .replace(/}/g, '\\}')
                .replace(/\n/g, '\\par\n');
        };
        
        // Subjective
        rtf += '\\ql\\f1\\fs28\\b\\cf2 S - SUBJECTIVE\\cf0\\b0\\fs22\\par\n';
        rtf += `${escapeRTF(soapSubjective.textContent)}\\par\\par\n`;
        
        // Objective
        rtf += '\\f1\\fs28\\b\\cf2 O - OBJECTIVE\\cf0\\b0\\fs22\\par\n';
        rtf += `${escapeRTF(soapObjective.textContent)}\\par\\par\n`;
        
        // Assessment
        rtf += '\\f1\\fs28\\b\\cf2 A - ASSESSMENT\\cf0\\b0\\fs22\\par\n';
        rtf += `${escapeRTF(soapAssessment.textContent)}\\par\\par\n`;
        
        // Plan
        rtf += '\\f1\\fs28\\b\\cf2 P - PLAN\\cf0\\b0\\fs22\\par\n';
        rtf += `${escapeRTF(soapPlan.textContent)}\\par\n`;
        
        rtf += '}';
        
        // Create and download RTF file
        const blob = new Blob([rtf], { type: 'application/rtf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SOAP_Notes_${new Date().getTime()}.rtf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('✅ SOAP notes downloaded as Word (RTF)!', 'success');
    } catch (error) {
        console.error('RTF generation error:', error);
        showToast('❌ Failed to generate Word document', 'error');
    }
}

// Toggle Edit Mode
let isEditMode = false;
function toggleEditMode() {
    isEditMode = !isEditMode;
    const editBtn = document.getElementById('editSoapBtn');
    const saveBtn = document.getElementById('saveSoapBtn');
    
    const sections = [soapSubjective, soapObjective, soapAssessment, soapPlan];
    
    if (isEditMode) {
        // Enable editing
        sections.forEach(section => section.setAttribute('contenteditable', 'true'));
        editBtn.style.display = 'none';
        saveBtn.style.display = 'inline-flex';
        showToast('📝 Edit mode enabled', 'info');
    } else {
        // Disable editing
        sections.forEach(section => section.setAttribute('contenteditable', 'false'));
        editBtn.style.display = 'inline-flex';
        saveBtn.style.display = 'none';
        showToast('✅ Changes saved', 'success');
    }
}

// Toggle Export Dropdown
function toggleExportMenu() {
    const dropdown = document.querySelector('.dropdown');
    dropdown.classList.toggle('active');
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.querySelector('.dropdown');
    if (dropdown && !dropdown.contains(e.target)) {
        dropdown.classList.remove('active');
    }
});

// Download SOAP Notes (kept for backward compatibility)
function downloadSOAPNotes() {
    downloadSOAPAsText();
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