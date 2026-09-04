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
  includes: ['<EEPROM.h>'],

  transpile: [
    [/\bEEPROM\.read\s*\(/g, '_a.eepromRead('],
    [/\bEEPROM\.write\s*\(/g, '_a.eepromWrite('],
    [/\bEEPROM\.update\s*\(/g, '_a.eepromUpdate('],
    [/\bEEPROM\.get\s*\(/g, '_a.eepromGet('],
    [/\bEEPROM\.put\s*\(/g, '_a.eepromPut('],
    [/\bEEPROM\.begin\s*\(/g, '_a.eepromBegin('],
    [/\bEEPROM\.commit\s*\(/g, '_a.eepromCommit('],
    [/\bEEPROM\.length\b/g, '512'],
  ],

  runtime: function(self) {
    return {
      eepromRead: function(addr) { return self._eeprom[addr & 511] || 0; },
      eepromWrite: function(addr, val) { self._eeprom[addr & 511] = val & 0xFF; },
      eepromUpdate: function(addr, val) { self._eeprom[addr & 511] = val & 0xFF; },
      eepromGet: function(addr, obj) { return obj; },
      eepromPut: function(addr, val) { },
      eepromBegin: function(size) { self._serialLog('[EEPROM] begin(' + (size || 512) + ')\n', 'system'); },
      eepromCommit: function() { self._serialLog('[EEPROM] commit\n', 'system'); },
    };
  },

  constants: {},
};
