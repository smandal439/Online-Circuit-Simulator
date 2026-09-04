window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['PubSubClient'] = {
  classes: ['PubSubClient'],
  includes: ['<PubSubClient.h>'],
  transpile: [
    [/\bPubSubClient\s+(\w+)\s*\(([^)]+)\)/g, 'var $1 = _a.pubsubclientNew($2)'],
    [/\b(\w+)\.setServer\s*\(([^)]+)\)/g, '_a.pubsubclientSetServer($1, $2)'],
    [/\b(\w+)\.setCallback\s*\(([^)]+)\)/g, '_a.pubsubclientSetCallback($1, $2)'],
    [/\b(\w+)\.connect\s*\(([^)]*)\)/g, '_a.pubsubclientConnect($1, $2)'],
    [/\b(\w+)\.publish\s*\(([^)]*)\)/g, '_a.pubsubclientPublish($1, $2)'],
    [/\b(\w+)\.subscribe\s*\(([^)]*)\)/g, '_a.pubsubclientSubscribe($1, $2)'],
    [/\b(\w+)\.loop\s*\(/g, '_a.pubsubclientLoop($1)'],
  ],
  transpile: [],
  constants: {},
  constructor: null,

  runtime: function(self) { return {}; },
};
