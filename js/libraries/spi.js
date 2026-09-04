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
    // SPI.begin() → _a.spiBegin()
    [/\bSPI\.begin\s*\(/g, '_a.spiBegin('],
    // SPI.transfer() → _a.spiTransfer()
    [/\bSPI\.transfer\s*\(/g, '_a.spiTransfer('],
    // SPI.end() → _a.spiEnd()
    [/\bSPI\.end\s*\(/g, '_a.spiEnd('],
  ],

  constants: {},
};
