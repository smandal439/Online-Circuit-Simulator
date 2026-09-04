/**
 * EEPROM Library Plugin for ArduSim
 *
 * Provides EEPROM simulation.
 * Supports: read, write, update, get, put, begin, commit, length.
 *
 * Usage in Arduino code:
 *   #include <EEPROM.h>
 *   EEPROM.begin(512);
 *   EEPROM.write(addr, val);
 *   EEPROM.read(addr);
 *   EEPROM.update(addr, val);
 *   EEPROM.get(addr, data);
 *   EEPROM.put(addr, data);
 *   EEPROM.commit();
 */
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['EEPROM'] = {
  classes: [],

  transpile: [
    // EEPROM.read() → _a.eepromRead()
    [/\bEEPROM\.read\s*\(/g, '_a.eepromRead('],
    // EEPROM.write() → _a.eepromWrite()
    [/\bEEPROM\.write\s*\(/g, '_a.eepromWrite('],
    // EEPROM.update() → _a.eepromUpdate()
    [/\bEEPROM\.update\s*\(/g, '_a.eepromUpdate('],
    // EEPROM.get() → _a.eepromGet()
    [/\bEEPROM\.get\s*\(/g, '_a.eepromGet('],
    // EEPROM.put() → _a.eepromPut()
    [/\bEEPROM\.put\s*\(/g, '_a.eepromPut('],
    // EEPROM.begin() → _a.eepromBegin()
    [/\bEEPROM\.begin\s*\(/g, '_a.eepromBegin('],
    // EEPROM.commit() → _a.eepromCommit()
    [/\bEEPROM\.commit\s*\(/g, '_a.eepromCommit('],
    // EEPROM.length → 512
    [/\bEEPROM\.length\b/g, '512'],
  ],

  constants: {},
};
