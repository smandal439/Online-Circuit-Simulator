# ArduSim — Commercial-Grade Online Arduino Simulator

<div align="center">
  <h3>⚡ Real-time Arduino C++ execution, interactive component drag-and-drop, serial monitor & oscilloscope in the browser. No installation needed.</h3>
</div>

---

## 🌟 Key Features

### 🖥️ Professional Code Editor
- **Monaco Editor Integration**: Full VS Code-grade editing experience.
- **Syntax Highlighting**: Custom Monarch tokenizer tailored for Arduino C++ syntax, keywords, and constants.
- **IntelliSense & Autocomplete**: Built-in completions with documentation for Arduino core APIs (`pinMode`, `digitalWrite`, `analogRead`, `delay`, `millis`, etc.), libraries (`Wire`, `SPI`, `EEPROM`, `Servo`, `LiquidCrystal`), and snippets (`setup`, `loop`, `for`, `blink-led`).
- **Real-time Diagnostics & Squiggles**: Automatic syntax validation and runtime error markers.
- **Font Controls & Word Wrap**: Easy readability toggles and keybindings.

### ⚡ Robust Arduino Execution Engine
- **In-Browser C++ Transpiler**: Converts Arduino code to safe, asynchronous JavaScript execution on the fly.
- **Infinite-Loop Protection**: Automatically throttles non-yielding tight loops to prevent browser hanging.
- **Real-time FPS & Timing**: Status bar displays exact simulation time and frame-rates.
- **Library Support**:
  - `Servo` (angle writes and positioning)
  - `LiquidCrystal` & `LiquidCrystal_I2C` (text display, cursor control)
  - `Wire` (I2C communication stubs)
  - `SPI` (bus communication stubs)
  - `EEPROM` (512-byte persistent simulation)
  - `tone()` / `noTone()` (Web Audio API synthesis)
- **Speed Control**: Variable simulation speeds (0.25× to 10×).

### 🎨 High-Performance Circuit Canvas
- **Vector-based HTML5 Canvas**: Smooth rendering with 60 FPS pan and zoom.
- **Grid Snapping**: Precision component positioning with visual alignment.
- **Interactive Wiring**: Click-to-connect pin-to-pin wiring with live signal coloring (HIGH/LOW/PWM).
- **Clipboard & Manipulation**: `Ctrl+C` / `Ctrl+V`, `Ctrl+D` (Duplicate), `R` (Rotate), `Del` (Delete), and Undo/Redo history stack.
- **Context Menu**: Right-click actions for properties, rotation, duplication, and deletion.
- **Exporting**: One-click circuit diagram export to PNG.

### 📊 Diagnostic Instruments
- **Serial Monitor**:
  - Live bi-directional communication.
  - Multi-line buffer (up to 5,000 lines).
  - Search & filter live serial output.
  - HEX inspection and microsecond timestamps.
  - One-click clipboard copy and text export.
- **Digital Oscilloscope**: Real-time multi-channel waveform capture for PWM and analog signals with configurable timebase and edge triggering.
- **Pin Monitor**: Live color-coded status board of all 20 Arduino pins (D0–D13, A0–A5) with level indicators, direction modes, and PWM bars.

### 💾 Project & State Management
- **Debounced Auto-Save**: Seamless persistence to `localStorage` with quota protection.
- **Unsaved Changes Indicator**: Warning dot and `beforeunload` browser guard.
- **Project Naming**: Rename projects directly in the navigation header.
- **Portable JSON File Export/Import**: Full schema migration and backward compatibility.
- **Instant URL Sharing**: Unicode-safe base64 project encoding for sharing circuits via a single link.
- **Progressive Web App (PWA)**: Installable as a standalone desktop or mobile web application.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Scope |
|---|---|---|
| <kbd>F5</kbd> | Compile & Run simulation | Global |
| <kbd>F6</kbd> | Stop simulation | Global |
| <kbd>F7</kbd> | Pause / Resume simulation | Global |
| <kbd>Ctrl</kbd> + <kbd>S</kbd> | Save project to file | Global |
| <kbd>Ctrl</kbd> + <kbd>R</kbd> | Verify / Compile sketch | Editor |
| <kbd>Ctrl</kbd> + <kbd>F</kbd> | Find & Replace | Editor |
| <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>F</kbd> | Format code | Editor |
| <kbd>Ctrl</kbd> + <kbd>Space</kbd> | Trigger autocomplete | Editor |
| <kbd>Del</kbd> / <kbd>Backspace</kbd> | Delete selected component or wire | Canvas |
| <kbd>R</kbd> | Rotate selected component (90°) | Canvas |
| <kbd>Ctrl</kbd> + <kbd>C</kbd> | Copy selected component | Canvas |
| <kbd>Ctrl</kbd> + <kbd>V</kbd> | Paste component | Canvas |
| <kbd>Ctrl</kbd> + <kbd>D</kbd> | Duplicate selected component | Canvas |
| <kbd>Ctrl</kbd> + <kbd>Z</kbd> | Undo canvas action | Canvas |
| <kbd>Ctrl</kbd> + <kbd>Y</kbd> | Redo canvas action | Canvas |
| <kbd>F</kbd> | Fit circuit to view | Canvas |
| <kbd>ESC</kbd> | Cancel wiring / placing / deselect | Canvas |

---

## 📦 Component Library

- **Boards**: Arduino Uno R3 (ATmega328P)
- **Outputs**: Standard LED (Red, Green, Blue, Yellow, White), RGB LED, 16x2 LCD Display (HD44780/I2C), Piezo Buzzer, Micro Servo Motor (SG90)
- **Inputs**: Push Button, Potentiometer (Rotary Angle Sensor), DHT11 Temperature & Humidity Sensor, Ultrasonic Distance Sensor (HC-SR04)
- **Passives & Power**: Resistors (custom resistance), 5V Power Supply, Ground (GND) Rail, Breadboard mini

---

## 🚀 Getting Started

No build step or Node.js environment is required. You can host this static web app on GitHub Pages, Netlify, Vercel, or any standard HTTP web server.

1. Clone this repository:
   ```bash
   git clone https://github.com/smandal439/Online-Circuit-Simulator.git
   ```
2. Open `index.html` in any modern web browser (Chrome, Edge, Firefox, Safari).

---

## 📄 License

MIT License. Open source and free for educational and commercial use.
