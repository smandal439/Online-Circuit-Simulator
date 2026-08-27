/* ═══════════════════════════════════════════════════════
   components/ics.js — Digital IC component definitions
   Real 74-series pinout, breadboard compatible (17px spacing)
   ═══════════════════════════════════════════════════════ */

'use strict';

/* ══════════════════════════════════════════════════════════
   Standard 74-series DIP pin layout (viewed from top):
   
        Pin14  Pin13  Pin12  Pin11  Pin10  Pin9   Pin8
         ┌──────┬──────┬──────┬──────┬──────┬──────┐
         │  NC  │      │      │      │      │  NC  │
         │      │  ●   │      │      │      │      │
         └──────┴──────┴──────┴──────┴──────┴──────┘
           Pin1   Pin2   Pin3   Pin4   Pin5   Pin6   Pin7
   
   Pin 1 = bottom-right, Pin 7 = bottom-left
   Pin 8 = top-left, Pin 14 = top-right
   ══════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════
   555 TIMER IC (NE555 / LM555)
   8-pin DIP: GND, TRIG, OUT, RST, DIS, THR, CV, VCC
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
    { id: 'GND',  label:'1', type:PIN_TYPE.GND,     x:  0, y: 50, side:'bottom' },
    { id: 'TRIG', label:'2', type:PIN_TYPE.DIGITAL, x: 17, y: 50, side:'bottom' },
    { id: 'OUT',  label:'3', type:PIN_TYPE.DIGITAL, x: 34, y: 50, side:'bottom' },
    { id: 'RST',  label:'4', type:PIN_TYPE.DIGITAL, x: 51, y: 50, side:'bottom' },
    /* Top row (pins 8-5, left to right) */
    { id: 'VCC',  label:'8', type:PIN_TYPE.POWER,   x:  0, y:  0, side:'top' },
    { id: 'DIS',  label:'7', type:PIN_TYPE.DIGITAL, x: 17, y:  0, side:'top' },
    { id: 'THR',  label:'6', type:PIN_TYPE.DIGITAL, x: 34, y:  0, side:'top' },
    { id: 'CV',   label:'5', type:PIN_TYPE.SIGNAL,  x: 51, y:  0, side:'top' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const outHigh = inst.runtimeState && inst.runtimeState.outHigh;

    ctx.save();
    ctx.translate(x, y);

    // Pin leads — Bottom (extend beyond body)
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    [0, 17, 34, 51].forEach(px => {
      ctx.beginPath(); ctx.moveTo(px, 40); ctx.lineTo(px, 50); ctx.stroke();
    });
    // Pin leads — Top (extend beyond body)
    [0, 17, 34, 51].forEach(px => {
      ctx.beginPath(); ctx.moveTo(px, 10); ctx.lineTo(px, 0); ctx.stroke();
    });

    // DIP body
    const grad = ctx.createLinearGradient(0, 10, 68, 40);
    grad.addColorStop(0, '#1a1a1a');
    grad.addColorStop(1, '#0c0c0c');
    ctx.fillStyle = grad;
    roundRect(ctx, 6, 10, 56, 30, 3);
    ctx.fill();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Notch (half-circle at top)
    ctx.beginPath();
    ctx.arc(34, 10, 4, Math.PI, Math.PI * 2);
    ctx.strokeStyle = '#666';
    ctx.stroke();

    // Pin 1 dot
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.arc(52, 16, 2, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 8px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NE555', 34, 26);

    // Output indicator LED
    ctx.fillStyle = outHigh ? '#33ff66' : '#334433';
    ctx.beginPath();
    ctx.arc(60, 16, 3, 0, Math.PI * 2);
    ctx.fill();
    if (outHigh) { ctx.shadowColor = '#33ff66'; ctx.shadowBlur = 4; }
    ctx.beginPath();
    ctx.arc(60, 16, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (inst.selected) drawSelectionRect(ctx, -2, -4, 72, 58);
    ctx.restore();
  }
});

/* ══════════════════════════════════════════════════════════
   74HC00 — Quad 2-Input NAND Gate (14-pin DIP)
   
   Real pinout:
   Pin 1: 1A   Pin 8:  3Y
   Pin 2: 1B   Pin 9:  3B
   Pin 3: 1Y   Pin 10: 3A
   Pin 4: 2A   Pin 11: 4Y
   Pin 5: 2B   Pin 12: 4B
   Pin 6: 2Y   Pin 13: 4A
   Pin 7: GND  Pin 14: VCC
   ══════════════════════════════════════════════════════════ */
defComp({
  id: 'ic_74hc00',
  name: '74HC00 Quad NAND',
  category: 'Digital ICs',
  icon: '⮗',
  desc: 'Quad 2-input NAND gate — outputs LOW only when both inputs are HIGH',
  width: 110,
  height: 50,
  defaultProps: {},
  pins: [
    /* Bottom row (pins 1-7, right to left: pin1 at right, pin7 at left) */
    { id:'A1', label:'1',  type:PIN_TYPE.DIGITAL, x: 102, y: 50, side:'bottom' },
    { id:'B1', label:'2',  type:PIN_TYPE.DIGITAL, x:  85, y: 50, side:'bottom' },
    { id:'Y1', label:'3',  type:PIN_TYPE.DIGITAL, x:  68, y: 50, side:'bottom' },
    { id:'A2', label:'4',  type:PIN_TYPE.DIGITAL, x:  51, y: 50, side:'bottom' },
    { id:'B2', label:'5',  type:PIN_TYPE.DIGITAL, x:  34, y: 50, side:'bottom' },
    { id:'Y2', label:'6',  type:PIN_TYPE.DIGITAL, x:  17, y: 50, side:'bottom' },
    { id:'GND', label:'7', type:PIN_TYPE.GND,     x:   0, y: 50, side:'bottom' },
    /* Top row (pins 8-14, left to right: pin8 at left, pin14 at right) */
    { id:'Y3', label:'8',  type:PIN_TYPE.DIGITAL, x:   0, y:  0, side:'top' },
    { id:'B3', label:'9',  type:PIN_TYPE.DIGITAL, x:  17, y:  0, side:'top' },
    { id:'A3', label:'10', type:PIN_TYPE.DIGITAL, x:  34, y:  0, side:'top' },
    { id:'Y4', label:'11', type:PIN_TYPE.DIGITAL, x:  51, y:  0, side:'top' },
    { id:'B4', label:'12', type:PIN_TYPE.DIGITAL, x:  68, y:  0, side:'top' },
    { id:'A4', label:'13', type:PIN_TYPE.DIGITAL, x:  85, y:  0, side:'top' },
    { id:'VCC', label:'14',type:PIN_TYPE.POWER,   x: 102, y:  0, side:'top' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    ctx.save();
    ctx.translate(x, y);

    // Pin leads — Bottom
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= 6; i++) {
      const px = i * 17;
      ctx.beginPath(); ctx.moveTo(px, 40); ctx.lineTo(px, 50); ctx.stroke();
    }
    // Pin leads — Top
    for (let i = 0; i <= 6; i++) {
      const px = i * 17;
      ctx.beginPath(); ctx.moveTo(px, 10); ctx.lineTo(px, 0); ctx.stroke();
    }

    // DIP body
    ctx.fillStyle = '#1a1a1a';
    roundRect(ctx, 6, 10, 98, 30, 3);
    ctx.fill();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Notch
    ctx.beginPath(); ctx.arc(55, 10, 4, Math.PI, Math.PI * 2);
    ctx.strokeStyle = '#666'; ctx.stroke();

    // Pin 1 dot
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(98, 16, 2, 0, Math.PI * 2); ctx.fill();

    // Label
    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 8px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('74HC00', 55, 26);
    ctx.font = '5px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('Quad NAND', 55, 34);

    // Logic gate symbols (4 NAND gates)
    const drawNandGate = (cx, cy) => {
      ctx.strokeStyle = '#00979c';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy - 4);
      ctx.lineTo(cx, cy - 4);
      ctx.arc(cx, cy, 4, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(cx - 6, cy + 4);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + 5, cy, 1.5, 0, Math.PI * 2);
      ctx.stroke();
    };
    drawNandGate(22, 22);
    drawNandGate(50, 22);
    drawNandGate(22, 32);
    drawNandGate(50, 32);

    if (inst.selected) drawSelectionRect(ctx, -2, -4, 114, 58);
    ctx.restore();
  }
});

/* ══════════════════════════════════════════════════════════
   74HC04 — Hex Inverter (NOT Gate) (14-pin DIP)
   
   Real pinout:
   Pin 1: 1A   Pin 8:  4A
   Pin 2: 1Y   Pin 9:  4Y
   Pin 3: 2A   Pin 10: 5A
   Pin 4: 2Y   Pin 11: 5Y
   Pin 5: 3A   Pin 12: 6A
   Pin 6: 3Y   Pin 13: 6Y
   Pin 7: GND  Pin 14: VCC
   ══════════════════════════════════════════════════════════ */
defComp({
  id: 'ic_74hc04',
  name: '74HC04 Hex NOT',
  category: 'Digital ICs',
  icon: '⮗',
  desc: 'Hex inverter — 6 NOT gates that invert the input signal',
  width: 110,
  height: 50,
  defaultProps: {},
  pins: [
    /* Bottom row (pins 1-7) */
    { id:'A1', label:'1',  type:PIN_TYPE.DIGITAL, x: 102, y: 50, side:'bottom' },
    { id:'Y1', label:'2',  type:PIN_TYPE.DIGITAL, x:  85, y: 50, side:'bottom' },
    { id:'A2', label:'3',  type:PIN_TYPE.DIGITAL, x:  68, y: 50, side:'bottom' },
    { id:'Y2', label:'4',  type:PIN_TYPE.DIGITAL, x:  51, y: 50, side:'bottom' },
    { id:'A3', label:'5',  type:PIN_TYPE.DIGITAL, x:  34, y: 50, side:'bottom' },
    { id:'Y3', label:'6',  type:PIN_TYPE.DIGITAL, x:  17, y: 50, side:'bottom' },
    { id:'GND', label:'7', type:PIN_TYPE.GND,     x:   0, y: 50, side:'bottom' },
    /* Top row (pins 8-14) */
    { id:'A4', label:'8',  type:PIN_TYPE.DIGITAL, x:   0, y:  0, side:'top' },
    { id:'Y4', label:'9',  type:PIN_TYPE.DIGITAL, x:  17, y:  0, side:'top' },
    { id:'A5', label:'10', type:PIN_TYPE.DIGITAL, x:  34, y:  0, side:'top' },
    { id:'Y5', label:'11', type:PIN_TYPE.DIGITAL, x:  51, y:  0, side:'top' },
    { id:'A6', label:'12', type:PIN_TYPE.DIGITAL, x:  68, y:  0, side:'top' },
    { id:'Y6', label:'13', type:PIN_TYPE.DIGITAL, x:  85, y:  0, side:'top' },
    { id:'VCC', label:'14',type:PIN_TYPE.POWER,   x: 102, y:  0, side:'top' },
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
    roundRect(ctx, 6, 10, 98, 30, 3);
    ctx.fill();
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.stroke();

    ctx.beginPath(); ctx.arc(55, 10, 4, Math.PI, Math.PI * 2);
    ctx.strokeStyle = '#666'; ctx.stroke();

    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(98, 16, 2, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 8px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('74HC04', 55, 26);
    ctx.font = '5px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('Hex NOT', 55, 34);

    // NOT gate symbols (6 triangles)
    const drawNotGate = (cx, cy) => {
      ctx.strokeStyle = '#00979c'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy - 4);
      ctx.lineTo(cx + 3, cy);
      ctx.lineTo(cx - 5, cy + 4);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + 4.5, cy, 1.5, 0, Math.PI * 2);
      ctx.stroke();
    };
    drawNotGate(18, 20); drawNotGate(40, 20); drawNotGate(62, 20);
    drawNotGate(18, 32); drawNotGate(40, 32); drawNotGate(62, 32);

    if (inst.selected) drawSelectionRect(ctx, -2, -4, 114, 58);
    ctx.restore();
  }
});

/* ══════════════════════════════════════════════════════════
   74HC08 — Quad 2-Input AND Gate (14-pin DIP)
   
   Real pinout:
   Pin 1: 1A   Pin 8:  3Y
   Pin 2: 1B   Pin 9:  3B
   Pin 3: 1Y   Pin 10: 3A
   Pin 4: 2A   Pin 11: 4Y
   Pin 5: 2B   Pin 12: 4B
   Pin 6: 2Y   Pin 13: 4A
   Pin 7: GND  Pin 14: VCC
   ══════════════════════════════════════════════════════════ */
defComp({
  id: 'ic_74hc08',
  name: '74HC08 Quad AND',
  category: 'Digital ICs',
  icon: '⮗',
  desc: 'Quad 2-input AND gate — outputs HIGH only when both inputs are HIGH',
  width: 110,
  height: 50,
  defaultProps: {},
  pins: [
    /* Bottom row (pins 1-7, right to left) */
    { id:'A1', label:'1',  type:PIN_TYPE.DIGITAL, x: 102, y: 50, side:'bottom' },
    { id:'B1', label:'2',  type:PIN_TYPE.DIGITAL, x:  85, y: 50, side:'bottom' },
    { id:'Y1', label:'3',  type:PIN_TYPE.DIGITAL, x:  68, y: 50, side:'bottom' },
    { id:'A2', label:'4',  type:PIN_TYPE.DIGITAL, x:  51, y: 50, side:'bottom' },
    { id:'B2', label:'5',  type:PIN_TYPE.DIGITAL, x:  34, y: 50, side:'bottom' },
    { id:'Y2', label:'6',  type:PIN_TYPE.DIGITAL, x:  17, y: 50, side:'bottom' },
    { id:'GND', label:'7', type:PIN_TYPE.GND,     x:   0, y: 50, side:'bottom' },
    /* Top row (pins 8-14, left to right) */
    { id:'Y3', label:'8',  type:PIN_TYPE.DIGITAL, x:   0, y:  0, side:'top' },
    { id:'B3', label:'9',  type:PIN_TYPE.DIGITAL, x:  17, y:  0, side:'top' },
    { id:'A3', label:'10', type:PIN_TYPE.DIGITAL, x:  34, y:  0, side:'top' },
    { id:'Y4', label:'11', type:PIN_TYPE.DIGITAL, x:  51, y:  0, side:'top' },
    { id:'B4', label:'12', type:PIN_TYPE.DIGITAL, x:  68, y:  0, side:'top' },
    { id:'A4', label:'13', type:PIN_TYPE.DIGITAL, x:  85, y:  0, side:'top' },
    { id:'VCC', label:'14',type:PIN_TYPE.POWER,   x: 102, y:  0, side:'top' },
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
    roundRect(ctx, 6, 10, 98, 30, 3);
    ctx.fill();
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.stroke();

    ctx.beginPath(); ctx.arc(55, 10, 4, Math.PI, Math.PI * 2);
    ctx.strokeStyle = '#666'; ctx.stroke();

    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(98, 16, 2, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 8px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('74HC08', 55, 26);
    ctx.font = '5px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('Quad AND', 55, 34);

    // AND gate symbols
    const drawAndGate = (cx, cy) => {
      ctx.strokeStyle = '#00979c'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy - 4);
      ctx.lineTo(cx, cy - 4);
      ctx.arc(cx, cy, 4, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(cx - 5, cy + 4);
      ctx.closePath();
      ctx.stroke();
    };
    drawAndGate(22, 22); drawAndGate(50, 22);
    drawAndGate(22, 32); drawAndGate(50, 32);

    if (inst.selected) drawSelectionRect(ctx, -2, -4, 114, 58);
    ctx.restore();
  }
});

/* ══════════════════════════════════════════════════════════
   74HC32 — Quad 2-Input OR Gate (14-pin DIP)
   
   Real pinout:
   Pin 1: 1A   Pin 8:  3Y
   Pin 2: 1B   Pin 9:  3B
   Pin 3: 1Y   Pin 10: 3A
   Pin 4: 2A   Pin 11: 4Y
   Pin 5: 2B   Pin 12: 4B
   Pin 6: 2Y   Pin 13: 4A
   Pin 7: GND  Pin 14: VCC
   ══════════════════════════════════════════════════════════ */
defComp({
  id: 'ic_74hc32',
  name: '74HC32 Quad OR',
  category: 'Digital ICs',
  icon: '⮗',
  desc: 'Quad 2-input OR gate — outputs HIGH when either input is HIGH',
  width: 110,
  height: 50,
  defaultProps: {},
  pins: [
    /* Bottom row (pins 1-7, right to left) */
    { id:'A1', label:'1',  type:PIN_TYPE.DIGITAL, x: 102, y: 50, side:'bottom' },
    { id:'B1', label:'2',  type:PIN_TYPE.DIGITAL, x:  85, y: 50, side:'bottom' },
    { id:'Y1', label:'3',  type:PIN_TYPE.DIGITAL, x:  68, y: 50, side:'bottom' },
    { id:'A2', label:'4',  type:PIN_TYPE.DIGITAL, x:  51, y: 50, side:'bottom' },
    { id:'B2', label:'5',  type:PIN_TYPE.DIGITAL, x:  34, y: 50, side:'bottom' },
    { id:'Y2', label:'6',  type:PIN_TYPE.DIGITAL, x:  17, y: 50, side:'bottom' },
    { id:'GND', label:'7', type:PIN_TYPE.GND,     x:   0, y: 50, side:'bottom' },
    /* Top row (pins 8-14, left to right) */
    { id:'Y3', label:'8',  type:PIN_TYPE.DIGITAL, x:   0, y:  0, side:'top' },
    { id:'B3', label:'9',  type:PIN_TYPE.DIGITAL, x:  17, y:  0, side:'top' },
    { id:'A3', label:'10', type:PIN_TYPE.DIGITAL, x:  34, y:  0, side:'top' },
    { id:'Y4', label:'11', type:PIN_TYPE.DIGITAL, x:  51, y:  0, side:'top' },
    { id:'B4', label:'12', type:PIN_TYPE.DIGITAL, x:  68, y:  0, side:'top' },
    { id:'A4', label:'13', type:PIN_TYPE.DIGITAL, x:  85, y:  0, side:'top' },
    { id:'VCC', label:'14',type:PIN_TYPE.POWER,   x: 102, y:  0, side:'top' },
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
    roundRect(ctx, 6, 10, 98, 30, 3);
    ctx.fill();
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.stroke();

    ctx.beginPath(); ctx.arc(55, 10, 4, Math.PI, Math.PI * 2);
    ctx.strokeStyle = '#666'; ctx.stroke();

    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(98, 16, 2, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 8px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('74HC32', 55, 26);
    ctx.font = '5px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('Quad OR', 55, 34);

    // OR gate symbols
    const drawOrGate = (cx, cy) => {
      ctx.strokeStyle = '#00979c'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy - 4);
      ctx.quadraticCurveTo(cx - 1, cy, cx - 5, cy + 4);
      ctx.quadraticCurveTo(cx + 1, cy + 5, cx + 5, cy);
      ctx.quadraticCurveTo(cx + 1, cy - 5, cx - 5, cy - 4);
      ctx.stroke();
    };
    drawOrGate(22, 22); drawOrGate(50, 22);
    drawOrGate(22, 32); drawOrGate(50, 32);

    if (inst.selected) drawSelectionRect(ctx, -2, -4, 114, 58);
    ctx.restore();
  }
});

/* ══════════════════════════════════════════════════════════
   74HC595 — 8-Bit Shift Register (16-pin DIP)
   
   Real pinout:
   Pin 1:  QA'  Pin 9:  QH'
   Pin 2:  QB   Pin 10: SER
   Pin 3:  QC   Pin 11: SRCLK
   Pin 4:  QD   Pin 12: RCLK
   Pin 5:  QE   Pin 13: OE'
   Pin 6:  QF   Pin 14: SRCLR'
   Pin 7:  QG   Pin 15: QH
   Pin 8:  GND  Pin 16: VCC
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
    /* Bottom row (pins 1-8, right to left) */
    { id:'QA',   label:'1',  type:PIN_TYPE.DIGITAL, x: 119, y: 50, side:'bottom' },
    { id:'QB',   label:'2',  type:PIN_TYPE.DIGITAL, x: 102, y: 50, side:'bottom' },
    { id:'QC',   label:'3',  type:PIN_TYPE.DIGITAL, x:  85, y: 50, side:'bottom' },
    { id:'QD',   label:'4',  type:PIN_TYPE.DIGITAL, x:  68, y: 50, side:'bottom' },
    { id:'QE',   label:'5',  type:PIN_TYPE.DIGITAL, x:  51, y: 50, side:'bottom' },
    { id:'QF',   label:'6',  type:PIN_TYPE.DIGITAL, x:  34, y: 50, side:'bottom' },
    { id:'QG',   label:'7',  type:PIN_TYPE.DIGITAL, x:  17, y: 50, side:'bottom' },
    { id:'GND',  label:'8',  type:PIN_TYPE.GND,     x:   0, y: 50, side:'bottom' },
    /* Top row (pins 9-16, left to right) */
    { id:'QHp',  label:'9',  type:PIN_TYPE.DIGITAL, x:   0, y:  0, side:'top' },
    { id:'SER',  label:'10', type:PIN_TYPE.DIGITAL, x:  17, y:  0, side:'top' },
    { id:'SRCLK',label:'11', type:PIN_TYPE.DIGITAL, x:  34, y:  0, side:'top' },
    { id:'RCLK', label:'12', type:PIN_TYPE.DIGITAL, x:  51, y:  0, side:'top' },
    { id:'OE',   label:'13', type:PIN_TYPE.DIGITAL, x:  68, y:  0, side:'top' },
    { id:'SRCLR',label:'14', type:PIN_TYPE.DIGITAL, x:  85, y:  0, side:'top' },
    { id:'QH',   label:'15', type:PIN_TYPE.DIGITAL, x: 102, y:  0, side:'top' },
    { id:'VCC',  label:'16', type:PIN_TYPE.POWER,   x: 119, y:  0, side:'top' },
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
    roundRect(ctx, 6, 10, 124, 30, 3);
    ctx.fill();
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.stroke();

    ctx.beginPath(); ctx.arc(12, 5, 4, Math.PI, Math.PI * 2);
    ctx.strokeStyle = '#666'; ctx.stroke();

    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(12, 16, 2, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 7px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('74HC595', 68, 24);
    ctx.font = '5px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('8-Bit Shift Reg', 68, 32);

    // Output state indicators (8 LEDs for QA-QH)
    const bits = state.bits || 0;
    for (let i = 0; i < 8; i++) {
      const bitOn = (bits >> i) & 1;
      const lx = 14 + i * 17;
      ctx.fillStyle = bitOn ? '#33ff66' : '#334433';
      ctx.beginPath();
      ctx.arc(lx, 36, 2.5, 0, Math.PI * 2);
      ctx.fill();
      if (bitOn) { ctx.shadowColor = '#33ff66'; ctx.shadowBlur = 3; }
      ctx.beginPath();
      ctx.arc(lx, 36, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    if (inst.selected) drawSelectionRect(ctx, -2, -4, 140, 58);
    ctx.restore();
  }
});

/* ══════════════════════════════════════════════════════════
   74HC138 — 3-to-8 Line Decoder (16-pin DIP)
   
   Real pinout:
   Pin 1:  Y0   Pin 9:  Y7
   Pin 2:  Y1   Pin 10: A0
   Pin 3:  Y2   Pin 11: A1
   Pin 4:  Y3   Pin 12: A2
   Pin 5:  Y4   Pin 13: G1
   Pin 6:  Y5   Pin 14: G2A'
   Pin 7:  Y6   Pin 15: G2B'
   Pin 8:  GND  Pin 16: VCC
   ══════════════════════════════════════════════════════════ */
defComp({
  id: 'ic_74hc138',
  name: '74HC138 Decoder',
  category: 'Digital ICs',
  icon: '⮗',
  desc: '3-to-8 line decoder — activates one of 8 outputs based on 3-bit address',
  width: 136,
  height: 50,
  defaultProps: {},
  pins: [
    /* Bottom row (pins 1-8, right to left) */
    { id:'Y0',  label:'1',  type:PIN_TYPE.DIGITAL, x: 119, y: 50, side:'bottom' },
    { id:'Y1',  label:'2',  type:PIN_TYPE.DIGITAL, x: 102, y: 50, side:'bottom' },
    { id:'Y2',  label:'3',  type:PIN_TYPE.DIGITAL, x:  85, y: 50, side:'bottom' },
    { id:'Y3',  label:'4',  type:PIN_TYPE.DIGITAL, x:  68, y: 50, side:'bottom' },
    { id:'Y4',  label:'5',  type:PIN_TYPE.DIGITAL, x:  51, y: 50, side:'bottom' },
    { id:'Y5',  label:'6',  type:PIN_TYPE.DIGITAL, x:  34, y: 50, side:'bottom' },
    { id:'Y6',  label:'7',  type:PIN_TYPE.DIGITAL, x:  17, y: 50, side:'bottom' },
    { id:'GND', label:'8',  type:PIN_TYPE.GND,     x:   0, y: 50, side:'bottom' },
    /* Top row (pins 9-16, left to right) */
    { id:'Y7',  label:'9',  type:PIN_TYPE.DIGITAL, x:   0, y:  0, side:'top' },
    { id:'A0',  label:'10', type:PIN_TYPE.DIGITAL, x:  17, y:  0, side:'top' },
    { id:'A1',  label:'11', type:PIN_TYPE.DIGITAL, x:  34, y:  0, side:'top' },
    { id:'A2',  label:'12', type:PIN_TYPE.DIGITAL, x:  51, y:  0, side:'top' },
    { id:'G1',  label:'13', type:PIN_TYPE.DIGITAL, x:  68, y:  0, side:'top' },
    { id:'G2A', label:'14', type:PIN_TYPE.DIGITAL, x:  85, y:  0, side:'top' },
    { id:'G2B', label:'15', type:PIN_TYPE.DIGITAL, x: 102, y:  0, side:'top' },
    { id:'VCC', label:'16', type:PIN_TYPE.POWER,   x: 119, y:  0, side:'top' },
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
    roundRect(ctx, 6, 10, 124, 30, 3);
    ctx.fill();
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.stroke();

    ctx.beginPath(); ctx.arc(12, 5, 4, Math.PI, Math.PI * 2);
    ctx.strokeStyle = '#666'; ctx.stroke();

    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(12, 16, 2, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 7px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('74HC138', 68, 24);
    ctx.font = '5px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('3-to-8 Decoder', 68, 32);

    // Active output indicator
    const activeY = state.activeOutput;
    for (let i = 0; i < 8; i++) {
      const isActive = activeY === i;
      const lx = 14 + i * 17;
      ctx.fillStyle = isActive ? '#ff3333' : '#332222';
      ctx.beginPath();
      ctx.arc(lx, 36, 2.5, 0, Math.PI * 2);
      ctx.fill();
      if (isActive) { ctx.shadowColor = '#ff3333'; ctx.shadowBlur = 3; }
      ctx.beginPath();
      ctx.arc(lx, 36, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    if (inst.selected) drawSelectionRect(ctx, -2, -4, 140, 58);
    ctx.restore();
  }
});

/* ══════════════════════════════════════════════════════════
   74HC245 — Octal Bus Transceiver (16-pin DIP)
   
   Real pinout:
   Pin 1:  DIR  Pin 9:  B8
   Pin 2:  OE'  Pin 10: B7
   Pin 3:  A1   Pin 11: B6
   Pin 4:  A2   Pin 12: B5
   Pin 5:  A3   Pin 13: B4
   Pin 6:  A4   Pin 14: B3
   Pin 7:  A5   Pin 15: B2
   Pin 8:  A6   Pin 16: B1
   Pin 9:  A7   Pin 17: VCC (not used here, simplified to 16-pin)
   Pin 10: A8   Pin 18: GND (not used here, simplified to 16-pin)
   
   Simplified 16-pin layout for simulation:
   ══════════════════════════════════════════════════════════ */
defComp({
  id: 'ic_74hc245',
  name: '74HC245 Bus Xcvr',
  category: 'Digital ICs',
  icon: '⮗',
  desc: 'Octal bus transceiver — bidirectional 8-bit data buffer with direction control',
  width: 136,
  height: 50,
  defaultProps: {},
  pins: [
    /* Bottom row (pins 1-8, right to left) */
    { id:'DIR', label:'1',  type:PIN_TYPE.DIGITAL, x: 119, y: 50, side:'bottom' },
    { id:'OE',  label:'2',  type:PIN_TYPE.DIGITAL, x: 102, y: 50, side:'bottom' },
    { id:'A1',  label:'3',  type:PIN_TYPE.DIGITAL, x:  85, y: 50, side:'bottom' },
    { id:'A2',  label:'4',  type:PIN_TYPE.DIGITAL, x:  68, y: 50, side:'bottom' },
    { id:'A3',  label:'5',  type:PIN_TYPE.DIGITAL, x:  51, y: 50, side:'bottom' },
    { id:'A4',  label:'6',  type:PIN_TYPE.DIGITAL, x:  34, y: 50, side:'bottom' },
    { id:'A5',  label:'7',  type:PIN_TYPE.DIGITAL, x:  17, y: 50, side:'bottom' },
    { id:'A6',  label:'8',  type:PIN_TYPE.DIGITAL, x:   0, y: 50, side:'bottom' },
    /* Top row (pins 9-16, left to right) */
    { id:'B8',  label:'9',  type:PIN_TYPE.DIGITAL, x:   0, y:  0, side:'top' },
    { id:'B7',  label:'10', type:PIN_TYPE.DIGITAL, x:  17, y:  0, side:'top' },
    { id:'B6',  label:'11', type:PIN_TYPE.DIGITAL, x:  34, y:  0, side:'top' },
    { id:'B5',  label:'12', type:PIN_TYPE.DIGITAL, x:  51, y:  0, side:'top' },
    { id:'B4',  label:'13', type:PIN_TYPE.DIGITAL, x:  68, y:  0, side:'top' },
    { id:'B3',  label:'14', type:PIN_TYPE.DIGITAL, x:  85, y:  0, side:'top' },
    { id:'B2',  label:'15', type:PIN_TYPE.DIGITAL, x: 102, y:  0, side:'top' },
    { id:'B1',  label:'16', type:PIN_TYPE.DIGITAL, x: 119, y:  0, side:'top' },
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
    roundRect(ctx, 6, 10, 124, 30, 3);
    ctx.fill();
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.stroke();

    ctx.beginPath(); ctx.arc(12, 5, 4, Math.PI, Math.PI * 2);
    ctx.strokeStyle = '#666'; ctx.stroke();

    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(12, 16, 2, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 7px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('74HC245', 68, 24);
    ctx.font = '5px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('Bus Transceiver', 68, 32);

    // Direction arrow
    const dir = state.direction;
    ctx.strokeStyle = dir ? '#33ff66' : '#ff3333';
    ctx.lineWidth = 1.5;
    if (dir) {
      ctx.beginPath(); ctx.moveTo(16, 36); ctx.lineTo(34, 36);
      ctx.lineTo(30, 33); ctx.moveTo(34, 36); ctx.lineTo(30, 39);
      ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(34, 36); ctx.lineTo(16, 36);
      ctx.lineTo(20, 33); ctx.moveTo(16, 36); ctx.lineTo(20, 39);
      ctx.stroke();
    }
    ctx.fillStyle = '#888';
    ctx.font = '5px sans-serif';
    ctx.fillText('A', 14, 44);
    ctx.fillText('B', 36, 44);

    if (inst.selected) drawSelectionRect(ctx, -2, -4, 140, 58);
    ctx.restore();
  }
});
