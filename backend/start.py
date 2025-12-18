#!/usr/bin/env python3
"""
Simple startup script - runs Flask directly
"""
import os
import sys
import time
import webbrowser
import threading
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def start_ngrok_in_thread():
    """Start ngrok in a separate thread"""
    time.sleep(3)  # Wait for Flask to start
    
    try:
        from pyngrok import ngrok
        
        # Configure ngrok
        ngrok_auth_token = os.getenv("NGROK_AUTH_TOKEN")
        if ngrok_auth_token:
            ngrok.set_auth_token(ngrok_auth_token)
        
        # Kill any existing ngrok
        try:
            ngrok.kill()
        except:
            pass
        
        # Create tunnel
        tunnel = ngrok.connect(5000, bind_tls=True, inspect=False)
        public_url = tunnel.public_url
        
        print("\n" + "="*60)
        print(f"✅ Ngrok tunnel: {public_url}")
        print("="*60 + "\n")
        
        # Open in browser
        time.sleep(1)
        webbrowser.open(public_url)
        
    except Exception as e:
        print(f"\n⚠️  Ngrok failed: {e}")
        print("Use http://localhost:5000 instead\n")

def main():
    print("="*60)
    print("🎤 OpenAI Whisper Audio-to-Text Application")
    print("="*60)
    
    # Check dependencies
    try:
        import flask
        import openai
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("Run: pip install -r requirements.txt")
        return
    
    # Start ngrok in background
    ngrok_thread = threading.Thread(target=start_ngrok_in_thread, daemon=True)
    ngrok_thread.start()
    
    # Import and run Flask app
    print("\n🚀 Starting Flask server on http://localhost:5000...")
    print("Press Ctrl+C to stop\n")
    
    # Change to backend directory
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(backend_dir)
    
    # Import and run the Flask app
    from server import app
    app.run(debug=False, host='0.0.0.0', port=5000, threaded=True)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n🛑 Shutting down...")
        print("✅ Server stopped")
