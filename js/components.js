/* ═══════════════════════════════════════════════════════
   components.js — All Arduino simulator component definitions
   ═══════════════════════════════════════════════════════ */

'use strict';

const GRID = 20;

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
   COMPONENT DEFINITIONS
   Each definition has:
     id, name, category, icon, desc
     width, height
     pins: [{ id, label, type, x, y, side }]
     defaultProps: {}
     draw(ctx, inst, simState)
══════════════════════════════════════════════════════ */

const COMPONENT_DEFS = {};

function defComp(def) {
  COMPONENT_DEFS[def.id] = def;
}

/* ─── ARDUINO UNO ─── */
defComp({
  id: 'arduino_uno',
  name: 'Arduino Uno',
  category: 'Boards',
  icon: '🎛️',
  desc: 'ATmega328P microcontroller board',
  width: 200,
  height: 140,
  defaultProps: { label: 'UNO' },
  pins: [
    // Digital pins top row (D0–D13, from right)
    { id:'D0',  label:'D0',  type:PIN_TYPE.DIGITAL, x:186, y: 14, side:'top' },
    { id:'D1',  label:'D1',  type:PIN_TYPE.DIGITAL, x:172, y: 14, side:'top' },
    { id:'D2',  label:'D2',  type:PIN_TYPE.DIGITAL, x:158, y: 14, side:'top' },
    { id:'D3',  label:'D3~', type:PIN_TYPE.PWM,     x:144, y: 14, side:'top' },
    { id:'D4',  label:'D4',  type:PIN_TYPE.DIGITAL, x:130, y: 14, side:'top' },
    { id:'D5',  label:'D5~', type:PIN_TYPE.PWM,     x:116, y: 14, side:'top' },
    { id:'D6',  label:'D6~', type:PIN_TYPE.PWM,     x:102, y: 14, side:'top' },
    { id:'D7',  label:'D7',  type:PIN_TYPE.DIGITAL, x: 88, y: 14, side:'top' },
    { id:'D8',  label:'D8',  type:PIN_TYPE.DIGITAL, x: 74, y: 14, side:'top' },
    { id:'D9',  label:'D9~', type:PIN_TYPE.PWM,     x: 60, y: 14, side:'top' },
    { id:'D10', label:'D10~',type:PIN_TYPE.PWM,     x: 46, y: 14, side:'top' },
    { id:'D11', label:'D11~',type:PIN_TYPE.PWM,     x: 32, y: 14, side:'top' },
    { id:'D12', label:'D12', type:PIN_TYPE.DIGITAL, x: 18, y: 14, side:'top' },
    { id:'D13', label:'D13', type:PIN_TYPE.DIGITAL, x:  4, y: 14, side:'top' },
    // Power top
    { id:'GND_D',label:'GND',type:PIN_TYPE.GND,    x:200, y: 14, side:'top' },
    { id:'AREF', label:'AREF',type:PIN_TYPE.SIGNAL, x:214, y: 14, side:'top' },
    // Analog pins bottom row
    { id:'A0', label:'A0', type:PIN_TYPE.ANALOG, x: 14, y:126, side:'bottom' },
    { id:'A1', label:'A1', type:PIN_TYPE.ANALOG, x: 28, y:126, side:'bottom' },
    { id:'A2', label:'A2', type:PIN_TYPE.ANALOG, x: 42, y:126, side:'bottom' },
    { id:'A3', label:'A3', type:PIN_TYPE.ANALOG, x: 56, y:126, side:'bottom' },
    { id:'A4', label:'A4', type:PIN_TYPE.ANALOG, x: 70, y:126, side:'bottom' },
    { id:'A5', label:'A5', type:PIN_TYPE.ANALOG, x: 84, y:126, side:'bottom' },
    // Power bottom
    { id:'VIN',  label:'VIN', type:PIN_TYPE.POWER, x:104, y:126, side:'bottom' },
    { id:'GND1', label:'GND', type:PIN_TYPE.GND,   x:118, y:126, side:'bottom' },
    { id:'GND2', label:'GND', type:PIN_TYPE.GND,   x:132, y:126, side:'bottom' },
    { id:'5V',   label:'5V',  type:PIN_TYPE.POWER, x:146, y:126, side:'bottom' },
    { id:'3V3',  label:'3.3V',type:PIN_TYPE.POWER, x:160, y:126, side:'bottom' },
    { id:'RST',  label:'RST', type:PIN_TYPE.SIGNAL,x:174, y:126, side:'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y, width: W, height: H } = inst;

    // Board body
    ctx.save();
    ctx.translate(x, y);

    // PCB background
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#1e6d33');
    grad.addColorStop(1, '#12461f');
    ctx.fillStyle = grad;
    roundRect(ctx, 0, 0, W, H, 10);
    ctx.fill();
    ctx.strokeStyle = '#194c24';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Silkscreen outline
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 1;
    roundRect(ctx, 6, 6, W - 12, H - 12, 8);
    ctx.stroke();

    // USB Type-B connector
    ctx.fillStyle = '#a0a0a0';
    roundRect(ctx, -14, 48, 18, 28, 4);
    ctx.fill();
    ctx.fillStyle = '#444';
    roundRect(ctx, -11, 52, 12, 20, 3);
    ctx.fill();
    ctx.fillStyle = '#ddd';
    ctx.fillRect(-8, 59, 8, 6);

    // Barrel jack
    ctx.fillStyle = '#222';
    roundRect(ctx, -12, 88, 16, 20, 4);
    ctx.fill();
    ctx.fillStyle = '#666';
    ctx.beginPath(); ctx.arc(-4, 99, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(-4, 99, 2.5, 0, Math.PI * 2); ctx.fill();

    // Crystal oscillator
    ctx.fillStyle = '#999';
    roundRect(ctx, 78, 52, 18, 8, 3);
    ctx.fill();
    ctx.fillStyle = '#eee';
    ctx.font = '5px sans-serif';
    ctx.fillText('16MHz', 87, 58);

    // Voltage regulator
    ctx.fillStyle = '#2e2e2e';
    roundRect(ctx, 46, 48, 14, 18, 3);
    ctx.fill();

    // ATmega chip
    ctx.fillStyle = '#111';
    roundRect(ctx, 60, 68, 80, 50, 5);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Chip pins
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath(); ctx.moveTo(64 + i * 9, 68); ctx.lineTo(64 + i * 9, 62); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(64 + i * 9, 118); ctx.lineTo(64 + i * 9, 124); ctx.stroke();
    }
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(60, 76 + i * 11); ctx.lineTo(54, 76 + i * 11); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(140, 76 + i * 11); ctx.lineTo(146, 76 + i * 11); ctx.stroke();
    }

    // Chip text
    ctx.fillStyle = '#ddd';
    ctx.font = 'bold 7px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ATmega328P', 100, 92);
    ctx.font = '6px JetBrains Mono, monospace';
    ctx.fillText('MCU', 100, 103);

    // Reset button
    ctx.fillStyle = '#c43c3c';
    ctx.beginPath(); ctx.arc(30, 56, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff7373';
    ctx.beginPath(); ctx.arc(30, 56, 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '5px sans-serif';
    ctx.fillText('RST', 30, 70);

    // LEDs
    drawLED_on_board(ctx, 150, 32, sim && sim.pinStates && (sim.pinStates['pin_13'] || 0) > 0 ? '#ffff66' : '#555', 4);
    drawLED_on_board(ctx, 166, 32, '#5cff6d', 4);
    drawLED_on_board(ctx, 182, 32, '#ff4d4d', 3);
    drawLED_on_board(ctx, 198, 32, '#ff4d4d', 3);

    // LED labels
    ctx.fillStyle = '#bfbfbf';
    ctx.font = '5px sans-serif';
    ctx.fillText('L', 150, 42);
    ctx.fillText('ON', 166, 42);
    ctx.fillText('TX', 182, 42);
    ctx.fillText('RX', 198, 42);

    // Digital pin headers (top)
    const pinX = 186;
    for (let i = 0; i < 14; i++) {
      const px = pinX - i * 12;
      ctx.fillStyle = '#c8a84b';
      roundRect(ctx, px - 5, 18, 10, 10, 2);
      ctx.fill();
      ctx.fillStyle = '#333';
      ctx.font = '5px sans-serif';
      ctx.fillText(`D${13 - i}`, px, 13);
    }

    // Analog pin headers (bottom left)
    for (let i = 0; i < 6; i++) {
      const px = 14 + i * 16;
      ctx.fillStyle = '#c8a84b';
      roundRect(ctx, px - 5, 114, 10, 10, 2);
      ctx.fill();
      ctx.fillStyle = '#333';
      ctx.fillText(`A${i}`, px, 122);
    }

    // Power headers bottom right
    const pwrLabels = ['VIN', 'GND', 'GND', '5V', '3V3', 'RST'];
    for (let i = 0; i < pwrLabels.length; i++) {
      const px = 104 + i * 16;
      ctx.fillStyle = ['GND','GND'].includes(pwrLabels[i]) ? '#3d3d3d' : pwrLabels[i] === 'RST' ? '#8b8b8b' : '#c8a84b';
      roundRect(ctx, px - 5, 114, 10, 10, 2);
      ctx.fill();
      ctx.fillStyle = '#333';
      ctx.fillText(pwrLabels[i], px, 122);
    }

    // Board name
    ctx.fillStyle = '#f6f6f6';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('UNO', 100, 36);

    // Selection outline
    if (inst.selected) {
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      roundRect(ctx, -3, -3, W+6, H+6, 10);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }
});

/* ─── LED ─── */
defComp({
  id: 'led',
  name: 'LED',
  category: 'Output',
  icon: '💡',
  desc: 'Light Emitting Diode',
  width: 30,
  height: 60,
  defaultProps: { color: '#ff3333', colorName: 'Red' },
  pins: [
    { id: 'anode',   label: '+', type: PIN_TYPE.DIGITAL, x: 15, y:  0, side: 'top' },
    { id: 'cathode', label: '−', type: PIN_TYPE.GND,     x: 15, y: 60, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const col = inst.props.color || '#ff3333';
    const brightness = (inst.runtimeState && inst.runtimeState.brightness !== undefined)
      ? inst.runtimeState.brightness
      : (getInstPinState(inst, 'anode', sim) > 1 ? getInstPinState(inst, 'anode', sim) / 255 : (getInstPinState(inst, 'anode', sim) > 0.05 ? 1 : 0));
    const isOn = (inst.runtimeState && inst.runtimeState.lit !== undefined)
      ? (inst.runtimeState.lit && brightness > 0.01)
      : (brightness > 0.02);
    const time = Date.now() / 250;
    const pulse = isOn ? 1 + Math.sin(time) * 0.08 : 1;

    ctx.save();
    ctx.translate(x, y);

    // Lead lines
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(15, 0);  ctx.lineTo(15, 18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(15, 42); ctx.lineTo(15, 60); ctx.stroke();

    // Flat side (cathode indicator)
    ctx.strokeStyle = isOn ? col : '#555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(8, 42); ctx.lineTo(22, 42);
    ctx.stroke();

    // 1. Ambient Volumetric Glow Halo (Breathing illumination)
    if (isOn) {
      const glowR = (32 + brightness * 20) * pulse;
      const halo = ctx.createRadialGradient(15, 30, 0, 15, 30, glowR);
      halo.addColorStop(0, hexToRgba(col, 0.55 * brightness));
      halo.addColorStop(0.3, hexToRgba(col, 0.28 * brightness));
      halo.addColorStop(0.7, hexToRgba(col, 0.08 * brightness));
      halo.addColorStop(1, hexToRgba(col, 0));
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(15, 30, glowR, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Inner glow aura with shadow
    if (isOn) {
      ctx.shadowColor = col;
      ctx.shadowBlur = (18 + brightness * 14) * pulse;
    }

    // 3. LED Bulb body
    ctx.fillStyle = isOn ? hexToRgba(col, 0.75 + 0.25 * brightness) : hexToRgba(col, 0.3);
    ctx.beginPath();
    ctx.arc(15, 30, 13, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = isOn ? '#ffffff' : hexToRgba(col, 0.5);
    ctx.lineWidth = isOn ? 1.5 : 1;
    ctx.stroke();

    // 4. Glowing Internal Core & Die
    if (isOn) {
      const coreGrad = ctx.createRadialGradient(15, 29, 0, 15, 29, 9);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.45, hexToRgba(col, 0.95));
      coreGrad.addColorStop(1, hexToRgba(col, 0.3));
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(15, 29, 8, 0, Math.PI * 2);
      ctx.fill();

      // Incandescent die center
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(13, 27, 4, 4);
    } else {
      ctx.fillStyle = 'rgba(100, 100, 100, 0.4)';
      ctx.fillRect(13, 27, 4, 4);
    }

    ctx.shadowBlur = 0;

    // 5. Specular 3D Glass Dome Highlight
    const glare = ctx.createRadialGradient(11, 23, 0, 15, 28, 12);
    glare.addColorStop(0, isOn ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)');
    glare.addColorStop(0.5, isOn ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)');
    glare.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glare;
    ctx.beginPath();
    ctx.arc(15, 30, 13, 0, Math.PI * 2);
    ctx.fill();

    // Top rim highlight arc
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(15, 30, 11, -Math.PI * 0.75, -Math.PI * 0.25);
    ctx.stroke();

    // Polarity marks
    ctx.fillStyle = '#aaa';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('+', 7, 18);
    ctx.fillText('−', 24, 46);

    if (inst.selected) drawSelectionRect(ctx, -3, -3, 36, 66);
    ctx.restore();
  }
});

/* ─── RESISTOR ─── */
defComp({
  id: 'resistor',
  name: 'Resistor',
  category: 'Passive',
  icon: '⬛',
  desc: 'Fixed value resistor',
  width: 20,
  height: 60,
  defaultProps: { value: 220, unit: 'Ω' },
  pins: [
    { id: 'p1', label: '1', type: PIN_TYPE.SIGNAL, x: 10, y:  0, side: 'top' },
    { id: 'p2', label: '2', type: PIN_TYPE.SIGNAL, x: 10, y: 60, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const val = inst.props.value || 220;
    const bands = resistorBands(val);

    ctx.save();
    ctx.translate(x, y);

    // Lead wires
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(10, 0);  ctx.lineTo(10, 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, 44); ctx.lineTo(10, 60); ctx.stroke();

    // Body
    ctx.fillStyle = '#d4c4a0';
    roundRect(ctx, 2, 16, 16, 28, 3);
    ctx.fill();
    ctx.strokeStyle = '#b0a080';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Color bands
    const bandX = [5, 9, 13, 17];
    const bandColors = [...bands, '#c0a040'];
    bandColors.forEach((col, i) => {
      if (i >= 4) return;
      ctx.fillStyle = col;
      ctx.fillRect(bandX[i], 16, 3, 28);
    });

    // Tolerance band (last)
    ctx.fillStyle = '#c0a040';
    ctx.fillRect(17, 20, 3, 20);

    // Value label
    ctx.fillStyle = '#555';
    ctx.font = '7px sans-serif';
    ctx.textAlign = 'center';
    ctx.save();
    ctx.translate(10, 30);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.font = 'bold 6px sans-serif';
    ctx.fillText(formatResistance(val), 0, 2);
    ctx.restore();

    if (inst.selected) drawSelectionRect(ctx, -3, -3, 26, 66);
    ctx.restore();
  }
});

/* ─── PUSH BUTTON ─── */
defComp({
  id: 'push_button',
  name: 'Push Button',
  category: 'Input',
  icon: '🔘',
  desc: 'Momentary tactile push button',
  width: 40,
  height: 40,
  defaultProps: { pressed: false, label: 'BTN' },
  pins: [
    { id: 'p1', label: '1', type: PIN_TYPE.DIGITAL, x:  8, y:  0, side: 'top' },
    { id: 'p2', label: '2', type: PIN_TYPE.DIGITAL, x: 32, y:  0, side: 'top' },
    { id: 'p3', label: '3', type: PIN_TYPE.DIGITAL, x:  8, y: 40, side: 'bottom' },
    { id: 'p4', label: '4', type: PIN_TYPE.DIGITAL, x: 32, y: 40, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const pressed = inst.runtimeState && inst.runtimeState.pressed;

    ctx.save();
    ctx.translate(x, y);

    // Pins
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    [[8,0],[32,0],[8,40],[32,40]].forEach(([px,py]) => {
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px, py < 20 ? 12 : 28);
      ctx.stroke();
    });

    // Body
    ctx.fillStyle = '#2a2a2a';
    roundRect(ctx, 4, 8, 32, 24, 4);
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Button cap
    ctx.fillStyle = pressed ? '#2266aa' : '#3388cc';
    if (pressed) {
      ctx.shadowColor = '#3399ff';
      ctx.shadowBlur = 6;
    }
    ctx.beginPath();
    ctx.arc(20, 20, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = pressed ? '#66aaee' : '#88ccff';
    ctx.beginPath();
    ctx.arc(18, 18, 3, 0, Math.PI * 2);
    ctx.fill();

    // Internal connections lines
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(8, 12); ctx.lineTo(8, 28); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(32, 12); ctx.lineTo(32, 28); ctx.stroke();

    if (pressed) {
      // Connected when pressed
      ctx.strokeStyle = '#3399ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(8, 20); ctx.lineTo(12, 20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(28, 20); ctx.lineTo(32, 20); ctx.stroke();
    }

    if (inst.selected) drawSelectionRect(ctx, -3, -3, 46, 46);
    ctx.restore();
  }
});

/* ─── POTENTIOMETER ─── */
defComp({
  id: 'potentiometer',
  name: 'Potentiometer',
  category: 'Input',
  icon: '🎚️',
  desc: 'Variable resistor (10kΩ)',
  width: 50,
  height: 60,
  defaultProps: { value: 512, maxValue: 1023, resistance: 10000 },
  pins: [
    { id: 'vcc',    label: 'VCC', type: PIN_TYPE.POWER,  x:  8, y: 60, side: 'bottom' },
    { id: 'wiper',  label: 'OUT', type: PIN_TYPE.ANALOG, x: 25, y: 60, side: 'bottom' },
    { id: 'gnd',    label: 'GND', type: PIN_TYPE.GND,    x: 42, y: 60, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const val = (inst.runtimeState && inst.runtimeState.value !== undefined) ? inst.runtimeState.value : (inst.props.value || 512);
    const pct = val / (inst.props.maxValue || 1023);
    const angle = -2.2 + pct * 4.4; // from -2.2 to +2.2 rad

    ctx.save();
    ctx.translate(x, y);

    // Leads
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    [[8,60],[25,60],[42,60]].forEach(([px, py]) => {
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px, 46);
      ctx.stroke();
    });

    // Body
    ctx.fillStyle = '#2a2a2a';
    roundRect(ctx, 2, 5, 46, 42, 5);
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Dial ring
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(25, 26, 16, -Math.PI * 0.8 + Math.PI * 0.5, Math.PI * 0.8 + Math.PI * 0.5);
    ctx.stroke();

    // Dial fill (colored arc showing value)
    ctx.strokeStyle = '#00979c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const startA = -Math.PI * 0.8 + Math.PI * 0.5;
    ctx.arc(25, 26, 16, startA, startA + pct * Math.PI * 1.6);
    ctx.stroke();

    // Knob
    ctx.fillStyle = '#444';
    ctx.beginPath();
    ctx.arc(25, 26, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Indicator line
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(25, 26);
    ctx.lineTo(25 + Math.sin(angle) * 8, 26 - Math.cos(angle) * 8);
    ctx.stroke();

    // Value display
    ctx.fillStyle = '#aaa';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(val, 25, 10);

    // Pin labels
    ctx.fillStyle = '#888';
    ctx.font = '6px sans-serif';
    ctx.fillText('V', 8, 56);
    ctx.fillText('W', 25, 56);
    ctx.fillText('G', 42, 56);

    if (inst.selected) drawSelectionRect(ctx, -3, 2, 56, 65);
    ctx.restore();
  }
});

/* ─── BUZZER ─── */
defComp({
  id: 'buzzer',
  name: 'Buzzer',
  category: 'Output',
  icon: '🔔',
  desc: 'Active piezoelectric buzzer',
  width: 40,
  height: 50,
  defaultProps: { frequency: 1000 },
  pins: [
    { id: 'vcc', label: '+', type: PIN_TYPE.DIGITAL, x: 12, y: 50, side: 'bottom' },
    { id: 'gnd', label: '−', type: PIN_TYPE.GND,     x: 28, y: 50, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const isOn = inst.runtimeState && inst.runtimeState.active;

    ctx.save();
    ctx.translate(x, y);

    // Leads
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(12, 50); ctx.lineTo(12, 44); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(28, 50); ctx.lineTo(28, 44); ctx.stroke();

    // Body ring
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(20, 24, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Inner circle
    ctx.fillStyle = isOn ? '#443311' : '#222';
    ctx.beginPath();
    ctx.arc(20, 24, 14, 0, Math.PI * 2);
    ctx.fill();

    // Piezo element
    ctx.fillStyle = isOn ? '#c8a84b' : '#888';
    ctx.beginPath();
    ctx.arc(20, 24, 8, 0, Math.PI * 2);
    ctx.fill();

    // Sound waves when active
    if (isOn) {
      ctx.strokeStyle = 'rgba(200,168,75,0.5)';
      ctx.lineWidth = 1.5;
      for (let r = 15; r <= 30; r += 7) {
        ctx.beginPath();
        ctx.arc(20, 24, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // + and − marks
    ctx.fillStyle = '#888';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('+', 12, 48);
    ctx.fillText('−', 28, 48);

    if (inst.selected) drawSelectionRect(ctx, -3, -3, 46, 56);
    ctx.restore();
  }
});

/* ─── SERVO MOTOR ─── */
defComp({
  id: 'servo',
  name: 'Servo Motor',
  category: 'Actuators',
  icon: '⚙️',
  desc: 'RC servo motor (0–180°)',
  width: 60,
  height: 50,
  defaultProps: { angle: 90, minAngle: 0, maxAngle: 180 },
  pins: [
    { id: 'signal', label: 'SIG', type: PIN_TYPE.PWM,   x:  8, y: 50, side: 'bottom' },
    { id: 'vcc',    label: '+',   type: PIN_TYPE.POWER,  x: 25, y: 50, side: 'bottom' },
    { id: 'gnd',    label: '−',   type: PIN_TYPE.GND,    x: 42, y: 50, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const angle = inst.runtimeState && inst.runtimeState.angle !== undefined
      ? inst.runtimeState.angle : (inst.props.angle || 90);
    const rad = (angle - 90) * Math.PI / 180;

    ctx.save();
    ctx.translate(x, y);

    // Leads
    ctx.strokeStyle = '#f5c842'; // signal = yellow
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(8, 50); ctx.lineTo(8, 44); ctx.stroke();
    ctx.strokeStyle = '#cc3333';
    ctx.beginPath(); ctx.moveTo(25, 50); ctx.lineTo(25, 44); ctx.stroke();
    ctx.strokeStyle = '#333';
    ctx.beginPath(); ctx.moveTo(42, 50); ctx.lineTo(42, 44); ctx.stroke();

    // Body
    const bodyGrad = ctx.createLinearGradient(0, 5, 60, 45);
    bodyGrad.addColorStop(0, '#3a3a3a');
    bodyGrad.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = bodyGrad;
    roundRect(ctx, 0, 5, 60, 40, 6);
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Gear hub
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.arc(30, 22, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.arc(30, 22, 7, 0, Math.PI * 2);
    ctx.fill();

    // Servo arm
    ctx.save();
    ctx.translate(30, 22);
    ctx.rotate(rad);
    ctx.fillStyle = '#aaa';
    roundRect(ctx, -4, -20, 8, 22, 3);
    ctx.fill();
    ctx.fillStyle = '#ccc';
    ctx.beginPath();
    ctx.arc(0, -18, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Center hub
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(30, 22, 4, 0, Math.PI * 2);
    ctx.fill();

    // Angle display
    ctx.fillStyle = '#aaa';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(angle) + '°', 30, 40);

    if (inst.selected) drawSelectionRect(ctx, -3, 2, 66, 55);
    ctx.restore();
  }
});

/* ─── BREADBOARD ─── */
defComp({
  id: 'breadboard',
  name: 'Breadboard',
  category: 'Passive',
  icon: '🟦',
  desc: 'Solderless prototyping board',
  width: 200,
  height: 120,
  defaultProps: {},
  pins: [], // Dynamic — breadboard holes
  draw(ctx, inst, sim) {
    const { x, y, width: W, height: H } = inst;
    ctx.save();
    ctx.translate(x, y);

    // Body
    ctx.fillStyle = '#1a2a4a';
    roundRect(ctx, 0, 0, W, H, 6);
    ctx.fill();
    ctx.strokeStyle = '#2a3a5a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Power rails
    ctx.fillStyle = 'rgba(255,60,60,0.2)';
    roundRect(ctx, 8, 4, W-16, 10, 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(60,60,255,0.2)';
    roundRect(ctx, 8, H-14, W-16, 10, 2);
    ctx.fill();

    // Center divider
    ctx.fillStyle = '#223';
    ctx.fillRect(8, H/2-3, W-16, 6);

    // Draw holes in rows
    ctx.fillStyle = '#0a0a1a';
    const cols = 10;
    const rows = 4;
    const startX = 14, startY = 20;
    const stepX = (W - 28) / (cols - 1);
    const stepY = (H - 55) / (rows - 1);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const hx = startX + col * stepX;
        const hy = startY + row * stepY;
        if (row >= 2) {
          // Separate upper and lower halves
        }
        ctx.beginPath();
        ctx.arc(hx, hy + (row >= 2 ? 12 : 0), 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Power rail holes
    for (let i = 0; i < 20; i++) {
      const hx = 14 + i * ((W-28)/19);
      ctx.fillStyle = '#0a0a1a';
      ctx.beginPath(); ctx.arc(hx, 9, 2, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(hx, H-9, 2, 0, Math.PI*2); ctx.fill();
    }

    // Rail symbols
    ctx.fillStyle = '#cc4444';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('+', W-4, 13);
    ctx.fillStyle = '#4444cc';
    ctx.fillText('−', W-4, H-5);

    if (inst.selected) drawSelectionRect(ctx, -3, -3, W+6, H+6);
    ctx.restore();
  }
});

/* ─── RGB LED ─── */
defComp({
  id: 'rgb_led',
  name: 'RGB LED',
  category: 'Output',
  icon: '🌈',
  desc: 'Multi-color LED (common cathode)',
  width: 30,
  height: 70,
  defaultProps: {},
  pins: [
    { id: 'red',    label: 'R', type: PIN_TYPE.PWM,  x:  6, y:  0, side: 'top' },
    { id: 'green',  label: 'G', type: PIN_TYPE.PWM,  x: 15, y:  0, side: 'top' },
    { id: 'blue',   label: 'B', type: PIN_TYPE.PWM,  x: 24, y:  0, side: 'top' },
    { id: 'gnd',    label: '−', type: PIN_TYPE.GND,  x: 15, y: 70, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const rVal = (inst.runtimeState && inst.runtimeState.red !== undefined) ? inst.runtimeState.red : getInstPinPWM(inst, 'red', sim);
    const gVal = (inst.runtimeState && inst.runtimeState.green !== undefined) ? inst.runtimeState.green : getInstPinPWM(inst, 'green', sim);
    const bVal = (inst.runtimeState && inst.runtimeState.blue !== undefined) ? inst.runtimeState.blue : getInstPinPWM(inst, 'blue', sim);
    const r = Math.min(255, Math.max(0, Math.round(rVal > 1 ? rVal : (rVal ? 255 : 0))));
    const g = Math.min(255, Math.max(0, Math.round(gVal > 1 ? gVal : (gVal ? 255 : 0))));
    const b = Math.min(255, Math.max(0, Math.round(bVal > 1 ? bVal : (bVal ? 255 : 0))));
    const totalLum = Math.min(1, (r * 0.299 + g * 0.587 + b * 0.114) / 255);
    const isOn = (r + g + b) > 5;
    const col = `rgb(${r},${g},${b})`;
    const time = Date.now() / 250;
    const pulse = isOn ? 1 + Math.sin(time) * 0.07 : 1;

    ctx.save();
    ctx.translate(x, y);

    // Leads (R, G, B, GND)
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#cc4444'; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(6, 22); ctx.stroke();
    ctx.strokeStyle = '#44cc44'; ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(15, 18); ctx.stroke();
    ctx.strokeStyle = '#4444cc'; ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(24, 22); ctx.stroke();
    ctx.strokeStyle = '#888'; ctx.beginPath(); ctx.moveTo(15, 48); ctx.lineTo(15, 70); ctx.stroke();

    // 1. Ambient Volumetric Glow Halo
    if (isOn) {
      const glowR = (36 + totalLum * 22) * pulse;
      const halo = ctx.createRadialGradient(15, 35, 0, 15, 35, glowR);
      halo.addColorStop(0, `rgba(${r},${g},${b},${0.5 * totalLum})`);
      halo.addColorStop(0.35, `rgba(${r},${g},${b},${0.24 * totalLum})`);
      halo.addColorStop(0.7, `rgba(${r},${g},${b},${0.07 * totalLum})`);
      halo.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(15, 35, glowR, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Glow shadow
    if (isOn) {
      ctx.shadowColor = col;
      ctx.shadowBlur = (20 + totalLum * 15) * pulse;
    }

    // 3. Bulb body
    ctx.fillStyle = isOn ? `rgba(${r},${g},${b},0.85)` : '#2a2a2a';
    ctx.beginPath();
    ctx.arc(15, 35, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isOn ? 'rgba(255,255,255,0.75)' : '#555';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 4. White hotspot core
    if (isOn) {
      const core = ctx.createRadialGradient(15, 34, 0, 15, 34, 9);
      core.addColorStop(0, '#ffffff');
      core.addColorStop(0.45, `rgba(${r},${g},${b},0.95)`);
      core.addColorStop(1, `rgba(${r},${g},${b},0.3)`);
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(15, 34, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowBlur = 0;

    // 5. Specular dome glare
    const glare = ctx.createRadialGradient(11, 28, 0, 15, 33, 13);
    glare.addColorStop(0, isOn ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)');
    glare.addColorStop(0.5, isOn ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)');
    glare.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glare;
    ctx.beginPath();
    ctx.arc(15, 35, 14, 0, Math.PI * 2);
    ctx.fill();

    if (inst.selected) drawSelectionRect(ctx, -3, -3, 36, 76);
    ctx.restore();
  }
});

/* ─── 7-SEGMENT DISPLAY ─── */
defComp({
  id: 'seg7',
  name: '7-Segment Display',
  category: 'Output',
  icon: '🔢',
  desc: 'Single digit 7-segment display',
  width: 50,
  height: 80,
  defaultProps: { commonAnode: false },
  pins: [
    { id:'segA', label:'A', type:PIN_TYPE.DIGITAL, x: 8, y: 0, side:'top' },
    { id:'segB', label:'B', type:PIN_TYPE.DIGITAL, x:16, y: 0, side:'top' },
    { id:'segC', label:'C', type:PIN_TYPE.DIGITAL, x:24, y: 0, side:'top' },
    { id:'segD', label:'D', type:PIN_TYPE.DIGITAL, x:32, y: 0, side:'top' },
    { id:'segE', label:'E', type:PIN_TYPE.DIGITAL, x:40, y: 0, side:'top' },
    { id:'segF', label:'F', type:PIN_TYPE.DIGITAL, x:48, y: 0, side:'top' },
    { id:'segG', label:'G', type:PIN_TYPE.DIGITAL, x: 8, y:80, side:'bottom' },
    { id:'dp',   label:'DP',type:PIN_TYPE.DIGITAL, x:16, y:80, side:'bottom' },
    { id:'com',  label:'COM',type:PIN_TYPE.POWER,  x:32, y:80, side:'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const segs = inst.runtimeState && inst.runtimeState.segments ? inst.runtimeState.segments : {};

    ctx.save();
    ctx.translate(x, y);

    // Body
    ctx.fillStyle = '#111';
    roundRect(ctx, 2, 8, 46, 65, 4);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw 7 segments
    const SEG_ON = '#ff2200';
    const SEG_OFF = '#2a0000';
    const sw = 5, sh = 18;
    // Segment positions: a(top), b(top-right), c(bottom-right), d(bottom), e(bottom-left), f(top-left), g(middle)
    const drawHSeg = (sy, active) => {
      ctx.fillStyle = active ? SEG_ON : SEG_OFF;
      ctx.beginPath();
      ctx.moveTo(14, sy); ctx.lineTo(16, sy-3); ctx.lineTo(36, sy-3);
      ctx.lineTo(38, sy); ctx.lineTo(36, sy+3); ctx.lineTo(16, sy+3);
      ctx.closePath(); ctx.fill();
    };
    const drawVSeg = (sx, sy, active) => {
      ctx.fillStyle = active ? SEG_ON : SEG_OFF;
      ctx.beginPath();
      ctx.moveTo(sx, sy); ctx.lineTo(sx+3, sy+2); ctx.lineTo(sx+3, sy+16);
      ctx.lineTo(sx, sy+18); ctx.lineTo(sx-3, sy+16); ctx.lineTo(sx-3, sy+2);
      ctx.closePath(); ctx.fill();
    };
    drawHSeg(16, segs.A); // a - top
    drawVSeg(38, 18, segs.B); // b - top right
    drawVSeg(38, 38, segs.C); // c - bottom right
    drawHSeg(56, segs.D); // d - bottom
    drawVSeg(14, 38, segs.E); // e - bottom left
    drawVSeg(14, 18, segs.F); // f - top left
    drawHSeg(36, segs.G); // g - middle

    // Decimal point
    ctx.fillStyle = segs.DP ? SEG_ON : SEG_OFF;
    ctx.beginPath();
    ctx.arc(44, 59, 3, 0, Math.PI * 2);
    ctx.fill();

    if (inst.selected) drawSelectionRect(ctx, -1, 5, 52, 78);
    ctx.restore();
  }
});

/* ─── DHT11 Temperature Sensor ─── */
defComp({
  id: 'dht11',
  name: 'DHT11 Sensor',
  category: 'Sensors',
  icon: '🌡️',
  desc: 'Temperature & humidity sensor',
  width: 30,
  height: 50,
  defaultProps: { temperature: 25, humidity: 60 },
  pins: [
    { id:'vcc',  label:'VCC', type:PIN_TYPE.POWER,  x: 6, y: 0, side:'top' },
    { id:'data', label:'DAT', type:PIN_TYPE.DIGITAL, x:15, y: 0, side:'top' },
    { id:'nc',   label:'NC',  type:PIN_TYPE.SIGNAL,  x:24, y: 0, side:'top' },
    { id:'gnd',  label:'GND', type:PIN_TYPE.GND,     x:15, y:50, side:'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const temp = inst.props.temperature || 25;
    const hum  = inst.props.humidity || 60;

    ctx.save();
    ctx.translate(x, y);

    // Body
    ctx.fillStyle = '#1a55cc';
    roundRect(ctx, 2, 8, 26, 36, 3);
    ctx.fill();
    ctx.strokeStyle = '#2266ee';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Grille
    ctx.fillStyle = '#0a2a88';
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        roundRect(ctx, 5 + col*5, 12 + row*8, 4, 6, 1);
        ctx.fill();
      }
    }

    // Label
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 6px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DHT11', 15, 48);

    // Leads
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(6, 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(15, 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(24, 8); ctx.stroke();

    if (inst.selected) drawSelectionRect(ctx, -1, 5, 32, 53);
    ctx.restore();
  }
});

/* ─── Ultrasonic Sensor HC-SR04 ─── */
defComp({
  id: 'hcsr04',
  name: 'HC-SR04 Ultrasonic',
  category: 'Sensors',
  icon: '📡',
  desc: 'Ultrasonic distance sensor 2–400cm',
  width: 70,
  height: 40,
  defaultProps: { distance: 20 },
  pins: [
    { id:'vcc',   label:'VCC',   type:PIN_TYPE.POWER,  x:  8, y: 0, side:'top' },
    { id:'trig',  label:'TRIG',  type:PIN_TYPE.DIGITAL, x:24, y: 0, side:'top' },
    { id:'echo',  label:'ECHO',  type:PIN_TYPE.DIGITAL, x:46, y: 0, side:'top' },
    { id:'gnd',   label:'GND',   type:PIN_TYPE.GND,     x:62, y: 0, side:'top' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    ctx.save();
    ctx.translate(x, y);

    // PCB
    ctx.fillStyle = '#1a5c1a';
    roundRect(ctx, 0, 8, 70, 32, 4);
    ctx.fill();
    ctx.strokeStyle = '#2d8c2d';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Transducer circles (eyes)
    [18, 52].forEach(cx => {
      ctx.fillStyle = '#888';
      ctx.beginPath(); ctx.arc(cx, 24, 12, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.arc(cx, 24, 8, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#555';
      ctx.beginPath(); ctx.arc(cx, 24, 5, 0, Math.PI*2); ctx.fill();
    });

    // Text
    ctx.fillStyle = '#c8c8c8';
    ctx.font = 'bold 6px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HC-SR04', 35, 37);

    // Pin leads
    ctx.strokeStyle = '#c8a84b';
    ctx.lineWidth = 1.5;
    [8,24,46,62].forEach(px => {
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, 8); ctx.stroke();
    });

    if (inst.selected) drawSelectionRect(ctx, -3, 5, 76, 40);
    ctx.restore();
  }
});

/* ─── LCD 16x2 ─── */
defComp({
  id: 'lcd1602',
  name: 'LCD 16×2',
  category: 'Output',
  icon: '🖥️',
  desc: '16×2 character LCD display',
  width: 120,
  height: 60,
  defaultProps: { line1: 'Hello, World!  ', line2: 'ArduSim v1.0   ' },
  pins: [
    { id:'gnd',  label:'GND', type:PIN_TYPE.GND,    x:  8, y:60, side:'bottom' },
    { id:'vcc',  label:'VCC', type:PIN_TYPE.POWER,  x: 18, y:60, side:'bottom' },
    { id:'vo',   label:'V0',  type:PIN_TYPE.SIGNAL, x: 28, y:60, side:'bottom' },
    { id:'rs',   label:'RS',  type:PIN_TYPE.DIGITAL,x: 38, y:60, side:'bottom' },
    { id:'rw',   label:'R/W', type:PIN_TYPE.DIGITAL,x: 48, y:60, side:'bottom' },
    { id:'en',   label:'EN',  type:PIN_TYPE.DIGITAL,x: 58, y:60, side:'bottom' },
    { id:'d4',   label:'D4',  type:PIN_TYPE.DIGITAL,x: 78, y:60, side:'bottom' },
    { id:'d5',   label:'D5',  type:PIN_TYPE.DIGITAL,x: 88, y:60, side:'bottom' },
    { id:'d6',   label:'D6',  type:PIN_TYPE.DIGITAL,x: 98, y:60, side:'bottom' },
    { id:'d7',   label:'D7',  type:PIN_TYPE.DIGITAL,x:108, y:60, side:'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const line1 = (inst.runtimeState && inst.runtimeState.line1) || inst.props.line1 || '                ';
    const line2 = (inst.runtimeState && inst.runtimeState.line2) || inst.props.line2 || '                ';
    const powered = inst.runtimeState && inst.runtimeState.powered;

    ctx.save();
    ctx.translate(x, y);

    // Frame
    ctx.fillStyle = '#1a4a1a';
    roundRect(ctx, 0, 0, 120, 52, 4);
    ctx.fill();
    ctx.strokeStyle = '#2d8c2d';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Screen
    ctx.fillStyle = powered ? '#4a7a2a' : '#2a4a1a';
    roundRect(ctx, 6, 5, 108, 42, 3);
    ctx.fill();

    // Text
    const txColor = powered ? '#88ff88' : '#556655';
    ctx.fillStyle = txColor;
    ctx.font = 'bold 8px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(line1.substring(0, 16).padEnd(16), 9, 20);
    ctx.fillText(line2.substring(0, 16).padEnd(16), 9, 38);

    // Pin leads
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    [8,18,28,38,48,58,68,78,88,98,108].forEach(px => {
      ctx.beginPath(); ctx.moveTo(px, 52); ctx.lineTo(px, 60); ctx.stroke();
    });

    if (inst.selected) drawSelectionRect(ctx, -3, -3, 126, 66);
    ctx.restore();
  }
});

/* ─── Power Supply ─── */
defComp({
  id: 'power_5v',
  name: '5V Power',
  category: 'Power',
  icon: '⚡',
  desc: '5V power supply terminal',
  width: 30,
  height: 30,
  defaultProps: {},
  pins: [
    { id: 'vcc', label: '5V', type: PIN_TYPE.POWER, x: 15, y: 30, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#cc3333';
    roundRect(ctx, 2, 2, 26, 22, 4);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('5V', 15, 16);
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(15, 24); ctx.lineTo(15, 30); ctx.stroke();
    if (inst.selected) drawSelectionRect(ctx, -2, -2, 34, 34);
    ctx.restore();
  }
});

defComp({
  id: 'power_gnd',
  name: 'GND',
  category: 'Power',
  icon: '⏚',
  desc: 'Ground terminal',
  width: 30,
  height: 30,
  defaultProps: {},
  pins: [
    { id: 'gnd', label: 'GND', type: PIN_TYPE.GND, x: 15, y: 0, side: 'top' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(15, 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4, 12); ctx.lineTo(26, 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, 17); ctx.lineTo(22, 17); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(12, 22); ctx.lineTo(18, 22); ctx.stroke();
    ctx.fillStyle = '#888';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GND', 15, 30);
    if (inst.selected) drawSelectionRect(ctx, -2, -2, 34, 34);
    ctx.restore();
  }
});

/* ─── Capacitor ─── */
defComp({
  id: 'capacitor',
  name: 'Capacitor',
  category: 'Passive',
  icon: '⚡',
  desc: 'Electrolytic capacitor',
  width: 20,
  height: 60,
  defaultProps: { value: 100, unit: 'µF' },
  pins: [
    { id: 'pos', label: '+', type: PIN_TYPE.SIGNAL, x: 10, y:  0, side: 'top' },
    { id: 'neg', label: '−', type: PIN_TYPE.GND,    x: 10, y: 60, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    ctx.save();
    ctx.translate(x, y);
    // Leads
    ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(10, 0);  ctx.lineTo(10, 22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, 38); ctx.lineTo(10, 60); ctx.stroke();
    // Plates
    ctx.strokeStyle = '#aaa'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(2, 22); ctx.lineTo(18, 22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2, 30); ctx.lineTo(18, 30); ctx.stroke();
    // + mark
    ctx.fillStyle = '#aaa';
    ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('+', 4, 22);
    // Body curve
    ctx.strokeStyle = '#888'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(10, 30, 8, 0, Math.PI);
    ctx.stroke();
    // Value
    ctx.fillStyle = '#888'; ctx.font = '6px sans-serif';
    ctx.save(); ctx.translate(10, 34); ctx.rotate(-Math.PI/2);
    ctx.fillText((inst.props.value||100)+(inst.props.unit||'µF'), 0, 2);
    ctx.restore();
    if (inst.selected) drawSelectionRect(ctx, -3, -3, 26, 66);
    ctx.restore();
  }
});

/* ═══════════════ COMPONENT CATALOG (for UI display) ═══════════════ */
const COMPONENT_CATALOG = [
  { category: 'Boards',    ids: ['arduino_uno'] },
  { category: 'Output',    ids: ['led', 'rgb_led', 'buzzer', 'seg7', 'lcd1602'] },
  { category: 'Input',     ids: ['push_button', 'potentiometer'] },
  { category: 'Actuators', ids: ['servo'] },
  { category: 'Sensors',   ids: ['dht11', 'hcsr04'] },
  { category: 'Passive',   ids: ['resistor', 'capacitor', 'breadboard'] },
  { category: 'Power',     ids: ['power_5v', 'power_gnd'] },
];

/* ═══════════════ HELPER DRAWING FUNCTIONS ═══════════════ */

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
    // Ambient bloom
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

function formatResistance(val) {
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
