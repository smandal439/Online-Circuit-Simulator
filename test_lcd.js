global.window = global;
global.document = { getElementById: () => null, querySelector: () => null, createElement: () => ({}) };
global.fetch = async () => ({ ok: false });
global.WebSocket = class {};
Object.defineProperty(global, 'navigator', { value: {}, writable: true, configurable: true });
global.localStorage = { getItem: () => null, setItem: () => {} };
global.CircuitCanvas = { components: [] };
global.ArduSimMQTT = {};
global.mqtt = null;

const fs = require('fs');
const path = require('path');
const libDir = path.join(process.cwd(), 'js', 'libraries');
fs.readdirSync(libDir).filter(f => f.endsWith('.js')).forEach(f => {
  try { eval(fs.readFileSync(path.join(libDir, f), 'utf8')); } catch(e) { console.error('PLUGIN ERROR:', f, e.message); }
});
eval(fs.readFileSync(path.join(process.cwd(), 'js', 'simulator.js'), 'utf8'));
const sim = window.ArduinoSim;

const code = `#include <LiquidCrystal.h>
const int rs = 12, en = 11, d4 = 5, d5 = 4, d6 = 3, d7 = 2;
LiquidCrystal lcd(rs, en, d4, d5, d6, d7);

void setup() {
  lcd.begin(16, 2);
  lcd.print("hello, world!");
}

void loop() {
  lcd.clear();
  lcd.setCursor(0, 1);
  lcd.print(millis() / 1000);
  delay(1000);
}`;

const js = sim.transpile(code);
console.log(js);
console.log('\n=== buildContext check ===');
try {
  sim.buildContext(js);
  console.log('OK');
} catch(e) {
  console.error('ERROR:', e.message);
}
