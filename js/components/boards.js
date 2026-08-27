/* components/boards.js — Arduino & ESP32 board definitions */
// 'use strict';

/* ──────────────────── BOARDS ──────────────────── */
defComp({
  id: 'arduino_uno',
  name: 'Arduino Uno R3',
  category: 'Boards',
  icon: '🎛️',
  desc: 'ATmega328P microcontroller board with digital and analog I/O pins',
  width: 230,
  height: 150,
  defaultProps: { label: 'UNO' },
  pins: [
    // Digital pins top row (D0â€“D13, from left), then GND + AREF
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
    //I2C PIN on right side
    { id:'SDA',  label:'SDA',  type:PIN_TYPE.SIGNAL, x:220, y:100, side:'right' },
    { id:'SCL',  label:'SCL',  type:PIN_TYPE.SIGNAL, x:220, y:110, side:'right' },
    { id:'5V2',  label:'5V',   type:PIN_TYPE.POWER, x:220, y:120, side:'right' },
    { id:'GND3', label:'GND',  type:PIN_TYPE.GND,   x:220, y:130, side:'right' },
    
  ],
  draw(ctx, inst, sim) {
    const { x, y, width: W, height: H } = inst;

    /*-------------------------------PCB body-------------------------*/
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

    // -------------------------- Silkscreen frame -------------------------
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    roundRect(ctx, 5, 5, W - 10, H - 10, 6);
    ctx.stroke();

    // ---------------------- Subtle copper traces ----------------------------
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

    // -------------------- USB Type-B connector (left edge) -------------------------
    ctx.fillStyle = '#7f8c8d';
    roundRect(ctx, -16, 32, 18, 26, 3);
    ctx.fill();
    ctx.fillStyle = '#3a3a3a';
    roundRect(ctx, -13, 35, 12, 20, 2);
    ctx.fill();
    ctx.fillStyle = '#d5d8dc';
    roundRect(ctx, -10, 42, 9, 5, 1);
    ctx.fill();

    // ------------------ 16U2 USB-serial chip (top-left) --------------------------
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

    // â”€â”€ ATmega328P DIP (center) â”€â”€
    const chipX = 70, chipY = 60, chipW = 76, chipH = 32;
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

    // â”€â”€ ICSP header (right of chip) â”€â”€
    ctx.fillStyle = '#151517';
    roundRect(ctx, 168, 62, 20, 24, 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 2; col++) {
        const sx = 174 + col * 8;
        const sy = 67 + row * 7;
        ctx.fillStyle = '#c8b06a';
        ctx.beginPath(); ctx.arc(sx, sy, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0c0c0e';
        ctx.beginPath(); ctx.arc(sx, sy, 0.9, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.fillStyle = '#bfbfbf';
    ctx.font = '4.5px sans-serif';
    ctx.fillText('ICSP', 178, 60);

    // â”€â”€ Crystal oscillator â”€â”€
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

    // â”€â”€ Reset button (bottom-left) â”€â”€
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

    // â”€â”€ Barrel jack (bottom-left edge) â”€â”€
    ctx.fillStyle = '#1c1c1c';
    roundRect(ctx, -14, 100, 20, 26, 4);
    ctx.fill();
    ctx.fillStyle = '#4a4a4a';
    ctx.beginPath(); ctx.arc(-4, 113, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1c1c1c';
    ctx.beginPath(); ctx.arc(-4, 113, 3, 0, Math.PI * 2); ctx.fill();

    // â”€â”€ Voltage regulator (SOT-223, right-bottom) â”€â”€
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

    // â”€â”€ Electrolytic capacitors â”€â”€
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

    // â”€â”€ Status LEDs â”€â”€
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

    // â”€â”€ Header strips â”€â”€
    const topHoles = [], analogHoles = [], powerHoles = [];
    for (let i = 0; i < 16; i++) topHoles.push(10 + i * 14);
    for (let i = 0; i < 6; i++) { analogHoles.push(14 + i * 14); powerHoles.push(104 + i * 14); }
    drawHeaderStrip(ctx, 4, 6, 222, topHoles, 12);
    drawHeaderStrip(ctx, 4, 128, 94, analogHoles, 134);
    drawHeaderStrip(ctx, 96, 128, 90, powerHoles, 134);

    // â”€â”€ Silkscreen labels â”€â”€
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ARDUINO', 196, 48);
    ctx.font = 'bold 6px sans-serif';
    ctx.fillText('UNO', 196, 57);

    // â”€â”€ Pin labels (silkscreen, always readable) â”€â”€
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
    const i2cLabels= ['SDA','SCL','5V','GND'];
    for (let i = 0; i < 16; i++) paintPinLabel(topHoles[i], 25, topLabels[i]);
    for (let i = 0; i < 6; i++)  paintPinLabel(analogHoles[i], 120, analogLabels[i]);
    for (let i = 0; i < 6; i++)  paintPinLabel(powerHoles[i], 120, powerLabels[i]);
    for (let i = 0; i < 4; i++)  paintPinLabel(205, 100 + i * 10, i2cLabels[i]);   

    // Vertical "MADE IN ITALY" on the right edge
    ctx.save();
    ctx.translate(220, 36);
    ctx.rotate(Math.PI / 2);
    ctx.font = '5px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText('MADE IN ITALY', 0, 0);
    ctx.restore();

    // â”€â”€ Selection outline â”€â”€
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






/* ──────────────────── esp32_devkit_v1 BOARDS ──────────────────── */
defComp({
  id: 'esp32_devkit_v1',
  name: 'ESP32 DevKit V1',
  category: 'Boards',
  icon: '🖲️',
  desc: 'ESP-WROOM-32 dual-core 3.3V WiFi/BLE development board',
  width: 170,
  height: 272,
  defaultProps: { label: 'ESP32' },
  pins: [
    // Left header (from top)
    { id: 'EN', label: 'EN', type: PIN_TYPE.SIGNAL, x: 16, y: 40, side: 'left', gpio: 0 },
    { id: 'VP', label: 'VP', type: PIN_TYPE.ANALOG, x: 16, y: 55, side: 'left', gpio: 36 },
    { id: 'VN', label: 'VN', type: PIN_TYPE.ANALOG, x: 16, y: 70, side: 'left', gpio: 39 },
    { id: 'D34', label: 'D34', type: PIN_TYPE.ANALOG, x: 16, y: 85, side: 'left', gpio: 34 },
    { id: 'D35', label: 'D35', type: PIN_TYPE.ANALOG, x: 16, y: 100, side: 'left', gpio: 35 },
    { id: 'D32', label: 'D32', type: PIN_TYPE.ANALOG, x: 16, y: 115, side: 'left', gpio: 32 },
    { id: 'D33', label: 'D33', type: PIN_TYPE.ANALOG, x: 16, y: 130, side: 'left', gpio: 33 },
    { id: 'D25', label: 'D25', type: PIN_TYPE.ANALOG, x: 16, y: 145, side: 'left', gpio: 25 },
    { id: 'D26', label: 'D26', type: PIN_TYPE.ANALOG, x: 16, y: 160, side: 'left', gpio: 26 },
    { id: 'D27', label: 'D27', type: PIN_TYPE.PWM, x: 16, y: 175, side: 'left', gpio: 27 },
    { id: 'D14', label: 'D14', type: PIN_TYPE.PWM, x: 16, y: 190, side: 'left', gpio: 14 },
    { id: 'D12', label: 'D12', type: PIN_TYPE.PWM, x: 16, y: 205, side: 'left', gpio: 12 },
    { id: 'D13', label: 'D13', type: PIN_TYPE.PWM, x: 16, y: 220, side: 'left', gpio: 13 },
    { id: 'GND1', label: 'GND', type: PIN_TYPE.GND, x: 16, y: 235, side: 'left' },
    { id: 'VIN', label: 'VIN', type: PIN_TYPE.POWER, x: 16, y: 250, side: 'left' },
    // Right header (from top)
    { id: 'D23', label: 'D23', type: PIN_TYPE.PWM, x: 154, y: 40, side: 'right', gpio: 23 },
    { id: 'D22', label: 'D22', type: PIN_TYPE.PWM, x: 154, y: 55, side: 'right', gpio: 22 },
    { id: 'TX0', label: 'TX0', type: PIN_TYPE.SIGNAL, x: 154, y: 70, side: 'right', gpio: 1 },
    { id: 'RX0', label: 'RX0', type: PIN_TYPE.SIGNAL, x: 154, y: 85, side: 'right', gpio: 3 },
    { id: 'D21', label: 'D21', type: PIN_TYPE.PWM, x: 154, y: 100, side: 'right', gpio: 21 },
    { id: 'D19', label: 'D19', type: PIN_TYPE.PWM, x: 154, y: 115, side: 'right', gpio: 19 },
    { id: 'D18', label: 'D18', type: PIN_TYPE.PWM, x: 154, y: 130, side: 'right', gpio: 18 },
    { id: 'D5', label: 'D5', type: PIN_TYPE.PWM, x: 154, y: 145, side: 'right', gpio: 5 },
    { id: 'D17', label: 'D17', type: PIN_TYPE.PWM, x: 154, y: 160, side: 'right', gpio: 17 },
    { id: 'D16', label: 'D16', type: PIN_TYPE.PWM, x: 154, y: 175, side: 'right', gpio: 16 },
    { id: 'D4', label: 'D4', type: PIN_TYPE.PWM, x: 154, y: 190, side: 'right', gpio: 4 },
    { id: 'D2', label: 'D2', type: PIN_TYPE.PWM, x: 154, y: 205, side: 'right', gpio: 2 },
    { id: 'D15', label: 'D15', type: PIN_TYPE.PWM, x: 154, y: 220, side: 'right', gpio: 15 },
    { id: 'GND2', label: 'GND', type: PIN_TYPE.GND, x: 154, y: 235, side: 'right' },
    { id: '3V3', label: '3V3', type: PIN_TYPE.POWER, x: 154, y: 250, side: 'right' },
  ],
  draw(ctx, inst, sim) {
    const { x, y, width: W, height: H } = inst;
    const WROOM_W = 92, WROOM_H = 118, WROOM_X = 39, WROOM_Y = 18;

    ctx.save();
    ctx.translate(x, y);

    // ── PCB body with enhanced gradient ──
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#16202a');
    grad.addColorStop(0.3, '#1e2d3a');
    grad.addColorStop(0.6, '#1a2632');
    grad.addColorStop(1, '#0e151d');
    ctx.fillStyle = grad;
    roundRect(ctx, 0, 0, W, H, 6);
    ctx.fill();

    ctx.shadowColor = 'rgba(0,100,200,0.05)';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = '#2a3a4a';
    ctx.lineWidth = 1.5;
    roundRect(ctx, 0, 0, W, H, 6);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // ── Silkscreen frame ──
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    roundRect(ctx, 3, 3, W - 6, H - 6, 5);
    ctx.stroke();

    // ── ESP-WROOM-32 metal shield (enhanced) ──
    // Shield shadow
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#b8c2cc';
    roundRect(ctx, WROOM_X, WROOM_Y, WROOM_W, WROOM_H, 3);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Shield gradient
    const shieldGrad = ctx.createLinearGradient(WROOM_X, WROOM_Y, WROOM_X, WROOM_Y + WROOM_H);
    shieldGrad.addColorStop(0, '#d0d8e0');
    shieldGrad.addColorStop(0.3, '#c0c8d0');
    shieldGrad.addColorStop(0.7, '#b0b8c0');
    shieldGrad.addColorStop(1, '#a0a8b0');
    ctx.fillStyle = shieldGrad;
    roundRect(ctx, WROOM_X, WROOM_Y, WROOM_W, WROOM_H, 3);
    ctx.fill();

    ctx.strokeStyle = '#8a949e';
    ctx.lineWidth = 1;
    roundRect(ctx, WROOM_X, WROOM_Y, WROOM_W, WROOM_H, 3);
    ctx.stroke();

    // Shield trace pattern
    ctx.strokeStyle = 'rgba(60,70,80,0.3)';
    ctx.lineWidth = 0.6;
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      ctx.moveTo(WROOM_X + 6, WROOM_Y + 14 + i * 9);
      ctx.lineTo(WROOM_X + WROOM_W - 6, WROOM_Y + 14 + i * 9);
      ctx.stroke();
    }

    // Shield text
    ctx.fillStyle = '#2a333d';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ESP-WROOM-32', WROOM_X + WROOM_W / 2, WROOM_Y + WROOM_H / 2 + 8);
    ctx.font = '5px monospace';
    ctx.fillStyle = '#3a4350';
    ctx.fillText('FLASH 4MB · DUAL CORE · WiFi+BT', WROOM_X + WROOM_W / 2, WROOM_Y + WROOM_H / 2 + 22);

    // PCB antenna area
    ctx.fillStyle = 'rgba(200,180,140,0.08)';
    roundRect(ctx, WROOM_X + 70, WROOM_Y + 4, 18, 18, 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,180,140,0.15)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(WROOM_X + 72, WROOM_Y + 6 + i * 3.5);
      ctx.lineTo(WROOM_X + 86, WROOM_Y + 6 + i * 3.5);
      ctx.stroke();
    }

    // ── 32.768kHz crystal ──
    ctx.fillStyle = '#0d0d0d';
    roundRect(ctx, 8, 34, 16, 12, 2);
    ctx.fill();
    ctx.fillStyle = '#3d464e';
    roundRect(ctx, 146, 34, 16, 12, 2);
    ctx.fill();
    ctx.fillStyle = '#aaa';
    ctx.font = '4px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('32kHz', 16, 42);

    // ── USB connector (enhanced) ──
    ctx.fillStyle = '#5a6370';
    roundRect(ctx, W / 2 - 11, H - 26, 22, 26, 3);
    ctx.fill();
    ctx.fillStyle = '#2a2f36';
    roundRect(ctx, W / 2 - 7, H - 20, 14, 8, 1);
    ctx.fill();
    ctx.fillStyle = '#c8b06a';
    for (let i = 0; i < 4; i++) {
      roundRect(ctx, W / 2 - 5 + i * 3, H - 18, 1.5, 4, 0.5);
      ctx.fill();
    }

    // ── Header strips (enhanced) ──
    const leftYs = this.pins.filter(p => p.side === 'left').map(p => p.y);
    const rightYs = this.pins.filter(p => p.side === 'right').map(p => p.y);

    const drawVertHeader = (hx, holeYs, holeX) => {
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 4;
      ctx.fillStyle = '#14181c';
      roundRect(ctx, hx, 32, 16, H - 62, 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
      for (const hy of holeYs) {
        // Gold pin
        ctx.fillStyle = '#c8b06a';
        ctx.shadowColor = 'rgba(200,176,106,0.2)';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(holeX, hy, 4.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Pin hole
        ctx.fillStyle = '#0a0a0c';
        ctx.beginPath();
        ctx.arc(holeX, hy, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    drawVertHeader(8, leftYs, 16);
    drawVertHeader(146, rightYs, 154);

    // ── Pin labels with color coding ──
    ctx.font = 'bold 5px monospace';
    for (const pin of this.pins) {
      const pw = ctx.measureText(pin.label).width + 4;
      let bx;
      if (pin.side === 'left') bx = pin.x - 3 - pw;
      else bx = pin.x + 3;

      // Background color based on pin type
      let bgColor = 'rgba(6,12,18,0.85)';
      if (pin.type === PIN_TYPE.POWER) bgColor = 'rgba(180,40,40,0.8)';
      else if (pin.type === PIN_TYPE.GND) bgColor = 'rgba(40,40,40,0.8)';
      else if (pin.type === PIN_TYPE.ANALOG) bgColor = 'rgba(30,80,120,0.8)';
      else if (pin.type === PIN_TYPE.PWM) bgColor = 'rgba(120,80,30,0.8)';

      ctx.fillStyle = bgColor;
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 2;
      roundRect(ctx, bx, pin.y - 3.5, pw, 7, 1.5);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#dbe4ea';
      ctx.textAlign = pin.side === 'left' ? 'right' : 'left';
      ctx.fillText(pin.label, bx + (pin.side === 'left' ? pw - 2 : 2), pin.y + 1.5);
    }

    // ── Built-in LED (GPIO2) ──
    const ledCx = 66, ledCy = 208;
    const lit = sim && sim.pinStates && (sim.pinStates.pin_2 || 0) > 0;
    drawLED_on_board(ctx, ledCx, ledCy, lit ? '#ffdd33' : '#444', 4);
    ctx.fillStyle = '#8b949e';
    ctx.font = 'bold 5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('L', ledCx, ledCy + 10);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '4px monospace';
    ctx.fillText('GPIO2', ledCx, ledCy - 6);

    // ── Board name (enhanced) ──
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ESP32', W / 2, H - 6);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '5px monospace';
    ctx.fillText('DEVKIT V1', W / 2, H - 0.5);
    ctx.shadowBlur = 0;

    // ── Selection outline ──
    if (inst.selected) {
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 15;
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      roundRect(ctx, -3, -3, W + 6, H + 6, 8);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }
});

// ─── Helper: drawHeaderStrip (enhanced) ───
function drawHeaderStrip(ctx, x, y, width, holeXs, baselineY, pinColor = '#c8b06a') {
  // Black strip
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 3;
  ctx.fillStyle = '#111111';
  roundRect(ctx, x, baselineY - 10, width, 20, 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 0.5;
  roundRect(ctx, x, baselineY - 10, width, 20, 2);
  ctx.stroke();

  // Pins
  for (const hx of holeXs) {
    ctx.fillStyle = pinColor;
    ctx.shadowColor = 'rgba(200,176,106,0.2)';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(hx, baselineY, 4.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0b0b0d';
    ctx.beginPath();
    ctx.arc(hx, baselineY, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ─── Helper: drawLED_on_board (enhanced) ───
function drawLED_on_board(ctx, cx, cy, color, radius) {
  // LED glow
  if (color !== '#444' && color !== '#555') {
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
  }
  // LED body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // LED highlight
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.arc(cx - radius * 0.3, cy - radius * 0.3, radius * 0.35, 0, Math.PI * 2);
  ctx.fill();

  // LED ring
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
}