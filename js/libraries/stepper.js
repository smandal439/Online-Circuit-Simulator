/**
 * Stepper Library Plugin for ArduSim
 *
 * Provides Stepper motor simulation with animated coil patterns.
 */
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['Stepper'] = {
  classes: ['Stepper'],
  includes: ['<Stepper.h>'],

  transpile: [
    [/\bStepper\s+(\w+)\s*\(([^)]+)\)/g, 'var $1 = _a.stepperNew($2)'],
    [/\b(\w+)\.setSpeed\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.stepperSetSpeed(' + varName + ', ';
    }],
    [/\b(\w+)\.step\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.stepperStep(' + varName + ', ';
    }],
    [/\b(\w+)\.distanceToGo\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.stepperDistanceToGo(' + varName + ')';
    }],
    [/\b(\w+)\.currentPosition\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.stepperCurrentPosition(' + varName + ')';
    }],
    [/\b(\w+)\.setCurrentPosition\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.stepperSetCurrentPosition(' + varName + ', ';
    }],
    [/\b(\w+)\.run\s*\(\s*\)/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.stepperRun(' + varName + ')';
    }],
    [/\b(\w+)\.runSpeed\s*\(\s*\)/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.stepperRunSpeed(' + varName + ')';
    }],
    [/\b(\w+)\.stop\s*\(\s*\)/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.stepperStop(' + varName + ')';
    }],
    [/\b(\w+)\.disableOutputs\s*\(\s*\)/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.stepperDisableOutputs(' + varName + ')';
    }],
    [/\b(\w+)\.enableOutputs\s*\(\s*\)/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.stepperEnableOutputs(' + varName + ')';
    }],
    [/\b(\w+)\.maxSpeed\s*\(\s*\)/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.stepperMaxSpeed(' + varName + ')';
    }],
    [/\b(\w+)\.acceleration\s*\(\s*\)/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.stepperAcceleration(' + varName + ')';
    }],
    [/\b(\w+)\.setAcceleration\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.stepperSetAcceleration(' + varName + ', ';
    }],
  ],

  runtime: function(self) {
    function _stepperWritePins(s) {
      var seq = [[1, 0, 1, 0], [0, 1, 1, 0], [0, 1, 0, 1], [1, 0, 0, 1]];
      var pat = seq[((s.seqIndex % 4) + 4) % 4];
      var pins = [s.pin1, s.pin2, s.pin3, s.pin4];
      for (var i = 0; i < 4; i++) {
        var p = pins[i];
        if (p == null) continue;
        var key = 'pin_' + p;
        self.pinStates[key] = pat[i];
        self._emitPinChange(key, pat[i]);
      }
    }

    var rt = {
      stepperNew: function(stepsPerRev, p1, p2, p3, p4) {
        var id = '_stepper_' + p1 + '_' + p2;
        self._steppers = self._steppers || {};
        self._steppers[id] = { stepsPerRev: stepsPerRev, pin1: p1, pin2: p2, pin3: p3, pin4: p4, pos: 0, target: 0, speed: 1, accel: 100, seqIndex: 0 };
        self._serialLog('[Stepper] Created stepsPerRev=' + stepsPerRev + ' pins=' + [p1, p2, p3, p4].filter(function(p) { return p != null; }).join(',') + '\n', 'system');
        return { _stepperId: id };
      },
      stepperSetSpeed: function(obj, rpm) {
        var s = self._steppers && self._steppers[obj._stepperId];
        if (s) s.speed = Number(rpm) || 1;
      },
      stepperDistanceToGo: function(obj) {
        var s = self._steppers && self._steppers[obj._stepperId];
        return s ? s.target - s.pos : 0;
      },
      stepperCurrentPosition: function(obj) {
        var s = self._steppers && self._steppers[obj._stepperId];
        return s ? s.pos : 0;
      },
      stepperSetCurrentPosition: function(obj, pos) {
        var s = self._steppers && self._steppers[obj._stepperId];
        if (s) s.pos = s.target = Number(pos) || 0;
      },
      stepperRun: function(obj) {
        var s = self._steppers && self._steppers[obj._stepperId];
        if (!s) return false;
        if (s.pos === s.target) return false;
        var dir = s.pos < s.target ? 1 : -1;
        s.seqIndex += dir;
        s.pos += dir;
        _stepperWritePins(s);
        return true;
      },
      stepperRunSpeed: function(obj) {
        return rt.stepperRun(obj);
      },
      stepperStop: function(obj) {
        var s = self._steppers && self._steppers[obj._stepperId];
        if (s) s.target = s.pos;
      },
      stepperDisableOutputs: function(obj) { },
      stepperEnableOutputs: function(obj) { },
      stepperMaxSpeed: function(obj) {
        var s = self._steppers && self._steppers[obj._stepperId];
        return s ? s.speed : 0;
      },
      stepperAcceleration: function(obj) {
        var s = self._steppers && self._steppers[obj._stepperId];
        return s ? s.accel : 0;
      },
      stepperSetAcceleration: function(obj, accel) {
        var s = self._steppers && self._steppers[obj._stepperId];
        if (s) s.accel = Number(accel) || 100;
      },
    };

    rt.stepperStep = async function(obj, steps) {
      var s = self._steppers && self._steppers[obj._stepperId];
      var n = Math.round(Number(steps)) || 0;
      if (!s || n === 0) return;
      var rpm = Math.max(Math.abs(s.speed) || 1, 0.01);
      var intervalRealMs = 60000 / ((Number(s.stepsPerRev) || 2048) * rpm);
      var dir = n > 0 ? 1 : -1;
      s.target = s.pos + n;
      for (var i = 0; i < Math.abs(n); i++) {
        if (!self.isRunning) return;
        s.seqIndex += dir;
        s.pos += dir;
        _stepperWritePins(s);
        try {
          await self._delayPromise(intervalRealMs / (self.speed || 1));
        } catch (e) { return; }
      }
      self._serialLog('[Stepper] step(' + n + ') -> pos=' + s.pos + '\n', 'system');
    };

    return rt;
  },

  constants: {},
  constructor: function(args) {
    return { stepsPerRev: args[0] || 200, pin1: args[1] || 0, pin2: args[2] || 0, pin3: args[3] || 0, pin4: args[4] || 0 };
  },
};
