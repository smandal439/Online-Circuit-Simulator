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
  constructor: null,
  runtime: function(self) {
    return {};
  },
};

/*
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['DHT'] = {
  classes: ['DHT'],
  includes: ['<DHT.h>'],
  constants: {
    DHT11: 11,
    DHT22: 22,
    DHT21: 21,
    AM2301: 22,
    AM2302: 22,
    DHT12: 12
  },
  
  // Instance constructor generator
  constructor: function(pin = 2, type = 11, instanceName = 'dht') {
    return {
      name: instanceName,
      pin: pin,
      type: type,
      declaration: `DHT ${instanceName}(${pin}, ${type});`,
      setup: `${instanceName}.begin();`
    };
  },

  // Code generation mappings for library methods
  methods: {
    begin: (instance) => `${instance}.begin();`,
    readTemperature: (instance, isFahrenheit = false) => 
      `${instance}.readTemperature(${isFahrenheit ? 'true' : ''})`,
    readHumidity: (instance) => `${instance}.readHumidity()`,
    computeHeatIndex: (instance, tempVar, humVar, isFahrenheit = false) => 
      `${instance}.computeHeatIndex(${tempVar}, ${humVar}${isFahrenheit ? ', true' : ''})`
  },

  // Helper validation for invalid pin/type configs
  validate: function(pin, type) {
    const validTypes = Object.values(this.constants);
    return {
      isValidPin: Number.isInteger(pin) && pin >= 0,
      isValidType: validTypes.includes(type)
    };
  }
};

*/