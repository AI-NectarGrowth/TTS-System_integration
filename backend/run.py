#!/usr/bin/env python3
"""
Easy startup script for the OpenAI Whisper STT application
"""
import os
import sys
import subprocess
import time
import webbrowser
from pyngrok import ngrok, conf
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def check_dependencies():
    """Check if all dependencies are installed"""
    try:
        import flask
        import openai
        import pyngrok
        print("✅ All dependencies are installed")
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("Please run: pip install -r requirements.txt")
        return False
    return True

def start_flask_app():
    """Start the Flask application"""
    print("🚀 Starting Flask backend server...")
    
    # Set environment variables
    env = os.environ.copy()
    env['FLASK_ENV'] = 'development'
    
    # Start Flask server
    flask_process = subprocess.Popen(
        [sys.executable, 'server.py'],
        cwd=os.path.dirname(os.path.abspath(__file__)),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    # Wait for server to start
    time.sleep(3)
    
    if flask_process.poll() is not None:
        # Server failed to start
        stdout, stderr = flask_process.communicate()
        print("❌ Failed to start Flask server:")
        print(stderr)
        return None
    
    print("✅ Flask backend is running on http://localhost:5000")
    return flask_process

def start_ngrok_tunnel():
    """Start ngrok tunnel for HTTPS access"""
    print("🔗 Starting ngrok tunnel for HTTPS...")
    
    # Configure ngrok
    ngrok_auth_token = os.getenv("NGROK_AUTH_TOKEN")
    if ngrok_auth_token:
        ngrok.set_auth_token(ngrok_auth_token)
    
    try:
        # Create HTTP tunnel
        tunnel = ngrok.connect(5000, bind_tls=True)
        public_url = tunnel.public_url
        print(f"✅ Ngrok tunnel created: {public_url}")
        print(f"📋 Use this URL for microphone access: {public_url}")
        return public_url
    except Exception as e:
        print(f"⚠️  Failed to start ngrok: {e}")
        print("ℹ️  You can still use http://localhost:5000 but microphone won't work")
        return None

def open_browser(url):
    """Open browser to the application URL"""
    print(f"🌐 Opening browser to: {url}")
    try:
        webbrowser.open(url)
    except:
        print(f"📋 Please manually open: {url}")

def main():
    """Main startup function"""
    print("=" * 60)
    print("🎤 OpenAI Whisper Audio-to-Text Application")
    print("=" * 60)
    
    # Check dependencies
    if not check_dependencies():
        return
    
    # Start Flask app
    flask_process = start_flask_app()
    if not flask_process:
        return
    
    # Start ngrok
    ngrok_url = start_ngrok_tunnel()
    
    print("\n" + "=" * 60)
    print("🚀 Application is ready!")
    print("=" * 60)
    print("\n📋 Available URLs:")
    print(f"   • Local HTTP: http://localhost:5000")
    if ngrok_url:
        print(f"   • Public HTTPS: {ngrok_url}")
    
    print("\n🎤 For microphone access, use the HTTPS URL")
    print("   (Microphone requires HTTPS or localhost)")
    
    print("\n⚙️  Press Ctrl+C to stop the application")
    print("=" * 60)
    
    # Open browser
    url_to_open = ngrok_url if ngrok_url else "http://localhost:5000"
    open_browser(url_to_open)
    
    try:
        # Keep running
        flask_process.wait()
    except KeyboardInterrupt:
        print("\n\n🛑 Stopping application...")
        flask_process.terminate()
        
        # Stop ngrok if running
        if ngrok_url:
            ngrok.kill()
            print("✅ Ngrok tunnel closed")
        
        print("✅ Application stopped")

if __name__ == "__main__":
    main()