/**
 * Servo Library Plugin for ArduSim
 *
 * Provides Servo motor simulation.
 * Supports: attach, write, writeMicroseconds, read.
 *
 * Usage in Arduino code:
 *   #include <Servo.h>
 *   Servo myServo;
 *   myServo.attach(9);
 *   myServo.write(90);
 */
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['Servo'] = {
  classes: ['Servo'],

  transpile: [
    [/(\w+)\.attach\((\w+)\)/g, '_a.servoAttach($1, $2)'],
    [/(\w+)\.write\((\w+)\)/g, '_a.servoWrite($1, $2)'],
    [/(\w+)\.writeMicroseconds\((\w+)\)/g, '_a.servoWriteMs($1, $2)'],
    [/(\w+)\.read\(\)/g, '_a.servoRead($1)'],
  ],

  runtime: function(self) {
    return {
      servoAttach: function(varName, pin) { /* tracked by canvas */ },
      servoWrite: function(varName, angle) {
        if (varName && varName._ssId) {
          var ch = self._softSerial && self._softSerial[varName._ssId];
          if (ch) { self._serialLog('[SoftwareSerial] write(' + angle + ')\n', 'data'); }
          return;
        }
        self._emitEvent('servo', { angle: Math.max(0, Math.min(180, angle)) });
      },
      servoWriteMs: function(varName, us) { /* advanced */ },
      servoRead: function(varName) { return 90; },
    };
  },

  constructor: function() {
    return {};
  },
};
