// js/libraries/YourLibrary.js
// Template for creating a custom Arduino library plugin for ArduSim
//
// 1. Save this file to js/libraries/yourlibrary.js
// 2. Add <script src="js/libraries/yourlibrary.js"></script> to index.html
// 3. Customize the class names, methods, and behavior below
// 4. Use #include <YourLibrary.h> in your sketches

window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['YourLibrary'] = {

  // Class names this library provides (for constructor detection)
  classes: ['YourClass'],

  // Header file names for autocomplete
  includes: ['<YourLibrary.h>'],

  // Load priority (lower = earlier). Default: 50
  priority: 50,

  // Transpile rules: [RegExp, replacement]
  // Applied in order during code compilation
  transpile: [
    // Example: obj.begin() → _a.yourBegin(obj)
    [/\b(\w+)\.begin\s*\(/g, function(match, varName) {
      // Skip Serial, Wire, SPI, etc.
      if (['Serial', 'Wire', 'SPI', 'WiFi'].includes(varName)) return match;
      return '_a.yourBegin(' + varName + ')';
    }],

    // Example: obj.readValue() → _a.yourRead(obj)
    [/\b(\w+)\.readValue\s*\(/g, function(match, varName) {
      if (['Serial', 'Wire', 'SPI', 'WiFi'].includes(varName)) return match;
      return '_a.yourRead(' + varName + ')';
    }],

    // Example: obj.writeValue(val) → _a.yourWrite(obj, val)
    [/\b(\w+)\.writeValue\s*\(/g, function(match, varName) {
      if (['Serial', 'Wire', 'SPI', 'WiFi'].includes(varName)) return match;
      return '_a.yourWrite(' + varName + ', ';
    }],

    // Example: YourClass::staticMethod() → _a.yourStaticMethod()
    [/\bYourClass::staticMethod\s*\(/g, '_a.yourStaticMethod('],
  ],

  // Runtime functions - merged into _a namespace
  // 'self' is the ArduinoSimulator instance
  runtime: function(self) {
    // Store per-instance state using a Map keyed by object ID
    const instances = new Map();
    let nextId = 1;

    return {
      // Initialize instance
      yourBegin: function(obj) {
        if (!obj._yourLibId) obj._yourLibId = nextId++;
        instances.set(obj._yourLibId, {
          initialized: true,
          value: 0,
        });
        self._serialLog('[YourLibrary] Initialized\n', 'system');
      },

      // Read simulated value
      yourRead: function(obj) {
        const inst = instances.get(obj._yourLibId);
        if (!inst || !inst.initialized) return 0;
        // Simulate sensor reading (0-1023)
        inst.value = Math.floor(Math.random() * 1024);
        return inst.value;
      },

      // Write value (e.g., to actuator)
      yourWrite: function(obj, value) {
        const inst = instances.get(obj._yourLibId);
        if (!inst || !inst.initialized) return;
        inst.value = value;
        self._serialLog('[YourLibrary] Write: ' + value + '\n', 'system');
      },

      // Static method
      yourStaticMethod: function() {
        self._serialLog('[YourLibrary] Static method called\n', 'system');
        return 42;
      },
    };
  },

  // Constructor prototype - what `new YourClass(args)` returns
  // Set to null if constructor needs access to 'self' (stays in simulator.js)
  constructor: function(args) {
    return {
      begin: function() {},
      readValue: function() { return 0; },
      writeValue: function(val) {},
    };
  },

  // Constants - injected as global variables in sketches
  constants: {
    YOUR_MODE_A: 0x01,
    YOUR_MODE_B: 0x02,
    YOUR_CONSTANT: 100,
  },
};