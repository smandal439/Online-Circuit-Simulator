/* ═══════════════════════════════════════════════════════
   components/base.js — Shared utilities for all components
   Load this file FIRST before any component files.
   ═══════════════════════════════════════════════════════ */

'use strict';

const GRID = 1;

/* ── Pin types ── */
const PIN_TYPE = {
  DIGITAL:  'digital',
  ANALOG:   'analog',
  POWER:    'power',
  GND:      'gnd',
  PWM:      'pwm',
  SIGNAL:   'signal',
};

/* ── Color map for components ── */
const C = {
  BOARD:   '#1a5c1a',
  BOARD_D: '#12401a',
  PCB:     '#1d6b2e',
  PIN_HDR: '#c8a84b',
  CHIP:    '#2a2a2a',
  CHIP_TXT:'#cccccc',
  WHITE:   '#f0f0f0',
  GRAY:    '#888',
  LGRAY:   '#aaa',
  DGRAY:   '#444',
  RED_LED: '#ff3333',
  GRN_LED: '#33ff66',
  BLU_LED: '#3399ff',
  YLW_LED: '#ffee33',
  ORG_LED: '#ff8833',
  WHT_LED: '#ffffff',
  WIRE_H:  '#ff5555',
  WIRE_L:  '#4488cc',
};

/* ══════════════════════════════════════════════════════
   COMPONENT DEFINITIONS REGISTRY
   ══════════════════════════════════════════════════════ */

const COMPONENT_DEFS = {};

function defComp(def) {
  COMPONENT_DEFS[def.id] = def;
}

/* ═══════════════ HELPER DRAWING FUNCTIONS ═══════════════ */

function drawHeaderStrip(ctx, hx, hy, hw, holes, pinY) {
  ctx.fillStyle = '#141416';
  roundRect(ctx, hx, hy, hw, 12, 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#c8b06a';
  for (const cx of holes) {
    ctx.beginPath();
    ctx.arc(cx, pinY, 4.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#0b0b0d';
  for (const cx of holes) {
    ctx.beginPath();
    ctx.arc(cx, pinY, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawSelectionRect(ctx, x, y, w, h) {
  ctx.save();
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.shadowColor = '#00e5ff';
  ctx.shadowBlur = 6;
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawLED_on_board(ctx, cx, cy, color, r) {
  const isLit = color !== '#555' && color !== '#333' && color !== '#444';
  if (isLit) {
    const pulse = 1 + Math.sin(Date.now() / 250) * 0.08;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, (r * 3.5) * pulse);
    glow.addColorStop(0, color);
    glow.addColorStop(0.35, color);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, (r * 3.5) * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.shadowColor = color;
    ctx.shadowBlur = 12 * pulse;
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  if (isLit) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(cx - r * 0.25, cy - r * 0.25, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

function hexToRgba(hex, alpha) {
  if (!hex || !hex.startsWith('#')) return `rgba(255,50,50,${alpha})`;
  let h = hex.slice(1);
  if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  const r = parseInt(h.slice(0,2),16) || 0;
  const g = parseInt(h.slice(2,4),16) || 0;
  const b = parseInt(h.slice(4,6),16) || 0;
  return `rgba(${r},${g},${b},${alpha})`;
}

function getInstPinState(inst, pinId, sim) {
  if (inst && inst.runtimeState && inst.runtimeState.val !== undefined) {
    return inst.runtimeState.val;
  }
  if (inst && inst.runtimeState && inst.runtimeState.lit !== undefined) {
    return inst.runtimeState.lit ? 1 : 0;
  }
  if (!sim || !sim.pinStates) return 0;
  if (window.CircuitCanvas && typeof window.CircuitCanvas._getConnectedPinNum === 'function') {
    const pinNum = window.CircuitCanvas._getConnectedPinNum(inst.id, pinId);
    if (pinNum !== null) return sim.pinStates[`pin_${pinNum}`] || 0;
  }
  return sim.pinStates[`${inst.id}_${pinId}`] || 0;
}

function getInstPinPWM(inst, pinId, sim) {
  if (inst && inst.runtimeState && inst.runtimeState[pinId] !== undefined) {
    return inst.runtimeState[pinId];
  }
  if (!sim || !sim.pinStates) return 0;
  if (window.CircuitCanvas && typeof window.CircuitCanvas._getConnectedPinNum === 'function') {
    const pinNum = window.CircuitCanvas._getConnectedPinNum(inst.id, pinId);
    if (pinNum !== null) return sim.pinStates[`pin_${pinNum}`] || 0;
  }
  return sim.pinStates[`${inst.id}_${pinId}`] || 0;
}

/* Resistor color bands */
function resistorBands(val) {
  const COLORS = ['#000','#884400','#ff0000','#ff8800','#ffff00','#00aa00','#0000ff','#aa00aa','#888888','#ffffff'];
  const digits = String(Math.round(val)).replace(/0+$/, '');
  const significant = digits.padStart(2, '0');
  const multiplier = Math.floor(Math.log10(val)) - 1;
  return [
    COLORS[parseInt(significant[0])] || '#000',
    COLORS[parseInt(significant[1])] || '#000',
    COLORS[Math.max(0, multiplier)] || '#000',
  ];
}

function formatResistance(val, unit) {
  if (unit) return val + unit;
  if (val >= 1000000) return (val/1000000).toFixed(1) + 'MΩ';
  if (val >= 1000) return (val/1000).toFixed(1) + 'kΩ';
  return val + 'Ω';
}

/* Get all world-space pin positions for a component instance */
function getComponentPins(inst) {
  const def = COMPONENT_DEFS[inst.type];
  if (!def) return [];
  return def.pins.map(pin => ({
    ...pin,
    worldX: inst.x + pin.x,
    worldY: inst.y + pin.y,
    instId: inst.id,
  }));
}

/* ═══════════════ COMPONENT CATALOG (for UI display) ═══════════════ */
const COMPONENT_CATALOG = [
  { category: 'Boards',    ids: ['arduino_uno', 'esp32_devkit_v1'] },
  { category: 'Output',    ids: ['multi_led_array', 'rgb_led', 'buzzer', 'seg7', 'lcd1602', 'lcd1602_i2c', 'oled_ssd1306', 'neopixel', 'neopixel_strip', 'neopixel_ring', 'bulb_12v', 'max7219', 'ili9341'],
    dropdown: { id: 'led', label: 'LED', icon: '💡', desc: 'Light Emitting Diode',
      variants: [
        { id: 'led',         name: 'Red LED',    color: '#ff3333', icon: '🔴' },
        { id: 'led_green',   name: 'Green LED',  color: '#33ff33', icon: '🟢' },
        { id: 'led_blue',    name: 'Blue LED',   color: '#3366ff', icon: '🔵' },
        { id: 'led_yellow',  name: 'Yellow LED', color: '#ffff33', icon: '🟡' },
        { id: 'led_orange',  name: 'Orange LED', color: '#ff9933', icon: '🟠' },
        { id: 'led_white',   name: 'White LED',  color: '#ffffff', icon: '⚪' },
      ]
    }
  },
  { category: 'Input',     ids: ['push_button', 'potentiometer', 'joystick', 'keypad_4x4', 'rotary_encoder', 'dip_switch'] },
  { category: 'Actuators', ids: ['servo', 'dc_motor', 'relay', 'stepper_28byj', 'l298n', 'servo_continuous'] },
  { category: 'Sensors',   ids: ['dht11', 'hcsr04', 'ldr', 'pir', 'mpu6050', 'ir_obstacle', 'flex_sensor', 'thermistor', 'lm35_sensor', 'bme280', 'vl53l0x', 'rc522', 'ir_receiver', 'hc05'] },
  { category: 'Passive',   ids: ['resistor', 'capacitor', 'breadboard', 'diode_1n4007'] },
  { category: 'Power',     ids: ['power_5v', 'power_gnd', 'mb102_power', 'bench_power_supply'] },
  { category: 'Digital ICs', ids: [],
    dropdown: { id: 'digital_ic', label: 'Digital ICs', icon: '⮗', desc: 'Logic Gates & Timers',
      variants: [
        { id: 'ic_555',   name: '555 Timer',      icon: '⏱️' },
        { id: 'ic_74hc00', name: '74HC00 NAND',    icon: '⮗' },
        { id: 'ic_74hc04', name: '74HC04 NOT',     icon: '⮗' },
        { id: 'ic_74hc08', name: '74HC08 AND',     icon: '⮗' },
        { id: 'ic_74hc32', name: '74HC32 OR',      icon: '⮗' },
        { id: 'ic_74hc74', name: '74HC74 Dual DFF', icon: '⮗' },
        { id: 'ic_74hc47', name: '74HC47 BCD→7Seg', icon: '⮗' },
        { id: 'ic_74hc148', name: '74HC148 Encoder', icon: '⮗' },
        { id: 'ic_74hc595', name: '74HC595 Shift Reg', icon: '⮗' },
        { id: 'ic_74hc138', name: '74HC138 Decoder',   icon: '⮗' },
        { id: 'ic_74hc165', name: '74HC165 PISO',      icon: '⮗' },
        { id: 'ic_74hc193', name: '74HC193 Counter',   icon: '⮗' },
        { id: 'ic_74hc245', name: '74HC245 Buffer',    icon: '⮗' },
        { id: 'lm741',    name: 'LM741 Op-Amp',    icon: '📐' },
      ]
    }
  },
  { category: 'Instruments', ids: ['multimeter', 'func_gen', 'dso_4ch', 'osc_probe_ch1', 'osc_probe_ch2', 'dso_probe_ch1', 'dso_probe_ch2', 'dso_probe_ch3', 'dso_probe_ch4', 'la_probe_ch1', 'la_probe_ch2', 'la_probe_ch3', 'la_probe_ch4', 'la_probe_ch5', 'la_probe_ch6', 'la_probe_ch7', 'la_probe_ch8'] },
];

/* Export */
window.ArduinoComponents = {
  COMPONENT_DEFS,
  COMPONENT_CATALOG,
  GRID,
  PIN_TYPE,
  roundRect,
  drawSelectionRect,
  getComponentPins,
  hexToRgba,
  resistorBands,
  formatResistance,
};
