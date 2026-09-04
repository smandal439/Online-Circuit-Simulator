/**
 * Wire (I2C) Library Plugin for ArduSim
 *
 * Provides I2C simulation.
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
  classes: [],  // Wire is a singleton, not instantiated

  transpile: [
    // Wire.begin() → _a.wireBegin()
    [/\bWire\.begin\s*\(/g, '_a.wireBegin('],
    // Wire.requestFrom() → _a.wireRequestFrom()
    [/\bWire\.requestFrom\s*\(/g, '_a.wireRequestFrom('],
    // Wire.beginTransmission() → _a.wireBeginTransmission()
    [/\bWire\.beginTransmission\s*\(/g, '_a.wireBeginTransmission('],
    // Wire.endTransmission() → _a.wireEndTransmission()
    [/\bWire\.endTransmission\s*\(/g, '_a.wireEndTransmission('],
    // Wire.write() → _a.wireWrite()
    [/\bWire\.write\s*\(/g, '_a.wireWrite('],
    // Wire.read() → _a.wireRead()
    [/\bWire\.read\s*\(/g, '_a.wireRead('],
    // Wire.available() → _a.wireAvailable()
    [/\bWire\.available\s*\(/g, '_a.wireAvailable('],
  ],

  constants: {},
  // No constructor needed - Wire is a global singleton
};
