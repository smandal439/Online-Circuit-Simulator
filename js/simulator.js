/* ═══════════════════════════════════════════════════════
   simulator.js — Arduino C++ Interpreter & Execution Engine
   ═══════════════════════════════════════════════════════ */

'use strict';

class ArduinoSimulator {
  constructor() {
    this.isRunning   = false;
    this.isPaused    = false;
    this.simTime     = 0; // ms
    this.speed       = 1;
    this.pinStates   = {}; // pinKey → value (0-255, or 0/1)
    this.pinModes    = {}; // pinKey → INPUT/OUTPUT/INPUT_PULLUP
    this.serialBaud  = 9600;
    this.serialInputBuffer = [];
    this._loopAbortController = null;
    this._loopPromise = null;
    this.onSerial    = null;  // callback(text, type)
    this.onPinChange = null;  // callback(pinKey, value)
    this.onError     = null;  // callback(err)
    this.onStatus    = null;  // callback(msg)
    this.onStop      = null;  // callback()
    this._toneActive = {};
    this._toneCtx    = null;
    this._toneOscillators = {};
    this._startRealTime = 0;
    this._delays     = [];
    this._customDelay = null;
  }

  /* ══════════════ TRANSPILER ══════════════ */
  transpile(code) {
    let js = code;

    // Remove comments temporarily for processing, then restore
    // Actually keep comments — they're valid JS too

    // 1. Handle #define macros (simple value replacement)
    const defines = {};
    js = js.replace(/^[ \t]*#define\s+(\w+)\s+(.*?)[ \t]*$/gm, (_, name, value) => {
      defines[name] = value.trim();
      return `/* #define ${name} ${value} */`;
    });

    // 2. Remove other preprocessor directives
    js = js.replace(/^[ \t]*#[^\n]*/gm, '');

    // 3. Apply #define substitutions (simple word replacement)
    for (const [name, value] of Object.entries(defines)) {
      js = js.replace(new RegExp(`\\b${name}\\b`, 'g'), value);
    }

    // 4. Replace function declarations (return type + name + params + brace)
    js = js.replace(
      /\b(?:void|int|float|double|long|unsigned\s+long|unsigned\s+int|byte|boolean|bool|char\s*\*?|String|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t)\s+(\w+)\s*\(([^)]*)\)\s*\{/g,
      (match, name, params) => {
        const cleanParams = params.replace(/\b(?:unsigned\s+)?(?:int|long|short|byte|float|double|boolean|bool|char\s*\*?|String|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t)\s+/g, '');
        return `async function ${name}(${cleanParams}) {`;
      }
    );

    // 5. Handle variable declarations (not already transformed)
    // int x = 5; → let x = 5;
    js = js.replace(/\b(?:unsigned\s+)?(?:int|long|short|byte|float|double|boolean|bool|String)\s+(\w+)(?=\s*[=;,\[\)])/g, 'let $1');
    // char x = 'a'; → let x = 'a';
    js = js.replace(/\bchar\s+(\w+)(?=\s*[=;,\[\)])/g, 'let $1');
    // Handle const
    js = js.replace(/\bconst\s+let\b/g, 'let');
    js = js.replace(/\bconst\s+async\b/g, 'async');

    // 6. Handle arrays: int arr[10] → let arr = new Array(10).fill(0)
    js = js.replace(/let\s+(\w+)\s*\[(\d+)\]\s*=\s*\{([^}]*)\}/g, 'let $1 = [$3]');
    js = js.replace(/let\s+(\w+)\s*\[\s*\]\s*=\s*\{([^}]*)\}/g, 'let $1 = [$2]');
    js = js.replace(/let\s+(\w+)\s*\[(\d+)\](?!\s*=)/g, 'let $1 = new Array($2).fill(0)');
    js = js.replace(/let\s+(\w+)\s*\[\s*\](?!\s*=)/g, 'let $1 = []');

    // 7. Boolean literals
    js = js.replace(/\btrue\b/g,  'true');
    js = js.replace(/\bfalse\b/g, 'false');

    // 8. Arduino constants
    js = js.replace(/\bHIGH\b/g, '1');
    js = js.replace(/\bLOW\b/g,  '0');
    js = js.replace(/\bINPUT_PULLUP\b/g, '"INPUT_PULLUP"');
    js = js.replace(/\bINPUT\b/g,  '"INPUT"');
    js = js.replace(/\bOUTPUT\b/g, '"OUTPUT"');
    js = js.replace(/\bLED_BUILTIN\b/g, '13');
    js = js.replace(/\bA0\b/g, '14');
    js = js.replace(/\bA1\b/g, '15');
    js = js.replace(/\bA2\b/g, '16');
    js = js.replace(/\bA3\b/g, '17');
    js = js.replace(/\bA4\b/g, '18');
    js = js.replace(/\bA5\b/g, '19');
    js = js.replace(/\bDEC\b/g, '10');
    js = js.replace(/\bHEX\b/g, '16');
    js = js.replace(/\bOCT\b/g,  '8');
    js = js.replace(/\bBIN\b/g,  '2');

    // 9. Map Arduino API calls
    const API = [
      ['delay',            '_a.delay'],
      ['delayMicroseconds','_a.delayMicroseconds'],
      ['pinMode',          '_a.pinMode'],
      ['digitalWrite',     '_a.digitalWrite'],
      ['digitalRead',      '_a.digitalRead'],
      ['analogWrite',      '_a.analogWrite'],
      ['analogRead',       '_a.analogRead'],
      ['millis',           '_a.millis'],
      ['micros',           '_a.micros'],
      ['tone',             '_a.tone'],
      ['noTone',           '_a.noTone'],
      ['pulseIn',          '_a.pulseIn'],
      ['attachInterrupt',  '_a.attachInterrupt'],
      ['detachInterrupt',  '_a.detachInterrupt'],
      ['randomSeed',       '_a.randomSeed'],
      ['random',           '_a.random'],
      ['map',              '_a.map'],
      ['constrain',        '_a.constrain'],
      ['abs',              'Math.abs'],
      ['min',              '_a.min'],
      ['max',              '_a.max'],
      ['sqrt',             'Math.sqrt'],
      ['pow',              'Math.pow'],
      ['sin',              'Math.sin'],
      ['cos',              'Math.cos'],
      ['tan',              'Math.tan'],
      ['floor',            'Math.floor'],
      ['ceil',             'Math.ceil'],
      ['round',            'Math.round'],
    ];

    for (const [orig, mapped] of API) {
      js = js.replace(new RegExp(`\\b${orig}\\b(?=\\s*\\()`, 'g'), mapped);
    }

    // Serial.*
    js = js.replace(/\bSerial\.begin\s*\(/g,    '_a.serialBegin(');
    js = js.replace(/\bSerial\.print\s*\(/g,    '_a.serialPrint(');
    js = js.replace(/\bSerial\.println\s*\(/g,  '_a.serialPrintln(');
    js = js.replace(/\bSerial\.read\s*\(/g,     '_a.serialRead(');
    js = js.replace(/\bSerial\.available\s*\(/g,'_a.serialAvailable(');
    js = js.replace(/\bSerial\.write\s*\(/g,    '_a.serialWrite(');
    js = js.replace(/\bSerial\.flush\s*\(/g,    '_a.serialFlush(');

    // Servo library
    js = js.replace(/\b(\w+)\.attach\s*\(/g,   '_a.servoAttach($1, ');
    js = js.replace(/\b(\w+)\.write\s*\(/g,    '_a.servoWrite($1, ');
    js = js.replace(/\b(\w+)\.writeMicroseconds\s*\(/g, '_a.servoWriteMs($1, ');
    js = js.replace(/\b(\w+)\.read\s*\(/g,     '_a.servoRead($1');

    // LiquidCrystal
    js = js.replace(/\b(\w+)\.begin\s*\(/g,    '_a.lcdBegin($1, ');
    js = js.replace(/\b(\w+)\.setCursor\s*\(/g,'_a.lcdSetCursor($1, ');
    js = js.replace(/\b(\w+)\.print\s*\(/g,    '_a.lcdPrint($1, ');
    js = js.replace(/\b(\w+)\.clear\s*\(/g,    '_a.lcdClear($1');
    js = js.replace(/\b(\w+)\.home\s*\(/g,     '_a.lcdHome($1');

    // Make delay async
    js = js.replace(/_a\.delay\s*\(/g, 'await _a.delay(');
    js = js.replace(/_a\.delayMicroseconds\s*\(/g, 'await _a.delayMicroseconds(');
    js = js.replace(/_a\.pulseIn\s*\(/g, 'await _a.pulseIn(');

    // Remove C++ type casts like (int), (float), etc.
    js = js.replace(/\((?:int|float|double|long|byte|char|uint8_t|uint16_t)\)\s*/g, '');

    // String() → String()  (already fine for JS)
    // String to string comparison: == for strings works in JS, so fine
    // .charAt(), .length, .indexOf() — all work in JS

    // Fix: handle C++ string char arrays declared as: char str[20];
    // Already handled above

    return js;
  }

  /* ══════════════ EXECUTION CONTEXT ══════════════ */
  buildContext() {
    const self = this;

    return {
      _a: {
        /* Pin control */
        pinMode(pin, mode) {
          const key = `pin_${pin}`;
          self.pinModes[key] = mode;
          self._emitPinChange(key, self.pinStates[key] || 0);
        },
        digitalWrite(pin, val) {
          const key = `pin_${pin}`;
          const v = val ? 1 : 0;
          self.pinStates[key] = v;
          self._emitPinChange(key, v);
        },
        digitalRead(pin) {
          const key = `pin_${pin}`;
          // Check if button connected and pressed
          const state = self.pinStates[key];
          if (self.pinModes[key] === 'INPUT_PULLUP') {
            return state !== undefined ? (state ? 0 : 1) : 1;
          }
          return state || 0;
        },
        analogWrite(pin, val) {
          const key = `pin_${pin}`;
          const v = Math.max(0, Math.min(255, Math.round(val)));
          self.pinStates[key] = v;
          self._emitPinChange(key, v);
        },
        analogRead(pin) {
          const key = `pin_${pin}`;
          return self.pinStates[key] !== undefined ? self.pinStates[key] : 0;
        },

        /* Timing */
        async delay(ms) {
          const realMs = ms / self.speed;
          self.simTime += ms;
          await new Promise((resolve, reject) => {
            const id = setTimeout(() => {
              resolve();
            }, realMs);
            self._delays.push({ id, resolve, reject });
          });
        },
        async delayMicroseconds(us) {
          const ms = us / 1000;
          const realMs = ms / self.speed;
          self.simTime += ms;
          await new Promise((resolve, reject) => {
            const id = setTimeout(resolve, Math.max(0, realMs));
            self._delays.push({ id, resolve, reject });
          });
        },
        millis() { return self.simTime; },
        micros() { return self.simTime * 1000; },

        /* Serial */
        serialBegin(baud) {
          self.serialBaud = baud;
          self._serialLog(`[Serial] Opened at ${baud} baud`, 'system');
        },
        serialPrint(val, fmt) {
          let str;
          if (fmt === 16) str = parseInt(val).toString(16).toUpperCase();
          else if (fmt === 2)  str = parseInt(val).toString(2);
          else if (fmt === 8)  str = parseInt(val).toString(8);
          else if (typeof val === 'number' && !Number.isInteger(val)) {
            const dec = fmt !== undefined ? fmt : 2;
            str = val.toFixed(dec);
          } else str = String(val);
          self._serialLog(str, 'data');
        },
        serialPrintln(val, fmt) {
          let str;
          if (val === undefined) str = '';
          else if (fmt === 16) str = parseInt(val).toString(16).toUpperCase();
          else if (fmt === 2)  str = parseInt(val).toString(2);
          else if (fmt === 8)  str = parseInt(val).toString(8);
          else if (typeof val === 'number' && !Number.isInteger(val)) {
            const dec = fmt !== undefined ? fmt : 2;
            str = val.toFixed(dec);
          } else str = String(val);
          self._serialLog(str + '\n', 'data');
        },
        serialRead() {
          return self.serialInputBuffer.length > 0
            ? self.serialInputBuffer.shift().charCodeAt(0)
            : -1;
        },
        serialAvailable() { return self.serialInputBuffer.length; },
        serialWrite(val)  { self._serialLog(String.fromCharCode(val), 'data'); },
        serialFlush()     {},

        /* Math helpers */
        map(val, inMin, inMax, outMin, outMax) {
          return (val - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
        },
        constrain(val, lo, hi) { return Math.max(lo, Math.min(hi, val)); },
        random(minOrMax, max) {
          if (max === undefined) return Math.floor(Math.random() * minOrMax);
          return Math.floor(Math.random() * (max - minOrMax)) + minOrMax;
        },
        randomSeed(seed) { /* Can't set Math.random seed in JS easily */ },
        min(a, b) { return Math.min(a, b); },
        max(a, b) { return Math.max(a, b); },

        /* Tone */
        tone(pin, freq, duration) {
          const key = `pin_${pin}`;
          self._startTone(key, freq);
          if (duration) setTimeout(() => self._stopTone(key), duration / self.speed);
        },
        noTone(pin) { self._stopTone(`pin_${pin}`); },

        /* Pulse */
        async pulseIn(pin, val, timeout) {
          await new Promise(resolve => setTimeout(resolve, 10));
          const key = `pin_${pin}`;
          return self.pinStates[key] ? 1000 : 0;
        },

        /* Servo */
        servoAttach(varName, pin) { /* tracked by canvas */ },
        servoWrite(varName, angle) {
          self._emitEvent('servo', { angle: Math.max(0, Math.min(180, angle)) });
        },
        servoWriteMs(varName, us) { /* advanced */ },
        servoRead(varName) { return 90; },

        /* LCD */
        lcdBegin(varName, cols, rows) {
          self._emitEvent('lcd_power', { on: true });
        },
        lcdSetCursor(varName, col, row) {
          self._lcdCursor = { col, row };
        },
        lcdPrint(varName, val) {
          self._emitEvent('lcd_print', { text: String(val), cursor: self._lcdCursor || { col:0, row:0 } });
        },
        lcdClear(varName) {
          self._emitEvent('lcd_clear', {});
        },
        lcdHome(varName) { self._lcdCursor = { col:0, row:0 }; },

        /* Interrupts */
        attachInterrupt(num, fn, mode) {},
        detachInterrupt(num) {},
      },

      /* Global constants */
      HIGH: 1, LOW: 0,
      INPUT: 'INPUT', OUTPUT: 'OUTPUT', INPUT_PULLUP: 'INPUT_PULLUP',
      RISING: 'RISING', FALLING: 'FALLING', CHANGE: 'CHANGE',
      A0: 14, A1: 15, A2: 16, A3: 17, A4: 18, A5: 19,
      LED_BUILTIN: 13,
      PI: Math.PI, TWO_PI: Math.PI * 2, HALF_PI: Math.PI / 2,
      DEG_TO_RAD: Math.PI / 180, RAD_TO_DEG: 180 / Math.PI,

      /* Servo/LCD class stubs */
      Servo: function() { return {}; },
      LiquidCrystal: function() { return {}; },
      LiquidCrystal_I2C: function() { return {}; },
    };
  }

  /* ══════════════ COMPILE & RUN ══════════════ */
  async compile(code) {
    try {
      const js = this.transpile(code);
      const ctx = this.buildContext();
      const rawKeys = Object.keys(ctx);
      const rawVals = Object.values(ctx);
      const filtered = [];
      const reserved = new Set([
        'await','break','case','catch','class','const','continue','debugger','default','delete','do','else',
        'enum','export','extends','false','finally','for','function','if','import','in','instanceof','new',
        'null','return','super','switch','this','throw','true','try','typeof','var','void','while','with','yield'
      ]);

      for (let i = 0; i < rawKeys.length; i += 1) {
        const key = rawKeys[i];
        if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) continue;
        if (reserved.has(key)) continue;
        filtered.push({ key, val: rawVals[i] });
      }

      const keys = filtered.map(entry => entry.key);
      const vals = filtered.map(entry => entry.val);

      // Try to build the function — will throw on syntax errors
      const fn = new Function(...keys, js + '\n\nif(typeof setup === "undefined") throw new Error("setup() function not found"); if(typeof loop === "undefined") throw new Error("loop() function not found"); return { setup, loop };');
      this._compiledFn = fn;
      this._compiledCtx = { keys, vals, fn };
      this._compiledJs = js;
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  async run(code) {
    if (this.isRunning) this.stop();
    this.simTime = 0;
    this.pinStates = {};
    this.pinModes  = {};
    this._delays   = [];
    this._lcdLines = ['', ''];
    this._lcdCursor = { col: 0, row: 0 };
    this._startRealTime = Date.now();

    // Compile first
    const result = await this.compile(code);
    if (!result.ok) {
      this._emitError(result.error);
      return false;
    }

    this.isRunning = true;
    this.isPaused  = false;

    const js = this._compiledJs;
    const { keys, vals, fn } = this._compiledCtx;

    this._serialLog('[ArduSim] Simulation started\n', 'system');

    try {
      const { setup, loop } = fn(...vals);

      // Run setup once
      await setup();

      // Run loop repeatedly
      while (this.isRunning) {
        if (this.isPaused) {
          await new Promise(resolve => { this._resumeResolve = resolve; });
        }
        await loop();
        // Yield to UI thread every iteration
        await new Promise(r => setTimeout(r, 0));
      }
    } catch (err) {
      if (err.message !== 'SIMULATION_STOPPED') {
        this._emitError(err.message || String(err));
        this._serialLog(`[Error] ${err.message}\n`, 'error');
      }
    }

    this.isRunning = false;
    this._serialLog('[ArduSim] Simulation stopped\n', 'system');
    if (this.onStop) this.onStop();
    return true;
  }

  stop() {
    this.isRunning = false;
    this.isPaused  = false;
    // Cancel all pending delays
    for (const d of this._delays) {
      clearTimeout(d.id);
      if (d.reject) d.reject(new Error('SIMULATION_STOPPED'));
    }
    this._delays = [];
    if (this._resumeResolve) this._resumeResolve();
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
    if (this._resumeResolve) {
      this._resumeResolve();
      this._resumeResolve = null;
    }
  }

  setSpeed(s) {
    this.speed = parseFloat(s) || 1;
  }

  sendSerialInput(text) {
    for (const ch of text) {
      this.serialInputBuffer.push(ch);
    }
  }

  setPinState(pinKey, value) {
    this.pinStates[pinKey] = value;
    this._emitPinChange(pinKey, value);
  }

  /* ══════════════ TONE ══════════════ */
  _initAudio() {
    if (!this._toneCtx) {
      try {
        this._toneCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {}
    }
  }

  _startTone(key, freq) {
    this._initAudio();
    if (!this._toneCtx) return;
    this._stopTone(key);
    const osc = this._toneCtx.createOscillator();
    const gain = this._toneCtx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.value = 0.1;
    osc.connect(gain);
    gain.connect(this._toneCtx.destination);
    osc.start();
    this._toneOscillators[key] = { osc, gain };
    this._emitEvent('buzzer_on', { key, freq });
  }

  _stopTone(key) {
    if (this._toneOscillators[key]) {
      try { this._toneOscillators[key].osc.stop(); } catch(e) {}
      delete this._toneOscillators[key];
    }
    this._emitEvent('buzzer_off', { key });
  }

  /* ══════════════ INTERNALS ══════════════ */
  _serialLog(text, type = 'data') {
    if (this.onSerial) this.onSerial(text, type);
  }

  _emitPinChange(key, val) {
    if (this.onPinChange) this.onPinChange(key, val);
  }

  _emitError(msg) {
    if (this.onError) this.onError(msg);
  }

  _emitEvent(type, data) {
    if (this.onEvent) this.onEvent(type, data);
  }

  /* Get human-readable pin name */
  static pinLabel(key) {
    if (!key.startsWith('pin_')) return key;
    const n = parseInt(key.replace('pin_',''));
    if (n === 14) return 'A0';
    if (n === 15) return 'A1';
    if (n === 16) return 'A2';
    if (n === 17) return 'A3';
    if (n === 18) return 'A4';
    if (n === 19) return 'A5';
    return `D${n}`;
  }
}

/* ═══════════════ EXAMPLE SKETCHES ═══════════════ */
const EXAMPLE_SKETCHES = [
  {
    id: 'blink',
    name: 'Blink LED',
    icon: '💡',
    desc: 'The classic Hello World of Arduino — blink an LED on pin 13',
    tags: ['beginner', 'LED', 'digital'],
    circuit: 'led_on_13',
    code: `/*
 * Blink — Classic Arduino example
 * Blinks the built-in LED on pin 13
 */

int ledPin = 13;

void setup() {
  pinMode(ledPin, OUTPUT);
  Serial.begin(9600);
  Serial.println("Blink started!");
}

void loop() {
  digitalWrite(ledPin, HIGH);
  Serial.println("LED ON");
  delay(1000);

  digitalWrite(ledPin, LOW);
  Serial.println("LED OFF");
  delay(1000);
}`
  },
  {
    id: 'fade',
    name: 'Fade LED (PWM)',
    icon: '🌅',
    desc: 'Fade an LED in and out using PWM analogWrite on pin 9',
    tags: ['beginner', 'PWM', 'LED'],
    code: `/*
 * Fade — LED brightness fade using PWM
 */

int ledPin = 9;
int brightness = 0;
int fadeAmount = 5;

void setup() {
  pinMode(ledPin, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  analogWrite(ledPin, brightness);
  brightness += fadeAmount;

  if (brightness <= 0 || brightness >= 255) {
    fadeAmount = -fadeAmount;
    Serial.print("Brightness: ");
    Serial.println(brightness);
  }

  delay(30);
}`
  },
  {
    id: 'button',
    name: 'Button Input',
    icon: '🔘',
    desc: 'Read a push button and control an LED',
    tags: ['beginner', 'input', 'button'],
    code: `/*
 * Button — Read push button, control LED
 */

int buttonPin = 2;
int ledPin = 13;
int buttonState = 0;

void setup() {
  pinMode(buttonPin, INPUT_PULLUP);
  pinMode(ledPin, OUTPUT);
  Serial.begin(9600);
  Serial.println("Button test ready.");
}

void loop() {
  buttonState = digitalRead(buttonPin);

  if (buttonState == LOW) {   // LOW when pressed (pullup)
    digitalWrite(ledPin, HIGH);
    Serial.println("Button PRESSED - LED ON");
  } else {
    digitalWrite(ledPin, LOW);
  }

  delay(50);
}`
  },
  {
    id: 'potentiometer',
    name: 'Potentiometer Read',
    icon: '🎚️',
    desc: 'Read a potentiometer on A0 and display the value',
    tags: ['beginner', 'analog', 'sensor'],
    code: `/*
 * Potentiometer — Analog input reading
 */

int potPin = A0;
int ledPin = 9;
int potValue = 0;

void setup() {
  Serial.begin(9600);
  Serial.println("Potentiometer reader ready.");
}

void loop() {
  potValue = analogRead(potPin);

  // Map to PWM range
  int brightness = map(potValue, 0, 1023, 0, 255);
  analogWrite(ledPin, brightness);

  Serial.print("Pot: ");
  Serial.print(potValue);
  Serial.print(" | Brightness: ");
  Serial.println(brightness);

  delay(100);
}`
  },
  {
    id: 'servo_sweep',
    name: 'Servo Sweep',
    icon: '⚙️',
    desc: 'Sweep a servo motor from 0° to 180° and back',
    tags: ['intermediate', 'servo', 'motor'],
    code: `/*
 * Servo Sweep — Sweep servo 0 to 180 degrees
 */

#include <Servo.h>

Servo myServo;
int angle = 0;
int step = 2;

void setup() {
  myServo.attach(9);
  Serial.begin(9600);
  Serial.println("Servo sweep started");
}

void loop() {
  myServo.write(angle);
  Serial.print("Angle: ");
  Serial.println(angle);

  angle += step;
  if (angle >= 180 || angle <= 0) {
    step = -step;
    delay(200);
  }
  delay(15);
}`
  },
  {
    id: 'traffic_light',
    name: 'Traffic Light',
    icon: '🚦',
    desc: 'Simulate a traffic light with 3 LEDs',
    tags: ['beginner', 'LED', 'multiple pins'],
    code: `/*
 * Traffic Light Simulator
 * Red=12, Yellow=11, Green=10
 */

int redPin    = 12;
int yellowPin = 11;
int greenPin  = 10;

void allOff() {
  digitalWrite(redPin,    LOW);
  digitalWrite(yellowPin, LOW);
  digitalWrite(greenPin,  LOW);
}

void setup() {
  pinMode(redPin,    OUTPUT);
  pinMode(yellowPin, OUTPUT);
  pinMode(greenPin,  OUTPUT);
  Serial.begin(9600);
  Serial.println("Traffic light started");
}

void loop() {
  // Red
  allOff();
  digitalWrite(redPin, HIGH);
  Serial.println("RED - STOP");
  delay(3000);

  // Red + Yellow (prepare to go)
  digitalWrite(yellowPin, HIGH);
  delay(1000);

  // Green
  allOff();
  digitalWrite(greenPin, HIGH);
  Serial.println("GREEN - GO");
  delay(3000);

  // Yellow
  allOff();
  digitalWrite(yellowPin, HIGH);
  Serial.println("YELLOW - SLOW DOWN");
  delay(1000);
}`
  },
  {
    id: 'counter',
    name: 'Counter with Button',
    icon: '🔢',
    desc: 'Count button presses and show on serial monitor',
    tags: ['intermediate', 'counter', 'button'],
    code: `/*
 * Button Counter — Count presses
 */

int buttonPin = 2;
int ledPin = 13;
int count = 0;
int lastState = HIGH;
int currentState;

void setup() {
  pinMode(buttonPin, INPUT_PULLUP);
  pinMode(ledPin, OUTPUT);
  Serial.begin(9600);
  Serial.println("Button counter started. Press button!");
}

void loop() {
  currentState = digitalRead(buttonPin);

  // Detect falling edge (button pressed)
  if (lastState == HIGH && currentState == LOW) {
    count++;
    digitalWrite(ledPin, HIGH);

    Serial.print("Count: ");
    Serial.println(count);

    delay(50); // debounce
    digitalWrite(ledPin, LOW);
  }

  lastState = currentState;
  delay(10);
}`
  },
  {
    id: 'rainbow_rgb',
    name: 'RGB Rainbow',
    icon: '🌈',
    desc: 'Cycle through colors on an RGB LED',
    tags: ['intermediate', 'RGB', 'PWM', 'LED'],
    code: `/*
 * RGB LED Rainbow — Cycle through colors
 * R=9, G=10, B=11
 */

int redPin   = 9;
int greenPin = 10;
int bluePin  = 11;

void setColor(int r, int g, int b) {
  analogWrite(redPin,   r);
  analogWrite(greenPin, g);
  analogWrite(bluePin,  b);
}

void setup() {
  pinMode(redPin,   OUTPUT);
  pinMode(greenPin, OUTPUT);
  pinMode(bluePin,  OUTPUT);
  Serial.begin(9600);
  Serial.println("RGB Rainbow started!");
}

void loop() {
  // Red → Yellow
  for (int i = 0; i <= 255; i += 5) {
    setColor(255, i, 0);
    delay(20);
  }
  // Yellow → Green
  for (int i = 255; i >= 0; i -= 5) {
    setColor(i, 255, 0);
    delay(20);
  }
  // Green → Cyan
  for (int i = 0; i <= 255; i += 5) {
    setColor(0, 255, i);
    delay(20);
  }
  // Cyan → Blue
  for (int i = 255; i >= 0; i -= 5) {
    setColor(0, i, 255);
    delay(20);
  }
  // Blue → Magenta
  for (int i = 0; i <= 255; i += 5) {
    setColor(i, 0, 255);
    delay(20);
  }
  // Magenta → Red
  for (int i = 255; i >= 0; i -= 5) {
    setColor(255, 0, i);
    delay(20);
  }
}`
  },
  {
    id: 'morse',
    name: 'Morse Code',
    icon: '📡',
    desc: 'Blink LED in Morse code pattern for "SOS"',
    tags: ['intermediate', 'LED', 'morse'],
    code: `/*
 * Morse Code — SOS via LED
 * LED on pin 13
 */

int ledPin = 13;
int dotLen  = 200;
int dashLen = 600;
int letterGap = 600;
int wordGap = 1400;

void dot() {
  digitalWrite(ledPin, HIGH); delay(dotLen);
  digitalWrite(ledPin, LOW);  delay(dotLen);
}

void dash() {
  digitalWrite(ledPin, HIGH); delay(dashLen);
  digitalWrite(ledPin, LOW);  delay(dotLen);
}

void setup() {
  pinMode(ledPin, OUTPUT);
  Serial.begin(9600);
  Serial.println("Morse SOS started");
}

void loop() {
  Serial.println("SOS ...");
  // S = . . .
  dot(); dot(); dot();
  delay(letterGap);
  // O = — — —
  dash(); dash(); dash();
  delay(letterGap);
  // S = . . .
  dot(); dot(); dot();
  delay(wordGap);
}`
  },
  {
    id: 'temperature',
    name: 'Temperature Sensor',
    icon: '🌡️',
    desc: 'Read DHT11 temperature and humidity (simulated)',
    tags: ['intermediate', 'sensor', 'DHT11'],
    code: `/*
 * DHT11 Temperature & Humidity (simulated)
 */

int dataPin = 2;
float temperature = 0;
float humidity = 0;
int count = 0;

float readTemperature() {
  // Simulate varying temperature 20-30°C
  return 25.0 + 5.0 * sin(count * 0.1);
}

float readHumidity() {
  // Simulate varying humidity 40-70%
  return 55.0 + 15.0 * cos(count * 0.1);
}

void setup() {
  Serial.begin(9600);
  Serial.println("DHT11 Sensor started");
  Serial.println("Temp(C)\tHumidity(%)");
}

void loop() {
  temperature = readTemperature();
  humidity = readHumidity();
  count++;

  Serial.print(temperature, 1);
  Serial.print("\t");
  Serial.println(humidity, 1);

  delay(2000);
}`
  },
];

/* Export */
window.ArduinoSim = new ArduinoSimulator();
window.EXAMPLE_SKETCHES = EXAMPLE_SKETCHES;
