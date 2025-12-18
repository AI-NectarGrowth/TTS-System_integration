# MedDialog - Medical Transcription & SOAP Notes Generator

**MedDialog** is a comprehensive medical transcription application powered by OpenAI Whisper API with AI-driven speaker diarization and automatic SOAP note generation. Perfect for healthcare professionals looking to streamline clinical documentation.

## Key Features

### Core Capabilities
- **Real-time Audio Recording** - Record consultations directly in the browser
- **Multi-format Support** - Upload MP3, WAV, M4A, WEBM, MP4 files
- **Multi-language Transcription** - Auto-detect or specify from 9+ languages
- **Auto-translation** - Convert any language to English
- **AI-Powered Speaker Diarization** - Intelligent Doctor/Patient conversation separation using GPT-4o-mini
- **Conversation View** - Beautiful chat-style display with color-coded speakers

### Medical Documentation
- **Automatic SOAP Note Generation** - AI-powered structured clinical notes
- **Edit Mode** - Review and modify SOAP sections before saving
- **Multiple Export Formats** - PDF, Word (RTF), and Text
- **HIPAA-Conscious Design** - Client-side processing with secure API calls

### User Experience
- **Modern Medical UI** - Professional blue color scheme (#03045e, #0077b6, #00b4d8)
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Fast Processing** - Optimized transcription and AI workflows
- **Auto-workflow** - One-click transcription + SOAP generation

## Tech Stack

### Backend
- **Python 3.8+** with Flask
- **OpenAI Whisper API** - Speech-to-text transcription
- **OpenAI GPT-4o-mini** - Speaker diarization and SOAP generation
- **Fine-tuned Model** - Custom medical SOAP note generation

### Frontend
- **Vanilla JavaScript** - No framework dependencies
- **Modern CSS** - Gradient backgrounds, animations, responsive grid
- **Font Awesome** - Professional medical icons
- **jsPDF & docx.js** - Client-side document generation

## Quick Start

### Prerequisites
```bash
Python 3.8 or higher
OpenAI API key (https://platform.openai.com/api-keys)
Modern web browser (Chrome, Edge, Firefox, Safari)
(Optional) ngrok for HTTPS tunneling
```

### Installation Steps

1. **Clone the repository**
```bash
git clone https://github.com/AI-NectarGrowth/TTS-System_integration.git
cd TTS-System_integration
```

2. **Set up backend environment**
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

3. **Configure environment variables**
```bash
# Copy example file
cp .env.example .env

# Edit .env and add your keys
# Required:
OPENAI_API_KEY=your_openai_api_key_here

# Optional:
HUGGINGFACE_TOKEN=your_token_here
NGROK_AUTH_TOKEN=your_ngrok_token_here
```

4. **Start the application**

**Option A: Simple Start (Localhost)**
```bash
# From backend directory
python server.py
```
Then open `http://localhost:5000` in your browser.

**Option B: With ngrok (for microphone access)**
```bash
# From backend directory
python run.py
```
This will:
- Start Flask backend on port 5000
- Create an ngrok HTTPS tunnel
- Open browser automatically

**Option C: Double-click launcher**
```bash
# Windows: Double-click start.bat in root directory
start.bat
```

## How to Use

### Basic Workflow

1. **Upload or Record Audio**
   - Drag & drop an audio file OR
   - Click "Start Recording" to record live

2. **Select Language** (optional)
   - Choose from 9+ supported languages
   - Or leave as "Auto Detect"

3. **Generate SOAP Notes and Transcribe**
   - Click the main button
   - Wait for processing (automatic workflow):
     - Audio transcription
     - Speaker diarization (Doctor/Patient)
     - Translation to English (if needed)
     - SOAP note generation

4. **Review Results**
   - **SOAP Notes** shown first - Structured clinical documentation
   - **Transcription Details** shown below - Full conversation, segments, etc.

5. **Edit & Export**
   - Click "Edit" to modify SOAP sections
   - Export to PDF, Word, or Text format
   - Copy to clipboard

## SOAP Note Structure

The AI generates structured medical documentation in SOAP format:

- **S (Subjective)** - Patient's complaints, symptoms, and medical history
- **O (Objective)** - Physical exam findings, vital signs, lab results
- **A (Assessment)** - Diagnosis and clinical impression
- **P (Plan)** - Treatment plan, prescriptions, follow-up

## Color Scheme

- **Navy Blue** (#03045e) - Primary headers and text
- **Ocean Blue** (#0077b6) - Interactive elements
- **Sky Blue** (#00b4d8) - Accents and highlights
- **Light Blue** (#90e0ef) - Doctor conversation bubbles
- **Ice Blue** (#caf0f8) - Patient conversation bubbles

## Project Structure

```
STT/
├── backend/
│   ├── server.py           # Main Flask application
│   ├── run.py              # Launcher with ngrok support
│   ├── requirements.txt    # Python dependencies
│   └── .env.example        # Environment variables template
├── frontend/
│   ├── index.html          # Main HTML structure
│   ├── style.css           # Styling and animations
│   └── script.js           # Frontend logic and API calls
├── README.md               # This file
└── start.bat               # Windows quick launcher
```

## Configuration

### Environment Variables

```env
# Required
OPENAI_API_KEY=sk-proj-...           # Your OpenAI API key

# Optional
PORT=5000                             # Backend port (default: 5000)
FLASK_ENV=development                 # Flask environment
HUGGINGFACE_TOKEN=hf_...             # For enhanced diarization
NGROK_AUTH_TOKEN=...                  # For HTTPS tunneling
```

### Supported Languages

- English, Spanish, French, German
- Chinese, Japanese, Korean
- Hindi, Arabic
- Auto-detect (recommended)

### Supported Audio Formats

- MP3, WAV, M4A
- WEBM, MP4, MPEG, MPGA
- Max file size: 25MB

## Security & Privacy

- **No data storage** - Audio processed in memory only
- **API-based processing** - Leverages OpenAI's secure infrastructure
- **Client-side exports** - Documents generated in browser
- **Environment variables** - Sensitive keys never committed
- **Important**: Ensure compliance with HIPAA and local regulations for medical data

## Troubleshooting

### Backend won't start
```bash
# Check Python version
python --version  # Should be 3.8+

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### Microphone not working
- Use HTTPS URL (ngrok) instead of localhost
- Check browser permissions
- Ensure microphone is not in use by another app

### CORS errors
- Backend CORS is enabled by default
- Check that backend URL matches frontend configuration
- Try restarting the Flask server

### SOAP notes not generating
- Verify OpenAI API key is correct
- Check API quota/billing status
- Ensure conversation has Doctor/Patient dialogue

## Recent Updates

### Version 2.0 (Current)
- New name: **MedDialog**
- Complete UI redesign with medical blue theme
- Automatic SOAP note generation
- Edit mode for SOAP sections
- Multi-format export (PDF, Word, Text)
- Streamlined workflow (one-click processing)
- Professional medical color scheme
- Improved conversation display

### Version 1.0
- Basic transcription with Whisper API
- Manual speaker diarization
- Green/cream color scheme

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to your fork
5. Submit a pull request

## License

This project is provided as-is for educational and commercial use. Please ensure compliance with:
- OpenAI's Terms of Service
- HIPAA regulations (if handling real patient data)
- Local healthcare data protection laws

## Acknowledgments

- **OpenAI** - Whisper API and GPT models
- **Font Awesome** - Medical icons
- **Flask** - Backend framework
- **jsPDF & docx.js** - Document generation libraries

## Support

For issues, questions, or feature requests:
- Create a GitHub issue
- Check existing documentation
- Review troubleshooting section

---

**Built with love for healthcare professionals**

*Making clinical documentation effortless, one conversation at a time.*
