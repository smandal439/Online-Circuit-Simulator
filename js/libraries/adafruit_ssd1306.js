// js/libraries/adafruit_ssd1306.js — Adafruit_SSD1306 128×64 OLED I2C plugin
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['Adafruit_SSD1306'] = {
  classes: ['Adafruit_SSD1306'],
  includes: ['<Adafruit_SSD1306.h>'],

  transpile: [
    // --- SSD1306-specific methods ---
    [/(\w+)\.begin\s*\(([^)]*)\)/g, function (m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.oledBegin(' + v + ', ' + a + ')'; }],
    [/(\w+)\.clearDisplay\s*\(\s*\)/g, function (m, v) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.oledClearDisplay(' + v + ')'; }],
    [/(\w+)\.display\s*\(\s*\)/g, function (m, v) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.oledFlush(' + v + ')'; }],
    [/(\w+)\.invertDisplay\s*\(([^)]*)\)/g, function (m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.oledInvertDisplay(' + v + ', ' + a + ')'; }],
    [/(\w+)\.dim\s*\(([^)]*)\)/g, function (m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.oledDim(' + v + ', ' + a + ')'; }],
    [/(\w+)\.setContrast\s*\(([^)]*)\)/g, function (m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.oledSetContrast(' + v + ', ' + a + ')'; }],

    // --- Adafruit_GFX inherited drawing methods ---
    [/(\w+)\.drawPixel\s*\(([^)]*)\)/g, function (m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.oledDrawPixel(' + v + ', ' + a + ')'; }],
    [/(\w+)\.drawLine\s*\(([^)]*)\)/g, function (m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.oledDrawLine(' + v + ', ' + a + ')'; }],
    [/(\w+)\.drawFastHLine\s*\(([^)]*)\)/g, function (m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.oledDrawFastHLine(' + v + ', ' + a + ')'; }],
    [/(\w+)\.drawFastVLine\s*\(([^)]*)\)/g, function (m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.oledDrawFastVLine(' + v + ', ' + a + ')'; }],
    [/(\w+)\.drawRect\s*\(([^)]*)\)/g, function (m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.oledDrawRect(' + v + ', ' + a + ')'; }],
    [/(\w+)\.fillRect\s*\(([^)]*)\)/g, function (m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.oledFillRect(' + v + ', ' + a + ')'; }],
    [/(\w+)\.fillScreen\s*\(([^)]*)\)/g, function (m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.oledFillScreen(' + v + ', ' + a + ')'; }],
    [/(\w+)\.drawCircle\s*\(([^)]*)\)/g, function (m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.oledDrawCircle(' + v + ', ' + a + ')'; }],
    [/(\w+)\.fillCircle\s*\(([^)]*)\)/g, function (m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.oledFillCircle(' + v + ', ' + a + ')'; }],
    [/(\w+)\.drawTriangle\s*\(([^)]*)\)/g, function (m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.oledDrawTriangle(' + v + ', ' + a + ')'; }],
    [/(\w+)\.fillTriangle\s*\(([^)]*)\)/g, function (m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.oledFillTriangle(' + v + ', ' + a + ')'; }],
    [/(\w+)\.drawRoundRect\s*\(([^)]*)\)/g, function (m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.oledDrawRoundRect(' + v + ', ' + a + ')'; }],
    [/(\w+)\.fillRoundRect\s*\(([^)]*)\)/g, function (m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.oledFillRoundRect(' + v + ', ' + a + ')'; }],

    // --- Adafruit_GFX inherited text methods ---
    [/(\w+)\.setCursor\s*\(([^)]*)\)/g, function (m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1|dht)$/i.test(v)) return m; return '_a.oledSetCursor(' + v + ', ' + a + ')'; }],
    [/(\w+)\.setTextColor\s*\(([^)]*)\)/g, function (m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1|dht)$/i.test(v)) return m; return '_a.oledSetTextColor(' + v + ', ' + a + ')'; }],
    [/(\w+)\.setTextSize\s*\(([^)]*)\)/g, function (m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1|dht)$/i.test(v)) return m; return '_a.oledSetTextSize(' + v + ', ' + a + ')'; }],
    [/(\w+)\.setTextWrap\s*\(([^)]*)\)/g, function (m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1|dht)$/i.test(v)) return m; return '_a.oledSetTextWrap(' + v + ', ' + a + ')'; }],
    [/(\w+)\.setRotation\s*\(([^)]*)\)/g, function (m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1|dht)$/i.test(v)) return m; return '_a.oledSetRotation(' + v + ', ' + a + ')'; }],
    // --- print / println (exclude Serial, Wire, etc.) ---
    [/(\w+)\.print\s*\(([^)]*)\)/g, function (m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.oledPrint(' + v + ', ' + a + ')'; }],
    [/(\w+)\.println\s*\(([^)]*)\)/g, function (m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.oledPrintln(' + v + ', ' + a + ')'; }],
    // --- width / height / getRotation ---
    [/(\w+)\.width\s*\(\s*\)/g, function (m, v) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1|dht)$/i.test(v)) return m; return '_a.oledWidth(' + v + ')'; }],
    [/(\w+)\.height\s*\(\s*\)/g, function (m, v) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1|dht)$/i.test(v)) return m; return '_a.oledHeight(' + v + ')'; }],
    [/(\w+)\.getRotation\s*\(\s*\)/g, function (m, v) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1|dht)$/i.test(v)) return m; return '0'; }],
  ],

  constants: {
    SSD1306_SWITCHCAPVCC: 0x01,
    SSD1306_EXTERNALVCC: 0x02,
    SSD1306_I2C_ADDRESS: 0x3C,
    SSD1306_WHITE: 1,
    SSD1306_BLACK: 0,
    SSD1306_SETCONTRAST: 0x81,
    SSD1306_SETVCOMDETECT: 0xDB,
  },

  constructor: function (width, height, wire, reset) {
    return { __oled: true, width: width || 128, height: height || 64, wire: wire, reset: reset, addr: 0x3C };
  },

  runtime: function (self) {
    var _oledCursor = { x: 0, y: 0 };
    var _oledTextSize = 1;
    var _oledTextColor = SSD1306_WHITE || 1;
    var _oledTextWrap = true;

    function emit(addr, data) { self._emitEvent('oled_draw', data); }

    return {
      oledBegin: function (v, mode, addr) {
        if (addr !== undefined) v.addr = Number(addr) || 0x3C;
        self._emitEvent('oled_power', { addr: v.addr });
      },
      oledClearDisplay: function (v) {
        emit(v.addr, { op: 'clear', addr: v.addr });
      },
      oledFlush: function (v) {
        // In the simulator, framebuffer updates are immediate — no-op
      },
      oledInvertDisplay: function (v, flag) {
        emit(v.addr, { op: 'invert', invert: !!flag, addr: v.addr });
      },
      oledDim: function (v, flag) {
        emit(v.addr, { op: 'dim', dimmed: !!flag, addr: v.addr });
      },
      oledSetContrast: function (v, val) {
        emit(v.addr, { op: 'contrast', contrast: Number(val) || 0, addr: v.addr });
      },

      // --- Drawing ---
      oledDrawPixel: function (v, x, y, color) {
        emit(v.addr, { op: 'pixel', x: Number(x) || 0, y: Number(y) || 0, color: color !== undefined ? Number(color) : 1, addr: v.addr });
      },
      oledDrawLine: function (v, x0, y0, x1, y1, color) {
        emit(v.addr, { op: 'line', x0: Number(x0) || 0, y0: Number(y0) || 0, x1: Number(x1) || 0, y1: Number(y1) || 0, color: color !== undefined ? Number(color) : 1, addr: v.addr });
      },
      oledDrawFastHLine: function (v, x, y, w, color) {
        emit(v.addr, { op: 'line', x0: Number(x) || 0, y0: Number(y) || 0, x1: (Number(x) || 0) + (Number(w) || 0) - 1, y1: Number(y) || 0, color: color !== undefined ? Number(color) : 1, addr: v.addr });
      },
      oledDrawFastVLine: function (v, x, y, h, color) {
        emit(v.addr, { op: 'line', x0: Number(x) || 0, y0: Number(y) || 0, x1: Number(x) || 0, y1: (Number(y) || 0) + (Number(h) || 0) - 1, color: color !== undefined ? Number(color) : 1, addr: v.addr });
      },
      oledDrawRect: function (v, x, y, w, h, color) {
        emit(v.addr, { op: 'rect', x: Number(x) || 0, y: Number(y) || 0, w: Number(w) || 0, h: Number(h) || 0, color: color !== undefined ? Number(color) : 1, addr: v.addr });
      },
      oledFillRect: function (v, x, y, w, h, color) {
        emit(v.addr, { op: 'fillRect', x: Number(x) || 0, y: Number(y) || 0, w: Number(w) || 0, h: Number(h) || 0, color: color !== undefined ? Number(color) : 1, addr: v.addr });
      },
      oledFillScreen: function (v, color) {
        emit(v.addr, { op: 'fillScreen', color: color !== undefined ? Number(color) : 1, addr: v.addr });
      },
      oledDrawCircle: function (v, cx, cy, r, color) {
        emit(v.addr, { op: 'circle', x: Number(cx) || 0, y: Number(cy) || 0, r: Number(r) || 0, color: color !== undefined ? Number(color) : 1, addr: v.addr });
      },
      oledFillCircle: function (v, cx, cy, r, color) {
        emit(v.addr, { op: 'fillCircle', x: Number(cx) || 0, y: Number(cy) || 0, r: Number(r) || 0, color: color !== undefined ? Number(color) : 1, addr: v.addr });
      },
      oledDrawTriangle: function (v, x0, y0, x1, y1, x2, y2, color) {
        emit(v.addr, { op: 'triangle', x0: Number(x0) || 0, y0: Number(y0) || 0, x1: Number(x1) || 0, y1: Number(y1) || 0, x2: Number(x2) || 0, y2: Number(y2) || 0, color: color !== undefined ? Number(color) : 1, addr: v.addr });
      },
      oledFillTriangle: function (v, x0, y0, x1, y1, x2, y2, color) {
        emit(v.addr, { op: 'fillTriangle', x0: Number(x0) || 0, y0: Number(y0) || 0, x1: Number(x1) || 0, y1: Number(y1) || 0, x2: Number(x2) || 0, y2: Number(y2) || 0, color: color !== undefined ? Number(color) : 1, addr: v.addr });
      },
      oledDrawRoundRect: function (v, x, y, w, h, r, color) {
        emit(v.addr, { op: 'roundRect', x: Number(x) || 0, y: Number(y) || 0, w: Number(w) || 0, h: Number(h) || 0, r: Number(r) || 0, color: color !== undefined ? Number(color) : 1, addr: v.addr });
      },
      oledFillRoundRect: function (v, x, y, w, h, r, color) {
        emit(v.addr, { op: 'fillRoundRect', x: Number(x) || 0, y: Number(y) || 0, w: Number(w) || 0, h: Number(h) || 0, r: Number(r) || 0, color: color !== undefined ? Number(color) : 1, addr: v.addr });
      },

      // --- Text ---
      oledSetCursor: function (v, x, y) {
        _oledCursor.x = Number(x) || 0;
        _oledCursor.y = Number(y) || 0;
      },
      oledSetTextColor: function (v, fg, bg) {
        _oledTextColor = fg !== undefined ? Number(fg) : 1;
      },
      oledSetTextSize: function (v, s) {
        _oledTextSize = Number(s) || 1;
      },
      oledSetTextWrap: function (v, w) {
        _oledTextWrap = !!w;
      },
      oledSetRotation: function (v, r) {
        // Store rotation but ignore for 128×64 monochrome
      },
      oledPrint: function (v, msg) {
        var text = String(msg !== undefined ? msg : '');
        emit(v.addr, { op: 'print', text: text, cursor: { col: _oledCursor.x, row: _oledCursor.y }, size: _oledTextSize, color: _oledTextColor, addr: v.addr });
        // Advance cursor by text width
        var charW = 6 * _oledTextSize;
        _oledCursor.x += text.length * charW;
      },
      oledPrintln: function (v, msg) {
        var text = String(msg !== undefined ? msg : '');
        emit(v.addr, { op: 'print', text: text, cursor: { col: _oledCursor.x, row: _oledCursor.y }, size: _oledTextSize, color: _oledTextColor, addr: v.addr });
        // Advance to next line
        _oledCursor.x = 0;
        _oledCursor.y += 8 * _oledTextSize;
      },

      oledWidth: function (v) { return v.width || 128; },
      oledHeight: function (v) { return v.height || 64; },
    };
  },
};
