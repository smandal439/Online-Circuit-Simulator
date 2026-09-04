/**
 * LiquidCrystal Library Plugin for ArduSim
 * 
 * Classic HD44780 character LCD (direct pin connection).
 * Usage: LiquidCrystal lcd(RS, EN, D4, D5, D6, D7);
 */
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['LiquidCrystal'] = {
  classes: ['LiquidCrystal'],

  transpile: [
    [/\.begin\s*\(\s*\)/g, '._lcdBegin()'],
    [/\.begin\s*\(/g, '._lcdBegin('],
    [/\.setCursor\s*\(/g, '._lcdSetCursor('],
    [/\.print\s*\(/g, '._lcdPrint('],
    [/\.println\s*\(/g, '._lcdPrintln('],
    [/\.clear\s*\(\s*\)/g, '._lcdClear()'],
    [/\.home\s*\(\s*\)/g, '._lcdHome()'],
    [/\.write\s*\(/g, '._lcdWrite('],
    [/\.noDisplay\s*\(\s*\)/g, '._lcdNoDisplay()'],
    [/\.display\s*\(\s*\)/g, '._lcdDisplay()'],
    [/\.noBlink\s*\(\s*\)/g, '._lcdNoBlink()'],
    [/\.blink\s*\(\s*\)/g, '._lcdBlink()'],
    [/\.noCursor\s*\(\s*\)/g, '._lcdNoCursor()'],
    [/\.cursor\s*\(\s*\)/g, '._lcdCursor()'],
    [/\.scrollDisplayLeft\s*\(\s*\)/g, '._lcdScrollDisplayLeft()'],
    [/\.scrollDisplayRight\s*\(\s*\)/g, '._lcdScrollDisplayRight()'],
    [/\.autoscroll\s*\(\s*\)/g, '._lcdAutoscroll()'],
    [/\.noAutoscroll\s*\(\s*\)/g, '._lcdNoAutoscroll()'],
    [/\.leftToRight\s*\(\s*\)/g, '._lcdLeftToRight()'],
    [/\.rightToLeft\s*\(\s*\)/g, '._lcdRightToLeft()'],
    [/\.createChar\s*\(/g, '._lcdCreateChar('],
  ],

  constructor: null,

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
