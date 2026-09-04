window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['LiquidCrystal_I2C'] = {
  classes: ['LiquidCrystal_I2C'],
  transpile: [
    [/(\w+)\.begin\(\)/g, '_a.lcdBegin($1)'],
    [/(\w+)\.begin\((\w+),\s*(\w+)\)/g, '_a.lcdBegin($1, $2, $3)'],
    [/(\w+)\.setCursor\((\w+),\s*(\w+)\)/g, '_a.lcdSetCursor($1, $2, $3)'],
    [/(\w+)\.print\((\w+)\)/g, '_a.lcdPrint($1, $2)'],
    [/(\w+)\.clear\(\)/g, '_a.lcdClear($1)'],
    [/(\w+)\.home\(\)/g, '_a.lcdHome($1)'],
  ],
  constants: {},
  constructor: null,

  runtime: function(self) { return {}; },
};
