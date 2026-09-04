/**
 * NewPing Library Plugin for ArduSim
 *
 * Provides ultrasonic distance sensor simulation.
 */
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['NewPing'] = {
  classes: ['NewPing'],
  includes: ['<NewPing.h>'],

  transpile: [
    [/\bNewPing\s+(\w+)\s*\(([^)]+)\)/g, 'var $1 = _a.newPingNew($2)'],
    [/\b(\w+)\.ping_cm\s*\(\s*\)/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.newPingCm(' + varName + ')';
    }],
    [/\b(\w+)\.ping_in\s*\(\s*\)/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.newPingInch(' + varName + ')';
    }],
    [/\b(\w+)\.ping_median\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.newPingMedian(' + varName + ', ';
    }],
    [/\b(\w+)\.ping\s*\(\s*\)/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.newPingPing(' + varName + ')';
    }],
  ],

  runtime: function(self) {
    var rt = {
      newPingNew: function(triggerPin, echoPin, maxDistance) {
        var id = '_ping_' + triggerPin + '_' + echoPin;
        self._pings = self._pings || {};
        self._pings[id] = { triggerPin: triggerPin, echoPin: echoPin, maxDist: maxDistance || 400 };
        return { _pingId: id };
      },
      newPingCm: function(obj) {
        var p = self._pings && self._pings[obj._pingId];
        if (!p) return 0;
        var key = 'pin_' + p.triggerPin;
        var v = self.pinStates[key] || 0;
        return v > 0 ? Math.min(p.maxDist, Math.round(Math.random() * p.maxDist)) : 0;
      },
      newPingInch: function(obj) {
        return Math.round(rt.newPingCm(obj) / 2.54);
      },
      newPingMedian: function(obj, iter) {
        var results = [];
        for (var i = 0; i < (iter || 5); i++) results.push(rt.newPingCm(obj));
        results.sort(function(a, b) { return a - b; });
        return results[Math.floor(results.length / 2)] || 0;
      },
      newPingPing: function(obj) {
        return rt.newPingCm(obj);
      },
    };
    return rt;
  },

  constants: {},
  constructor: function(args) {
    return { trig: args[0] || 0, echo: args[1] || 0, maxDistance: args[2] || 200 };
  },
};
