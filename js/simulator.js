/* ═══════════════════════════════════════════════════════
   simulator.js — Arduino C++ Interpreter & Execution Engine
   ═══════════════════════════════════════════════════════ */

'use strict';

class ArduinoSimulator {
  constructor() {
    // Core state
    this.isRunning = false;
    this.isPaused = false;
    this.simTime = 0;
    this.speed = 1;
    this.board = 'arduino_uno';
    
    // Pin management with validation
    this.pinStates = new Map();
    this.pinModes = new Map();
    this._maxPin = this.board === 'esp32_devkit_v1' ? 39 : 19;
    
    // Serial
    this.serialBaud = 9600;
    this.serialInputBuffer = [];
    this._maxSerialBuffer = 8192;
    this._serialLogCallback = null;
    
    // Control
    this._loopAbortController = null;
    this._loopPromise = null;
    this._runSeq = 0;
    this._isStopping = false;
    
    // Callbacks with validation
    this._callbacks = {
      onSerial: null,
      onStart: null,
      onPinChange: null,
      onError: null,
      onStatus: null,
      onStop: null,
      onTick: null,
      onEvent: null
    };
    
    // Performance tracking
    this._fps = 0;
    this._fpsFrames = 0;
    this._fpsLast = 0;
    this._loopCount = 0;
    this._fpsInterval = null;
    this._startRealTime = 0;
    
    // Infinite-loop guard
    this._iterSinceDelay = 0;
    this._MAX_TIGHT_ITERS = 50000;
    this._lastYieldTime = 0;
    this._minYieldInterval = 16; // ms
    
    // Audio
    this._toneActive = new Map();
    this._toneCtx = null;
    this._toneOscillators = new Map();
    
    // State management
    this._delays = [];
    this._mqttOpen = [];
    this._customDelay = null;
    this._compiledFn = null;
    this._compiledCtx = null;
    this._compiledJs = '';
    
    // Hardware simulation
    this._eeprom = new Uint8Array(512);
    this._ledcChannels = new Map();
    this._softSerial = new Map();
    this._steppers = new Map();
    this._pings = new Map();
    this._neopixels = new Map();
    this._rfid = new Map();
    this._fastled = null;
    this._web = null;
    this._mqtt = null;
    this._lcdLines = ['', ''];
    this._lcdCursor = { col: 0, row: 0 };
    this._oledTextSize = 1;
    this._oledTextColor = 1;
    
    // Validation & security
    this._reservedWords = new Set([
      'await', 'break', 'case', 'catch', 'class', 'const', 'continue',
      'debugger', 'default', 'delete', 'do', 'else', 'enum', 'export',
      'extends', 'false', 'finally', 'for', 'function', 'if', 'import',
      'in', 'instanceof', 'new', 'null', 'return', 'super', 'switch',
      'this', 'throw', 'true', 'try', 'typeof', 'var', 'void', 'while',
      'with', 'yield', 'let', 'static', 'async', 'await'
    ]);
    
    // Pin validation ranges
    this._validPins = {
      arduino_uno: {
        digital: Array.from({length: 20}, (_, i) => i),
        analog: [14, 15, 16, 17, 18, 19],
        pwm: [3, 5, 6, 9, 10, 11],
        max: 19
      },
      esp32_devkit_v1: {
        digital: Array.from({length: 40}, (_, i) => i),
        analog: [36, 39, 34, 35, 32, 33],
        pwm: Array.from({length: 40}, (_, i) => i),
        max: 39
      }
    };
  }

  /* ═══════════════════════════════════════════════════════
     PUBLIC API — with validation
     ═══════════════════════════════════════════════════════ */

  // Callback registration with validation
  on(event, callback) {
    const validEvents = ['serial', 'start', 'pinChange', 'error', 'status', 'stop', 'tick', 'event'];
    if (!validEvents.includes(event)) {
      throw new Error(`Invalid event: ${event}. Valid events: ${validEvents.join(', ')}`);
    }
    if (callback && typeof callback !== 'function') {
      throw new Error(`Callback for event '${event}' must be a function`);
    }
    const key = `on${event.charAt(0).toUpperCase() + event.slice(1)}`;
    this._callbacks[key] = callback;
    return this;
  }

  // Getters with validation
  getPinState(pin) {
    this._validatePin(pin);
    const key = `pin_${pin}`;
    return this.pinStates.get(key) ?? 0;
  }

  getPinMode(pin) {
    this._validatePin(pin);
    const key = `pin_${pin}`;
    return this.pinModes.get(key) ?? 'INPUT';
  }

  setPinState(pin, value) {
    this._validatePin(pin);
    this._validatePinValue(value);
    const key = `pin_${pin}`;
    this.pinStates.set(key, value);
    this._emitPinChange(key, value);
  }

  // Board configuration with validation
  setBoard(board) {
    const validBoards = ['arduino_uno', 'esp32_devkit_v1'];
    if (!validBoards.includes(board)) {
      throw new Error(`Invalid board: ${board}. Valid boards: ${validBoards.join(', ')}`);
    }
    this.board = board;
    this._maxPin = this._validPins[board].max;
    this.pinStates.clear();
    this.pinModes.clear();
    return this;
  }

  // Speed control with validation
  setSpeed(speed) {
    const v = parseFloat(speed);
    if (!Number.isFinite(v) || v < 0.01 || v > 100) {
      throw new Error('Speed must be between 0.01 and 100');
    }
    this.speed = v;
    return this;
  }

  // Serial input with validation
  sendSerialInput(text) {
    if (typeof text !== 'string') {
      throw new Error('Serial input must be a string');
    }
    if (text.length === 0) return;
    
    for (const ch of text) {
      this.serialInputBuffer.push(ch);
    }
    
    // Prevent buffer overflow
    if (this.serialInputBuffer.length > this._maxSerialBuffer) {
      this.serialInputBuffer.splice(0, this.serialInputBuffer.length - this._maxSerialBuffer);
    }
  }

  /* ═══════════════════════════════════════════════════════
     TRANSPILER — with enhanced robustness
     ═══════════════════════════════════════════════════════ */

  transpile(code) {
    if (typeof code !== 'string') {
      throw new Error('Code must be a string');
    }
    if (code.trim().length === 0) {
      throw new Error('Code cannot be empty');
    }

    // Security: block dangerous patterns
    this._securityCheck(code);

    let js = code;

    // 1. Handle #define macros with improved parsing
    const defines = {};
    js = js.replace(/^[ \t]*#define\s+(\w+)\s+(.*?)[ \t]*$/gm, (_, name, value) => {
      const trimmed = value.trim();
      // Validate macro name
      if (!/^[A-Za-z_]\w*$/.test(name)) {
        throw new Error(`Invalid macro name: ${name}`);
      }
      defines[name] = trimmed;
      return `/* #define ${name} ${trimmed} */`;
    });

    // 2. Remove other preprocessor directives
    js = js.replace(/^[ \t]*#[^\n]*/gm, '');

    // 3. Apply #define substitutions with safety
    for (const [name, value] of Object.entries(defines)) {
      if (!/^[A-Za-z_]\w*$/.test(name)) continue;
      if (/\(/.test(value)) continue;
      // Escape special regex characters in value
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      js = js.replace(new RegExp(`\\b${escapedName}\\b`, 'g'), () => value);
    }

    // 4. Function declarations with improved parsing
    const userFnNames = new Set();
    js = js.replace(
      /\b(?:void|int|float|double|long|unsigned\s+long|unsigned\s+int|byte|boolean|bool|char\s*\*?|String|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t)\s+(\w+)\s*\(([^)]*)\)\s*\{/g,
      (match, name, params) => {
        if (!/^[A-Za-z_]\w*$/.test(name)) {
          throw new Error(`Invalid function name: ${name}`);
        }
        userFnNames.add(name);
        const cleanParams = params
          .replace(/\b(?:unsigned\s+)?(?:int|long|short|byte\s*\*?|float|double|boolean|bool|char\s*\*?|String|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t)\s+/g, '')
          .trim();
        return `async function ${name}(${cleanParams}) {`;
      }
    );

    // 5. Variable declarations
    js = js.replace(/\b(?:unsigned\s+)?(?:int|long|short|byte|float|double|boolean|bool|String)\s+(\w+)(?=\s*[=;,\[\)])/g, 'let $1');
    js = js.replace(/\bchar\s+(\w+)(?=\s*[=;,\[\)])/g, 'let $1');
    
    // Handle const properly
    js = js.replace(/\bconst\s+let\b/g, 'let');
    js = js.replace(/\bconst\s+async\b/g, 'async');

    // 6. Library declarations with validation
    const libraryPatterns = [
      { pattern: /\b(Servo|LiquidCrystal|LiquidCrystal_I2C|WiFiClient|PubSubClient|WebServer|Adafruit_SSD1306)\s+(\w+)\s*(?:\(([^)]*)\))?\s*;/g,
        replacement: 'let $2 = new $1($3)' }
    ];
    for (const {pattern, replacement} of libraryPatterns) {
      js = js.replace(pattern, replacement);
    }

    // Strip & from Adafruit_SSD1306 constructors
    js = js.replace(/new\s+Adafruit_SSD1306\s*\(([^)]*)\)/g, (_, args) => 
      `new Adafruit_SSD1306(${args.replace(/&\s*/g, '')})`
    );

    // 7. Arrays with improved handling
    js = js.replace(/let\s+(\w+)\s*\[(\d+)\]\s*=\s*\{([^}]*)\}/g, (_, name, size, values) => {
      const arr = values.split(',').map(v => v.trim());
      if (arr.length > parseInt(size)) {
        throw new Error(`Array ${name} has more elements than declared size ${size}`);
      }
      return `let ${name} = [${values}]`;
    });
    js = js.replace(/let\s+(\w+)\s*\[\s*\]\s*=\s*\{([^}]*)\}/g, 'let $1 = [$2]');
    js = js.replace(/let\s+(\w+)\s*\[(\d+)\](?!\s*=)/g, (_, name, size) => {
      const s = parseInt(size);
      if (s <= 0 || s > 10000) {
        throw new Error(`Invalid array size: ${size}`);
      }
      return `let ${name} = new Array(${s}).fill(0)`;
    });
    js = js.replace(/let\s+(\w+)\s*\[\s*\](?!\s*=)/g, 'let $1 = []');
    
    // C-style char arrays
    js = js.replace(/let\s+(\w+)\s*\[\s*\d*\s*\]\s*=\s*("[^"]*"|'[^']*')/g, 'let $1 = $2');

    // 8. Constants
    const constants = {
      HIGH: '1', LOW: '0',
      INPUT_PULLUP: '"INPUT_PULLUP"',
      INPUT: '"INPUT"', OUTPUT: '"OUTPUT"',
      LED_BUILTIN: this.board === 'esp32_devkit_v1' ? '2' : '13',
      A0: this.board === 'esp32_devkit_v1' ? '36' : '14',
      A1: this.board === 'esp32_devkit_v1' ? '39' : '15',
      A2: this.board === 'esp32_devkit_v1' ? '34' : '16',
      A3: this.board === 'esp32_devkit_v1' ? '35' : '17',
      A4: this.board === 'esp32_devkit_v1' ? '32' : '18',
      A5: this.board === 'esp32_devkit_v1' ? '33' : '19',
      DEC: '10', HEX: '16', OCT: '8', BIN: '2',
      MSBFIRST: '1', LSBFIRST: '0'
    };
    for (const [name, value] of Object.entries(constants)) {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      js = js.replace(new RegExp(`\\b${escapedName}\\b`, 'g'), value);
    }

    // 9. Type declarations
    const types = [
      'unsigned long', 'unsigned int', 'unsigned short', 'unsigned char',
      'const char*', 'const String', 'const int', 'const float', 'const double',
      'int', 'float', 'double', 'long', 'short', 'char', 'byte', 'String'
    ];
    for (const type of types) {
      js = js.replace(new RegExp(`\\b${type}\\s+(?=[a-zA-Z_])`, 'g'), 'var ');
    }

    // 10. API mapping with validation
    const apiMap = this._buildApiMap();
    for (const [orig, mapped] of apiMap) {
      const escapedOrig = orig.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      js = js.replace(new RegExp(`\\b${escapedOrig}\\b(?=\\s*\\()`, 'g'), mapped);
    }

    // 11. Serial API
    const serialMap = {
      'Serial\\.begin': '_a.serialBegin',
      'Serial\\.print': '_a.serialPrint',
      'Serial\\.println': '_a.serialPrintln',
      'Serial\\.read': '_a.serialRead',
      'Serial\\.available': '_a.serialAvailable',
      'Serial\\.write': '_a.serialWrite',
      'Serial\\.flush': '_a.serialFlush',
      'Serial\\.parseInt': '_a.serialParseInt',
      'Serial\\.parseFloat': '_a.serialParseFloat',
      'Serial\\.peek': '_a.serialPeek',
      'Serial\\.readString': '_a.serialReadString',
      'Serial\\.readStringUntil': '_a.serialReadStringUntil',
      'Serial\\.readBytes': '_a.serialReadBytes',
      'Serial\\.readBytesUntil': '_a.serialReadBytesUntil',
      'Serial\\.readLine': '_a.serialReadLine'
    };
    for (const [orig, mapped] of Object.entries(serialMap)) {
      js = js.replace(new RegExp(`\\b${orig}\\s*\\(`, 'g'), `${mapped}(`);
    }

    // 12. WiFi API
    const wifiMap = {
      'WiFi\\.begin': '_a.wifiBegin',
      'WiFi\\.localIP': '_a.wifiLocalIP',
      'WiFi\\.softAPIP': '_a.wifiSoftAPIP',
      'WiFi\\.status': '_a.wifiStatus',
      'WiFi\\.disconnect': '_a.wifiDisconnect',
      'WiFi\\.mode': '_a.wifiMode',
      'WiFi\\.softAP': '_a.wifiSoftAP'
    };
    for (const [orig, mapped] of Object.entries(wifiMap)) {
      js = js.replace(new RegExp(`\\b${orig}\\s*\\(`, 'g'), `${mapped}(`);
    }

    // 13. Make delay async
    js = js.replace(/_a\.delay\s*\(/g, 'await _a.delay(');
    js = js.replace(/_a\.delayMicroseconds\s*\(/g, 'await _a.delayMicroseconds(');
    js = js.replace(/_a\.pulseIn\s*\(/g, 'await _a.pulseIn(');

    // 14. Auto-await user functions
    for (const name of userFnNames) {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      js = js.replace(
        new RegExp(`(?<!function\\s)(?<!await\\s)(?<![\\w.])\\b${escapedName}\\s*\\(`, 'g'),
        `await ${name}(`
      );
    }

    // 15. Remove C++ type casts
    js = js.replace(/\((?:int|float|double|long|byte|char|uint8_t|uint16_t)\)\s*/g, '');

    // 16. Clean up
    js = js.replace(/\s*;\s*;/g, ';');
    js = js.replace(/\s*,\s*/g, ', ');
    js = js.replace(/\s+$/gm, '');

    return js;
  }

  /* ═══════════════════════════════════════════════════════
     COMPILE & RUN — with enhanced error handling
     ═══════════════════════════════════════════════════════ */

  async compile(code) {
    try {
      // Validate input
      if (typeof code !== 'string') {
        throw new Error('Code must be a string');
      }
      if (code.trim().length === 0) {
        throw new Error('Code cannot be empty');
      }

      const js = this.transpile(code);
      const ctx = this.buildContext();
      
      // Filter context keys with validation
      const filtered = [];
      for (const [key, val] of Object.entries(ctx)) {
        if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) continue;
        if (this._reservedWords.has(key)) continue;
        filtered.push({ key, val });
      }

      const keys = filtered.map(entry => entry.key);
      const vals = filtered.map(entry => entry.val);

      // Build function with safety
      const body = `{\n"use strict";\n${js}\n\nif(typeof setup === "undefined") throw new Error("Missing setup() function. Every Arduino sketch needs a setup() function."); if(typeof loop === "undefined") throw new Error("Missing loop() function. Every Arduino sketch needs a loop() function."); return { setup, loop };\n}`;

      let fn;
      try {
        fn = new Function(...keys, body);
      } catch (err) {
        return this._compileError(err, js);
      }

      this._compiledFn = fn;
      this._compiledCtx = { keys, vals, fn };
      this._compiledJs = js;
      
      return { ok: true, compiledJs: js };
    } catch (err) {
      return this._compileError(err);
    }
  }

  async run(code) {
    if (this.isRunning) {
      this.stop();
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    if (typeof code !== 'string') {
      code = '';
    }

    // Reset state
    this._resetState();
    this._startRealTime = Date.now();
    this._isStopping = false;

    // Compile
    const result = await this.compile(code);
    if (!result.ok) {
      this._emitError(result.error);
      return false;
    }

    this.isRunning = true;
    this.isPaused = false;
    const runId = ++this._runSeq;

    const { keys, vals, fn } = this._compiledCtx;

    this._serialLog('[ArduSim] Simulation started\n', 'system');
    if (this._callbacks.onStart) this._callbacks.onStart();

    // Start FPS ticker
    this._fpsInterval = setInterval(() => this._tickFps(), 500);

    let hadError = false;
    let setupDone = false;

    try {
      const { setup, loop } = fn(...vals);
      setupDone = true;

      // Run setup with timeout protection
      await this._withTimeout(setup(), 30000, 'Setup function timed out after 30 seconds');

      // Run loop
      while (this.isRunning && runId === this._runSeq && !this._isStopping) {
        if (this.isPaused) {
          await new Promise(resolve => { this._resumeResolve = resolve; });
          continue;
        }

        this._iterSinceDelay++;

        // Infinite-loop guard with backoff
        if (this._iterSinceDelay > this._MAX_TIGHT_ITERS) {
          this._iterSinceDelay = 0;
          // Yield to UI with priority
          await this._yieldToUI();
        }

        // Run loop iteration with timeout
        await this._withTimeout(loop(), 5000, 'Loop iteration exceeded 5 seconds');

        this._loopCount++;

        // Yield to UI thread every iteration
        await this._yieldToUI();
      }
    } catch (err) {
      if (err && err.message !== 'SIMULATION_STOPPED') {
        hadError = true;
        const friendly = this._friendlyError(err.message ? err.message : String(err), err instanceof Error ? err : undefined);
        this._emitError(friendly);
        this._serialLog(`[Error] ${friendly}\n`, 'error');
        
        // Attempt to clean up
        this._cleanupExecution();
      }
    } finally {
      if (runId === this._runSeq) {
        this._cleanupExecution();
      }
    }

    if (runId === this._runSeq && !hadError) {
      this.isRunning = false;
      this._serialLog('[ArduSim] Simulation stopped\n', 'system');
      if (this._callbacks.onStop) this._callbacks.onStop();
    }

    return !hadError;
  }

  stop() {
    this._isStopping = true;
    this.isRunning = false;
    this.isPaused = false;
    this._runSeq++;
    
    // Close MQTT connections
    for (const c of this._mqttOpen) {
      try { c.end(true); } catch (e) { /* ignore */ }
    }
    this._mqttOpen = [];
    this._mqtt = null;

    // Cancel delays
    for (const d of this._delays) {
      clearTimeout(d.id);
      if (d.reject) d.reject(new Error('SIMULATION_STOPPED'));
    }
    this._delays = [];

    // Resume if paused
    if (this._resumeResolve) {
      const r = this._resumeResolve;
      this._resumeResolve = null;
      r();
    }

    this._stopAllTones();
    
    // Clean up compiled code
    this._compiledFn = null;
    this._compiledCtx = null;
  }

  pause() {
    if (!this.isRunning) return;
    this.isPaused = true;
    
    // Freeze delays
    const now = Date.now();
    for (const d of this._delays) {
      if (d.frozen) continue;
      const remaining = Math.max(0, d.duration - (now - d.start));
      clearTimeout(d.id);
      d.frozen = true;
      d.duration = remaining;
    }
  }

  resume() {
    if (!this.isRunning || !this.isPaused) return;
    this.isPaused = false;
    
    // Restart delays
    const now = Date.now();
    for (const d of this._delays) {
      if (!d.frozen) continue;
      d.frozen = false;
      d.start = now;
      d.id = setTimeout(() => {
        const idx = this._delays.indexOf(d);
        if (idx !== -1) this._delays.splice(idx, 1);
        if (d.resolve) d.resolve();
      }, Math.max(0, d.duration));
    }
    
    if (this._resumeResolve) {
      const r = this._resumeResolve;
      this._resumeResolve = null;
      r();
    }
  }

  /* ═══════════════════════════════════════════════════════
     PRIVATE HELPERS
     ═══════════════════════════════════════════════════════ */

  _validatePin(pin) {
    const num = Number(pin);
    if (!Number.isInteger(num) || num < 0 || num > this._maxPin) {
      throw new Error(`Invalid pin: ${pin}. Valid range: 0-${this._maxPin}`);
    }
    return num;
  }

  _validatePinValue(value) {
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0 || num > 255) {
      throw new Error(`Invalid pin value: ${value}. Must be between 0 and 255`);
    }
    return num;
  }

  _securityCheck(code) {
    const dangerous = [
      /eval\s*\(/,
      /Function\s*\(/,
      /import\s*\(/,
      /require\s*\(/,
      /process\./,
      /global\./,
      /window\./,
      /document\./,
      /localStorage\./,
      /sessionStorage\./,
      /fetch\s*\(/,
      /XMLHttpRequest/,
      /WebSocket/,
      /Worker/,
      /SharedWorker/,
      /ServiceWorker/
    ];
    
    for (const pattern of dangerous) {
      if (pattern.test(code)) {
        throw new Error(`Security violation: ${pattern.source} pattern detected in code`);
      }
    }
  }

  _buildApiMap() {
    const base = [
      ['delay', '_a.delay'],
      ['delayMicroseconds', '_a.delayMicroseconds'],
      ['pinMode', '_a.pinMode'],
      ['digitalWrite', '_a.digitalWrite'],
      ['digitalRead', '_a.digitalRead'],
      ['analogWrite', '_a.analogWrite'],
      ['analogRead', '_a.analogRead'],
      ['millis', '_a.millis'],
      ['micros', '_a.micros'],
      ['tone', '_a.tone'],
      ['noTone', '_a.noTone'],
      ['pulseIn', '_a.pulseIn'],
      ['attachInterrupt', '_a.attachInterrupt'],
      ['detachInterrupt', '_a.detachInterrupt'],
      ['randomSeed', '_a.randomSeed'],
      ['random', '_a.random'],
      ['ntpEpoch', '_a.ntpEpoch'],
      ['map', '_a.map'],
      ['constrain', '_a.constrain'],
      ['abs', 'Math.abs'],
      ['min', '_a.min'],
      ['max', '_a.max'],
      ['sqrt', 'Math.sqrt'],
      ['pow', 'Math.pow'],
      ['sin', 'Math.sin'],
      ['cos', 'Math.cos'],
      ['tan', 'Math.tan'],
      ['floor', 'Math.floor'],
      ['ceil', 'Math.ceil'],
      ['round', 'Math.round'],
      ['shiftIn', '_a.shiftIn'],
      ['shiftOut', '_a.shiftOut'],
      ['bitRead', '_a.bitRead'],
      ['bitWrite', '_a.bitWrite'],
      ['bitSet', '_a.bitSet'],
      ['bitClear', '_a.bitClear'],
      ['bit', '_a.bit'],
      ['lowByte', '_a.lowByte'],
      ['highByte', '_a.highByte'],
      ['sensorValue', '_a.sensorValue'],
      ['ledcSetup', '_a.ledcSetup'],
      ['ledcSetupChannel', '_a.ledcSetupChannel'],
      ['ledcAttachPin', '_a.ledcAttachPin'],
      ['ledcAttach', '_a.ledcAttach'],
      ['ledcWrite', '_a.ledcWrite'],
      ['ledcRead', '_a.ledcRead'],
      ['dacWrite', '_a.dacWrite'],
      ['analogReadMilliVolts', '_a.analogReadMilliVolts'],
      ['analogReadMicroVolts', '_a.analogReadMicroVolts'],
      ['touchRead', '_a.touchRead'],
      ['hallRead', '_a.hallRead'],
      ['temperatureRead', '_a.temperatureRead'],
      ['digitalPinToInterrupt', '_a.digitalPinToInterrupt']
    ];
    return base;
  }

  _buildContext() {
    const self = this;
    const ctx = {
      _a: this._buildApiObject(self)
    };

    // Constants
    const constants = {
      HIGH: 1, LOW: 0,
      INPUT: 'INPUT', OUTPUT: 'OUTPUT', INPUT_PULLUP: 'INPUT_PULLUP',
      RISING: 'RISING', FALLING: 'FALLING', CHANGE: 'CHANGE',
      A0: this.board === 'esp32_devkit_v1' ? 36 : 14,
      A1: this.board === 'esp32_devkit_v1' ? 39 : 15,
      A2: this.board === 'esp32_devkit_v1' ? 34 : 16,
      A3: this.board === 'esp32_devkit_v1' ? 35 : 17,
      A4: this.board === 'esp32_devkit_v1' ? 32 : 18,
      A5: this.board === 'esp32_devkit_v1' ? 33 : 19,
      LED_BUILTIN: this.board === 'esp32_devkit_v1' ? 2 : 13,
      PI: Math.PI, TWO_PI: Math.PI * 2, HALF_PI: Math.PI / 2,
      DEG_TO_RAD: Math.PI / 180, RAD_TO_DEG: 180 / Math.PI,
      MSBFIRST: 1, LSBFIRST: 0,
      BYTE: 0, WORD: 1,
      WIFI_STA: 1, WIFI_AP: 2, WIFI_AP_STA: 3,
      WL_CONNECTED: 3, WL_DISCONNECTED: 6,
      HTTP_GET: 'GET', HTTP_POST: 'POST', HTTP_PUT: 'PUT',
      HTTP_DELETE: 'DELETE', HTTP_HEAD: 'HEAD', HTTP_OPTIONS: 'OPTIONS',
      HTTP_PATCH: 'PATCH', HTTP_ANY: 'ANY',
      SSD1306_SWITCHCAPVCC: 0x01, SSD1306_EXTERNALVCC: 0x02,
      SSD1306_I2C_ADDRESS: 0x3C, SSD1306_WHITE: 1, SSD1306_BLACK: 0,
      SSD1306_SETCONTRAST: 0x81, SSD1306_SETVCOMDETECT: 0xDB,
      DEC: 10, HEX: 16, OCT: 8, BIN: 2
    };
    Object.assign(ctx, constants);

    // Library stubs
    ctx.Servo = function() { return {}; };
    ctx.LiquidCrystal = function() { 
      const powerOn = () => self._emitEvent('lcd_power', { on: true });
      return {
        init: powerOn, begin: powerOn, backlight: powerOn,
        noBacklight() {}, setBacklight() {}, display() {},
        noDisplay() {}, blink() {}, noBlink() {},
        cursor() {}, noCursor() {}, createChar() {}
      };
    };
    ctx.LiquidCrystal_I2C = ctx.LiquidCrystal;
    ctx.Adafruit_SSD1306 = function() {
      const draw = (op, extra) => self._emitEvent('oled_draw', Object.assign({ op }, extra));
      return {
        __oled: true,
        begin() { self._emitEvent('oled_power', { on: true }); },
        init() { self._emitEvent('oled_power', { on: true }); },
        clearDisplay() { draw('clear'); },
        display() {},
        setCursor(col, row) { self._lcdCursor = { col: Math.round(Number(col) || 0), row: Math.round(Number(row) || 0) }; },
        setTextSize(s) { self._oledTextSize = Math.max(1, Math.round(Number(s) || 1)); },
        setTextColor(c) { self._oledTextColor = c ? 1 : 0; },
        setTextWrap(w) {},
        setRotation(r) {},
        invertDisplay(i) { draw('invert', { invert: !!i }); },
        setContrast(c) {},
        drawPixel(x, y) { draw('pixel', { x: Math.round(Number(x) || 0), y: Math.round(Number(y) || 0) }); },
        drawLine(x0, y0, x1, y1) { draw('line', { 
          x0: Math.round(Number(x0) || 0), y0: Math.round(Number(y0) || 0),
          x1: Math.round(Number(x1) || 0), y1: Math.round(Number(y1) || 0)
        }); },
        drawRect(x, y, w, h) { draw('rect', {
          x: Math.round(Number(x) || 0), y: Math.round(Number(y) || 0),
          w: Math.round(Number(w) || 0), h: Math.round(Number(h) || 0)
        }); },
        fillRect(x, y, w, h) { draw('fillRect', {
          x: Math.round(Number(x) || 0), y: Math.round(Number(y) || 0),
          w: Math.round(Number(w) || 0), h: Math.round(Number(h) || 0)
        }); },
        drawCircle(x, y, r) { draw('circle', {
          x: Math.round(Number(x) || 0), y: Math.round(Number(y) || 0),
          r: Math.round(Number(r) || 0)
        }); },
        fillCircle(x, y, r) { draw('fillCircle', {
          x: Math.round(Number(x) || 0), y: Math.round(Number(y) || 0),
          r: Math.round(Number(r) || 0)
        }); },
        fillScreen(color) { draw('fillScreen', { color: color ? 1 : 0 }); },
        drawBitmap() {}
      };
    };

    ctx.Wire = {
      begin() {}, requestFrom() { return 0; },
      beginTransmission() {}, endTransmission() { return 0; },
      write() { return 1; }, read() { return 0; }, available() { return 0; }
    };
    ctx.SPI = {
      begin() {}, transfer() { return 0; }, end() {},
      setClockDivider() {}, setBitOrder() {}, setDataMode() {}
    };
    ctx.WiFi = {
      begin(ssid, pass) {
        self._serialLog(`[ESP32 Wi-Fi] Connecting to "${ssid}"...\n`, 'system');
        setTimeout(() => self._serialLog('[ESP32 Wi-Fi] Connected! IP: 192.168.1.105\n', 'system'), 
          Math.max(50, 800 / self.speed));
      },
      localIP() { return '192.168.1.105'; },
      softAPIP() { return '192.168.4.1'; },
      status() { return 3; },
      disconnect() {},
      mode() {},
      softAP(ssid) { self._serialLog(`[ESP32 Wi-Fi] SoftAP "${ssid}" started\n`, 'system'); },
      setAutoConnect() {}
    };
    ctx.WiFiClient = function() { return {}; };
    ctx.WebServer = function(port) {
      const cfg = (self._web = self._web || { port: 80, routes: [], reqIdx: 0, lastHit: 0 });
      cfg.port = Number(port) || cfg.port || 80;
      return {
        __webserver: true,
        begin() {},
        send() {},
        on() {},
        arg() { return ''; },
        sendHeader() {},
        handleClient() {}
      };
    };
    ctx.PubSubClient = function() { return self._buildPubSubClient(); };

    return ctx;
  }

  _buildApiObject(self) {
    return {
      /* ── Pin Control ── */
      pinMode(pin, mode) {
        const p = self._validatePin(pin);
        const validModes = ['INPUT', 'OUTPUT', 'INPUT_PULLUP'];
        if (!validModes.includes(mode)) {
          throw new Error(`Invalid pin mode: ${mode}. Valid modes: ${validModes.join(', ')}`);
        }
        const key = `pin_${p}`;
        self.pinModes.set(key, mode);
        self._emitPinChange(key, self.pinStates.get(key) || 0);
      },

      digitalWrite(pin, val) {
        const p = self._validatePin(pin);
        const v = val ? 1 : 0;
        const key = `pin_${p}`;
        self.pinStates.set(key, v);
        self._emitPinChange(key, v);
      },

      digitalRead(pin) {
        const p = self._validatePin(pin);
        const key = `pin_${p}`;
        const state = self.pinStates.get(key);
        if (self.pinModes.get(key) === 'INPUT_PULLUP') {
          return state !== undefined ? (state ? 0 : 1) : 1;
        }
        return state || 0;
      },

      analogWrite(pin, val) {
        const p = self._validatePin(pin);
        const v = Math.max(0, Math.min(255, Math.round(Number(val) || 0)));
        const key = `pin_${p}`;
        self.pinStates.set(key, v);
        self._emitPinChange(key, v);
      },

      analogRead(pin) {
        const p = self._validatePin(pin);
        const key = `pin_${p}`;
        const v = self.pinStates.get(key);
        return v !== undefined && v !== null && !Number.isNaN(v) ? v : 0;
      },

      /* ── Timing ── */
      async delay(ms) {
        ms = Number(ms);
        if (!Number.isFinite(ms) || ms < 0) ms = 0;
        if (ms > 86400000) { // 24 hours max
          throw new Error('delay() maximum is 24 hours (86,400,000 ms)');
        }
        const realMs = ms / self.speed;
        self.simTime += ms;
        self._iterSinceDelay = 0;
        await self._delayPromise(realMs);
      },

      async delayMicroseconds(us) {
        us = Number(us);
        if (!Number.isFinite(us) || us < 0) us = 0;
        if (us > 1000000000) { // 1 second max
          throw new Error('delayMicroseconds() maximum is 1,000,000,000 µs (1 second)');
        }
        const ms = us / 1000;
        const realMs = ms / self.speed;
        self.simTime += ms;
        self._iterSinceDelay = 0;
        await self._delayPromise(realMs);
      },

      millis() { return self.simTime; },
      micros() { return self.simTime * 1000; },
      ntpEpoch() { return Math.floor(Date.now() / 1000); },

      /* ── Serial ── */
      serialBegin(baud) {
        const b = Number(baud);
        if (!Number.isFinite(b) || b < 300 || b > 2000000) {
          throw new Error(`Invalid baud rate: ${baud}. Valid range: 300-2,000,000`);
        }
        self.serialBaud = b;
        self._serialLog(`[Serial] Opened at ${b} baud\n`, 'system');
      },

      serialPrint(val, fmt) {
        let str = self._formatSerialValue(val, fmt);
        self._serialLog(str, 'data');
      },

      serialPrintln(val, fmt) {
        let str = val === undefined ? '' : self._formatSerialValue(val, fmt);
        self._serialLog(str + '\n', 'data');
      },

      serialRead() {
        return self.serialInputBuffer.length > 0
          ? self.serialInputBuffer.shift().charCodeAt(0)
          : -1;
      },

      serialAvailable() { return self.serialInputBuffer.length; },

      serialWrite(val) {
        const code = Number(val);
        if (!Number.isFinite(code) || code < 0 || code > 255) {
          throw new Error(`serialWrite() value must be 0-255`);
        }
        self._serialLog(String.fromCharCode(code), 'data');
      },

      serialFlush() {},
      serialParseInt() { return 0; },
      serialParseFloat() { return 0.0; },

      serialPeek() {
        return self.serialInputBuffer.length > 0 
          ? self.serialInputBuffer[0].charCodeAt(0) 
          : -1;
      },

      serialReadString() {
        const s = self.serialInputBuffer.join('');
        self.serialInputBuffer = [];
        return s;
      },

      serialReadStringUntil(terminator) {
        const t = String(terminator);
        let collected = '';
        while (self.serialInputBuffer.length > 0) {
          const ch = self.serialInputBuffer.shift();
          collected += ch;
          if (ch === t) break;
        }
        return collected;
      },

      serialReadBytes(count) {
        const n = Math.min(count || 1, self.serialInputBuffer.length);
        const chars = self.serialInputBuffer.splice(0, n);
        return chars.map(c => c.charCodeAt(0));
      },

      serialReadBytesUntil(terminator) {
        const t = String(terminator);
        const result = [];
        while (self.serialInputBuffer.length > 0) {
          const ch = self.serialInputBuffer.shift();
          result.push(ch.charCodeAt(0));
          if (ch === t) break;
        }
        return result;
      },

      serialReadLine() {
        const idx = self.serialInputBuffer.indexOf('\n');
        if (idx === -1) {
          const s = self.serialInputBuffer.join('');
          self.serialInputBuffer = [];
          return s;
        }
        const line = self.serialInputBuffer.splice(0, idx + 1).join('');
        return line.endsWith('\n') ? line.slice(0, -1) : line;
      },

      /* ── Math ── */
      map(val, inMin, inMax, outMin, outMax) {
        const v = Number(val), imin = Number(inMin), imax = Number(inMax);
        const omin = Number(outMin), omax = Number(outMax);
        if (!Number.isFinite(v) || !Number.isFinite(imin) || !Number.isFinite(imax) ||
            !Number.isFinite(omin) || !Number.isFinite(omax)) {
          throw new Error('map() arguments must be numbers');
        }
        if (imax === imin) return omin;
        return (v - imin) * (omax - omin) / (imax - imin) + omin;
      },

      constrain(val, lo, hi) {
        const v = Number(val), low = Number(lo), high = Number(hi);
        if (!Number.isFinite(v) || !Number.isFinite(low) || !Number.isFinite(high)) {
          throw new Error('constrain() arguments must be numbers');
        }
        return Math.max(low, Math.min(high, v));
      },

      random(minOrMax, max) {
        if (max === undefined) {
          const hi = Math.floor(Number(minOrMax) || 0);
          if (hi <= 0) return 0;
          return Math.floor(Math.random() * hi);
        }
        const lo = Math.floor(Number(minOrMax) || 0);
        const hi = Math.floor(Number(max) || 0);
        if (hi <= lo) return lo;
        return Math.floor(Math.random() * (hi - lo)) + lo;
      },

      randomSeed(seed) {
        // Seed is ignored in JS
      },

      min(a, b) { return Math.min(Number(a) || 0, Number(b) || 0); },
      max(a, b) { return Math.max(Number(a) || 0, Number(b) || 0); },

      /* ── Bit Operations ── */
      bitRead(val, bit) {
        const v = Number(val), b = Number(bit);
        if (!Number.isInteger(v) || !Number.isInteger(b) || b < 0 || b > 31) {
          throw new Error('bitRead() requires integer val and bit 0-31');
        }
        return (v >> b) & 1;
      },

      bitWrite(val, bit, bv) {
        const v = Number(val), b = Number(bit);
        if (!Number.isInteger(v) || !Number.isInteger(b) || b < 0 || b > 31) {
          throw new Error('bitWrite() requires integer val and bit 0-31');
        }
        return bv ? v | (1 << b) : v & ~(1 << b);
      },

      bitSet(val, bit) {
        const v = Number(val), b = Number(bit);
        if (!Number.isInteger(v) || !Number.isInteger(b) || b < 0 || b > 31) {
          throw new Error('bitSet() requires integer val and bit 0-31');
        }
        return v | (1 << b);
      },

      bitClear(val, bit) {
        const v = Number(val), b = Number(bit);
        if (!Number.isInteger(v) || !Number.isInteger(b) || b < 0 || b > 31) {
          throw new Error('bitClear() requires integer val and bit 0-31');
        }
        return v & ~(1 << b);
      },

      bit(b) {
        const bit = Number(b);
        if (!Number.isInteger(bit) || bit < 0 || bit > 31) {
          throw new Error('bit() requires integer 0-31');
        }
        return 1 << bit;
      },

      lowByte(val) { return (Number(val) || 0) & 0xFF; },
      highByte(val) { return ((Number(val) || 0) >> 8) & 0xFF; },

      shiftIn(dataPin, clockPin, bitOrder) { return 0; },
      shiftOut(dataPin, clockPin, bitOrder, val) {},

      /* ── Sensor ── */
      sensorValue(instIdOrType, field) {
        const canvas = window.CircuitCanvas;
        if (!canvas || !Array.isArray(canvas.components)) return -999;
        const comps = canvas.components;
        let inst = comps.find(c => c.id === instIdOrType);
        if (!inst) inst = comps.find(c => c.type === instIdOrType);
        if (!inst) return -999;
        const rs = inst.runtimeState || {};
        if (rs[field] !== undefined) return rs[field];
        const props = inst.props || {};
        return props[field] !== undefined ? props[field] : -999;
      },

      /* ── EEPROM ── */
      eepromRead(addr) {
        const a = Number(addr);
        if (!Number.isInteger(a) || a < 0 || a >= 512) {
          throw new Error('EEPROM address must be 0-511');
        }
        return self._eeprom[a] || 0;
      },

      eepromWrite(addr, val) {
        const a = Number(addr), v = Number(val);
        if (!Number.isInteger(a) || a < 0 || a >= 512) {
          throw new Error('EEPROM address must be 0-511');
        }
        self._eeprom[a] = (v & 0xFF);
      },

      eepromUpdate(addr, val) { return this.eepromWrite(addr, val); },
      eepromGet(addr, obj) { return obj; },
      eepromPut(addr, val) {},
      eepromBegin(size) { self._serialLog(`[EEPROM] begin(${size || 512})\n`, 'system'); },
      eepromCommit() { self._serialLog('[EEPROM] commit\n', 'system'); },

      /* ── Tone ── */
      tone(pin, freq, duration) {
        const p = self._validatePin(pin);
        const f = Number(freq);
        if (!Number.isFinite(f) || f <= 0 || f > 20000) {
          throw new Error('tone() frequency must be 1-20000 Hz');
        }
        const key = `pin_${p}`;
        self._startTone(key, f);
        if (duration) {
          const dur = Number(duration);
          if (Number.isFinite(dur) && dur > 0) {
            setTimeout(() => self._stopTone(key), dur / self.speed);
          }
        }
      },

      noTone(pin) {
        const p = self._validatePin(pin);
        self._stopTone(`pin_${p}`);
      },

      /* ── Pulse ── */
      async pulseIn(pin, val, timeout) {
        const p = self._validatePin(pin);
        const t = Number(timeout) || 1000000;
        if (!Number.isFinite(t) || t < 0) {
          throw new Error('pulseIn() timeout must be a positive number');
        }
        await self._delayPromise(Math.min(t / 1000 / self.speed, 10));
        const key = `pin_${p}`;
        return self.pinStates.get(key) ? 1000 : 0;
      },

      /* ── Servo ── */
      servoAttach(varName, pin) {},
      servoWrite(varName, angle) {
        const a = Number(angle);
        if (!Number.isFinite(a) || a < 0 || a > 180) {
          throw new Error('servoWrite() angle must be 0-180');
        }
        self._emitEvent('servo', { angle: Math.round(a) });
      },
      servoWriteMs(varName, us) {},
      servoRead(varName) { return 90; },

      /* ── LCD ── */
      lcdBegin(varName, cols, rows) {
        if (varName && varName._ssId) {
          const ch = self._softSerial.get(varName._ssId);
          if (ch) { ch.listening = true; ch.baud = cols; }
          self._serialLog('[SoftwareSerial] begin(' + cols + ')\n', 'system');
          return;
        }
        if (varName && varName._npId) {
          self._serialLog('[NeoPixel] begin\n', 'system');
          return;
        }
        if (varName && varName.__webserver) {
          const cfg = (self._web = self._web || { port: 80, routes: [], reqIdx: 0, lastHit: 0 });
          cfg.port = Number(cols) || cfg.port || 80;
          self._serialLog(`[WebServer] HTTP server started on port ${cfg.port} → http://192.168.1.105/\n`, 'system');
          return;
        }
        if (varName && varName.__oled) {
          self._emitEvent('oled_power', { on: true });
          return;
        }
        self._emitEvent('lcd_power', { on: true });
      },

      lcdSetCursor(varName, col, row) {
        self._lcdCursor = { 
          col: Math.max(0, Math.min(15, Number(col) || 0)),
          row: Math.max(0, Math.min(1, Number(row) || 0))
        };
      },

      lcdPrint(varName, val) {
        if (varName && varName._ssId) {
          const ch = self._softSerial.get(varName._ssId);
          if (ch) { self._serialLog(String(val) + '\n', 'data'); }
          return;
        }
        const text = String(val);
        const cursor = self._lcdCursor || { col: 0, row: 0 };
        if (varName && varName.__oled) {
          const size = self._oledTextSize || 1;
          self._emitEvent('oled_draw', {
            op: 'print',
            text,
            cursor: { col: cursor.col, row: cursor.row },
            size,
            color: self._oledTextColor === 0 ? 0 : 1,
          });
          self._lcdCursor = { 
            col: cursor.col + text.length * 6 * size,
            row: cursor.row 
          };
          return;
        }
        self._emitEvent('lcd_print', { text, cursor: { col: cursor.col, row: cursor.row } });
        let col = cursor.col + text.length;
        let row = cursor.row;
        if (col >= 16 && row === 0) { col -= 16; row = 1; }
        if (col >= 16) col = 15;
        self._lcdCursor = { col, row };
      },

      lcdClear(varName) {
        if (varName && varName._npId) {
          const np = self._neopixels.get(varName._npId);
          if (np) np.pixels.fill(0);
          return;
        }
        if (varName && varName.__oled) {
          self._emitEvent('oled_draw', { op: 'clear' });
          return;
        }
        self._emitEvent('lcd_clear', {});
        self._lcdCursor = { col: 0, row: 0 };
      },

      lcdHome(varName) { self._lcdCursor = { col: 0, row: 0 }; },

      /* ── ESP32: WebServer ── */
      serverOn(server, path, m3, m4) {
        const cfg = (self._web = self._web || { port: 80, routes: [], reqIdx: 0, lastHit: 0 });
        const handler = typeof m3 === 'function' ? m3 : m4;
        const method = typeof m3 === 'function' ? 'GET' : String(m3 || 'GET').replace('HTTP_', '');
        if (typeof handler === 'function') {
          cfg.routes.push({ path: String(path), method, handler });
          self._serialLog(`[WebServer] Route registered: ${method} ${path}\n`, 'system');
        }
      },

      serverSend(server, code, type, content) {
        self._webResp = {
          code: Number(code) || 200,
          type: String(type || ''),
          content: String(content || ''),
        };
      },

      serverArg(server, name) { return ''; },

      serverHandleClient(server) {
        const cfg = self._web;
        if (!cfg || !cfg.routes.length) return;
        const now = Date.now();
        if (now - (cfg.lastHit || 0) < 1500) return;
        cfg.lastHit = now;
        const route = cfg.routes[cfg.reqIdx = ((cfg.reqIdx || 0) % cfg.routes.length)];
        cfg.reqIdx++;
        self._webResp = null;
        Promise.resolve()
          .then(() => route.handler())
          .then(() => {
            const resp = self._webResp || { code: 200, type: 'text/html', content: '' };
            self._serialLog(`[WebServer] ${route.method} ${route.path} → ${resp.code} (${resp.type})\n`, 'system');
            const snippet = String(resp.content).replace(/\s*\n\s*/g, ' ').trim();
            if (snippet) {
              self._serialLog(`[WebServer] Response: ${snippet.length > 320 ? snippet.slice(0, 320) + '…' : snippet}\n`, 'system');
            }
          })
          .catch((e) => {
            self._serialLog(`[WebServer] ${route.method} ${route.path} handler error: ${e && e.message ? e.message : e}\n`, 'system');
          });
      },

      /* ── ESP32: LEDC PWM ── */
      ledcSetup(channel, freq, resolution) {
        const ch = Number(channel), f = Number(freq), res = Number(resolution) || 8;
        if (!Number.isInteger(ch) || ch < 0 || ch > 15) {
          throw new Error('LEDC channel must be 0-15');
        }
        if (!Number.isFinite(f) || f < 1 || f > 40000000) {
          throw new Error('LEDC frequency must be 1-40,000,000 Hz');
        }
        if (res < 1 || res > 16) {
          throw new Error('LEDC resolution must be 1-16 bits');
        }
        const maxDuty = Math.pow(2, res) - 1;
        self._ledcChannels.set(ch, { freq: f, resolution: res, maxDuty });
        self._serialLog(`[ESP32] LEDC channel ${ch} → ${f}Hz (${res}-bit)\n`, 'system');
        return maxDuty;
      },

      ledcSetupChannel(channel, freq, resolution) {
        return this.ledcSetup(channel, freq, resolution);
      },

      ledcAttachPin(pin, channel) {
        const p = self._validatePin(pin);
        const ch = Number(channel);
        if (!self._ledcChannels.has(ch)) {
          self._ledcChannels.set(ch, { freq: 5000, resolution: 8, maxDuty: 255 });
        }
        const cfg = self._ledcChannels.get(ch);
        cfg.pin = p;
        self._serialLog(`[ESP32] LEDC: attached GPIO ${p} to channel ${ch}\n`, 'system');
        return 0;
      },

      ledcAttach(pin, freq, resolution) {
        const p = self._validatePin(pin);
        const f = Number(freq) || 5000;
        const res = Number(resolution) || 8;
        const maxDuty = Math.pow(2, res) - 1;
        self._ledcChannels.set(p, { pin: p, freq: f, resolution: res, maxDuty });
        self._serialLog(`[ESP32] LEDC: attached GPIO ${p} → ${f}Hz (${res}-bit)\n`, 'system');
        return true;
      },

      ledcWrite(channelOrPin, duty) {
        const id = Number(channelOrPin);
        let pin, maxDuty = 255;
        if (self._ledcChannels.has(id)) {
          const cfg = self._ledcChannels.get(id);
          pin = cfg.pin !== undefined ? cfg.pin : id;
          maxDuty = cfg.maxDuty || 255;
        } else {
          pin = id;
        }
        const p = self._validatePin(pin);
        const d = Number(duty);
        if (!Number.isFinite(d) || d < 0) {
          throw new Error('LEDC duty must be a positive number');
        }
        const v = Math.max(0, Math.min(255, Math.round((d / maxDuty) * 255)));
        const key = `pin_${p}`;
        self.pinStates.set(key, v);
        self._emitPinChange(key, v);
      },

      ledcRead(channelOrPin) {
        const id = Number(channelOrPin);
        let pin;
        if (self._ledcChannels.has(id)) {
          const cfg = self._ledcChannels.get(id);
          pin = cfg.pin !== undefined ? cfg.pin : id;
        } else {
          pin = id;
        }
        const p = self._validatePin(pin);
        return self.pinStates.get(`pin_${p}`) || 0;
      },

      /* ── ESP32: Analog / DAC ── */
      dacWrite(pin, value) {
        const p = self._validatePin(pin);
        const v = Math.max(0, Math.min(255, Math.round(Number(value) || 0)));
        const key = `pin_${p}`;
        self.pinStates.set(key, v);
        self._emitPinChange(key, v);
      },

      analogReadMilliVolts(pin) {
        const p = self._validatePin(pin);
        const v = self.pinStates.get(`pin_${p}`);
        if (v === undefined || v === null) return 0;
        return Math.round((Number(v) || 0) * 3300 / 1023);
      },

      analogReadMicroVolts(pin) { return this.analogReadMilliVolts(pin) * 1000; },
      touchRead(pin) { return 0; },
      hallRead() { return 0; },
      temperatureRead() { return 25.0; },
      digitalPinToInterrupt(pin) { return Number(pin); },

      /* ── ESP32: Wi-Fi ── */
      wifiBegin(ssid, pass) {
        self._serialLog(`[ESP32 Wi-Fi] Connecting to "${ssid}"...\n`, 'system');
        setTimeout(() => {
          self._serialLog('[ESP32 Wi-Fi] Connected! IP: 192.168.1.105\n', 'system');
        }, Math.max(50, 800 / self.speed));
      },

      wifiLocalIP() { return '192.168.1.105'; },
      wifiSoftAPIP() { return '192.168.4.1'; },
      wifiStatus() { return 3; },
      wifiDisconnect() { self._serialLog('[ESP32 Wi-Fi] Disconnected\n', 'system'); },
      wifiMode() {},
      wifiSoftAP(ssid, pass) {
        self._serialLog(`[ESP32 Wi-Fi] SoftAP "${ssid}" started\n`, 'system');
      },

      /* ── Interrupts ── */
      attachInterrupt(num, fn, mode) {},
      detachInterrupt(num) {},

      /* ── SoftwareSerial ── */
      softwareSerialNew(rxPin, txPin) {
        const rx = self._validatePin(rxPin);
        const tx = self._validatePin(txPin);
        const id = `_ss_${rx}_${tx}`;
        if (self._softSerial.has(id)) {
          throw new Error(`SoftwareSerial already exists for pins ${rx}, ${tx}`);
        }
        const buf = [];
        self._softSerial.set(id, { rxPin: rx, txPin: tx, buf, listening: false });
        self._serialLog(`[SoftwareSerial] Created rx=${rx} tx=${tx}\n`, 'system');
        return { _ssId: id, rxPin: rx, txPin: tx };
      },

      softSerialBegin(obj, baud) {
        const ch = self._softSerial.get(obj._ssId);
        if (ch) { ch.listening = true; ch.baud = baud; }
        self._serialLog(`[SoftwareSerial] begin(${baud})\n`, 'system');
      },

      softSerialWrite(obj, val) {
        const ch = self._softSerial.get(obj._ssId);
        if (ch) { self._serialLog(`[SoftwareSerial] write(${val})\n`, 'data'); }
      },

      softSerialPrintln(obj, val) {
        self._serialLog(String(val) + '\n', 'data');
      },

      softSerialRead(obj) {
        const ch = self._softSerial.get(obj._ssId);
        if (ch && ch.buf.length > 0) return ch.buf.shift().charCodeAt(0);
        return -1;
      },

      softSerialAvailable(obj) {
        const ch = self._softSerial.get(obj._ssId);
        return ch ? ch.buf.length : 0;
      },

      softSerialPeek(obj) {
        const ch = self._softSerial.get(obj._ssId);
        if (ch && ch.buf.length > 0) return ch.buf[0].charCodeAt(0);
        return -1;
      },

      softSerialEnd(obj) {
        const ch = self._softSerial.get(obj._ssId);
        if (ch) ch.listening = false;
      },

      softSerialFlush(obj) {},
      softSerialListen(obj) {
        const ch = self._softSerial.get(obj._ssId);
        if (ch) ch.listening = true;
      },

      softSerialIsListening(obj) {
        const ch = self._softSerial.get(obj._ssId);
        return ch ? ch.listening : false;
      },

      /* ── Stepper ── */
      stepperNew(stepsPerRev, pin1, pin2) {
        const steps = Number(stepsPerRev);
        const p1 = self._validatePin(pin1);
        const p2 = self._validatePin(pin2);
        if (!Number.isFinite(steps) || steps <= 0) {
          throw new Error('Stepper stepsPerRev must be a positive number');
        }
        const id = `_stepper_${p1}_${p2}`;
        self._steppers.set(id, { stepsPerRev: steps, pin1: p1, pin2: p2, pos: 0, target: 0, speed: 1, accel: 100 });
        self._serialLog(`[Stepper] Created stepsPerRev=${steps}\n`, 'system');
        return { _stepperId: id };
      },

      stepperSetSpeed(obj, rpm) {
        const s = self._steppers.get(obj._stepperId);
        if (s) s.speed = Math.max(0.1, Number(rpm) || 1);
      },

      stepperStep(obj, steps) {
        const s = self._steppers.get(obj._stepperId);
        if (s) { s.pos += Number(steps) || 0; s.target = s.pos; }
        self._serialLog(`[Stepper] step(${steps}) → pos=${s ? s.pos : 0}\n`, 'system');
      },

      stepperDistanceToGo(obj) {
        const s = self._steppers.get(obj._stepperId);
        return s ? s.target - s.pos : 0;
      },

      stepperCurrentPosition(obj) {
        const s = self._steppers.get(obj._stepperId);
        return s ? s.pos : 0;
      },

      stepperSetCurrentPosition(obj, pos) {
        const s = self._steppers.get(obj._stepperId);
        if (s) s.pos = s.target = Number(pos) || 0;
      },

      stepperRun(obj) {
        const s = self._steppers.get(obj._stepperId);
        if (!s) return false;
        if (s.pos === s.target) return false;
        s.pos += s.pos < s.target ? 1 : -1;
        return true;
      },

      stepperRunSpeed(obj) { return this.stepperRun(obj); },

      stepperStop(obj) {
        const s = self._steppers.get(obj._stepperId);
        if (s) s.target = s.pos;
      },

      stepperDisableOutputs(obj) {},
      stepperEnableOutputs(obj) {},
      stepperMaxSpeed(obj) {
        const s = self._steppers.get(obj._stepperId);
        return s ? s.speed : 0;
      },
      stepperAcceleration(obj) {
        const s = self._steppers.get(obj._stepperId);
        return s ? s.accel : 0;
      },
      stepperSetAcceleration(obj, accel) {
        const s = self._steppers.get(obj._stepperId);
        if (s) s.accel = Number(accel) || 100;
      },

      /* ── NewPing ── */
      newPingNew(triggerPin, echoPin, maxDistance) {
        const tp = self._validatePin(triggerPin);
        const ep = self._validatePin(echoPin);
        const id = `_ping_${tp}_${ep}`;
        self._pings.set(id, { triggerPin: tp, echoPin: ep, maxDist: maxDistance || 400 });
        return { _pingId: id };
      },

      newPingCm(obj) {
        const p = self._pings.get(obj._pingId);
        if (!p) return 0;
        const key = `pin_${p.triggerPin}`;
        const v = self.pinStates.get(key) || 0;
        return v > 0 ? Math.min(p.maxDist, Math.round(Math.random() * p.maxDist)) : 0;
      },

      newPingInch(obj) {
        return Math.round(this.newPingCm(obj) / 2.54);
      },

      newPingMedian(obj, iter) {
        const results = [];
        for (let i = 0; i < (iter || 5); i++) results.push(this.newPingCm(obj));
        results.sort((a, b) => a - b);
        return results[Math.floor(results.length / 2)] || 0;
      },

      newPingPing(obj) { return this.newPingCm(obj); },

      /* ── IRremote ── */
      irsendNew(pin) {
        self._validatePin(pin);
        self._irsend = { pin };
        return { _irId: 'irsend' };
      },

      irrecvNew(pin) {
        self._validatePin(pin);
        self._irrecv = { pin, results: { protocol: 0, value: 0, bits: 0 } };
        return { _irId: 'irrecv' };
      },

      irsendNEC(obj, data, nbits) {
        self._serialLog(`[IRremote] Send NEC: 0x${Number(data).toString(16).toUpperCase()} (${nbits || 32} bits)\n`, 'system');
      },

      irsendSony(obj, data, nbits) {
        self._serialLog(`[IRremote] Send Sony: 0x${Number(data).toString(16).toUpperCase()} (${nbits || 12} bits)\n`, 'system');
      },

      irsendRC5(obj, data, nbits) {
        self._serialLog(`[IRremote] Send RC5: 0x${Number(data).toString(16).toUpperCase()} (${nbits || 14} bits)\n`, 'system');
      },

      irsendRC6(obj, data, nbits) {
        self._serialLog(`[IRremote] Send RC6: 0x${Number(data).toString(16).toUpperCase()} (${nbits || 20} bits)\n`, 'system');
      },

      irsendRaw(buf, len, hz) {
        self._serialLog(`[IRremote] Send raw: ${len} samples\n`, 'system');
      },

      irsendStop(obj) {},
      irrecvEnableIRIn(obj) { self._serialLog('[IRremote] IR receiver enabled\n', 'system'); },

      irrecvDecode(obj, results) {
        const r = self._irrecv ? self._irrecv.results : { protocol: 0, value: 0, bits: 0 };
        if (results) {
          results.protocol = r.protocol;
          results.value = r.value;
          results.bits = r.bits;
        }
        return false;
      },

      irrecvResume(obj) {},

      /* ── FastLED ── */
      fastledAddLeds(ledType, dataPin, numLeds) {
        const p = self._validatePin(dataPin);
        const n = Number(numLeds);
        if (!Number.isInteger(n) || n < 0 || n > 10000) {
          throw new Error('FastLED numLeds must be 0-10000');
        }
        self._fastled = { leds: new Array(n).fill(null).map(() => ({ r: 0, g: 0, b: 0 })), brightness: 255, dataPin: p };
        self._serialLog(`[FastLED] ${n} LEDs on pin ${p}\n`, 'system');
      },

      fastledShow() {
        if (self._fastled) {
          self._emitEvent('fastled_show', { leds: self._fastled.leds, brightness: self._fastled.brightness });
        }
      },

      fastledSetBrightness(b) {
        if (self._fastled) self._fastled.brightness = Math.max(0, Math.min(255, Number(b) || 0));
      },

      fastledSetCorrection(type) {},
      fastledSetColorCorrection(type) {},
      fastledMaxPower(milliamps) {},
      fastledClear() {
        if (self._fastled) self._fastled.leds.forEach(l => { l.r = 0; l.g = 0; l.b = 0; });
      },

      crgbNew(r, g, b) {
        return {
          r: Math.max(0, Math.min(255, Number(r) || 0)),
          g: Math.max(0, Math.min(255, Number(g) || 0)),
          b: Math.max(0, Math.min(255, Number(b) || 0))
        };
      },

      crgbArray(size) {
        const n = Number(size);
        if (!Number.isInteger(n) || n < 0 || n > 10000) {
          throw new Error('CRGB array size must be 0-10000');
        }
        return new Array(n).fill(null).map(() => ({ r: 0, g: 0, b: 0 }));
      },

      chsvNew(h, s, v) {
        const hue = Number(h) || 0, sat = Number(s) || 255, val = Number(v) || 255;
        const c = { r: 0, g: 0, b: 0 };
        const i = Math.floor(hue / 43) % 6;
        const f = (hue / 43) - Math.floor(hue / 43);
        const p = (val * (255 - sat)) >> 8;
        const q = (val * (255 - ((sat * f) >> 8))) >> 8;
        const t = (val * (255 - ((sat * (255 - f)) >> 8))) >> 8;
        switch (i) {
          case 0: c.r = val; c.g = t; c.b = p; break;
          case 1: c.r = q; c.g = val; c.b = p; break;
          case 2: c.r = p; c.g = val; c.b = t; break;
          case 3: c.r = p; c.g = q; c.b = val; break;
          case 4: c.r = t; c.g = p; c.b = val; break;
          case 5: c.r = val; c.g = p; c.b = q; break;
        }
        return c;
      },

      /* ── Adafruit NeoPixel ── */
      neopixelNew(numLedsPin, pinOrType, type) {
        const numLeds = Number(numLedsPin) || 0;
        const pin = typeof pinOrType === 'number' ? self._validatePin(pinOrType) : 6;
        if (!Number.isInteger(numLeds) || numLeds < 0 || numLeds > 10000) {
          throw new Error('NeoPixel numLeds must be 0-10000');
        }
        const id = `_np_${pin}`;
        if (self._neopixels.has(id)) {
          throw new Error(`NeoPixel already exists on pin ${pin}`);
        }
        self._neopixels.set(id, { pin, numLeds, brightness: 255, pixels: new Array(numLeds).fill(0) });
        return { _npId: id };
      },

      neopixelShow(obj) {
        const np = self._neopixels.get(obj._npId);
        if (np) {
          const leds = np.pixels.map(c => ({
            r: (c >> 16) & 0xFF,
            g: (c >> 8) & 0xFF,
            b: c & 0xFF,
          }));
          self._emitEvent('fastled_show', { leds, brightness: np.brightness });
        }
      },

      neopixelSetPixelColor(obj, i, rOrColor, g, b) {
        const np = self._neopixels.get(obj._npId);
        if (!np) return;
        const idx = Number(i) || 0;
        if (idx < 0 || idx >= np.numLeds) {
          throw new Error(`NeoPixel index ${idx} out of range (0-${np.numLeds - 1})`);
        }
        if (g !== undefined) {
          np.pixels[idx] = ((Number(rOrColor) || 0) << 16) | ((Number(g) || 0) << 8) | (Number(b) || 0);
        } else {
          np.pixels[idx] = Number(rOrColor) || 0;
        }
      },

      neopixelGetPixelColor(obj, i) {
        const np = self._neopixels.get(obj._npId);
        const idx = Number(i) || 0;
        return np ? (np.pixels[idx] || 0) : 0;
      },

      neopixelSetBrightness(obj, b) {
        const np = self._neopixels.get(obj._npId);
        if (np) np.brightness = Math.max(0, Math.min(255, Number(b) || 0));
      },

      neopixelColor(obj, r, g, b) {
        return ((Number(r) || 0) << 16) | ((Number(g) || 0) << 8) | (Number(b) || 0);
      },

      neopixelNumPixels(obj) {
        const np = self._neopixels.get(obj._npId);
        return np ? np.numLeds : 0;
      },

      neopixelClear(obj) {
        const np = self._neopixels.get(obj._npId);
        if (np) np.pixels.fill(0);
      },

      /* ── MFRC522 RFID ── */
      rfidNew(csPin, rstPin) {
        const cs = self._validatePin(csPin);
        const rst = self._validatePin(rstPin);
        const id = `_rfid_${cs}_${rst}`;
        self._rfid.set(id, {
          csPin: cs, rstPin: rst, initialized: false,
          cardPresent: false,
          uidBytes: [0xA1, 0xB2, 0xC3, 0xD4],
          uidSize: 4
        });
        self._serialLog(`[MFRC522] Created CS=${cs} RST=${rst}\n`, 'system');
        return { _rfidId: id, uid: { uidByte: null, size: 0 } };
      },

      rfidInit(obj) {
        const r = self._rfid.get(obj._rfidId);
        if (r) {
          r.initialized = true;
          self._serialLog('[MFRC522] PCD_Init\n', 'system');
          self._serialLog('[MFRC522] Firmware: v0x92 (simulated)\n', 'system');
        }
      },

      rfidDumpVersion(obj) {
        self._serialLog('[MFRC522] PCD Version: v2.0 (simulated)\n', 'system');
      },

      rfidIsNewCard(obj) {
        const r = self._rfid.get(obj._rfidId);
        if (!r || !r.initialized) return false;
        r.cardPresent = Math.random() < 0.3;
        return r.cardPresent;
      },

      rfidReadCard(obj) {
        const r = self._rfid.get(obj._rfidId);
        if (!r || !r.cardPresent) return false;
        obj.uid = { uidByte: r.uidBytes, size: r.uidSize };
        self._serialLog(`[MFRC522] Card UID: ${r.uidBytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ')}\n`, 'system');
        return true;
      },

      rfidHaltA(obj) {},
      rfidStopCrypto(obj) {},

      rfidUidBytes(obj) {
        const r = self._rfid.get(obj._rfidId);
        return r ? r.uidBytes : [0];
      },

      rfidUidSize(obj) {
        const r = self._rfid.get(obj._rfidId);
        return r ? r.uidSize : 0;
      },

      rfidMifareRead(obj, blockAddr, buf) {
        self._serialLog(`[MFRC522] MIFARE_Read block ${blockAddr}\n`, 'system');
        return true;
      },

      rfidMifareWrite(obj, blockAddr, buf) {
        self._serialLog(`[MFRC522] MIFARE_Write block ${blockAddr}\n`, 'system');
        return true;
      },

      rfidREQA(obj) { return 0; },
      rfidWUPA(obj) { return 0; },
      rfidSelect(obj) { return 0; },
      rfidComputeBCC(obj, buf) { return 0; },
      rfidDumpDetails(obj) {},
      rfidDumpToSerial(obj) {},
      rfidDumpSector(obj, uid, sector) {},
      rfidDumpClassic(obj, uid, type) {},
      rfidDumpUltralight(obj) {}
    };
  }

  _buildPubSubClient() {
    const self = this;
    const broker = (self._mqtt = self._mqtt || { subs: new Map(), connected: false });
    const session = Math.random().toString(36).slice(2, 7);
    
    const ns = (topic) => `${topic}/${session}`;
    const bare = (topic) => String(topic).endsWith(`/${session}`)
      ? String(topic).slice(0, -(session.length + 1))
      : String(topic);

    let connected = false;
    let cb = null;
    let real = null;
    let realReady = false;
    const pendingSubs = new Set();

    const deliver = (topic, payload) => {
      if (!cb) return;
      try {
        cb(topic, payload, String(payload).length);
      } catch (e) {
        self._serialLog(`[MQTT] callback error: ${e && e.message ? e.message : e}\n`, 'system');
      }
    };

    const tryRealConnect = (clientId) => {
      if (typeof window.mqtt !== 'function' || !window.WebSocket) {
        self._serialLog('[MQTT] MQTT.js not loaded — using local broker only\n', 'system');
        return;
      }
      const cfg = window.ArduSimMQTT || {};
      const url = cfg.url || 'wss://broker.hivemq.com:8884/mqtt';
      try {
        real = window.mqtt.connect(url, {
          clientId,
          clean: true,
          connectTimeout: cfg.timeout || 10000,
          reconnectPeriod: 3000,
          keepalive: 30,
        });
        self._mqttOpen.push(real);
        real.on('connect', () => {
          realReady = true;
          self._serialLog(`[MQTT] Live broker connected (${url}) as "${clientId}"\n`, 'system');
          self._serialLog(`[MQTT] Watch it in MQTTX → subscribe to: ${ns('ardusim/temp')} (and ${ns('ardusim/led')})\n`, 'system');
          for (const t of pendingSubs) real.subscribe(t);
          pendingSubs.clear();
        });
        real.on('message', (topic, payload) => {
          deliver(bare(topic), payload.toString());
        });
        real.on('error', (e) => {
          self._serialLog(`[MQTT] Live broker error: ${e && e.message ? e.message : e}\n`, 'system');
        });
        real.on('close', () => {
          if (realReady) self._serialLog('[MQTT] Live broker connection closed — retrying...\n', 'system');
          realReady = false;
        });
        setTimeout(() => {
          if (!realReady) {
            self._serialLog('[MQTT] Public broker unreachable — running local broker only\n', 'system');
          }
        }, 12000);
      } catch (e) {
        self._serialLog(`[MQTT] Live broker unavailable — using local broker only (${e && e.message ? e.message : e})\n`, 'system');
      }
    };

    return {
      setServer(host, port) {
        self._serialLog(`[MQTT] Broker ${host}:${port}\n`, 'system');
      },
      setCallback(callback) { cb = callback; },
      connect(id) {
        const clientId = id || `ArduSim_${Math.random().toString(36).slice(2, 8)}`;
        connected = true;
        broker.connected = true;
        self._serialLog(`[MQTT] Connecting as "${clientId}"...\n`, 'system');
        tryRealConnect(clientId);
        return true;
      },
      disconnect() {
        connected = false;
        broker.connected = false;
        if (real) {
          try { real.end(true); } catch (e) { /* ignore */ }
          real = null;
        }
        realReady = false;
        self._serialLog('[MQTT] Disconnected\n', 'system');
      },
      connected() { return connected; },
      subscribe(topic) {
        const t = String(topic);
        if (!broker.subs.has(t)) broker.subs.set(t, new Set());
        broker.subs.get(t).add(deliver);
        self._serialLog(`[MQTT] Subscribed "${t}"\n`, 'system');
        if (real) {
          if (realReady) real.subscribe(ns(t));
          else pendingSubs.add(ns(t));
        }
        return true;
      },
      unsubscribe(topic) {
        const t = String(topic);
        if (broker.subs.has(t)) broker.subs.get(t).delete(deliver);
        if (real && realReady) real.unsubscribe(ns(t));
        return true;
      },
      publish(topic, payload) {
        const t = String(topic);
        const msg = String(payload);
        self._serialLog(`[MQTT] Publish "${t}" → ${msg}\n`, 'system');
        if (real) {
          try { real.publish(ns(t), msg, { qos: 0, retain: false }); } catch (e) { /* ignore */ }
        }
        if (!realReady) {
          const listeners = broker.subs.get(t);
          if (listeners) for (const l of [...listeners]) l(t, msg);
        }
        return true;
      },
      loop() { return true; }
    };
  }

  /* ── Utility ── */
  _formatSerialValue(val, fmt) {
    if (val === undefined) return '';
    if (fmt === 16) return Number(val).toString(16).toUpperCase();
    if (fmt === 2) return Number(val).toString(2);
    if (fmt === 8) return Number(val).toString(8);
    if (typeof val === 'number' && !Number.isInteger(val)) {
      const dec = fmt !== undefined ? fmt : 2;
      return val.toFixed(dec);
    }
    return String(val);
  }

  /* ── Delay Promise ── */
  _delayPromise(realMs) {
    const entry = {
      duration: Math.max(0, realMs),
      start: Date.now(),
      id: null,
      frozen: false,
      resolve: null,
      reject: null,
    };
    const startTimer = () => {
      entry.id = setTimeout(() => {
        const idx = this._delays.indexOf(entry);
        if (idx !== -1) this._delays.splice(idx, 1);
        if (entry.resolve) entry.resolve();
      }, Math.max(0, entry.duration));
    };
    return new Promise((resolve, reject) => {
      entry.resolve = resolve;
      entry.reject = reject;
      startTimer();
      this._delays.push(entry);
    });
  }

  /* ── Yield to UI ── */
  async _yieldToUI() {
    const now = Date.now();
    if (now - this._lastYieldTime < this._minYieldInterval) {
      return;
    }
    this._lastYieldTime = now;
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  /* ── Timeout Wrapper ── */
  async _withTimeout(promise, ms, message) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(message)), ms)
      )
    ]);
  }

  /* ── Compile Error ── */
  _compileError(err, js) {
    const friendly = this._friendlyError(err && err.message ? err.message : String(err), err);
    return { ok: false, error: friendly, rawError: err && err.message ? err.message : String(err), compiledJs: js || '' };
  }

  /* ── Friendly Errors ── */
  _friendlyError(msg, err) {
    if (!msg) msg = 'An unknown error occurred';
    let line = '';
    if (err && err.stack && !(err instanceof SyntaxError)) {
      const m = String(err.stack).match(/<anonymous>:(\d+)(?::\d+)?/);
      if (m) {
        const n = parseInt(m[1], 10) - 1;
        line = ` — line ${n > 0 ? n : 1}`;
      }
    }
    if (err instanceof SyntaxError) return `Syntax error: ${msg}. Check for missing semicolons or braces.`;
    if (err instanceof ReferenceError) {
      const name = msg.match(/([A-Za-z_$][\w$]*)\s+is not defined/);
      return `'${name ? name[1] : 'value'}' is not defined${line}. Did you forget to declare a variable or include a library?`;
    }
    if (err instanceof TypeError) return `Type error${line}: ${msg}. Check for null values or wrong argument types.`;
    if (err instanceof RangeError) return `Range error${line}: ${msg}. Check for values out of allowed range.`;
    if (msg.includes('Missing setup()')) return 'Missing setup() function. Every Arduino sketch needs a setup() function.';
    if (msg.includes('Missing loop()')) return 'Missing loop() function. Every Arduino sketch needs a loop() function.';
    if (msg.includes('Maximum call stack')) return 'Stack overflow: infinite recursion detected. Check your function calls.';
    if (msg.includes('is not defined')) {
      const m = msg.match(/'([^']+)' is not defined/);
      if (m) return `'${m[1]}' is not defined${line}. Did you forget to declare a variable or include a library?`;
    }
    return msg + line;
  }

  /* ── Reset State ── */
  _resetState() {
    this.simTime = 0;
    this.pinStates.clear();
    this.pinModes.clear();
    this.serialInputBuffer = [];
    this._delays = [];
    this._lcdLines = ['', ''];
    this._lcdCursor = { col: 0, row: 0 };
    this._oledTextSize = 1;
    this._oledTextColor = 1;
    this._fps = 0;
    this._fpsFrames = 0;
    this._loopCount = 0;
    this._iterSinceDelay = 0;
    this._lastYieldTime = 0;
    this._web = null;
    this._mqtt = null;
    this._fastled = null;
    this._eeprom = new Uint8Array(512);
    this._ledcChannels.clear();
    this._softSerial.clear();
    this._steppers.clear();
    this._pings.clear();
    this._neopixels.clear();
    this._rfid.clear();
    this._toneOscillators.clear();
    this._toneActive.clear();
    this._stopAllTones();
  }

  /* ── Cleanup Execution ── */
  _cleanupExecution() {
    if (this._fpsInterval) {
      clearInterval(this._fpsInterval);
      this._fpsInterval = null;
    }
    if (this._resumeResolve) {
      const r = this._resumeResolve;
      this._resumeResolve = null;
      r();
    }
    for (const d of this._delays) {
      clearTimeout(d.id);
      if (d.reject) d.reject(new Error('SIMULATION_STOPPED'));
    }
    this._delays = [];
    this._stopAllTones();
  }

  /* ── Tone ── */
  _initAudio() {
    if (!this._toneCtx) {
      try {
        this._toneCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) { /* ignore */ }
    }
  }

  _startTone(key, freq) {
    this._initAudio();
    if (!this._toneCtx) return;
    this._stopTone(key);
    try {
      const osc = this._toneCtx.createOscillator();
      const gain = this._toneCtx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.value = 0.1;
      osc.connect(gain);
      gain.connect(this._toneCtx.destination);
      osc.start();
      this._toneOscillators.set(key, { osc, gain });
      this._emitEvent('buzzer_on', { key, freq });
    } catch (e) {
      console.error('[ArduSim] Audio error:', e);
    }
  }

  _stopTone(key) {
    if (this._toneOscillators.has(key)) {
      try { this._toneOscillators.get(key).osc.stop(); } catch (e) { /* ignore */ }
      this._toneOscillators.delete(key);
    }
    this._emitEvent('buzzer_off', { key });
  }

  _stopAllTones() {
    for (const [key, value] of this._toneOscillators) {
      try { value.osc.stop(); } catch (e) { /* ignore */ }
    }
    this._toneOscillators.clear();
    this._toneActive.clear();
  }

  /* ── FPS ── */
  _tickFps() {
    const now = Date.now();
    const elapsed = now - this._fpsLast;
    if (elapsed > 0) {
      this._fps = Math.round((this._loopCount * 1000) / elapsed);
    }
    this._loopCount = 0;
    this._fpsLast = now;
    if (this._callbacks.onTick) {
      this._callbacks.onTick(this.simTime, this._fps, this._loopCount);
    }
  }

  /* ── Emitters ── */
  _serialLog(text, type = 'data') {
    if (this._callbacks.onSerial) {
      this._callbacks.onSerial(text, type);
    }
  }

  _emitPinChange(key, val) {
    this._iterSinceDelay = 0;
    if (this._callbacks.onPinChange) {
      this._callbacks.onPinChange(key, val);
    }
  }

  _emitError(msg) {
    if (this._callbacks.onError) {
      this._callbacks.onError(msg);
    }
  }

  _emitEvent(type, data) {
    if (this._callbacks.onEvent) {
      this._callbacks.onEvent(type, data);
    }
  }

  /* ── Pin Label ── */
  static pinLabel(key) {
    if (!key.startsWith('pin_')) return key;
    const n = parseInt(key.replace('pin_', ''));
    if (n === 14) return 'A0';
    if (n === 15) return 'A1';
    if (n === 16) return 'A2';
    if (n === 17) return 'A3';
    if (n === 18) return 'A4';
    if (n === 19) return 'A5';
    return `D${n}`;
  }
}

/* ═══════════════ EXPORT ═══════════════ */
window.ArduinoSim = new ArduinoSimulator();
window.EXAMPLE_SKETCHES = [];
window.loadExamplesFromFiles = async function() {
  const files = ['blink','esp32_blink','fade','button','potentiometer','servo_sweep','traffic_light','counter','rainbow_rgb','morse','temperature','ultrasonic','esp32_fade','mqtt_esp32','lcd_i2c','oled_ssd1306','esp32_server','serial_plotter','buzzer_melody','seg7_counter','relay_control','dc_motor_speed','ldr_lamp','pir_alarm','joystick_led','esp32_ntp_lcd','ic_nand_test'];
  const sketches = [];
  for (const name of files) {
    try {
      const res = await fetch(`examples/${name}.json`);
      if (res.ok) sketches.push(await res.json());
    } catch (e) {
      console.warn(`Failed to load example: ${name}`, e);
    }
  }
  window.EXAMPLE_SKETCHES = sketches;
};