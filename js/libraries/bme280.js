window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['BME280'] = {
  classes: ['SimpleBME280'],
  transpile: [
    [/\b(\w+)\.begin\s*\(\s*\)\s*;/g, function(m, v) {
      if (/^(bme|sensor|bmp)/i.test(v)) return '_a.bme280Begin(' + v + ');';
      return m;
    }],
    [/\b(\w+)\.readTemperature\s*\(\s*\)\s*;/g, function(m, v) {
      if (/^(bme|sensor|bmp)/i.test(v)) return '_a.bme280ReadTemp(' + v + ');';
      return m;
    }],
    [/\b(\w+)\.readTemperature\s*\(\s*\)/g, function(m, v) {
      if (/^(bme|sensor|bmp)/i.test(v)) return '_a.bme280ReadTemp(' + v + ')';
      return m;
    }],
    [/\b(\w+)\.readHumidity\s*\(\s*\)\s*;/g, function(m, v) {
      if (/^(bme|sensor|bmp)/i.test(v)) return '_a.bme280ReadHum(' + v + ');';
      return m;
    }],
    [/\b(\w+)\.readHumidity\s*\(\s*\)/g, function(m, v) {
      if (/^(bme|sensor|bmp)/i.test(v)) return '_a.bme280ReadHum(' + v + ')';
      return m;
    }],
    [/\b(\w+)\.readPressure\s*\(\s*\)\s*;/g, function(m, v) {
      if (/^(bme|sensor|bmp)/i.test(v)) return '_a.bme280ReadPres(' + v + ');';
      return m;
    }],
    [/\b(\w+)\.readPressure\s*\(\s*\)/g, function(m, v) {
      if (/^(bme|sensor|bmp)/i.test(v)) return '_a.bme280ReadPres(' + v + ')';
      return m;
    }],
    [/\b(\w+)\.readAltitude\s*\(\s*([^)]+)\)\s*;/g, function(m, v, sl) {
      if (/^(bme|sensor|bmp)/i.test(v)) return '_a.bme280ReadAlt(' + v + ', ' + sl + ');';
      return m;
    }],
    [/\b(\w+)\.readAltitude\s*\(\s*([^)]+)\)/g, function(m, v, sl) {
      if (/^(bme|sensor|bmp)/i.test(v)) return '_a.bme280ReadAlt(' + v + ', ' + sl + ')';
      return m;
    }],
  ],
  constants: {},
  constructor: function(args) { return {}; },
};
