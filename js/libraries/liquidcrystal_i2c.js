window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['LiquidCrystal_I2C'] = {
  classes: ['LiquidCrystal_I2C'],
  includes: ['<LiquidCrystal_I2C.h>'],
  priority: 98,
  transpile: [
    // init()/begin(): universal dispatcher — only exclude objects with independent begin handling
    [/(\w+)\.init\(\)/g, function(m, v) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdBegin(' + v + ')'; }],
    [/(\w+)\.init\((\w+),\s*(\w+)\)/g, function(m, v, a, b) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdBegin(' + v + ', ' + a + ', ' + b + ')'; }],
    [/(\w+)\.begin\(\)/g, function(m, v) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdBegin(' + v + ')'; }],
    [/(\w+)\.begin\((\w+),\s*(\w+)\)/g, function(m, v, a, b) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdBegin(' + v + ', ' + a + ', ' + b + ')'; }],
    // setCursor: LCD-specific
    [/(\w+)\.setCursor\((\w+),\s*(\w+)\)/g, function(m, v, a, b) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdSetCursor(' + v + ', ' + a + ', ' + b + ')'; }],
    // print/println: exclude Serial, Wire, SPI, WiFi, client, http, stream, server, SoftwareSerial
    [/(\w+)\.print\(([^)]*)\)/g, function(m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdPrint(' + v + ', ' + a + ')'; }],
    [/(\w+)\.println\(([^)]*)\)/g, function(m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdPrintln(' + v + ', ' + a + ')'; }],
    // clear/home: exclude things that have their own clear
    [/(\w+)\.clear\(\)/g, function(m, v) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdClear(' + v + ')'; }],
    [/(\w+)\.home\(\)/g, function(m, v) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdHome(' + v + ')'; }],
    // write: exclude Serial, Wire, SPI, WiFi, Servo, client, http, stream, server, SoftwareSerial
    [/(\w+)\.write\(([^)]*)\)/g, function(m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|Servo|client|http|stream|server|SoftwareSerial|Serial2|Serial1)$/i.test(v)) return m; return '_a.lcdWrite(' + v + ', ' + a + ')'; }],
    [/(\w+)\.backlight\(\)/g, '/* $1.backlight() */'],
    [/(\w+)\.noBacklight\(\)/g, '/* $1.noBacklight() */'],
  ],
  constants: {},
  constructor: function(addr, cols, rows) {
    return { __class: 'LiquidCrystal_I2C', addr: addr, cols: cols, rows: rows };
  },

  runtime: function(self) { return {}; },
};
