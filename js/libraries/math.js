/**
 * Arduino + ESP32 Math Library for ArduSim
 *
 * Complete math operations for Arduino and ESP32 sketches:
 *   - Standard C/C++ math (sin, cos, atan2, sqrt, pow, abs, floor, ceil, round)
 *   - Arduino core helpers (map, constrain, min, max, random, randomSeed)
 *   - Arduino bit manipulation (bitRead, bitWrite, bitSet, bitClear, bit, lowByte, highByte)
 *   - Arduino shift operations (shiftIn, shiftOut)
 *   - FastLED / NeoPixel 8-bit fixed-point math (sin8, cos8, qadd8, qsub8, etc.)
 *   - Mathematical constants (PI, TWO_PI, HALF_PI, DEG_TO_RAD, RAD_TO_DEG)
 *   - ESP32 math (analogReadMilliVolts, analogReadMicroVolts helpers)
 *
 * The transpiler handles standard C math → Math.* at the regex level.
 * This plugin provides Arduino-specific and FastLED-specific operations
 * that have no direct JavaScript equivalent.
 */
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['ArduinoMath'] = {
  classes: [],
  includes: [],
  transpile: [],

  runtime: function (self) {
    /* ════════════════════════════════════════════════════════════════
     *  SECTION 1 — Arduino Core Math Helpers
     * ════════════════════════════════════════════════════════════════ */

    /**
     * map(value, fromLow, fromHigh, toLow, toHigh)
     * Re-maps a number from one range to another.
     * Arduino: map(10, 0, 1023, 0, 255) → ~2
     */
    function arduinoMap(value, fromLow, fromHigh, toLow, toHigh) {
      if (fromHigh === fromLow) return toLow;
      return (value - fromLow) * (toHigh - toLow) / (fromHigh - fromLow) + toLow;
    }

    /**
     * constrain(value, low, high)
     * Constrains a value to be within a range.
     * Arduino: constrain(500, 0, 255) → 255
     */
    function arduinoConstrain(value, low, high) {
      return Math.max(low, Math.min(high, value));
    }

    /**
     * min(a, b) / max(a, b)
     * Arduino min/max — returns the smaller/larger of two values.
     * Note: Arduino min/max are macros; this is the safe JS version.
     */
    function arduinoMin(a, b) { return Math.min(a, b); }
    function arduinoMax(a, b) { return Math.max(a, b); }

    /**
     * random(max) / random(min, max)
     * Arduino random — returns a random long between min (inclusive) and max (exclusive).
     * random(100)       → 0..99
     * random(200, 1000) → 200..999
     */
    function arduinoRandom(minOrMax, max) {
      if (max === undefined) {
        const hi = Math.floor(Number(minOrMax) || 0);
        if (hi <= 0) return 0;
        return Math.floor(Math.random() * hi);
      }
      const lo = Math.floor(Number(minOrMax) || 0);
      const hi = Math.floor(Number(max) || 0);
      if (hi <= lo) return lo;
      return Math.floor(Math.random() * (hi - lo)) + lo;
    }

    /**
     * randomSeed(seed)
     * Arduino randomSeed — seeds the random number generator.
     * In JS we can't seed Math.random(), so this is a no-op.
     */
    function arduinoRandomSeed(seed) { /* no-op in JS */ }

    /**
     * isnan(value) / isinf(value) / isfinite(value)
     * Arduino test macros — check for NaN / Infinity / finite.
     */
    function arduinoIsnan(x) { return Number.isNaN(x); }
    function arduinoIsinf(x) { return !Number.isFinite(x); }
    function arduinoIsfinite(x) { return Number.isFinite(x); }

    /**
     * atan2(y, x) — 2-argument arctangent.
     * Arduino: atan2(dy, dx) → angle in radians (-π to π)
     */
    function arduinoAtan2(y, x) { return Math.atan2(y, x); }

    /* ════════════════════════════════════════════════════════════════
     *  SECTION 2 — Arduino Bit Manipulation
     * ════════════════════════════════════════════════════════════════ */

    /**
     * bitRead(value, bit) — reads a single bit from a number.
     * Arduino: bitRead(0b1010, 1) → 1
     */
    function bitRead(val, bit) { return (val >> bit) & 1; }

    /**
     * bitWrite(value, bit, bitvalue) — writes a single bit.
     * Arduino: bitWrite(0b1000, 1, 1) → 0b1010
     */
    function bitWrite(val, bit, bv) { return bv ? val | (1 << bit) : val & ~(1 << bit); }

    /**
     * bitSet(value, bit) — sets a bit to 1.
     * Arduino: bitSet(0b1000, 1) → 0b1010
     */
    function bitSet(val, bit) { return val | (1 << bit); }

    /**
     * bitClear(value, bit) — clears a bit to 0.
     * Arduino: bitClear(0b1010, 1) → 0b1000
     */
    function bitClear(val, bit) { return val & ~(1 << bit); }

    /**
     * bit(n) — returns 2^n.
     * Arduino: bit(3) → 8
     */
    function bit(n) { return 1 << n; }

    /**
     * lowByte(value) — returns the low byte (bits 0-7).
     * Arduino: lowByte(0x1234) → 0x34
     */
    function lowByte(val) { return val & 0xFF; }

    /**
     * highByte(value) — returns the high byte (bits 8-15).
     * Arduino: highByte(0x1234) → 0x12
     */
    function highByte(val) { return (val >> 8) & 0xFF; }

    /**
     * bitRead for wider types
     */
    function byte(val) { return val & 0xFF; }
    function word(hi, lo) {
      if (lo === undefined) return hi & 0xFFFF;
      return ((hi & 0xFF) << 8) | (lo & 0xFF);
    }

    /* ════════════════════════════════════════════════════════════════
     *  SECTION 3 — Arduino Shift Operations
     * ════════════════════════════════════════════════════════════════ */

    /**
     * shiftIn(dataPin, clockPin, bitOrder)
     * Arduino: shifts 8 bits in, LSBFIRST or MSBFIRST.
     * Stub — returns 0 in simulation.
     */
    function shiftIn(dataPin, clockPin, bitOrder) { return 0; }

    /**
     * shiftOut(dataPin, clockPin, bitOrder, val)
     * Arduino: shifts 8 bits out.
     * Stub — no-op in simulation.
     */
    function shiftOut(dataPin, clockPin, bitOrder, val) { /* no-op */ }

    /* ════════════════════════════════════════════════════════════════
     *  SECTION 4 — FastLED / NeoPixel 8-bit Fixed-Point Math
     *
     *  These functions work with 8-bit unsigned values (0-255) and
     *  provide efficient approximations used in LED animations.
     *  Reference: FastLED library math.h
     * ════════════════════════════════════════════════════════════════ */

    /**
     * sin8(x) — 8-bit sine wave.
     * Input:  0-255 (one full cycle)
     * Output: 0-255
     * sin8(0)=128, sin8(64)=255, sin8(128)=128, sin8(192)=0
     */
    function sin8(x) {
      return Math.round(128 + 127 * Math.sin(((x & 0xFF) / 256) * 2 * Math.PI));
    }

    /**
     * cos8(x) — 8-bit cosine wave.
     * cos8(x) = sin8(x + 64)
     */
    function cos8(x) {
      return sin8((x + 64) & 0xFF);
    }

    /**
     * qadd8(a, b) — saturating 8-bit add (no overflow past 255).
     * Arduino: qadd8(200, 100) → 255
     */
    function qadd8(a, b) {
      const sum = (a & 0xFF) + (b & 0xFF);
      return sum > 255 ? 255 : sum;
    }

    /**
     * qsub8(a, b) — saturating 8-bit subtract (no underflow past 0).
     * Arduino: qsub8(50, 100) → 0
     */
    function qsub8(a, b) {
      const diff = (a & 0xFF) - (b & 0xFF);
      return diff < 0 ? 0 : diff;
    }

    /**
     * mul8(a, b) — 8-bit multiply, returns low byte.
     * Arduino: mul8(20, 30) → (600 & 0xFF) = 88
     */
    function mul8(a, b) {
      return ((a & 0xFF) * (b & 0xFF)) & 0xFF;
    }

    /**
     * scale8(a, scale) — multiply by scale/255.
     * Arduino: scale8(200, 128) → ~100
     */
    function scale8(a, scale) {
      return ((a & 0xFF) * (scale & 0xFF) + 128) >> 8;
    }

    /**
     * ease8InOutQuad(x) — ease-in-out quadratic for 8-bit.
     * Input:  0-255
     * Output: 0-255
     */
    function ease8InOutQuad(x) {
      var y = x & 0xFF;
      y = y < 128 ? (y * y * 2) >> 8 : 255 - (((255 - y) * (255 - y) * 2) >> 8);
      return y;
    }

    /**
     * ease8InOutCubic(x) — ease-in-out cubic for 8-bit.
     */
    function ease8InOutCubic(x) {
      var y = x & 0xFF;
      var y2 = (y * y) >> 8;
      var y3 = (y2 * y) >> 8;
      return y < 128
        ? (4 * y3) >> 8
        : 255 - (4 * (255 - y) * (255 - y) * (255 - y) >> 16);
    }

    /**
     * lerp8(a, b, frac) — linear interpolate 8-bit.
     * frac: 0-255 (0=a, 255=b)
     */
    function lerp8(a, b, frac) {
      return a + scale8(b - a + 256, frac);
    }

    /**
     * triwave8(x) — triangle wave, 0-255-0 over input 0-255.
     */
    function triwave8(x) {
      var y = x & 0xFF;
      return y < 128 ? y * 2 : (255 - y) * 2;
    }

    /**
     * squarewave8(x, duty) — square wave with variable duty.
     * duty: 0-255 (0=always low, 255=always high, 128=50% duty)
     */
    function squarewave8(x, duty) {
      return (x & 0xFF) < duty ? 255 : 0;
    }

    /**
     * avg8(a, b) — average of two 8-bit values.
     */
    function avg8(a, b) {
      return ((a & 0xFF) + (b & 0xFF)) >> 1;
    }

    /**
     * blend8(a, b, amountOfB) — blend between two 8-bit values.
     * amountOfB: 0=a, 255=b
     */
    function blend8(a, b, amountOfB) {
      return a + scale8(b - a + 256, amountOfB);
    }

    /* ════════════════════════════════════════════════════════════════
     *  SECTION 5 — 16-bit Helpers (FastLED)
     * ════════════════════════════════════════════════════════════════ */

    /**
     * qadd16(a, b) — saturating 16-bit add.
     */
    function qadd16(a, b) {
      var sum = (a & 0xFFFF) + (b & 0xFFFF);
      return sum > 65535 ? 65535 : sum;
    }

    /**
     * qsub16(a, b) — saturating 16-bit subtract.
     */
    function qsub16(a, b) {
      var diff = (a & 0xFFFF) - (b & 0xFFFF);
      return diff < 0 ? 0 : diff;
    }

    /**
     * scale16(a, scale) — multiply by scale/65535.
     */
    function scale16(a, scale) {
      return Math.round((a & 0xFFFF) * (scale & 0xFFFF) / 65535);
    }

    /* ════════════════════════════════════════════════════════════════
     *  SECTION 6 — ESP32-Specific Helpers
     * ════════════════════════════════════════════════════════════════ */

    /**
     * digitalPinToInterrupt(pin)
     * ESP32/Arduino: maps a digital pin number to its interrupt number.
     */
    function digitalPinToInterrupt(pin) { return Number(pin); }

    /* ════════════════════════════════════════════════════════════════
     *  SECTION 7 — String Conversion Helpers
     * ════════════════════════════════════════════════════════════════ */

    /**
     * fmod(a, b) — floating point modulo (C++ fmod).
     */
    function fmod(a, b) { return a % b; }

    /**
     * isnan / isinf / isfinite — re-exported for convenience.
     */
    // (already defined above in Section 1)

    /* ════════════════════════════════════════════════════════════════
     *  RETURN ALL OPERATIONS
     *  These get merged into _a via Object.assign(_a, runtime)
     * ════════════════════════════════════════════════════════════════ */
    return {
      // ── Arduino Core Math ──
      map: arduinoMap,
      constrain: arduinoConstrain,
      min: arduinoMin,
      max: arduinoMax,
      random: arduinoRandom,
      randomSeed: arduinoRandomSeed,
      isnan: arduinoIsnan,
      isinf: arduinoIsinf,
      isfinite: arduinoIsfinite,
      atan2: arduinoAtan2,
      fmod: fmod,

      // ── Bit Manipulation ──
      bitRead: bitRead,
      bitWrite: bitWrite,
      bitSet: bitSet,
      bitClear: bitClear,
      bit: bit,
      lowByte: lowByte,
      highByte: highByte,
      byte: byte,
      word: word,

      // ── Shift Operations ──
      shiftIn: shiftIn,
      shiftOut: shiftOut,

      // ── FastLED 8-bit Fixed-Point Math ──
      sin8: sin8,
      cos8: cos8,
      qadd8: qadd8,
      qsub8: qsub8,
      mul8: mul8,
      scale8: scale8,
      ease8InOutQuad: ease8InOutQuad,
      ease8InOutCubic: ease8InOutCubic,
      lerp8: lerp8,
      triwave8: triwave8,
      squarewave8: squarewave8,
      avg8: avg8,
      blend8: blend8,

      // ── FastLED 16-bit Math ──
      qadd16: qadd16,
      qsub16: qsub16,
      scale16: scale16,

      // ── ESP32 Helpers ──
      digitalPinToInterrupt: digitalPinToInterrupt,
    };
  },

  /**
   * Mathematical constants — merged into the global scope.
   * Available as bare identifiers in user code: PI, TWO_PI, HALF_PI, etc.
   */
  constants: {
    // ── Standard Math Constants ──
    PI: Math.PI,
    TWO_PI: Math.PI * 2,
    HALF_PI: Math.PI / 2,
    QUARTER_PI: Math.PI / 4,
    E: Math.E,

    // ── Angle Conversion ──
    DEG_TO_RAD: Math.PI / 180,
    RAD_TO_DEG: 180 / Math.PI,

    // ── Bit Order Constants ──
    MSBFIRST: 1,
    LSBFIRST: 0,

    // ── Data Size Constants ──
    BYTE: 0,
    WORD: 1,
    LSBFIRST: 0,
    MSBFIRST: 1,

    // ── Boolean Aliases ──
    true: true,
    false: false,
    TRUE: true,
    FALSE: false,
    NULL: null,
    HIGH: 1,
    LOW: 0,
  },
};
