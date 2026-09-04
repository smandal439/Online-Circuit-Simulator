window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['Stepper'] = {
  classes: ['Stepper'],
  transpile: [
    [/\bStepper\s+(\w+)\s*\(([^)]+)\)/g, 'var $1 = _a.stepperNew($2)'],
    [/\b(\w+)\.setSpeed\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.stepperSetSpeed(' + varName + ', ';
    }],
    [/\b(\w+)\.step\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.stepperStep(' + varName + ', ';
    }],
    [/\b(\w+)\.distanceToGo\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.stepperDistanceToGo(' + varName + ')';
    }],
    [/\b(\w+)\.currentPosition\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.stepperCurrentPosition(' + varName + ')';
    }],
    [/\b(\w+)\.setCurrentPosition\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.stepperSetCurrentPosition(' + varName + ', ';
    }],
    [/\b(\w+)\.run\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.stepperRun(' + varName + ')';
    }],
    [/\b(\w+)\.runSpeed\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.stepperRunSpeed(' + varName + ')';
    }],
    [/\b(\w+)\.stop\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.stepperStop(' + varName + ')';
    }],
    [/\b(\w+)\.disableOutputs\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.stepperDisableOutputs(' + varName + ')';
    }],
    [/\b(\w+)\.enableOutputs\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.stepperEnableOutputs(' + varName + ')';
    }],
    [/\b(\w+)\.maxSpeed\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.stepperMaxSpeed(' + varName + ')';
    }],
    [/\b(\w+)\.acceleration\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.stepperAcceleration(' + varName + ')';
    }],
    [/\b(\w+)\.setAcceleration\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.stepperSetAcceleration(' + varName + ', ';
    }],
  ],
  constants: {},
  constructor: function (args) {
    return { stepsPerRev: args[0] || 200, pin1: args[1] || 0, pin2: args[2] || 0, pin3: args[3] || 0, pin4: args[4] || 0 };
  },
};
