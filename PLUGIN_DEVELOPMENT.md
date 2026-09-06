# Third-Party Plugin Development Guide

ArduSim supports third-party Arduino library plugins. Plugins are JavaScript files that register with `window.ArduinoLibs` and provide transpilation rules, runtime implementations, and constants.

---

## Quick Start

Create a file `js/libraries/mylibrary.js`:

```javascript
// js/libraries/mylibrary.js
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['MyLibrary'] = {
  classes: ['MyClass'],
  transpile: [
    [/\.myMethod\s*\(/g, '._myMethod('],
    [/\.getValue\s*\(\s*\)/g, '._getValue()'],
  ],
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
  constructor: function(args) {
    return {
      myMethod: function(arg) {},
      getValue: function() { return 42; },
    };
  },
  constants: {
    MY_CONST_A: 100,
    MY_CONST_B: 0xFF,
  },
};
```

Include in your sketch:
```cpp
#include <MyLibrary.h>

MyClass obj;

void setup() {
  obj.myMethod(5);
  int val = obj.getValue();
}
```

---

## Plugin Structure

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `classes` | `string[]` | Class names this library provides (used for `new ClassName()` detection) |
| `transpile` | `Array<[RegExp, string\|Function]>` | Code transformation rules applied during compilation |
| `runtime` | `function(self)` | Returns object with runtime functions merged into `_a` namespace |
| `constructor` | `function(args)` | Returns prototype object for `new ClassName(args)` |
| `constants` | `object` | Global constants injected into sketch scope |
| `includes` | `string[]` | Header names (e.g., `['<MyLib.h>']`) for autocomplete |
| `priority` | `number` | Load order (lower = earlier, default 50) |

---

## Detailed API

### 1. `classes: string[]`

Registers class names so the transpiler recognizes:
- `MyClass obj;` → `var obj = new MyClass();`
- `MyClass obj(1, 2);` → `var obj = new MyClass(1, 2);`

### 2. `transpile: [RegExp, replacement][]`

Transforms C++ API calls to JavaScript runtime calls. Applied in order.

**Simple replacement:**
```javascript
[/\.myMethod\s*\(/g, '._myMethod(']
```

**Function replacement (access to match groups):**
```javascript
[/(\w+)\.customCall\s*\(\s*(\d+)\s*\)/g, function(match, varName, arg) {
  return '_a.customCall(' + varName + ', ' + arg + ')';
}]
```

**Common patterns:**
| C++ Code | Transpile Pattern | JS Output |
|----------|-------------------|-----------|
| `obj.method()` | `/\.method\s*\(/g` | `obj._method(` |
| `Class::staticMethod()` | `/\bClass::staticMethod\s*\(/g` | `_a.classStaticMethod(` |
| `obj.property` | `/\bobj\.property\b/g` | `_a.getProperty(obj)` |

### 3. `runtime: function(self)`

Returns an object merged into `_a` (Arduino API namespace). `self` is the `ArduinoSimulator` instance.

**Available `self` methods:**
```javascript
self._serialLog(msg, type)    // Log to serial monitor (type: 'system', 'user', 'error')
self._getPin(pin)             // Get pin state
self._setPin(pin, value)      // Set pin state
self._millis()                // Get simulated milliseconds
```

**Example:**
```javascript
runtime: function(self) {
  return {
    _myLibInit: function(pin) {
      self._serialLog('[MyLib] Init on pin ' + pin + '\n', 'system');
    },
    _myLibRead: function() {
      return Math.random() * 100;
    },
  };
}
```

### 4. `constructor: function(args)`

Returns the prototype for `new ClassName(args)`. Called during transpilation when user writes `new MyClass()`.

```javascript
constructor: function(args) {
  // args = string of constructor arguments
  return {
    begin: function(baud) {},
    write: function(data) {},
    read: function() { return 0; },
  };
}
```

### 5. `constants: object`

Global constants available in sketches:
```javascript
constants: {
  MYLIB_VERSION: 1,
  MYLIB_MODE_A: 0x01,
  MYLIB_MODE_B: 0x02,
}
```

### 6. `includes: string[]`

Header file names for editor autocomplete:
```javascript
includes: ['<MyLibrary.h>', '<MyLibrary/Utils.h>']
```

### 7. `priority: number`

Load order for transpile rules (lower runs first). Default: 50.
- Core libraries (Servo, Wire, SPI): 10-20
- Standard libraries: 50
- LCD/Display libraries: 100 (run last to avoid conflicts)

---

## Complete Example: Temperature Sensor Library

```javascript
// js/libraries/mytempsensor.js
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['MyTempSensor'] = {
  classes: ['MyTempSensor'],
  includes: ['<MyTempSensor.h>'],
  priority: 50,

  transpile: [
    // begin() → _a.tempBegin(obj)
    [/\b(\w+)\.begin\s*\(/g, function(m, v) {
      return v === 'Serial' ? m : '_a.tempBegin(' + v + ')';
    }],
    // readTemperature() → _a.tempRead(obj)
    [/\b(\w+)\.readTemperature\s*\(/g, function(m, v) {
      return v === 'Serial' ? m : '_a.tempRead(' + v + ')';
    }],
    // readHumidity() → _a.tempReadHumidity(obj)
    [/\b(\w+)\.readHumidity\s*\(/g, function(m, v) {
      return v === 'Serial' ? m : '_a.tempReadHumidity(' + v + ')';
    }],
    // setUnit(TEMP_C) → _a.tempSetUnit(obj, TEMP_C)
    [/\b(\w+)\.setUnit\s*\(/g, function(m, v) {
      return v === 'Serial' ? m : '_a.tempSetUnit(' + v + ', ';
    }],
  ],

  runtime: function(self) {
    const sensors = new Map(); // sensorId -> { unit: 'C' }
    let nextId = 1;

    return {
      tempBegin: function(obj) {
        if (!obj._tempId) obj._tempId = nextId++;
        sensors.set(obj._tempId, { unit: 'C' });
        self._serialLog('[MyTempSensor] Initialized\n', 'system');
      },
      tempRead: function(obj) {
        const s = sensors.get(obj._tempId);
        if (!s) return 0;
        const tempC = 20 + Math.random() * 10; // Simulate 20-30°C
        return s.unit === 'F' ? tempC * 9/5 + 32 : tempC;
      },
      tempReadHumidity: function(obj) {
        return 40 + Math.random() * 20; // 40-60%
      },
      tempSetUnit: function(obj, unit) {
        const s = sensors.get(obj._tempId);
        if (s) s.unit = (unit === 1 || unit === 'F') ? 'F' : 'C';
      },
    };
  },

  constructor: function(args) {
    return {
      begin: function() {},
      readTemperature: function() { return 25; },
      readHumidity: function() { return 50; },
      setUnit: function(unit) {},
    };
  },

  constants: {
    TEMP_C: 0,
    TEMP_F: 1,
    TEMP_K: 2,
  },
};
```

**Usage in sketch:**
```cpp
#include <MyTempSensor.h>

MyTempSensor sensor;

void setup() {
  Serial.begin(9600);
  sensor.begin();
  sensor.setUnit(TEMP_F);
}

void loop() {
  float t = sensor.readTemperature();
  float h = sensor.readHumidity();
  Serial.print("Temp: "); Serial.print(t); Serial.print("°F  Humidity: "); Serial.println(h);
  delay(1000);
}
```

---

## Registering Your Plugin

### Option 1: Add to `index.html`
```html
<script src="js/libraries/mytempsensor.js"></script>
```

### Option 2: Dynamic Load (for user plugins)
```javascript
// In browser console or custom script
const script = document.createElement('script');
script.src = 'https://your-server.com/mytempsensor.js';
document.head.appendChild(script);
```

### Option 3: Project File
Plugins can be bundled in `.json` project files under `libraries` key (advanced).

---

## Testing Your Plugin

1. Open browser DevTools Console
2. Check `window.ArduinoLibs['MyTempSensor']` exists
3. Load a sketch using your library
4. Check Serial Monitor for `[MyTempSensor]` logs
5. Verify transpiled code in console (enable "Show Transpiled" in settings)

---

## Debugging Tips

| Issue | Solution |
|-------|----------|
| Method not found | Check transpile regex matches C++ exactly; test in console: `code.match(/your_regex/)` |
| Constructor not called | Ensure class name in `classes[]` matches exactly |
| Constants undefined | Check `constants` object keys are valid JS identifiers |
| Runtime error | Add `console.log` in runtime functions; check browser console |
| Autocomplete missing | Add to `includes[]` and reload editor |

---

## Best Practices

1. **Prefix runtime functions** with `_` (e.g., `_myLibMethod`) to avoid conflicts
2. **Guard against Serial/Wire** in transpile rules (see examples)
3. **Use unique constant names** with library prefix
4. **Store state in `obj`** (attach `_myLibId` to instance) for multi-instance support
5. **Test with multiple instances** of your class

---

## Plugin File Template

See `js/libraries/Plugin File Format.js` for the official template.

```javascript
// js/libraries/yourlibrary.js
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['YourLibrary'] = {
  classes: ['YourClass'],
  includes: ['<YourLibrary.h>'],
  priority: 50,

  transpile: [
    // Your transpile rules here
  ],

  runtime: function(self) {
    return {
      // Your runtime functions here
    };
  },

  constructor: function(args) {
    return {
      // Prototype methods here
    };
  },

  constants: {
    // Your constants here
  },
};
```