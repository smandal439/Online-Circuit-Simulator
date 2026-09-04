/**
 * Wire (I2C) Library Plugin for ArduSim
 *
 * Provides I2C simulation with MPU6050 (0x68) register emulation.
 * Supports: begin, requestFrom, beginTransmission, endTransmission, write, read, available.
 *
 * Usage in Arduino code:
 *   #include <Wire.h>
 *   Wire.begin();
 *   Wire.beginTransmission(0x68);
 *   Wire.write(0x00);
 *   Wire.endTransmission();
 *   Wire.requestFrom(0x68, 2);
 *   while (Wire.available()) {
 *     byte b = Wire.read();
 *   }
 */
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['Wire'] = {
  classes: [],

  transpile: [
    [/\bWire\.begin\s*\(/g, '_a.wireBegin('],
    [/\bWire\.requestFrom\s*\(/g, '_a.wireRequestFrom('],
    [/\bWire\.beginTransmission\s*\(/g, '_a.wireBeginTransmission('],
    [/\bWire\.endTransmission\s*\(/g, '_a.wireEndTransmission('],
    [/\bWire\.write\s*\(/g, '_a.wireWrite('],
    [/\bWire\.read\s*\(/g, '_a.wireRead('],
    [/\bWire\.available\s*\(/g, '_a.wireAvailable('],
  ],

  runtime: function(self) {
    return {
      wireBegin: function() { self._serialLog('[Wire] I2C begin\n', 'system'); },
      wireBeginTransmission: function(addr) {
        self._wireTxAddr = Number(addr) || 0;
      },
      wireWrite: function(val) {
        if (self._wireTxAddr === 0x68) self._wireRegPtr = Number(val) & 0xFF;
        return 1;
      },
      wireEndTransmission: function() {
        self._wireTxAddr = null;
        return 0;
      },
      wireRequestFrom: function(addr, qty) {
        qty = Number(qty) || 0;
        if ((Number(addr) || 0) === 0x68) {
          self._wireRxQueue = self._mpuReadRegs(self._wireRegPtr ?? 0x3B, qty);
        } else {
          self._wireRxQueue = [];
        }
        return qty;
      },
      wireRead: function() {
        return (self._wireRxQueue && self._wireRxQueue.length) ? self._wireRxQueue.shift() : 0;
      },
      wireAvailable: function() { return (self._wireRxQueue && self._wireRxQueue.length) || 0; },
    };
  },

  constants: {},
};
