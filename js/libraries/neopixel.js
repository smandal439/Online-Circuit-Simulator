/**
 * Adafruit NeoPixel Library Plugin for ArduSim
 *
 * Provides NeoPixel LED strip simulation with HSV and gamma correction.
 */
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['Adafruit_NeoPixel'] = {
  classes: ['Adafruit_NeoPixel'],
  includes: ['<Adafruit_NeoPixel.h>'],

  transpile: [
    // Handle `var x = new Adafruit_NeoPixel(args)` produced by the classes mechanism
    [/\bnew\s+Adafruit_NeoPixel\s*\(([^)]+)\)/g, '_a.neopixelNew($1)'],
    // Handle `Adafruit_NeoPixel x = Adafruit_NeoPixel(args)` (old style)
    [/Adafruit_NeoPixel\s+(\w+)\s*=\s*Adafruit_NeoPixel\(([^)]+)\)/g, 'var $1 = _a.neopixelNew($2)'],
    // Handle `Adafruit_NeoPixel x(args)` (old style)
    [/Adafruit_NeoPixel\s+(\w+)\(([^)]+)\)/g, 'var $1 = _a.neopixelNew($2)'],
    [/(?<!Serial|WiFi|Wire|SPI)(\w+)\.show\(\)/g, '_a.neopixelShow($1)'],
    [/(\w+)\.setPixelColor\(/g, '_a.neopixelSetPixelColor($1, '],
    [/(\w+)\.getPixelColor\(/g, '_a.neopixelGetPixelColor($1, '],
    [/(\w+)\.setBrightness\(/g, '_a.neopixelSetBrightness($1, '],
    [/(\w+)\.Color\(/g, '_a.neopixelColor($1, '],
    [/(\w+)\.numPixels\(\)/g, '_a.neopixelNumPixels($1)'],
    [/(\w+)\.ColorHSV\(/g, '_a.neopixelColorHSV($1, '],
    [/(\w+)\.gamma32\(/g, '_a.neopixelGamma32($1, '],
    [/(?<!Serial|WiFi|Wire|SPI)(\w+)\.clear\(\)/g, '_a.neopixelClear($1)'],
  ],

  runtime: function(self) {
    return {
      neopixelNew: function(numLedsPin, pinOrType, type) {
        var numLeds = Number(numLedsPin) || 0;
        var pin = typeof pinOrType === 'number' ? pinOrType : 6;
        var id = '_np_' + pin;
        self._neopixels = self._neopixels || {};
        self._neopixels[id] = { pin: pin, numLeds: numLeds, brightness: 255, pixels: new Array(numLeds).fill(0) };
        return {
          _npId: id,
          begin: function() {},
          show: function() {
            var np = self._neopixels && self._neopixels[id];
            if (np) {
              var leds = np.pixels.map(function(c) {
                return { r: (c >> 16) & 0xFF, g: (c >> 8) & 0xFF, b: c & 0xFF };
              });
              self._emitEvent('fastled_show', { leds: leds, brightness: np.brightness });
            }
          },
          clear: function() {
            var np = self._neopixels && self._neopixels[id];
            if (np) np.pixels.fill(0);
          }
        };
      },
      neopixelBegin: function(obj) {
        self._serialLog('[NeoPixel] begin\n', 'system');
      },
      neopixelShow: function(obj) {
        var np = self._neopixels && self._neopixels[obj._npId];
        if (np) {
          var leds = np.pixels.map(function(c) {
            return { r: (c >> 16) & 0xFF, g: (c >> 8) & 0xFF, b: c & 0xFF };
          });
          self._emitEvent('fastled_show', { leds: leds, brightness: np.brightness });
        }
      },
      neopixelSetPixelColor: function(obj, i, rOrColor, g, b) {
        var np = self._neopixels && self._neopixels[obj._npId];
        if (!np) return;
        var i2 = Number(i) || 0;
        if (g !== undefined) {
          np.pixels[i2] = ((Number(rOrColor) || 0) << 16) | ((Number(g) || 0) << 8) | (Number(b) || 0);
        } else {
          np.pixels[i2] = Number(rOrColor) || 0;
        }
      },
      neopixelGetPixelColor: function(obj, i) {
        var np = self._neopixels && self._neopixels[obj._npId];
        return np ? (np.pixels[Number(i) || 0] || 0) : 0;
      },
      neopixelSetBrightness: function(obj, b) {
        var np = self._neopixels && self._neopixels[obj._npId];
        if (np) np.brightness = Math.max(0, Math.min(255, Number(b) || 0));
      },
      neopixelColor: function(obj, r, g, b) {
        return ((Number(r) || 0) << 16) | ((Number(g) || 0) << 8) | (Number(b) || 0);
      },
      neopixelNumPixels: function(obj) {
        var np = self._neopixels && self._neopixels[obj._npId];
        return np ? np.numLeds : 0;
      },
      neopixelClear: function(obj) {
        var np = self._neopixels && self._neopixels[obj._npId];
        if (np) np.pixels.fill(0);
      },
      neopixelColorHSV: function(obj, hue, sat, val) {
        var h = (Number(hue) || 0) & 0xFFFF;
        var s = sat !== undefined ? Math.max(0, Math.min(255, Number(sat) || 0)) : 255;
        var v = val !== undefined ? Math.max(0, Math.min(255, Number(val) || 0)) : 255;
        if (s === 0) return (v << 16) | (v << 8) | v;
        var region = Math.floor(h / 10923);
        var remainder = Math.floor((h % 10923) * 255 / 10923);
        var p = (v * (255 - s)) >> 8;
        var q = (v * (255 - ((s * remainder) >> 8))) >> 8;
        var t = (v * (255 - ((s * (255 - remainder)) >> 8))) >> 8;
        var r, g2, b2;
        switch (region) {
          case 0: r = v; g2 = t; b2 = p; break;
          case 1: r = q; g2 = v; b2 = p; break;
          case 2: r = p; g2 = v; b2 = t; break;
          case 3: r = p; g2 = q; b2 = v; break;
          case 4: r = t; g2 = p; b2 = v; break;
          default: r = v; g2 = p; b2 = q; break;
        }
        return (r << 16) | (g2 << 8) | b2;
      },
      neopixelGamma32: function(obj, color) {
        var c = Number(color) || 0;
        var r = (c >> 16) & 0xFF;
        var g = (c >> 8) & 0xFF;
        var b = c & 0xFF;
        var gamma = 2.8;
        var gr = Math.round(Math.pow(r / 255, gamma) * 255);
        var gg = Math.round(Math.pow(g / 255, gamma) * 255);
        var gb = Math.round(Math.pow(b / 255, gamma) * 255);
        return (gr << 16) | (gg << 8) | gb;
      },
    };
  },

  constants: {
    NEO_GRB: 0x02,
    NEO_GRBW: 0x04,
    NEO_KHZ800: 0x00,
    NEO_KHZ400: 0x01,
    NEO_RGB: 0x00,
    NEO_RGBW: 0x03,
    NEO_BRG: 0x01,
    NEO_RBG: 0x02,
  },
};
