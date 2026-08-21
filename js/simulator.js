/* ═══════════════════════════════════════════════════════
   simulator.js — Arduino C++ Interpreter & Execution Engine
   ═══════════════════════════════════════════════════════ */

'use strict';

class ArduinoSimulator {
  constructor() {
    this.isRunning = false;
    this.isPaused = false;
    this.simTime = 0; // ms
    this.speed = 1;
    this.board = 'arduino_uno'; // arduino_uno | esp32_devkit_v1
    this.pinStates = {}; // pinKey → value (0-255, or 0/1)
    this.pinModes = {}; // pinKey → INPUT/OUTPUT/INPUT_PULLUP
    this.serialBaud = 9600;
    this.serialInputBuffer = [];
    this._loopAbortController = null;
    this._loopPromise = null;
    this.onSerial = null;  // callback(text, type)
    this.onStart = null;  // callback() — fired when the simulation loop actually starts
    this.onPinChange = null;  // callback(pinKey, value)
    this.onError = null;  // callback(err)
    this.onStatus = null;  // callback(msg)
    this.onStop = null;  // callback()
    this.onTick = null;  // callback(simTime, fps, loopCount)
    this._toneActive = {};
    this._toneCtx = null;
    this._toneOscillators = {};
    this._startRealTime = 0;
    this._delays = [];
    this._mqttOpen = []; // live MQTT.js connections to close on stop/run
    this._customDelay = null;
    // FPS / loop tracking
    this._fps = 0;
    this._fpsFrames = 0;
    this._fpsLast = 0;
    this._loopCount = 0;
    this._fpsInterval = null;
    this._runSeq = 0;
    // Infinite-loop guard: max iterations per real-second without a delay
    this._iterSinceDelay = 0;
    this._MAX_TIGHT_ITERS = 50000;
    // EEPROM simulation (512 bytes)
    this._eeprom = new Uint8Array(512);
    // ESP32 LEDC PWM channel registry: channel → { pin, freq, resolution, maxDuty }
    this._ledcChannels = {};
  }

  /* ══════════════ TRANSPILER ══════════════ */
  transpile(code) {
    if (typeof code !== 'string') code = '';
    let js = code;

    // Remove comments temporarily for processing, then restore
    // Actually keep comments — they're valid JS too

    // 1. Handle #define macros (simple value replacement)
    const defines = {};
    js = js.replace(/^[ \t]*#define\s+(\w+)\s+(.*?)[ \t]*$/gm, (_, name, value) => {
      defines[name] = value.trim();
      return `/* #define ${name} ${value} */`;
    });

    // 2. Remove other preprocessor directives
    js = js.replace(/^[ \t]*#[^\n]*/gm, '');

    // 3. Apply #define substitutions (simple word replacement)
    //    Skip function-like macros and escape any `$` so the replacement is literal.
    for (const [name, value] of Object.entries(defines)) {
      if (!/^[A-Za-z_]\w*$/.test(name)) continue;
      if (/\(/.test(value)) continue; // function-like macro — leave untouched
      js = js.replace(new RegExp(`\\b${name}\\b`, 'g'), () => value);
    }

    // 4. Replace function declarations (return type + name + params + brace)
    const userFnNames = new Set();
    js = js.replace(
      /\b(?:void|int|float|double|long|unsigned\s+long|unsigned\s+int|byte|boolean|bool|char\s*\*?|String|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t)\s+(\w+)\s*\(([^)]*)\)\s*\{/g,
      (match, name, params) => {
        userFnNames.add(name);
        const cleanParams = params.replace(/\b(?:unsigned\s+)?(?:int|long|short|byte\s*\*?|float|double|boolean|bool|char\s*\*?|String|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t)\s+/g, '');
        return `async function ${name}(${cleanParams}) {`;
      }
    );

    // 5. Handle variable declarations (not already transformed)
    // int x = 5; → let x = 5;
    js = js.replace(/\b(?:unsigned\s+)?(?:int|long|short|byte|float|double|boolean|bool|String)\s+(\w+)(?=\s*[=;,\[\)])/g, 'let $1');
    // char x = 'a'; → let x = 'a';
    js = js.replace(/\bchar\s+(\w+)(?=\s*[=;,\[\)])/g, 'let $1');
    // Handle const
    js = js.replace(/\bconst\s+let\b/g, 'let');
    js = js.replace(/\bconst\s+async\b/g, 'async');

    // Object-style library declarations:
    // Servo myServo;  →  let myServo = new Servo();
    // LiquidCrystal lcd(12, 11, 5, 4, 3, 2);  →  let lcd = new LiquidCrystal(12, 11, 5, 4, 3, 2);
    // WiFiClient espClient;  →  let espClient = new WiFiClient();
    // PubSubClient client(espClient);  →  let client = new PubSubClient(espClient);
    // WebServer server(80);  →  let server = new WebServer(80);
    // Adafruit_SSD1306 display(128, 64, &Wire, -1);  →  let display = new Adafruit_SSD1306(128, 64, Wire, -1);
    js = js.replace(/\b(Servo|LiquidCrystal|LiquidCrystal_I2C|WiFiClient|PubSubClient|WebServer|Adafruit_SSD1306)\s+(\w+)\s*(?:\(([^)]*)\))?\s*;/g, 'let $2 = new $1($3)');

    // C++ passes I2C objects by reference: `&Wire` is invalid JS. Strip the `&`
    // only inside Adafruit_SSD1306 constructors to avoid breaking `a & b`.
    js = js.replace(/new\s+Adafruit_SSD1306\s*\(([^)]*)\)/g, (_, args) => `new Adafruit_SSD1306(${args.replace(/&\s*/g, '')})`);

    // 6. Handle arrays: int arr[10] → let arr = new Array(10).fill(0)
    js = js.replace(/let\s+(\w+)\s*\[(\d+)\]\s*=\s*\{([^}]*)\}/g, 'let $1 = [$3]');
    js = js.replace(/let\s+(\w+)\s*\[\s*\]\s*=\s*\{([^}]*)\}/g, 'let $1 = [$2]');
    js = js.replace(/let\s+(\w+)\s*\[(\d+)\](?!\s*=)/g, 'let $1 = new Array($2).fill(0)');
    js = js.replace(/let\s+(\w+)\s*\[\s*\](?!\s*=)/g, 'let $1 = []');
    // C-style char arrays with string literals: char str[20] = "hi"; / char msg[] = "hi";
    js = js.replace(/let\s+(\w+)\s*\[\s*\d*\s*\]\s*=\s*("[^"]*"|'[^']*')/g, 'let $1 = $2');

    // 7. Boolean literals
    js = js.replace(/\btrue\b/g, 'true');
    js = js.replace(/\bfalse\b/g, 'false');

    // Strip leftover C storage/qualifier keywords that are invalid JS
    js = js.replace(/\b(?:static|volatile|extern|register|const)\s+let\b/g, 'let');
    js = js.replace(/\b(?:static|volatile|extern|register|const)\s+async\b/g, 'async');

    // 8. Arduino constants
    js = js.replace(/\bHIGH\b/g, '1');
    js = js.replace(/\bLOW\b/g, '0');
    js = js.replace(/\bINPUT_PULLUP\b/g, '"INPUT_PULLUP"');
    js = js.replace(/\bINPUT\b/g, '"INPUT"');
    js = js.replace(/\bOUTPUT\b/g, '"OUTPUT"');
    if (this.board === 'esp32_devkit_v1') {
      // ESP32 DevKit V1: built-in LED is on GPIO2; the common analog
      // pins map to the board's ADC-capable GPIOs.
      js = js.replace(/\bLED_BUILTIN\b/g, '2');
      js = js.replace(/\bA0\b/g, '36');
      js = js.replace(/\bA1\b/g, '39');
      js = js.replace(/\bA2\b/g, '34');
      js = js.replace(/\bA3\b/g, '35');
      js = js.replace(/\bA4\b/g, '32');
      js = js.replace(/\bA5\b/g, '33');
    } else {
      js = js.replace(/\bLED_BUILTIN\b/g, '13');
      js = js.replace(/\bA0\b/g, '14');
      js = js.replace(/\bA1\b/g, '15');
      js = js.replace(/\bA2\b/g, '16');
      js = js.replace(/\bA3\b/g, '17');
      js = js.replace(/\bA4\b/g, '18');
      js = js.replace(/\bA5\b/g, '19');
    }
    js = js.replace(/\bDEC\b/g, '10');
    js = js.replace(/\bHEX\b/g, '16');
    js = js.replace(/\bOCT\b/g, '8');
    js = js.replace(/\bBIN\b/g, '2');
    js = js.replace(/\bMSBFIRST\b/g, '1');
    js = js.replace(/\bLSBFIRST\b/g, '0');

    // 9b. Strip unsupported C++ type declarations
    js = js.replace(/\bunsigned\s+long\s+/g, 'var ');
    js = js.replace(/\bunsigned\s+int\s+/g, 'var ');
    js = js.replace(/\bunsigned\s+short\s+/g, 'var ');
    js = js.replace(/\bunsigned\s+char\s+/g, 'var ');
    js = js.replace(/\bconst\s+char\s*\*\s*/g, 'var ');
    js = js.replace(/\bconst\s+String\s*/g, 'var ');
    js = js.replace(/\bconst\s+int\s+/g, 'var ');
    js = js.replace(/\bconst\s+float\s+/g, 'var ');
    js = js.replace(/\bconst\s+double\s+/g, 'var ');
    js = js.replace(/\bint\s+(?=[a-zA-Z_])/g, 'var ');
    js = js.replace(/\bfloat\s+(?=[a-zA-Z_])/g, 'var ');
    js = js.replace(/\bdouble\s+(?=[a-zA-Z_])/g, 'var ');
    js = js.replace(/\blong\s+(?=[a-zA-Z_])/g, 'var ');
    js = js.replace(/\bshort\s+(?=[a-zA-Z_])/g, 'var ');
    js = js.replace(/\bchar\s+(?=[a-zA-Z_])/g, 'var ');
    js = js.replace(/\bbyte\s+(?=[a-zA-Z_])/g, 'var ');
    js = js.replace(/\bString\s+/g, 'var ');

    // 9c. Map Arduino API calls
    const API = [
      ['delay', '_a.delay'],
      ['delayMicroseconds', '_a.delayMicroseconds'],
      ['pinMode', '_a.pinMode'],
      ['digitalWrite', '_a.digitalWrite'],
      ['digitalRead', '_a.digitalRead'],
      ['analogWrite', '_a.analogWrite'],
      ['analogRead', '_a.analogRead'],
      ['millis', '_a.millis'],
      ['micros', '_a.micros'],
      ['tone', '_a.tone'],
      ['noTone', '_a.noTone'],
      ['pulseIn', '_a.pulseIn'],
      ['attachInterrupt', '_a.attachInterrupt'],
      ['detachInterrupt', '_a.detachInterrupt'],
      ['randomSeed', '_a.randomSeed'],
      ['random', '_a.random'],
      ['ntpEpoch', '_a.ntpEpoch'],
      ['map', '_a.map'],
      ['constrain', '_a.constrain'],
      ['abs', 'Math.abs'],
      ['min', '_a.min'],
      ['max', '_a.max'],
      ['sqrt', 'Math.sqrt'],
      ['pow', 'Math.pow'],
      ['sin', 'Math.sin'],
      ['cos', 'Math.cos'],
      ['tan', 'Math.tan'],
      ['floor', 'Math.floor'],
      ['ceil', 'Math.ceil'],
      ['round', 'Math.round'],
      ['shiftIn', '_a.shiftIn'],
      ['shiftOut', '_a.shiftOut'],
      ['bitRead', '_a.bitRead'],
      ['bitWrite', '_a.bitWrite'],
      ['bitSet', '_a.bitSet'],
      ['bitClear', '_a.bitClear'],
      ['bit', '_a.bit'],
      ['lowByte', '_a.lowByte'],
      ['highByte', '_a.highByte'],
      ['sensorValue', '_a.sensorValue'],
      // ESP32 APIs
      ['ledcSetup', '_a.ledcSetup'],
      ['ledcSetupChannel', '_a.ledcSetupChannel'],
      ['ledcAttachPin', '_a.ledcAttachPin'],
      ['ledcAttach', '_a.ledcAttach'],
      ['ledcWrite', '_a.ledcWrite'],
      ['ledcRead', '_a.ledcRead'],
      ['dacWrite', '_a.dacWrite'],
      ['analogReadMilliVolts', '_a.analogReadMilliVolts'],
      ['analogReadMicroVolts', '_a.analogReadMicroVolts'],
      ['touchRead', '_a.touchRead'],
      ['hallRead', '_a.hallRead'],
      ['temperatureRead', '_a.temperatureRead'],
      ['digitalPinToInterrupt', '_a.digitalPinToInterrupt'],
    ];

    for (const [orig, mapped] of API) {
      js = js.replace(new RegExp(`\\b${orig}\\b(?=\\s*\\()`, 'g'), mapped);
    }

    // Serial.*
    js = js.replace(/\bSerial\.begin\s*\(/g, '_a.serialBegin(');
    js = js.replace(/\bSerial\.print\s*\(/g, '_a.serialPrint(');
    js = js.replace(/\bSerial\.println\s*\(/g, '_a.serialPrintln(');
    js = js.replace(/\bSerial\.read\s*\(/g, '_a.serialRead(');
    js = js.replace(/\bSerial\.available\s*\(/g, '_a.serialAvailable(');
    js = js.replace(/\bSerial\.write\s*\(/g, '_a.serialWrite(');
    js = js.replace(/\bSerial\.flush\s*\(/g, '_a.serialFlush(');
    js = js.replace(/\bSerial\.parseInt\s*\(/g, '_a.serialParseInt(');
    js = js.replace(/\bSerial\.parseFloat\s*\(/g, '_a.serialParseFloat(');
    js = js.replace(/\bSerial\.peek\s*\(/g, '_a.serialPeek(');
    js = js.replace(/\bSerial\.readString\s*\(/g, '_a.serialReadString(');

    // ESP32 Wi-Fi — map before the generic Servo/LCD `.begin` rule below
    js = js.replace(/\bWiFi\.begin\s*\(/g, '_a.wifiBegin(');
    js = js.replace(/\bWiFi\.localIP\s*\(/g, '_a.wifiLocalIP(');
    js = js.replace(/\bWiFi\.softAPIP\s*\(/g, '_a.wifiSoftAPIP(');
    js = js.replace(/\bWiFi\.status\s*\(/g, '_a.wifiStatus(');
    js = js.replace(/\bWiFi\.disconnect\s*\(/g, '_a.wifiDisconnect(');
    js = js.replace(/\bWiFi\.mode\s*\(/g, '_a.wifiMode(');
    js = js.replace(/\bWiFi\.softAP\s*\(/g, '_a.wifiSoftAP(');

    // Wire (I2C) — stub
    js = js.replace(/\bWire\.begin\s*\(/g, '_a.wireBegin(');
    js = js.replace(/\bWire\.requestFrom\s*\(/g, '_a.wireRequestFrom(');
    js = js.replace(/\bWire\.beginTransmission\s*\(/g, '_a.wireBeginTransmission(');
    js = js.replace(/\bWire\.endTransmission\s*\(/g, '_a.wireEndTransmission(');
    js = js.replace(/\bWire\.write\s*\(/g, '_a.wireWrite(');
    js = js.replace(/\bWire\.read\s*\(/g, '_a.wireRead(');
    js = js.replace(/\bWire\.available\s*\(/g, '_a.wireAvailable(');

    // SPI — stub
    js = js.replace(/\bSPI\.begin\s*\(/g, '_a.spiBegin(');
    js = js.replace(/\bSPI\.transfer\s*\(/g, '_a.spiTransfer(');
    js = js.replace(/\bSPI\.end\s*\(/g, '_a.spiEnd(');

    // EEPROM
    js = js.replace(/\bEEPROM\.read\s*\(/g, '_a.eepromRead(');
    js = js.replace(/\bEEPROM\.write\s*\(/g, '_a.eepromWrite(');
    js = js.replace(/\bEEPROM\.update\s*\(/g, '_a.eepromUpdate(');
    js = js.replace(/\bEEPROM\.get\s*\(/g, '_a.eepromGet(');
    js = js.replace(/\bEEPROM\.put\s*\(/g, '_a.eepromPut(');
    js = js.replace(/\bEEPROM\.begin\s*\(/g, '_a.eepromBegin(');
    js = js.replace(/\bEEPROM\.commit\s*\(/g, '_a.eepromCommit(');
    js = js.replace(/\bEEPROM\.length\b/g, '512');
    js = js.replace(/\bEEPROM\.length\s*\(/g, '512');

    // SoftwareSerial -- constructor (methods route through existing generic rules)
    js = js.replace(/\bSoftwareSerial\s+(\w+)\s*\(([^)]+)\)/g, 'var $1 = _a.softwareSerialNew($2)');
    js = js.replace(/\b(\w+)\.println\s*\(/g, function (match, v) {
      if (v === 'Serial') return match;
      return '_a.softSerialPrintln(' + v + ', ';
    });
    js = js.replace(/\b(\w+)\.listen\s*\(/g, '_a.softSerialListen($1)');
    js = js.replace(/\b(\w+)\.isListening\s*\(/g, '_a.softSerialIsListening($1)');

    // Stepper library
    js = js.replace(/\bStepper\s+(\w+)\s*\(([^)]+)\)/g, 'var $1 = _a.stepperNew($2)');
    js = js.replace(/\b(\w+)\.setSpeed\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.stepperSetSpeed(' + varName + ', ';
    });
    js = js.replace(/\b(\w+)\.step\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.stepperStep(' + varName + ', ';
    });
    js = js.replace(/\b(\w+)\.distanceToGo\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.stepperDistanceToGo(' + varName + ')';
    });
    js = js.replace(/\b(\w+)\.currentPosition\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.stepperCurrentPosition(' + varName + ')';
    });
    js = js.replace(/\b(\w+)\.setCurrentPosition\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.stepperSetCurrentPosition(' + varName + ', ';
    });
    js = js.replace(/\b(\w+)\.run\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.stepperRun(' + varName + ')';
    });
    js = js.replace(/\b(\w+)\.runSpeed\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.stepperRunSpeed(' + varName + ')';
    });
    js = js.replace(/\b(\w+)\.stop\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.stepperStop(' + varName + ')';
    });
    js = js.replace(/\b(\w+)\.disableOutputs\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.stepperDisableOutputs(' + varName + ')';
    });
    js = js.replace(/\b(\w+)\.enableOutputs\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.stepperEnableOutputs(' + varName + ')';
    });
    js = js.replace(/\b(\w+)\.maxSpeed\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.stepperMaxSpeed(' + varName + ')';
    });
    js = js.replace(/\b(\w+)\.acceleration\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.stepperAcceleration(' + varName + ')';
    });
    js = js.replace(/\b(\w+)\.setAcceleration\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.stepperSetAcceleration(' + varName + ', ';
    });

    // NewPing library
    js = js.replace(/\bNewPing\s+(\w+)\s*\(([^)]+)\)/g, 'var $1 = _a.newPingNew($2)');
    js = js.replace(/\b(\w+)\.ping_cm\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.newPingCm(' + varName + ')';
    });
    js = js.replace(/\b(\w+)\.ping_in\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.newPingInch(' + varName + ')';
    });
    js = js.replace(/\b(\w+)\.ping_median\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.newPingMedian(' + varName + ', ';
    });
    js = js.replace(/\b(\w+)\.ping\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.newPingPing(' + varName + ')';
    });

    // IRremote — IRsend / IRrecv
    js = js.replace(/\bIRsend\s+(\w+)\s*\(([^)]*)\)/g, 'var $1 = _a.irsendNew($2)');
    js = js.replace(/\bIRrecv\s+(\w+)\s*\(([^)]*)\)/g, 'var $1 = _a.irrecvNew($2)');
    js = js.replace(/\b(\w+)\.sendNEC\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.irsendNEC(' + varName + ', ';
    });
    js = js.replace(/\b(\w+)\.sendSony\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.irsendSony(' + varName + ', ';
    });
    js = js.replace(/\b(\w+)\.sendRC5\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.irsendRC5(' + varName + ', ';
    });
    js = js.replace(/\b(\w+)\.sendRC6\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.irsendRC6(' + varName + ', ';
    });
    js = js.replace(/\b(\w+)\.sendRaw\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.irsendRaw(' + varName + ', ';
    });
    js = js.replace(/\b(\w+)\.enableIRIn\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.irrecvEnableIRIn(' + varName + ')';
    });
    js = js.replace(/\b(\w+)\.resume\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.irrecvResume(' + varName + ')';
    });
    js = js.replace(/\b(\w+)\.decode\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.irrecvDecode(' + varName + ', ';
    });
    js = js.replace(/\b(\w+)\.stopIRSend\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.irsendStop(' + varName + ')';
    });
    js = js.replace(/\bresults\.decode_type\b/g, 'results.protocol');
    js = js.replace(/\bresults\.value\b/g, 'results.value');
    js = js.replace(/\bresults\.bits\b/g, 'results.bits');
    js = js.replace(/\bDECODE_SUPPORTED\b/g, 'true');
    js = js.replace(/\bNECBITS\b/g, '32');
    js = js.replace(/\bUSE_FAST\b/g, 'false');

    // FastLED library
    js = js.replace(/\bFastLED\.addLeds\s*\(/g, '_a.fastledAddLeds(');
    js = js.replace(/\bFastLED\.show\s*\(/g, '_a.fastledShow(');
    js = js.replace(/\bFastLED\.setBrightness\s*\(/g, '_a.fastledSetBrightness(');
    js = js.replace(/\bFastLED\.setCorrection\s*\(/g, '_a.fastledSetCorrection(');
    js = js.replace(/\bFastLED\.setColorCorrection\s*\(/g, '_a.fastledSetColorCorrection(');
    js = js.replace(/\bFastLED\.maxPowerInMilliamps\s*\(/g, '_a.fastledMaxPower(');
    js = js.replace(/\bFastLED\.clear\s*\(/g, '_a.fastledClear(');
    js = js.replace(/\bCRGB\s+(\w+)\s*\(([^)]+)\)/g, 'var $1 = _a.crgbNew($2)');
    js = js.replace(/\bCRGB\s+(\w+)\s*\[\s*(\d+)\s*\]/g, 'var $1 = _a.crgbArray($2)');
    js = js.replace(/\bCHSV\s+(\w+)\s*\(([^)]+)\)/g, 'var $1 = _a.chsvNew($2)');
    js = js.replace(/\bTWhite\b/g, '255');

    // Adafruit NeoPixel library
    js = js.replace(/\bAdafruit_NeoPixel\s+(\w+)\s*\(([^)]+)\)/g, 'var $1 = _a.neopixelNew($2)');
    js = js.replace(/\b(\w+)\.show\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.neopixelShow(' + varName + ')';
    });
    js = js.replace(/\b(\w+)\.setPixelColor\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.neopixelSetPixelColor(' + varName + ', ';
    });
    js = js.replace(/\b(\w+)\.getPixelColor\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.neopixelGetPixelColor(' + varName + ', ';
    });
    js = js.replace(/\b(\w+)\.setBrightness\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.neopixelSetBrightness(' + varName + ', ';
    });
    js = js.replace(/\b(\w+)\.Color\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.neopixelColor(' + varName + ', ';
    });
    js = js.replace(/\b(\w+)\.numPixels\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.neopixelNumPixels(' + varName + ')';
    });
    js = js.replace(/\bNEO_GRB\b/g, '0x02');
    js = js.replace(/\bNEO_GRBW\b/g, '0x04');
    js = js.replace(/\bNEO_KHZ800\b/g, '0x00');
    js = js.replace(/\bNEO_KHZ400\b/g, '0x01');
    js = js.replace(/\bNEO_RGB\b/g, '0x00');
    js = js.replace(/\bNEO_RGBW\b/g, '0x03');
    js = js.replace(/\bNEO_BRG\b/g, '0x01');
    js = js.replace(/\bNEO_RBG\b/g, '0x02');

    // MFRC522 RFID library
    js = js.replace(/\bMFRC522\s+(\w+)\s*\(([^)]+)\)/g, 'var $1 = _a.rfidNew($2)');
    js = js.replace(/\b(\w+)\.PCD_Init\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidInit(' + varName + ')';
    });
    js = js.replace(/\b(\w+)\.PCD_DumpVersionToSerial\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidDumpVersion(' + varName + ')';
    });
    js = js.replace(/\b(\w+)\.PICC_IsNewCardPresent\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidIsNewCard(' + varName + ')';
    });
    js = js.replace(/\b(\w+)\.PICC_ReadCardSerial\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidReadCard(' + varName + ')';
    });
    js = js.replace(/\b(\w+)\.PICC_HaltA\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidHaltA(' + varName + ')';
    });
    js = js.replace(/\b(\w+)\.PCD_StopCrypto1\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidStopCrypto(' + varName + ')';
    });
    js = js.replace(/\b(\w+)\.uid\.uidByte\b/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidUidBytes(' + varName + ')';
    });
    js = js.replace(/\b(\w+)\.uid\.size\b/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidUidSize(' + varName + ')';
    });
    js = js.replace(/\b(\w+)\.MIFARE_Read\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidMifareRead(' + varName + ', ';
    });
    js = js.replace(/\b(\w+)\.MIFARE_Write\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidMifareWrite(' + varName + ', ';
    });
    js = js.replace(/\b(\w+)\.PICC_REQA\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidREQA(' + varName + ')';
    });
    js = js.replace(/\b(\w+)\.PICC_WUPA\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidWUPA(' + varName + ')';
    });
    js = js.replace(/\b(\w+)\.PICC_Select\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidSelect(' + varName + ')';
    });
    js = js.replace(/\b(\w+)\.PICC_ComputeBCC\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidComputeBCC(' + varName + ', ';
    });
    js = js.replace(/\b(\w+)\.PICC_StopCrypto1\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidStopCrypto(' + varName + ')';
    });
    js = js.replace(/\b(\w+)\.PICC_DumpDetailsToSerial\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidDumpDetails(' + varName + ')';
    });
    js = js.replace(/\b(\w+)\.PICC_DumpToSerial\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidDumpToSerial(' + varName + ')';
    });
    js = js.replace(/\b(\w+)\.PICC_DumpMifareClassicSectorToSerial\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidDumpSector(' + varName + ', ';
    });
    js = js.replace(/\b(\w+)\.PICC_DumpMifareClassicToSerial\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidDumpClassic(' + varName + ', ';
    });
    js = js.replace(/\b(\w+)\.PICC_DumpMifareUltralightToSerial\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidDumpUltralight(' + varName + ')';
    });
    js = js.replace(/\bMFRC522::MIFARE_Key\b/g, 'var');
    js = js.replace(/\bMFRC522::PICC_Type\b/g, 'var');
    js = js.replace(/\bPICC_TYPE_MIFARE_1K\b/g, '1');
    js = js.replace(/\bPICC_TYPE_MIFARE_4K\b/g, '2');
    js = js.replace(/\bPICC_TYPE_MIFARE_UL\b/g, '3');
    js = js.replace(/\bPICC_TYPE_NOT_COMPLETE\b/g, '0');
    js = js.replace(/\bSTATUS_OK\b/g, '0');
    js = js.replace(/\bSTATUS_ERROR\b/g, '1');
    js = js.replace(/\bSTATUS_COLLISION\b/g, '2');
    js = js.replace(/\bSTATUS_TIMEOUT\b/g, '3');
    js = js.replace(/\bSTATUS_NO_ROOM\b/g, '4');
    js = js.replace(/\bSTATUS_INTERNAL_ERROR\b/g, '5');
    js = js.replace(/\bSTATUS_INVALID\b/g, '6');
    js = js.replace(/\bSTATUS_CRC_WRONG\b/g, '7');
    js = js.replace(/\bSTATUS_MIFARE_NACK\b/g, '8');

    // Servo library
    js = js.replace(/\b(\w+)\.attach\s*\(/g, '_a.servoAttach($1, ');
    js = js.replace(/\b(\w+)\.write\s*\(/g, '_a.servoWrite($1, ');
    js = js.replace(/\b(\w+)\.writeMicroseconds\s*\(/g, '_a.servoWriteMs($1, ');
    js = js.replace(/\b(\w+)\.read\s*\(/g, '_a.servoRead($1');

    // WebServer (ESP32) — map before the generic `.begin` rule below so
    // server.on/send/arg/handleClient get routed to the WebServer stub.
    js = js.replace(/\b(\w+)\.on\s*\(/g, '_a.serverOn($1, ');
    js = js.replace(/\b(\w+)\.send\s*\(/g, '_a.serverSend($1, ');
    js = js.replace(/\b(\w+)\.arg\s*\(/g, '_a.serverArg($1, ');
    js = js.replace(/\b(\w+)\.handleClient\s*\(/g, '_a.serverHandleClient($1, ');

    // LiquidCrystal
    js = js.replace(/\b(\w+)\.begin\s*\(/g, '_a.lcdBegin($1, ');
    js = js.replace(/\b(\w+)\.setCursor\s*\(/g, '_a.lcdSetCursor($1, ');
    js = js.replace(/\b(\w+)\.print\s*\(/g, '_a.lcdPrint($1, ');
    js = js.replace(/\b(\w+)\.clear\s*\(/g, '_a.lcdClear($1');
    js = js.replace(/\b(\w+)\.home\s*\(/g, '_a.lcdHome($1');

    // Make delay async
    js = js.replace(/_a\.delay\s*\(/g, 'await _a.delay(');
    js = js.replace(/_a\.delayMicroseconds\s*\(/g, 'await _a.delayMicroseconds(');
    js = js.replace(/_a\.pulseIn\s*\(/g, 'await _a.pulseIn(');

    // Auto-await calls to user-defined functions (they were transpiled to `async`,
    // so an unawaited call would assign a Promise instead of the returned value).
    for (const name of userFnNames) {
      js = js.replace(
        new RegExp(`(?<!function\\s)(?<!await\\s)(?<![\\w.])\\b${name}\\s*\\(`, 'g'),
        `await ${name}(`
      );
    }

    // Remove C++ type casts like (int), (float), etc.
    js = js.replace(/\((?:int|float|double|long|byte|char|uint8_t|uint16_t)\)\s*/g, '');

    // String() → String()  (already fine for JS)
    // String to string comparison: == for strings works in JS, so fine
    // .charAt(), .length, .indexOf() — all work in JS

    // Fix: handle C++ string char arrays declared as: char str[20];
    // Already handled above

    return js;
  }

  /* ══════════════ EXECUTION CONTEXT ══════════════ */
  buildContext() {
    const self = this;

    return {
      _a: {
        /* Pin control */
        pinMode(pin, mode) {
          const key = `pin_${pin}`;
          self.pinModes[key] = mode;
          self._emitPinChange(key, self.pinStates[key] || 0);
        },
        digitalWrite(pin, val) {
          const key = `pin_${pin}`;
          const v = val ? 1 : 0;
          self.pinStates[key] = v;
          self._emitPinChange(key, v);
        },
        digitalRead(pin) {
          const key = `pin_${pin}`;
          // Check if button connected and pressed
          const state = self.pinStates[key];
          if (self.pinModes[key] === 'INPUT_PULLUP') {
            return state !== undefined ? (state ? 0 : 1) : 1;
          }
          return state || 0;
        },
        analogWrite(pin, val) {
          const key = `pin_${pin}`;
          const v = Math.max(0, Math.min(255, Math.round(Number(val) || 0)));
          self.pinStates[key] = v;
          self._emitPinChange(key, v);
        },
        analogRead(pin) {
          const key = `pin_${pin}`;
          const v = self.pinStates[key];
          return v !== undefined && v !== null && !Number.isNaN(v) ? v : 0;
        },

        /* Timing */
        async delay(ms) {
          ms = Number(ms);
          if (!Number.isFinite(ms) || ms < 0) ms = 0;
          const realMs = ms / self.speed;
          self.simTime += ms;
          self._iterSinceDelay = 0;
          await self._delayPromise(realMs);
        },
        async delayMicroseconds(us) {
          us = Number(us);
          if (!Number.isFinite(us) || us < 0) us = 0;
          const ms = us / 1000;
          const realMs = ms / self.speed;
          self.simTime += ms;
          self._iterSinceDelay = 0;
          await self._delayPromise(realMs);
        },
        millis() { return self.simTime; },
        micros() { return self.simTime * 1000; },

        /* NTP — returns current UTC epoch seconds from the browser clock */
        ntpEpoch() { return Math.floor(Date.now() / 1000); },

        /* Serial */
        serialBegin(baud) {
          self.serialBaud = baud;
          self._serialLog(`[Serial] Opened at ${baud} baud`, 'system');
        },
        serialPrint(val, fmt) {
          let str;
          if (fmt === 16) str = parseInt(val).toString(16).toUpperCase();
          else if (fmt === 2) str = parseInt(val).toString(2);
          else if (fmt === 8) str = parseInt(val).toString(8);
          else if (typeof val === 'number' && !Number.isInteger(val)) {
            const dec = fmt !== undefined ? fmt : 2;
            str = val.toFixed(dec);
          } else str = String(val);
          self._serialLog(str, 'data');
        },
        serialPrintln(val, fmt) {
          let str;
          if (val === undefined) str = '';
          else if (fmt === 16) str = parseInt(val).toString(16).toUpperCase();
          else if (fmt === 2) str = parseInt(val).toString(2);
          else if (fmt === 8) str = parseInt(val).toString(8);
          else if (typeof val === 'number' && !Number.isInteger(val)) {
            const dec = fmt !== undefined ? fmt : 2;
            str = val.toFixed(dec);
          } else str = String(val);
          self._serialLog(str + '\n', 'data');
        },
        serialRead() {
          return self.serialInputBuffer.length > 0
            ? self.serialInputBuffer.shift().charCodeAt(0)
            : -1;
        },
        serialAvailable() { return self.serialInputBuffer.length; },
        serialWrite(val) { self._serialLog(String.fromCharCode(val), 'data'); },
        serialFlush() { },

        /* Math helpers */
        map(val, inMin, inMax, outMin, outMax) {
          if (inMax === inMin) return outMin;
          return (val - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
        },
        constrain(val, lo, hi) { return Math.max(lo, Math.min(hi, val)); },
        random(minOrMax, max) {
          if (max === undefined) {
            const hi = Math.floor(Number(minOrMax) || 0);
            if (hi <= 0) return 0;
            return Math.floor(Math.random() * hi);
          }
          const lo = Math.floor(Number(minOrMax) || 0);
          const hi = Math.floor(Number(max) || 0);
          if (hi <= lo) return lo;
          return Math.floor(Math.random() * (hi - lo)) + lo;
        },
        randomSeed(seed) { /* Can't set Math.random seed in JS easily */ },
        min(a, b) { return Math.min(a, b); },
        max(a, b) { return Math.max(a, b); },

        /* Bit operations */
        bitRead(val, bit) { return (val >> bit) & 1; },
        bitWrite(val, bit, bv) { return bv ? val | (1 << bit) : val & ~(1 << bit); },
        bitSet(val, bit) { return val | (1 << bit); },
        bitClear(val, bit) { return val & ~(1 << bit); },
        bit(b) { return 1 << b; },
        lowByte(val) { return val & 0xFF; },
        highByte(val) { return (val >> 8) & 0xFF; },

        /* Shift in/out */
        shiftIn(dataPin, clockPin, bitOrder) { return 0; }, // stub
        shiftOut(dataPin, clockPin, bitOrder, val) { }, // stub

        /* Interactive sensor widgets (sliders on the canvas).
           Reads a value from a placed sensor component by instance id or type.
           Returns -999 if no matching component/field is found.
           Example: sensorValue('dht11', 'temperature') or sensorValue('pot1', 'value') */
        sensorValue(instIdOrType, field) {
          const canvas = window.CircuitCanvas;
          if (!canvas || !Array.isArray(canvas.components)) return -999;
          const comps = canvas.components;
          let inst = comps.find(c => c.id === instIdOrType);
          if (!inst) inst = comps.find(c => c.type === instIdOrType);
          if (!inst) return -999;
          const rs = inst.runtimeState || {};
          if (rs[field] !== undefined) return rs[field];
          const props = inst.props || {};
          return props[field] !== undefined ? props[field] : -999;
        },

        /* Wire (I2C) stubs */
        wireBegin() { self._serialLog('[Wire] I2C begin\n', 'system'); },
        wireRequestFrom(addr, qty) { return qty; },
        wireBeginTransmission(addr) { },
        wireEndTransmission() { return 0; },
        wireWrite(val) { return 1; },
        wireRead() { return 0; },
        wireAvailable() { return 0; },

        /* SPI stubs */
        spiBegin() { self._serialLog('[SPI] begin\n', 'system'); },
        spiTransfer(val) { return 0; },
        spiEnd() { },

        /* EEPROM */
        eepromRead(addr) { return self._eeprom[addr & 511] || 0; },
        eepromWrite(addr, val) { self._eeprom[addr & 511] = val & 0xFF; },
        eepromUpdate(addr, val) { self._eeprom[addr & 511] = val & 0xFF; },
        eepromGet(addr, obj) { return obj; },
        eepromPut(addr, val) { },
        eepromBegin(size) { self._serialLog(`[EEPROM] begin(${size || 512})\n`, 'system'); },
        eepromCommit() { self._serialLog('[EEPROM] commit\n', 'system'); },

        /* Serial extras */
        serialParseInt() { return 0; },
        serialParseFloat() { return 0.0; },
        serialPeek() { return self.serialInputBuffer.length > 0 ? self.serialInputBuffer[0].charCodeAt(0) : -1; },
        serialReadString() { const s = self.serialInputBuffer.join(''); self.serialInputBuffer = []; return s; },

        /* Tone */
        tone(pin, freq, duration) {
          const key = `pin_${pin}`;
          freq = Number(freq);
          if (!Number.isFinite(freq) || freq <= 0) freq = 440;
          self._startTone(key, freq);
          if (duration) setTimeout(() => self._stopTone(key), (Number(duration) || 0) / self.speed);
        },
        noTone(pin) { self._stopTone(`pin_${pin}`); },

        /* Pulse */
        async pulseIn(pin, val, timeout) {
          await new Promise(resolve => setTimeout(resolve, 10));
          const key = `pin_${pin}`;
          return self.pinStates[key] ? 1000 : 0;
        },

        /* Servo */
        servoAttach(varName, pin) { /* tracked by canvas */ },
        servoWrite(varName, angle) {
          if (varName && varName._ssId) {
            const ch = self._softSerial && self._softSerial[varName._ssId];
            if (ch) { self._serialLog('[SoftwareSerial] write(' + angle + ')\n', 'data'); }
            return;
          }
          self._emitEvent('servo', { angle: Math.max(0, Math.min(180, angle)) });
        },
        servoWriteMs(varName, us) { /* advanced */ },
        servoRead(varName) { return 90; },

        /* LCD (and OLED / WebServer share the generic `.begin` transpile) */
        lcdBegin(varName, cols, rows) {
          if (varName && varName._ssId) {
            const ch = self._softSerial && self._softSerial[varName._ssId];
            if (ch) { ch.listening = true; ch.baud = cols; }
            self._serialLog('[SoftwareSerial] begin(' + cols + ')\n', 'system');
            return;
          }
          if (varName && varName._npId) {
            self._serialLog('[NeoPixel] begin\n', 'system');
            return;
          }
          if (varName && varName.__webserver) {
            const cfg = (self._web = self._web || { port: 80, routes: [], reqIdx: 0, lastHit: 0 });
            cfg.port = Number(cols) || cfg.port || 80;
            self._serialLog(`[WebServer] HTTP server started on port ${cfg.port} → http://192.168.1.105/\n`, 'system');
            return;
          }
          if (varName && varName.__oled) {
            self._emitEvent('oled_power', { on: true });
            return;
          }
          self._emitEvent('lcd_power', { on: true });
        },
        lcdSetCursor(varName, col, row) {
          self._lcdCursor = { col: Number(col) || 0, row: Number(row) || 0 };
        },
        lcdPrint(varName, val) {
          if (varName && varName._ssId) {
            const ch = self._softSerial && self._softSerial[varName._ssId];
            if (ch) { self._serialLog(String(val) + '\n', 'data'); }
            return;
          }
          const text = String(val);
          const cursor = self._lcdCursor || { col: 0, row: 0 };
          // OLED (Adafruit_SSD1306): cursor is in pixels, sized by setTextSize()
          if (varName && varName.__oled) {
            const size = self._oledTextSize || 1;
            self._emitEvent('oled_draw', {
              op: 'print',
              text,
              cursor: { col: cursor.col, row: cursor.row },
              size,
              color: self._oledTextColor === 0 ? 0 : 1,
            });
            self._lcdCursor = { col: cursor.col + text.length * 6 * size, row: cursor.row };
            return;
          }
          self._emitEvent('lcd_print', { text, cursor: { col: cursor.col, row: cursor.row } });
          // Real LCDs advance the cursor after each character (wrap to row 2)
          let col = cursor.col + text.length;
          let row = cursor.row;
          if (col >= 16 && row === 0) { col -= 16; row = 1; }
          if (col >= 16) col = 15;
          self._lcdCursor = { col, row };
        },
        lcdClear(varName) {
          if (varName && varName._npId) {
            const np = self._neopixels && self._neopixels[varName._npId];
            if (np) np.pixels.fill(0);
            return;
          }
          if (varName && varName.__oled) {
            self._emitEvent('oled_draw', { op: 'clear' });
            return;
          }
          self._emitEvent('lcd_clear', {});
        },
        lcdHome(varName) { self._lcdCursor = { col: 0, row: 0 }; },

        /* ══════════ ESP32 — WebServer (simulated HTTP) ══════════ */
        serverOn(server, path, m3, m4) {
          const cfg = (self._web = self._web || { port: 80, routes: [], reqIdx: 0, lastHit: 0 });
          const handler = typeof m3 === 'function' ? m3 : m4;
          const method = typeof m3 === 'function' ? 'GET' : String(m3 || 'GET').replace('HTTP_', '');
          if (typeof handler === 'function') {
            cfg.routes.push({ path: String(path), method, handler });
            self._serialLog(`[WebServer] Route registered: ${method} ${path}\n`, 'system');
          } else {
            self._serialLog(`[WebServer] on("${path}"): handler is not a function — route ignored\n`, 'system');
          }
        },
        serverSend(server, code, type, content) {
          self._webResp = {
            code: Number(code) || 200,
            type: String(type || ''),
            content: String(content || ''),
          };
        },
        serverArg(server, name) { return ''; },
        serverHandleClient(server) {
          const cfg = self._web;
          if (!cfg || !cfg.routes.length) return;
          const now = Date.now();
          if (now - (cfg.lastHit || 0) < 1500) return; // one simulated request per 1.5s
          cfg.lastHit = now;
          const route = cfg.routes[cfg.reqIdx = ((cfg.reqIdx || 0) % cfg.routes.length)];
          cfg.reqIdx++;
          self._webResp = null;
          // Handlers are transpiled to async functions — log when they resolve.
          Promise.resolve()
            .then(() => route.handler())
            .then(() => {
              const resp = self._webResp || { code: 200, type: 'text/html', content: '' };
              self._serialLog(`[WebServer] ${route.method} ${route.path} → ${resp.code} (${resp.type})\n`, 'system');
              const snippet = String(resp.content).replace(/\s*\n\s*/g, ' ').trim();
              if (snippet) {
                self._serialLog(`[WebServer] Response: ${snippet.length > 320 ? snippet.slice(0, 320) + '…' : snippet}\n`, 'system');
              }
            })
            .catch((e) => {
              self._serialLog(`[WebServer] ${route.method} ${route.path} handler error: ${e && e.message ? e.message : e}\n`, 'system');
            });
        },

        /* Interrupts */
        attachInterrupt(num, fn, mode) { },
        detachInterrupt(num) { },

        /* ══════════ ESP32 — LEDC PWM ══════════ */
        ledcSetup(channel, freq, resolution) {
          const res = Number(resolution) || 8;
          self._ledcChannels[channel] = {
            freq: Number(freq) || 5000,
            resolution: res,
            maxDuty: Math.pow(2, res) - 1,
          };
          self._serialLog(`[ESP32] LEDC channel ${channel} → ${self._ledcChannels[channel].freq}Hz (${res}-bit)\n`, 'system');
          return self._ledcChannels[channel].maxDuty;
        },
        ledcSetupChannel(channel, freq, resolution) {
          return this.ledcSetup(channel, freq, resolution);
        },
        ledcAttachPin(pin, channel) {
          const cfg = self._ledcChannels[channel] || (self._ledcChannels[channel] = { freq: 5000, resolution: 8, maxDuty: 255 });
          cfg.pin = Number(pin);
          self._serialLog(`[ESP32] LEDC: attached GPIO ${cfg.pin} to channel ${channel}\n`, 'system');
          return 0;
        },
        ledcAttach(pin, freq, resolution) {
          // Modern (v3+) ESP32 core API: ledcAttach(pin, freq, resolution)
          const res = Number(resolution) || 8;
          self._ledcChannels[Number(pin)] = {
            pin: Number(pin),
            freq: Number(freq) || 5000,
            resolution: res,
            maxDuty: Math.pow(2, res) - 1,
          };
          self._serialLog(`[ESP32] LEDC: attached GPIO ${Number(pin)} → ${Number(freq) || 5000}Hz (${res}-bit)\n`, 'system');
          return true;
        },
        ledcWrite(channelOrPin, duty) {
          let pin;
          const cfg = self._ledcChannels[channelOrPin];
          if (cfg && cfg.pin !== undefined) {
            pin = cfg.pin;
          } else {
            // Also accept a bare GPIO pin (ledcWrite(pin, duty)) or a channel
            // that was attached by GPIO number (new API style).
            pin = Number(channelOrPin);
          }
          if (!Number.isFinite(pin)) return;
          const maxDuty = (cfg && cfg.maxDuty) || 255;
          const v = Math.max(0, Math.min(255, Math.round((Number(duty) || 0) / maxDuty * 255)));
          self.pinStates[`pin_${pin}`] = v;
          self._emitPinChange(`pin_${pin}`, v);
        },
        ledcRead(channelOrPin) {
          const cfg = self._ledcChannels[channelOrPin];
          const pin = cfg && cfg.pin !== undefined ? cfg.pin : Number(channelOrPin);
          if (!Number.isFinite(pin)) return 0;
          return self.pinStates[`pin_${pin}`] || 0;
        },

        /* ══════════ ESP32 — analog / DAC / sensors ══════════ */
        dacWrite(pin, value) {
          const key = `pin_${pin}`;
          const v = Math.max(0, Math.min(255, Math.round(Number(value) || 0)));
          self.pinStates[key] = v;
          self._emitPinChange(key, v);
        },
        analogReadMilliVolts(pin) {
          const v = self.pinStates[`pin_${pin}`];
          if (v === undefined || v === null) return 0;
          // Simulation stores analog values in the 0–1023 range (10-bit)
          return Math.round((Number(v) || 0) * 3300 / 1023);
        },
        analogReadMicroVolts(pin) { return this.analogReadMilliVolts(pin) * 1000; },
        touchRead(pin) { return 0; },
        hallRead() { return 0; },
        temperatureRead() { return 25.0; },
        digitalPinToInterrupt(pin) { return Number(pin); },

        /* ══════════ ESP32 — Wi-Fi (simulated) ══════════ */
        wifiBegin(ssid, pass) {
          self._serialLog(`[ESP32 Wi-Fi] Connecting to "${ssid}"...\n`, 'system');
          setTimeout(() => {
            self._serialLog('[ESP32 Wi-Fi] Connected! IP: 192.168.1.105\n', 'system');
          }, Math.max(50, 800 / self.speed));
        },
        wifiLocalIP() { return '192.168.1.105'; },
        wifiSoftAPIP() { return '192.168.4.1'; },
        wifiStatus() { return 3; }, // WL_CONNECTED
        wifiDisconnect() { self._serialLog('[ESP32 Wi-Fi] Disconnected\n', 'system'); },
        wifiMode() { },
        wifiSoftAP(ssid, pass) {
          self._serialLog(`[ESP32 Wi-Fi] SoftAP "${ssid}" started\n`, 'system');
        },

        /* ══════════ SoftwareSerial ══════════ */
        softwareSerialNew(rxPin, txPin) {
          const id = `_ss_${rxPin}_${txPin}`;
          const buf = [];
          self._softSerial = self._softSerial || {};
          self._softSerial[id] = { rxPin, txPin, buf, listening: false };
          self._serialLog(`[SoftwareSerial] Created rx=${rxPin} tx=${txPin}\n`, 'system');
          return { _ssId: id, rxPin, txPin };
        },
        softSerialBegin(obj, baud) {
          const ch = self._softSerial && self._softSerial[obj._ssId];
          if (ch) { ch.listening = true; ch.baud = baud; }
          self._serialLog(`[SoftwareSerial] begin(${baud})\n`, 'system');
        },
        softSerialWrite(obj, val) {
          const ch = self._softSerial && self._softSerial[obj._ssId];
          if (ch) { self._serialLog(`[SoftwareSerial] write(${val})\n`, 'data'); }
        },
        softSerialPrintln(obj, val) {
          self._serialLog(String(val) + '\n', 'data');
        },
        softSerialRead(obj) {
          const ch = self._softSerial && self._softSerial[obj._ssId];
          if (ch && ch.buf.length > 0) return ch.buf.shift().charCodeAt(0);
          return -1;
        },
        softSerialAvailable(obj) {
          const ch = self._softSerial && self._softSerial[obj._ssId];
          return ch ? ch.buf.length : 0;
        },
        softSerialPeek(obj) {
          const ch = self._softSerial && self._softSerial[obj._ssId];
          if (ch && ch.buf.length > 0) return ch.buf[0].charCodeAt(0);
          return -1;
        },
        softSerialEnd(obj) {
          const ch = self._softSerial && self._softSerial[obj._ssId];
          if (ch) ch.listening = false;
        },
        softSerialFlush(obj) { },
        softSerialListen(obj) {
          const ch = self._softSerial && self._softSerial[obj._ssId];
          if (ch) ch.listening = true;
        },
        softSerialIsListening(obj) {
          const ch = self._softSerial && self._softSerial[obj._ssId];
          return ch ? ch.listening : false;
        },

        /* ══════════ Stepper ══════════ */
        stepperNew(stepsPerRev, pin1, pin2) {
          const id = `_stepper_${pin1}_${pin2}`;
          self._steppers = self._steppers || {};
          const s = { stepsPerRev, pin1, pin2, pos: 0, target: 0, speed: 1, accel: 100 };
          self._steppers[id] = s;
          self._serialLog(`[Stepper] Created stepsPerRev=${stepsPerRev}\n`, 'system');
          return { _stepperId: id };
        },
        stepperSetSpeed(obj, rpm) {
          const s = self._steppers && self._steppers[obj._stepperId];
          if (s) s.speed = Number(rpm) || 1;
        },
        stepperStep(obj, steps) {
          const s = self._steppers && self._steppers[obj._stepperId];
          if (s) { s.pos += Number(steps) || 0; s.target = s.pos; }
          self._serialLog(`[Stepper] step(${steps}) → pos=${s ? s.pos : 0}\n`, 'system');
        },
        stepperDistanceToGo(obj) {
          const s = self._steppers && self._steppers[obj._stepperId];
          return s ? s.target - s.pos : 0;
        },
        stepperCurrentPosition(obj) {
          const s = self._steppers && self._steppers[obj._stepperId];
          return s ? s.pos : 0;
        },
        stepperSetCurrentPosition(obj, pos) {
          const s = self._steppers && self._steppers[obj._stepperId];
          if (s) s.pos = s.target = Number(pos) || 0;
        },
        stepperRun(obj) {
          const s = self._steppers && self._steppers[obj._stepperId];
          if (!s) return false;
          if (s.pos === s.target) return false;
          s.pos += s.pos < s.target ? 1 : -1;
          return true;
        },
        stepperRunSpeed(obj) {
          return this.stepperRun(obj);
        },
        stepperStop(obj) {
          const s = self._steppers && self._steppers[obj._stepperId];
          if (s) s.target = s.pos;
        },
        stepperDisableOutputs(obj) { },
        stepperEnableOutputs(obj) { },
        stepperMaxSpeed(obj) {
          const s = self._steppers && self._steppers[obj._stepperId];
          return s ? s.speed : 0;
        },
        stepperAcceleration(obj) {
          const s = self._steppers && self._steppers[obj._stepperId];
          return s ? s.accel : 0;
        },
        stepperSetAcceleration(obj, accel) {
          const s = self._steppers && self._steppers[obj._stepperId];
          if (s) s.accel = Number(accel) || 100;
        },

        /* ══════════ NewPing ══════════ */
        newPingNew(triggerPin, echoPin, maxDistance) {
          const id = `_ping_${triggerPin}_${echoPin}`;
          self._pings = self._pings || {};
          self._pings[id] = { triggerPin, echoPin, maxDist: maxDistance || 400 };
          return { _pingId: id };
        },
        newPingCm(obj) {
          const p = self._pings && self._pings[obj._pingId];
          if (!p) return 0;
          const key = `pin_${p.triggerPin}`;
          const v = self.pinStates[key] || 0;
          return v > 0 ? Math.min(p.maxDist, Math.round(Math.random() * p.maxDist)) : 0;
        },
        newPingInch(obj) {
          return Math.round(this.newPingCm(obj) / 2.54);
        },
        newPingMedian(obj, iter) {
          const results = [];
          for (let i = 0; i < (iter || 5); i++) results.push(this.newPingCm(obj));
          results.sort((a, b) => a - b);
          return results[Math.floor(results.length / 2)] || 0;
        },
        newPingPing(obj) {
          return this.newPingCm(obj);
        },

        /* ══════════ IRremote ══════════ */
        irsendNew(pin) {
          self._irsend = self._irsend || {};
          self._irsend.pin = pin;
          return { _irId: 'irsend' };
        },
        irrecvNew(pin) {
          self._irrecv = self._irrecv || {};
          self._irrecv.pin = pin;
          self._irrecv.results = { protocol: 0, value: 0, bits: 0 };
          return { _irId: 'irrecv' };
        },
        irsendNEC(obj, data, nbits) {
          self._serialLog(`[IRremote] Send NEC: 0x${Number(data).toString(16).toUpperCase()} (${nbits || 32} bits)\n`, 'system');
        },
        irsendSony(obj, data, nbits) {
          self._serialLog(`[IRremote] Send Sony: 0x${Number(data).toString(16).toUpperCase()} (${nbits || 12} bits)\n`, 'system');
        },
        irsendRC5(obj, data, nbits) {
          self._serialLog(`[IRremote] Send RC5: 0x${Number(data).toString(16).toUpperCase()} (${nbits || 14} bits)\n`, 'system');
        },
        irsendRC6(obj, data, nbits) {
          self._serialLog(`[IRremote] Send RC6: 0x${Number(data).toString(16).toUpperCase()} (${nbits || 20} bits)\n`, 'system');
        },
        irsendRaw(buf, len, hz) {
          self._serialLog(`[IRremote] Send raw: ${len} samples\n`, 'system');
        },
        irsendStop(obj) { },
        irrecvEnableIRIn(obj) {
          self._serialLog('[IRremote] IR receiver enabled\n', 'system');
        },
        irrecvDecode(obj, results) {
          const r = self._irrecv ? self._irrecv.results : { protocol: 0, value: 0, bits: 0 };
          if (results) {
            results.protocol = r.protocol;
            results.value = r.value;
            results.bits = r.bits;
          }
          return false;
        },
        irrecvResume(obj) { },

        /* ══════════ FastLED ══════════ */
        fastledAddLeds(ledType, dataPin, numLeds) {
          self._fastled = self._fastled || { leds: [], brightness: 255 };
          self._fastled.leds = new Array(Number(numLeds) || 0).fill(null).map(() => ({ r: 0, g: 0, b: 0 }));
          self._fastled.dataPin = dataPin;
          self._serialLog(`[FastLED] ${numLeds} LEDs on pin ${dataPin}\n`, 'system');
        },
        fastledShow() {
          if (self._fastled) {
            self._emitEvent('fastled_show', { leds: self._fastled.leds, brightness: self._fastled.brightness });
          }
        },
        fastledSetBrightness(b) {
          if (self._fastled) self._fastled.brightness = Math.max(0, Math.min(255, Number(b) || 0));
        },
        fastledSetCorrection(type) { },
        fastledSetColorCorrection(type) { },
        fastledMaxPower(milliamps) { },
        fastledClear() {
          if (self._fastled) self._fastled.leds.forEach(l => { l.r = 0; l.g = 0; l.b = 0; });
        },
        crgbNew(r, g, b) { return { r: Math.max(0, Math.min(255, Number(r) || 0)), g: Math.max(0, Math.min(255, Number(g) || 0)), b: Math.max(0, Math.min(255, Number(b) || 0)) }; },
        crgbArray(size) { return new Array(Number(size) || 0).fill(null).map(() => ({ r: 0, g: 0, b: 0 })); },
        chsvNew(h, s, v) {
          h = Number(h) || 0; s = Number(s) || 255; v = Number(v) || 255;
          const c = { r: 0, g: 0, b: 0 };
          const i = Math.floor(h / 43) % 6;
          const f = (h / 43) - Math.floor(h / 43);
          const p = (v * (255 - s)) >> 8;
          const q = (v * (255 - (s * f) >> 8)) >> 8;
          const t = (v * (255 - (s * (255 - f) >> 8))) >> 8;
          switch (i) {
            case 0: c.r = v; c.g = t; c.b = p; break;
            case 1: c.r = q; c.g = v; c.b = p; break;
            case 2: c.r = p; c.g = v; c.b = t; break;
            case 3: c.r = p; c.g = q; c.b = v; break;
            case 4: c.r = t; c.g = p; c.b = v; break;
            case 5: c.r = v; c.g = p; c.b = q; break;
          }
          return c;
        },

        /* ══════════ Adafruit NeoPixel ══════════ */
        neopixelNew(numLedsPin, pinOrType, type) {
          const numLeds = Number(numLedsPin) || 0;
          const pin = typeof pinOrType === 'number' ? pinOrType : 6;
          const id = `_np_${pin}`;
          self._neopixels = self._neopixels || {};
          self._neopixels[id] = { pin, numLeds, brightness: 255, pixels: new Array(numLeds).fill(0) };
          return { _npId: id };
        },
        neopixelBegin(obj) {
          self._serialLog('[NeoPixel] begin\n', 'system');
        },
        neopixelShow(obj) {
          const np = self._neopixels && self._neopixels[obj._npId];
          if (np) {
            const leds = np.pixels.map(c => ({
              r: (c >> 16) & 0xFF,
              g: (c >> 8) & 0xFF,
              b: c & 0xFF,
            }));
            self._emitEvent('fastled_show', { leds, brightness: np.brightness });
          }
        },
        neopixelSetPixelColor(obj, i, rOrColor, g, b) {
          const np = self._neopixels && self._neopixels[obj._npId];
          if (!np) return;
          const i2 = Number(i) || 0;
          if (g !== undefined) {
            np.pixels[i2] = ((Number(rOrColor) || 0) << 16) | ((Number(g) || 0) << 8) | (Number(b) || 0);
          } else {
            np.pixels[i2] = Number(rOrColor) || 0;
          }
        },
        neopixelGetPixelColor(obj, i) {
          const np = self._neopixels && self._neopixels[obj._npId];
          return np ? (np.pixels[Number(i) || 0] || 0) : 0;
        },
        neopixelSetBrightness(obj, b) {
          const np = self._neopixels && self._neopixels[obj._npId];
          if (np) np.brightness = Math.max(0, Math.min(255, Number(b) || 0));
        },
        neopixelColor(obj, r, g, b) {
          return ((Number(r) || 0) << 16) | ((Number(g) || 0) << 8) | (Number(b) || 0);
        },
        neopixelNumPixels(obj) {
          const np = self._neopixels && self._neopixels[obj._npId];
          return np ? np.numLeds : 0;
        },
        neopixelClear(obj) {
          const np = self._neopixels && self._neopixels[obj._npId];
          if (np) np.pixels.fill(0);
        },

        /* ══════════ MFRC522 RFID ══════════ */
        rfidNew(csPin, rstPin) {
          const id = `_rfid_${csPin}_${rstPin}`;
          self._rfid = self._rfid || {};
          self._rfid[id] = { csPin, rstPin, initialized: false, cardPresent: false, uidBytes: [0xA1, 0xB2, 0xC3, 0xD4], uidSize: 4 };
          self._serialLog(`[MFRC522] Created CS=${csPin} RST=${rstPin}\n`, 'system');
          return { _rfidId: id, uid: { uidByte: null, size: 0 } };
        },
        rfidInit(obj) {
          const r = self._rfid && self._rfid[obj._rfidId];
          if (r) {
            r.initialized = true;
            self._serialLog('[MFRC522] PCD_Init\n', 'system');
            self._serialLog('[MFRC522] Firmware: v0x92 (simulated)\n', 'system');
          }
        },
        rfidDumpVersion(obj) {
          self._serialLog('[MFRC522] PCD Version: v2.0 (simulated)\n', 'system');
        },
        rfidIsNewCard(obj) {
          const r = self._rfid && self._rfid[obj._rfidId];
          if (!r || !r.initialized) return false;
          // Simulate a card being present every few calls
          r.cardPresent = Math.random() < 0.3;
          return r.cardPresent;
        },
        rfidReadCard(obj) {
          const r = self._rfid && self._rfid[obj._rfidId];
          if (!r || !r.cardPresent) return false;
          obj.uid = { uidByte: r.uidBytes, size: r.uidSize };
          self._serialLog(`[MFRC522] Card UID: ${r.uidBytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ')}\n`, 'system');
          return true;
        },
        rfidHaltA(obj) { },
        rfidStopCrypto(obj) { },
        rfidUidBytes(obj) {
          const r = self._rfid && self._rfid[obj._rfidId];
          return r ? r.uidBytes : [0];
        },
        rfidUidSize(obj) {
          const r = self._rfid && self._rfid[obj._rfidId];
          return r ? r.uidSize : 0;
        },
        rfidMifareRead(obj, blockAddr, buf) {
          self._serialLog(`[MFRC522] MIFARE_Read block ${blockAddr}\n`, 'system');
          return true;
        },
        rfidMifareWrite(obj, blockAddr, buf) {
          self._serialLog(`[MFRC522] MIFARE_Write block ${blockAddr}\n`, 'system');
          return true;
        },
        rfidREQA(obj) { return 0; },
        rfidWUPA(obj) { return 0; },
        rfidSelect(obj) { return 0; },
        rfidComputeBCC(obj, buf) { return 0; },
        rfidDumpDetails(obj) { },
        rfidDumpToSerial(obj) { },
        rfidDumpSector(obj, uid, sector) { },
        rfidDumpClassic(obj, uid, type) { },
        rfidDumpUltralight(obj) { },
      },

      /* Global constants */
      HIGH: 1, LOW: 0,
      INPUT: 'INPUT', OUTPUT: 'OUTPUT', INPUT_PULLUP: 'INPUT_PULLUP',
      RISING: 'RISING', FALLING: 'FALLING', CHANGE: 'CHANGE',
      A0: this.board === 'esp32_devkit_v1' ? 36 : 14,
      A1: this.board === 'esp32_devkit_v1' ? 39 : 15,
      A2: this.board === 'esp32_devkit_v1' ? 34 : 16,
      A3: this.board === 'esp32_devkit_v1' ? 35 : 17,
      A4: this.board === 'esp32_devkit_v1' ? 32 : 18,
      A5: this.board === 'esp32_devkit_v1' ? 33 : 19,
      LED_BUILTIN: this.board === 'esp32_devkit_v1' ? 2 : 13,
      PI: Math.PI, TWO_PI: Math.PI * 2, HALF_PI: Math.PI / 2,
      DEG_TO_RAD: Math.PI / 180, RAD_TO_DEG: 180 / Math.PI,
      MSBFIRST: 1, LSBFIRST: 0,
      BYTE: 0, WORD: 1,
      // ESP32 Wi-Fi constants
      WIFI_STA: 1, WIFI_AP: 2, WIFI_AP_STA: 3,
      WL_CONNECTED: 3, WL_DISCONNECTED: 6,
      // ESP32 WebServer HTTP method constants
      HTTP_GET: 'GET', HTTP_POST: 'POST', HTTP_PUT: 'PUT', HTTP_DELETE: 'DELETE',
      HTTP_HEAD: 'HEAD', HTTP_OPTIONS: 'OPTIONS', HTTP_PATCH: 'PATCH', HTTP_ANY: 'ANY',
      // Adafruit_SSD1306 constants
      SSD1306_SWITCHCAPVCC: 0x01, SSD1306_EXTERNALVCC: 0x02,
      SSD1306_I2C_ADDRESS: 0x3C, SSD1306_WHITE: 1, SSD1306_BLACK: 0,
      SSD1306_SETCONTRAST: 0x81, SSD1306_SETVCOMDETECT: 0xDB,

      /* Servo/LCD class stubs */
      Servo: function () { return {}; },
      LiquidCrystal: function () {
        // Methods that aren't transpiled to _a.lcd* calls must exist on the object
        const powerOn = () => self._emitEvent('lcd_power', { on: true });
        return {
          init: powerOn, begin: powerOn, backlight: powerOn, noBacklight() { },
          setBacklight() { }, display() { }, noDisplay() { }, blink() { },
          noBlink() { }, cursor() { }, noCursor() { }, createChar() { },
        };
      },
      LiquidCrystal_I2C: function () {
        const powerOn = () => self._emitEvent('lcd_power', { on: true });
        return {
          init: powerOn, begin: powerOn, backlight: powerOn, noBacklight() { },
          setBacklight() { }, display() { }, noDisplay() { }, blink() { },
          noBlink() { }, cursor() { }, noCursor() { }, createChar() { },
        };
      },
      /* OLED 128×64 (SSD1306, I2C) — Adafruit_SSD1306 library stub.
         Text/setCursor calls are transpiled to _a.lcd* and dispatched here via
         the __oled tag; the remaining GFX drawing calls emit oled_draw events. */
      Adafruit_SSD1306: function () {
        const num = (v) => Math.round(Number(v) || 0);
        const draw = (op, extra) => self._emitEvent('oled_draw', Object.assign({ op }, extra));
        return {
          __oled: true,
          begin() { self._emitEvent('oled_power', { on: true }); },
          init() { self._emitEvent('oled_power', { on: true }); },
          clearDisplay() { draw('clear'); },
          display() { /* live rendering — nothing to do */ },
          setCursor(col, row) { self._lcdCursor = { col: num(col), row: num(row) }; },
          setTextSize(s) { self._oledTextSize = Math.max(1, Math.round(Number(s) || 1)); },
          setTextColor(c) { self._oledTextColor = c ? 1 : 0; },
          setTextWrap(w) { },
          setRotation(r) { },
          invertDisplay(i) { draw('invert', { invert: !!i }); },
          setContrast(c) { },
          drawPixel(x, y) { draw('pixel', { x: num(x), y: num(y) }); },
          drawLine(x0, y0, x1, y1) { draw('line', { x0: num(x0), y0: num(y0), x1: num(x1), y1: num(y1) }); },
          drawRect(x, y, w, h) { draw('rect', { x: num(x), y: num(y), w: num(w), h: num(h) }); },
          fillRect(x, y, w, h) { draw('fillRect', { x: num(x), y: num(y), w: num(w), h: num(h) }); },
          drawCircle(x, y, r) { draw('circle', { x: num(x), y: num(y), r: num(r) }); },
          fillCircle(x, y, r) { draw('fillCircle', { x: num(x), y: num(y), r: num(r) }); },
          fillScreen(color) { draw('fillScreen', { color: color ? 1 : 0 }); },
          drawBitmap() { },
          ssd1306_command() { },
          ssd1306_command1() { },
        };
      },
      /* Library stubs (instances) */
      Wire: { begin() { }, requestFrom() { return 0; }, beginTransmission() { }, endTransmission() { return 0; }, write() { return 1; }, read() { return 0; }, available() { return 0; } },
      SPI: { begin() { }, transfer() { return 0; }, end() { }, setClockDivider() { }, setBitOrder() { }, setDataMode() { } },
      /* ESP32 Wi-Fi object stub */
      WiFi: {
        begin(ssid, pass) { self._serialLog(`[ESP32 Wi-Fi] Connecting to "${ssid}"...\n`, 'system'); setTimeout(() => self._serialLog('[ESP32 Wi-Fi] Connected! IP: 192.168.1.105\n', 'system'), Math.max(50, 800 / self.speed)); },
        localIP() { return '192.168.1.105'; },
        softAPIP() { return '192.168.4.1'; },
        status() { return 3; },
        disconnect() { },
        mode() { },
        softAP(ssid) { self._serialLog(`[ESP32 Wi-Fi] SoftAP "${ssid}" started\n`, 'system'); },
        setAutoConnect() { },
      },
      /* ESP32 Wi-Fi client + MQTT (PubSubClient).
         When the MQTT.js library is loaded (index.html), this also publishes
         to a real public broker over WebSockets (HiveMQ public broker by
         default), so you can watch the messages in MQTTX / any MQTT client.
         If no real broker can be reached, a local in-page broker is used as a
         fallback so the pub/sub demo still works offline. */
      WiFiClient: function () { return {}; },
      /* ESP32 WebServer stub — routes are registered via _a.serverOn() and
         served by _a.serverHandleClient(), which generates a simulated HTTP
         request to each route every ~1.5s so you can watch requests/responses
         in the Serial Monitor. */
      WebServer: function (port) {
        const cfg = (self._web = self._web || { port: 80, routes: [], reqIdx: 0, lastHit: 0 });
        cfg.port = Number(port) || cfg.port || 80;
        return {
          __webserver: true,
          begin() { },
          send() { },
          on() { },
          arg() { return ''; },
          sendHeader() { },
          handleClient() { },
        };
      },
      PubSubClient: function () {
        const broker = (self._mqtt = self._mqtt || { subs: new Map(), connected: false });
        // Unique per-session suffix so a shared public broker doesn't clash
        // with other users running the same example.
        const session = Math.random().toString(36).slice(2, 7);
        const ns = (topic) => `${topic}/${session}`;
        const bare = (topic) => (String(topic).endsWith(`/${session}`)
          ? String(topic).slice(0, -(session.length + 1))
          : String(topic));

        let connected = false;
        let cb = null;
        let real = null;       // real MQTT.js client
        let realReady = false; // real broker connected
        const pendingSubs = new Set();

        const deliver = (topic, payload) => {
          if (!cb) return;
          try {
            cb(topic, payload, String(payload).length);
          } catch (e) {
            self._serialLog(`[MQTT] callback error: ${e && e.message ? e.message : e}\n`, 'system');
          }
        };

        const tryRealConnect = (clientId) => {
          if (typeof window.mqtt !== 'function' || !window.WebSocket) {
            self._serialLog('[MQTT] MQTT.js not loaded — using local broker only\n', 'system');
            return;
          }
          const cfg = window.ArduSimMQTT || {};
          const url = cfg.url || 'wss://broker.hivemq.com:8884/mqtt';
          try {
            real = window.mqtt.connect(url, {
              clientId,
              clean: true,
              connectTimeout: cfg.timeout || 10000,
              reconnectPeriod: 3000, // keep retrying so the live broker comes up if it was briefly unreachable
              keepalive: 30,
            });
            self._mqttOpen.push(real);
            real.on('connect', () => {
              realReady = true;
              self._serialLog(`[MQTT] Live broker connected (${url}) as "${clientId}"\n`, 'system');
              self._serialLog(`[MQTT] Watch it in MQTTX → subscribe to: ${ns('ardusim/temp')} (and ${ns('ardusim/led')})\n`, 'system');
              for (const t of pendingSubs) real.subscribe(t);
              pendingSubs.clear();
            });
            real.on('message', (topic, payload) => {
              deliver(bare(topic), payload.toString());
            });
            real.on('error', (e) => {
              self._serialLog(`[MQTT] Live broker error: ${e && e.message ? e.message : e}\n`, 'system');
            });
            real.on('close', () => {
              if (realReady) self._serialLog('[MQTT] Live broker connection closed — retrying...\n', 'system');
              realReady = false;
            });
            // If the public broker can't be reached at all, say so once so the
            // user knows the demo is running in local-only mode.
            setTimeout(() => {
              if (!realReady) {
                self._serialLog('[MQTT] Public broker unreachable (check internet access) — running local broker only\n', 'system');
              }
            }, 12000);
          } catch (e) {
            self._serialLog(`[MQTT] Live broker unavailable — using local broker only (${e && e.message ? e.message : e})\n`, 'system');
          }
        };

        return {
          setServer(host, port) {
            self._serialLog(`[MQTT] Broker ${host}:${port}\n`, 'system');
          },
          setCallback(callback) { cb = callback; },
          connect(id) {
            const clientId = id || `ArduSim_${Math.random().toString(36).slice(2, 8)}`;
            connected = true;
            broker.connected = true;
            self._serialLog(`[MQTT] Connecting as "${clientId}"...\n`, 'system');
            tryRealConnect(clientId);
            return true;
          },
          disconnect() {
            connected = false;
            broker.connected = false;
            if (real) {
              try { real.end(true); } catch (e) { /* noop */ }
              real = null;
            }
            realReady = false;
            self._serialLog('[MQTT] Disconnected\n', 'system');
          },
          connected() { return connected; },
          subscribe(topic) {
            const t = String(topic);
            if (!broker.subs.has(t)) broker.subs.set(t, new Set());
            broker.subs.get(t).add(deliver);
            self._serialLog(`[MQTT] Subscribed "${t}"\n`, 'system');
            if (real) {
              if (realReady) real.subscribe(ns(t));
              else pendingSubs.add(ns(t));
            }
            return true;
          },
          unsubscribe(topic) {
            const t = String(topic);
            if (broker.subs.has(t)) broker.subs.get(t).delete(deliver);
            if (real && realReady) real.unsubscribe(ns(t));
            return true;
          },
          publish(topic, payload) {
            const t = String(topic);
            const msg = String(payload);
            self._serialLog(`[MQTT] Publish "${t}" → ${msg}\n`, 'system');
            if (real) {
              try {
                real.publish(ns(t), msg, { qos: 0, retain: false });
              } catch (e) { /* noop */ }
            }
            // Local delivery: while the live broker is connected the message also
            // returns through its own subscription, so only deliver locally when
            // there is no real broker to avoid double-delivering to the callback.
            if (!realReady) {
              const listeners = broker.subs.get(t);
              if (listeners) for (const l of [...listeners]) l(t, msg);
            }
            return true;
          },
          loop() { return true; },
        };
      },
    };
  }

  /* ══════════════ COMPILE & RUN ══════════════ */
  async compile(code) {
    try {
      const js = this.transpile(code);
      const ctx = this.buildContext();
      const rawKeys = Object.keys(ctx);
      const rawVals = Object.values(ctx);
      const filtered = [];
      const reserved = new Set([
        'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else',
        'enum', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'new',
        'null', 'return', 'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield'
      ]);

      for (let i = 0; i < rawKeys.length; i += 1) {
        const key = rawKeys[i];
        if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) continue;
        if (reserved.has(key)) continue;
        filtered.push({ key, val: rawVals[i] });
      }

      const keys = filtered.map(entry => entry.key);
      const vals = filtered.map(entry => entry.val);

      // Wrap the sketch in a block so user `let`/`const` names may shadow the
      // injected context params (e.g. a sketch declaring its own HIGH/A0).
      // The `return` lives inside the same block, so setup/loop stay in scope.
      const body = `{\n${js}\n\nif(typeof setup === "undefined") throw new Error("Missing setup() function. Every Arduino sketch needs a setup() function."); if(typeof loop === "undefined") throw new Error("Missing loop() function. Every Arduino sketch needs a loop() function."); return { setup, loop };\n}`;

      // Try to build the function — will throw on syntax errors
      const fn = new Function(...keys, body);
      this._compiledFn = fn;
      this._compiledCtx = { keys, vals, fn };
      this._compiledJs = js;
      return { ok: true, compiledJs: js };
    } catch (err) {
      const friendly = this._friendlyError(err && err.message ? err.message : String(err), err);
      return { ok: false, error: friendly, rawError: err && err.message ? err.message : String(err) };
    }
  }

  async run(code) {
    if (this.isRunning) this.stop();
    if (typeof code !== 'string') code = '';
    this.simTime = 0;
    this.pinStates = {};
    this.pinModes = {};
    this._delays = [];
    this._lcdLines = ['', ''];
    this._lcdCursor = { col: 0, row: 0 };
    this._mqtt = { subs: new Map(), connected: false };
    this._startRealTime = Date.now();
    this._fpsFrames = 0;
    this._fpsLast = Date.now();
    this._fps = 0;
    this._loopCount = 0;
    this._iterSinceDelay = 0;

    // Compile first
    const result = await this.compile(code);
    if (!result.ok) {
      this._emitError(result.error);
      return false;
    }

    this.isRunning = true;
    this.isPaused = false;
    const runId = ++this._runSeq;

    const { keys, vals, fn } = this._compiledCtx;

    this._serialLog('[ArduSim] Simulation started\n', 'system');
    if (this.onStart) this.onStart();

    // Start FPS ticker
    this._fpsInterval = setInterval(() => this._tickFps(), 500);

    let hadError = false;

    try {
      const { setup, loop } = fn(...vals);

      // Run setup once
      await setup();

      // Run loop repeatedly
      while (this.isRunning && runId === this._runSeq) {
        if (this.isPaused) {
          await new Promise(resolve => { this._resumeResolve = resolve; });
        }
        this._iterSinceDelay++;
        // Infinite-loop guard: yield if no delay has been called in many iterations
        if (this._iterSinceDelay > this._MAX_TIGHT_ITERS) {
          this._iterSinceDelay = 0;
          await new Promise(r => setTimeout(r, 1));
        }
        await loop();
        this._loopCount++;
        // Yield to UI thread every iteration
        await new Promise(r => setTimeout(r, 0));
      }
    } catch (err) {
      if (err && err.message !== 'SIMULATION_STOPPED') {
        hadError = true;
        const friendly = this._friendlyError(err.message ? err.message : String(err), err instanceof Error ? err : undefined);
        this._emitError(friendly);
        this._serialLog(`[Error] ${friendly}\n`, 'error');
      }
    } finally {
      if (runId === this._runSeq) {
        if (this._fpsInterval) {
          clearInterval(this._fpsInterval);
          this._fpsInterval = null;
        }
        // Release any pending pause
        if (this._resumeResolve) {
          const r = this._resumeResolve;
          this._resumeResolve = null;
          r();
        }
      }
    }

    if (runId === this._runSeq) {
      this.isRunning = false;
      this._serialLog('[ArduSim] Simulation stopped\n', 'system');
      if (this.onStop) this.onStop();
    }
    return !hadError;
  }

  stop() {
    this.isRunning = false;
    this.isPaused = false;
    this._runSeq++;
    // Close any live MQTT connections
    for (const c of this._mqttOpen) {
      try { c.end(true); } catch (e) { /* noop */ }
    }
    this._mqttOpen = [];
    this._mqtt = { subs: new Map(), connected: false };
    // Cancel all pending delays
    for (const d of this._delays) {
      clearTimeout(d.id);
      if (d.reject) d.reject(new Error('SIMULATION_STOPPED'));
    }
    this._delays = [];
    if (this._resumeResolve) {
      const r = this._resumeResolve;
      this._resumeResolve = null;
      r();
    }
    this._stopAllTones();
  }

  /* Pausable sketch delay — records start/duration so pause() can freeze it */
  _delayPromise(realMs) {
    const entry = {
      duration: Math.max(0, realMs),
      start: Date.now(),
      id: null,
      frozen: false,
      resolve: null,
      reject: null,
    };
    const startTimer = () => {
      entry.id = setTimeout(() => {
        const idx = this._delays.indexOf(entry);
        if (idx !== -1) this._delays.splice(idx, 1);
        if (entry.resolve) entry.resolve();
      }, Math.max(0, entry.duration));
    };
    return new Promise((resolve, reject) => {
      entry.resolve = resolve;
      entry.reject = reject;
      startTimer();
      this._delays.push(entry);
    });
  }

  pause() {
    this.isPaused = true;
    // Freeze any in-flight sketch delay so pause takes effect immediately
    const now = Date.now();
    for (const d of this._delays) {
      if (d.frozen) continue;
      const remaining = Math.max(0, d.duration - (now - d.start));
      clearTimeout(d.id);
      d.frozen = true;
      d.duration = remaining;
    }
  }

  resume() {
    this.isPaused = false;
    // Restart any frozen delays with their remaining time
    const now = Date.now();
    for (const d of this._delays) {
      if (!d.frozen) continue;
      d.frozen = false;
      d.start = now;
      d.id = setTimeout(() => {
        const idx = this._delays.indexOf(d);
        if (idx !== -1) this._delays.splice(idx, 1);
        if (d.resolve) d.resolve();
      }, Math.max(0, d.duration));
    }
    if (this._resumeResolve) {
      const r = this._resumeResolve;
      this._resumeResolve = null;
      r();
    }
  }

  setSpeed(s) {
    const v = parseFloat(s);
    this.speed = Number.isFinite(v) ? Math.min(100, Math.max(0.01, v)) : 1;
  }

  setBoard(board) {
    this.board = (board === 'esp32_devkit_v1') ? 'esp32_devkit_v1' : 'arduino_uno';
  }

  /* ── FPS tracking ── */
  _tickFps() {
    const now = Date.now();
    const elapsed = now - this._fpsLast;
    if (elapsed > 0) {
      this._fps = Math.round((this._loopCount * 1000) / elapsed);
    }
    this._loopCount = 0;
    this._fpsLast = now;
    if (this.onTick) this.onTick(this.simTime, this._fps);
  }

  /* ── Friendly error messages ── */
  _friendlyError(msg, err) {
    if (!msg) msg = 'An unknown error occurred';
    let line = '';
    // Runtime errors carry the compiled-code line in their stack as the first
    // "<anonymous>:N" frame. Syntax errors from `new Function` do not, and the
    // first such frame would instead be the transpiler itself — so skip them.
    if (err && err.stack && !(err instanceof SyntaxError)) {
      const m = String(err.stack).match(/<anonymous>:(\d+)(?::\d+)?/);
      if (m) {
        const n = parseInt(m[1], 10) - 1; // account for the wrapper block offset
        line = ` — line ${n > 0 ? n : 1}`;
      }
    }
    if (err instanceof SyntaxError) return `Syntax error: ${msg}. Check for missing semicolons or braces.`;
    if (err instanceof ReferenceError) {
      const name = msg.match(/([A-Za-z_$][\w$]*)\s+is not defined/);
      return `'${name ? name[1] : 'value'}' is not defined${line}. Did you forget to declare a variable or include a library?`;
    }
    if (err instanceof TypeError) return `Type error${line}: ${msg}. Check for null values or wrong argument types.`;
    if (err instanceof RangeError) return `Range error${line}: ${msg}. Check for values out of allowed range.`;
    if (msg.includes('Missing setup()')) return 'Missing setup() function. Every Arduino sketch needs a setup() function.';
    if (msg.includes('Missing loop()')) return 'Missing loop() function. Every Arduino sketch needs a loop() function.';
    if (msg.includes('Maximum call stack')) return 'Stack overflow: infinite recursion detected. Check your function calls.';
    if (msg.includes('is not defined')) {
      const m = msg.match(/'([^']+)' is not defined/);
      if (m) return `'${m[1]}' is not defined${line}. Did you forget to declare a variable or include a library?`;
    }
    return msg + line;
  }

  sendSerialInput(text) {
    if (typeof text !== 'string') return;
    for (const ch of text) {
      this.serialInputBuffer.push(ch);
    }
    // Never let the input buffer grow without bound
    if (this.serialInputBuffer.length > 4096) {
      this.serialInputBuffer.splice(0, this.serialInputBuffer.length - 4096);
    }
  }

  setPinState(pinKey, value) {
    if (typeof pinKey !== 'string') return;
    this.pinStates[pinKey] = value;
    this._emitPinChange(pinKey, value);
  }

  /* ══════════════ TONE ══════════════ */
  _initAudio() {
    if (!this._toneCtx) {
      try {
        this._toneCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) { }
    }
  }

  _startTone(key, freq) {
    this._initAudio();
    if (!this._toneCtx) return;
    this._stopTone(key);
    try {
      const osc = this._toneCtx.createOscillator();
      const gain = this._toneCtx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.value = 0.1;
      osc.connect(gain);
      gain.connect(this._toneCtx.destination);
      osc.start();
      this._toneOscillators[key] = { osc, gain };
      this._emitEvent('buzzer_on', { key, freq });
    } catch (e) {
      console.error('[ArduSim] Audio error:', e);
    }
  }

  _stopTone(key) {
    if (this._toneOscillators[key]) {
      try { this._toneOscillators[key].osc.stop(); } catch (e) { }
      delete this._toneOscillators[key];
    }
    this._emitEvent('buzzer_off', { key });
  }

  _stopAllTones() {
    for (const key of Object.keys(this._toneOscillators)) {
      try { this._toneOscillators[key].osc.stop(); } catch (e) { }
      delete this._toneOscillators[key];
    }
    this._toneOscillators = {};
  }

  /* ══════════════ INTERNALS ══════════════ */
  _serialLog(text, type = 'data') {
    if (this.onSerial) this.onSerial(text, type);
  }

  _emitPinChange(key, val) {
    // Reset tight-iter counter whenever a pin changes (means the sketch is doing work)
    this._iterSinceDelay = 0;
    if (this.onPinChange) this.onPinChange(key, val);
  }

  _emitError(msg) {
    if (this.onError) this.onError(msg);
  }

  _emitEvent(type, data) {
    if (this.onEvent) this.onEvent(type, data);
  }

  /* Get human-readable pin name */
  static pinLabel(key) {
    if (!key.startsWith('pin_')) return key;
    const n = parseInt(key.replace('pin_', ''));
    if (n === 14) return 'A0';
    if (n === 15) return 'A1';
    if (n === 16) return 'A2';
    if (n === 17) return 'A3';
    if (n === 18) return 'A4';
    if (n === 19) return 'A5';
    return `D${n}`;
  }
}

/* ═══════════════ EXAMPLE SKETCHES ═══════════════ */
/* ═══════════════════════════════════════════════════════════
   EXAMPLE CIRCUITS — serialized project data loaded on the canvas
   when an example is opened. Matches the pins of each example code.
   ═══════════════════════════════════════════════════════════ */
const EXAMPLE_CIRCUITS = {
  led_on_13: {
    components: [
      { id: 'b1', type: 'arduino_uno', x: 200, y: 100 },
      { id: 'led1', type: 'led', x: 120, y: 280 },
      { id: 'r1', type: 'resistor', x: 120, y: 360 },
    ],
    wires: [
      { id: 'w1', from: { instId: 'b1', pinId: 'D13' }, to: { instId: 'led1', pinId: 'anode' } },
      { id: 'w2', from: { instId: 'led1', pinId: 'cathode' }, to: { instId: 'r1', pinId: 'p1' } },
      { id: 'w3', from: { instId: 'r1', pinId: 'p2' }, to: { instId: 'b1', pinId: 'GND1' } },
    ],
  },
  fade: {
    components: [
      { id: 'b1', type: 'arduino_uno', x: 200, y: 100 },
      { id: 'led1', type: 'led', x: 120, y: 280 },
      { id: 'r1', type: 'resistor', x: 120, y: 360 },
    ],
    wires: [
      { id: 'w1', from: { instId: 'b1', pinId: 'D9' }, to: { instId: 'led1', pinId: 'anode' } },
      { id: 'w2', from: { instId: 'led1', pinId: 'cathode' }, to: { instId: 'r1', pinId: 'p1' } },
      { id: 'w3', from: { instId: 'r1', pinId: 'p2' }, to: { instId: 'b1', pinId: 'GND1' } },
    ],
  },
  button: {
    components: [
      { id: 'b1', type: 'arduino_uno', x: 200, y: 100 },
      { id: 'btn1', type: 'push_button', x: 120, y: 300 },
      { id: 'led1', type: 'led', x: 340, y: 260 },
      { id: 'r1', type: 'resistor', x: 340, y: 340 },
    ],
    wires: [
      { id: 'w1', from: { instId: 'b1', pinId: 'D2' }, to: { instId: 'btn1', pinId: 'p1' } },
      { id: 'w2', from: { instId: 'btn1', pinId: 'p3' }, to: { instId: 'b1', pinId: 'GND1' } },
      { id: 'w3', from: { instId: 'b1', pinId: 'D13' }, to: { instId: 'led1', pinId: 'anode' } },
      { id: 'w4', from: { instId: 'led1', pinId: 'cathode' }, to: { instId: 'r1', pinId: 'p1' } },
      { id: 'w5', from: { instId: 'r1', pinId: 'p2' }, to: { instId: 'b1', pinId: 'GND1' } },
    ],
  },
  potentiometer: {
    components: [
      { id: 'b1', type: 'arduino_uno', x: 200, y: 100 },
      { id: 'pot1', type: 'potentiometer', x: 120, y: 300 },
      { id: 'led1', type: 'led', x: 340, y: 260 },
      { id: 'r1', type: 'resistor', x: 340, y: 340 },
    ],
    wires: [
      { id: 'w1', from: { instId: 'b1', pinId: '5V' }, to: { instId: 'pot1', pinId: 'vcc' } },
      { id: 'w2', from: { instId: 'pot1', pinId: 'wiper' }, to: { instId: 'b1', pinId: 'A0' } },
      { id: 'w3', from: { instId: 'pot1', pinId: 'gnd' }, to: { instId: 'b1', pinId: 'GND1' } },
      { id: 'w4', from: { instId: 'b1', pinId: 'D9' }, to: { instId: 'led1', pinId: 'anode' } },
      { id: 'w5', from: { instId: 'led1', pinId: 'cathode' }, to: { instId: 'r1', pinId: 'p1' } },
      { id: 'w6', from: { instId: 'r1', pinId: 'p2' }, to: { instId: 'b1', pinId: 'GND1' } },
    ],
  },
  servo_sweep: {
    components: [
      { id: 'b1', type: 'arduino_uno', x: 200, y: 100 },
      { id: 'sv1', type: 'servo', x: 120, y: 320 },
    ],
    wires: [
      { id: 'w1', from: { instId: 'b1', pinId: 'D9' }, to: { instId: 'sv1', pinId: 'signal' } },
      { id: 'w2', from: { instId: 'b1', pinId: '5V' }, to: { instId: 'sv1', pinId: 'vcc' } },
      { id: 'w3', from: { instId: 'b1', pinId: 'GND1' }, to: { instId: 'sv1', pinId: 'gnd' } },
    ],
  },
  traffic_light: {
    components: [
      { id: 'b1', type: 'arduino_uno', x: 200, y: 100 },
      { id: 'red', type: 'led', x: 340, y: 240 },
      { id: 'yel', type: 'led', x: 340, y: 340 },
      { id: 'grn', type: 'led', x: 340, y: 440 },
      { id: 'rr', type: 'resistor', x: 340, y: 320 },
      { id: 'ry', type: 'resistor', x: 340, y: 420 },
      { id: 'rg', type: 'resistor', x: 340, y: 520 },
    ],
    wires: [
      { id: 'w1', from: { instId: 'b1', pinId: 'D12' }, to: { instId: 'red', pinId: 'anode' } },
      { id: 'w2', from: { instId: 'red', pinId: 'cathode' }, to: { instId: 'rr', pinId: 'p1' } },
      { id: 'w3', from: { instId: 'rr', pinId: 'p2' }, to: { instId: 'b1', pinId: 'GND1' } },
      { id: 'w4', from: { instId: 'b1', pinId: 'D11' }, to: { instId: 'yel', pinId: 'anode' } },
      { id: 'w5', from: { instId: 'yel', pinId: 'cathode' }, to: { instId: 'ry', pinId: 'p1' } },
      { id: 'w6', from: { instId: 'ry', pinId: 'p2' }, to: { instId: 'b1', pinId: 'GND1' } },
      { id: 'w7', from: { instId: 'b1', pinId: 'D10' }, to: { instId: 'grn', pinId: 'anode' } },
      { id: 'w8', from: { instId: 'grn', pinId: 'cathode' }, to: { instId: 'rg', pinId: 'p1' } },
      { id: 'w9', from: { instId: 'rg', pinId: 'p2' }, to: { instId: 'b1', pinId: 'GND1' } },
    ],
  },
  rainbow_rgb: {
    components: [
      { id: 'b1', type: 'arduino_uno', x: 200, y: 100 },
      { id: 'rgb1', type: 'rgb_led', x: 120, y: 300 },
    ],
    wires: [
      { id: 'w1', from: { instId: 'b1', pinId: 'D9' }, to: { instId: 'rgb1', pinId: 'red' } },
      { id: 'w2', from: { instId: 'b1', pinId: 'D10' }, to: { instId: 'rgb1', pinId: 'green' } },
      { id: 'w3', from: { instId: 'b1', pinId: 'D11' }, to: { instId: 'rgb1', pinId: 'blue' } },
      { id: 'w4', from: { instId: 'rgb1', pinId: 'gnd' }, to: { instId: 'b1', pinId: 'GND1' } },
    ],
  },
  temperature: {
    components: [
      { id: 'b1', type: 'arduino_uno', x: 200, y: 100 },
      { id: 'dht1', type: 'dht11', x: 120, y: 300 },
    ],
    wires: [
      { id: 'w1', from: { instId: 'b1', pinId: '5V' }, to: { instId: 'dht1', pinId: 'vcc' } },
      { id: 'w2', from: { instId: 'b1', pinId: 'D2' }, to: { instId: 'dht1', pinId: 'data' } },
      { id: 'w3', from: { instId: 'dht1', pinId: 'gnd' }, to: { instId: 'b1', pinId: 'GND1' } },
    ],
  },
  ultrasonic: {
    components: [
      { id: 'b1', type: 'arduino_uno', x: 200, y: 100 },
      { id: 'son1', type: 'hcsr04', x: 120, y: 300 },
      { id: 'led1', type: 'led', x: 340, y: 260 },
      { id: 'r1', type: 'resistor', x: 340, y: 340 },
    ],
    wires: [
      { id: 'w1', from: { instId: 'b1', pinId: '5V' }, to: { instId: 'son1', pinId: 'vcc' } },
      { id: 'w2', from: { instId: 'b1', pinId: 'D7' }, to: { instId: 'son1', pinId: 'trig' } },
      { id: 'w3', from: { instId: 'b1', pinId: 'D8' }, to: { instId: 'son1', pinId: 'echo' } },
      { id: 'w4', from: { instId: 'son1', pinId: 'gnd' }, to: { instId: 'b1', pinId: 'GND1' } },
      { id: 'w5', from: { instId: 'b1', pinId: 'D13' }, to: { instId: 'led1', pinId: 'anode' } },
      { id: 'w6', from: { instId: 'led1', pinId: 'cathode' }, to: { instId: 'r1', pinId: 'p1' } },
      { id: 'w7', from: { instId: 'r1', pinId: 'p2' }, to: { instId: 'b1', pinId: 'GND1' } },
    ],
  },
  esp32_fade: {
    components: [
      { id: 'b1', type: 'esp32_devkit_v1', x: 300, y: 60 },
      { id: 'led1', type: 'led', x: 160, y: 280 },
      { id: 'r1', type: 'resistor', x: 160, y: 360 },
    ],
    wires: [
      { id: 'w1', from: { instId: 'b1', pinId: 'D13' }, to: { instId: 'led1', pinId: 'anode' } },
      { id: 'w2', from: { instId: 'led1', pinId: 'cathode' }, to: { instId: 'r1', pinId: 'p1' } },
      { id: 'w3', from: { instId: 'r1', pinId: 'p2' }, to: { instId: 'b1', pinId: 'GND1' } },
    ],
  },
  mqtt_esp32: {
    components: [
      { id: 'b1', type: 'esp32_devkit_v1', x: 300, y: 60 },
      { id: 'led1', type: 'led', x: 120, y: 300 },
      { id: 'r1', type: 'resistor', x: 120, y: 380 },
      { id: 'pot1', type: 'potentiometer', x: 520, y: 300 },
    ],
    wires: [
      { id: 'w1', from: { instId: 'b1', pinId: 'D13' }, to: { instId: 'led1', pinId: 'anode' } },
      { id: 'w2', from: { instId: 'led1', pinId: 'cathode' }, to: { instId: 'r1', pinId: 'p1' } },
      { id: 'w3', from: { instId: 'r1', pinId: 'p2' }, to: { instId: 'b1', pinId: 'GND1' } },
      { id: 'w4', from: { instId: 'b1', pinId: '3V3' }, to: { instId: 'pot1', pinId: 'vcc' } },
      { id: 'w5', from: { instId: 'pot1', pinId: 'wiper' }, to: { instId: 'b1', pinId: 'VP' } },
      { id: 'w6', from: { instId: 'pot1', pinId: 'gnd' }, to: { instId: 'b1', pinId: 'GND1' } },
    ],
  },
  lcd_i2c: {
    components: [
      { id: 'b1', type: 'arduino_uno', x: 200, y: 100 },
      { id: 'lcd1', type: 'lcd1602_i2c', x: 110, y: 320 },
    ],
    wires: [
      { id: 'w1', from: { instId: 'b1', pinId: '5V' }, to: { instId: 'lcd1', pinId: 'vcc' } },
      { id: 'w2', from: { instId: 'b1', pinId: 'GND1' }, to: { instId: 'lcd1', pinId: 'gnd' } },
      { id: 'w3', from: { instId: 'b1', pinId: 'A4' }, to: { instId: 'lcd1', pinId: 'sda' } },
      { id: 'w4', from: { instId: 'b1', pinId: 'A5' }, to: { instId: 'lcd1', pinId: 'scl' } },
    ],
  },
  oled_ssd1306: {
    components: [
      { id: 'b1', type: 'arduino_uno', x: 200, y: 100 },
      { id: 'oled1', type: 'oled_ssd1306', x: 110, y: 320 },
    ],
    wires: [
      { id: 'w1', from: { instId: 'b1', pinId: '5V' }, to: { instId: 'oled1', pinId: 'vcc' } },
      { id: 'w2', from: { instId: 'b1', pinId: 'GND1' }, to: { instId: 'oled1', pinId: 'gnd' } },
      { id: 'w3', from: { instId: 'b1', pinId: 'A4' }, to: { instId: 'oled1', pinId: 'sda' } },
      { id: 'w4', from: { instId: 'b1', pinId: 'A5' }, to: { instId: 'oled1', pinId: 'scl' } },
    ],
  },
  esp32_server: {
    components: [
      { id: 'b1', type: 'esp32_devkit_v1', x: 300, y: 60 },
      { id: 'led1', type: 'led', x: 120, y: 300 },
      { id: 'r1', type: 'resistor', x: 120, y: 380 },
      { id: 'pot1', type: 'potentiometer', x: 520, y: 300 },
    ],
    wires: [
      { id: 'w1', from: { instId: 'b1', pinId: 'D13' }, to: { instId: 'led1', pinId: 'anode' } },
      { id: 'w2', from: { instId: 'led1', pinId: 'cathode' }, to: { instId: 'r1', pinId: 'p1' } },
      { id: 'w3', from: { instId: 'r1', pinId: 'p2' }, to: { instId: 'b1', pinId: 'GND1' } },
      { id: 'w4', from: { instId: 'b1', pinId: '3V3' }, to: { instId: 'pot1', pinId: 'vcc' } },
      { id: 'w5', from: { instId: 'pot1', pinId: 'wiper' }, to: { instId: 'b1', pinId: 'VP' } },
      { id: 'w6', from: { instId: 'pot1', pinId: 'gnd' }, to: { instId: 'b1', pinId: 'GND1' } },
    ],
  },
  serial_plotter: {
    components: [
      { id: 'b1', type: 'arduino_uno', x: 200, y: 100 },
      { id: 'pot1', type: 'potentiometer', x: 120, y: 300 },
    ],
    wires: [
      { id: 'w1', from: { instId: 'b1', pinId: '5V' }, to: { instId: 'pot1', pinId: 'vcc' } },
      { id: 'w2', from: { instId: 'pot1', pinId: 'wiper' }, to: { instId: 'b1', pinId: 'A0' } },
      { id: 'w3', from: { instId: 'pot1', pinId: 'gnd' }, to: { instId: 'b1', pinId: 'GND1' } },
    ],
  },
  buzzer_melody: {
    components: [
      { id: 'b1', type: 'arduino_uno', x: 200, y: 100 },
      { id: 'bz1', type: 'buzzer', x: 120, y: 300 },
    ],
    wires: [
      { id: 'w1', from: { instId: 'b1', pinId: 'D8' }, to: { instId: 'bz1', pinId: 'vcc' } },
      { id: 'w2', from: { instId: 'bz1', pinId: 'gnd' }, to: { instId: 'b1', pinId: 'GND1' } },
    ],
  },
  seg7_counter: {
    components: [
      { id: 'b1', type: 'arduino_uno', x: 200, y: 100 },
      { id: 's7', type: 'seg7', x: 120, y: 320 },
    ],
    wires: [
      { id: 'w1', from: { instId: 'b1', pinId: 'D2' }, to: { instId: 's7', pinId: 'segA' } },
      { id: 'w2', from: { instId: 'b1', pinId: 'D3' }, to: { instId: 's7', pinId: 'segB' } },
      { id: 'w3', from: { instId: 'b1', pinId: 'D4' }, to: { instId: 's7', pinId: 'segC' } },
      { id: 'w4', from: { instId: 'b1', pinId: 'D5' }, to: { instId: 's7', pinId: 'segD' } },
      { id: 'w5', from: { instId: 'b1', pinId: 'D6' }, to: { instId: 's7', pinId: 'segE' } },
      { id: 'w6', from: { instId: 'b1', pinId: 'D7' }, to: { instId: 's7', pinId: 'segF' } },
      { id: 'w7', from: { instId: 'b1', pinId: 'D8' }, to: { instId: 's7', pinId: 'segG' } },
      { id: 'w8', from: { instId: 's7', pinId: 'com' }, to: { instId: 'b1', pinId: 'GND1' } },
    ],
  },
  relay_control: {
    components: [
      { id: 'b1', type: 'arduino_uno', x: 200, y: 100 },
      { id: 'rly', type: 'relay', x: 120, y: 300 },
      { id: 'led1', type: 'led', x: 340, y: 260 },
      { id: 'r1', type: 'resistor', x: 340, y: 340 },
    ],
    wires: [
      { id: 'w1', from: { instId: 'b1', pinId: 'D9' }, to: { instId: 'rly', pinId: 'sig' } },
      { id: 'w2', from: { instId: 'b1', pinId: '5V' }, to: { instId: 'rly', pinId: 'vcc' } },
      { id: 'w3', from: { instId: 'rly', pinId: 'gnd' }, to: { instId: 'b1', pinId: 'GND1' } },
      { id: 'w4', from: { instId: 'b1', pinId: '5V' }, to: { instId: 'rly', pinId: 'com' } },
      { id: 'w5', from: { instId: 'rly', pinId: 'no' }, to: { instId: 'led1', pinId: 'anode' } },
      { id: 'w6', from: { instId: 'led1', pinId: 'cathode' }, to: { instId: 'r1', pinId: 'p1' } },
      { id: 'w7', from: { instId: 'r1', pinId: 'p2' }, to: { instId: 'b1', pinId: 'GND1' } },
    ],
  },
  dc_motor_speed: {
    components: [
      { id: 'b1', type: 'arduino_uno', x: 200, y: 100 },
      { id: 'pot1', type: 'potentiometer', x: 120, y: 300 },
      { id: 'mt1', type: 'dc_motor', x: 340, y: 300 },
    ],
    wires: [
      { id: 'w1', from: { instId: 'b1', pinId: '5V' }, to: { instId: 'pot1', pinId: 'vcc' } },
      { id: 'w2', from: { instId: 'pot1', pinId: 'wiper' }, to: { instId: 'b1', pinId: 'A0' } },
      { id: 'w3', from: { instId: 'pot1', pinId: 'gnd' }, to: { instId: 'b1', pinId: 'GND1' } },
      { id: 'w4', from: { instId: 'b1', pinId: 'D9' }, to: { instId: 'mt1', pinId: 'in' } },
      { id: 'w5', from: { instId: 'mt1', pinId: 'gnd' }, to: { instId: 'b1', pinId: 'GND1' } },
    ],
  },
  ldr_lamp: {
    components: [
      { id: 'b1', type: 'arduino_uno', x: 200, y: 100 },
      { id: 'ldr1', type: 'ldr', x: 120, y: 300 },
      { id: 'led1', type: 'led', x: 340, y: 260 },
      { id: 'r1', type: 'resistor', x: 340, y: 340 },
    ],
    wires: [
      { id: 'w1', from: { instId: 'b1', pinId: '5V' }, to: { instId: 'ldr1', pinId: 'vcc' } },
      { id: 'w2', from: { instId: 'ldr1', pinId: 'a' }, to: { instId: 'b1', pinId: 'A0' } },
      { id: 'w3', from: { instId: 'ldr1', pinId: 'gnd' }, to: { instId: 'b1', pinId: 'GND1' } },
      { id: 'w4', from: { instId: 'b1', pinId: 'D9' }, to: { instId: 'led1', pinId: 'anode' } },
      { id: 'w5', from: { instId: 'led1', pinId: 'cathode' }, to: { instId: 'r1', pinId: 'p1' } },
      { id: 'w6', from: { instId: 'r1', pinId: 'p2' }, to: { instId: 'b1', pinId: 'GND1' } },
    ],
  },
  pir_alarm: {
    components: [
      { id: 'b1', type: 'arduino_uno', x: 200, y: 100 },
      { id: 'pir1', type: 'pir', x: 120, y: 300 },
      { id: 'led1', type: 'led', x: 340, y: 260 },
      { id: 'r1', type: 'resistor', x: 340, y: 340 },
    ],
    wires: [
      { id: 'w1', from: { instId: 'b1', pinId: '5V' }, to: { instId: 'pir1', pinId: 'vcc' } },
      { id: 'w2', from: { instId: 'pir1', pinId: 'out' }, to: { instId: 'b1', pinId: 'D2' } },
      { id: 'w3', from: { instId: 'pir1', pinId: 'gnd' }, to: { instId: 'b1', pinId: 'GND1' } },
      { id: 'w4', from: { instId: 'b1', pinId: 'D13' }, to: { instId: 'led1', pinId: 'anode' } },
      { id: 'w5', from: { instId: 'led1', pinId: 'cathode' }, to: { instId: 'r1', pinId: 'p1' } },
      { id: 'w6', from: { instId: 'r1', pinId: 'p2' }, to: { instId: 'b1', pinId: 'GND1' } },
    ],
  },
  joystick_led: {
    components: [
      { id: 'b1', type: 'arduino_uno', x: 200, y: 100 },
      { id: 'joy', type: 'joystick', x: 120, y: 300 },
      { id: 'led1', type: 'led', x: 380, y: 260 },
      { id: 'r1', type: 'resistor', x: 380, y: 340 },
    ],
    wires: [
      { id: 'w1', from: { instId: 'b1', pinId: '5V' }, to: { instId: 'joy', pinId: 'vcc' } },
      { id: 'w2', from: { instId: 'joy', pinId: 'x' }, to: { instId: 'b1', pinId: 'A0' } },
      { id: 'w3', from: { instId: 'joy', pinId: 'y' }, to: { instId: 'b1', pinId: 'A1' } },
      { id: 'w4', from: { instId: 'joy', pinId: 'sw' }, to: { instId: 'b1', pinId: 'D2' } },
      { id: 'w5', from: { instId: 'joy', pinId: 'gnd' }, to: { instId: 'b1', pinId: 'GND1' } },
      { id: 'w6', from: { instId: 'b1', pinId: 'D9' }, to: { instId: 'led1', pinId: 'anode' } },
      { id: 'w7', from: { instId: 'led1', pinId: 'cathode' }, to: { instId: 'r1', pinId: 'p1' } },
      { id: 'w8', from: { instId: 'r1', pinId: 'p2' }, to: { instId: 'b1', pinId: 'GND1' } },
    ],
  },
  esp32_blink: {
    components: [
      { id: 'b1', type: 'esp32_devkit_v1', x: 200, y: 100 },
    ],
    wires: [],
  },
  esp32_ntp_lcd: {
    components: [
      { id: 'b1', type: 'esp32_devkit_v1', x: 300, y: 60 },
      { id: 'lcd1', type: 'lcd1602_i2c', x: 110, y: 320 },
    ],
    wires: [
      { id: 'w1', from: { instId: 'b1', pinId: '3V3' }, to: { instId: 'lcd1', pinId: 'vcc' } },
      { id: 'w2', from: { instId: 'b1', pinId: 'GND1' }, to: { instId: 'lcd1', pinId: 'gnd' } },
      { id: 'w3', from: { instId: 'b1', pinId: 'D21' }, to: { instId: 'lcd1', pinId: 'sda' } },
      { id: 'w4', from: { instId: 'b1', pinId: 'D22' }, to: { instId: 'lcd1', pinId: 'scl' } },
    ],
  },
};

const EXAMPLE_SKETCHES = [
  {
    id: 'blink',
    name: 'Blink LED',
    icon: '💡',
    desc: 'The classic Hello World of Arduino — blink an LED on pin 13',
    tags: ['beginner', 'LED', 'digital'],
    circuit: EXAMPLE_CIRCUITS.led_on_13,
    code: `/*
 * Blink — Classic Arduino example
 * Blinks the built-in LED on pin 13
 */

int ledPin = 13;

void setup() {
  pinMode(ledPin, OUTPUT);
  Serial.begin(9600);
  Serial.println("Blink started!");
}

void loop() {
  digitalWrite(ledPin, HIGH);
  Serial.println("LED ON");
  delay(1000);

  digitalWrite(ledPin, LOW);
  Serial.println("LED OFF");
  delay(1000);
}`
  },
  {
    id: 'esp32_blink',
    name: 'ESP32 Onboard LED',
    icon: '🔌',
    desc: 'ESP32 DevKit V1 — blink the built-in LED on GPIO2 (LED_BUILTIN) with no wiring needed',
    tags: ['esp32', 'beginner', 'LED'],
    circuit: EXAMPLE_CIRCUITS.esp32_blink,
    code: `/*
 * ESP32 Onboard LED Blink
 * The DevKit V1 has a blue built-in LED on GPIO2.
 * LED_BUILTIN is mapped to GPIO2 automatically.
 */

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(115200);
  Serial.println("ESP32 onboard LED blink started");
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  Serial.println("LED ON");
  delay(1000);

  digitalWrite(LED_BUILTIN, LOW);
  Serial.println("LED OFF");
  delay(1000);
}`
  },
  {
    id: 'fade',
    name: 'Fade LED (PWM)',
    icon: '🌅',
    desc: 'Fade an LED in and out using PWM analogWrite on pin 9',
    tags: ['beginner', 'PWM', 'LED'],
    circuit: EXAMPLE_CIRCUITS.fade,
    code: `/*
 * Fade — LED brightness fade using PWM
 */

int ledPin = 9;
int brightness = 0;
int fadeAmount = 5;

void setup() {
  pinMode(ledPin, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  analogWrite(ledPin, brightness);
  brightness += fadeAmount;

  if (brightness <= 0 || brightness >= 255) {
    fadeAmount = -fadeAmount;
    Serial.print("Brightness: ");
    Serial.println(brightness);
  }

  delay(30);
}`
  },
  {
    id: 'button',
    name: 'Button Input',
    icon: '🔘',
    desc: 'Read a push button and control an LED',
    tags: ['beginner', 'input', 'button'],
    circuit: EXAMPLE_CIRCUITS.button,
    code: `/*
 * Button — Read push button, control LED
 */

int buttonPin = 2;
int ledPin = 13;
int buttonState = 0;

void setup() {
  pinMode(buttonPin, INPUT_PULLUP);
  pinMode(ledPin, OUTPUT);
  Serial.begin(9600);
  Serial.println("Button test ready.");
}

void loop() {
  buttonState = digitalRead(buttonPin);

  if (buttonState == LOW) {   // LOW when pressed (pullup)
    digitalWrite(ledPin, HIGH);
    Serial.println("Button PRESSED - LED ON");
  } else {
    digitalWrite(ledPin, LOW);
  }

  delay(50);
}`
  },
  {
    id: 'potentiometer',
    name: 'Potentiometer Read',
    icon: '🎚️',
    desc: 'Read a potentiometer on A0 and display the value',
    tags: ['beginner', 'analog', 'sensor'],
    circuit: EXAMPLE_CIRCUITS.potentiometer,
    code: `/*
 * Potentiometer — Analog input reading
 */

int potPin = A0;
int ledPin = 9;
int potValue = 0;

void setup() {
  Serial.begin(9600);
  Serial.println("Potentiometer reader ready.");
}

void loop() {
  potValue = analogRead(potPin);

  // Map to PWM range
  int brightness = map(potValue, 0, 1023, 0, 255);
  analogWrite(ledPin, brightness);

  Serial.print("Pot: ");
  Serial.print(potValue);
  Serial.print(" | Brightness: ");
  Serial.println(brightness);

  delay(100);
}`
  },
  {
    id: 'servo_sweep',
    name: 'Servo Sweep',
    icon: '⚙️',
    desc: 'Sweep a servo motor from 0° to 180° and back',
    tags: ['intermediate', 'servo', 'motor'],
    circuit: EXAMPLE_CIRCUITS.servo_sweep,
    code: `/*
 * Servo Sweep — Sweep servo 0 to 180 degrees
 */

#include <Servo.h>

Servo myServo;
int angle = 0;
int step = 2;

void setup() {
  myServo.attach(9);
  Serial.begin(9600);
  Serial.println("Servo sweep started");
}

void loop() {
  myServo.write(angle);
  Serial.print("Angle: ");
  Serial.println(angle);

  angle += step;
  if (angle >= 180 || angle <= 0) {
    step = -step;
    delay(200);
  }
  delay(15);
}`
  },
  {
    id: 'traffic_light',
    name: 'Traffic Light',
    icon: '🚦',
    desc: 'Simulate a traffic light with 3 LEDs',
    tags: ['beginner', 'LED', 'multiple pins'],
    circuit: EXAMPLE_CIRCUITS.traffic_light,
    code: `/*
 * Traffic Light Simulator
 * Red=12, Yellow=11, Green=10
 */

int redPin    = 12;
int yellowPin = 11;
int greenPin  = 10;

void allOff() {
  digitalWrite(redPin,    LOW);
  digitalWrite(yellowPin, LOW);
  digitalWrite(greenPin,  LOW);
}

void setup() {
  pinMode(redPin,    OUTPUT);
  pinMode(yellowPin, OUTPUT);
  pinMode(greenPin,  OUTPUT);
  Serial.begin(9600);
  Serial.println("Traffic light started");
}

void loop() {
  // Red
  allOff();
  digitalWrite(redPin, HIGH);
  Serial.println("RED - STOP");
  delay(3000);

  // Red + Yellow (prepare to go)
  digitalWrite(yellowPin, HIGH);
  delay(1000);

  // Green
  allOff();
  digitalWrite(greenPin, HIGH);
  Serial.println("GREEN - GO");
  delay(3000);

  // Yellow
  allOff();
  digitalWrite(yellowPin, HIGH);
  Serial.println("YELLOW - SLOW DOWN");
  delay(1000);
}`
  },
  {
    id: 'counter',
    name: 'Counter with Button',
    icon: '🔢',
    desc: 'Count button presses and show on serial monitor',
    tags: ['intermediate', 'counter', 'button'],
    circuit: EXAMPLE_CIRCUITS.button,
    code: `/*
 * Button Counter — Count presses
 */

int buttonPin = 2;
int ledPin = 13;
int count = 0;
int lastState = HIGH;
int currentState;

void setup() {
  pinMode(buttonPin, INPUT_PULLUP);
  pinMode(ledPin, OUTPUT);
  Serial.begin(9600);
  Serial.println("Button counter started. Press button!");
}

void loop() {
  currentState = digitalRead(buttonPin);

  // Detect falling edge (button pressed)
  if (lastState == HIGH && currentState == LOW) {
    count++;
    digitalWrite(ledPin, HIGH);

    Serial.print("Count: ");
    Serial.println(count);

    delay(50); // debounce
    digitalWrite(ledPin, LOW);
  }

  lastState = currentState;
  delay(10);
}`
  },
  {
    id: 'rainbow_rgb',
    name: 'RGB Rainbow',
    icon: '🌈',
    desc: 'Cycle through colors on an RGB LED',
    tags: ['intermediate', 'RGB', 'PWM', 'LED'],
    circuit: EXAMPLE_CIRCUITS.rainbow_rgb,
    code: `/*
 * RGB LED Rainbow — Cycle through colors
 * R=9, G=10, B=11
 */

int redPin   = 9;
int greenPin = 10;
int bluePin  = 11;

void setColor(int r, int g, int b) {
  analogWrite(redPin,   r);
  analogWrite(greenPin, g);
  analogWrite(bluePin,  b);
}

void setup() {
  pinMode(redPin,   OUTPUT);
  pinMode(greenPin, OUTPUT);
  pinMode(bluePin,  OUTPUT);
  Serial.begin(9600);
  Serial.println("RGB Rainbow started!");
}

void loop() {
  // Red → Yellow
  for (int i = 0; i <= 255; i += 5) {
    setColor(255, i, 0);
    delay(20);
  }
  // Yellow → Green
  for (int i = 255; i >= 0; i -= 5) {
    setColor(i, 255, 0);
    delay(20);
  }
  // Green → Cyan
  for (int i = 0; i <= 255; i += 5) {
    setColor(0, 255, i);
    delay(20);
  }
  // Cyan → Blue
  for (int i = 255; i >= 0; i -= 5) {
    setColor(0, i, 255);
    delay(20);
  }
  // Blue → Magenta
  for (int i = 0; i <= 255; i += 5) {
    setColor(i, 0, 255);
    delay(20);
  }
  // Magenta → Red
  for (int i = 255; i >= 0; i -= 5) {
    setColor(255, 0, i);
    delay(20);
  }
}`
  },
  {
    id: 'morse',
    name: 'Morse Code',
    icon: '📡',
    desc: 'Blink LED in Morse code pattern for "SOS"',
    tags: ['intermediate', 'LED', 'morse'],
    circuit: EXAMPLE_CIRCUITS.led_on_13,
    code: `/*
 * Morse Code — SOS via LED
 * LED on pin 13
 */

int ledPin = 13;
int dotLen  = 200;
int dashLen = 600;
int letterGap = 600;
int wordGap = 1400;

void dot() {
  digitalWrite(ledPin, HIGH); delay(dotLen);
  digitalWrite(ledPin, LOW);  delay(dotLen);
}

void dash() {
  digitalWrite(ledPin, HIGH); delay(dashLen);
  digitalWrite(ledPin, LOW);  delay(dotLen);
}

void setup() {
  pinMode(ledPin, OUTPUT);
  Serial.begin(9600);
  Serial.println("Morse SOS started");
}

void loop() {
  Serial.println("SOS ...");
  // S = . . .
  dot(); dot(); dot();
  delay(letterGap);
  // O = — — —
  dash(); dash(); dash();
  delay(letterGap);
  // S = . . .
  dot(); dot(); dot();
  delay(wordGap);
}`
  },
  {
    id: 'temperature',
    name: 'Temperature Sensor',
    icon: '🌡️',
    desc: 'Read DHT11 temperature and humidity — drag the Temp/Hum sliders on the sensor',
    tags: ['intermediate', 'sensor', 'DHT11'],
    circuit: EXAMPLE_CIRCUITS.temperature,
    code: `/*
 * DHT11 Temperature & Humidity (simulated)
 * Drag the Temp / Hum sliders under the sensor to change the readings.
 */

int dataPin = 2;
float temperature = 0;
float humidity = 0;
int count = 0;

float readTemperature() {
  // Reads the Temp slider on the DHT11 component (0-50°C).
  // If no DHT11 is placed, falls back to a simulated 20-30°C wobble.
  float v = sensorValue('dht11', 'temperature');
  if (v >= 0) return v;
  return 25.0 + 5.0 * sin(count * 0.1);
}

float readHumidity() {
  float v = sensorValue('dht11', 'humidity');
  if (v >= 0) return v;
  return 55.0 + 15.0 * cos(count * 0.1);
}

void setup() {
  Serial.begin(9600);
  Serial.println("DHT11 Sensor started");
  Serial.println("Temp(C)\tHumidity(%)");
}

void loop() {
  temperature = readTemperature();
  humidity = readHumidity();
  count++;

  Serial.print(temperature, 1);
  Serial.print("\t");
  Serial.println(humidity, 1);

  delay(2000);
}`
  },
  {
    id: 'ultrasonic',
    name: 'Ultrasonic Distance',
    icon: '📡',
    desc: 'HC-SR04 distance sensor driving an LED (drag the Dist slider)',
    tags: ['intermediate', 'sensor', 'ultrasonic'],
    circuit: EXAMPLE_CIRCUITS.ultrasonic,
    code: `/*
 * HC-SR04 Ultrasonic Distance Sensor (simulated)
 * Drag the "Dist" slider under the sensor to change the distance.
 */

const int trigPin = 7;
const int echoPin = 8;
const int ledPin = 13;

float readDistance() {
  // Reads the Dist slider on the HC-SR04 component (2-400 cm).
  // If no HC-SR04 is placed, falls back to a fixed 25 cm.
  float d = sensorValue('hcsr04', 'distance');
  if (d >= 0) return d;
  return 25.0;
}

void setup() {
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  pinMode(ledPin, OUTPUT);
  Serial.begin(9600);
  Serial.println("HC-SR04 ultrasonic started");
}

void loop() {
  float distance = readDistance();

  // Alert LED when an obstacle gets close (< 20 cm)
  if (distance < 20) {
    digitalWrite(ledPin, HIGH);
  } else {
    digitalWrite(ledPin, LOW);
  }

  Serial.print("Distance: ");
  Serial.print(distance, 1);
  Serial.println(" cm");
  delay(500);
}`
  },
  {
    id: 'esp32_fade',
    name: 'ESP32 LEDC Fade',
    icon: '🔌',
    desc: 'ESP32 DevKit V1 — fade an LED using the LEDC PWM peripheral on GPIO13',
    tags: ['esp32', 'PWM', 'LED', 'ledc'],
    circuit: EXAMPLE_CIRCUITS.esp32_fade,
    code: `/*
 * ESP32 LEDC Fade — fade an LED using the ESP32 LEDC PWM peripheral.
 * Place the ESP32 DevKit V1, an LED and a 220Ω resistor and wire
 * D13 → LED anode, LED cathode → resistor → GND1.
 */

const int ledPin = 13;   // GPIO13
const int ch    = 0;     // LEDC channel
const int freq  = 5000;  // 5 kHz
const int res   = 8;     // 8-bit resolution (0–255)

int duty = 0;
int step = 5;

void setup() {
  ledcSetup(ch, freq, res);
  ledcAttachPin(ledPin, ch);
  Serial.begin(115200);
  Serial.println("ESP32 LEDC fade started");
  Serial.print("Wi-Fi test: ");
  WiFi.begin("HomeNet", "password");
  Serial.println(WiFi.localIP());
}

void loop() {
  ledcWrite(ch, duty);
  Serial.print("Duty: ");
  Serial.println(duty);

  duty += step;
  if (duty <= 0 || duty >= 255) step = -step;
  delay(20);
}`
  },
  {
    id: 'mqtt_esp32',
    name: 'ESP32 MQTT Pub/Sub',
    icon: '📡',
    desc: 'ESP32 DevKit V1 — join Wi-Fi, publish the potentiometer reading, and toggle the LED on/off via MQTT messages',
    tags: ['esp32', 'wifi', 'mqtt', 'iot'],
    circuit: EXAMPLE_CIRCUITS.mqtt_esp32,
    code: `/*
 * ESP32 MQTT Pub/Sub — connect to Wi-Fi and a simulated MQTT broker,
 * publish a temperature reading (potentiometer on VP / GPIO36), and
 * toggle the LED on D13 by publishing "on"/"off" to the ardusim/led topic.
 */

#include <WiFi.h>
#include <PubSubClient.h>

const int ledPin    = 13;   // GPIO13 — LED
const int sensorPin = 36;   // GPIO36 (VP) — potentiometer wiper

String wifiSSID    = "ArduSimNet";
String wifiPass    = "simulator";
String mqttServer  = "broker.hivemq.com";
int    mqttPort    = 1883;
String clientId    = "ArduSim_ESP32";

String topicCmd  = "ardusim/led";
String topicData = "ardusim/temp";

WiFiClient espClient;
PubSubClient client(espClient);

void callback(char* topic, byte* payload, unsigned int length) {
  String msg = "";
  for (int i = 0; i < length; i++) msg += payload[i];

  Serial.print("MQTT msg [");
  Serial.print(topic);
  Serial.print("]: ");
  Serial.println(msg);

  if (msg == "on") {
    digitalWrite(ledPin, HIGH);
    Serial.println("LED ON via MQTT");
  } else if (msg == "off") {
    digitalWrite(ledPin, LOW);
    Serial.println("LED OFF via MQTT");
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(ledPin, OUTPUT);
  digitalWrite(ledPin, LOW);

  Serial.println("Connecting to Wi-Fi...");
  WiFi.begin(wifiSSID, wifiPass);
  delay(800);
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());

  client.setServer(mqttServer, mqttPort);
  client.setCallback(callback);

  if (client.connect(clientId)) {
    client.subscribe(topicCmd);
    Serial.println("Connected to MQTT broker and subscribed");
  }
}

unsigned long lastCmd = 0;
int cmdState = 0;

void loop() {
  client.loop();

  if (!client.connected()) {
    Serial.println("Reconnecting to MQTT broker...");
    client.connect(clientId);
    client.subscribe(topicCmd);
    delay(1000);
  }

  // Publish a simulated temperature reading every second
  int tempC = round(map(analogRead(sensorPin), 0, 1023, 15, 35));
  client.publish(topicData, String(tempC));

  // Every 4 seconds publish an on/off command. The broker delivers it back
  // to our own subscription, so the LED toggles through MQTT.
  if (millis() - lastCmd >= 4000) {
    lastCmd = millis();
    cmdState = 1 - cmdState;
    client.publish(topicCmd, cmdState == 1 ? "on" : "off");
  }

  delay(1000);
}`
  },
  {
    id: 'lcd_i2c',
    name: 'LCD I2C Display',
    icon: '🖥️',
    desc: 'Print text and a counter on a 16×2 LCD with a PCF8574 I2C backpack (SDA → A4, SCL → A5)',
    tags: ['beginner', 'lcd', 'i2c', 'display'],
    circuit: EXAMPLE_CIRCUITS.lcd_i2c,
    code: `/*
 * LCD I2C — display text on a 16x2 LCD with a PCF8574 I2C backpack.
 * Wiring: LCD VCC → 5V, GND → GND, SDA → A4, SCL → A5.
 */

#include <Wire.h>
#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd(0x27, 16, 2);

int counter = 0;

void setup() {
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Hello, ArduSim!");
  lcd.setCursor(0, 1);
  lcd.print("LCD I2C : 0x27");
}

void loop() {
  delay(500);
  counter++;
  lcd.setCursor(0, 1);
  lcd.print("Count: ");
  lcd.print(counter);
  lcd.print("        ");
}`
  },
  {
    id: 'oled_ssd1306',
    name: 'OLED SSD1306 (I2C)',
    icon: '🖥️',
    desc: 'Drive a 128×64 monochrome OLED with an SSD1306 controller over I2C (SDA → A4, SCL → A5)',
    tags: ['intermediate', 'oled', 'i2c', 'display', 'graphics'],
    circuit: EXAMPLE_CIRCUITS.oled_ssd1306,
    code: `/*
 * OLED SSD1306 — draw text and graphics on a 128x64 monochrome OLED.
 * Wiring: OLED VCC → 5V, GND → GND, SDA → A4, SCL → A5.
 */

#include <Wire.h>
#include <Adafruit_SSD1306.h>

Adafruit_SSD1306 display(128, 64, &Wire, -1);

int counter = 0;

void setup() {
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay();
  display.setTextSize(2);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(24, 20);
  display.print("ArduSim");
  display.display();
  delay(1500);
}

void loop() {
  counter++;
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.print("OLED I2C 0x3C");
  display.setCursor(0, 16);
  display.print("Count: ");
  display.print(counter);

  // Draw a frame and a progress bar
  display.drawRect(0, 30, 127, 33, SSD1306_WHITE);
  display.fillRect(0, 48, (counter % 120) + 4, 4, SSD1306_WHITE);

  display.display();
  delay(200);
}`
  },
  {
    id: 'esp32_server',
    name: 'ESP32 Web Server',
    icon: '🌐',
    desc: 'ESP32 DevKit V1 — run a WebServer that serves an HTML page and toggles the LED via /on and /off routes',
    tags: ['esp32', 'wifi', 'webserver', 'http', 'iot'],
    circuit: EXAMPLE_CIRCUITS.esp32_server,
    code: `/*
 * ESP32 Web Server — serve an HTML dashboard and control the LED.
 * The simulator generates a fake HTTP request to each route every ~1.5s,
 * so watch the Serial Monitor to see requests and responses, and the LED
 * on D13 toggling as /on and /off are requested.
 */

#include <WiFi.h>
#include <WebServer.h>

const int ledPin  = 13;
const int sensorPin = 36;   // GPIO36 (VP) — potentiometer wiper
WebServer server(80);

int tempC = 25;

String buildPage() {
  String html = "";
  html += "<!DOCTYPE html><html><head><title>ArduSim Web</title></head><body>";
  html += "<h1>ESP32 Web Server</h1>";
  html += "<p>Temperature: <b>" + String(tempC) + " &deg;C</b></p>";
  html += "<p><a href=\\"/on\\">Turn LED ON</a></p>";
  html += "<p><a href=\\"/off\\">Turn LED OFF</a></p>";
  html += "</body></html>";
  return html;
}

void handleRoot() {
  server.send(200, "text/html", buildPage());
}

void handleOn() {
  digitalWrite(ledPin, HIGH);
  server.send(200, "text/plain", "LED is now ON");
}

void handleOff() {
  digitalWrite(ledPin, LOW);
  server.send(200, "text/plain", "LED is now OFF");
}

void setup() {
  Serial.begin(115200);
  pinMode(ledPin, OUTPUT);
  digitalWrite(ledPin, LOW);

  Serial.println("Connecting to Wi-Fi...");
  WiFi.begin("ArduSimNet", "simulator");
  delay(800);
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());

  server.on("/", handleRoot);
  server.on("/on", handleOn);
  server.on("/off", handleOff);
  server.begin();
  Serial.println("HTTP server started at http://192.168.1.105/");
}

void loop() {
  tempC = round(map(analogRead(sensorPin), 0, 1023, 15, 35));
  server.handleClient();
  delay(500);
}`
  },
  {
    id: 'serial_plotter',
    name: 'Serial Plotter Demo',
    icon: '📈',
    desc: 'Print two numeric values every 50ms and watch them graph in the Plotter tab (potentiometer + sine wave)',
    tags: ['beginner', 'plotter', 'analog', 'serial'],
    circuit: EXAMPLE_CIRCUITS.serial_plotter,
    code: `/*
 * Serial Plotter — send "pot:value sine:value" lines so the Plotter tab
 * can graph them live. Turn the potentiometer on A0 and watch the two
 * waveforms scroll across the plotter.
 */

int potPin = A0;

void setup() {
  Serial.begin(9600);
  Serial.println("Serial Plotter demo started");
}

void loop() {
  int potValue = analogRead(potPin);
  float t = (float)millis() / 1000.0;
  int sine = (int)((sin(t) + 1.0) * 512.0);

  Serial.print("pot:");
  Serial.print(potValue);
  Serial.print(" sine:");
  Serial.println(sine);

  delay(50);
}`
  },
  {
    id: 'buzzer_melody',
    name: 'Buzzer Melody',
    icon: '🔔',
    desc: 'Play a simple melody using tone() on a buzzer (pin 8)',
    tags: ['beginner', 'sound', 'tone', 'buzzer'],
    circuit: EXAMPLE_CIRCUITS.buzzer_melody,
    code: `/*
 * Buzzer Melody — Play a tune with tone()
 * Buzzer signal on D8, power and ground from the board
 */

int buzzerPin = 8;

// Note frequencies (Hz) — C major scale
#define NOTE_C4  262
#define NOTE_D4  294
#define NOTE_E4  330
#define NOTE_F4  349
#define NOTE_G4  392
#define NOTE_A4  440
#define NOTE_B4  494
#define NOTE_C5  523

int melody[] = { NOTE_C4, NOTE_D4, NOTE_E4, NOTE_F4, NOTE_G4, NOTE_A4, NOTE_B4, NOTE_C5 };
int noteDuration = 250;

void setup() {
  pinMode(buzzerPin, OUTPUT);
  Serial.begin(9600);
  Serial.println("Buzzer melody started");
}

void loop() {
  for (int i = 0; i < 8; i++) {
    tone(buzzerPin, melody[i], noteDuration);
    Serial.print("Playing note: ");
    Serial.println(melody[i]);
    delay(noteDuration + 30);
  }
  noTone(buzzerPin);
  delay(500);
}`
  },
  {
    id: 'seg7_counter',
    name: '7-Segment Counter',
    icon: '🔢',
    desc: 'Count 0–9 on a single 7-segment display (common cathode, D2–D8)',
    tags: ['intermediate', 'display', 'seg7', 'counter'],
    circuit: EXAMPLE_CIRCUITS.seg7_counter,
    code: `/*
 * 7-Segment Counter — display digits 0..9
 * Segments a–g on D2..D8, common cathode to GND
 */

int segPins[7] = {2, 3, 4, 5, 6, 7, 8};

// Segment masks for digits 0..9 (a=MSB ... g=LSB)
byte digits[10] = {
  0b1111110, // 0
  0b0110000, // 1
  0b1101101, // 2
  0b1111001, // 3
  0b0110011, // 4
  0b1011011, // 5
  0b1011111, // 6
  0b1110000, // 7
  0b1111111, // 8
  0b1111011  // 9
};

void setup() {
  for (int i = 0; i < 7; i++) pinMode(segPins[i], OUTPUT);
  Serial.begin(9600);
  Serial.println("7-segment counter started");
}

void showDigit(int d) {
  for (int i = 0; i < 7; i++) {
    digitalWrite(segPins[i], (digits[d] >> (6 - i)) & 1 ? HIGH : LOW);
  }
}

void loop() {
  for (int d = 0; d <= 9; d++) {
    showDigit(d);
    Serial.print("Count: ");
    Serial.println(d);
    delay(500);
  }
}`
  },
  {
    id: 'relay_control',
    name: 'Relay Control',
    icon: '⚡',
    desc: 'Toggle a relay on pin 9 — the LED (on the NO contact) lights when the coil is energized',
    tags: ['beginner', 'relay', 'output'],
    circuit: EXAMPLE_CIRCUITS.relay_control,
    code: `/*
 * Relay Control — energize the coil on D9
 * The LED connected to the relay's NO contact turns on
 * when the relay is active.
 */

int relayPin = 9;

void setup() {
  pinMode(relayPin, OUTPUT);
  Serial.begin(9600);
  Serial.println("Relay example started");
}

void loop() {
  digitalWrite(relayPin, HIGH);
  Serial.println("Relay ON");
  delay(1000);

  digitalWrite(relayPin, LOW);
  Serial.println("Relay OFF");
  delay(1000);
}`
  },
  {
    id: 'dc_motor_speed',
    name: 'DC Motor Speed',
    icon: '🌀',
    desc: 'Control DC motor speed with a potentiometer — analogRead A0 maps to PWM on D9',
    tags: ['beginner', 'motor', 'PWM', 'analog'],
    circuit: EXAMPLE_CIRCUITS.dc_motor_speed,
    code: `/*
 * DC Motor Speed — potentiometer controls PWM speed
 * Turn the potentiometer slider to speed the motor up or down.
 */

int motorPin = 9;
int potPin = A0;

void setup() {
  pinMode(motorPin, OUTPUT);
  Serial.begin(9600);
  Serial.println("DC motor speed control started");
}

void loop() {
  int pot = analogRead(potPin);            // 0..1023
  int speed = map(pot, 0, 1023, 0, 255);   // 0..255 PWM
  analogWrite(motorPin, speed);

  Serial.print("Pot: ");
  Serial.print(pot);
  Serial.print("  Speed: ");
  Serial.println(speed);
  delay(50);
}`
  },
  {
    id: 'ldr_lamp',
    name: 'LDR Night Lamp',
    icon: '💡',
    desc: 'Light-dependent resistor — darker room (lower Light slider) dims the LED on D9',
    tags: ['beginner', 'sensor', 'analog', 'light'],
    circuit: EXAMPLE_CIRCUITS.ldr_lamp,
    code: `/*
 * LDR Night Lamp — LED brightness follows ambient light
 * Slide the LDR "Light" slider: bright light → brighter LED.
 */

int ldrPin = A0;
int ledPin = 9;

void setup() {
  pinMode(ledPin, OUTPUT);
  Serial.begin(9600);
  Serial.println("LDR lamp started");
}

void loop() {
  int light = analogRead(ldrPin);          // 0..1023
  int brightness = map(light, 0, 1023, 0, 255);
  analogWrite(ledPin, brightness);

  Serial.print("Light: ");
  Serial.print(light);
  Serial.print("  Brightness: ");
  Serial.println(brightness);
  delay(50);
}`
  },
  {
    id: 'pir_alarm',
    name: 'PIR Motion Alarm',
    icon: '🚶',
    desc: 'PIR motion sensor on D2 — when Motion is ON the LED on D13 lights and the console prints it',
    tags: ['beginner', 'sensor', 'motion'],
    circuit: EXAMPLE_CIRCUITS.pir_alarm,
    code: `/*
 * PIR Motion Alarm — detect motion on D2
 * Flip the "Motion" slider ON to trigger the LED and alarm messages.
 */

int pirPin = 2;
int ledPin = 13;

void setup() {
  pinMode(pirPin, INPUT);
  pinMode(ledPin, OUTPUT);
  Serial.begin(9600);
  Serial.println("PIR alarm armed");
}

void loop() {
  int motion = digitalRead(pirPin);

  if (motion == HIGH) {
    digitalWrite(ledPin, HIGH);
    Serial.println("MOTION DETECTED!");
  } else {
    digitalWrite(ledPin, LOW);
  }
  delay(200);
}`
  },
  {
    id: 'joystick_led',
    name: 'Joystick LED Control',
    icon: '🕹️',
    desc: 'Joystick X axis (A0) controls LED brightness on D9; pressing SW (D2) blinks it',
    tags: ['intermediate', 'input', 'analog', 'joystick'],
    circuit: EXAMPLE_CIRCUITS.joystick_led,
    code: `/*
 * Joystick LED — X axis dims the LED, SW button blinks it
 * Move the X/Y sliders and click the SW slider to test.
 */

int xPin = A0;
int yPin = A1;
int swPin = 2;
int ledPin = 9;

void setup() {
  pinMode(swPin, INPUT_PULLUP);
  pinMode(ledPin, OUTPUT);
  Serial.begin(9600);
  Serial.println("Joystick demo started");
}

void loop() {
  int x = analogRead(xPin);
  int y = analogRead(yPin);
  int sw = digitalRead(swPin);   // LOW when pressed

  if (sw == LOW) {
    // Pressed: blink fast
    for (int i = 0; i < 5; i++) {
      digitalWrite(ledPin, HIGH);
      delay(50);
      digitalWrite(ledPin, LOW);
      delay(50);
    }
  } else {
    // Not pressed: brightness from X axis
    int brightness = map(x, 0, 1023, 0, 255);
    analogWrite(ledPin, brightness);
  }

  Serial.print("X: ");
  Serial.print(x);
  Serial.print("  Y: ");
  Serial.print(y);
  Serial.print("  SW: ");
  Serial.println(sw == LOW ? "PRESSED" : "released");
  delay(80);
}`
  },
  {
    id: 'esp32_ntp_lcd',
    name: 'ESP32 NTP Clock (LCD)',
    icon: '🕐',
    desc: 'ESP32 DevKit V1 — fetch the current time from an NTP server and display it on a 16×2 I2C LCD',
    tags: ['esp32', 'wifi', 'ntp', 'lcd', 'i2c', 'display', 'clock'],
    circuit: EXAMPLE_CIRCUITS.esp32_ntp_lcd,
    code: `/*
 * ESP32 NTP Clock on LCD I2C
 * Connects to Wi-Fi, fetches UTC time via ntpEpoch(),
 * and displays HH:MM:SS on a 16x2 LCD.
 *
 * Wiring: LCD VCC -> 3V3, GND -> GND, SDA -> D21, SCL -> D22
 */

#include <WiFi.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

var ssid     = "ArduSimNet";
var password = "simulator";

LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup() {
  Serial.begin(115200);
  lcd.init();
  lcd.backlight();

  lcd.setCursor(0, 0);
  lcd.print("Connecting...");
  Serial.println("Connecting to Wi-Fi...");

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("  NTP Clock");
  lcd.setCursor(0, 1);
  lcd.print(WiFi.localIP());
  delay(1500);
}

void loop() {
  var epoch = ntpEpoch();
  var hours   = Math.floor((epoch % 86400) / 3600);
  var minutes = Math.floor((epoch % 3600)   / 60);
  var seconds = epoch % 60;

  var hh = hours < 10 ? "0" + hours : "" + hours;
  var mm = minutes < 10 ? "0" + minutes : "" + minutes;
  var ss = seconds < 10 ? "0" + seconds : "" + seconds;

  lcd.setCursor(0, 0);
  lcd.print("  NTP Time (UTC)");

  lcd.setCursor(0, 1);
  lcd.print("    ");
  lcd.print(hh);
  lcd.print(":");
  lcd.print(mm);
  lcd.print(":");
  lcd.print(ss);
  lcd.print("    ");

  Serial.print("Time: ");
  Serial.print(hh);
  Serial.print(":");
  Serial.print(mm);
  Serial.print(":");
  Serial.println(ss);

  delay(1000);
}`
  },
];

/* Export */
window.ArduinoSim = new ArduinoSimulator();
window.EXAMPLE_SKETCHES = EXAMPLE_SKETCHES;
