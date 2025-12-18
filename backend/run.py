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
    
    # Start Flask server with visible output
    flask_process = subprocess.Popen(
        [sys.executable, 'server.py'],
        cwd=os.path.dirname(os.path.abspath(__file__)),
        env=env,
        creationflags=subprocess.CREATE_NEW_CONSOLE if sys.platform == 'win32' else 0
    )
    
    # Wait for server to start
    print("⏳ Waiting for Flask server to start...")
    time.sleep(5)
    
    # Check if server is responding
    import socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    result = sock.connect_ex(('localhost', 5000))
    sock.close()
    
    if result == 0:
        print("✅ Flask backend is running on http://localhost:5000")
        return flask_process
    else:
        print("❌ Flask server failed to start on port 5000")
        flask_process.terminate()
        return None

def start_ngrok_tunnel():
    """Start ngrok tunnel for HTTPS access"""
    print("🔗 Starting ngrok tunnel for HTTPS...")
    
    # Configure ngrok
    ngrok_auth_token = os.getenv("NGROK_AUTH_TOKEN")
    if ngrok_auth_token:
        ngrok.set_auth_token(ngrok_auth_token)
    
    try:
        # Kill any existing ngrok processes
        try:
            ngrok.kill()
        except:
            pass
        
        # Create HTTP tunnel with additional options
        tunnel = ngrok.connect(
            5000, 
            bind_tls=True,
            inspect=False  # Disable ngrok inspection UI
        )
        public_url = tunnel.public_url
        
        # Wait a moment for tunnel to stabilize
        time.sleep(2)
        
        print(f"✅ Ngrok tunnel created: {public_url}")
        print(f"📋 Use this URL for microphone access: {public_url}")
        print(f"💡 Tip: Add 'ngrok-skip-browser-warning: 1' header to skip warning page")
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