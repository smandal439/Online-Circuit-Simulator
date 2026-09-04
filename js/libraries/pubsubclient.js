window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['PubSubClient'] = {
  classes: ['PubSubClient'],
  transpile: [],
  constants: {},
  constructor: function(client) {
    return {
      setServer: function() {},
      setCallback: function() {},
      connect: function() { return true; },
      disconnect: function() {},
      connected: function() { return false; },
      subscribe: function() { return true; },
      unsubscribe: function() { return true; },
      publish: function() { return true; },
      loop: function() { return true; },
    };
  },
};
