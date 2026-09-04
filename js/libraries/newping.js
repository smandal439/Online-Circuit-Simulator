window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['NewPing'] = {
  classes: ['NewPing'],
  transpile: [
    [/\bNewPing\s+(\w+)\s*\(([^)]+)\)/g, 'var $1 = _a.newPingNew($2)'],
    [/\b(\w+)\.ping_cm\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.newPingCm(' + varName + ')';
    }],
    [/\b(\w+)\.ping_in\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.newPingInch(' + varName + ')';
    }],
    [/\b(\w+)\.ping_median\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.newPingMedian(' + varName + ', ';
    }],
    [/\b(\w+)\.ping\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.newPingPing(' + varName + ')';
    }],
  ],
  constants: {},
  constructor: function (args) {
    return { trig: args[0] || 0, echo: args[1] || 0, maxDistance: args[2] || 200 };
  },
};
