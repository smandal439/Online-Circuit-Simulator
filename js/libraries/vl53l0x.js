window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['Adafruit_VL53L0X'] = {
  classes: ['Adafruit_VL53L0X'],
  includes: ['<Adafruit_VL53L0X.h>'],
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
  constructor: function() {
    return { __vl53l0x: true };
  },

  runtime: function(self) {
    return {
      vl53l0xRangingTest: function(varName, measure, debug) {
        var dist = 100;
        try {
          var cc = window.CircuitCanvas;
          if (cc && cc.components) {
            var vl = cc.components.find(function(c) { return c.type === 'vl53l0x'; });
            if (vl) dist = Number(vl.runtimeState && vl.runtimeState.distance !== undefined ? vl.runtimeState.distance : (vl.props && vl.props.distance !== undefined ? vl.props.distance : 100));
          }
        } catch (e) { }
        if (measure) {
          measure.RangeStatus = dist > 0 ? 0 : 4;
          measure.RangeMilliMeter = dist;
        }
        if (debug) {
          self._serialLog('[VL53L0X] Range: ' + dist + 'mm (status=' + (measure ? measure.RangeStatus : 4) + ')\n', 'system');
        }
      },
    };
  },
};
