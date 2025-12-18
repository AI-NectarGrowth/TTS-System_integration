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
        "allow_headers": ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With", "ngrok-skip-browser-warning"],
        "expose_headers": ["Content-Type", "Content-Length"],
        "supports_credentials": True,
        "max_age": 3600
    }
})

# Handle CORS preflight requests
@app.after_request
def after_request(response):
    origin = request.headers.get('Origin')
    if origin:
        response.headers['Access-Control-Allow-Origin'] = origin
    else:
        response.headers['Access-Control-Allow-Origin'] = '*'
    
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,Accept,Origin,X-Requested-With,ngrok-skip-browser-warning'
    response.headers['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS,PUT,DELETE'
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = '3600'
    
    # Prevent caching for dynamic content
    if request.path.startswith('/api/'):
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
    
    return response

# Configure OpenAI
api_key = os.getenv("OPENAI_API_KEY")
if not api_key or api_key == "your_actual_openai_api_key_here":
    logger.error("❌ OPENAI_API_KEY not set in .env file!")
    sys.exit(1)

# Initialize OpenAI client
client = OpenAI(api_key=api_key)

# Initialize diarization pipeline (optional, non-blocking)
diarization_pipeline = None
logger.info("Speaker diarization: Disabled (to enable, set HUGGINGFACE_TOKEN in .env)")

# Uncomment below to enable speaker diarization (requires HuggingFace token)
# try:
#     hf_token = os.getenv("HUGGINGFACE_TOKEN")
#     if hf_token:
#         try:
#             from pyannote.audio import Pipeline
#             diarization_pipeline = Pipeline.from_pretrained(
#                 "pyannote/speaker-diarization-3.1",
#                 token=hf_token
#             )
#             logger.info("✅ Speaker diarization enabled")
#         except Exception as e:
#             logger.warning(f"⚠️ Diarization failed: {e}")
# except Exception as e:
#     logger.warning(f"⚠️ Could not import diarization: {e}")

# Serve frontend files
@app.route('/')
def serve_index():
    response = send_from_directory('../frontend', 'index.html')
    response.headers['ngrok-skip-browser-warning'] = '1'
    return response

@app.route('/<path:path>')
def serve_static(path):
    try:
        response = send_from_directory('../frontend', path)
        response.headers['ngrok-skip-browser-warning'] = '1'
        return response
    except:
        return send_from_directory('../frontend', 'index.html')

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
            
            # Use GPT to intelligently segment the conversation
            conversation = []
            
            try:
                logger.info("🤖 Using GPT to identify speakers...")
                
                # Create a prompt for GPT to segment the conversation
                segmentation_prompt = f"""You are analyzing a doctor-patient conversation. Read the following transcribed text and identify which parts are spoken by the Doctor and which parts are spoken by the Patient.

Transcribed conversation:
\"\"\"{transcript.text}\"\"\"

Please segment this conversation into turns between Doctor and Patient. Format your response as a JSON array where each object has:
- "speaker": either "Doctor" or "Patient"
- "text": the exact words they said

Rules:
1. The doctor typically asks questions, gives medical advice, and discusses treatment
2. The patient typically describes symptoms, answers questions, and responds to advice
3. Maintain the exact order and words from the original text
4. Do not add, remove, or modify any words
5. Return ONLY the JSON array, no other text

Example format:
[
  {{"speaker": "Doctor", "text": "How are you feeling today?"}},
  {{"speaker": "Patient", "text": "I've been having knee pain."}}
]"""

                # Call GPT for intelligent segmentation
                gpt_response = client.chat.completions.create(
                    model="gpt-4o-mini",  # Fast and cost-effective
                    messages=[
                        {"role": "system", "content": "You are an expert at analyzing medical conversations and identifying speakers. Always respond with valid JSON only."},
                        {"role": "user", "content": segmentation_prompt}
                    ],
                    temperature=0.3,
                    response_format={"type": "json_object"}
                )
                
                # Parse the GPT response
                import json
                gpt_content = gpt_response.choices[0].message.content
                
                # Handle if GPT wraps the array in an object
                try:
                    parsed = json.loads(gpt_content)
                    if isinstance(parsed, dict) and 'conversation' in parsed:
                        conversation = parsed['conversation']
                    elif isinstance(parsed, dict) and 'turns' in parsed:
                        conversation = parsed['turns']
                    elif isinstance(parsed, list):
                        conversation = parsed
                    else:
                        # Try to extract array from object
                        for key in parsed:
                            if isinstance(parsed[key], list):
                                conversation = parsed[key]
                                break
                except:
                    conversation = []
                
                # Add timestamps by matching text to segments
                if hasattr(transcript, 'segments') and conversation:
                    for turn in conversation:
                        turn_text = turn['text'].lower().strip()
                        # Find matching segment(s) for this turn
                        start_time = 0
                        end_time = 0
                        
                        for segment in transcript.segments:
                            segment_text = segment.text.lower().strip()
                            if segment_text in turn_text or turn_text in segment_text:
                                if start_time == 0:
                                    start_time = segment.start
                                end_time = segment.end
                        
                        turn['start'] = start_time
                        turn['end'] = end_time
                
                logger.info(f"✅ GPT segmentation complete: {len(conversation)} turns")
                
            except Exception as e:
                logger.error(f"GPT segmentation failed: {e}")
                # Fallback: create simple conversation without speaker detection
                if hasattr(transcript, 'segments'):
                    conversation = [{
                        "speaker": "Unknown",
                        "text": transcript.text,
                        "start": 0,
                        "end": getattr(transcript, 'duration', 0)
                    }]
            
            # If GPT segmentation didn't work and conversation is empty, use fallback
            if not conversation and hasattr(transcript, 'segments'):
                conversation = [{
                    "speaker": "Unknown", 
                    "text": transcript.text,
                    "start": 0,
                    "end": getattr(transcript, 'duration', 0)
                }]
            
            # Translate conversation to English if not already in English
            detected_language = getattr(transcript, 'language', 'en')
            translated_conversation = conversation.copy()
            
            if detected_language and detected_language != 'en':
                logger.info(f"🌐 Translating from {detected_language} to English...")
                try:
                    for turn in translated_conversation:
                        translation_response = client.chat.completions.create(
                            model="gpt-4o-mini",
                            messages=[
                                {"role": "system", "content": "You are a professional medical translator. Translate the following text to English accurately. Return ONLY the translated text, nothing else."},
                                {"role": "user", "content": turn['text']}
                            ],
                            temperature=0.3
                        )
                        turn['text_english'] = translation_response.choices[0].message.content.strip()
                    logger.info("✅ Translation complete")
                except Exception as e:
                    logger.error(f"Translation error: {e}")
                    # Keep original text if translation fails
                    for turn in translated_conversation:
                        turn['text_english'] = turn['text']
            else:
                # Already in English
                for turn in translated_conversation:
                    turn['text_english'] = turn['text']
            
            response_data = {
                "success": True,
                "text": transcript.text,
                "language": detected_language,
                "duration": getattr(transcript, 'duration', 0),
                "conversation": conversation,
                "conversation_english": translated_conversation,
                "diarization_available": diarization_pipeline is not None,
                "file_info": {
                    "filename": audio_file.filename,
                    "size": file_size,
                    "format": file_extension
                }
            }
            
            # Add segments if available (legacy support)
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

@app.route('/api/generate-soap', methods=['POST', 'OPTIONS'])
def generate_soap():
    """Generate SOAP notes from conversation using fine-tuned model"""
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    
    try:
        logger.info("📋 Received SOAP generation request")
        
        data = request.get_json()
        if not data or 'conversation' not in data:
            return jsonify({"error": "No conversation data provided"}), 400
        
        conversation = data['conversation']
        
        # Format the conversation as dialogue
        dialogue_lines = []
        for turn in conversation:
            speaker = turn.get('speaker', 'Unknown')
            # Use English translation if available, otherwise original text
            text = turn.get('text_english', turn.get('text', ''))
            dialogue_lines.append(f"{speaker}: {text}")
        
        dialogue_text = "\n".join(dialogue_lines)
        
        logger.info(f"🤖 Generating SOAP notes using fine-tuned model...")
        
        # Use your fine-tuned model
        soap_response = client.chat.completions.create(
            model="ft:gpt-4o-mini-2024-07-18:nectar-technologies::CnLm29dC",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert medical professor assisting in the creation of medically accurate SOAP summaries. Please ensure the response follows the structured format: S:, O:, A:, P: without using markdown or special formatting the note should be clear and concise and very very comprehensive as well as medically accurate."
                },
                {
                    "role": "user",
                    "content": f"""Create a Medical SOAP note summary from the dialogue, following these guidelines:
S (Subjective): Summarize the patient's reported symptoms, including chief complaint and relevant history.
O (Objective): Highlight critical findings such as vital signs, lab results, and imaging.
A (Assessment): Offer a concise assessment combining subjective and objective data.
P (Plan): Outline the management plan, covering medication, diet, consultations, and education.

### Dialogue:
{dialogue_text}"""
                }
            ],
            temperature=0.3
        )
        
        soap_notes = soap_response.choices[0].message.content
        
        # Parse SOAP notes into sections
        soap_sections = {
            "subjective": "",
            "objective": "",
            "assessment": "",
            "plan": ""
        }
        
        current_section = None
        lines = soap_notes.split('\n')
        
        for line in lines:
            line = line.strip()
            if line.startswith('S:') or line.startswith('Subjective:'):
                current_section = 'subjective'
                line = line.replace('S:', '').replace('Subjective:', '').strip()
            elif line.startswith('O:') or line.startswith('Objective:'):
                current_section = 'objective'
                line = line.replace('O:', '').replace('Objective:', '').strip()
            elif line.startswith('A:') or line.startswith('Assessment:'):
                current_section = 'assessment'
                line = line.replace('A:', '').replace('Assessment:', '').strip()
            elif line.startswith('P:') or line.startswith('Plan:'):
                current_section = 'plan'
                line = line.replace('P:', '').replace('Plan:', '').strip()
            
            if current_section and line:
                if soap_sections[current_section]:
                    soap_sections[current_section] += ' ' + line
                else:
                    soap_sections[current_section] = line
        
        logger.info("✅ SOAP notes generated successfully")
        
        return jsonify({
            "success": True,
            "soap_notes": soap_notes,
            "soap_sections": soap_sections,
            "dialogue": dialogue_text
        })
        
    except Exception as e:
        logger.error(f"SOAP generation error: {e}", exc_info=True)
        return jsonify({"error": f"Failed to generate SOAP notes: {str(e)}"}), 500

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