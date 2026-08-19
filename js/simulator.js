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
    this.onTick      = null;  // callback(simTime, fps, loopCount)
    this._toneActive = {};
    this._toneCtx    = null;
    this._toneOscillators = {};
    this._startRealTime = 0;
    this._delays     = [];
    this._customDelay = null;
    // FPS / loop tracking
    this._fps        = 0;
    this._fpsFrames  = 0;
    this._fpsLast    = 0;
    this._loopCount  = 0;
    this._fpsInterval = null;
    // Infinite-loop guard: max iterations per real-second without a delay
    this._iterSinceDelay = 0;
    this._MAX_TIGHT_ITERS = 50000;
    // EEPROM simulation (512 bytes)
    this._eeprom = new Uint8Array(512);
  }

  /* ══════════════ TRANSPILER ══════════════ */
  transpile(code) {
    if (typeof code !== 'string') code = '';
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
    //    Skip function-like macros and escape any `$` so the replacement is literal.
    for (const [name, value] of Object.entries(defines)) {
      if (!/^[A-Za-z_]\w*$/.test(name)) continue;
      if (/\(/.test(value)) continue; // function-like macro — leave untouched
      js = js.replace(new RegExp(`\\b${name}\\b`, 'g'), () => value);
    }

    // 4. Replace function declarations (return type + name + params + brace)
    const userFnNames = new Set();
    js = js.replace(
      /\b(?:void|int|float|double|long|unsigned\s+long|unsigned\s+int|byte|boolean|bool|char\s*\*?|String|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t)\s+(\w+)\s*\(([^)]*)\)\s*\{/g,
      (match, name, params) => {
        userFnNames.add(name);
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

    // Object-style library declarations:
    // Servo myServo;  →  let myServo = new Servo();
    // LiquidCrystal lcd(12, 11, 5, 4, 3, 2);  →  let lcd = new LiquidCrystal(12, 11, 5, 4, 3, 2);
    js = js.replace(/\b(Servo|LiquidCrystal|LiquidCrystal_I2C)\s+(\w+)\s*(?:\(([^)]*)\))?\s*;/g, 'let $2 = new $1($3)');

    // 6. Handle arrays: int arr[10] → let arr = new Array(10).fill(0)
    js = js.replace(/let\s+(\w+)\s*\[(\d+)\]\s*=\s*\{([^}]*)\}/g, 'let $1 = [$3]');
    js = js.replace(/let\s+(\w+)\s*\[\s*\]\s*=\s*\{([^}]*)\}/g, 'let $1 = [$2]');
    js = js.replace(/let\s+(\w+)\s*\[(\d+)\](?!\s*=)/g, 'let $1 = new Array($2).fill(0)');
    js = js.replace(/let\s+(\w+)\s*\[\s*\](?!\s*=)/g, 'let $1 = []');
    // C-style char arrays with string literals: char str[20] = "hi"; / char msg[] = "hi";
    js = js.replace(/let\s+(\w+)\s*\[\s*\d*\s*\]\s*=\s*("[^"]*"|'[^']*')/g, 'let $1 = $2');

    // 7. Boolean literals
    js = js.replace(/\btrue\b/g,  'true');
    js = js.replace(/\bfalse\b/g, 'false');

    // Strip leftover C storage/qualifier keywords that are invalid JS
    js = js.replace(/\b(?:static|volatile|extern|register|const)\s+let\b/g, 'let');
    js = js.replace(/\b(?:static|volatile|extern|register|const)\s+async\b/g, 'async');

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
    js = js.replace(/\bMSBFIRST\b/g, '1');
    js = js.replace(/\bLSBFIRST\b/g, '0');

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
      ['shiftIn',          '_a.shiftIn'],
      ['shiftOut',         '_a.shiftOut'],
      ['bitRead',          '_a.bitRead'],
      ['bitWrite',         '_a.bitWrite'],
      ['bitSet',           '_a.bitSet'],
      ['bitClear',         '_a.bitClear'],
      ['bit',              '_a.bit'],
      ['lowByte',          '_a.lowByte'],
      ['highByte',         '_a.highByte'],
      ['sensorValue',      '_a.sensorValue'],
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
    js = js.replace(/\bSerial\.parseInt\s*\(/g,  '_a.serialParseInt(');
    js = js.replace(/\bSerial\.parseFloat\s*\(/g,'_a.serialParseFloat(');
    js = js.replace(/\bSerial\.peek\s*\(/g,      '_a.serialPeek(');
    js = js.replace(/\bSerial\.readString\s*\(/g,'_a.serialReadString(');

    // Wire (I2C) — stub
    js = js.replace(/\bWire\.begin\s*\(/g,         '_a.wireBegin(');
    js = js.replace(/\bWire\.requestFrom\s*\(/g,   '_a.wireRequestFrom(');
    js = js.replace(/\bWire\.beginTransmission\s*\(/g,'_a.wireBeginTransmission(');
    js = js.replace(/\bWire\.endTransmission\s*\(/g,  '_a.wireEndTransmission(');
    js = js.replace(/\bWire\.write\s*\(/g,         '_a.wireWrite(');
    js = js.replace(/\bWire\.read\s*\(/g,          '_a.wireRead(');
    js = js.replace(/\bWire\.available\s*\(/g,     '_a.wireAvailable(');

    // SPI — stub
    js = js.replace(/\bSPI\.begin\s*\(/g,          '_a.spiBegin(');
    js = js.replace(/\bSPI\.transfer\s*\(/g,       '_a.spiTransfer(');
    js = js.replace(/\bSPI\.end\s*\(/g,            '_a.spiEnd(');

    // EEPROM
    js = js.replace(/\bEEPROM\.read\s*\(/g,        '_a.eepromRead(');
    js = js.replace(/\bEEPROM\.write\s*\(/g,       '_a.eepromWrite(');
    js = js.replace(/\bEEPROM\.update\s*\(/g,      '_a.eepromUpdate(');
    js = js.replace(/\bEEPROM\.length\b/g,         '512');

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

    // Auto-await calls to user-defined functions (they were transpiled to `async`,
    // so an unawaited call would assign a Promise instead of the returned value).
    for (const name of userFnNames) {
      js = js.replace(
        new RegExp(`(?<!function\\s)(?<!await\\s)\\b${name}\\s*\\(`, 'g'),
        `await ${name}(`
      );
    }

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
          const v = Math.max(0, Math.min(255, Math.round(Number(val) || 0)));
          self.pinStates[key] = v;
          self._emitPinChange(key, v);
        },
        analogRead(pin) {
          const key = `pin_${pin}`;
          const v = self.pinStates[key];
          return v !== undefined && v !== null && !Number.isNaN(v) ? v : 0;
        },

        /* Timing */
        async delay(ms) {
          ms = Number(ms);
          if (!Number.isFinite(ms) || ms < 0) ms = 0;
          const realMs = ms / self.speed;
          self.simTime += ms;
          self._iterSinceDelay = 0;
          await new Promise((resolve, reject) => {
            const id = setTimeout(resolve, realMs);
            self._delays.push({ id, resolve, reject });
          });
        },
        async delayMicroseconds(us) {
          us = Number(us);
          if (!Number.isFinite(us) || us < 0) us = 0;
          const ms = us / 1000;
          const realMs = ms / self.speed;
          self.simTime += ms;
          self._iterSinceDelay = 0;
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
          if (inMax === inMin) return outMin;
          return (val - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
        },
        constrain(val, lo, hi) { return Math.max(lo, Math.min(hi, val)); },
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
        randomSeed(seed) { /* Can't set Math.random seed in JS easily */ },
        min(a, b) { return Math.min(a, b); },
        max(a, b) { return Math.max(a, b); },

        /* Bit operations */
        bitRead(val, bit)  { return (val >> bit) & 1; },
        bitWrite(val, bit, bv) { return bv ? val | (1 << bit) : val & ~(1 << bit); },
        bitSet(val, bit)   { return val | (1 << bit); },
        bitClear(val, bit) { return val & ~(1 << bit); },
        bit(b)             { return 1 << b; },
        lowByte(val)       { return val & 0xFF; },
        highByte(val)      { return (val >> 8) & 0xFF; },

        /* Shift in/out */
        shiftIn(dataPin, clockPin, bitOrder) { return 0; }, // stub
        shiftOut(dataPin, clockPin, bitOrder, val) {}, // stub

        /* Interactive sensor widgets (sliders on the canvas).
           Reads a value from a placed sensor component by instance id or type.
           Returns -999 if no matching component/field is found.
           Example: sensorValue('dht11', 'temperature') or sensorValue('pot1', 'value') */
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

        /* Wire (I2C) stubs */
        wireBegin()                 { self._serialLog('[Wire] I2C begin\n', 'system'); },
        wireRequestFrom(addr, qty)  { return qty; },
        wireBeginTransmission(addr) {},
        wireEndTransmission()       { return 0; },
        wireWrite(val)              { return 1; },
        wireRead()                  { return 0; },
        wireAvailable()             { return 0; },

        /* SPI stubs */
        spiBegin()                  { self._serialLog('[SPI] begin\n', 'system'); },
        spiTransfer(val)            { return 0; },
        spiEnd()                    {},

        /* EEPROM */
        eepromRead(addr)            { return self._eeprom[addr & 511] || 0; },
        eepromWrite(addr, val)      { self._eeprom[addr & 511] = val & 0xFF; },
        eepromUpdate(addr, val)     { self._eeprom[addr & 511] = val & 0xFF; },

        /* Serial extras */
        serialParseInt()   { return 0; },
        serialParseFloat() { return 0.0; },
        serialPeek()       { return self.serialInputBuffer.length > 0 ? self.serialInputBuffer[0].charCodeAt(0) : -1; },
        serialReadString() { const s = self.serialInputBuffer.join(''); self.serialInputBuffer = []; return s; },

        /* Tone */
        tone(pin, freq, duration) {
          const key = `pin_${pin}`;
          freq = Number(freq);
          if (!Number.isFinite(freq) || freq <= 0) freq = 440;
          self._startTone(key, freq);
          if (duration) setTimeout(() => self._stopTone(key), (Number(duration) || 0) / self.speed);
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
      MSBFIRST: 1, LSBFIRST: 0,
      BYTE: 0, WORD: 1,

      /* Servo/LCD class stubs */
      Servo: function() { return {}; },
      LiquidCrystal: function() { return {}; },
      LiquidCrystal_I2C: function() { return {}; },
      /* Library stubs (instances) */
      Wire: { begin(){}, requestFrom(){return 0;}, beginTransmission(){}, endTransmission(){return 0;}, write(){return 1;}, read(){return 0;}, available(){return 0;} },
      SPI:  { begin(){}, transfer(){return 0;}, end(){}, setClockDivider(){}, setBitOrder(){}, setDataMode(){} },
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

      // Wrap the sketch in a block so user `let`/`const` names may shadow the
      // injected context params (e.g. a sketch declaring its own HIGH/A0).
      // The `return` lives inside the same block, so setup/loop stay in scope.
      const body = `{\n${js}\n\nif(typeof setup === "undefined") throw new Error("Missing setup() function. Every Arduino sketch needs a setup() function."); if(typeof loop === "undefined") throw new Error("Missing loop() function. Every Arduino sketch needs a loop() function."); return { setup, loop };\n}`;

      // Try to build the function — will throw on syntax errors
      const fn = new Function(...keys, body);
      this._compiledFn = fn;
      this._compiledCtx = { keys, vals, fn };
      this._compiledJs = js;
      return { ok: true, compiledJs: js };
    } catch (err) {
      const friendly = this._friendlyError(err && err.message ? err.message : String(err), err);
      return { ok: false, error: friendly, rawError: err && err.message ? err.message : String(err) };
    }
  }

  async run(code) {
    if (this.isRunning) this.stop();
    if (typeof code !== 'string') code = '';
    this.simTime  = 0;
    this.pinStates = {};
    this.pinModes  = {};
    this._delays   = [];
    this._lcdLines = ['', ''];
    this._lcdCursor = { col: 0, row: 0 };
    this._startRealTime = Date.now();
    this._fpsFrames = 0;
    this._fpsLast   = Date.now();
    this._fps       = 0;
    this._loopCount = 0;
    this._iterSinceDelay = 0;

    // Compile first
    const result = await this.compile(code);
    if (!result.ok) {
      this._emitError(result.error);
      return false;
    }

    this.isRunning = true;
    this.isPaused  = false;

    const { keys, vals, fn } = this._compiledCtx;

    this._serialLog('[ArduSim] Simulation started\n', 'system');

    // Start FPS ticker
    this._fpsInterval = setInterval(() => this._tickFps(), 500);

    let hadError = false;

    try {
      const { setup, loop } = fn(...vals);

      // Run setup once
      await setup();

      // Run loop repeatedly
      while (this.isRunning) {
        if (this.isPaused) {
          await new Promise(resolve => { this._resumeResolve = resolve; });
        }
        this._iterSinceDelay++;
        // Infinite-loop guard: yield if no delay has been called in many iterations
        if (this._iterSinceDelay > this._MAX_TIGHT_ITERS) {
          this._iterSinceDelay = 0;
          await new Promise(r => setTimeout(r, 1));
        }
        await loop();
        this._loopCount++;
        // Yield to UI thread every iteration
        await new Promise(r => setTimeout(r, 0));
      }
    } catch (err) {
      if (err && err.message !== 'SIMULATION_STOPPED') {
        hadError = true;
        const friendly = this._friendlyError(err.message ? err.message : String(err), err instanceof Error ? err : undefined);
        this._emitError(friendly);
        this._serialLog(`[Error] ${friendly}\n`, 'error');
      }
    } finally {
      if (this._fpsInterval) {
        clearInterval(this._fpsInterval);
        this._fpsInterval = null;
      }
      // Release any pending pause
      if (this._resumeResolve) {
        const r = this._resumeResolve;
        this._resumeResolve = null;
        r();
      }
    }

    this.isRunning = false;
    this._serialLog('[ArduSim] Simulation stopped\n', 'system');
    if (this.onStop) this.onStop();
    return !hadError;
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
    if (this._resumeResolve) {
      const r = this._resumeResolve;
      this._resumeResolve = null;
      r();
    }
    this._stopAllTones();
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
    const v = parseFloat(s);
    this.speed = Number.isFinite(v) ? Math.min(100, Math.max(0.01, v)) : 1;
  }

  /* ── FPS tracking ── */
  _tickFps() {
    const now = Date.now();
    const elapsed = now - this._fpsLast;
    if (elapsed > 0) {
      this._fps = Math.round((this._loopCount * 1000) / elapsed);
    }
    this._loopCount = 0;
    this._fpsLast = now;
    if (this.onTick) this.onTick(this.simTime, this._fps);
  }

  /* ── Friendly error messages ── */
  _friendlyError(msg, err) {
    if (!msg) msg = 'An unknown error occurred';
    let line = '';
    // Runtime errors carry the compiled-code line in their stack as the first
    // "<anonymous>:N" frame. Syntax errors from `new Function` do not, and the
    // first such frame would instead be the transpiler itself — so skip them.
    if (err && err.stack && !(err instanceof SyntaxError)) {
      const m = String(err.stack).match(/<anonymous>:(\d+)(?::\d+)?/);
      if (m) {
        const n = parseInt(m[1], 10) - 1; // account for the wrapper block offset
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
    if (msg.includes('Missing loop()'))  return 'Missing loop() function. Every Arduino sketch needs a loop() function.';
    if (msg.includes('Maximum call stack')) return 'Stack overflow: infinite recursion detected. Check your function calls.';
    if (msg.includes('is not defined')) {
      const m = msg.match(/'([^']+)' is not defined/);
      if (m) return `'${m[1]}' is not defined${line}. Did you forget to declare a variable or include a library?`;
    }
    return msg + line;
  }

  sendSerialInput(text) {
    if (typeof text !== 'string') return;
    for (const ch of text) {
      this.serialInputBuffer.push(ch);
    }
    // Never let the input buffer grow without bound
    if (this.serialInputBuffer.length > 4096) {
      this.serialInputBuffer.splice(0, this.serialInputBuffer.length - 4096);
    }
  }

  setPinState(pinKey, value) {
    if (typeof pinKey !== 'string') return;
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
    try {
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
    } catch (e) {
      console.error('[ArduSim] Audio error:', e);
    }
  }

  _stopTone(key) {
    if (this._toneOscillators[key]) {
      try { this._toneOscillators[key].osc.stop(); } catch(e) {}
      delete this._toneOscillators[key];
    }
    this._emitEvent('buzzer_off', { key });
  }

  _stopAllTones() {
    for (const key of Object.keys(this._toneOscillators)) {
      try { this._toneOscillators[key].osc.stop(); } catch(e) {}
      delete this._toneOscillators[key];
    }
    this._toneOscillators = {};
  }

  /* ══════════════ INTERNALS ══════════════ */
  _serialLog(text, type = 'data') {
    if (this.onSerial) this.onSerial(text, type);
  }

  _emitPinChange(key, val) {
    // Reset tight-iter counter whenever a pin changes (means the sketch is doing work)
    this._iterSinceDelay = 0;
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
/* ═══════════════════════════════════════════════════════════
   EXAMPLE CIRCUITS — serialized project data loaded on the canvas
   when an example is opened. Matches the pins of each example code.
   ═══════════════════════════════════════════════════════════ */
const EXAMPLE_CIRCUITS = {
  led_on_13: {
    components: [
      { id: 'b1',   type: 'arduino_uno', x: 200, y: 100 },
      { id: 'led1', type: 'led',         x: 120, y: 280 },
      { id: 'r1',   type: 'resistor',    x: 120, y: 360 },
    ],
    wires: [
      { id: 'w1', from: { instId: 'b1',   pinId: 'D13' }, to: { instId: 'led1', pinId: 'anode' } },
      { id: 'w2', from: { instId: 'led1', pinId: 'cathode' }, to: { instId: 'r1', pinId: 'p1' } },
      { id: 'w3', from: { instId: 'r1',   pinId: 'p2' }, to: { instId: 'b1', pinId: 'GND1' } },
    ],
  },
  fade: {
    components: [
      { id: 'b1',   type: 'arduino_uno', x: 200, y: 100 },
      { id: 'led1', type: 'led',         x: 120, y: 280 },
      { id: 'r1',   type: 'resistor',    x: 120, y: 360 },
    ],
    wires: [
      { id: 'w1', from: { instId: 'b1',   pinId: 'D9' }, to: { instId: 'led1', pinId: 'anode' } },
      { id: 'w2', from: { instId: 'led1', pinId: 'cathode' }, to: { instId: 'r1', pinId: 'p1' } },
      { id: 'w3', from: { instId: 'r1',   pinId: 'p2' }, to: { instId: 'b1', pinId: 'GND1' } },
    ],
  },
  button: {
    components: [
      { id: 'b1',   type: 'arduino_uno', x: 200, y: 100 },
      { id: 'btn1', type: 'push_button', x: 120, y: 300 },
      { id: 'led1', type: 'led',         x: 340, y: 260 },
      { id: 'r1',   type: 'resistor',    x: 340, y: 340 },
    ],
    wires: [
      { id: 'w1', from: { instId: 'b1',   pinId: 'D2' }, to: { instId: 'btn1', pinId: 'p1' } },
      { id: 'w2', from: { instId: 'btn1', pinId: 'p3' }, to: { instId: 'b1',   pinId: 'GND1' } },
      { id: 'w3', from: { instId: 'b1',   pinId: 'D13' }, to: { instId: 'led1', pinId: 'anode' } },
      { id: 'w4', from: { instId: 'led1', pinId: 'cathode' }, to: { instId: 'r1', pinId: 'p1' } },
      { id: 'w5', from: { instId: 'r1',   pinId: 'p2' }, to: { instId: 'b1', pinId: 'GND1' } },
    ],
  },
  potentiometer: {
    components: [
      { id: 'b1',   type: 'arduino_uno', x: 200, y: 100 },
      { id: 'pot1', type: 'potentiometer', x: 120, y: 300 },
      { id: 'led1', type: 'led',         x: 340, y: 260 },
      { id: 'r1',   type: 'resistor',    x: 340, y: 340 },
    ],
    wires: [
      { id: 'w1', from: { instId: 'b1',   pinId: '5V' }, to: { instId: 'pot1', pinId: 'vcc' } },
      { id: 'w2', from: { instId: 'pot1', pinId: 'wiper' }, to: { instId: 'b1', pinId: 'A0' } },
      { id: 'w3', from: { instId: 'pot1', pinId: 'gnd' }, to: { instId: 'b1', pinId: 'GND1' } },
      { id: 'w4', from: { instId: 'b1',   pinId: 'D9' }, to: { instId: 'led1', pinId: 'anode' } },
      { id: 'w5', from: { instId: 'led1', pinId: 'cathode' }, to: { instId: 'r1', pinId: 'p1' } },
      { id: 'w6', from: { instId: 'r1',   pinId: 'p2' }, to: { instId: 'b1', pinId: 'GND1' } },
    ],
  },
  servo_sweep: {
    components: [
      { id: 'b1', type: 'arduino_uno', x: 200, y: 100 },
      { id: 'sv1', type: 'servo',      x: 120, y: 320 },
    ],
    wires: [
      { id: 'w1', from: { instId: 'b1', pinId: 'D9' }, to: { instId: 'sv1', pinId: 'signal' } },
      { id: 'w2', from: { instId: 'b1', pinId: '5V' }, to: { instId: 'sv1', pinId: 'vcc' } },
      { id: 'w3', from: { instId: 'b1', pinId: 'GND1' }, to: { instId: 'sv1', pinId: 'gnd' } },
    ],
  },
  traffic_light: {
    components: [
      { id: 'b1', type: 'arduino_uno', x: 200, y: 100 },
      { id: 'red',  type: 'led', x: 340, y: 240 },
      { id: 'yel',  type: 'led', x: 340, y: 340 },
      { id: 'grn',  type: 'led', x: 340, y: 440 },
      { id: 'rr',   type: 'resistor', x: 340, y: 320 },
      { id: 'ry',   type: 'resistor', x: 340, y: 420 },
      { id: 'rg',   type: 'resistor', x: 340, y: 520 },
    ],
    wires: [
      { id: 'w1', from: { instId: 'b1', pinId: 'D12' }, to: { instId: 'red', pinId: 'anode' } },
      { id: 'w2', from: { instId: 'red', pinId: 'cathode' }, to: { instId: 'rr', pinId: 'p1' } },
      { id: 'w3', from: { instId: 'rr',  pinId: 'p2' }, to: { instId: 'b1', pinId: 'GND1' } },
      { id: 'w4', from: { instId: 'b1', pinId: 'D11' }, to: { instId: 'yel', pinId: 'anode' } },
      { id: 'w5', from: { instId: 'yel', pinId: 'cathode' }, to: { instId: 'ry', pinId: 'p1' } },
      { id: 'w6', from: { instId: 'ry',  pinId: 'p2' }, to: { instId: 'b1', pinId: 'GND1' } },
      { id: 'w7', from: { instId: 'b1', pinId: 'D10' }, to: { instId: 'grn', pinId: 'anode' } },
      { id: 'w8', from: { instId: 'grn', pinId: 'cathode' }, to: { instId: 'rg', pinId: 'p1' } },
      { id: 'w9', from: { instId: 'rg',  pinId: 'p2' }, to: { instId: 'b1', pinId: 'GND1' } },
    ],
  },
  rainbow_rgb: {
    components: [
      { id: 'b1', type: 'arduino_uno', x: 200, y: 100 },
      { id: 'rgb1', type: 'rgb_led',   x: 120, y: 300 },
    ],
    wires: [
      { id: 'w1', from: { instId: 'b1',   pinId: 'D9' }, to: { instId: 'rgb1', pinId: 'red' } },
      { id: 'w2', from: { instId: 'b1',   pinId: 'D10' }, to: { instId: 'rgb1', pinId: 'green' } },
      { id: 'w3', from: { instId: 'b1',   pinId: 'D11' }, to: { instId: 'rgb1', pinId: 'blue' } },
      { id: 'w4', from: { instId: 'rgb1', pinId: 'gnd' }, to: { instId: 'b1', pinId: 'GND1' } },
    ],
  },
  temperature: {
    components: [
      { id: 'b1', type: 'arduino_uno', x: 200, y: 100 },
      { id: 'dht1', type: 'dht11',     x: 120, y: 300 },
    ],
    wires: [
      { id: 'w1', from: { instId: 'b1',   pinId: '5V' }, to: { instId: 'dht1', pinId: 'vcc' } },
      { id: 'w2', from: { instId: 'b1',   pinId: 'D2' }, to: { instId: 'dht1', pinId: 'data' } },
      { id: 'w3', from: { instId: 'dht1', pinId: 'gnd' }, to: { instId: 'b1', pinId: 'GND1' } },
    ],
  },
  ultrasonic: {
    components: [
      { id: 'b1', type: 'arduino_uno', x: 200, y: 100 },
      { id: 'son1', type: 'hcsr04',     x: 120, y: 300 },
      { id: 'led1', type: 'led',         x: 340, y: 260 },
      { id: 'r1',   type: 'resistor',    x: 340, y: 340 },
    ],
    wires: [
      { id: 'w1', from: { instId: 'b1',   pinId: '5V' },  to: { instId: 'son1', pinId: 'vcc' } },
      { id: 'w2', from: { instId: 'b1',   pinId: 'D7' },  to: { instId: 'son1', pinId: 'trig' } },
      { id: 'w3', from: { instId: 'b1',   pinId: 'D8' },  to: { instId: 'son1', pinId: 'echo' } },
      { id: 'w4', from: { instId: 'son1', pinId: 'gnd' }, to: { instId: 'b1',   pinId: 'GND1' } },
      { id: 'w5', from: { instId: 'b1',   pinId: 'D13' }, to: { instId: 'led1', pinId: 'anode' } },
      { id: 'w6', from: { instId: 'led1', pinId: 'cathode' }, to: { instId: 'r1', pinId: 'p1' } },
      { id: 'w7', from: { instId: 'r1',   pinId: 'p2' }, to: { instId: 'b1',   pinId: 'GND1' } },
    ],
  },
};

const EXAMPLE_SKETCHES = [
  {
    id: 'blink',
    name: 'Blink LED',
    icon: '💡',
    desc: 'The classic Hello World of Arduino — blink an LED on pin 13',
    tags: ['beginner', 'LED', 'digital'],
    circuit: EXAMPLE_CIRCUITS.led_on_13,
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
    circuit: EXAMPLE_CIRCUITS.fade,
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
    circuit: EXAMPLE_CIRCUITS.button,
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
    circuit: EXAMPLE_CIRCUITS.potentiometer,
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
    circuit: EXAMPLE_CIRCUITS.servo_sweep,
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
    circuit: EXAMPLE_CIRCUITS.traffic_light,
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
    circuit: EXAMPLE_CIRCUITS.button,
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
    circuit: EXAMPLE_CIRCUITS.rainbow_rgb,
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
    circuit: EXAMPLE_CIRCUITS.led_on_13,
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
    desc: 'Read DHT11 temperature and humidity — drag the Temp/Hum sliders on the sensor',
    tags: ['intermediate', 'sensor', 'DHT11'],
    circuit: EXAMPLE_CIRCUITS.temperature,
    code: `/*
 * DHT11 Temperature & Humidity (simulated)
 * Drag the Temp / Hum sliders under the sensor to change the readings.
 */

int dataPin = 2;
float temperature = 0;
float humidity = 0;
int count = 0;

float readTemperature() {
  // Reads the Temp slider on the DHT11 component (0-50°C).
  // If no DHT11 is placed, falls back to a simulated 20-30°C wobble.
  float v = sensorValue('dht11', 'temperature');
  if (v >= 0) return v;
  return 25.0 + 5.0 * sin(count * 0.1);
}

float readHumidity() {
  float v = sensorValue('dht11', 'humidity');
  if (v >= 0) return v;
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
  {
    id: 'ultrasonic',
    name: 'Ultrasonic Distance',
    icon: '📡',
    desc: 'HC-SR04 distance sensor driving an LED (drag the Dist slider)',
    tags: ['intermediate', 'sensor', 'ultrasonic'],
    circuit: EXAMPLE_CIRCUITS.ultrasonic,
    code: `/*
 * HC-SR04 Ultrasonic Distance Sensor (simulated)
 * Drag the "Dist" slider under the sensor to change the distance.
 */

const int trigPin = 7;
const int echoPin = 8;
const int ledPin = 13;

float readDistance() {
  // Reads the Dist slider on the HC-SR04 component (2-400 cm).
  // If no HC-SR04 is placed, falls back to a fixed 25 cm.
  float d = sensorValue('hcsr04', 'distance');
  if (d >= 0) return d;
  return 25.0;
}

void setup() {
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  pinMode(ledPin, OUTPUT);
  Serial.begin(9600);
  Serial.println("HC-SR04 ultrasonic started");
}

void loop() {
  float distance = readDistance();

  // Alert LED when an obstacle gets close (< 20 cm)
  if (distance < 20) {
    digitalWrite(ledPin, HIGH);
  } else {
    digitalWrite(ledPin, LOW);
  }

  Serial.print("Distance: ");
  Serial.print(distance, 1);
  Serial.println(" cm");
  delay(500);
}`
  },
];

/* Export */
window.ArduinoSim = new ArduinoSimulator();
window.EXAMPLE_SKETCHES = EXAMPLE_SKETCHES;
