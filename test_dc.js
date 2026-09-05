const vm = require('vm');
const fs = require('fs');
const ctx = { window: {}, console, Math, Date, setTimeout, clearTimeout, setInterval, clearInterval, Array, Object, String, Number, Boolean, RegExp, Error, Promise, Map, Set, JSON, parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent, atob, btoa };
ctx.window.window = ctx.window;
vm.createContext(ctx);

// Load all component files
const files = fs.readdirSync('js/components').map(f => 'js/components/' + f);
files.push('js/libraries/servo.js');
files.push('js/simulator.js');
for (const f of files) {
  try { vm.runInContext(fs.readFileSync(f, 'utf8'), ctx); } catch(e) { console.log('Error loading', f, e.message); }
}

// Check if dc_motor component exists
console.log('Components:', ctx.window.ArduinoComponents ? Object.keys(ctx.window.ArduinoComponents.COMPONENT_DEFS || {}).filter(k => k.includes('motor') || k.includes('pot')) : 'NOT FOUND');

// Check if potentiometer updateSimState writes to pinStates
const sim = ctx.window.ArduinoSim;
sim.setBoard('arduino_uno');

const code = `int motorPin = 9;
int potPin = A0;

void setup() {
  pinMode(motorPin, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int pot = analogRead(potPin);
  int speed = map(pot, 0, 1023, 0, 255);
  analogWrite(motorPin, speed);
  Serial.print("Pot: ");
  Serial.print(pot);
  Serial.print("  Speed: ");
  Serial.println(speed);
  delay(50);
}`;

sim.compile(code).then(r => {
  console.log('Compile ok:', r.ok);
  if (!r.ok) console.log('Error:', r.error);
});
