"""
Simple Internet Radio Server for ESP32 I2S Music Player Testing
Generates synthetic audio (sine waves) and serves as HTTP stream.
"""

import socket
import struct
import math
import time
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
import sys

# Audio configuration
SAMPLE_RATE = 44100
CHANNELS = 2
BITS_PER_SAMPLE = 16
BUFFER_SIZE = 1024

# Station definitions (frequency in Hz)
STATIONS = {
    "/station1": {"name": "Station 1 (440Hz)", "freq": 440},
    "/station2": {"name": "Station 2 (523Hz)", "freq": 523},
    "/station3": {"name": "Station 3 (659Hz)", "freq": 659},
}

class RadioStreamHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path in STATIONS:
            self.send_response(200)
            self.send_header('Content-Type', 'audio/wav')
            self.send_header('Transfer-Encoding', 'chunked')
            self.end_headers()
            
            station = STATIONS[self.path]
            print(f"[RADIO] Serving {station['name']} to {self.client_address[0]}")
            
            try:
                self.stream_audio(station['freq'])
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
    
    def stream_audio(self, frequency):
        phase = 0
        phase_increment = 2 * math.pi * frequency / SAMPLE_RATE
        
        while True:
            # Generate audio buffer
            buffer = bytearray()
            for _ in range(BUFFER_SIZE // 4):  # 2 channels * 2 bytes per sample
                # Generate sine wave sample
                sample = int(16000 * math.sin(phase))
                # Left channel
                buffer.extend(struct.pack('<h', sample))
                # Right channel
                buffer.extend(struct.pack('<h', sample))
                phase += phase_increment
                if phase >= 2 * math.pi:
                    phase -= 2 * math.pi
            
            # Send chunk
            chunk_size = len(buffer)
            self.wfile.write(f"{chunk_size:x}\r\n".encode())
            self.wfile.write(buffer)
            self.wfile.write(b"\r\n")
            self.wfile.flush()
            
            time.sleep(BUFFER_SIZE / SAMPLE_RATE)
    
    def get_index_page(self):
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
    <p>This server generates synthetic audio for testing your ESP32 I2S music player.</p>
    
    <h2>Available Stations:</h2>
    {"".join(f'<div class="station"><h3>{info["name"]}</h3><p>URL: <code>http://{{SERVER_IP}}:8000{path}</code></p></div>' for path, info in STATIONS.items())}
    
    <h2>ESP32 Code Update:</h2>
    <p>Replace the station URLs in your code with:</p>
    <pre>
const char* STATION_URLS[] = {{
  "http://YOUR_PC_IP:8000/station1",
  "http://YOUR_PC_IP:8000/station2", 
  "http://YOUR_PC_IP:8000/station3"
}};
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
    server = HTTPServer(('0.0.0.0', port), RadioStreamHandler)
    print(f"[RADIO] Server started on port {port}")
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
