/* ═══════════════════════════════════════════════════════════
   components/ics.js — Digital IC component definitions
   Real 74-series & 555 DIP pinouts (breadboard 17px pin spacing)
   
   Standard Horizontal DIP Pinout Rules (Notch on LEFT):
   - Bottom row (x=0 to right): Pins 1, 2, ..., N/2
   - Top row (x=0 to right):    Pins N, N-1, ..., (N/2)+1
   - Pin 1 dot: Located at lower-left near Pin 1
   - Notch: Semi-circle on left edge of IC body
   ═══════════════════════════════════════════════════════════ */

'use strict';

/* ══════════════════════════════════════════════════════════
   555 TIMER IC (NE555 / LM555) — 8-Pin DIP
   
   Real pinout:
   Pin 1: GND    Pin 8: VCC
   Pin 2: TRIG   Pin 7: DIS (Discharge)
   Pin 3: OUT    Pin 6: THR (Threshold)
   Pin 4: RST    Pin 5: CV  (Control Voltage)
   ══════════════════════════════════════════════════════════ */
defComp({
  id: 'ic_555',
  name: '555 Timer IC',
  category: 'Digital ICs',
  icon: '⮗',
  desc: 'NE555 precision timer — operates in astable, monostable, or bistable mode',
  width: 68,
  height: 50,
  defaultProps: { mode: 'astable', frequency: 1000, dutyCycle: 50 },
  pins: [
    /* Bottom row (pins 1-4, left to right) */
    { id: 'GND',  label: '1', type: PIN_TYPE.GND,     x:  0, y: 50, side: 'bottom' },
    { id: 'TRIG', label: '2', type: PIN_TYPE.DIGITAL, x: 17, y: 50, side: 'bottom' },
    { id: 'OUT',  label: '3', type: PIN_TYPE.DIGITAL, x: 34, y: 50, side: 'bottom' },
    { id: 'RST',  label: '4', type: PIN_TYPE.DIGITAL, x: 51, y: 50, side: 'bottom' },
    /* Top row (pins 8-5, left to right) */
    { id: 'VCC',  label: '8', type: PIN_TYPE.POWER,   x:  0, y:  0, side: 'top' },
    { id: 'DIS',  label: '7', type: PIN_TYPE.DIGITAL, x: 17, y:  0, side: 'top' },
    { id: 'THR',  label: '6', type: PIN_TYPE.DIGITAL, x: 34, y:  0, side: 'top' },
    { id: 'CV',   label: '5', type: PIN_TYPE.SIGNAL,  x: 51, y:  0, side: 'top' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const outHigh = inst.runtimeState && inst.runtimeState.outHigh;

    ctx.save();
    ctx.translate(x, y);

    // Pin leads
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    [0, 17, 34, 51].forEach(px => {
      ctx.beginPath(); ctx.moveTo(px, 40); ctx.lineTo(px, 50); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, 10); ctx.lineTo(px, 0); ctx.stroke();
    });

    // DIP body
    const grad = ctx.createLinearGradient(0, 10, 68, 40);
    grad.addColorStop(0, '#1a1a1a');
    grad.addColorStop(1, '#0c0c0c');
    ctx.fillStyle = grad;
    roundRect(ctx, -6, 10, 63, 30, 3);
    ctx.fill();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Left notch
    ctx.beginPath();
    ctx.arc(-6, 25, 4, -Math.PI / 2, Math.PI / 2);
    ctx.strokeStyle = '#666';
    ctx.stroke();

    // Pin 1 dot (bottom-left)
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.arc(0, 32, 2, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 8px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NE555', 25, 23);

    // Output indicator LED
    ctx.fillStyle = outHigh ? '#33ff66' : '#334433';
    ctx.beginPath();
    ctx.arc(25, 32, 2.5, 0, Math.PI * 2);
    ctx.fill();
    if (outHigh) { ctx.shadowColor = '#33ff66'; ctx.shadowBlur = 4; }
    ctx.beginPath();
    ctx.arc(25, 32, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (inst.selected) drawSelectionRect(ctx, -10, -4, 72, 58);
    ctx.restore();
  }
});

/* ══════════════════════════════════════════════════════════
   74HC00 — Quad 2-Input NAND Gate (14-pin DIP)
   
   Real pinout:
   Pin 1: 1A    Pin 8:  3Y
   Pin 2: 1B    Pin 9:  3A
   Pin 3: 1Y    Pin 10: 3B
   Pin 4: 2A    Pin 11: 4Y
   Pin 5: 2B    Pin 12: 4A
   Pin 6: 2Y    Pin 13: 4B
   Pin 7: GND   Pin 14: VCC
   ══════════════════════════════════════════════════════════ */
defComp({
  id: 'ic_74hc00',
  name: '74HC00 Quad NAND',
  category: 'Digital ICs',
  icon: '⮗',
  desc: 'Quad 2-input NAND gate — outputs LOW only when both inputs are HIGH',
  width: 119,
  height: 50,
  defaultProps: {},
  pins: [
    /* Bottom row (pins 1-7, left to right) */
    { id: 'A1',  label: '1',  type: PIN_TYPE.DIGITAL, x:   0, y: 50, side: 'bottom' },
    { id: 'B1',  label: '2',  type: PIN_TYPE.DIGITAL, x:  17, y: 50, side: 'bottom' },
    { id: 'Y1',  label: '3',  type: PIN_TYPE.DIGITAL, x:  34, y: 50, side: 'bottom' },
    { id: 'A2',  label: '4',  type: PIN_TYPE.DIGITAL, x:  51, y: 50, side: 'bottom' },
    { id: 'B2',  label: '5',  type: PIN_TYPE.DIGITAL, x:  68, y: 50, side: 'bottom' },
    { id: 'Y2',  label: '6',  type: PIN_TYPE.DIGITAL, x:  85, y: 50, side: 'bottom' },
    { id: 'GND', label: '7',  type: PIN_TYPE.GND,     x: 102, y: 50, side: 'bottom' },
    /* Top row (pins 14-8, left to right) */
    { id: 'VCC', label: '14', type: PIN_TYPE.POWER,   x:   0, y:  0, side: 'top' },
    { id: 'B4',  label: '13', type: PIN_TYPE.DIGITAL, x:  17, y:  0, side: 'top' },
    { id: 'A4',  label: '12', type: PIN_TYPE.DIGITAL, x:  34, y:  0, side: 'top' },
    { id: 'Y4',  label: '11', type: PIN_TYPE.DIGITAL, x:  51, y:  0, side: 'top' },
    { id: 'B3',  label: '10', type: PIN_TYPE.DIGITAL, x:  68, y:  0, side: 'top' },
    { id: 'A3',  label: '9',  type: PIN_TYPE.DIGITAL, x:  85, y:  0, side: 'top' },
    { id: 'Y3',  label: '8',  type: PIN_TYPE.DIGITAL, x: 102, y:  0, side: 'top' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    ctx.save();
    ctx.translate(x, y);

    // Pin leads
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= 6; i++) {
      const px = i * 17;
      ctx.beginPath(); ctx.moveTo(px, 40); ctx.lineTo(px, 50); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, 10); ctx.lineTo(px, 0); ctx.stroke();
    }

    // DIP body
    ctx.fillStyle = '#1a1a1a';
    roundRect(ctx, -6, 10, 114, 30, 3);
    ctx.fill();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Left notch
    ctx.beginPath(); ctx.arc(-6, 25, 4, -Math.PI / 2, Math.PI / 2);
    ctx.strokeStyle = '#666'; ctx.stroke();

    // Pin 1 dot
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(0, 32, 2, 0, Math.PI * 2); ctx.fill();

    // Label
    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 8px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('74HC00', 51, 23);
    ctx.font = '5px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('Quad NAND', 51, 32);

    // NAND Gate symbols
    const drawNandGate = (cx, cy) => {
      ctx.strokeStyle = '#00979c'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy - 3); ctx.lineTo(cx, cy - 3);
      ctx.arc(cx, cy, 3, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(cx - 5, cy + 3); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + 4, cy, 1, 0, Math.PI * 2); ctx.stroke();
    };
    drawNandGate(20, 25); drawNandGate(36, 25);
    drawNandGate(66, 25); drawNandGate(82, 25);

    if (inst.selected) drawSelectionRect(ctx, -10, -4, 123, 58);
    ctx.restore();
  }
});

/* ══════════════════════════════════════════════════════════
   74HC04 — Hex Inverter / NOT Gate (14-pin DIP)
   
   Real pinout:
   Pin 1: 1A    Pin 8:  4Y
   Pin 2: 1Y    Pin 9:  4A
   Pin 3: 2A    Pin 10: 5Y
   Pin 4: 2Y    Pin 11: 5A
   Pin 5: 3A    Pin 12: 6Y
   Pin 6: 3Y    Pin 13: 6A
   Pin 7: GND   Pin 14: VCC
   ══════════════════════════════════════════════════════════ */
defComp({
  id: 'ic_74hc04',
  name: '74HC04 Hex NOT',
  category: 'Digital ICs',
  icon: '⮗',
  desc: 'Hex inverter — 6 NOT gates that invert input signals',
  width: 119,
  height: 50,
  defaultProps: {},
  pins: [
    /* Bottom row (pins 1-7) */
    { id: 'A1',  label: '1',  type: PIN_TYPE.DIGITAL, x:   0, y: 50, side: 'bottom' },
    { id: 'Y1',  label: '2',  type: PIN_TYPE.DIGITAL, x:  17, y: 50, side: 'bottom' },
    { id: 'A2',  label: '3',  type: PIN_TYPE.DIGITAL, x:  34, y: 50, side: 'bottom' },
    { id: 'Y2',  label: '4',  type: PIN_TYPE.DIGITAL, x:  51, y: 50, side: 'bottom' },
    { id: 'A3',  label: '5',  type: PIN_TYPE.DIGITAL, x:  68, y: 50, side: 'bottom' },
    { id: 'Y3',  label: '6',  type: PIN_TYPE.DIGITAL, x:  85, y: 50, side: 'bottom' },
    { id: 'GND', label: '7',  type: PIN_TYPE.GND,     x: 102, y: 50, side: 'bottom' },
    /* Top row (pins 14-8) */
    { id: 'VCC', label: '14', type: PIN_TYPE.POWER,   x:   0, y:  0, side: 'top' },
    { id: 'A6',  label: '13', type: PIN_TYPE.DIGITAL, x:  17, y:  0, side: 'top' },
    { id: 'Y6',  label: '12', type: PIN_TYPE.DIGITAL, x:  34, y:  0, side: 'top' },
    { id: 'A5',  label: '11', type: PIN_TYPE.DIGITAL, x:  51, y:  0, side: 'top' },
    { id: 'Y5',  label: '10', type: PIN_TYPE.DIGITAL, x:  68, y:  0, side: 'top' },
    { id: 'A4',  label: '9',  type: PIN_TYPE.DIGITAL, x:  85, y:  0, side: 'top' },
    { id: 'Y4',  label: '8',  type: PIN_TYPE.DIGITAL, x: 102, y:  0, side: 'top' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    ctx.save();
    ctx.translate(x, y);

    // Pin leads
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= 6; i++) {
      const px = i * 17;
      ctx.beginPath(); ctx.moveTo(px, 40); ctx.lineTo(px, 50); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, 10); ctx.lineTo(px, 0); ctx.stroke();
    }

    // DIP body
    ctx.fillStyle = '#1a1a1a';
    roundRect(ctx, -6, 10, 114, 30, 3);
    ctx.fill();
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.stroke();

    // Left notch
    ctx.beginPath(); ctx.arc(-6, 25, 4, -Math.PI / 2, Math.PI / 2);
    ctx.strokeStyle = '#666'; ctx.stroke();

    // Pin 1 dot
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(0, 32, 2, 0, Math.PI * 2); ctx.fill();

    // Label
    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 8px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('74HC04', 51, 23);
    ctx.font = '5px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('Hex NOT', 51, 32);

    // NOT gate symbols
    const drawNotGate = (cx, cy) => {
      ctx.strokeStyle = '#00979c'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy - 3); ctx.lineTo(cx + 2, cy); ctx.lineTo(cx - 4, cy + 3);
      ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + 3.5, cy, 1, 0, Math.PI * 2); ctx.stroke();
    };
    drawNotGate(18, 25); drawNotGate(34, 25); drawNotGate(68, 25); drawNotGate(84, 25);

    if (inst.selected) drawSelectionRect(ctx, -10, -4, 123, 58);
    ctx.restore();
  }
});

/* ══════════════════════════════════════════════════════════
   74HC08 — Quad 2-Input AND Gate (14-pin DIP)
   
   Real pinout:
   Pin 1: 1A    Pin 8:  3Y
   Pin 2: 1B    Pin 9:  3A
   Pin 3: 1Y    Pin 10: 3B
   Pin 4: 2A    Pin 11: 4Y
   Pin 5: 2B    Pin 12: 4A
   Pin 6: 2Y    Pin 13: 4B
   Pin 7: GND   Pin 14: VCC
   ══════════════════════════════════════════════════════════ */
defComp({
  id: 'ic_74hc08',
  name: '74HC08 Quad AND',
  category: 'Digital ICs',
  icon: '⮗',
  desc: 'Quad 2-input AND gate — outputs HIGH only when both inputs are HIGH',
  width: 119,
  height: 50,
  defaultProps: {},
  pins: [
    /* Bottom row (pins 1-7, left to right) */
    { id: 'A1',  label: '1',  type: PIN_TYPE.DIGITAL, x:   0, y: 50, side: 'bottom' },
    { id: 'B1',  label: '2',  type: PIN_TYPE.DIGITAL, x:  17, y: 50, side: 'bottom' },
    { id: 'Y1',  label: '3',  type: PIN_TYPE.DIGITAL, x:  34, y: 50, side: 'bottom' },
    { id: 'A2',  label: '4',  type: PIN_TYPE.DIGITAL, x:  51, y: 50, side: 'bottom' },
    { id: 'B2',  label: '5',  type: PIN_TYPE.DIGITAL, x:  68, y: 50, side: 'bottom' },
    { id: 'Y2',  label: '6',  type: PIN_TYPE.DIGITAL, x:  85, y: 50, side: 'bottom' },
    { id: 'GND', label: '7',  type: PIN_TYPE.GND,     x: 102, y: 50, side: 'bottom' },
    /* Top row (pins 14-8, left to right) */
    { id: 'VCC', label: '14', type: PIN_TYPE.POWER,   x:   0, y:  0, side: 'top' },
    { id: 'B4',  label: '13', type: PIN_TYPE.DIGITAL, x:  17, y:  0, side: 'top' },
    { id: 'A4',  label: '12', type: PIN_TYPE.DIGITAL, x:  34, y:  0, side: 'top' },
    { id: 'Y4',  label: '11', type: PIN_TYPE.DIGITAL, x:  51, y:  0, side: 'top' },
    { id: 'B3',  label: '10', type: PIN_TYPE.DIGITAL, x:  68, y:  0, side: 'top' },
    { id: 'A3',  label: '9',  type: PIN_TYPE.DIGITAL, x:  85, y:  0, side: 'top' },
    { id: 'Y3',  label: '8',  type: PIN_TYPE.DIGITAL, x: 102, y:  0, side: 'top' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    ctx.save();
    ctx.translate(x, y);

    // Pin leads
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= 6; i++) {
      const px = i * 17;
      ctx.beginPath(); ctx.moveTo(px, 40); ctx.lineTo(px, 50); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, 10); ctx.lineTo(px, 0); ctx.stroke();
    }

    // DIP body
    ctx.fillStyle = '#1a1a1a';
    roundRect(ctx, -6, 10, 114, 30, 3);
    ctx.fill();
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.stroke();

    // Left notch
    ctx.beginPath(); ctx.arc(-6, 25, 4, -Math.PI / 2, Math.PI / 2);
    ctx.strokeStyle = '#666'; ctx.stroke();

    // Pin 1 dot
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(0, 32, 2, 0, Math.PI * 2); ctx.fill();

    // Label
    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 8px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('74HC08', 51, 23);
    ctx.font = '5px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('Quad AND', 51, 32);

    // AND gate symbols
    const drawAndGate = (cx, cy) => {
      ctx.strokeStyle = '#00979c'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy - 3); ctx.lineTo(cx, cy - 3);
      ctx.arc(cx, cy, 3, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(cx - 5, cy + 3); ctx.closePath(); ctx.stroke();
    };
    drawAndGate(20, 25); drawAndGate(36, 25);
    drawAndGate(66, 25); drawAndGate(82, 25);

    if (inst.selected) drawSelectionRect(ctx, -10, -4, 123, 58);
    ctx.restore();
  }
});

/* ══════════════════════════════════════════════════════════
   74HC32 — Quad 2-Input OR Gate (14-pin DIP)
   
   Real pinout:
   Pin 1: 1A    Pin 8:  3Y
   Pin 2: 1B    Pin 9:  3A
   Pin 3: 1Y    Pin 10: 3B
   Pin 4: 2A    Pin 11: 4Y
   Pin 5: 2B    Pin 12: 4A
   Pin 6: 2Y    Pin 13: 4B
   Pin 7: GND   Pin 14: VCC
   ══════════════════════════════════════════════════════════ */
defComp({
  id: 'ic_74hc32',
  name: '74HC32 Quad OR',
  category: 'Digital ICs',
  icon: '⮗',
  desc: 'Quad 2-input OR gate — outputs HIGH when either input is HIGH',
  width: 119,
  height: 50,
  defaultProps: {},
  pins: [
    /* Bottom row (pins 1-7, left to right) */
    { id: 'A1',  label: '1',  type: PIN_TYPE.DIGITAL, x:   0, y: 50, side: 'bottom' },
    { id: 'B1',  label: '2',  type: PIN_TYPE.DIGITAL, x:  17, y: 50, side: 'bottom' },
    { id: 'Y1',  label: '3',  type: PIN_TYPE.DIGITAL, x:  34, y: 50, side: 'bottom' },
    { id: 'A2',  label: '4',  type: PIN_TYPE.DIGITAL, x:  51, y: 50, side: 'bottom' },
    { id: 'B2',  label: '5',  type: PIN_TYPE.DIGITAL, x:  68, y: 50, side: 'bottom' },
    { id: 'Y2',  label: '6',  type: PIN_TYPE.DIGITAL, x:  85, y: 50, side: 'bottom' },
    { id: 'GND', label: '7',  type: PIN_TYPE.GND,     x: 102, y: 50, side: 'bottom' },
    /* Top row (pins 14-8, left to right) */
    { id: 'VCC', label: '14', type: PIN_TYPE.POWER,   x:   0, y:  0, side: 'top' },
    { id: 'B4',  label: '13', type: PIN_TYPE.DIGITAL, x:  17, y:  0, side: 'top' },
    { id: 'A4',  label: '12', type: PIN_TYPE.DIGITAL, x:  34, y:  0, side: 'top' },
    { id: 'Y4',  label: '11', type: PIN_TYPE.DIGITAL, x:  51, y:  0, side: 'top' },
    { id: 'B3',  label: '10', type: PIN_TYPE.DIGITAL, x:  68, y:  0, side: 'top' },
    { id: 'A3',  label: '9',  type: PIN_TYPE.DIGITAL, x:  85, y:  0, side: 'top' },
    { id: 'Y3',  label: '8',  type: PIN_TYPE.DIGITAL, x: 102, y:  0, side: 'top' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    ctx.save();
    ctx.translate(x, y);

    // Pin leads
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= 6; i++) {
      const px = i * 17;
      ctx.beginPath(); ctx.moveTo(px, 40); ctx.lineTo(px, 50); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, 10); ctx.lineTo(px, 0); ctx.stroke();
    }

    // DIP body
    ctx.fillStyle = '#1a1a1a';
    roundRect(ctx, -6, 10, 114, 30, 3);
    ctx.fill();
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.stroke();

    // Left notch
    ctx.beginPath(); ctx.arc(-6, 25, 4, -Math.PI / 2, Math.PI / 2);
    ctx.strokeStyle = '#666'; ctx.stroke();

    // Pin 1 dot
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(0, 32, 2, 0, Math.PI * 2); ctx.fill();

    // Label
    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 8px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('74HC32', 51, 23);
    ctx.font = '5px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('Quad OR', 51, 32);

    // OR gate symbols
    const drawOrGate = (cx, cy) => {
      ctx.strokeStyle = '#00979c'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy - 3);
      ctx.quadraticCurveTo(cx - 1, cy, cx - 5, cy + 3);
      ctx.quadraticCurveTo(cx + 1, cy + 4, cx + 5, cy);
      ctx.quadraticCurveTo(cx + 1, cy - 4, cx - 5, cy - 3);
      ctx.stroke();
    };
    drawOrGate(20, 25); drawOrGate(36, 25);
    drawOrGate(66, 25); drawOrGate(82, 25);

    if (inst.selected) drawSelectionRect(ctx, -10, -4, 123, 58);
    ctx.restore();
  }
});

/* ══════════════════════════════════════════════════════════
   74HC595 — 8-Bit Shift Register (16-pin DIP)
   
   Real pinout:
   Pin 1: QB      Pin 9:  QH' (Serial Out / Q7S)
   Pin 2: QC      Pin 10: SRCLR' (Shift Register Clear)
   Pin 3: QD      Pin 11: SRCLK (Shift Clock)
   Pin 4: QE      Pin 12: RCLK (Latch Clock)
   Pin 5: QF      Pin 13: OE' (Output Enable)
   Pin 6: QG      Pin 14: SER (Serial Input)
   Pin 7: QH      Pin 15: QA
   Pin 8: GND     Pin 16: VCC
   ══════════════════════════════════════════════════════════ */
defComp({
  id: 'ic_74hc595',
  name: '74HC595 Shift Reg',
  category: 'Digital ICs',
  icon: '⮗',
  desc: '8-bit serial-in parallel-out shift register with output latch',
  width: 136,
  height: 50,
  defaultProps: {},
  pins: [
    /* Bottom row (pins 1-8, left to right) */
    { id: 'QB',    label: '1',  type: PIN_TYPE.DIGITAL, x:   0, y: 50, side: 'bottom' },
    { id: 'QC',    label: '2',  type: PIN_TYPE.DIGITAL, x:  17, y: 50, side: 'bottom' },
    { id: 'QD',    label: '3',  type: PIN_TYPE.DIGITAL, x:  34, y: 50, side: 'bottom' },
    { id: 'QE',    label: '4',  type: PIN_TYPE.DIGITAL, x:  51, y: 50, side: 'bottom' },
    { id: 'QF',    label: '5',  type: PIN_TYPE.DIGITAL, x:  68, y: 50, side: 'bottom' },
    { id: 'QG',    label: '6',  type: PIN_TYPE.DIGITAL, x:  85, y: 50, side: 'bottom' },
    { id: 'QH',    label: '7',  type: PIN_TYPE.DIGITAL, x: 102, y: 50, side: 'bottom' },
    { id: 'GND',   label: '8',  type: PIN_TYPE.GND,     x: 119, y: 50, side: 'bottom' },
    /* Top row (pins 16-9, left to right) */
    { id: 'VCC',   label: '16', type: PIN_TYPE.POWER,   x:   0, y:  0, side: 'top' },
    { id: 'QA',    label: '15', type: PIN_TYPE.DIGITAL, x:  17, y:  0, side: 'top' },
    { id: 'SER',   label: '14', type: PIN_TYPE.DIGITAL, x:  34, y:  0, side: 'top' },
    { id: 'OE',    label: '13', type: PIN_TYPE.DIGITAL, x:  51, y:  0, side: 'top' },
    { id: 'RCLK',  label: '12', type: PIN_TYPE.DIGITAL, x:  68, y:  0, side: 'top' },
    { id: 'SRCLK', label: '11', type: PIN_TYPE.DIGITAL, x:  85, y:  0, side: 'top' },
    { id: 'SRCLR', label: '10', type: PIN_TYPE.DIGITAL, x: 102, y:  0, side: 'top' },
    { id: 'QHp',   label: '9',  type: PIN_TYPE.DIGITAL, x: 119, y:  0, side: 'top' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const state = inst.runtimeState || {};
    ctx.save();
    ctx.translate(x, y);

    // Pin leads
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= 7; i++) {
      const px = i * 17;
      ctx.beginPath(); ctx.moveTo(px, 40); ctx.lineTo(px, 50); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, 10); ctx.lineTo(px, 0); ctx.stroke();
    }

    // DIP body
    ctx.fillStyle = '#1a1a1a';
    roundRect(ctx, -6, 10, 131, 30, 3);
    ctx.fill();
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.stroke();

    // Left notch
    ctx.beginPath(); ctx.arc(-6, 25, 4, -Math.PI / 2, Math.PI / 2);
    ctx.strokeStyle = '#666'; ctx.stroke();

    // Pin 1 dot
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(0, 32, 2, 0, Math.PI * 2); ctx.fill();

    // Label
    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 7px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('74HC595', 59, 21);
    ctx.font = '5px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('8-Bit Shift Reg', 59, 28);

    // Output state indicators (8 LEDs for QA-QH)
    const bits = state.bits || 0;
    for (let i = 0; i < 8; i++) {
      const bitOn = (bits >> i) & 1;
      const lx = 8 + i * 14;
      ctx.fillStyle = bitOn ? '#33ff66' : '#334433';
      ctx.beginPath();
      ctx.arc(lx, 34, 2, 0, Math.PI * 2);
      ctx.fill();
      if (bitOn) { ctx.shadowColor = '#33ff66'; ctx.shadowBlur = 3; }
      ctx.beginPath();
      ctx.arc(lx, 34, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    if (inst.selected) drawSelectionRect(ctx, -10, -4, 140, 58);
    ctx.restore();
  }
});

/* ══════════════════════════════════════════════════════════
   74HC138 — 3-to-8 Line Decoder (16-pin DIP)
   
   Real pinout:
   Pin 1: A0 (Addr bit 0)    Pin 9:  Y6' (Output 6)
   Pin 2: A1 (Addr bit 1)    Pin 10: Y5' (Output 5)
   Pin 3: A2 (Addr bit 2)    Pin 11: Y4' (Output 4)
   Pin 4: G2A' (Enable 2A)   Pin 12: Y3' (Output 3)
   Pin 5: G2B' (Enable 2B)   Pin 13: Y2' (Output 2)
   Pin 6: G1   (Enable 1)    Pin 14: Y1' (Output 1)
   Pin 7: Y7' (Output 7)     Pin 15: Y0' (Output 0)
   Pin 8: GND                Pin 16: VCC
   ══════════════════════════════════════════════════════════ */
defComp({
  id: 'ic_74hc138',
  name: '74HC138 Decoder',
  category: 'Digital ICs',
  icon: '⮗',
  desc: '3-to-8 line decoder — activates one of 8 active-LOW outputs based on 3-bit address',
  width: 136,
  height: 50,
  defaultProps: {},
  pins: [
    /* Bottom row (pins 1-8, left to right) */
    { id: 'A0',   label: '1',  type: PIN_TYPE.DIGITAL, x:   0, y: 50, side: 'bottom' },
    { id: 'A1',   label: '2',  type: PIN_TYPE.DIGITAL, x:  17, y: 50, side: 'bottom' },
    { id: 'A2',   label: '3',  type: PIN_TYPE.DIGITAL, x:  34, y: 50, side: 'bottom' },
    { id: 'G2A',  label: '4',  type: PIN_TYPE.DIGITAL, x:  51, y: 50, side: 'bottom' },
    { id: 'G2B',  label: '5',  type: PIN_TYPE.DIGITAL, x:  68, y: 50, side: 'bottom' },
    { id: 'G1',   label: '6',  type: PIN_TYPE.DIGITAL, x:  85, y: 50, side: 'bottom' },
    { id: 'Y7',   label: '7',  type: PIN_TYPE.DIGITAL, x: 102, y: 50, side: 'bottom' },
    { id: 'GND',  label: '8',  type: PIN_TYPE.GND,     x: 119, y: 50, side: 'bottom' },
    /* Top row (pins 16-9, left to right) */
    { id: 'VCC',  label: '16', type: PIN_TYPE.POWER,   x:   0, y:  0, side: 'top' },
    { id: 'Y0',   label: '15', type: PIN_TYPE.DIGITAL, x:  17, y:  0, side: 'top' },
    { id: 'Y1',   label: '14', type: PIN_TYPE.DIGITAL, x:  34, y:  0, side: 'top' },
    { id: 'Y2',   label: '13', type: PIN_TYPE.DIGITAL, x:  51, y:  0, side: 'top' },
    { id: 'Y3',   label: '12', type: PIN_TYPE.DIGITAL, x:  68, y:  0, side: 'top' },
    { id: 'Y4',   label: '11', type: PIN_TYPE.DIGITAL, x:  85, y:  0, side: 'top' },
    { id: 'Y5',   label: '10', type: PIN_TYPE.DIGITAL, x: 102, y:  0, side: 'top' },
    { id: 'Y6',   label: '9',  type: PIN_TYPE.DIGITAL, x: 119, y:  0, side: 'top' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const state = inst.runtimeState || {};
    ctx.save();
    ctx.translate(x, y);

    // Pin leads
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= 7; i++) {
      const px = i * 17;
      ctx.beginPath(); ctx.moveTo(px, 40); ctx.lineTo(px, 50); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, 10); ctx.lineTo(px, 0); ctx.stroke();
    }

    // DIP body
    ctx.fillStyle = '#1a1a1a';
    roundRect(ctx, -6, 10, 131, 30, 3);
    ctx.fill();
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.stroke();

    // Left notch
    ctx.beginPath(); ctx.arc(-6, 25, 4, -Math.PI / 2, Math.PI / 2);
    ctx.strokeStyle = '#666'; ctx.stroke();

    // Pin 1 dot
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(0, 32, 2, 0, Math.PI * 2); ctx.fill();

    // Label
    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 7px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('74HC138', 59, 21);
    ctx.font = '5px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('3-to-8 Decoder', 59, 28);

    // Active output indicator LEDs (8 LEDs)
    const activeY = state.activeOutput;
    for (let i = 0; i < 8; i++) {
      const isActive = activeY === i;
      const lx = 8 + i * 14;
      ctx.fillStyle = isActive ? '#ff3333' : '#332222';
      ctx.beginPath();
      ctx.arc(lx, 34, 2, 0, Math.PI * 2);
      ctx.fill();
      if (isActive) { ctx.shadowColor = '#ff3333'; ctx.shadowBlur = 3; }
      ctx.beginPath();
      ctx.arc(lx, 34, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    if (inst.selected) drawSelectionRect(ctx, -10, -4, 140, 58);
    ctx.restore();
  }
});

/* ══════════════════════════════════════════════════════════
   74HC245 — Octal Bus Transceiver (Full 20-pin DIP)
   
   Real pinout:
   Pin 1: DIR    Pin 11: B8
   Pin 2: A1     Pin 12: B7
   Pin 3: A2     Pin 13: B6
   Pin 4: A3     Pin 14: B5
   Pin 5: A4     Pin 15: B4
   Pin 6: A5     Pin 16: B3
   Pin 7: A6     Pin 17: B2
   Pin 8: A7     Pin 18: B1
   Pin 9: A8     Pin 19: OE'
   Pin 10: GND   Pin 20: VCC
   ══════════════════════════════════════════════════════════ */
defComp({
  id: 'ic_74hc245',
  name: '74HC245 Bus Xcvr',
  category: 'Digital ICs',
  icon: '⮗',
  desc: 'Octal bus transceiver — bidirectional 8-bit data buffer with 3-state outputs',
  width: 170,
  height: 50,
  defaultProps: {},
  pins: [
    /* Bottom row (pins 1-10, left to right) */
    { id: 'DIR', label: '1',  type: PIN_TYPE.DIGITAL, x:   0, y: 50, side: 'bottom' },
    { id: 'A1',  label: '2',  type: PIN_TYPE.DIGITAL, x:  17, y: 50, side: 'bottom' },
    { id: 'A2',  label: '3',  type: PIN_TYPE.DIGITAL, x:  34, y: 50, side: 'bottom' },
    { id: 'A3',  label: '4',  type: PIN_TYPE.DIGITAL, x:  51, y: 50, side: 'bottom' },
    { id: 'A4',  label: '5',  type: PIN_TYPE.DIGITAL, x:  68, y: 50, side: 'bottom' },
    { id: 'A5',  label: '6',  type: PIN_TYPE.DIGITAL, x:  85, y: 50, side: 'bottom' },
    { id: 'A6',  label: '7',  type: PIN_TYPE.DIGITAL, x: 102, y: 50, side: 'bottom' },
    { id: 'A7',  label: '8',  type: PIN_TYPE.DIGITAL, x: 119, y: 50, side: 'bottom' },
    { id: 'A8',  label: '9',  type: PIN_TYPE.DIGITAL, x: 136, y: 50, side: 'bottom' },
    { id: 'GND', label: '10', type: PIN_TYPE.GND,     x: 153, y: 50, side: 'bottom' },
    /* Top row (pins 20-11, left to right) */
    { id: 'VCC', label: '20', type: PIN_TYPE.POWER,   x:   0, y:  0, side: 'top' },
    { id: 'OE',  label: '19', type: PIN_TYPE.DIGITAL, x:  17, y:  0, side: 'top' },
    { id: 'B1',  label: '18', type: PIN_TYPE.DIGITAL, x:  34, y:  0, side: 'top' },
    { id: 'B2',  label: '17', type: PIN_TYPE.DIGITAL, x:  51, y:  0, side: 'top' },
    { id: 'B3',  label: '16', type: PIN_TYPE.DIGITAL, x:  68, y:  0, side: 'top' },
    { id: 'B4',  label: '15', type: PIN_TYPE.DIGITAL, x:  85, y:  0, side: 'top' },
    { id: 'B5',  label: '14', type: PIN_TYPE.DIGITAL, x: 102, y:  0, side: 'top' },
    { id: 'B6',  label: '13', type: PIN_TYPE.DIGITAL, x: 119, y:  0, side: 'top' },
    { id: 'B7',  label: '12', type: PIN_TYPE.DIGITAL, x: 136, y:  0, side: 'top' },
    { id: 'B8',  label: '11', type: PIN_TYPE.DIGITAL, x: 153, y:  0, side: 'top' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const state = inst.runtimeState || {};
    ctx.save();
    ctx.translate(x, y);

    // Pin leads
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= 9; i++) {
      const px = i * 17;
      ctx.beginPath(); ctx.moveTo(px, 40); ctx.lineTo(px, 50); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, 10); ctx.lineTo(px, 0); ctx.stroke();
    }

    // DIP body
    ctx.fillStyle = '#1a1a1a';
    roundRect(ctx, -6, 10, 165, 30, 3);
    ctx.fill();
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.stroke();

    // Left notch
    ctx.beginPath(); ctx.arc(-6, 25, 4, -Math.PI / 2, Math.PI / 2);
    ctx.strokeStyle = '#666'; ctx.stroke();

    // Pin 1 dot
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(0, 32, 2, 0, Math.PI * 2); ctx.fill();

    // Label
    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 7px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('74HC245', 76, 21);
    ctx.font = '5px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('Bus Transceiver', 76, 28);

    // Direction indicator arrow
    const dir = state.direction; // true = A to B, false = B to A
    ctx.strokeStyle = dir ? '#33ff66' : '#ff3333';
    ctx.lineWidth = 1.5;
    if (dir) {
      ctx.beginPath(); ctx.moveTo(66, 34); ctx.lineTo(86, 34);
      ctx.lineTo(82, 31); ctx.moveTo(86, 34); ctx.lineTo(82, 37);
      ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(86, 34); ctx.lineTo(66, 34);
      ctx.lineTo(70, 31); ctx.moveTo(66, 34); ctx.lineTo(70, 37);
      ctx.stroke();
    }
    ctx.fillStyle = '#888';
    ctx.font = '5px sans-serif';
    ctx.fillText('A', 60, 36);
    ctx.fillText('B', 92, 36);

    if (inst.selected) drawSelectionRect(ctx, -10, -4, 174, 58);
    ctx.restore();
  }
});
