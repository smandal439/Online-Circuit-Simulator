# ESP32 I2S Local Radio Server

A simple Python HTTP server that generates synthetic audio for testing your ESP32 I2S music player.

## Files

- `radio_server.py` - Python radio server that generates audio
- `esp32_i2s_local_test.cpp` - Modified ESP32 code for local server

## Quick Start

### 1. Start the Server

```bash
python radio_server.py
```

Or with a custom port:
```bash
python radio_server.py 9000
```

### 2. Find Your PC's IP Address

**Windows:**
```cmd
ipconfig
```
Look for "IPv4 Address" (usually 192.168.x.x)

**Mac/Linux:**
```bash
ifconfig
```
or
```bash
ip addr
```

### 3. Update ESP32 Code

Edit `esp32_i2s_local_test.cpp` and change:
```cpp
const char* SERVER_IP = "192.168.1.100";  // Change to your PC's IP
```

Also update your WiFi credentials:
```cpp
const char* ssid     = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASS";
```

### 4. Upload to ESP32

Compile and upload `esp32_i2s_local_test.cpp` to your ESP32.

## Available Stations

| Station | Frequency | URL Path |
|---------|-----------|----------|
| Station 1 | 440 Hz (A4) | `/station1` |
| Station 2 | 523 Hz (C5) | `/station2` |
| Station 3 | 659 Hz (E5) | `/station3` |

## Testing

1. Open Serial Monitor (115200 baud)
2. Press Play button (D2) to start playback
3. Use Next (D3) and Previous (D4) buttons to change stations
4. You should hear different tones from each station

## Troubleshooting

**"Server error: 404"**
- Check that `SERVER_IP` matches your PC's IP
- Ensure the server is running
- Check firewall settings

**No audio**
- Verify I2S wiring (D26→BCLK, D25→LRC, D22→DIN)
- Check MAX98357A power connections
- Ensure speaker is connected

**Buffer underruns**
- Increase `I2S_BUF_COUNT` or `I2S_BUF_SIZE` in the code
- Check WiFi signal strength

## Server Web Interface

Open `http://YOUR_PC_IP:8000` in a browser to see station information and URLs.
