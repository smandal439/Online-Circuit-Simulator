window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['Adafruit_VL53L0X'] = {
  classes: ['Adafruit_VL53L0X'],
  transpile: [
    [/\bAdafruit_VL53L0X\s+(\w+)\s*=\s*Adafruit_VL53L0X\s*\(\s*\)/g, 'var $1 = _a.Adafruit_VL53L0X()'],
    [/\bAdafruit_VL53L0X\s+(\w+)\s*\(\s*\)/g, 'var $1 = _a.Adafruit_VL53L0X()'],
    [/\bVL53L0X_RangingMeasurementData_t\s+(\w+)\s*;/g, 'let $1 = { RangeStatus: 0, RangeMilliMeter: 0 };'],
    [/\b(\w+)\.rangingTest\s*\(([^)]+)\)/g, function (match, varName, args) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.vl53l0xRangingTest(' + varName + ', ' + args.replace(/&\s*/g, '') + ')';
    }],
  ],
  constants: {},
};
