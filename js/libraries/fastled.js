/**
 * FastLED Library Plugin for ArduSim
 *
 * Provides FastLED simulation with HSV-to-RGB conversion.
 */
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['FastLED'] = {
  classes: ['CRGB', 'CHSV'],

  transpile: [
    [/FastLED\.addLeds\(/g, '_a.fastledAddLeds('],
    [/FastLED\.show\(\)/g, '_a.fastledShow()'],
    [/FastLED\.setBrightness\(/g, '_a.fastledSetBrightness('],
    [/FastLED\.setCorrection\(/g, '_a.fastledSetCorrection('],
    [/FastLED\.setColorCorrection\(/g, '_a.fastledSetColorCorrection('],
    [/FastLED\.maxPowerInMilliamps\(/g, '_a.fastledMaxPower('],
    [/FastLED\.clear\(\)/g, '_a.fastledClear()'],
    [/CRGB\s+(\w+)\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)/g, 'var $1 = _a.crgbNew($2, $3, $4)'],
    [/CRGB\s+(\w+)\[(\d+)\]/g, 'var $1 = _a.crgbArray($2)'],
    [/CHSV\s+(\w+)\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)/g, 'var $1 = _a.chsvNew($2, $3, $4)'],
  ],

  runtime: function(self) {
    return {
      fastledAddLeds: function(ledType, dataPin, numLeds) {
        self._fastled = self._fastled || { leds: [], brightness: 255 };
        self._fastled.leds = new Array(Number(numLeds) || 0).fill(null).map(function() { return { r: 0, g: 0, b: 0 }; });
        self._fastled.dataPin = dataPin;
        self._serialLog('[FastLED] ' + numLeds + ' LEDs on pin ' + dataPin + '\n', 'system');
      },
      fastledShow: function() {
        if (self._fastled) {
          self._emitEvent('fastled_show', { leds: self._fastled.leds, brightness: self._fastled.brightness });
        }
      },
      fastledSetBrightness: function(b) {
        if (self._fastled) self._fastled.brightness = Math.max(0, Math.min(255, Number(b) || 0));
      },
      fastledSetCorrection: function(type) { },
      fastledSetColorCorrection: function(type) { },
      fastledMaxPower: function(milliamps) { },
      fastledClear: function() {
        if (self._fastled) self._fastled.leds.forEach(function(l) { l.r = 0; l.g = 0; l.b = 0; });
      },
      crgbNew: function(r, g, b) {
        return { r: Math.max(0, Math.min(255, Number(r) || 0)), g: Math.max(0, Math.min(255, Number(g) || 0)), b: Math.max(0, Math.min(255, Number(b) || 0)) };
      },
      crgbArray: function(size) {
        return new Array(Number(size) || 0).fill(null).map(function() { return { r: 0, g: 0, b: 0 }; });
      },
      chsvNew: function(h, s, v) {
        h = Number(h) || 0; s = Number(s) || 255; v = Number(v) || 255;
        var c = { r: 0, g: 0, b: 0 };
        var i = Math.floor(h / 43) % 6;
        var f = (h / 43) - Math.floor(h / 43);
        var p = (v * (255 - s)) >> 8;
        var q = (v * (255 - (s * f) >> 8)) >> 8;
        var t = (v * (255 - (s * (255 - f) >> 8))) >> 8;
        switch (i) {
          case 0: c.r = v; c.g = t; c.b = p; break;
          case 1: c.r = q; c.g = v; c.b = p; break;
          case 2: c.r = p; c.g = v; c.b = t; break;
          case 3: c.r = p; c.g = q; c.b = v; break;
          case 4: c.r = t; c.g = p; c.b = v; break;
          case 5: c.r = v; c.g = p; c.b = q; break;
        }
        return c;
      },
    };
  },

  constants: {
    TWhite: 255,
  },
};
