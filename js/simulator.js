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
    js = js.replace(/^[ \t]*#define\s+(\w+)\s+(.+?)[ \t]*(?:\/\/.*)?$/gm, (_, name, value) => {
      defines[name] = value.trim();
      return `/* #define ${name} ${value} */`;
    });

    // 2. Remove other preprocessor directives
    js = js.replace(/^[ \t]*#[^\n]*/gm, '');

    // 3. Apply #define substitutions (simple word replacement)
    //    Skip function-like macros (e.g. #define FOO(x) ...) but allow
    //    parenthesized constants (e.g. #define SEALEVELPRESSURE_HPA (1013.25)).
    for (const [name, value] of Object.entries(defines)) {
      if (!/^[A-Za-z_]\w*$/.test(name)) continue;
      if (/^\w+\s*\(/.test(value)) continue; // function-like macro — leave untouched
      js = js.replace(new RegExp(`\\b${name}\\b`, 'g'), () => value);
    }

    // 4. Replace function declarations (return type + name + params + brace)
    const userFnNames = new Set();
    js = js.replace(/\bF\s*\(\s*("[^"]*"|'[^']*')\s*\)/g, '$1');
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
    js = js.replace(/\b(?:unsigned\s+)?(?:int|long|short|byte|float|double|boolean|bool|String|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t)\s+(\w+)(?=\s*[=;,\[\)])/g, 'let $1');
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
    // Adafruit_ILI9341 tft(CS, DC, MOSI, SCK, RESET);  →  let tft = new Adafruit_ILI9341(CS, DC, MOSI, SCK, RESET);
    js = js.replace(/\b(Servo|LiquidCrystal|LiquidCrystal_I2C|WiFiClient|PubSubClient|WebServer|Adafruit_SSD1306|Adafruit_ILI9341|SimpleBME280|Adafruit_VL53L0X|DHT)\s+(\w+)\s*(?:\(([^)]*)\))?\s*;/g, 'let $2 = new $1($3)');
    // Adafruit_VL53L0X lox = Adafruit_VL53L0X();  →  let lox = new Adafruit_VL53L0X();
    js = js.replace(/\b(Adafruit_VL53L0X)\s+(\w+)\s*=\s*\1\s*\(([^)]*)\)\s*;/g, function(_, t, n, a) { return 'let ' + n + ' = new ' + t + '(' + a + ')'; });

    // C++ passes I2C objects by reference: `&Wire` is invalid JS. Strip the `&`
    // only inside Adafruit_SSD1306 constructors to avoid breaking `a & b`.
    js = js.replace(/new\s+Adafruit_SSD1306\s*\(([^)]*)\)/g, (_, args) => `new Adafruit_SSD1306(${args.replace(/&\s*/g, '')})`);
    js = js.replace(/new\s+Adafruit_ILI9341\s*\(([^)]*)\)/g, (_, args) => `new Adafruit_ILI9341(${args.replace(/&\s*/g, '')})`);

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

    // 7a. Convert C char literals to charCode numbers: '1' → 49, 'A' → 65, '\n' → 10
    // Only single-quoted single characters (not double-quoted strings or multi-char)
    js = js.replace(/'\\n'/g, '10');
    js = js.replace(/'\\r'/g, '13');
    js = js.replace(/'\\t'/g, '9');
    js = js.replace(/'\\\\'/g, '92');
    js = js.replace(/''/g, '0');
    js = js.replace(/'.'/g, (match) => match.charCodeAt(1));

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
      ['isnan', 'Number.isNaN'],
      ['isinf', '!Number.isFinite'],
      ['isfinite', 'Number.isFinite'],
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
    js = js.replace(/\bSerial\.readStringUntil\s*\(/g, '_a.serialReadStringUntil(');
    js = js.replace(/\bSerial\.readBytes\s*\(/g, '_a.serialReadBytes(');
    js = js.replace(/\bSerial\.readBytesUntil\s*\(/g, '_a.serialReadBytesUntil(');
    js = js.replace(/\bSerial\.readLine\s*\(/g, '_a.serialReadLine(');

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
      return '_a.genericPrintln(' + v + ', ';
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
      return '_a.neopixelShow(' + varName;
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
      return '_a.neopixelNumPixels(' + varName;
    });
    js = js.replace(/\b(\w+)\.ColorHSV\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.neopixelColorHSV(' + varName + ', ';
    });
    js = js.replace(/\b(\w+)\.gamma32\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.neopixelGamma32(' + varName + ', ';
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

    // DHT sensor type constants
    js = js.replace(/\bDHT11\b/g, '11');
    js = js.replace(/\bDHT22\b/g, '22');
    js = js.replace(/\bDHT21\b/g, '21');
    js = js.replace(/\bAM2301\b/g, '22');

    // Adafruit_VL53L0X ToF ranging sensor library
    js = js.replace(/\bVL53L0X_RangingMeasurementData_t\s+(\w+)\s*;/g, 'let $1 = { RangeStatus: 0, RangeMilliMeter: 0 };');
    // rangingTest: handle &measure pass-by-reference, route to _a.vl53l0xRangingTest
    js = js.replace(/\b(\w+)\.rangingTest\s*\(([^)]+)\)/g, function (match, varName, args) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.vl53l0xRangingTest(' + varName + ', ' + args.replace(/&\s*/g, '') + ')';
    });

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

    // SimpleBME280 library — map before generic `.begin` / `.read` rules
    // Note: only match variables likely used for BME280 (bme*, sensor*) to avoid
    // colliding with DHT library which also has begin/readTemperature/readHumidity.
    js = js.replace(/\b(\w+)\.begin\s*\(\s*\)\s*;/g, function(m, v) {
      if (/^(bme|sensor|bmp)/i.test(v)) return '_a.bme280Begin(' + v + ');';
      return m;
    });
    js = js.replace(/\b(\w+)\.readTemperature\s*\(\s*\)/g, function(m, v) {
      if (/^(bme|sensor|bmp)/i.test(v)) return '_a.bme280ReadTemp(' + v + ')';
      return m;
    });
    js = js.replace(/\b(\w+)\.readHumidity\s*\(\s*\)/g, function(m, v) {
      if (/^(bme|sensor|bmp)/i.test(v)) return '_a.bme280ReadHum(' + v + ')';
      return m;
    });
    js = js.replace(/\b(\w+)\.readPressure\s*\(\s*\)/g, function(m, v) {
      if (/^(bme|sensor|bmp)/i.test(v)) return '_a.bme280ReadPres(' + v + ')';
      return m;
    });
    js = js.replace(/\b(\w+)\.readAltitude\s*\(([^)]+)\)/g, function(m, v, a) {
      if (/^(bme|sensor|bmp)/i.test(v)) return '_a.bme280ReadAlt(' + v + ', ' + a + ')';
      return m;
    });

    // Adafruit_ILI9341 / Adafruit_GFX — map before generic LCD rules
    js = js.replace(/\b(\w+)\.drawPixel\s*\(/g, '_a.tftDrawPixel($1, ');
    js = js.replace(/\b(\w+)\.drawLine\s*\(/g, '_a.tftDrawLine($1, ');
    js = js.replace(/\b(\w+)\.drawRect\s*\(/g, '_a.tftDrawRect($1, ');
    js = js.replace(/\b(\w+)\.fillRect\s*\(/g, '_a.tftFillRect($1, ');
    js = js.replace(/\b(\w+)\.drawCircle\s*\(/g, '_a.tftDrawCircle($1, ');
    js = js.replace(/\b(\w+)\.fillCircle\s*\(/g, '_a.tftFillCircle($1, ');
    js = js.replace(/\b(\w+)\.fillScreen\s*\(/g, '_a.tftFillScreen($1, ');
    js = js.replace(/\b(\w+)\.drawRoundRect\s*\(/g, '_a.tftDrawRoundRect($1, ');
    js = js.replace(/\b(\w+)\.fillRoundRect\s*\(/g, '_a.tftFillRoundRect($1, ');
    js = js.replace(/\b(\w+)\.drawTriangle\s*\(/g, '_a.tftDrawTriangle($1, ');
    js = js.replace(/\b(\w+)\.fillTriangle\s*\(/g, '_a.tftFillTriangle($1, ');
    js = js.replace(/\b(\w+)\.drawChar\s*\(/g, '_a.tftDrawChar($1, ');

    // LiquidCrystal
    js = js.replace(/\b(\w+)\.begin\s*\(\s*\)/g, function(m, v) {
      // Skip DHT objects (they have their own begin())
      if (/^dht/i.test(v)) return m;
      return '_a.lcdBegin(' + v + ')';
    });
    js = js.replace(/\b(\w+)\.begin\s*\(/g, function(m, v) {
      if (/^dht/i.test(v)) return m;
      return '_a.lcdBegin(' + v + ', ';
    });
    js = js.replace(/\b(\w+)\.setCursor\s*\(/g, '_a.lcdSetCursor($1, ');
    js = js.replace(/\b(\w+)\.print\s*\(/g, '_a.lcdPrint($1, ');
    js = js.replace(/\b(\w+)\.clear\s*\(/g, '_a.lcdClear($1');
    js = js.replace(/\b(\w+)\.home\s*\(/g, '_a.lcdHome($1');

    // Make delay async
    js = js.replace(/_a\.delay\s*\(/g, 'await _a.delay(');
    js = js.replace(/_a\.delayMicroseconds\s*\(/g, 'await _a.delayMicroseconds(');
    js = js.replace(/_a\.pulseIn\s*\(/g, 'await _a.pulseIn(');

    // Stepper.step() is blocking on real hardware — await the animated motion
    js = js.replace(/(?<!await\s)_a\.stepperStep\s*\(/g, 'await _a.stepperStep(');

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

    // Arduino String methods are in-place but JS String.prototype methods return new strings.
    // Convert: command.trim();  →  command = command.trim();
    // Convert: command.toLowerCase();  →  command = command.toLowerCase();
    // Convert: command.toUpperCase();  →  command = command.toUpperCase();
    js = js.replace(/\b(\w+)\.trim\(\)\s*;/g, function(_, v) { return v + ' = ' + v + '.trim();'; });
    js = js.replace(/\b(\w+)\.toLowerCase\(\)\s*;/g, function(_, v) { return v + ' = ' + v + '.toLowerCase();'; });
    js = js.replace(/\b(\w+)\.toUpperCase\(\)\s*;/g, function(_, v) { return v + ' = ' + v + '.toUpperCase();'; });

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

          // Live keypad column detection: compute column state on-read
          // based on current row pin states, so each scan row gets correct values.
          const canvas = window.CircuitCanvas;
          if (canvas && canvas.components && canvas.wires) {
            const keyMap = [
              ['1', '2', '3', 'A'],
              ['4', '5', '6', 'B'],
              ['7', '8', '9', 'C'],
              ['*', '0', '#', 'D']
            ];
            for (const inst of canvas.components) {
              if (inst.type !== 'keypad_4x4') continue;
              const pressedKey = inst.runtimeState?.pressedKey ?? inst.props?.pressedKey ?? null;
              if (!pressedKey) continue;
              // Find which column pin of this keypad is connected to the Arduino pin being read
              let colIdx = -1;
              for (let c = 0; c < 4; c++) {
                const cPinId = 'C' + (c + 1);
                for (const w of canvas.wires) {
                  let arduinoPinNum = null;
                  if (w.from.instId === inst.id && w.from.pinId === cPinId) {
                    const other = canvas.components.find(ci => ci.id === w.to.instId);
                    if (other && (other.type === 'arduino_uno' || other.type === 'esp32_devkit_v1')) {
                      arduinoPinNum = canvas._pinToNumber(w.to.pinId);
                    }
                  } else if (w.to.instId === inst.id && w.to.pinId === cPinId) {
                    const other = canvas.components.find(ci => ci.id === w.from.instId);
                    if (other && (other.type === 'arduino_uno' || other.type === 'esp32_devkit_v1')) {
                      arduinoPinNum = canvas._pinToNumber(w.from.pinId);
                    }
                  }
                  if (arduinoPinNum === pin) { colIdx = c; break; }
                }
                if (colIdx >= 0) break;
              }
              if (colIdx < 0) continue;
              // Find which row and column the pressed key is on
              let pressedRow = -1, pressedCol = -1;
              for (let r = 0; r < 4; r++) {
                for (let c = 0; c < 4; c++) {
                  if (keyMap[r][c] === pressedKey) { pressedRow = r; pressedCol = c; }
                }
              }
              if (pressedRow < 0 || pressedCol < 0) continue;
              // Only respond if the scanned column matches the pressed key's column
              if (colIdx !== pressedCol) return 1;
              // Check if that row pin is currently LOW
              const rPinId = 'R' + (pressedRow + 1);
              for (const w of canvas.wires) {
                let rPinNum = null;
                if (w.from.instId === inst.id && w.from.pinId === rPinId) {
                  const other = canvas.components.find(ci => ci.id === w.to.instId);
                  if (other && (other.type === 'arduino_uno' || other.type === 'esp32_devkit_v1')) {
                    rPinNum = canvas._pinToNumber(w.to.pinId);
                  }
                } else if (w.to.instId === inst.id && w.to.pinId === rPinId) {
                  const other = canvas.components.find(ci => ci.id === w.from.instId);
                  if (other && (other.type === 'arduino_uno' || other.type === 'esp32_devkit_v1')) {
                    rPinNum = canvas._pinToNumber(w.from.pinId);
                  }
                }
                if (rPinNum !== null) {
                  const rState = self.pinStates[`pin_${rPinNum}`];
                  if (rState === 0) return 0;
                  break;
                }
              }
              return 1;
            }
          }

          const state = self.pinStates[key];
          if (self.pinModes[key] === 'INPUT_PULLUP') {
            return state !== undefined ? state : 1;
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

        /* Wire (I2C) — with MPU6050 (0x68) register emulation */
        wireBegin() { self._serialLog('[Wire] I2C begin\n', 'system'); },
        wireBeginTransmission(addr) {
          self._wireTxAddr = Number(addr) || 0;
        },
        wireWrite(val) {
          // First byte written to the MPU6050 selects the register pointer
          if (self._wireTxAddr === 0x68) self._wireRegPtr = Number(val) & 0xFF;
          return 1;
        },
        wireEndTransmission() {
          self._wireTxAddr = null;
          return 0;
        },
        wireRequestFrom(addr, qty) {
          qty = Number(qty) || 0;
          if ((Number(addr) || 0) === 0x68) {
            self._wireRxQueue = self._mpuReadRegs(self._wireRegPtr ?? 0x3B, qty);
          } else {
            self._wireRxQueue = [];
          }
          return qty;
        },
        wireRead() {
          return (self._wireRxQueue && self._wireRxQueue.length) ? self._wireRxQueue.shift() : 0;
        },
        wireAvailable() { return (self._wireRxQueue && self._wireRxQueue.length) || 0; },

        /* SPI stubs */
        spiBegin() { self._serialLog('[SPI] begin\n', 'system'); },
        spiTransfer(val) { return 0; },
        spiEnd() { },

        /* SimpleBME280 library stubs */
        bme280Begin: function (obj) { return true; },
        bme280ReadTemp: function (obj) {
          var inst = self._bme280FindInst();
          if (!inst) return 25;
          return (inst.runtimeState && inst.runtimeState.temperature !== undefined) ? inst.runtimeState.temperature : (inst.props ? inst.props.temperature : 25);
        },
        bme280ReadHum: function (obj) {
          var inst = self._bme280FindInst();
          if (!inst) return 50;
          return (inst.runtimeState && inst.runtimeState.humidity !== undefined) ? inst.runtimeState.humidity : (inst.props ? inst.props.humidity : 50);
        },
        bme280ReadPres: function (obj) {
          var inst = self._bme280FindInst();
          var hpa = 1013.25;
          if (inst) {
            hpa = (inst.runtimeState && inst.runtimeState.pressure !== undefined) ? inst.runtimeState.pressure : (inst.props ? inst.props.pressure : 1013.25);
          }
          return hpa * 100;
        },
        bme280ReadAlt: function (obj, seaLevel) {
          var pres = self._bme280ReadPres(obj) / 100.0;
          return 44330.0 * (1.0 - Math.pow(pres / (seaLevel || 1013.25), 0.1903));
        },

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
        serialReadStringUntil(terminator) {
          const t = typeof terminator === 'number' ? String.fromCharCode(terminator) : String(terminator);
          const currentString = self.serialInputBuffer.join('');
          const index = currentString.indexOf(t);

          if (index === -1) {
            // Terminator not found yet — Arduino would block until timeout.
            // Simulator returns what's available so the loop doesn't spin forever.
            if (currentString.length > 0) {
              const partial = currentString;
              self.serialInputBuffer = [];
              return partial;
            }
            return '';
          }

          const lengthToRead = index + t.length;
          const result = currentString.slice(0, lengthToRead);

          // Clear the old buffer and store the leftover string as a single chunk
          const leftover = currentString.slice(lengthToRead);
          self.serialInputBuffer = leftover ? [leftover] : [];

          return result;
        }
        ,
        serialReadBytes(count) {
          const n = Math.min(count || 1, self.serialInputBuffer.length);
          const chars = self.serialInputBuffer.splice(0, n);
          return chars.map(c => c.charCodeAt(0));
        },
        serialReadBytesUntil(terminator) {
          const t = typeof terminator === 'number' ? String.fromCharCode(terminator) : String(terminator);
          const result = [];
          while (self.serialInputBuffer.length > 0) {
            const ch = self.serialInputBuffer.shift();
            result.push(ch.charCodeAt(0));
            if (ch === t) break;
          }
          return result;
        },
        serialReadLine() {
          const idx = self.serialInputBuffer.indexOf('\n');
          if (idx === -1) { const s = self.serialInputBuffer.join(''); self.serialInputBuffer = []; return s; }
          const line = self.serialInputBuffer.splice(0, idx + 1).join('');
          return line.endsWith('\n') ? line.slice(0, -1) : line;
        },

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
          const key = `pin_${pin}`;
          const targetHigh = (val === 1 || val === HIGH);

          // Helper: advance simTime and yield (mirrors the context's delay())
          const advanceMs = async (ms) => {
            ms = Number(ms) || 0;
            const realMs = ms / self.speed;
            self.simTime += ms;
            self._iterSinceDelay = 0;
            await self._delayPromise(realMs);
          };

          // Try to find an HC-SR04 connected to this echo pin — compute directly
          const canvas = window.CircuitCanvas;
          if (canvas && canvas._getConnectedPinNum) {
            for (const inst of (canvas.components || [])) {
              if (inst.type === 'hcsr04') {
                const echoPinNum = canvas._getConnectedPinNum(inst.id, 'echo');
                if (echoPinNum === pin) {
                  const dist = Number(inst.runtimeState && inst.runtimeState.distance !== undefined ? inst.runtimeState.distance : (inst.props && inst.props.distance)) || 20;
                  const echoUs = Math.max(100, Math.round(dist * 58));
                  // Simulate: set echo HIGH, advance time, set echo LOW
                  self.pinStates[key] = targetHigh ? 1 : 0;
                  self._emitPinChange(key, targetHigh ? 1 : 0);
                  await advanceMs(echoUs / 1000);
                  self.pinStates[key] = targetHigh ? 0 : 1;
                  self._emitPinChange(key, targetHigh ? 0 : 1);
                  return echoUs;
                }
              }
            }
          }

          // Fallback: poll pinStates until pulse detected or timeout
          const timeoutMs = timeout != null ? (timeout / 1000) : 1000;
          const deadline = self.simTime + timeoutMs;
          const target = targetHigh ? 1 : 0;

          // Wait for pin to reach target state
          while ((self.pinStates[key] || 0) !== target) {
            if (self.simTime >= deadline) return 0;
            await advanceMs(0.1);
          }
          const startMs = self.simTime;

          // Wait for pin to leave target state
          while ((self.pinStates[key] || 0) === target) {
            if (self.simTime >= deadline) return Math.round((self.simTime - startMs) * 1000);
            await advanceMs(0.1);
          }

          return Math.round((self.simTime - startMs) * 1000);
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
          if (varName && varName.__tft) {
            self._emitEvent('tft_power', { on: true });
            return;
          }
          self._emitEvent('lcd_power', { on: true });
        },
        lcdSetCursor(varName, col, row) {
          if (varName && varName.__tft) {
            self._tftCursor = { col: Number(col) || 0, row: Number(row) || 0 };
            return;
          }
          self._lcdCursor = { col: Number(col) || 0, row: Number(row) || 0 };
        },
        lcdPrint(varName, val) {
          if (varName && varName._ssId) {
            const ch = self._softSerial && self._softSerial[varName._ssId];
            if (ch) { self._serialLog(String(val) + '\n', 'data'); }
            return;
          }
          const text = String(val);
          // TFT (Adafruit_ILI9341): cursor in pixels, sized by setTextSize()
          if (varName && varName.__tft) {
            const cursor = self._tftCursor || { col: 0, row: 0 };
            const size = self._tftTextSize || 1;
            const fg = self._tftFgColor != null ? self._tftFgColor : 0xFFFF;
            const bg = self._tftBgColor != null ? self._tftBgColor : 0x0000;
            self._emitEvent('tft_draw', {
              op: 'print', text,
              x: cursor.col, y: cursor.row,
              size, fg, bg,
            });
            self._tftCursor = { col: cursor.col + text.length * 6 * size, row: cursor.row };
            return;
          }
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
          if (varName && varName.__tft) {
            self._emitEvent('tft_draw', { op: 'fillScreen', color: 0x0000 });
            return;
          }
          self._emitEvent('lcd_clear', {});
        },
        lcdHome(varName) { self._lcdCursor = { col: 0, row: 0 }; },

        /* ══════════ Adafruit_ILI9341 / Adafruit_GFX — TFT (240×320 RGB) ══════════ */
        tftBegin(varName) {
          self._emitEvent('tft_power', { on: true });
        },
        tftSetCursor(varName, col, row) {
          if (varName && varName.__tft) {
            self._tftCursor = { col: Number(col) || 0, row: Number(row) || 0 };
          }
        },
        tftPrint(varName, val) {
          if (varName && varName.__tft) {
            const text = String(val);
            const cursor = self._tftCursor || { col: 0, row: 0 };
            const size = self._tftTextSize || 1;
            const fg = self._tftFgColor != null ? self._tftFgColor : 0xFFFF;
            const bg = self._tftBgColor != null ? self._tftBgColor : 0x0000;
            self._emitEvent('tft_draw', {
              op: 'print', text,
              x: cursor.col, y: cursor.row,
              size, fg, bg,
            });
            self._tftCursor = { col: cursor.col + text.length * 6 * size, row: cursor.row };
          }
        },
        tftPrintln(varName, val) {
          if (varName && varName.__tft) {
            const text = String(val);
            const cursor = self._tftCursor || { col: 0, row: 0 };
            const size = self._tftTextSize || 1;
            const fg = self._tftFgColor != null ? self._tftFgColor : 0xFFFF;
            const bg = self._tftBgColor != null ? self._tftBgColor : 0x0000;
            self._emitEvent('tft_draw', {
              op: 'print', text,
              x: cursor.col, y: cursor.row,
              size, fg, bg,
            });
            self._tftCursor = { col: 0, row: cursor.row + 8 * size };
          }
        },
        tftSetTextColor(varName, fg, bg) {
          if (varName && varName.__tft) {
            self._tftFgColor = Number(fg) || 0xFFFF;
            self._tftBgColor = bg != null ? (Number(bg) || 0x0000) : self._tftFgColor;
          }
        },
        tftSetTextSize(varName, s) {
          if (varName && varName.__tft) {
            self._tftTextSize = Math.max(1, Math.round(Number(s) || 1));
          }
        },
        tftSetTextWrap(varName, w) { },
        tftSetRotation(varName, r) { },
        tftDrawPixel(varName, x, y, color) {
          if (varName && varName.__tft) {
            self._emitEvent('tft_draw', { op: 'pixel', x: Number(x) || 0, y: Number(y) || 0, color: Number(color) || 0xFFFF });
          }
        },
        tftDrawLine(varName, x0, y0, x1, y1, color) {
          if (varName && varName.__tft) {
            self._emitEvent('tft_draw', { op: 'line', x0: Number(x0), y0: Number(y0), x1: Number(x1), y1: Number(y1), color: Number(color) || 0xFFFF });
          }
        },
        tftDrawRect(varName, x, y, w, h, color) {
          if (varName && varName.__tft) {
            self._emitEvent('tft_draw', { op: 'rect', x: Number(x), y: Number(y), w: Number(w), h: Number(h), color: Number(color) || 0xFFFF });
          }
        },
        tftFillRect(varName, x, y, w, h, color) {
          if (varName && varName.__tft) {
            self._emitEvent('tft_draw', { op: 'fillRect', x: Number(x), y: Number(y), w: Number(w), h: Number(h), color: Number(color) || 0x0000 });
          }
        },
        tftDrawCircle(varName, cx, cy, r, color) {
          if (varName && varName.__tft) {
            self._emitEvent('tft_draw', { op: 'circle', x: Number(cx), y: Number(cy), r: Number(r), color: Number(color) || 0xFFFF });
          }
        },
        tftFillCircle(varName, cx, cy, r, color) {
          if (varName && varName.__tft) {
            self._emitEvent('tft_draw', { op: 'fillCircle', x: Number(cx), y: Number(cy), r: Number(r), color: Number(color) || 0x0000 });
          }
        },
        tftFillScreen(varName, color) {
          if (varName && varName.__tft) {
            self._emitEvent('tft_draw', { op: 'fillScreen', color: Number(color) || 0x0000 });
          }
        },
        tftDrawRoundRect(varName, x, y, w, h, r, color) {
          if (varName && varName.__tft) {
            self._emitEvent('tft_draw', { op: 'roundRect', x: Number(x), y: Number(y), w: Number(w), h: Number(h), r: Number(r), color: Number(color) || 0xFFFF });
          }
        },
        tftFillRoundRect(varName, x, y, w, h, r, color) {
          if (varName && varName.__tft) {
            self._emitEvent('tft_draw', { op: 'fillRoundRect', x: Number(x), y: Number(y), w: Number(w), h: Number(h), r: Number(r), color: Number(color) || 0x0000 });
          }
        },
        tftDrawTriangle(varName, x0, y0, x1, y1, x2, y2, color) {
          if (varName && varName.__tft) {
            self._emitEvent('tft_draw', { op: 'triangle', x0: Number(x0), y0: Number(y0), x1: Number(x1), y1: Number(y1), x2: Number(x2), y2: Number(y2), color: Number(color) || 0xFFFF });
          }
        },
        tftFillTriangle(varName, x0, y0, x1, y1, x2, y2, color) {
          if (varName && varName.__tft) {
            self._emitEvent('tft_draw', { op: 'fillTriangle', x0: Number(x0), y0: Number(y0), x1: Number(x1), y1: Number(y1), x2: Number(x2), y2: Number(y2), color: Number(color) || 0x0000 });
          }
        },
        tftDrawChar(varName, x, y, c, color, bg, size) {
          if (varName && varName.__tft) {
            self._emitEvent('tft_draw', { op: 'char', x: Number(x), y: Number(y), char: String(c), color: Number(color) || 0xFFFF, bg: Number(bg) || 0x0000, size: Number(size) || 1 });
          }
        },

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
        genericPrintln(obj, val) {
          const text = String(val);
          // TFT (Adafruit_ILI9341)
          if (obj && obj.__tft) {
            const cursor = self._tftCursor || { col: 0, row: 0 };
            const size = self._tftTextSize || 1;
            const fg = self._tftFgColor != null ? self._tftFgColor : 0xFFFF;
            const bg = self._tftBgColor != null ? self._tftBgColor : 0x0000;
            self._emitEvent('tft_draw', { op: 'print', text, x: cursor.col, y: cursor.row, size, fg, bg });
            self._tftCursor = { col: 0, row: cursor.row + 8 * size };
            return;
          }
          // OLED (Adafruit_SSD1306)
          if (obj && obj.__oled) {
            const cursor = self._lcdCursor || { col: 0, row: 0 };
            const size = self._oledTextSize || 1;
            self._emitEvent('oled_draw', { op: 'print', text, cursor: { col: cursor.col, row: cursor.row }, size, color: self._oledTextColor === 0 ? 0 : 1 });
            self._lcdCursor = { col: 0, row: cursor.row + 8 * size };
            return;
          }
          // SoftwareSerial
          if (obj && obj._ssId) {
            self._serialLog(text + '\n', 'data');
            return;
          }
          // Default: log to serial
          self._serialLog(text + '\n', 'data');
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
        stepperNew(stepsPerRev, p1, p2, p3, p4) {
          const id = `_stepper_${p1}_${p2}`;
          self._steppers = self._steppers || {};
          const s = { stepsPerRev, pin1: p1, pin2: p2, pin3: p3, pin4: p4, pos: 0, target: 0, speed: 1, accel: 100, seqIndex: 0 };
          self._steppers[id] = s;
          self._serialLog(`[Stepper] Created stepsPerRev=${stepsPerRev} pins=${[p1, p2, p3, p4].filter(p => p != null).join(',')}\n`, 'system');
          return { _stepperId: id };
        },
        /* Energize the 4 coil pins using the two-phase full-step sequence */
        _stepperWritePins(s) {
          const seq = [[1, 0, 1, 0], [0, 1, 1, 0], [0, 1, 0, 1], [1, 0, 0, 1]];
          const pat = seq[((s.seqIndex % 4) + 4) % 4];
          const pins = [s.pin1, s.pin2, s.pin3, s.pin4];
          for (let i = 0; i < 4; i++) {
            const p = pins[i];
            if (p == null) continue;
            const key = `pin_${p}`;
            self.pinStates[key] = pat[i];
            self._emitPinChange(key, pat[i]);
          }
        },
        /* Blocking step() like the real Stepper.h — animates coil patterns at setSpeed RPM */
        async stepperStep(obj, steps) {
          const s = self._steppers && self._steppers[obj._stepperId];
          const n = Math.round(Number(steps)) || 0;
          if (!s || n === 0) return;
          const rpm = Math.max(Math.abs(s.speed) || 1, 0.01);
          const intervalRealMs = 60000 / ((Number(s.stepsPerRev) || 2048) * rpm);
          const dir = n > 0 ? 1 : -1;
          s.target = s.pos + n;
          for (let i = 0; i < Math.abs(n); i++) {
            if (!self.isRunning) return;
            s.seqIndex += dir;
            s.pos += dir;
            this._stepperWritePins(s);
            try {
              await self._delayPromise(intervalRealMs / (self.speed || 1));
            } catch (e) {
              return; /* simulation stopped/reset */
            }
          }
          self._serialLog(`[Stepper] step(${n}) → pos=${s.pos}\n`, 'system');
        },
        stepperSetSpeed(obj, rpm) {
          const s = self._steppers && self._steppers[obj._stepperId];
          if (s) s.speed = Number(rpm) || 1;
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
          const dir = s.pos < s.target ? 1 : -1;
          s.seqIndex += dir;
          s.pos += dir;
          this._stepperWritePins(s);
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
        neopixelColorHSV(obj, hue, sat, val) {
          const h = (Number(hue) || 0) & 0xFFFF;
          const s = sat !== undefined ? Math.max(0, Math.min(255, Number(sat) || 0)) : 255;
          const v = val !== undefined ? Math.max(0, Math.min(255, Number(val) || 0)) : 255;
          if (s === 0) return (v << 16) | (v << 8) | v;
          const hueShift = (h * 6) >> 16;
          const region = hueShift / 256;
          const remainder = (hueShift & 255);
          const p = (v * (255 - s)) >> 8;
          const q = (v * (255 - ((s * remainder) >> 8))) >> 8;
          const t = (v * (255 - ((s * (255 - remainder)) >> 8))) >> 8;
          let r, g, b;
          switch (region) {
            case 0: r = v; g = t; b = p; break;
            case 1: r = q; g = v; b = p; break;
            case 2: r = p; g = v; b = t; break;
            case 3: r = p; g = q; b = v; break;
            case 4: r = t; g = p; b = v; break;
            default: r = v; g = p; b = q; break;
          }
          return (r << 16) | (g << 8) | b;
        },
        neopixelGamma32(obj, color) {
          const c = Number(color) || 0;
          const r = (c >> 16) & 0xFF;
          const g = (c >> 8) & 0xFF;
          const b = c & 0xFF;
          const gamma = 2.8;
          const gr = Math.round(Math.pow(r / 255, gamma) * 255);
          const gg = Math.round(Math.pow(g / 255, gamma) * 255);
          const gb = Math.round(Math.pow(b / 255, gamma) * 255);
          return (gr << 16) | (gg << 8) | gb;
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
      // Adafruit_ILI9341 common RGB565 color constants
      ILI9341_BLACK: 0x0000, ILI9341_WHITE: 0xFFFF, ILI9341_RED: 0xF800,
      ILI9341_GREEN: 0x07E0, ILI9341_BLUE: 0x001F, ILI9341_CYAN: 0x07FF,
      ILI9341_MAGENTA: 0xF81F, ILI9341_YELLOW: 0xFFE0, ILI9341_ORANGE: 0xFD20,
      ILI9341_DARKGREEN: 0x03E0, ILI9341_DARKGREY: 0x7BEF, ILI9341_NAVY: 0x000F,
      ILI9341_MAROON: 0x7800, ILI9341_PURPLE: 0x780F, ILI9341_OLIVE: 0x7BE0,
      ILI9341_LIGHTGREY: 0xC618, ILI9341_DARKCYAN: 0x03EF,

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
      SimpleBME280: function () { return {}; },
      /* DHT temperature/humidity sensor library stub.
         Reads values from a placed dht11 component on the canvas. */
      DHT: function (pin, type) {
        return {
          __dht: true,
          _pin: Number(pin) || 2,
          _type: Number(type) || 11,
          begin() { self._serialLog('[DHT] Sensor initialized on pin ' + (Number(pin) || 2) + '\n', 'system'); },
          readTemperature(scale) {
            var inst = self._dhtFindInst();
            if (!inst) return NaN;
            var t = (inst.runtimeState && inst.runtimeState.temperature !== undefined)
              ? inst.runtimeState.temperature : (inst.props ? inst.props.temperature : 25);
            if (scale === 'F' || scale === 1) t = t * 9.0 / 5.0 + 32;
            return t;
          },
          readHumidity() {
            var inst = self._dhtFindInst();
            if (!inst) return NaN;
            return (inst.runtimeState && inst.runtimeState.humidity !== undefined)
              ? inst.runtimeState.humidity : (inst.props ? inst.props.humidity : 60);
          },
          convertCtoF(c) { return c * 9.0 / 5.0 + 32; },
          convertFtoC(f) { return (f - 32) * 5.0 / 9.0; },
          computeHeatIndex(t, h, si) { return si ? t : (t - 0.55 * (1 - h / 100) * (t - 14.5)); },
        };
      },
      /* Adafruit_VL53L0X Time-of-Flight ranging sensor (I2C).
         Emulates begin() and rangingTest() with simulated distance values. */
      Adafruit_VL53L0X: function () {
        return {
          __vl53l0x: true,
          begin() { self._serialLog('[VL53L0X] I2C sensor initialized\n', 'system'); return true; },
          rangingTest(measure, debug) {
            // Simulate a distance reading: 50–800 mm range with slight jitter
            const dist = Math.floor(200 + Math.random() * 300);
            measure.RangeStatus = 0;
            measure.RangeMilliMeter = dist;
            if (debug) {
              self._serialLog(`[VL53L0X] Range: ${dist}mm (status=0)\n`, 'system');
            }
          },
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
      /* ILI9341 240×320 (SPI) — Adafruit_GFX + Adafruit_ILI9341 library stub.
         All drawing methods emit tft_draw events processed in app.js. */
      Adafruit_ILI9341: function () {
        const num = (v) => Math.round(Number(v) || 0);
        const rgb565toRGB = (c) => {
          c = Number(c) || 0;
          const r = ((c >> 11) & 0x1F) << 3;
          const g = ((c >> 5) & 0x3F) << 2;
          const b = (c & 0x1F) << 3;
          return [r, g, b];
        };
        const draw = (op, extra) => self._emitEvent('tft_draw', Object.assign({ op }, extra));
        return {
          __tft: true,
          begin() { self._emitEvent('tft_power', { on: true }); },
          setRotation(r) { },
          fillScreen(color) { draw('fillScreen', { color: num(color) }); },
          setCursor(x, y) { self._tftCursor = { col: num(x), row: num(y) }; },
          setTextColor(fg, bg) { self._tftFgColor = num(fg); self._tftBgColor = bg != null ? num(bg) : num(fg); },
          setTextSize(s) { self._tftTextSize = Math.max(1, Math.round(Number(s) || 1)); },
          setTextWrap(w) { },
          print(val) {
            const text = String(val);
            const cursor = self._tftCursor || { col: 0, row: 0 };
            const size = self._tftTextSize || 1;
            const fg = self._tftFgColor != null ? self._tftFgColor : 0xFFFF;
            const bg = self._tftBgColor != null ? self._tftBgColor : 0x0000;
            draw('print', { text, x: cursor.col, y: cursor.row, size, fg, bg });
            self._tftCursor = { col: cursor.col + text.length * 6 * size, row: cursor.row };
          },
          println(val) {
            const text = String(val);
            const cursor = self._tftCursor || { col: 0, row: 0 };
            const size = self._tftTextSize || 1;
            const fg = self._tftFgColor != null ? self._tftFgColor : 0xFFFF;
            const bg = self._tftBgColor != null ? self._tftBgColor : 0x0000;
            draw('print', { text, x: cursor.col, y: cursor.row, size, fg, bg });
            self._tftCursor = { col: 0, row: cursor.row + 8 * size };
          },
          drawPixel(x, y, color) { draw('pixel', { x: num(x), y: num(y), color: num(color) }); },
          drawLine(x0, y0, x1, y1, color) { draw('line', { x0: num(x0), y0: num(y0), x1: num(x1), y1: num(y1), color: num(color) }); },
          drawRect(x, y, w, h, color) { draw('rect', { x: num(x), y: num(y), w: num(w), h: num(h), color: num(color) }); },
          fillRect(x, y, w, h, color) { draw('fillRect', { x: num(x), y: num(y), w: num(w), h: num(h), color: num(color) }); },
          drawCircle(x, y, r, color) { draw('circle', { x: num(x), y: num(y), r: num(r), color: num(color) }); },
          fillCircle(x, y, r, color) { draw('fillCircle', { x: num(x), y: num(y), r: num(r), color: num(color) }); },
          drawRoundRect(x, y, w, h, r, color) { draw('roundRect', { x: num(x), y: num(y), w: num(w), h: num(h), r: num(r), color: num(color) }); },
          fillRoundRect(x, y, w, h, r, color) { draw('fillRoundRect', { x: num(x), y: num(y), w: num(w), h: num(h), r: num(r), color: num(color) }); },
          drawTriangle(x0, y0, x1, y1, x2, y2, color) { draw('triangle', { x0: num(x0), y0: num(y0), x1: num(x1), y1: num(y1), x2: num(x2), y2: num(y2), color: num(color) }); },
          fillTriangle(x0, y0, x1, y1, x2, y2, color) { draw('fillTriangle', { x0: num(x0), y0: num(y0), x1: num(x1), y1: num(y1), x2: num(x2), y2: num(y2), color: num(color) }); },
          drawChar(x, y, c, color, bg, size) { draw('char', { x: num(x), y: num(y), char: String(c), color: num(color), bg: num(bg), size: num(size) }); },
          setRotation(r) { },
          width() { return 320; },
          height() { return 240; },
          color565(r, g, b) { return ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3); },
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
        // Reuse existing session ID (set in run()) or generate new one
        const session = self.sessionId || Math.random().toString(36).slice(2, 7);
        self.sessionId = session;
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
    this._wireTxAddr = null;
    this._wireRegPtr = 0x3B;
    this._wireRxQueue = [];
    this._neopixels = {};
    this._lcdLines = ['', ''];
    this._lcdCursor = { col: 0, row: 0 };
    this._mqtt = { subs: new Map(), connected: false };
    this._startRealTime = Date.now();
    this._fpsFrames = 0;
    this._fpsLast = Date.now();
    this._fps = 0;
    this._loopCount = 0;
    this._iterSinceDelay = 0;
    // Generate session ID for remote control (every run)
    this.sessionId = Math.random().toString(36).slice(2, 7);

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

  /* ══════════════ MPU6050 (0x68) register read emulation ══════════════
     Serves Wire.requestFrom(0x68, n) starting at the register pointer set
     by a preceding Wire.write(reg). Values come from the placed mpu6050
     component's interactive sliders (runtimeState/props). */
  _mpuReadRegs(start, qty) {
    const canvas = window.CircuitCanvas;
    let ax = 0, ay = 0, az = 0, gx = 0, gy = 0, gz = 0;
    const inst = (canvas && Array.isArray(canvas.components))
      ? canvas.components.find(c => c.type === 'mpu6050') : null;
    if (inst) {
      const rs = inst.runtimeState || {};
      const pr = inst.props || {};
      const rd = (f) => Math.round(Number(rs[f] !== undefined ? rs[f] : pr[f]) || 0);
      ax = rd('accelX'); ay = rd('accelY'); az = rd('accelZ');
      gx = rd('gyroX'); gy = rd('gyroY'); gz = rd('gyroZ');
    }
    const tempRaw = -3920; /* ≈ 25 °C — raw/340 + 36.53 */
    const regs = {};
    const put16 = (a, v) => {
      v = Math.max(-32768, Math.min(32767, v | 0));
      if (v < 0) v += 65536;
      regs[a] = (v >> 8) & 0xFF;
      regs[a + 1] = v & 0xFF;
    };
    put16(0x3B, ax); put16(0x3D, ay); put16(0x3F, az);   /* ACCEL_XOUT..ZOUT */
    put16(0x41, tempRaw);                                 /* TEMP_OUT */
    put16(0x43, gx); put16(0x45, gy); put16(0x47, gz);   /* GYRO_XOUT..ZOUT */
    regs[0x75] = 0x68;                                    /* WHO_AM_I */
    const out = [];
    for (let i = 0; i < qty; i++) out.push(regs[(start + i) & 0xFF] || 0);
    return out;
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

  getPinVoltage(inst, pinId) {
    if (!window.CircuitCanvas) return 0;

    // 1. Try Arduino/ESP32 board pin lookup
    if (typeof window.CircuitCanvas._getConnectedPinNum === 'function') {
      const pinNum = window.CircuitCanvas._getConnectedPinNum(inst.id, pinId);
      if (pinNum !== null) return this.pinStates[`pin_${pinNum}`] || 0;
    }

    // 2. Try direct pinStates lookup
    const directVal = this.pinStates[`${inst.id}_${pinId}`];
    if (directVal !== undefined) return directVal;

    // 3. Follow wire to the connected component and read its output voltage
    if (typeof window.CircuitCanvas._getWireTarget === 'function') {
      const target = window.CircuitCanvas._getWireTarget(inst.id, pinId);
      if (target) {
        const other = target.inst;
        // Function Generator output
        if (other.type === 'func_gen') {
          const rs = other.runtimeState || {};
          if (target.pinId === 'ch1_out') return rs.ch1_voltage || 0;
          if (target.pinId === 'ch2_out') return rs.ch2_voltage || 0;
        }
        // IC output pins
        const IC_OUT = {
          ic_555: ['OUT'],
          ic_74hc00: ['Y1','Y2','Y3','Y4'],
          ic_74hc04: ['Y1','Y2','Y3','Y4','Y5','Y6'],
          ic_74hc08: ['Y1','Y2','Y3','Y4'],
          ic_74hc32: ['Y1','Y2','Y3','Y4'],
          ic_74hc595: ['QA','QB','QC','QD','QE','QF','QG','QH'],
          ic_74hc138: ['Y0','Y1','Y2','Y3','Y4','Y5','Y6','Y7'],
          ic_74hc245: ['A1','A2','A3','A4','A5','A6','A7','A8','B1','B2','B3','B4','B5','B6','B7','B8'],
          ic_74hc74: ['Q1','Q1n','Q2','Q2n'],
          ic_74hc165: ['Q7','Q7n'],
          ic_74hc193: ['QA','QB','CO','BO','TC_U','TC_D'],
          ic_74hc47: ['a','b','c','d','e','f','g'],
          ic_74hc148: ['A0','A1','A2','GS','EO'],
          lm741: ['OUT'],
        };
        if (IC_OUT[other.type] && IC_OUT[other.type].includes(target.pinId)) {
          if (other.type === 'lm741') {
            return other.runtimeState ? (other.runtimeState.vOut || 0) : 0;
          }
          const raw = other.runtimeState && other.runtimeState[target.pinId] != null
            ? other.runtimeState[target.pinId] : 0;
          return raw > 1 ? (raw / 255) * 5.0 : raw > 0 ? 5.0 : 0;
        }
        // Potentiometer wiper
        if (other.type === 'potentiometer' && target.pinId === 'wiper') {
          return (other.runtimeState && other.runtimeState.wiper != null) ? (other.runtimeState.wiper / 1023) * 5.0 : 0;
        }
        // Op-amp output
        if (other.type === 'lm741' && target.pinId === 'OUT') {
          return other.runtimeState ? (other.runtimeState.vOut || 0) : 0;
        }
        // Probe pass-through — return voltage sampled at probe tip
        if (other.type === 'probe' || other.type.startsWith('osc_probe_') || other.type.startsWith('dso_probe_')) {
          return other.runtimeState ? (other.runtimeState.voltage || 0) : 0;
        }
        // Another DSO reading from a source — recurse
        if (other.type === 'dso_4ch') {
          return 0;
        }
      }
    }

    return 0;
  }

  _bme280FindInst() {
    if (!window.CircuitCanvas) return null;
    var comps = window.CircuitCanvas.components || [];
    for (var i = 0; i < comps.length; i++) {
      if (comps[i].type === 'bme280') return comps[i];
    }
    return null;
  }

  _dhtFindInst() {
    if (!window.CircuitCanvas) return null;
    var comps = window.CircuitCanvas.components || [];
    for (var i = 0; i < comps.length; i++) {
      if (comps[i].type === 'dht11') return comps[i];
    }
    return null;
  }

  _bme280ReadPres(obj) {
    var inst = this._bme280FindInst();
    var hpa = 1013.25;
    if (inst) {
      hpa = (inst.runtimeState && inst.runtimeState.pressure !== undefined) ? inst.runtimeState.pressure : (inst.props ? inst.props.pressure : 1013.25);
    }
    return hpa * 100;
  }
}

/* ═══════════════ EXAMPLE SKETCHES ═══════════════ */
/* ═══════════════════════════════════════════════════════════
   EXAMPLE CIRCUITS — serialized project data loaded on the canvas
   when an example is opened. Matches the pins of each example code.
   ═══════════════════════════════════════════════════════════ */
/* Examples are now loaded from the examples/ folder as individual JSON files. */

/* Export */
window.ArduinoSim = new ArduinoSimulator();
window.EXAMPLE_SKETCHES = [];
window.loadExamplesFromFiles = async function () {
  const files = ['blink', 'esp32_blink', 'fade', 'button', 'potentiometer', 'servo_sweep',
    'traffic_light', 'counter', 'rainbow_rgb', 'morse', 'temperature', 'ultrasonic',
    'esp32_fade', 'mqtt_esp32', 'lcd_i2c', 'oled_ssd1306', 'esp32_server', 'serial_plotter',
    'buzzer_melody', 'seg7_counter', 'relay_control', 'dc_motor_speed', 'stepper_motor',
    'neopixel_color_cycle', 'mpu6050_accel', 'ldr_lamp', 'pir_alarm', 'joystick_led',
    'esp32_ntp_lcd', 'ic_nand_test', 'logic_analyzer_test', 'temperature_LCD', 'dmm_current',
    'dmm_resistance', 'dmm_voltage', 'func_gen_dual', 'func_gen_led', 'remote_control_leds',
    'remote_servo_control', 'lm35_temperature', 'keypad_interfacing', 'bme280_weather',
    'bmp280_altitude', 'dso_oscilloscope', 'simplebme280_basic', 'simplebme280_altitude',
    'max7219', 'ili9341', 'astable_555', 'neopixel_strip_chase', 'ir_obstacle_led',
    'l298n_dc_motor', 'servo_continuous_spin', 'rotary_encoder_counter',
    'dip_switch_binary', 'hc05_bluetooth_led', 'rotary_encoder_servo',
    'opamp_741_non_inverting','vl53l0x_proximity_sensor'];
  const sketches = [];
  const cacheBust = '?v=' + Date.now();
  for (const name of files) {
    try {
      const res = await fetch('Examples/' + name + '.json' + cacheBust);
      if (res.ok) {
        sketches.push(await res.json());
      } else {
        console.warn('[ArduSim] Example HTTP ' + res.status + ': ' + name);
      }
    } catch (e) { console.warn('[ArduSim] Failed to load example: ' + name, e); }
  }
  console.log('[ArduSim] Loaded ' + sketches.length + '/' + files.length + ' examples');
  window.EXAMPLE_SKETCHES = sketches;
};
