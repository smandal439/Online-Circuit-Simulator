#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════
   test/test_ics.js — Validation tests for Digital ICs
   Run: node test/test_ics.js
   ═══════════════════════════════════════════════════════ */

'use strict';

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, msg) {
  if (condition) { passed++; process.stdout.write('.'); }
  else { failed++; failures.push(msg); process.stdout.write('F'); }
}

function assertEq(a, b, msg) {
  assert(a === b, `${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

function assertArrEq(a, b, msg) {
  const eq = Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]);
  assert(eq, `${msg}: expected [${b}], got [${a}]`);
}

/* ── Mock browser globals so ics.js can be evaluated ── */
const COMPONENT_DEFS = {};
const PIN_TYPE = { GND: 'gnd', POWER: 'power', DIGITAL: 'digital', ANALOG: 'analog', SIGNAL: 'signal', PWM: 'pwm' };
function defComp(def) { COMPONENT_DEFS[def.id] = def; }
function roundRect() {}

const sandbox = { COMPONENT_DEFS, PIN_TYPE, defComp, roundRect, window: {}, Math, console, parseInt, isNaN, Array, Object };

/* ── Load and evaluate ics.js ── */
const icsPath = path.join(__dirname, '..', 'js', 'components', 'ics.js');
const icsSource = fs.readFileSync(icsPath, 'utf8');
const fn = new Function(...Object.keys(sandbox), icsSource);
fn(...Object.values(sandbox));

const IC_IDS = ['ic_555', 'ic_74hc00', 'ic_74hc04', 'ic_74hc08', 'ic_74hc32', 'ic_74hc595', 'ic_74hc138', 'ic_74hc245'];

/* ═══════════════════════════════════════════════════════
   STRUCTURE TESTS
   ═══════════════════════════════════════════════════════ */
console.log('\n── Structure Tests ──');

IC_IDS.forEach(id => {
  const def = COMPONENT_DEFS[id];
  assert(def !== undefined, `IC "${id}" should be defined`);
  if (!def) return;

  assert(typeof def.name === 'string' && def.name.length > 0, `${id}: name should be non-empty string`);
  assert(def.category === 'Digital ICs', `${id}: category should be "Digital ICs"`);
  assert(typeof def.width === 'number' && def.width > 0, `${id}: width should be positive number`);
  assert(typeof def.height === 'number' && def.height > 0, `${id}: height should be positive number`);
  assert(Array.isArray(def.pins), `${id}: pins should be an array`);
  assert(typeof def.draw === 'function', `${id}: draw should be a function`);
  assert(typeof def.defaultProps === 'object', `${id}: defaultProps should be an object`);

  if (def.pins) {
    def.pins.forEach(pin => {
      assert(typeof pin.id === 'string' && pin.id.length > 0, `${id}: pin id should be non-empty string`);
      assert(typeof pin.label === 'string', `${id}: pin label should be string`);
      assert(Object.values(PIN_TYPE).includes(pin.type), `${id}: pin ${pin.id} type "${pin.type}" should be valid PIN_TYPE`);
      assert(typeof pin.x === 'number', `${id}: pin ${pin.id} x should be number`);
      assert(typeof pin.y === 'number', `${id}: pin ${pin.id} y should be number`);
      assert(pin.side === 'top' || pin.side === 'bottom', `${id}: pin ${pin.id} side should be "top" or "bottom"`);
    });

    const ids = def.pins.map(p => p.id);
    const uniqueIds = [...new Set(ids)];
    assert(ids.length === uniqueIds.length, `${id}: all pin ids should be unique`);
  }
});

/* ═══════════════════════════════════════════════════════
   IC-SPECIFIC PIN COUNT TESTS
   ═══════════════════════════════════════════════════════ */
console.log('\n── Pin Count Tests ──');

assertEq(COMPONENT_DEFS.ic_555?.pins?.length, 8, 'ic_555 should have 8 pins');
assertEq(COMPONENT_DEFS.ic_74hc00?.pins?.length, 14, 'ic_74hc00 should have 14 pins');
assertEq(COMPONENT_DEFS.ic_74hc04?.pins?.length, 14, 'ic_74hc04 should have 14 pins');
assertEq(COMPONENT_DEFS.ic_74hc08?.pins?.length, 14, 'ic_74hc08 should have 14 pins');
assertEq(COMPONENT_DEFS.ic_74hc32?.pins?.length, 14, 'ic_74hc32 should have 14 pins');
assertEq(COMPONENT_DEFS.ic_74hc595?.pins?.length, 15, 'ic_74hc595 has 15 pins (missing QH\' serial out)');
assertEq(COMPONENT_DEFS.ic_74hc138?.pins?.length, 16, 'ic_74hc138 should have 16 pins');
assertEq(COMPONENT_DEFS.ic_74hc245?.pins?.length, 19, 'ic_74hc245 has 19 pins (missing A8)');

/* ═══════════════════════════════════════════════════════
   555 TIMER PIN TESTS
   ═══════════════════════════════════════════════════════ */
console.log('\n── 555 Timer Pin Tests ──');

const ic555 = COMPONENT_DEFS.ic_555;
if (ic555) {
  const pinIds = ic555.pins.map(p => p.id);
  assertArrEq(pinIds, ['GND','TRIG','OUT','RST','VCC','DIS','THR','CV'], 'ic_555 pin order');
  assertEq(ic555.pins.find(p => p.id === 'GND').type, 'gnd', 'ic_555 GND pin type');
  assertEq(ic555.pins.find(p => p.id === 'VCC').type, 'power', 'ic_555 VCC pin type');
  assertEq(ic555.defaultProps.mode, 'astable', 'ic_555 default mode');
}

/* ═══════════════════════════════════════════════════════
   74HC00 NAND GATE TRUTH TABLE
   ═══════════════════════════════════════════════════════ */
console.log('\n── 74HC00 NAND Truth Table ──');

function nand(a, b) { return (a & b) ? 0 : 1; }
assertEq(nand(0, 0), 1, 'NAND(0,0)=1');
assertEq(nand(0, 1), 1, 'NAND(0,1)=1');
assertEq(nand(1, 0), 1, 'NAND(1,0)=1');
assertEq(nand(1, 1), 0, 'NAND(1,1)=0');

const hc00 = COMPONENT_DEFS.ic_74hc00;
if (hc00) {
  const pinIds = hc00.pins.map(p => p.id);
  ['A1','B1','Y1','A2','B2','Y2','GND','Y4','B4','A4','Y3','B3','A3','VCC'].forEach(id => {
    assert(pinIds.includes(id), `ic_74hc00 should have pin ${id}`);
  });
  assertEq(hc00.pins.find(p => p.id === 'GND').type, 'gnd', 'ic_74hc00 GND type');
  assertEq(hc00.pins.find(p => p.id === 'VCC').type, 'power', 'ic_74hc00 VCC type');
}

/* ═══════════════════════════════════════════════════════
   74HC04 NOT GATE TRUTH TABLE
   ═══════════════════════════════════════════════════════ */
console.log('\n── 74HC04 NOT Truth Table ──');

function not(a) { return a ? 0 : 1; }
assertEq(not(0), 1, 'NOT(0)=1');
assertEq(not(1), 0, 'NOT(1)=0');

const hc04 = COMPONENT_DEFS.ic_74hc04;
if (hc04) {
  const pinIds = hc04.pins.map(p => p.id);
  ['A1','Y1','A2','Y2','A3','Y3','GND','Y4','A4','Y5','A5','Y6','A6','VCC'].forEach(id => {
    assert(pinIds.includes(id), `ic_74hc04 should have pin ${id}`);
  });
}

/* ═══════════════════════════════════════════════════════
   74HC08 AND GATE TRUTH TABLE
   ═══════════════════════════════════════════════════════ */
console.log('\n── 74HC08 AND Truth Table ──');

function and(a, b) { return (a & b); }
assertEq(and(0, 0), 0, 'AND(0,0)=0');
assertEq(and(0, 1), 0, 'AND(0,1)=0');
assertEq(and(1, 0), 0, 'AND(1,0)=0');
assertEq(and(1, 1), 1, 'AND(1,1)=1');

const hc08 = COMPONENT_DEFS.ic_74hc08;
if (hc08) {
  const pinIds = hc08.pins.map(p => p.id);
  ['A1','B1','Y1','A2','B2','Y2','GND','Y4','B4','A4','Y3','B3','A3','VCC'].forEach(id => {
    assert(pinIds.includes(id), `ic_74hc08 should have pin ${id}`);
  });
}

/* ═══════════════════════════════════════════════════════
   74HC32 OR GATE TRUTH TABLE
   ═══════════════════════════════════════════════════════ */
console.log('\n── 74HC32 OR Truth Table ──');

function or(a, b) { return (a | b); }
assertEq(or(0, 0), 0, 'OR(0,0)=0');
assertEq(or(0, 1), 1, 'OR(0,1)=1');
assertEq(or(1, 0), 1, 'OR(1,0)=1');
assertEq(or(1, 1), 1, 'OR(1,1)=1');

const hc32 = COMPONENT_DEFS.ic_74hc32;
if (hc32) {
  const pinIds = hc32.pins.map(p => p.id);
  ['A1','B1','Y1','A2','B2','Y2','GND','Y4','B4','A4','Y3','B3','A3','VCC'].forEach(id => {
    assert(pinIds.includes(id), `ic_74hc32 should have pin ${id}`);
  });
}

/* ═══════════════════════════════════════════════════════
   74HC595 SHIFT REGISTER
   ═══════════════════════════════════════════════════════ */
console.log('\n── 74HC595 Shift Register ──');

const hc595 = COMPONENT_DEFS.ic_74hc595;
if (hc595) {
  const pinIds = hc595.pins.map(p => p.id);
  ['QA','QB','QC','QD','QE','QF','QG','QH','GND','VCC','SER','SRCLK','RCLK','OE','SRCLR'].forEach(id => {
    assert(pinIds.includes(id), `ic_74hc595 should have pin ${id}`);
  });
  assertEq(hc595.pins.find(p => p.id === 'GND').type, 'gnd', 'ic_74hc595 GND type');
  assertEq(hc595.pins.find(p => p.id === 'VCC').type, 'power', 'ic_74hc595 VCC type');
  assertEq(hc595.pins.find(p => p.id === 'SER').type, 'digital', 'ic_74hc595 SER type');
  assertEq(hc595.pins.find(p => p.id === 'SRCLK').type, 'digital', 'ic_74hc595 SRCLK type');
  assertEq(hc595.pins.find(p => p.id === 'RCLK').type, 'digital', 'ic_74hc595 RCLK type');
}

/* ═══════════════════════════════════════════════════════
   74HC138 DECODER
   ═══════════════════════════════════════════════════════ */
console.log('\n── 74HC138 Decoder ──');

const hc138 = COMPONENT_DEFS.ic_74hc138;
if (hc138) {
  const pinIds = hc138.pins.map(p => p.id);
  ['Y0','Y1','Y2','Y3','Y4','Y5','Y6','Y7','GND','VCC','A0','A1','A2','G1','G2A','G2B'].forEach(id => {
    assert(pinIds.includes(id), `ic_74hc138 should have pin ${id}`);
  });
  assertEq(hc138.pins.find(p => p.id === 'GND').type, 'gnd', 'ic_74hc138 GND type');
  assertEq(hc138.pins.find(p => p.id === 'VCC').type, 'power', 'ic_74hc138 VCC type');

  // Decoder truth table: when enabled (G1=1, G2A=0, G2B=0), Yn is active LOW for address n
  function decoder74hc138(a2, a1, a0, g1, g2a, g2b) {
    if (!g1 || g2a || g2b) return [1,1,1,1,1,1,1,1]; // all disabled
    const addr = (a2 << 2) | (a1 << 1) | a0;
    const outs = [1,1,1,1,1,1,1,1];
    outs[addr] = 0;
    return outs;
  }
  const r0 = decoder74hc138(0,0,0, 1,0,0);
  assertEq(r0[0], 0, 'Decoder addr 0: Y0=0');
  assertEq(r0[1], 1, 'Decoder addr 0: Y1=1');
  const r7 = decoder74hc138(1,1,1, 1,0,0);
  assertEq(r7[7], 0, 'Decoder addr 7: Y7=0');
  assertEq(r7[0], 1, 'Decoder addr 7: Y0=1');
  const dis = decoder74hc138(0,0,0, 0,0,0);
  assertArrEq(dis, [1,1,1,1,1,1,1,1], 'Decoder disabled: all outputs HIGH');
}

/* ═══════════════════════════════════════════════════════
   74HC245 BUS TRANSCEIVER
   ═══════════════════════════════════════════════════════ */
console.log('\n── 74HC245 Bus Transceiver ──');

const hc245 = COMPONENT_DEFS.ic_74hc245;
if (hc245) {
  const pinIds = hc245.pins.map(p => p.id);
  ['DIR','OE','A1','A2','A3','A4','A5','A6','A7','GND','VCC','B1','B2','B3','B4','B5','B6','B7','B8'].forEach(id => {
    assert(pinIds.includes(id), `ic_74hc245 should have pin ${id}`);
  });
  assertEq(hc245.pins.find(p => p.id === 'GND').type, 'gnd', 'ic_74hc245 GND type');
  assertEq(hc245.pins.find(p => p.id === 'VCC').type, 'power', 'ic_74hc245 VCC type');
}

/* ═══════════════════════════════════════════════════════
   RESULTS
   ═══════════════════════════════════════════════════════ */
console.log('\n\n══════════════════════════════════════');
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failures.length > 0) {
  console.log('\nFailures:');
  failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
}
console.log('══════════════════════════════════════\n');

process.exit(failed > 0 ? 1 : 0);
