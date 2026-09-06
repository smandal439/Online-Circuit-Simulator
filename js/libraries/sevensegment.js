// js/libraries/sevensegment.js
// SevenSegment Display Driver Plugin for ArduSim
// Supports common anode/cathode 7-segment displays

window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['SevenSegment'] = {
  classes: ['SevenSegment'],
  includes: ['<SevenSegment.h>'],
  priority: 50,

  transpile: [
    // SevenSegment display(a, b, c, d, e, f, g) → var display = new SevenSegment(a, b, c, d, e, f, g)
    [/\bSevenSegment\s+(\w+)\s*\(([^)]+)\)\s*;/g, 'var $1 = new SevenSegment($2)'],

    // display.begin(type) → _a.segBegin(obj, type)
    [/\b(\w+)\.begin\s*\(/g, function(match, varName) {
      if (['Serial', 'Wire', 'SPI', 'WiFi'].includes(varName)) return match;
      return '_a.segBegin(' + varName + ', ';
    }],

    // display.writeDigit(num) → _a.segWrite(obj, num)
    [/\b(\w+)\.writeDigit\s*\(/g, function(match, varName) {
      if (['Serial', 'Wire', 'SPI', 'WiFi'].includes(varName)) return match;
      return '_a.segWrite(' + varName + ', ';
    }],

    // display.writeNumber(num) → _a.segWriteNumber(obj, num)
    [/\b(\w+)\.writeNumber\s*\(/g, function(match, varName) {
      if (['Serial', 'Wire', 'SPI', 'WiFi'].includes(varName)) return match;
      return '_a.segWriteNumber(' + varName + ', ';
    }],

    // display.clear() → _a.segClear(obj)
    [/\b(\w+)\.clear\s*\(\s*\)/g, function(match, varName) {
      if (['Serial', 'Wire', 'SPI', 'WiFi'].includes(varName)) return match;
      return '_a.segClear(' + varName + ')';
    }],

    // display.setBrightness(val) → _a.segBrightness(obj, val)
    [/\b(\w+)\.setBrightness\s*\(/g, function(match, varName) {
      if (['Serial', 'Wire', 'SPI', 'WiFi'].includes(varName)) return match;
      return '_a.segBrightness(' + varName + ', ';
    }],
  ],

  runtime: function(self) {
    // Segment patterns for digits 0-9 (a,b,c,d,e,f,g)
    // Bit order: a=0, b=1, c=2, d=3, e=4, f=5, g=6
    const DIGIT_PATTERNS = [
      0b0111111, // 0: a,b,c,d,e,f
      0b0000110, // 1: b,c
      0b1011011, // 2: a,b,d,e,g
      0b1001111, // 3: a,b,c,d,g
      0b1100110, // 4: b,c,f,g
      0b1101101, // 5: a,c,d,f,g
      0b1111101, // 6: a,c,d,e,f,g
      0b0000111, // 7: a,b,c
      0b1111111, // 8: all
      0b1101111, // 9: a,b,c,d,f,g
    ];

    const instances = new Map();
    let nextId = 1;

    return {
      segBegin: function(obj, type) {
        if (!obj._segId) obj._segId = nextId++;
        const pins = obj._segPins || [2,3,4,5,6,7,8];
        instances.set(obj._segId, {
          pins: pins,
          type: type === 1 ? 'anode' : 'cathode', // 1=COMMON_ANODE, 0=COMMON_CATHODE
          brightness: 1.0,
          currentPattern: 0,
        });
        self._serialLog('[SevenSegment] Initialized (type: ' + (type === 1 ? 'anode' : 'cathode') + ')\n', 'system');
      },

      segWrite: function(obj, digit) {
        const inst = instances.get(obj._segId);
        if (!inst) return;
        digit = Math.max(0, Math.min(9, Math.floor(digit)));
        inst.currentPattern = DIGIT_PATTERNS[digit];
        self._updateSegments(obj._segId);
      },

      segWriteNumber: function(obj, num) {
        const inst = instances.get(obj._segId);
        if (!inst) return;
        num = Math.max(0, Math.min(9999, Math.floor(num)));
        // For single digit display, show last digit
        inst.currentPattern = DIGIT_PATTERNS[num % 10];
        self._updateSegments(obj._segId);
      },

      segClear: function(obj) {
        const inst = instances.get(obj._segId);
        if (!inst) return;
        inst.currentPattern = 0;
        self._updateSegments(obj._segId);
      },

      segBrightness: function(obj, val) {
        const inst = instances.get(obj._segId);
        if (!inst) return;
        inst.brightness = Math.max(0, Math.min(1, val / 255));
        self._updateSegments(obj._segId);
      },

      _updateSegments: function(segId) {
        const inst = instances.get(segId);
        if (!inst) return;

        const isOn = (bit) => (inst.currentPattern & (1 << bit)) !== 0;
        const pinValue = (bit) => {
          const on = isOn(bit);
          return inst.type === 'anode' ? !on : on;
        };

        // Update each segment pin (a=0 through g=6)
        for (let i = 0; i < 7; i++) {
          const pin = inst.pins[i];
          if (pin !== undefined) {
            self._setPin(pin, pinValue(i) ? 1 : 0);
          }
        }
      },
    };
  },

  constructor: function(args) {
    // args = "pinA, pinB, pinC, pinD, pinE, pinF, pinG"
    const pins = args.split(',').map(s => parseInt(s.trim(), 10));
    return {
      _segPins: pins,
      begin: function(type) {},
      writeDigit: function(d) {},
      writeNumber: function(n) {},
      clear: function() {},
      setBrightness: function(v) {},
    };
  },

  constants: {
    COMMON_CATHODE: 0,
    COMMON_ANODE: 1,
  },
};