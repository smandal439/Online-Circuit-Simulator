window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['SoftwareSerial'] = {
  classes: ['SoftwareSerial'],
  transpile: [
    [/\bSoftwareSerial\s+(\w+)\s*\(([^)]+)\)/g, 'var $1 = _a.softwareSerialNew($2)'],
    [/\b(\w+)\.println\s*\(/g, function (match, v) {
      if (v === 'Serial') return match;
      return '_a.genericPrintln(' + v + ', ';
    }],
    [/\b(\w+)\.listen\s*\(/g, '_a.softSerialListen($1)'],
    [/\b(\w+)\.isListening\s*\(/g, '_a.softSerialIsListening($1)'],
  ],
  constants: {},
  constructor: function (args) {
    return { rx: args[0] || 0, tx: args[1] || 0 };
  },
};
