import os
import sys
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import openai
from openai import OpenAI, AuthenticationError, RateLimitError, APIError
from dotenv import load_dotenv
import tempfile
import logging
from datetime import datetime

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__, static_folder='../frontend', static_url_path='')

# Configure CORS - VERY IMPORTANT for ngrok
CORS(app, resources={
    r"/*": {
        "origins": ["*"],  # Allow all origins for testing
        "methods": ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
        "allow_headers": ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
        "expose_headers": ["Content-Type", "Content-Length"],
        "supports_credentials": True,
        "max_age": 3600
    }
})

# Handle CORS preflight requests
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept,Origin,X-Requested-With')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS,PUT,DELETE')
    response.headers.add('Access-Control-Max-Age', '3600')
    return response

# Configure OpenAI
api_key = os.getenv("OPENAI_API_KEY")
if not api_key or api_key == "your_actual_openai_api_key_here":
    logger.error("❌ OPENAI_API_KEY not set in .env file!")
    sys.exit(1)

# Initialize OpenAI client
client = OpenAI(api_key=api_key)

# Serve frontend files
@app.route('/')
def serve_index():
    return send_from_directory('../frontend', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('../frontend', path)

# API Routes
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "OpenAI Whisper STT API",
        "timestamp": datetime.now().isoformat(),
        "openai_configured": bool(api_key)
    })

@app.route('/api/transcribe', methods=['POST', 'OPTIONS'])
def transcribe_audio():
    """Transcribe audio to text"""
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    
    try:
        logger.info("📥 Received transcription request")
        
        # Check if audio file is present
        if 'audio' not in request.files:
            logger.error("No audio file in request")
            return jsonify({"error": "No audio file provided"}), 400
        
        audio_file = request.files['audio']
        
        # Validate file
        if audio_file.filename == '':
            return jsonify({"error": "No selected file"}), 400
        
        # Check file size (OpenAI limit is 25MB)
        audio_file.seek(0, os.SEEK_END)
        file_size = audio_file.tell()
        audio_file.seek(0)
        
        if file_size > 25 * 1024 * 1024:  # 25MB
            return jsonify({"error": "File too large. Maximum size is 25MB"}), 400
        
        # Allowed extensions
        allowed_extensions = ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm', 'ogg']
        file_extension = audio_file.filename.split('.')[-1].lower()
        
        if file_extension not in allowed_extensions:
            return jsonify({
                "error": f"Unsupported file format: .{file_extension}",
                "supported_formats": allowed_extensions
            }), 400
        
        logger.info(f"📄 Processing file: {audio_file.filename}, Size: {file_size} bytes")
        
        # Save file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{file_extension}') as tmp_file:
            audio_file.save(tmp_file.name)
            tmp_path = tmp_file.name
        
        try:
            # Transcribe with OpenAI Whisper
            with open(tmp_path, 'rb') as audio:
                logger.info("🎤 Sending to OpenAI Whisper...")
                
                # Get language from request
                language = request.form.get('language', '').strip()
                whisper_params = {
                    "model": "whisper-1",
                    "file": audio,
                    "response_format": "verbose_json"
                }
                
                if language:
                    whisper_params["language"] = language
                
                transcript = client.audio.transcriptions.create(**whisper_params)
            
            logger.info(f"✅ Transcription successful: {len(transcript.text)} characters")
            
            response_data = {
                "success": True,
                "text": transcript.text,
                "language": getattr(transcript, 'language', 'unknown'),
                "duration": getattr(transcript, 'duration', 0),
                "segments": [],
                "file_info": {
                    "filename": audio_file.filename,
                    "size": file_size,
                    "format": file_extension
                }
            }
            
            # Add segments if available
            if hasattr(transcript, 'segments'):
                response_data["segments"] = [
                    {
                        "id": segment.id,
                        "start": segment.start,
                        "end": segment.end,
                        "text": segment.text
                    } for segment in transcript.segments
                ]
            
            return jsonify(response_data)
            
        except AuthenticationError as e:
            logger.error(f"OpenAI authentication error: {e}")
            return jsonify({"error": "Invalid OpenAI API key. Please check your .env file."}), 401
        except RateLimitError as e:
            logger.error(f"OpenAI rate limit: {e}")
            return jsonify({"error": "OpenAI API rate limit exceeded. Please try again later."}), 429
        except APIError as e:
            logger.error(f"OpenAI API error: {e}")
            return jsonify({"error": f"OpenAI API error: {str(e)}"}), 500
        except Exception as e:
            logger.error(f"OpenAI processing error: {e}")
            return jsonify({"error": f"Transcription failed: {str(e)}"}), 500
            
        finally:
            # Clean up temp file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
                
    except Exception as e:
        logger.error(f"Server error: {e}", exc_info=True)
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/api/translate', methods=['POST', 'OPTIONS'])
def translate_audio():
    """Translate audio to English"""
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    
    try:
        logger.info("🌍 Received translation request")
        
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400
        
        audio_file = request.files['audio']
        
        # Save file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as tmp_file:
            audio_file.save(tmp_file.name)
            tmp_path = tmp_file.name
        
        try:
            # Translate with OpenAI Whisper
            with open(tmp_path, 'rb') as audio:
                logger.info("🌐 Translating with OpenAI Whisper...")
                
                translation = client.audio.translations.create(
                    model="whisper-1",
                    file=audio,
                    response_format="verbose_json"
                )
            
            logger.info(f"✅ Translation successful: {len(translation.text)} characters")
            
            return jsonify({
                "success": True,
                "text": translation.text,
                "language": "en",
                "duration": getattr(translation, 'duration', 0),
                "segments": []
            })
            
        except Exception as e:
            logger.error(f"Translation error: {e}")
            return jsonify({"error": f"Translation failed: {str(e)}"}), 500
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
                
    except Exception as e:
        logger.error(f"Translation server error: {e}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/api/info', methods=['GET'])
def api_info():
    """Get API information"""
    return jsonify({
        "name": "OpenAI Whisper STT API",
        "version": "1.0.0",
        "endpoints": {
            "transcribe": "/api/transcribe",
            "translate": "/api/translate",
            "health": "/api/health"
        },
        "supported_formats": ["mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm"],
        "max_file_size": "25MB"
    })

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    port = int(os.getenv("PORT", 5000))
    host = os.getenv("HOST", "0.0.0.0")
    
    logger.info(f"🚀 Starting OpenAI Whisper STT API on http://{host}:{port}")
    logger.info(f"📁 OpenAI API key configured: {'Yes' if api_key else 'No'}")
    logger.info(f"🌐 CORS enabled for all origins")
    
    # For production, use waitress
    if os.getenv("FLASK_ENV") == "production":
        from waitress import serve
        serve(app, host=host, port=port)
    else:
        app.run(debug=True, host=host, port=port, threaded=True)