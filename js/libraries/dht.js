window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['DHT'] = {
  classes: ['DHT'],
  transpile: [],
  constants: {
    DHT11: 11,
    DHT22: 22,
    DHT21: 21,
    AM2301: 22,
  },
  constructor: function(args) { return { type: args[0] || 11, pin: args[1] || 0 }; },
};
