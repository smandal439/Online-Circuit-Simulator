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
  name: 'Arduino Uno R3',
  category: 'Boards',
  icon: '🎛️',
  desc: 'ATmega328P microcontroller board',
  width: 230,
  height: 150,
  defaultProps: { label: 'UNO' },
  pins: [
    // Digital pins top row (D0–D13, from left), then GND + AREF
    { id:'D0',   label:'D0',   type:PIN_TYPE.DIGITAL, x: 10, y: 12, side:'top' },
    { id:'D1',   label:'D1',   type:PIN_TYPE.DIGITAL, x: 24, y: 12, side:'top' },
    { id:'D2',   label:'D2',   type:PIN_TYPE.DIGITAL, x: 38, y: 12, side:'top' },
    { id:'D3',   label:'D3~',  type:PIN_TYPE.PWM,     x: 52, y: 12, side:'top' },
    { id:'D4',   label:'D4',   type:PIN_TYPE.DIGITAL, x: 66, y: 12, side:'top' },
    { id:'D5',   label:'D5~',  type:PIN_TYPE.PWM,     x: 80, y: 12, side:'top' },
    { id:'D6',   label:'D6~',  type:PIN_TYPE.PWM,     x: 94, y: 12, side:'top' },
    { id:'D7',   label:'D7',   type:PIN_TYPE.DIGITAL, x:108, y: 12, side:'top' },
    { id:'D8',   label:'D8',   type:PIN_TYPE.DIGITAL, x:122, y: 12, side:'top' },
    { id:'D9',   label:'D9~',  type:PIN_TYPE.PWM,     x:136, y: 12, side:'top' },
    { id:'D10',  label:'D10~', type:PIN_TYPE.PWM,     x:150, y: 12, side:'top' },
    { id:'D11',  label:'D11~', type:PIN_TYPE.PWM,     x:164, y: 12, side:'top' },
    { id:'D12',  label:'D12',  type:PIN_TYPE.DIGITAL, x:178, y: 12, side:'top' },
    { id:'D13',  label:'D13',  type:PIN_TYPE.DIGITAL, x:192, y: 12, side:'top' },
    // Power top
    { id:'GND_D', label:'GND',  type:PIN_TYPE.GND,    x:206, y: 12, side:'top' },
    { id:'AREF',  label:'AREF', type:PIN_TYPE.SIGNAL, x:220, y: 12, side:'top' },
    // Analog pins bottom row (left)
    { id:'A0', label:'A0', type:PIN_TYPE.ANALOG, x: 14, y:134, side:'bottom' },
    { id:'A1', label:'A1', type:PIN_TYPE.ANALOG, x: 28, y:134, side:'bottom' },
    { id:'A2', label:'A2', type:PIN_TYPE.ANALOG, x: 42, y:134, side:'bottom' },
    { id:'A3', label:'A3', type:PIN_TYPE.ANALOG, x: 56, y:134, side:'bottom' },
    { id:'A4', label:'A4', type:PIN_TYPE.ANALOG, x: 70, y:134, side:'bottom' },
    { id:'A5', label:'A5', type:PIN_TYPE.ANALOG, x: 84, y:134, side:'bottom' },
    // Power bottom (right)
    { id:'VIN',  label:'VIN',  type:PIN_TYPE.POWER, x:104, y:134, side:'bottom' },
    { id:'GND1', label:'GND',  type:PIN_TYPE.GND,   x:118, y:134, side:'bottom' },
    { id:'GND2', label:'GND',  type:PIN_TYPE.GND,   x:132, y:134, side:'bottom' },
    { id:'5V',   label:'5V',   type:PIN_TYPE.POWER, x:146, y:134, side:'bottom' },
    { id:'3V3',  label:'3.3V', type:PIN_TYPE.POWER, x:160, y:134, side:'bottom' },
    { id:'RST',  label:'RST',  type:PIN_TYPE.SIGNAL,x:174, y:134, side:'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y, width: W, height: H } = inst;

    // ── PCB body ──
    ctx.save();
    ctx.translate(x, y);

    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#1e6d33');
    grad.addColorStop(0.45, '#187a30');
    grad.addColorStop(1, '#0f4d1d');
    ctx.fillStyle = grad;
    roundRect(ctx, 0, 0, W, H, 8);
    ctx.fill();
    ctx.strokeStyle = '#194c24';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // ── Silkscreen frame ──
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    roundRect(ctx, 5, 5, W - 10, H - 10, 6);
    ctx.stroke();

    // ── Subtle copper traces ──
    ctx.strokeStyle = 'rgba(170,220,150,0.10)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      ctx.moveTo(14, 22 + i * 9);
      ctx.lineTo(46, 22 + i * 9);
      ctx.stroke();
    }
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.moveTo(196, 22 + i * 11);
      ctx.lineTo(218, 22 + i * 11);
      ctx.stroke();
    }

    // ── USB Type-B connector (left edge) ──
    ctx.fillStyle = '#7f8c8d';
    roundRect(ctx, -16, 32, 18, 26, 3);
    ctx.fill();
    ctx.fillStyle = '#3a3a3a';
    roundRect(ctx, -13, 35, 12, 20, 2);
    ctx.fill();
    ctx.fillStyle = '#d5d8dc';
    roundRect(ctx, -10, 42, 9, 5, 1);
    ctx.fill();

    // ── 16U2 USB-serial chip (top-left) ──
    ctx.fillStyle = '#101010';
    roundRect(ctx, 10, 34, 18, 16, 2);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = '#666';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(10, 37 + i * 4); ctx.lineTo(6, 37 + i * 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(28, 37 + i * 4); ctx.lineTo(32, 37 + i * 4); ctx.stroke();
    }
    ctx.fillStyle = '#ccc';
    ctx.font = '5px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('16U2', 19, 44);

    // ── ATmega328P DIP (center) ──
    const chipX = 58, chipY = 60, chipW = 76, chipH = 32;
    ctx.fillStyle = '#0c0c0c';
    roundRect(ctx, chipX, chipY, chipW, chipH, 3);
    ctx.fill();
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = '#888';
    for (let i = 0; i < 14; i++) {
      const px = chipX + 3 + i * (chipW - 6) / 13;
      ctx.beginPath(); ctx.moveTo(px, chipY); ctx.lineTo(px, chipY - 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, chipY + chipH); ctx.lineTo(px, chipY + chipH + 6); ctx.stroke();
    }
    for (let i = 0; i < 3; i++) {
      const py = chipY + 5 + i * 11;
      ctx.beginPath(); ctx.moveTo(chipX, py); ctx.lineTo(chipX - 6, py); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(chipX + chipW, py); ctx.lineTo(chipX + chipW + 6, py); ctx.stroke();
    }
    // notch
    ctx.fillStyle = '#0c0c0c';
    ctx.beginPath();
    ctx.arc(chipX + chipW / 2, chipY, 4, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d8d8d8';
    ctx.font = 'bold 7px JetBrains Mono, monospace';
    ctx.fillText('ATmega328P', chipX + chipW / 2, chipY + 14);
    ctx.font = '5px JetBrains Mono, monospace';
    ctx.fillText('- P U -', chipX + chipW / 2, chipY + 22);

    // ── ICSP header (right of chip) ──
    ctx.fillStyle = '#151517';
    roundRect(ctx, 148, 62, 20, 24, 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 2; col++) {
        const sx = 152 + col * 8;
        const sy = 66 + row * 7;
        ctx.fillStyle = '#c8b06a';
        ctx.beginPath(); ctx.arc(sx, sy, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0c0c0e';
        ctx.beginPath(); ctx.arc(sx, sy, 0.9, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.fillStyle = '#bfbfbf';
    ctx.font = '4.5px sans-serif';
    ctx.fillText('ICSP', 158, 60);

    // ── Crystal oscillator ──
    ctx.fillStyle = '#b0b0b0';
    roundRect(ctx, 42, 78, 22, 9, 2);
    ctx.fill();
    ctx.strokeStyle = '#777';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#f0f0f0';
    ctx.font = '5px sans-serif';
    ctx.fillText('16MHz', 53, 85);
    ctx.strokeStyle = '#999';
    ctx.beginPath(); ctx.moveTo(46, 87); ctx.lineTo(46, 92); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(60, 87); ctx.lineTo(60, 92); ctx.stroke();

    // ── Reset button (bottom-left) ──
    ctx.fillStyle = '#c43c3c';
    roundRect(ctx, 10, 92, 18, 18, 3);
    ctx.fill();
    ctx.strokeStyle = '#7a2020';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#ff7373';
    roundRect(ctx, 13, 95, 12, 6, 2);
    ctx.fill();
    ctx.fillStyle = '#bfbfbf';
    ctx.font = '5px sans-serif';
    ctx.fillText('RST', 19, 116);

    // ── Barrel jack (bottom-left edge) ──
    ctx.fillStyle = '#1c1c1c';
    roundRect(ctx, -14, 100, 20, 26, 4);
    ctx.fill();
    ctx.fillStyle = '#4a4a4a';
    ctx.beginPath(); ctx.arc(-4, 113, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1c1c1c';
    ctx.beginPath(); ctx.arc(-4, 113, 3, 0, Math.PI * 2); ctx.fill();

    // ── Voltage regulator (SOT-223, right-bottom) ──
    ctx.fillStyle = '#2e2e2e';
    roundRect(ctx, 156, 102, 18, 20, 2);
    ctx.fill();
    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#3d3d3d';
    roundRect(ctx, 158, 96, 14, 6, 2);
    ctx.fill();
    ctx.strokeStyle = '#666';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(160 + i * 5, 122); ctx.lineTo(160 + i * 5, 128); ctx.stroke();
    }
    ctx.fillStyle = '#d8d8d8';
    ctx.font = '5px sans-serif';
    ctx.fillText('5V', 165, 115);

    // ── Electrolytic capacitors ──
    const caps = [
      { cx: 132, cy: 112, r: 5,   t: '1' },
      { cx: 120, cy: 112, r: 4.2, t: '2' },
    ];
    for (const c of caps) {
      ctx.fillStyle = '#101010';
      ctx.beginPath(); ctx.arc(c.cx, c.cy, c.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#3a3a3a';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.strokeStyle = '#d8d8d8';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(c.cx, c.cy, c.r - 1, -Math.PI / 2, Math.PI / 2); ctx.stroke();
      ctx.fillStyle = '#eee';
      ctx.font = `${c.r}px sans-serif`;
      ctx.fillText(c.t, c.cx, c.cy + c.r * 0.35);
    }

    // ── Status LEDs ──
    const lit = sim && sim.pinStates && (sim.pinStates['pin_13'] || 0) > 0;
    drawLED_on_board(ctx, 150, 36, lit ? '#ffee33' : '#555', 3.5);  // L (D13)
    drawLED_on_board(ctx, 12, 62, '#ff4d4d', 3);  // TX
    drawLED_on_board(ctx, 22, 62, '#ff4d4d', 3);  // RX
    drawLED_on_board(ctx, 32, 62, '#33ff66', 3);  // ON
    ctx.fillStyle = '#bfbfbf';
    ctx.font = '5px sans-serif';
    ctx.fillText('L', 150, 46);
    ctx.fillText('TX', 12, 72);
    ctx.fillText('RX', 22, 72);
    ctx.fillText('ON', 32, 72);

    // ── Header strips ──
    const topHoles = [], analogHoles = [], powerHoles = [];
    for (let i = 0; i < 16; i++) topHoles.push(10 + i * 14);
    for (let i = 0; i < 6; i++) { analogHoles.push(14 + i * 14); powerHoles.push(104 + i * 14); }
    drawHeaderStrip(ctx, 4, 6, 222, topHoles, 12);
    drawHeaderStrip(ctx, 4, 128, 94, analogHoles, 134);
    drawHeaderStrip(ctx, 96, 128, 90, powerHoles, 134);

    // ── Silkscreen labels ──
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ARDUINO', 196, 48);
    ctx.font = 'bold 6px sans-serif';
    ctx.fillText('UNO', 196, 57);

    // ── Pin labels (silkscreen, always readable) ──
    ctx.font = 'bold 5px JetBrains Mono, monospace';
    const paintPinLabel = (cx, baseline, text) => {
      const w = ctx.measureText(text).width + 5;
      ctx.fillStyle = 'rgba(8,44,18,0.9)';
      roundRect(ctx, cx - w / 2, baseline - 4.5, w, 7, 2);
      ctx.fill();
      ctx.fillStyle = '#eef9ec';
      ctx.fillText(text, cx, baseline + 1);
    };
    const topLabels   = ['D0','D1','D2','D3~','D4','D5~','D6~','D7','D8','D9~','D10~','D11~','D12','D13','GND','AREF'];
    const analogLabels = ['A0','A1','A2','A3','A4','A5'];
    const powerLabels  = ['VIN','GND','GND','5V','3.3V','RST'];
    for (let i = 0; i < 16; i++) paintPinLabel(topHoles[i], 25, topLabels[i]);
    for (let i = 0; i < 6; i++)  paintPinLabel(analogHoles[i], 120, analogLabels[i]);
    for (let i = 0; i < 6; i++)  paintPinLabel(powerHoles[i], 120, powerLabels[i]);

    // Vertical "MADE IN ITALY" on the right edge
    ctx.save();
    ctx.translate(224, 14);
    ctx.rotate(Math.PI / 2);
    ctx.font = '5px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText('MADE IN ITALY', 0, 0);
    ctx.restore();

    // ── Selection outline ──
    if (inst.selected) {
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      roundRect(ctx, -3, -3, W + 6, H + 6, 10);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }
});

/* ─── ESP32 DEVKIT V1 ─── */
defComp({
  id: 'esp32_devkit_v1',
  name: 'ESP32 DevKit V1',
  category: 'Boards',
  icon: '🔌',
  desc: 'Espressif ESP-WROOM-32 dual-core 3.3V development board',
  width: 170,
  height: 272,
  defaultProps: { label: 'ESP32' },
  pins: [
    // Left header (from top)
    { id: 'EN',   label: 'EN',   type: PIN_TYPE.SIGNAL,  x: 16, y:  40, side: 'left',  gpio: 0 },
    { id: 'VP',   label: 'VP',   type: PIN_TYPE.ANALOG,  x: 16, y:  55, side: 'left',  gpio: 36 },
    { id: 'VN',   label: 'VN',   type: PIN_TYPE.ANALOG,  x: 16, y:  70, side: 'left',  gpio: 39 },
    { id: 'D34',  label: 'D34',  type: PIN_TYPE.ANALOG,  x: 16, y:  85, side: 'left',  gpio: 34 },
    { id: 'D35',  label: 'D35',  type: PIN_TYPE.ANALOG,  x: 16, y: 100, side: 'left',  gpio: 35 },
    { id: 'D32',  label: 'D32',  type: PIN_TYPE.ANALOG,  x: 16, y: 115, side: 'left',  gpio: 32 },
    { id: 'D33',  label: 'D33',  type: PIN_TYPE.ANALOG,  x: 16, y: 130, side: 'left',  gpio: 33 },
    { id: 'D25',  label: 'D25',  type: PIN_TYPE.ANALOG,  x: 16, y: 145, side: 'left',  gpio: 25 },
    { id: 'D26',  label: 'D26',  type: PIN_TYPE.ANALOG,  x: 16, y: 160, side: 'left',  gpio: 26 },
    { id: 'D27',  label: 'D27',  type: PIN_TYPE.PWM,     x: 16, y: 175, side: 'left',  gpio: 27 },
    { id: 'D14',  label: 'D14',  type: PIN_TYPE.PWM,     x: 16, y: 190, side: 'left',  gpio: 14 },
    { id: 'D12',  label: 'D12',  type: PIN_TYPE.PWM,     x: 16, y: 205, side: 'left',  gpio: 12 },
    { id: 'D13',  label: 'D13',  type: PIN_TYPE.PWM,     x: 16, y: 220, side: 'left',  gpio: 13 },
    { id: 'GND1', label: 'GND',  type: PIN_TYPE.GND,     x: 16, y: 235, side: 'left' },
    { id: 'VIN',  label: 'VIN',  type: PIN_TYPE.POWER,   x: 16, y: 250, side: 'left' },
    // Right header (from top)
    { id: 'D23',  label: 'D23',  type: PIN_TYPE.PWM,     x: 154, y:  40, side: 'right', gpio: 23 },
    { id: 'D22',  label: 'D22',  type: PIN_TYPE.PWM,     x: 154, y:  55, side: 'right', gpio: 22 },
    { id: 'TX0',  label: 'TX0',  type: PIN_TYPE.SIGNAL,  x: 154, y:  70, side: 'right', gpio: 1 },
    { id: 'RX0',  label: 'RX0',  type: PIN_TYPE.SIGNAL,  x: 154, y:  85, side: 'right', gpio: 3 },
    { id: 'D21',  label: 'D21',  type: PIN_TYPE.PWM,     x: 154, y: 100, side: 'right', gpio: 21 },
    { id: 'D19',  label: 'D19',  type: PIN_TYPE.PWM,     x: 154, y: 115, side: 'right', gpio: 19 },
    { id: 'D18',  label: 'D18',  type: PIN_TYPE.PWM,     x: 154, y: 130, side: 'right', gpio: 18 },
    { id: 'D5',   label: 'D5',   type: PIN_TYPE.PWM,     x: 154, y: 145, side: 'right', gpio: 5 },
    { id: 'D17',  label: 'D17',  type: PIN_TYPE.PWM,     x: 154, y: 160, side: 'right', gpio: 17 },
    { id: 'D16',  label: 'D16',  type: PIN_TYPE.PWM,     x: 154, y: 175, side: 'right', gpio: 16 },
    { id: 'D4',   label: 'D4',   type: PIN_TYPE.PWM,     x: 154, y: 190, side: 'right', gpio: 4 },
    { id: 'D2',   label: 'D2',   type: PIN_TYPE.PWM,     x: 154, y: 205, side: 'right', gpio: 2 },
    { id: 'D15',  label: 'D15',  type: PIN_TYPE.PWM,     x: 154, y: 220, side: 'right', gpio: 15 },
    { id: 'GND2', label: 'GND',  type: PIN_TYPE.GND,     x: 154, y: 235, side: 'right' },
    { id: '3V3',  label: '3V3',  type: PIN_TYPE.POWER,   x: 154, y: 250, side: 'right' },
  ],
  draw(ctx, inst, sim) {
    const { x, y, width: W, height: H } = inst;
    const WROOM_W = 92, WROOM_H = 118, WROOM_X = 39, WROOM_Y = 18;

    ctx.save();
    ctx.translate(x, y);

    // ── PCB body ──
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#18222b');
    grad.addColorStop(0.5, '#202d38');
    grad.addColorStop(1, '#11171d');
    ctx.fillStyle = grad;
    roundRect(ctx, 0, 0, W, H, 6);
    ctx.fill();
    ctx.strokeStyle = '#0c1116';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Silkscreen frame
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    roundRect(ctx, 3, 3, W - 6, H - 6, 5);
    ctx.stroke();

    // ── ESP-WROOM-32 metal shield ──
    ctx.fillStyle = '#c8cfd6';
    roundRect(ctx, WROOM_X, WROOM_Y, WROOM_W, WROOM_H, 3);
    ctx.fill();
    ctx.strokeStyle = '#8b949e';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Trace pattern on shield
    ctx.strokeStyle = 'rgba(60,70,80,0.5)';
    ctx.lineWidth = 0.6;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(WROOM_X + 6, WROOM_Y + 16 + i * 9);
      ctx.lineTo(WROOM_X + WROOM_W - 6, WROOM_Y + 16 + i * 9);
      ctx.stroke();
    }
    ctx.fillStyle = '#3a434b';
    ctx.font = 'bold 8px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ESP-WROOM-32', WROOM_X + WROOM_W / 2, WROOM_Y + WROOM_H / 2 + 10);
    ctx.font = '5px sans-serif';
    ctx.fillText('FLASH 4MB · DUAL CORE', WROOM_X + WROOM_W / 2, WROOM_Y + WROOM_H / 2 + 22);

    // ── 32.768kHz crystal + flash chip hints ──
    ctx.fillStyle = '#0d0d0d';
    roundRect(ctx, 8, 34, 16, 12, 2);
    ctx.fill();
    ctx.fillStyle = '#3d464e';
    roundRect(ctx, 146, 34, 16, 12, 2);
    ctx.fill();

    // ── USB connector (bottom center) ──
    ctx.fillStyle = '#6b7280';
    roundRect(ctx, W / 2 - 11, H - 26, 22, 26, 3);
    ctx.fill();
    ctx.fillStyle = '#2a2f36';
    roundRect(ctx, W / 2 - 7, H - 20, 14, 8, 1);
    ctx.fill();

    // ── Header strips ──
    const leftYs  = this.pins.filter(p => p.side === 'left').map(p => p.y);
    const rightYs = this.pins.filter(p => p.side === 'right').map(p => p.y);
    const drawVertHeader = (hx, holeXs, holeYs, holeX) => {
      ctx.fillStyle = '#15181c';
      roundRect(ctx, hx, 32, 16, H - 62, 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();
      for (const hy of holeYs) {
        ctx.fillStyle = '#c8b06a';
        ctx.beginPath(); ctx.arc(holeX, hy, 4.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0b0b0d';
        ctx.beginPath(); ctx.arc(holeX, hy, 2, 0, Math.PI * 2); ctx.fill();
      }
    };
    drawVertHeader(8,  leftYs, leftYs, 16);
    drawVertHeader(146, rightYs, rightYs, 154);

    // ── Pin labels (silkscreen, baked in) ──
    ctx.font = 'bold 5px JetBrains Mono, monospace';
    for (const pin of this.pins) {
      const pw = ctx.measureText(pin.label).width + 3;
      let bx;
      if (pin.side === 'left')  bx = pin.x - 3 - pw;
      else                      bx = pin.x + 3;
      ctx.fillStyle = 'rgba(6,12,18,0.85)';
      roundRect(ctx, bx, pin.y - 3.5, pw, 7, 1.5);
      ctx.fill();
      ctx.fillStyle = '#dbe4ea';
      ctx.textAlign = pin.side === 'left' ? 'right' : 'left';
      ctx.fillText(pin.label, bx + (pin.side === 'left' ? pw - 2 : 2), pin.y + 1.5);
    }

    // ── Built-in LED (GPIO2) — on the PCB between the headers ──
    const ledCx = 66, ledCy = 208;
    const lit = sim && sim.pinStates && (sim.pinStates.pin_2 || 0) > 0;
    drawLED_on_board(ctx, ledCx, ledCy, lit ? '#ffee33' : '#555', 3.5);
    ctx.fillStyle = '#8b949e';
    ctx.font = 'bold 5px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('L', ledCx, ledCy + 9);
    ctx.fillText('GPIO2', ledCx, ledCy - 6);

    // ── Board name ──
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ESP32', W / 2, H - 6);
    ctx.font = '5px sans-serif';
    ctx.fillText('DEVKIT V1', W / 2, H - 1);

    // ── Selection outline ──
    if (inst.selected) {
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      roundRect(ctx, -3, -3, W + 6, H + 6, 8);
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
    { id: 'anode',   label: '+', type: PIN_TYPE.PWM,     x: 15, y:  0, side: 'top' },
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
    const blown = !!(inst.runtimeState && inst.runtimeState.blown);
    const overloaded = !!(inst.runtimeState && inst.runtimeState.overload) && !blown;
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
    ctx.fillStyle = isOn ? hexToRgba(col, 0.75 + 0.25 * brightness) : (blown ? 'rgba(52,52,58,0.95)' : hexToRgba(col, 0.3));
    ctx.beginPath();
    ctx.arc(15, 30, 13, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = isOn ? '#ffffff' : (blown ? 'rgba(30,30,34,0.9)' : hexToRgba(col, 0.5));
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
  interactive: [
    { field: 'value', label: 'Wiper', min: 0, max: 1023, step: 1 },
  ],
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

/* ─── Multi-Color LED Array ─── */
defComp({
  id: 'multi_led_array',
  name: 'Multi-Color LED Array',
  category: 'Output',
  icon: '🚥',
  desc: 'Array of 4 individual colored LEDs (Red, Yellow, Green, Blue) with shared ground',
  width: 90,
  height: 60,
  defaultProps: {},
  pins: [
    { id: 'led_r', label: 'R', type: PIN_TYPE.DIGITAL, x: 15, y: 60, side: 'bottom' },
    { id: 'led_y', label: 'Y', type: PIN_TYPE.DIGITAL, x: 30, y: 60, side: 'bottom' },
    { id: 'led_g', label: 'G', type: PIN_TYPE.DIGITAL, x: 45, y: 60, side: 'bottom' },
    { id: 'led_b', label: 'B', type: PIN_TYPE.DIGITAL, x: 60, y: 60, side: 'bottom' },
    { id: 'gnd',   label: '−', type: PIN_TYPE.GND,     x: 75, y: 60, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;

    // Configuration for each LED in the module
    const leds = [
      { id: 'led_r', color: '#ff3333', label: 'R', x: 15 },
      { id: 'led_y', color: '#ffcc00', label: 'Y', x: 30 },
      { id: 'led_g', color: '#33cc33', label: 'G', x: 45 },
      { id: 'led_b', color: '#3388ff', label: 'B', x: 60 },
    ];

    ctx.save();
    ctx.translate(x, y);

    // Module Housing Base
    ctx.fillStyle = '#1e1e24';
    roundRect(ctx, 4, 10, 82, 30, 4);
    ctx.fill();
    ctx.strokeStyle = '#3a3a42';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Bottom Lead Pins
    const pinXs = [15, 30, 45, 60, 75];
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 1.5;
    pinXs.forEach(px => {
      ctx.beginPath();
      ctx.moveTo(px, 40);
      ctx.lineTo(px, 60);
      ctx.stroke();
    });

    // Common Cathode (GND) Mark
    ctx.fillStyle = '#aaaaaa';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('−', 75, 53);

    // Render Individual LEDs
    leds.forEach(led => {
      const val = getInstPinState(inst, led.id, sim) || 0;
      const brightness = val > 1 ? Math.min(val / 255, 1) : Math.max(val, 0);
      const isOn = brightness > 0.02;
      const col = led.color;
      const lx = led.x;
      const ly = 25;

      // Pin Text Labels
      ctx.fillStyle = '#aaaaaa';
      ctx.font = 'bold 7px sans-serif';
      ctx.fillText(led.label, lx, 53);

      // 1. Ambient Volumetric Glow Halo (When Lit)
      if (isOn) {
        const glowRadius = 18 * brightness;
        const halo = ctx.createRadialGradient(lx, ly, 0, lx, ly, glowRadius);
        halo.addColorStop(0, hexToRgba(col, 0.65 * brightness));
        halo.addColorStop(0.5, hexToRgba(col, 0.25 * brightness));
        halo.addColorStop(1, hexToRgba(col, 0));
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(lx, ly, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. LED Bulb Lens Body
      ctx.fillStyle = isOn ? hexToRgba(col, 0.9) : hexToRgba(col, 0.3);
      ctx.beginPath();
      ctx.arc(lx, ly, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isOn ? '#ffffff' : hexToRgba(col, 0.6);
      ctx.lineWidth = 1;
      ctx.stroke();

      // 3. Bright Specular Highlight Core
      if (isOn) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(lx - 2, ly - 2, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    if (inst.selected) drawSelectionRect(ctx, -2, 5, 94, 60);
    ctx.restore();
  }
});

// /* ─── BREADBOARD ─── */
// defComp({
//   id: 'breadboard',
//   name: 'Breadboard',
//   category: 'Passive',
//   icon: '🟦',
//   desc: 'Solderless prototyping board',
//   width: 200,
//   height: 120,
//   defaultProps: {},
//   pins: [], // Dynamic — breadboard holes
//   draw(ctx, inst, sim) {
//     const { x, y, width: W, height: H } = inst;
//     ctx.save();
//     ctx.translate(x, y);

//     // Body
//     ctx.fillStyle = '#1a2a4a';
//     roundRect(ctx, 0, 0, W, H, 6);
//     ctx.fill();
//     ctx.strokeStyle = '#2a3a5a';
//     ctx.lineWidth = 1.5;
//     ctx.stroke();

//     // Power rails
//     ctx.fillStyle = 'rgba(255,60,60,0.2)';
//     roundRect(ctx, 8, 4, W-16, 10, 2);
//     ctx.fill();
//     ctx.fillStyle = 'rgba(60,60,255,0.2)';
//     roundRect(ctx, 8, H-14, W-16, 10, 2);
//     ctx.fill();

//     // Center divider
//     ctx.fillStyle = '#223';
//     ctx.fillRect(8, H/2-3, W-16, 6);

//     // Draw holes in rows
//     ctx.fillStyle = '#0a0a1a';
//     const cols = 10;
//     const rows = 4;
//     const startX = 14, startY = 20;
//     const stepX = (W - 28) / (cols - 1);
//     const stepY = (H - 55) / (rows - 1);
//     for (let row = 0; row < rows; row++) {
//       for (let col = 0; col < cols; col++) {
//         const hx = startX + col * stepX;
//         const hy = startY + row * stepY;
//         if (row >= 2) {
//           // Separate upper and lower halves
//         }
//         ctx.beginPath();
//         ctx.arc(hx, hy + (row >= 2 ? 12 : 0), 2, 0, Math.PI * 2);
//         ctx.fill();
//       }
//     }

//     // Power rail holes
//     for (let i = 0; i < 20; i++) {
//       const hx = 14 + i * ((W-28)/19);
//       ctx.fillStyle = '#0a0a1a';
//       ctx.beginPath(); ctx.arc(hx, 9, 2, 0, Math.PI*2); ctx.fill();
//       ctx.beginPath(); ctx.arc(hx, H-9, 2, 0, Math.PI*2); ctx.fill();
//     }

//     // Rail symbols
//     ctx.fillStyle = '#cc4444';
//     ctx.font = 'bold 9px sans-serif';
//     ctx.textAlign = 'right';
//     ctx.fillText('+', W-4, 13);
//     ctx.fillStyle = '#4444cc';
//     ctx.fillText('−', W-4, H-5);

//     if (inst.selected) drawSelectionRect(ctx, -3, -3, W+6, H+6);
//     ctx.restore();
//   }
// });
/* ─── BREADBOARD (Realistic Half-Size / 400 Tie-Points) ─── */
defComp({
  id: 'breadboard',
  name: 'Breadboard',
  category: 'Passive',
  icon: '🟦',
  desc: 'Standard 400 tie-point solderless prototyping board',
  width: 580,
  height: 220,
  defaultProps: {},
  pins: [], // Dynamic — breadboard holes
  draw(ctx, inst, sim) {
    const { x, y, width: W, height: H } = inst;
    ctx.save();
    ctx.translate(x, y);

    // --- 1. Main Plastic Body ---
    // Outer drop shadow & bevel base
    ctx.fillStyle = '#e8e5dc';
    roundRect(ctx, 0, 0, W, H, 8);
    ctx.fill();

    // Top surface (warm off-white plastic)
    const bodyGrad = ctx.createLinearGradient(0, 0, 0, H);
    bodyGrad.addColorStop(0, '#faf8f3');
    bodyGrad.addColorStop(1, '#f1ede4');
    ctx.fillStyle = bodyGrad;
    roundRect(ctx, 2, 2, W - 4, H - 4, 6);
    ctx.fill();

    // Subtle edge border
    ctx.strokeStyle = '#c8c4b7';
    ctx.lineWidth = 1.2;
    roundRect(ctx, 0.5, 0.5, W - 1, H - 1, 8);
    ctx.stroke();

    // Side interlocking tabs & notches
    ctx.fillStyle = '#dfdbd0';
    // Left notch
    roundRect(ctx, -2, H / 2 - 12, 4, 24, 2);
    ctx.fill();
    // Right tab
    roundRect(ctx, W - 2, H / 2 - 12, 4, 24, 2);
    ctx.fill();

    // --- 2. Center DIP Groove / Trough ---
    const midY = H / 2;
    const grooveH = 10;
    const grooveGrad = ctx.createLinearGradient(0, midY - grooveH / 2, 0, midY + grooveH / 2);
    grooveGrad.addColorStop(0, '#c2beb3');
    grooveGrad.addColorStop(0.3, '#d8d4c8');
    grooveGrad.addColorStop(0.7, '#e8e5dc');
    grooveGrad.addColorStop(1, '#ffffff');
    ctx.fillStyle = grooveGrad;
    ctx.fillRect(18, midY - grooveH / 2, W - 36, grooveH);

    // --- 3. Power Rail Stripes & Indicators ---
    const railX1 = 34;
    const railX2 = W - 34;

    // Top rails (+ Red, - Blue)
    ctx.strokeStyle = '#df3838';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(railX1, 13);
    ctx.lineTo(railX2, 13);
    ctx.stroke();

    ctx.strokeStyle = '#2b6cd4';
    ctx.beginPath();
    ctx.moveTo(railX1, 37);
    ctx.lineTo(railX2, 37);
    ctx.stroke();

    // Bottom rails (+ Red, - Blue)
    ctx.strokeStyle = '#df3838';
    ctx.beginPath();
    ctx.moveTo(railX1, H - 37);
    ctx.lineTo(railX2, H - 37);
    ctx.stroke();

    ctx.strokeStyle = '#2b6cd4';
    ctx.beginPath();
    ctx.moveTo(railX1, H - 13);
    ctx.lineTo(railX2, H - 13);
    ctx.stroke();

    // Rail polarity labels
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#df3838';
    ctx.fillText('+', 22, 13);
    ctx.fillText('+', W - 22, 13);
    ctx.fillText('+', 22, H - 37);
    ctx.fillText('+', W - 22, H - 37);

    ctx.fillStyle = '#2b6cd4';
    ctx.fillText('−', 22, 37);
    ctx.fillText('−', W - 22, 37);
    ctx.fillText('−', 22, H - 13);
    ctx.fillText('−', W - 22, H - 13);

    // --- 4. Helper Function to Draw Realistic Sockets ---
    function drawTieHole(hx, hy) {
      // Outer beveled bevel/cavity
      ctx.fillStyle = '#ded9ce';
      ctx.fillRect(hx - 3.5, hy - 3.5, 7, 7);
      // Dark internal socket hole
      ctx.fillStyle = '#1c1b18';
      ctx.fillRect(hx - 2.5, hy - 2.5, 5, 5);
      // Metallic contact clip highlight
      ctx.fillStyle = '#4a4843';
      ctx.fillRect(hx - 1.5, hy - 1, 3, 2);
    }

    // --- 5. Draw 30 Columns & Coordinate System ---
    const cols = 30;
    const startX = 42;
    const stepX = (W - 84) / (cols - 1); // ~17.1px pitch

    // Row positions (a-e upper, f-j lower)
    const upperRowsY = [55, 68, 81, 94, 107];
    const lowerRowsY = [123, 136, 149, 162, 175];
    const rowLabelsUpper = ['a', 'b', 'c', 'd', 'e'];
    const rowLabelsLower = ['f', 'g', 'h', 'i', 'j'];

    // Row Letter Labels
    ctx.fillStyle = '#7a766c';
    ctx.font = '9px sans-serif';

    // Left and Right row labels
    for (let r = 0; r < 5; r++) {
      ctx.fillText(rowLabelsUpper[r], 24, upperRowsY[r]);
      ctx.fillText(rowLabelsUpper[r], W - 24, upperRowsY[r]);
      ctx.fillText(rowLabelsLower[r], 24, lowerRowsY[r]);
      ctx.fillText(rowLabelsLower[r], W - 24, lowerRowsY[r]);
    }

    // Draw Column numbers & Terminal Holes
    for (let col = 0; col < cols; col++) {
      const hx = startX + col * stepX;
      const colNum = col + 1;

      // Silk-screen column numbers (1, 5, 10, 15, 20, 25, 30)
      if (colNum === 1 || colNum % 5 === 0) {
        ctx.fillStyle = '#6b665c';
        ctx.font = 'bold 8.5px sans-serif';
        ctx.fillText(colNum.toString(), hx, 45);
        ctx.fillText(colNum.toString(), hx, H - 45);
      }

      // Upper rows (a–e)
      for (let r = 0; r < 5; r++) {
        drawTieHole(hx, upperRowsY[r]);
      }

      // Lower rows (f–j)
      for (let r = 0; r < 5; r++) {
        drawTieHole(hx, lowerRowsY[r]);
      }
    }

    // --- 6. Power Rail Holes (5-hole groups with separators) ---
    for (let i = 0; i < 25; i++) {
      // Grouping offset to mirror physical breadboards (5 groups of 5)
      const groupOffset = Math.floor(i / 5) * 8;
      const hx = 45 + i * ((W - 122) / 24) + groupOffset;

      // Top power rails (+ and -)
      drawTieHole(hx, 19);
      drawTieHole(hx, 31);

      // Bottom power rails (+ and -)
      drawTieHole(hx, H - 31);
      drawTieHole(hx, H - 19);
    }

    if (inst.selected) drawSelectionRect(ctx, -4, -4, W + 8, H + 8);
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

// /* ─── DHT11 Temperature Sensor ─── */
// defComp({
//   id: 'dht11',
//   name: 'DHT11 Sensor',
//   category: 'Sensors',
//   icon: '🌡️',
//   desc: 'Temperature & humidity sensor',
//   width: 30,
//   height: 50,
//   defaultProps: { temperature: 25, humidity: 60 },
//   interactive: [
//     { field: 'temperature', label: 'Temp', min: 0, max: 50, step: 1, unit: '°C' },
//     { field: 'humidity',    label: 'Hum',  min: 0, max: 100, step: 1, unit: '%' },
//   ],
//   pins: [
//     { id:'vcc',  label:'VCC', type:PIN_TYPE.POWER,  x: 6, y: 0, side:'top' },
//     { id:'data', label:'DAT', type:PIN_TYPE.DIGITAL, x:15, y: 0, side:'top' },
//     { id:'nc',   label:'NC',  type:PIN_TYPE.SIGNAL,  x:24, y: 0, side:'top' },
//     { id:'gnd',  label:'GND', type:PIN_TYPE.GND,     x:15, y:50, side:'bottom' },
//   ],
//   draw(ctx, inst, sim) {
//     const { x, y } = inst;
//     const temp = inst.props.temperature || 25;
//     const hum  = inst.props.humidity || 60;

//     ctx.save();
//     ctx.translate(x, y);

//     // Body
//     ctx.fillStyle = '#1a55cc';
//     roundRect(ctx, 2, 8, 26, 36, 3);
//     ctx.fill();
//     ctx.strokeStyle = '#2266ee';
//     ctx.lineWidth = 1;
//     ctx.stroke();

//     // Grille
//     ctx.fillStyle = '#0a2a88';
//     for (let row = 0; row < 3; row++) {
//       for (let col = 0; col < 4; col++) {
//         roundRect(ctx, 5 + col*5, 12 + row*8, 4, 6, 1);
//         ctx.fill();
//       }
//     }

//     // Label
//     ctx.fillStyle = '#fff';
//     ctx.font = 'bold 6px sans-serif';
//     ctx.textAlign = 'center';
//     ctx.fillText('DHT11', 15, 48);

//     // Leads
//     ctx.strokeStyle = '#888';
//     ctx.lineWidth = 1.5;
//     ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(6, 8); ctx.stroke();
//     ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(15, 8); ctx.stroke();
//     ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(24, 8); ctx.stroke();

//     if (inst.selected) drawSelectionRect(ctx, -1, 5, 32, 53);
//     ctx.restore();
//   }
// });

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
  interactive: [
    { field: 'temperature', label: 'Temp', min: 0, max: 50, step: 1, unit: '°C' },
    { field: 'humidity',    label: 'Hum',  min: 0, max: 100, step: 1, unit: '%' },
  ],
  pins: [
    { id: 'vcc',  label: 'VCC',  type: PIN_TYPE.POWER,   x: 6,  y: 50, side: 'bottom' },
    { id: 'data', label: 'DAT',  type: PIN_TYPE.DIGITAL, x: 12, y: 50, side: 'bottom' },
    { id: 'nc',   label: 'NC',   type: PIN_TYPE.SIGNAL,  x: 18, y: 50, side: 'bottom' },
    { id: 'gnd',  label: 'GND',  type: PIN_TYPE.GND,     x: 24, y: 50, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const temp = inst.props.temperature ?? 25;
    const hum  = inst.props.humidity ?? 60;

    ctx.save();
    ctx.translate(x, y);

    // Main Plastic Body
    ctx.fillStyle = '#1a55cc';
    roundRect(ctx, 2, 2, 26, 38, 3);
    ctx.fill();
    ctx.strokeStyle = '#2266ee';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Vent Grille
    ctx.fillStyle = '#0a2a88';
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        roundRect(ctx, 5 + col * 5, 5 + row * 6, 4, 4, 1);
        ctx.fill();
      }
    }

    // Dynamic Sensor Readout Display
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 5px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${temp}°C`, 15, 27);
    ctx.fillText(`${hum}%`, 15, 34);

    // Pin Leads (Bottom)
    const pinXs = [6, 12, 18, 24];
    ctx.strokeStyle = '#a0a0a0';
    ctx.lineWidth = 1.5;
    for (const px of pinXs) {
      ctx.beginPath();
      ctx.moveTo(px, 40);
      ctx.lineTo(px, 50);
      ctx.stroke();
    }

    if (inst.selected) drawSelectionRect(ctx, 0, 0, 30, 50);
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
  interactive: [
    { field: 'distance', label: 'Dist', min: 2, max: 400, step: 1, unit: 'cm' },
  ],
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

/* ─── Electromagnetic Relay ─── */
defComp({
  id: 'relay',
  name: 'Relay Module',
  category: 'Actuators',
  icon: '⚡',
  desc: 'Electromagnetic relay — coil driven by a signal pin switches COM to NO/NC',
  width: 90,
  height: 50,
  defaultProps: { label: 'RELAY' },
  pins: [
    { id: 'vcc',  label: 'VCC',  type: PIN_TYPE.POWER,   x: 12, y: 50, side: 'bottom' },
    { id: 'gnd',  label: 'GND',  type: PIN_TYPE.GND,     x: 24, y: 50, side: 'bottom' },
    { id: 'sig',  label: 'IN',   type: PIN_TYPE.DIGITAL, x: 36, y: 50, side: 'bottom' },
    { id: 'com',  label: 'COM',  type: PIN_TYPE.SIGNAL,  x: 54, y: 50, side: 'bottom' },
    { id: 'no',   label: 'NO',   type: PIN_TYPE.SIGNAL,  x: 66, y: 50, side: 'bottom' },
    { id: 'nc',   label: 'NC',   type: PIN_TYPE.SIGNAL,  x: 78, y: 50, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const active = inst.runtimeState && inst.runtimeState.active;

    ctx.save();
    ctx.translate(x, y);

    // Pin leads
    ctx.strokeStyle = '#c8a84b';
    ctx.lineWidth = 1.5;
    [12,24,36,54,66,78].forEach(px => {
      ctx.beginPath(); ctx.moveTo(px, 44); ctx.lineTo(px, 50); ctx.stroke();
    });

    // Body
    const bodyGrad = ctx.createLinearGradient(0, 4, 90, 46);
    bodyGrad.addColorStop(0, '#3d4a5a');
    bodyGrad.addColorStop(1, '#1c2530');
    ctx.fillStyle = bodyGrad;
    roundRect(ctx, 2, 4, 86, 40, 5);
    ctx.fill();
    ctx.strokeStyle = '#55677a';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Coil (left) — inductor loops
    ctx.strokeStyle = '#ffd24a';
    ctx.lineWidth = 2;
    const coilY = 22;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const cx = 14 + i * 5;
      ctx.moveTo(cx, coilY + 3);
      ctx.arc(cx, coilY, 3, 0, Math.PI);
    }
    ctx.stroke();

    // Signal LED indicator
    ctx.fillStyle = active ? '#33ff66' : '#335533';
    ctx.beginPath(); ctx.arc(26, 22, 3.5, 0, Math.PI * 2); ctx.fill();
    if (active) { ctx.shadowColor = '#33ff66'; ctx.shadowBlur = 6; }
    ctx.beginPath(); ctx.arc(26, 22, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Contacts: COM terminal at right, lever swings between NO / NC
    ctx.fillStyle = '#999';
    ctx.fillRect(48, 20, 4, 4);   // COM fixed contact
    ctx.fillRect(active ? 60 : 72, 12, 4, 4);  // NO (top) or NC (bottom) contact
    // Moving lever
    ctx.strokeStyle = active ? '#33ff66' : '#cc3333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, 22);
    ctx.lineTo(active ? 62 : 74, active ? 14 : 30);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#aab4c0';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(active ? 'ON' : 'OFF', 72, 42);
    ctx.fillText('RELAY', 40, 10);

    if (inst.selected) drawSelectionRect(ctx, -3, 2, 96, 55);
    ctx.restore();
  }
});

/* ─── DC Motor ─── */
defComp({
  id: 'dc_motor',
  name: 'DC Motor',
  category: 'Actuators',
  icon: '🌀',
  desc: 'Brushed DC motor — speed follows the PWM value on the IN pin',
  width: 50,
  height: 60,
  defaultProps: { label: 'MOTOR' },
  pins: [
    { id: 'in',   label: 'IN',  type: PIN_TYPE.PWM,  x: 20, y: 60, side: 'bottom' },
    { id: 'gnd',  label: 'GND', type: PIN_TYPE.GND,  x: 34, y: 60, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const speed = inst.runtimeState && inst.runtimeState.speed !== undefined ? inst.runtimeState.speed : 0;
    const rpm = inst.runtimeState && inst.runtimeState.rpm !== undefined ? inst.runtimeState.rpm : 0;
    const t = (sim && sim.simTime) || 0;

    ctx.save();
    ctx.translate(x, y);

    // Leads
    ctx.strokeStyle = '#c8a84b';
    ctx.lineWidth = 1.5;
    [[20,60],[34,60]].forEach(([px,py]) => {
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, 52); ctx.stroke();
    });

    // Body
    const bodyGrad = ctx.createLinearGradient(2, 6, 48, 54);
    bodyGrad.addColorStop(0, '#45474b');
    bodyGrad.addColorStop(1, '#222428');
    ctx.fillStyle = bodyGrad;
    roundRect(ctx, 4, 6, 42, 46, 5);
    ctx.fill();
    ctx.strokeStyle = '#5a5d63';
    ctx.lineWidth = 1;
    ctx.stroke();

    // End cap lines
    ctx.strokeStyle = '#3a3d42';
    ctx.beginPath(); ctx.moveTo(18, 8); ctx.lineTo(18, 50); ctx.stroke();

    // Rotating shaft + fan (spins proportional to speed)
    ctx.save();
    ctx.translate(32, 26);
    ctx.rotate(t * 0.02 * speed);
    ctx.fillStyle = '#8a8e96';
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI * 2) / 3);
      roundRect(ctx, -2, -14, 4, 12, 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#555';
    ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Speed display
    ctx.fillStyle = speed > 0.02 ? '#33ffcc' : '#8a8e96';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${rpm} RPM`, 25, 48);

    if (inst.selected) drawSelectionRect(ctx, -3, 3, 56, 63);
    ctx.restore();
  }
});

/* ─── LDR Photoresistor ─── */
defComp({
  id: 'ldr',
  name: 'LDR Photoresistor',
  category: 'Sensors',
  icon: '💡',
  desc: 'Light-dependent resistor — light level appears on the A pin (0–1023)',
  width: 40,
  height: 40,
  defaultProps: { light: 512 },
  interactive: [
    { field: 'light', label: 'Light', min: 0, max: 1023, step: 1, unit: ' lx' },
  ],
  pins: [
    { id: 'vcc',  label: 'VCC', type: PIN_TYPE.POWER,  x:  8, y: 40, side: 'bottom' },
    { id: 'a',    label: 'A',   type: PIN_TYPE.ANALOG, x: 20, y: 40, side: 'bottom' },
    { id: 'gnd',  label: 'GND', type: PIN_TYPE.GND,    x: 32, y: 40, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const light = inst.runtimeState && inst.runtimeState.light !== undefined ? inst.runtimeState.light : (inst.props.light || 512);
    const pct = light / 1023;

    ctx.save();
    ctx.translate(x, y);

    // Leads
    ctx.strokeStyle = '#c8a84b';
    ctx.lineWidth = 1.5;
    [[8,40],[20,40],[32,40]].forEach(([px,py]) => {
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, 34); ctx.stroke();
    });

    // Body
    ctx.fillStyle = '#2a2a2a';
    roundRect(ctx, 2, 3, 36, 31, 4);
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Wavy resistive track
    ctx.strokeStyle = '#c8b06a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(8, 18);
    ctx.lineTo(14, 12); ctx.lineTo(18, 24); ctx.lineTo(22, 12); ctx.lineTo(26, 24); ctx.lineTo(31, 18);
    ctx.stroke();

    // Light rays (animated with brightness)
    const rayOn = pct > 0.05;
    ctx.strokeStyle = rayOn ? '#ffee88' : '#666';
    ctx.lineWidth = 1;
    if (rayOn) { ctx.shadowColor = '#ffee88'; ctx.shadowBlur = 5; }
    [[-2,4],[14,-2],[30,4]].forEach(([rx,ry]) => {
      ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 3, ry - 5); ctx.stroke();
    });
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#aaa';
    ctx.font = 'bold 6px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LDR', 20, 30);

    if (inst.selected) drawSelectionRect(ctx, -3, 0, 46, 46);
    ctx.restore();
  }
});

/* ─── PIR Motion Sensor ─── */
defComp({
  id: 'pir',
  name: 'PIR Motion Sensor',
  category: 'Sensors',
  icon: '🚶',
  desc: 'Passive infrared sensor — OUT goes HIGH while motion is detected',
  width: 50,
  height: 40,
  defaultProps: { motion: 0 },
  interactive: [
    { field: 'motion', label: 'Motion', min: 0, max: 1, step: 1, unit: '' },
  ],
  pins: [
    { id: 'vcc',  label: 'VCC', type: PIN_TYPE.POWER,   x: 12, y: 40, side: 'bottom' },
    { id: 'out',  label: 'OUT', type: PIN_TYPE.DIGITAL, x: 25, y: 40, side: 'bottom' },
    { id: 'gnd',  label: 'GND', type: PIN_TYPE.GND,     x: 38, y: 40, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const motion = inst.runtimeState && inst.runtimeState.motion !== undefined ? !!inst.runtimeState.motion : !!(inst.props.motion || 0);

    ctx.save();
    ctx.translate(x, y);

    // Leads
    ctx.strokeStyle = '#c8a84b';
    ctx.lineWidth = 1.5;
    [[12,40],[25,40],[38,40]].forEach(([px,py]) => {
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, 36); ctx.stroke();
    });

    // Board
    ctx.fillStyle = '#1a5c1a';
    roundRect(ctx, 2, 12, 46, 24, 3);
    ctx.fill();
    ctx.strokeStyle = '#2d8c2d';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Sensor dome
    ctx.fillStyle = motion ? '#e8f4ff' : '#cfd8e0';
    ctx.beginPath();
    ctx.arc(25, 12, 13, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = '#aab4c0';
    ctx.stroke();
    ctx.fillStyle = motion ? '#3399ff' : '#77828e';
    ctx.beginPath();
    ctx.arc(25, 12, 7, Math.PI, 0);
    ctx.fill();

    // Indicator LED
    ctx.fillStyle = motion ? '#ff5555' : '#442222';
    ctx.beginPath(); ctx.arc(12, 22, 2.5, 0, Math.PI * 2); ctx.fill();
    if (motion) { ctx.shadowColor = '#ff5555'; ctx.shadowBlur = 5; }
    ctx.beginPath(); ctx.arc(12, 22, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#c8c8c8';
    ctx.font = 'bold 6px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(motion ? 'MOTION' : 'IDLE', 33, 28);

    if (inst.selected) drawSelectionRect(ctx, -3, -3, 56, 46);
    ctx.restore();
  }
});

/* ─── Joystick ─── */
defComp({
  id: 'joystick',
  name: 'Joystick Module',
  category: 'Input',
  icon: '🕹️',
  desc: '2-axis analog joystick with push button (X, Y, SW)',
  width: 60,
  height: 60,
  defaultProps: { x: 512, y: 512, sw: 0 },
  interactive: [
    { field: 'x',  label: 'X',  min: 0, max: 1023, step: 1 },
    { field: 'y',  label: 'Y',  min: 0, max: 1023, step: 1 },
    { field: 'sw', label: 'SW', min: 0, max: 1,    step: 1 },
  ],
  pins: [
    { id: 'gnd',  label: 'GND', type: PIN_TYPE.GND,     x:  8, y: 60, side: 'bottom' },
    { id: 'vcc',  label: 'VCC', type: PIN_TYPE.POWER,   x: 20, y: 60, side: 'bottom' },
    { id: 'x',    label: 'X',   type: PIN_TYPE.ANALOG,  x: 32, y: 60, side: 'bottom' },
    { id: 'y',    label: 'Y',   type: PIN_TYPE.ANALOG,  x: 44, y: 60, side: 'bottom' },
    { id: 'sw',   label: 'SW',  type: PIN_TYPE.DIGITAL, x: 56, y: 60, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const xv = inst.runtimeState && inst.runtimeState.x !== undefined ? inst.runtimeState.x : (inst.props.x || 512);
    const yv = inst.runtimeState && inst.runtimeState.y !== undefined ? inst.runtimeState.y : (inst.props.y || 512);
    const pressed = inst.runtimeState && inst.runtimeState.sw !== undefined ? !!inst.runtimeState.sw : !!(inst.props.sw || 0);
    const stickX = (xv / 1023 - 0.5) * 12;
    const stickY = (yv / 1023 - 0.5) * 12;

    ctx.save();
    ctx.translate(x, y);

    // Leads
    ctx.strokeStyle = '#c8a84b';
    ctx.lineWidth = 1.5;
    [[8,60],[20,60],[32,60],[44,60],[56,60]].forEach(([px,py]) => {
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, 54); ctx.stroke();
    });

    // Base
    ctx.fillStyle = '#26303a';
    roundRect(ctx, 2, 6, 56, 48, 5);
    ctx.fill();
    ctx.strokeStyle = '#4a5a68';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Thumb pad base
    ctx.fillStyle = '#34424e';
    ctx.beginPath(); ctx.arc(30, 28, 18, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#55677a';
    ctx.stroke();

    // Direction guides
    ctx.strokeStyle = '#55677a';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(30, 12); ctx.lineTo(30, 14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(30, 42); ctx.lineTo(30, 44); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(14, 28); ctx.lineTo(16, 28); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(44, 28); ctx.lineTo(46, 28); ctx.stroke();

    // Stick
    ctx.save();
    ctx.translate(30 + stickX, 28 + stickY);
    ctx.fillStyle = '#c8d0d8';
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a96a2';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#f0f4f8';
    ctx.beginPath(); ctx.arc(-2.5, -2.5, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // SW indicator
    ctx.fillStyle = pressed ? '#ff5555' : '#444';
    ctx.beginPath(); ctx.arc(44, 46, 3, 0, Math.PI * 2); ctx.fill();

    if (inst.selected) drawSelectionRect(ctx, -3, 3, 66, 63);
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

/* ─── LCD 16x2 (I2C) ─── */
defComp({
  id: 'lcd1602_i2c',
  name: 'LCD 16×2 (I2C)',
  category: 'Output',
  icon: '🖥️',
  desc: '16×2 character LCD display with PCF8574 I2C adapter module',
  width: 120,
  height: 65,
  defaultProps: { address: '0x27', line1: 'Hello, I2C!    ', line2: 'Addr: 0x27      ' },
  interactive: [
    { field: 'address', label: 'I2C Addr', type: 'text' },
  ],
  pins: [
    { id: 'gnd', label: 'GND', type: PIN_TYPE.GND,     x: 35, y: 65, side: 'bottom' },
    { id: 'vcc', label: 'VCC', type: PIN_TYPE.POWER,   x: 50, y: 65, side: 'bottom' },
    { id: 'sda', label: 'SDA', type: PIN_TYPE.DIGITAL, x: 65, y: 65, side: 'bottom' },
    { id: 'scl', label: 'SCL', type: PIN_TYPE.DIGITAL, x: 80, y: 65, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const line1 = (inst.runtimeState && inst.runtimeState.line1) || inst.props.line1 || '                ';
    const line2 = (inst.runtimeState && inst.runtimeState.line2) || inst.props.line2 || '                ';
    const powered = inst.runtimeState && inst.runtimeState.powered;

    ctx.save();
    ctx.translate(x, y);

    // Main Green PCB Frame
    ctx.fillStyle = '#1a4a1a';
    roundRect(ctx, 0, 0, 120, 52, 4);
    ctx.fill();
    ctx.strokeStyle = '#2d8c2d';
    ctx.lineWidth = 1;
    ctx.stroke();

    // LCD Screen Area
    ctx.fillStyle = powered ? '#4a7a2a' : '#2a4a1a';
    roundRect(ctx, 6, 5, 108, 42, 3);
    ctx.fill();

    // Display Text
    const txColor = powered ? '#88ff88' : '#556655';
    ctx.fillStyle = txColor;
    ctx.font = 'bold 8px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(line1.substring(0, 16).padEnd(16), 9, 20);
    ctx.fillText(line2.substring(0, 16).padEnd(16), 9, 38);

    // I2C Backpack Board Overlay
    ctx.fillStyle = '#102244';
    roundRect(ctx, 25, 52, 70, 8, 2);
    ctx.fill();
    ctx.strokeStyle = '#2255aa';
    ctx.lineWidth = 1;
    ctx.stroke();

    // PCF8574 Chip & Contrast Trimpot Detail
    ctx.fillStyle = '#222222';
    ctx.fillRect(30, 54, 12, 4);
    ctx.fillStyle = '#ccaa00';
    ctx.fillRect(82, 54, 4, 4);

    // 4 I2C Pin Leads (GND, VCC, SDA, SCL)
    const pinXs = [35, 50, 65, 80];
    ctx.strokeStyle = '#aaaaaa';
    ctx.lineWidth = 1.5;
    pinXs.forEach(px => {
      ctx.beginPath();
      ctx.moveTo(px, 58);
      ctx.lineTo(px, 65);
      ctx.stroke();
    });

    if (inst.selected) drawSelectionRect(ctx, -3, -3, 126, 71);
    ctx.restore();
  }
});

/* ─── OLED 128x64 (SSD1306, I2C) ─── */
defComp({
  id: 'oled_ssd1306',
  name: 'OLED 128×64 (I2C)',
  category: 'Output',
  icon: '🖥️',
  desc: '128×64 monochrome OLED display with SSD1306 controller (I2C)',
  width: 132,
  height: 76,
  defaultProps: { address: '0x3C' },
  interactive: [
    { field: 'address', label: 'I2C Addr', type: 'text' },
  ],
  pins: [
    { id: 'gnd', label: 'GND', type: PIN_TYPE.GND,     x: 36, y: 76, side: 'bottom' },
    { id: 'vcc', label: 'VCC', type: PIN_TYPE.POWER,   x: 52, y: 76, side: 'bottom' },
    { id: 'scl', label: 'SCL', type: PIN_TYPE.DIGITAL, x: 68, y: 76, side: 'bottom' },
    { id: 'sda', label: 'SDA', type: PIN_TYPE.DIGITAL, x: 84, y: 76, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const o = inst.runtimeState && inst.runtimeState.oled;

    ctx.save();
    ctx.translate(x, y);

    // PCB
    ctx.fillStyle = '#0e1a2a';
    roundRect(ctx, 0, 0, 132, 70, 4);
    ctx.fill();
    ctx.strokeStyle = '#2a4a6a';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Screen (128×64 internal, rendered 1:1)
    ctx.fillStyle = o && o.power ? '#06121c' : '#0a1620';
    roundRect(ctx, 2, 2, 128, 64, 2);
    ctx.fill();

    if (o && o.pixels) {
      const lit = o.invert ? '#0a1620' : '#7fd4ff';
      const dim = o.invert ? '#7fd4ff' : '#0a1620';
      if (o.invert) {
        // Inverted display: full screen lit, "on" pixels carved out in dark
        ctx.fillStyle = dim;
        ctx.fillRect(2, 2, 128, 64);
      }
      ctx.fillStyle = lit;
      const px = o.pixels;
      for (let i = 0; i < px.length; i++) {
        if (!px[i]) continue;
        ctx.fillRect(i % 128, (i / 128) | 0, 1, 1);
      }
    }

    // Text layer (Adafruit_GFX setCursor(x, y) is the top-left of the text;
    // canvas fillText y is the baseline, so offset by the line height)
    if (o && o.texts) {
      ctx.textAlign = 'left';
      for (const t of o.texts) {
        ctx.font = `${t.size * 8}px JetBrains Mono, monospace`;
        ctx.fillStyle = (o.invert ? t.color === 0 : t.color === 1) ? '#7fd4ff' : '#06121c';
        ctx.fillText(t.text, t.x, t.y + t.size * 8);
      }
    }

    if (!o || !o.power) {
      // Idle splash so the component reads as an OLED even before running
      ctx.fillStyle = 'rgba(127,212,255,0.25)';
      ctx.font = '8px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ArduSim', 66, 38);
    }

    // Label
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '7px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`OLED ${inst.props.address || '0x3C'}`, 66, 68);

    // 4 I2C Pin Leads (GND, VCC, SCL, SDA)
    ctx.strokeStyle = '#aaaaaa';
    ctx.lineWidth = 1.5;
    [36, 52, 68, 84].forEach(px => {
      ctx.beginPath();
      ctx.moveTo(px, 70);
      ctx.lineTo(px, 76);
      ctx.stroke();
    });

    if (inst.selected) drawSelectionRect(ctx, -3, -3, 138, 82);
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
  { category: 'Boards',    ids: ['arduino_uno', 'esp32_devkit_v1'] },
  { category: 'Output',    ids: ['led', 'multi_led_array', 'rgb_led', 'buzzer', 'seg7', 'lcd1602', 'lcd1602_i2c', 'oled_ssd1306'] },
  { category: 'Input',     ids: ['push_button', 'potentiometer', 'joystick'] },
  { category: 'Actuators', ids: ['servo', 'dc_motor', 'relay'] },
  { category: 'Sensors',   ids: ['dht11', 'hcsr04', 'ldr', 'pir'] },
  { category: 'Passive',   ids: ['resistor', 'capacitor', 'breadboard'] },
  { category: 'Power',     ids: ['power_5v', 'power_gnd'] },
];

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
