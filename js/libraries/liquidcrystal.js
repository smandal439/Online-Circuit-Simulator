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

  constructor: function() {
    return {
      _lcdBegin: function() {},
      _lcdSetCursor: function() {},
      _lcdPrint: function() {},
      _lcdPrintln: function() {},
      _lcdClear: function() {},
      _lcdHome: function() {},
      _lcdWrite: function() {},
      _lcdNoDisplay: function() {},
      _lcdDisplay: function() {},
      _lcdNoBlink: function() {},
      _lcdBlink: function() {},
      _lcdNoCursor: function() {},
      _lcdCursor: function() {},
      _lcdScrollDisplayLeft: function() {},
      _lcdScrollDisplayRight: function() {},
      _lcdAutoscroll: function() {},
      _lcdNoAutoscroll: function() {},
      _lcdLeftToRight: function() {},
      _lcdRightToLeft: function() {},
      _lcdCreateChar: function() {},
    };
  },
};
