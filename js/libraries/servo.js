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
  includes: ['<Servo.h>'],

  transpile: [
    [/(\w+)\.attach\((\w+)\)/g, function(m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|SoftwareSerial)$/i.test(v)) return m; return '_a.servoAttach(' + v + ', ' + a + ')'; }],
    [/(\w+)\.write\((\w+)\)/g, function(m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|SoftwareSerial)$/i.test(v)) return m; return '_a.servoWrite(' + v + ', ' + a + ')'; }],
    [/(\w+)\.writeMicroseconds\((\w+)\)/g, function(m, v, a) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|SoftwareSerial)$/i.test(v)) return m; return '_a.servoWriteMs(' + v + ', ' + a + ')'; }],
    [/(\w+)\.read\(\)/g, function(m, v) { if (/^(Serial|Wire|SPI|EEPROM|WiFi|SoftwareSerial)$/i.test(v)) return m; return '_a.servoRead(' + v + ')'; }],
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
