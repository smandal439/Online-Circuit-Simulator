// js/libraries/adafruit_gfx.js
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['Adafruit_GFX'] = {
  priority: 99,

  // Class names this library provides
  classes: ['Adafruit_GFX'],
  includes: ['<Adafruit_GFX.h>'],

  // Transpile rules: [regex, replacement]
  transpile: [
    [/\.drawPixel\s*\(/g, '_a.gfxDrawPixel('],
    [/\.drawLine\s*\(/g, '_a.gfxDrawLine('],
    [/\.drawFastHLine\s*\(/g, '_a.gfxDrawFastHLine('],
    [/\.drawFastVLine\s*\(/g, '_a.gfxDrawFastVLine('],
    [/\.drawRect\s*\(/g, '_a.gfxDrawRect('],
    [/\.fillRect\s*\(/g, '_a.gfxFillRect('],
    [/\.fillScreen\s*\(/g, '_a.gfxFillScreen('],
    [/\.drawCircle\s*\(/g, '_a.gfxDrawCircle('],
    [/\.fillCircle\s*\(/g, '_a.gfxFillCircle('],
    [/\.drawTriangle\s*\(/g, '_a.gfxDrawTriangle('],
    [/\.fillTriangle\s*\(/g, '_a.gfxFillTriangle('],
    [/\.setCursor\s*\(/g, '_a.gfxSetCursor('],
    [/\.setTextColor\s*\(/g, '_a.gfxSetTextColor('],
    [/\.setTextSize\s*\(/g, '_a.gfxSetTextSize('],
    [/\.setTextWrap\s*\(/g, '_a.gfxSetTextWrap('],
    [/\.setRotation\s*\(/g, '_a.gfxSetRotation('],
    [/\.print\s*\(/g, '_a.gfxPrint('],
    [/\.println\s*\(/g, '_a.gfxPrintln('],
    [/\.width\s*\(\s*\)/g, '_a.gfxWidth()'],
    [/\.height\s*\(\s*\)/g, '_a.gfxHeight()'],
    [/\.getRotation\s*\(\s*\)/g, '_a. gfxGetRotation()'],

  ],

  // Runtime functions — merged into _a object
  runtime: function (self) {
    return {
      _gfxDrawPixel: function (x, y, color) {
        self._serialLog('[Adafruit_GFX] drawPixel(' + x + ', ' + y + ', 0x' + color.toString(16) + ')\n', 'system');
      },
      _gfxDrawLine: function (x0, y0, x1, y1, color) {
        self._serialLog('[Adafruit_GFX] drawLine(' + x0 + ',' + y0 + ' -> ' + x1 + ',' + y1 + ')\n', 'system');
      },
      _gfxDrawFastHLine: function (x, y, w, color) {
        self._serialLog('[Adafruit_GFX] drawFastHLine(' + x + ', ' + y + ', w=' + w + ')\n', 'system');
      },
      _gfxDrawFastVLine: function (x, y, h, color) {
        self._serialLog('[Adafruit_GFX] drawFastVLine(' + x + ', ' + y + ', h=' + h + ')\n', 'system');
      },
      _gfxDrawRect: function (x, y, w, h, color) {
        self._serialLog('[Adafruit_GFX] drawRect(' + x + ', ' + y + ', ' + w + 'x' + h + ')\n', 'system');
      },
      _gfxFillRect: function (x, y, w, h, color) {
        self._serialLog('[Adafruit_GFX] fillRect(' + x + ', ' + y + ', ' + w + 'x' + h + ')\n', 'system');
      },
      _gfxFillScreen: function (color) {
        self._serialLog('[Adafruit_GFX] fillScreen(0x' + color.toString(16) + ')\n', 'system');
      },
      _gfxDrawCircle: function (x0, y0, r, color) {
        self._serialLog('[Adafruit_GFX] drawCircle(' + x0 + ', ' + y0 + ', r=' + r + ')\n', 'system');
      },
      _gfxFillCircle: function (x0, y0, r, color) {
        self._serialLog('[Adafruit_GFX] fillCircle(' + x0 + ', ' + y0 + ', r=' + r + ')\n', 'system');
      },
      _gfxDrawTriangle: function (x0, y0, x1, y1, x2, y2, color) {
        self._serialLog('[Adafruit_GFX] drawTriangle()\n', 'system');
      },
      _gfxFillTriangle: function (x0, y0, x1, y1, x2, y2, color) {
        self._serialLog('[Adafruit_GFX] fillTriangle()\n', 'system');
      },
      _gfxSetCursor: function (x, y) {
        if (this._gfxState) {
          this._gfxState.cursorX = x;
          this._gfxState.cursorY = y;
        }
      },
      _gfxSetTextColor: function (c, bg) {
        if (this._gfxState) {
          this._gfxState.textColor = c;
          if (bg !== undefined) this._gfxState.textBgColor = bg;
        }
      },
      _gfxSetTextSize: function (s) {
        if (this._gfxState) this._gfxState.textSize = s;
      },
      _gfxSetTextWrap: function (w) {
        if (this._gfxState) this._gfxState.wrap = !!w;
      },
      _gfxSetRotation: function (r) {
        if (this._gfxState) this._gfxState.rotation = r & 3;
      },
      _gfxPrint: function (msg) {
        self._serialLog('[Adafruit_GFX Print] ' + msg, 'system');
      },
      _gfxPrintln: function (msg) {
        self._serialLog('[Adafruit_GFX Print] ' + (msg !== undefined ? msg : '') + '\n', 'system');
      },
      _gfxWidth: function () {
        return this._gfxState ? this._gfxState.width : 128;
      },
      _gfxHeight: function () {
        return this._gfxState ? this._gfxState.height : 64;
      },
      _gfxGetRotation: function () {
        return this._gfxState ? this._gfxState.rotation : 0;
      }
    };
  },

  // Constructor — returns GFX state and instance methods
  constructor: function (args) {
    var width = args && args[0] !== undefined ? args[0] : 128;
    var height = args && args[1] !== undefined ? args[1] : 64;

    return {
      _gfxState: {
        width: width,
        height: height,
        cursorX: 0,
        cursorY: 0,
        textColor: 0xFFFF,
        textBgColor: 0x0000,
        textSize: 1,
        wrap: true,
        rotation: 0
      },
      drawPixel: function (x, y, color) { },
      drawLine: function (x0, y0, x1, y1, color) { },
      drawFastHLine: function (x, y, w, color) { },
      drawFastVLine: function (x, y, h, color) { },
      drawRect: function (x, y, w, h, color) { },
      fillRect: function (x, y, w, h, color) { },
      fillScreen: function (color) { },
      drawCircle: function (x0, y0, r, color) { },
      fillCircle: function (x0, y0, r, color) { },
      drawTriangle: function (x0, y0, x1, y1, x2, y2, color) { },
      fillTriangle: function (x0, y0, x1, y1, x2, y2, color) { },
      setCursor: function (x, y) { this._gfxState.cursorX = x; this._gfxState.cursorY = y; },
      setTextColor: function (c, bg) { this._gfxState.textColor = c; },
      setTextSize: function (s) { this._gfxState.textSize = s; },
      setTextWrap: function (w) { this._gfxState.wrap = !!w; },
      setRotation: function (r) { this._gfxState.rotation = r & 3; },
      print: function (msg) { },
      println: function (msg) { },
      width: function () { return this._gfxState.width; },
      height: function () { return this._gfxState.height; },
      getRotation: function () { return this._gfxState.rotation; }
    };
  },

  // Standard 16-bit 565 color constants
  constants: {
    ST77XX_BLACK: 0x0000,
    ST77XX_WHITE: 0xFFFF,
    ST77XX_RED: 0xF800,
    ST77XX_GREEN: 0x07E0,
    ST77XX_BLUE: 0x001F,
    ST77XX_CYAN: 0x07FF,
    ST77XX_MAGENTA: 0xF81F,
    ST77XX_YELLOW: 0xFFE0,
    ST77XX_ORANGE: 0xFC00,
    GFX_BLACK: 0x0000,
    GFX_WHITE: 0xFFFF,
    GFX_RED: 0xF800,
    GFX_GREEN: 0x07E0,
    GFX_BLUE: 0x001F,
  },
};