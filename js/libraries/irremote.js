window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['IRremote'] = {
  classes: ['IRsend', 'IRrecv'],
  transpile: [
    [/IRsend\s+(\w+)\((\d+)\)/g, 'var $1 = _a.irsendNew($2)'],
    [/IRrecv\s+(\w+)\((\d+)\)/g, 'var $1 = _a.irrecvNew($2)'],
    [/(\w+)\.sendNEC\(/g, '_a.irsendNEC($1, '],
    [/(\w+)\.sendSony\(/g, '_a.irsendSony($1, '],
    [/(\w+)\.sendRC5\(/g, '_a.irsendRC5($1, '],
    [/(\w+)\.sendRC6\(/g, '_a.irsendRC6($1, '],
    [/(\w+)\.sendRaw\(/g, '_a.irsendRaw($1, '],
    [/(\w+)\.enableIRIn\(\)/g, '_a.irrecvEnableIRIn($1)'],
    [/(\w+)\.resume\(\)/g, '_a.irrecvResume($1)'],
    [/(\w+)\.decode\((\w+)\)/g, '_a.irrecvDecode($1, $2)'],
    [/(\w+)\.stopIRSend\(\)/g, '_a.irsendStop($1)'],
  ],
  constants: {
    DECODE_SUPPORTED: true,
    NECBITS: 32,
    USE_FAST: false,
  },
};
