"""
Internet Radio Server for ESP32 I2S Music Player Testing
Decodes MP3 files to raw PCM and serves as HTTP audio stream.
"""

import os
import time
import subprocess
import struct
from http.server import HTTPServer, BaseHTTPRequestHandler
import sys

# Audio configuration for I2S
SAMPLE_RATE = 44100
CHANNELS = 2
BITS_PER_SAMPLE = 16

# Get directory where this script is located
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Find all MP3 files in the script directory
def find_mp3_files():
    mp3_files = sorted([f for f in os.listdir(SCRIPT_DIR) if f.lower().endswith('.mp3')])
    stations = {}
    for i, filename in enumerate(mp3_files, 1):
        path = f"/station{i}"
        name = os.path.splitext(filename)[0].replace('_', ' ').replace('-', ' - ')
        stations[path] = {
            "name": f"Station {i}: {name}",
            "file": os.path.join(SCRIPT_DIR, filename),
            "filename": filename
        }
    return stations

STATIONS = find_mp3_files()

# Cache decoded PCM data
PCM_CACHE = {}

def decode_mp3_to_pcm(mp3_path):
    """Decode MP3 to raw PCM using ffmpeg"""
    cmd = [
        'ffmpeg',
        '-i', mp3_path,
        '-f', 's16le',           # raw PCM 16-bit little-endian
        '-acodec', 'pcm_s16le',  # PCM codec
        '-ar', str(SAMPLE_RATE), # sample rate
        '-ac', str(CHANNELS),    # channels
        '-'
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, check=True)
        return result.stdout
    except FileNotFoundError:
        print("[RADIO] ERROR: ffmpeg not found! Install ffmpeg first.")
        print("[RADIO] Windows: winget install ffmpeg")
        print("[RADIO] Or download from: https://ffmpeg.org/download.html")
        return None
    except subprocess.CalledProcessError as e:
        print(f"[RADIO] ERROR: ffmpeg failed - {e}")
        return None

def get_pcm_data(station_key):
    """Get PCM data, decoding and caching if needed"""
    if station_key not in PCM_CACHE:
        station = STATIONS[station_key]
        print(f"[RADIO] Decoding {station['filename']}...")
        pcm_data = decode_mp3_to_pcm(station['file'])
        if pcm_data:
            PCM_CACHE[station_key] = pcm_data
            print(f"[RADIO] Cached {len(pcm_data)} bytes PCM")
        else:
            return None
    return PCM_CACHE[station_key]

class RadioStreamHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path in STATIONS:
            station = STATIONS[self.path]
            
            if not os.path.exists(station['file']):
                self.send_response(404)
                self.end_headers()
                return
            
            # Get PCM data (cached after first decode)
            pcm_data = get_pcm_data(self.path)
            
            if pcm_data is None:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(b"Failed to decode MP3")
                return
            
            self.send_response(200)
            self.send_header('Content-Type', 'audio/pcm')
            self.send_header('Content-Length', str(len(pcm_data)))
            self.send_header('X-Sample-Rate', str(SAMPLE_RATE))
            self.send_header('X-Channels', str(CHANNELS))
            self.end_headers()
            
            print(f"[RADIO] Serving {station['name']} to {self.client_address[0]}")
            
            try:
                self.stream_pcm(pcm_data)
            except (BrokenPipeError, ConnectionResetError):
                print(f"[RADIO] Client disconnected")
        elif self.path == '/':
            self.send_response(200)
            self.send_header('Content-Type', 'text/html')
            self.end_headers()
            self.wfile.write(self.get_index_page().encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def stream_pcm(self, pcm_data):
        """Stream raw PCM data in chunks"""
        CHUNK_SIZE = 4096
        offset = 0
        while offset < len(pcm_data):
            chunk = pcm_data[offset:offset + CHUNK_SIZE]
            self.wfile.write(chunk)
            self.wfile.flush()
            offset += CHUNK_SIZE
    
    def get_index_page(self):
        station_list = ""
        for path, info in STATIONS.items():
            station_list += f'<div class="station"><h3>{info["name"]}</h3><p>File: {info["filename"]}</p><p>URL: <code>http://YOUR_PC_IP:8000{path}</code></p></div>\n'
        
        num_stations = len(STATIONS)
        station_urls = ", ".join([f'"http://YOUR_PC_IP:8000/station{i}"' for i in range(1, num_stations + 1)])
        
        return f"""<!DOCTYPE html>
<html>
<head>
    <title>ESP32 Internet Radio Server</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 40px; }}
        h1 {{ color: #333; }}
        .station {{ margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 5px; }}
        .station h3 {{ margin: 0 0 10px 0; }}
        code {{ background: #e0e0e0; padding: 2px 6px; border-radius: 3px; }}
    </style>
</head>
<body>
    <h1>ESP32 Internet Radio Server</h1>
    <p>This server streams your MP3 files to test your ESP32 I2S music player.</p>
    
    <h2>Available Stations ({num_stations} MP3 files found):</h2>
    {station_list}
    
    <h2>ESP32 Code Update:</h2>
    <p>Replace the station URLs in your code with:</p>
    <pre>
const char* STATION_URLS[] = {{{station_urls}}};
    </pre>
    
    <h2>Testing Instructions:</h2>
    <ol>
        <li>Start this server: <code>python radio_server.py</code></li>
        <li>Find your PC's IP address: <code>ipconfig</code></li>
        <li>Update ESP32 code with your IP</li>
        <li>Upload to ESP32 and test</li>
    </ol>
</body>
</html>"""
    
    def log_message(self, format, *args):
        print(f"[{time.strftime('%H:%M:%S')}] {args[0]}")

def run_server(port=8000):
    if not STATIONS:
        print("[RADIO] ERROR: No MP3 files found in the script directory!")
        print(f"[RADIO] Place MP3 files in: {SCRIPT_DIR}")
        return
    
    server = HTTPServer(('0.0.0.0', port), RadioStreamHandler)
    print(f"[RADIO] Server started on port {port}")
    print(f"[RADIO] Found {len(STATIONS)} MP3 file(s):")
    for path, info in STATIONS.items():
        print(f"[RADIO]   {info['name']} -> {info['filename']}")
    print(f"[RADIO] Access at: http://localhost:{port}")
    print("[RADIO] Press Ctrl+C to stop")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[RADIO] Server stopped")
        server.shutdown()

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    run_server(port)
