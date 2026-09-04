# ESP32 I2S Local Radio Server

A simple Python HTTP server that streams your MP3 files to test your ESP32 I2S music player.

## Prerequisites

**ffmpeg** must be installed and available in PATH:

**Windows:**
```cmd
winget install ffmpeg
```
Or download from https://ffmpeg.org/download.html and add to PATH.

**Mac:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt install ffmpeg
```

## Files

- `radio_server.py` - Python radio server that streams MP3 files
- `esp32_i2s_local_test.cpp` - Modified ESP32 code for local server
- `jhuki_jhuki_si_nazar.mp3` - Song 1
- `hotoon_say_chhu_lo_tum.mp3` - Song 2
- `DKHK-Jab Samne Tum Aa.mp3` - Song 3

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

| Station | Song | URL Path |
|---------|------|----------|
| Station 1 | Jhuki Jhuki Si Nazar | `/station1` |
| Station 2 | Hotoon Say Chhu Lo Tum | `/station2` |
| Station 3 | Jab Samne Tum Aa | `/station3` |

## Testing

1. Open Serial Monitor (115200 baud)
2. Press Play button (D2) to start playback
3. Use Next (D3) and Previous (D4) buttons to change stations
4. You should hear your MP3 songs playing through the speaker

## Troubleshooting

**"Server error: 404"**
- Check that `SERVER_IP` matches your PC's IP
- Ensure the server is running
- Check firewall settings

**No audio**
- Verify I2S wiring (D26→BCLK, D25→LRC, D22→DIN)
- Check MAX98357A power connections
- Ensure speaker is connected
- Verify MP3 files are in the same folder as `radio_server.py`

**Buffer underruns**
- Increase `I2S_BUF_COUNT` or `I2S_BUF_SIZE` in the code
- Check WiFi signal strength
- Try smaller MP3 files

## Server Web Interface

Open `http://YOUR_PC_IP:8000` in a browser to see station information and URLs.
