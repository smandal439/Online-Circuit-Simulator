window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['Servo'] = {
  classes: ['Servo'],
  transpile: [
    [/(\w+)\.attach\((\w+)\)/g, '_a.servoAttach($1, $2)'],
    [/(\w+)\.write\((\w+)\)/g, '_a.servoWrite($1, $2)'],
    [/(\w+)\.writeMicroseconds\((\w+)\)/g, '_a.servoWriteMs($1, $2)'],
    [/(\w+)\.read\(\)/g, '_a.servoRead($1)'],
  ],
  constants: {},
  constructor: function () {
    return {};
  },
};
