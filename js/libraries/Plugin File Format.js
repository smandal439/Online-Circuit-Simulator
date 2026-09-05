// js/libraries/mylibrary.js
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['MyLibrary'] = {

  // Class names this library provides
  classes: ['MyClass'],

  // Transpile rules: [regex, replacement]
  transpile: [
    [/\.myMethod\s*\(/g, '._myMethod('],
    [/\.getValue\s*\(\s*\)/g, '._getValue()'],
  ],

  // Runtime functions — merged into _a object
  // 'self' is the ArduinoSimulator instance
  runtime: function(self) {
    return {
      _myMethod: function(arg) {
        self._serialLog('[MyLib] myMethod(' + arg + ')\n', 'system');
      },
      _getValue: function() {
        return 42;
      },
    };
  },

  // Constructor — what `new MyClass(args)` returns
  // Set to null if constructor needs 'self' (stays in simulator.js)
  constructor: function(args) {
    return {
      myMethod: function(arg) {},
      getValue: function() { return 42; },
    };
  },

  // Constants — injected as global variables
  constants: {
    MY_CONST_A: 100,
    MY_CONST_B: 0xFF,
  },
};