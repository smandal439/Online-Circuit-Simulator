/**
 * LiquidCrystal Library Plugin for ArduSim
 * 
 * Classic HD44780 character LCD (direct pin connection).
 * Usage: LiquidCrystal lcd(RS, EN, D4, D5, D6, D7);
 */
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['LiquidCrystal'] = {
  classes: ['LiquidCrystal'],
  includes: ['<LiquidCrystal.h>'],
  priority: 100,

  transpile: [
    // begin(digits,digits): LCD only — exclude everything with its own begin
    [/(\w+)\.begin\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/g, function(m, v, a, b) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdBegin(' + v + ', ' + a + ', ' + b + ')'; }],
    // begin(): universal dispatcher — only exclude objects with independent begin handling
    [/(\w+)\.begin\s*\(\s*\)/g, function(m, v) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdBegin(' + v + ')'; }],
    // setCursor: LCD-specific
    [/(\w+)\.setCursor\s*\(([^)]+)\)/g, function(m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdSetCursor(' + v + ', ' + a + ')'; }],
    // print/println: exclude Serial, Wire, SPI, WiFi, client, http, stream, server, SoftwareSerial
    [/(\w+)\.print\s*\(([^)]*)\)/g, function(m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdPrint(' + v + ', ' + a + ')'; }],
    [/(\w+)\.println\s*\(([^)]*)\)/g, function(m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdPrintln(' + v + ', ' + a + ')'; }],
    // clear/home: exclude things that have their own clear
    [/(\w+)\.clear\s*\(\s*\)/g, function(m, v) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdClear(' + v + ')'; }],
    [/(\w+)\.home\s*\(\s*\)/g, function(m, v) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdHome(' + v + ')'; }],
    // write: exclude Serial, Wire, SPI, WiFi, Servo, client, http, stream, server, SoftwareSerial
    [/(\w+)\.write\s*\(([^)]*)\)/g, function(m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|Servo|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdWrite(' + v + ', ' + a + ')'; }],
    [/(\w+)\.noDisplay\s*\(\s*\)/g, '_a.lcdNoDisplay($1)'],
    [/(\w+)\.display\s*\(\s*\)/g, '_a.lcdDisplay($1)'],
    [/(\w+)\.noBlink\s*\(\s*\)/g, '_a.lcdNoBlink($1)'],
    [/(\w+)\.blink\s*\(\s*\)/g, '_a.lcdBlink($1)'],
    [/(\w+)\.noCursor\s*\(\s*\)/g, '_a.lcdNoCursor($1)'],
    [/(\w+)\.cursor\s*\(\s*\)/g, '_a.lcdCursor($1)'],
    [/(\w+)\.scrollDisplayLeft\s*\(\s*\)/g, '_a.lcdScrollDisplayLeft($1)'],
    [/(\w+)\.scrollDisplayRight\s*\(\s*\)/g, '_a.lcdScrollDisplayRight($1)'],
    [/(\w+)\.autoscroll\s*\(\s*\)/g, '_a.lcdAutoscroll($1)'],
    [/(\w+)\.noAutoscroll\s*\(\s*\)/g, '_a.lcdNoAutoscroll($1)'],
    [/(\w+)\.leftToRight\s*\(\s*\)/g, '_a.lcdLeftToRight($1)'],
    [/(\w+)\.rightToLeft\s*\(\s*\)/g, '_a.lcdRightToLeft($1)'],
    [/(\w+)\.createChar\s*\(([^)]*)\)/g, '_a.lcdCreateChar($1, $2)'],
  ],

  constructor: function(rs, en, d4, d5, d6, d7) {
    return { __class: 'LiquidCrystal', rs: rs, en: en, d4: d4, d5: d5, d6: d6, d7: d7 };
  },

  runtime: function(self) {
    return {
      lcdBegin: function(varName, cols, rows) {
        if (varName && varName._ssId) {
          var ch = self._softSerial && self._softSerial[varName._ssId];
          if (ch) { ch.listening = true; ch.baud = cols; }
          self._serialLog('[SoftwareSerial] begin(' + cols + ')\n', 'system');
          return;
        }
        if (varName && varName._npId) { self._serialLog('[NeoPixel] begin\n', 'system'); return; }
        if (varName && varName.__webserver) {
          var cfg = (self._web = self._web || { port: 80, routes: [], reqIdx: 0, lastHit: 0 });
          cfg.port = Number(cols) || cfg.port || 80;
          self._serialLog('[WebServer] HTTP server started on port ' + cfg.port + '\n', 'system');
          return;
        }
        if (varName && varName.__oled) { self._emitEvent('oled_power', { on: true }); return; }
        if (varName && varName.__vl53l0x) { return varName.begin(); }
        if (varName && varName.__tft) { self._emitEvent('tft_power', { on: true }); return; }
        self._emitEvent('lcd_power', { on: true });
      },
      lcdSetCursor: function(varName, col, row) {
        if (varName && varName.__tft) { self._tftCursor = { col: Number(col) || 0, row: Number(row) || 0 }; return; }
        self._lcdCursor = { col: Number(col) || 0, row: Number(row) || 0 };
      },
      lcdPrint: function(varName, val, decimals) {
        if (varName && varName._ssId) {
          var ch = self._softSerial && self._softSerial[varName._ssId];
          if (ch) self._serialLog(String(val) + '\n', 'data');
          return;
        }
        var numericValue = typeof val === 'number' ? val : Number(val);
        var hasNumericValue = typeof val === 'number' || (typeof val === 'string' && val.trim() !== '' && Number.isFinite(numericValue));
        var text = hasNumericValue && Number.isFinite(numericValue) && !Number.isInteger(numericValue)
          ? numericValue.toFixed(Number.isFinite(Number(decimals)) ? Math.max(0, Math.min(6, Number(decimals))) : 2)
          : String(val);
        if (varName && varName.__tft) {
          var tc = self._tftCursor || { col: 0, row: 0 };
          var ts = self._tftTextSize || 1;
          var fg = self._tftFgColor != null ? self._tftFgColor : 0xFFFF;
          var bg = self._tftBgColor != null ? self._tftBgColor : 0x0000;
          self._emitEvent('tft_draw', { op: 'print', text: text, x: tc.col, y: tc.row, size: ts, fg: fg, bg: bg });
          self._tftCursor = { col: tc.col + text.length * 6 * ts, row: tc.row };
          return;
        }
        var cursor = self._lcdCursor || { col: 0, row: 0 };
        if (varName && varName.__oled) {
          var os = self._oledTextSize || 1;
          self._emitEvent('oled_draw', { op: 'print', text: text, cursor: { col: cursor.col, row: cursor.row }, size: os, color: self._oledTextColor === 0 ? 0 : 1 });
          self._lcdCursor = { col: cursor.col + text.length * 6 * os, row: cursor.row };
          return;
        }
        self._emitEvent('lcd_print', { text: text, cursor: { col: cursor.col, row: cursor.row } });
        var col = cursor.col + text.length;
        var row = cursor.row;
        if (col >= 16 && row === 0) { col -= 16; row = 1; }
        if (col >= 16) col = 15;
        self._lcdCursor = { col: col, row: row };
      },
      lcdClear: function(varName) {
        if (varName && varName._npId) {
          var np = self._neopixels && self._neopixels[varName._npId];
          if (np) np.pixels.fill(0);
          return;
        }
        if (varName && varName.__oled) { self._emitEvent('oled_draw', { op: 'clear' }); return; }
        if (varName && varName.__tft) { self._emitEvent('tft_draw', { op: 'fillScreen', color: 0x0000 }); return; }
        self._emitEvent('lcd_clear', {});
      },
      lcdHome: function(varName) { self._lcdCursor = { col: 0, row: 0 }; },
    };
  },
};
