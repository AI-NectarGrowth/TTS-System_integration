import os
from flask import Flask, send_from_directory
from flask_cors import CORS

app = Flask(__name__)

CORS(app, resources={r"/*": {"origins": "*"}})

@app.route('/')
def index():
    print("Serving index.html")
    frontend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')
    print(f"Frontend path: {frontend_path}")
    return send_from_directory(frontend_path, 'index.html')

@app.route('/<path:path>')
def static_files(path):
    print(f"Serving: {path}")
    frontend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')
    return send_from_directory(frontend_path, path)

if __name__ == '__main__':
    print("Starting minimal test server...")
    print("Visit: http://localhost:5001")
    app.run(host='0.0.0.0', port=5001, debug=True)
