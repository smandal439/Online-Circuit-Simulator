/**
 * SPI Library Plugin for ArduSim
 *
 * Provides SPI simulation.
 * Supports: begin, transfer, end.
 *
 * Usage in Arduino code:
 *   #include <SPI.h>
 *   SPI.begin();
 *   SPI.transfer(data);
 *   SPI.end();
 */
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['SPI'] = {
  classes: [],

  transpile: [
    [/\bSPI\.begin\s*\(/g, '_a.spiBegin('],
    [/\bSPI\.transfer\s*\(/g, '_a.spiTransfer('],
    [/\bSPI\.end\s*\(/g, '_a.spiEnd('],
  ],

  runtime: function(self) {
    return {
      spiBegin: function() { self._serialLog('[SPI] begin\n', 'system'); },
      spiTransfer: function(val) { return 0; },
      spiEnd: function() { },
    };
  },

  constants: {},
};
