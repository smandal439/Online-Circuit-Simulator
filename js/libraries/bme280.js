/**
 * SimpleBME280 Library Plugin for ArduSim
 * 
 * Supports: SimpleBME280, BME280 temperature/humidity/pressure sensor
 * Usage:
 *   SimpleBME280 bme;
 *   bme.begin();
 *   float temp = bme.readTemperature();
 *   float hum = bme.readHumidity();
 *   float pres = bme.readPressure();
 *   float alt = bme.readAltitude(1013.25);
 */
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['BME280'] = {
  classes: ['SimpleBME280'],

  transpile: [
    // .begin() — match bme/sensor/bmp/bme280 prefix + class name
    [/\b(\w+)\.begin\s*\(\s*\)\s*;/g, function(m, v) {
      if (/^(bme|sensor|bmp|SimpleBME280)/i.test(v)) return '_a.bme280Begin(' + v + ');';
      return m;
    }],
    // .readTemperature() — with and without semicolon
    [/\b(\w+)\.readTemperature\s*\(\s*\)\s*;/g, function(m, v) {
      if (/^(bme|sensor|bmp|SimpleBME280)/i.test(v)) return '_a.bme280ReadTemp(' + v + ');';
      return m;
    }],
    [/\b(\w+)\.readTemperature\s*\(\s*\)/g, function(m, v) {
      if (/^(bme|sensor|bmp|SimpleBME280)/i.test(v)) return '_a.bme280ReadTemp(' + v + ')';
      return m;
    }],
    // .readHumidity()
    [/\b(\w+)\.readHumidity\s*\(\s*\)\s*;/g, function(m, v) {
      if (/^(bme|sensor|bmp|SimpleBME280)/i.test(v)) return '_a.bme280ReadHum(' + v + ');';
      return m;
    }],
    [/\b(\w+)\.readHumidity\s*\(\s*\)/g, function(m, v) {
      if (/^(bme|sensor|bmp|SimpleBME280)/i.test(v)) return '_a.bme280ReadHum(' + v + ')';
      return m;
    }],
    // .readPressure()
    [/\b(\w+)\.readPressure\s*\(\s*\)\s*;/g, function(m, v) {
      if (/^(bme|sensor|bmp|SimpleBME280)/i.test(v)) return '_a.bme280ReadPres(' + v + ');';
      return m;
    }],
    [/\b(\w+)\.readPressure\s*\(\s*\)/g, function(m, v) {
      if (/^(bme|sensor|bmp|SimpleBME280)/i.test(v)) return '_a.bme280ReadPres(' + v + ')';
      return m;
    }],
    // .readAltitude(seaLevel)
    [/\b(\w+)\.readAltitude\s*\(\s*([^)]+)\)\s*;/g, function(m, v, sl) {
      if (/^(bme|sensor|bmp|SimpleBME280)/i.test(v)) return '_a.bme280ReadAlt(' + v + ', ' + sl + ');';
      return m;
    }],
    [/\b(\w+)\.readAltitude\s*\(\s*([^)]+)\)/g, function(m, v, sl) {
      if (/^(bme|sensor|bmp|SimpleBME280)/i.test(v)) return '_a.bme280ReadAlt(' + v + ', ' + sl + ')';
      return m;
    }],
  ],

  constructor: function() {
    return {
      __class: 'SimpleBME280',
      begin: function() {},
      readTemperature: function() { return 25; },
      readHumidity: function() { return 50; },
      readPressure: function() { return 101325; },
      readAltitude: function(seaLevel) { return 0; },
    };
  },
};
