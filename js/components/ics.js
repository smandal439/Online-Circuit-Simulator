/* ═══════════════════════════════════════════════════════
   components/ics.js — Digital IC component definitions
   ═══════════════════════════════════════════════════════ */

'use strict';

/* ══════════════════════════════════════════════════════════
   555 TIMER IC (NE555 / LM555)
   8-pin DIP: GND, TRIG, OUT, RST, DIS, THR, CV, VCC
   Modes: Astable, Monostable, Bistable
   ══════════════════════════════════════════════════════════ */
defComp({
  id: 'ic_555',
  name: '555 Timer IC',
  category: 'Digital ICs',
  icon: 'chip',
  desc: 'NE555 precision timer — operates in astable, monostable, or bistable mode',
  width: 80,
  height: 50,
  defaultProps: { mode: 'astable', frequency: 1000, dutyCycle: 50 },
  pins: [
    { id: 'GND',  label:'GND', type:PIN_TYPE.GND,     x: 10, y: 50, side:'bottom' },
    { id: 'TRIG', label:'TRI', type:PIN_TYPE.DIGITAL, x: 20, y: 50, side:'bottom' },
    { id: 'OUT',  label:'OUT', type:PIN_TYPE.DIGITAL, x: 30, y: 50, side:'bottom' },
    { id: 'RST',  label:'RST', type:PIN_TYPE.DIGITAL, x: 40, y: 50, side:'bottom' },
    { id: 'DIS',  label:'DIS', type:PIN_TYPE.DIGITAL, x: 50, y: 50, side:'bottom' },
    { id: 'THR',  label:'THR', type:PIN_TYPE.DIGITAL, x: 60, y: 50, side:'bottom' },
    { id: 'CV',   label:'CV',  type:PIN_TYPE.SIGNAL,  x: 70, y: 50, side:'bottom' },
    { id: 'VCC',  label:'VCC', type:PIN_TYPE.POWER,   x: 40, y:  0, side:'top' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const outHigh = inst.runtimeState && inst.runtimeState.outHigh;

    ctx.save();
    ctx.translate(x, y);

    // DIP body
    const grad = ctx.createLinearGradient(0, 0, 80, 50);
    grad.addColorStop(0, '#1a1a1a');
    grad.addColorStop(1, '#0c0c0c');
    ctx.fillStyle = grad;
    roundRect(ctx, 10, 5, 60, 40, 3);
    ctx.fill();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Notch
    ctx.beginPath();
    ctx.arc(40, 5, 4, Math.PI, Math.PI * 2);
    ctx.strokeStyle = '#666';
    ctx.stroke();

    // Pin 1 dot
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.arc(16, 12, 2, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 8px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NE555', 40, 28);
    ctx.font = '5px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('Timer', 40, 36);

    // Output indicator LED
    ctx.fillStyle = outHigh ? '#33ff66' : '#334433';
    ctx.beginPath();
    ctx.arc(72, 10, 3, 0, Math.PI * 2);
    ctx.fill();
    if (outHigh) { ctx.shadowColor = '#33ff66'; ctx.shadowBlur = 4; }
    ctx.beginPath();
    ctx.arc(72, 10, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Pin leads
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    const leftPins = [10, 20, 30, 40];
    const rightPins = [50, 60, 70, 40];
    leftPins.forEach((px, i) => {
      if (i < 3) {
        ctx.beginPath(); ctx.moveTo(px, 45); ctx.lineTo(px, 50); ctx.stroke();
      }
    });
    // Top pins
    ctx.beginPath(); ctx.moveTo(40, 5); ctx.lineTo(40, 0); ctx.stroke();

    // Right side pins
    [50, 60, 70].forEach(px => {
      ctx.beginPath(); ctx.moveTo(px, 45); ctx.lineTo(px, 50); ctx.stroke();
    });

    if (inst.selected) drawSelectionRect(ctx, -2, -4, 84, 58);
    ctx.restore();
  }
});

/* ══════════════════════════════════════════════════════════
   74HC00 — Quad 2-Input NAND Gate
   14-pin DIP: A1,B1,Y1, A2,B2,Y2, GND, Y4,B4,A4, Y3,B3,A3, VCC
   ══════════════════════════════════════════════════════════ */
defComp({
  id: 'ic_74hc00',
  name: '74HC00 Quad NAND',
  category: 'Digital ICs',
  icon: 'chip',
  desc: 'Quad 2-input NAND gate — outputs LOW only when both inputs are HIGH',
  width: 90,
  height: 50,
  defaultProps: {},
  pins: [
    { id:'A1', label:'1A', type:PIN_TYPE.DIGITAL, x: 10, y: 50, side:'bottom' },
    { id:'B1', label:'1B', type:PIN_TYPE.DIGITAL, x: 18, y: 50, side:'bottom' },
    { id:'Y1', label:'1Y', type:PIN_TYPE.DIGITAL, x: 26, y: 50, side:'bottom' },
    { id:'A2', label:'2A', type:PIN_TYPE.DIGITAL, x: 34, y: 50, side:'bottom' },
    { id:'B2', label:'2B', type:PIN_TYPE.DIGITAL, x: 42, y: 50, side:'bottom' },
    { id:'Y2', label:'2Y', type:PIN_TYPE.DIGITAL, x: 50, y: 50, side:'bottom' },
    { id:'GND', label:'GND', type:PIN_TYPE.GND,   x: 58, y: 50, side:'bottom' },
    { id:'Y4', label:'4Y', type:PIN_TYPE.DIGITAL, x: 10, y:  0, side:'top' },
    { id:'B4', label:'4B', type:PIN_TYPE.DIGITAL, x: 26, y:  0, side:'top' },
    { id:'A4', label:'4A', type:PIN_TYPE.DIGITAL, x: 34, y:  0, side:'top' },
    { id:'Y3', label:'3Y', type:PIN_TYPE.DIGITAL, x: 50, y:  0, side:'top' },
    { id:'B3', label:'3B', type:PIN_TYPE.DIGITAL, x: 66, y:  0, side:'top' },
    { id:'A3', label:'3A', type:PIN_TYPE.DIGITAL, x: 74, y:  0, side:'top' },
    { id:'VCC', label:'VCC', type:PIN_TYPE.POWER, x: 82, y: 50, side:'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    ctx.save();
    ctx.translate(x, y);

    // DIP body
    ctx.fillStyle = '#1a1a1a';
    roundRect(ctx, 6, 5, 78, 40, 3);
    ctx.fill();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Notch
    ctx.beginPath(); ctx.arc(45, 5, 4, Math.PI, Math.PI * 2);
    ctx.strokeStyle = '#666'; ctx.stroke();

    // Pin 1 dot
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(12, 12, 2, 0, Math.PI * 2); ctx.fill();

    // Label
    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 8px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('74HC00', 45, 22);
    ctx.font = '6px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('Quad NAND', 45, 32);

    // Logic gate symbols (4 NAND gates)
    const drawNandGate = (cx, cy) => {
      ctx.strokeStyle = '#00979c';
      ctx.lineWidth = 1;
      // AND shape
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy - 5);
      ctx.lineTo(cx, cy - 5);
      ctx.arc(cx, cy, 5, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(cx - 6, cy + 5);
      ctx.closePath();
      ctx.stroke();
      // Bubble
      ctx.beginPath();
      ctx.arc(cx + 6, cy, 1.5, 0, Math.PI * 2);
      ctx.stroke();
    };
    drawNandGate(18, 20);
    drawNandGate(42, 20);
    drawNandGate(18, 36);
    drawNandGate(42, 36);

    if (inst.selected) drawSelectionRect(ctx, -2, -4, 94, 58);
    ctx.restore();
  }
});

/* ══════════════════════════════════════════════════════════
   74HC04 — Hex Inverter (NOT Gate)
   14-pin DIP: A1,Y1, A2,Y2, A3,Y3, GND, Y4,A4, Y5,A5, Y6,A6, VCC
   ══════════════════════════════════════════════════════════ */
defComp({
  id: 'ic_74hc04',
  name: '74HC04 Hex NOT',
  category: 'Digital ICs',
  icon: 'chip',
  desc: 'Hex inverter — 6 NOT gates that invert the input signal',
  width: 90,
  height: 50,
  defaultProps: {},
  pins: [
    { id:'A1', label:'1A', type:PIN_TYPE.DIGITAL, x: 10, y: 50, side:'bottom' },
    { id:'Y1', label:'1Y', type:PIN_TYPE.DIGITAL, x: 18, y: 50, side:'bottom' },
    { id:'A2', label:'2A', type:PIN_TYPE.DIGITAL, x: 26, y: 50, side:'bottom' },
    { id:'Y2', label:'2Y', type:PIN_TYPE.DIGITAL, x: 34, y: 50, side:'bottom' },
    { id:'A3', label:'3A', type:PIN_TYPE.DIGITAL, x: 42, y: 50, side:'bottom' },
    { id:'Y3', label:'3Y', type:PIN_TYPE.DIGITAL, x: 50, y: 50, side:'bottom' },
    { id:'GND', label:'GND', type:PIN_TYPE.GND,   x: 58, y: 50, side:'bottom' },
    { id:'Y4', label:'4Y', type:PIN_TYPE.DIGITAL, x: 10, y:  0, side:'top' },
    { id:'A4', label:'4A', type:PIN_TYPE.DIGITAL, x: 18, y:  0, side:'top' },
    { id:'Y5', label:'5Y', type:PIN_TYPE.DIGITAL, x: 26, y:  0, side:'top' },
    { id:'A5', label:'5A', type:PIN_TYPE.DIGITAL, x: 34, y:  0, side:'top' },
    { id:'Y6', label:'6Y', type:PIN_TYPE.DIGITAL, x: 42, y:  0, side:'top' },
    { id:'A6', label:'6A', type:PIN_TYPE.DIGITAL, x: 50, y:  0, side:'top' },
    { id:'VCC', label:'VCC', type:PIN_TYPE.POWER, x: 82, y: 50, side:'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = '#1a1a1a';
    roundRect(ctx, 6, 5, 78, 40, 3);
    ctx.fill();
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.stroke();

    ctx.beginPath(); ctx.arc(45, 5, 4, Math.PI, Math.PI * 2);
    ctx.strokeStyle = '#666'; ctx.stroke();

    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(12, 12, 2, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 8px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('74HC04', 45, 22);
    ctx.font = '6px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('Hex NOT', 45, 32);

    // NOT gate symbols (6 triangles)
    const drawNotGate = (cx, cy) => {
      ctx.strokeStyle = '#00979c'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy - 5);
      ctx.lineTo(cx + 4, cy);
      ctx.lineTo(cx - 6, cy + 5);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + 5.5, cy, 1.5, 0, Math.PI * 2);
      ctx.stroke();
    };
    drawNotGate(18, 20); drawNotGate(34, 20); drawNotGate(50, 20);
    drawNotGate(18, 36); drawNotGate(34, 36); drawNotGate(50, 36);

    if (inst.selected) drawSelectionRect(ctx, -2, -4, 94, 58);
    ctx.restore();
  }
});

/* ══════════════════════════════════════════════════════════
   74HC08 — Quad 2-Input AND Gate
   ══════════════════════════════════════════════════════════ */
defComp({
  id: 'ic_74hc08',
  name: '74HC08 Quad AND',
  category: 'Digital ICs',
  icon: 'chip',
  desc: 'Quad 2-input AND gate — outputs HIGH only when both inputs are HIGH',
  width: 90,
  height: 50,
  defaultProps: {},
  pins: [
    { id:'A1', label:'1A', type:PIN_TYPE.DIGITAL, x: 10, y: 50, side:'bottom' },
    { id:'B1', label:'1B', type:PIN_TYPE.DIGITAL, x: 18, y: 50, side:'bottom' },
    { id:'Y1', label:'1Y', type:PIN_TYPE.DIGITAL, x: 26, y: 50, side:'bottom' },
    { id:'A2', label:'2A', type:PIN_TYPE.DIGITAL, x: 34, y: 50, side:'bottom' },
    { id:'B2', label:'2B', type:PIN_TYPE.DIGITAL, x: 42, y: 50, side:'bottom' },
    { id:'Y2', label:'2Y', type:PIN_TYPE.DIGITAL, x: 50, y: 50, side:'bottom' },
    { id:'GND', label:'GND', type:PIN_TYPE.GND,   x: 58, y: 50, side:'bottom' },
    { id:'Y4', label:'4Y', type:PIN_TYPE.DIGITAL, x: 10, y:  0, side:'top' },
    { id:'B4', label:'4B', type:PIN_TYPE.DIGITAL, x: 26, y:  0, side:'top' },
    { id:'A4', label:'4A', type:PIN_TYPE.DIGITAL, x: 34, y:  0, side:'top' },
    { id:'Y3', label:'3Y', type:PIN_TYPE.DIGITAL, x: 50, y:  0, side:'top' },
    { id:'B3', label:'3B', type:PIN_TYPE.DIGITAL, x: 66, y:  0, side:'top' },
    { id:'A3', label:'3A', type:PIN_TYPE.DIGITAL, x: 74, y:  0, side:'top' },
    { id:'VCC', label:'VCC', type:PIN_TYPE.POWER, x: 82, y: 50, side:'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = '#1a1a1a';
    roundRect(ctx, 6, 5, 78, 40, 3);
    ctx.fill();
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.stroke();

    ctx.beginPath(); ctx.arc(45, 5, 4, Math.PI, Math.PI * 2);
    ctx.strokeStyle = '#666'; ctx.stroke();

    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(12, 12, 2, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 8px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('74HC08', 45, 22);
    ctx.font = '6px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('Quad AND', 45, 32);

    // AND gate symbols
    const drawAndGate = (cx, cy) => {
      ctx.strokeStyle = '#00979c'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy - 5);
      ctx.lineTo(cx, cy - 5);
      ctx.arc(cx, cy, 5, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(cx - 6, cy + 5);
      ctx.closePath();
      ctx.stroke();
    };
    drawAndGate(18, 20); drawAndGate(42, 20);
    drawAndGate(18, 36); drawAndGate(42, 36);

    if (inst.selected) drawSelectionRect(ctx, -2, -4, 94, 58);
    ctx.restore();
  }
});

/* ══════════════════════════════════════════════════════════
   74HC32 — Quad 2-Input OR Gate
   ══════════════════════════════════════════════════════════ */
defComp({
  id: 'ic_74hc32',
  name: '74HC32 Quad OR',
  category: 'Digital ICs',
  icon: 'chip',
  desc: 'Quad 2-input OR gate — outputs HIGH when either input is HIGH',
  width: 90,
  height: 50,
  defaultProps: {},
  pins: [
    { id:'A1', label:'1A', type:PIN_TYPE.DIGITAL, x: 10, y: 50, side:'bottom' },
    { id:'B1', label:'1B', type:PIN_TYPE.DIGITAL, x: 18, y: 50, side:'bottom' },
    { id:'Y1', label:'1Y', type:PIN_TYPE.DIGITAL, x: 26, y: 50, side:'bottom' },
    { id:'A2', label:'2A', type:PIN_TYPE.DIGITAL, x: 34, y: 50, side:'bottom' },
    { id:'B2', label:'2B', type:PIN_TYPE.DIGITAL, x: 42, y: 50, side:'bottom' },
    { id:'Y2', label:'2Y', type:PIN_TYPE.DIGITAL, x: 50, y: 50, side:'bottom' },
    { id:'GND', label:'GND', type:PIN_TYPE.GND,   x: 58, y: 50, side:'bottom' },
    { id:'Y4', label:'4Y', type:PIN_TYPE.DIGITAL, x: 10, y:  0, side:'top' },
    { id:'B4', label:'4B', type:PIN_TYPE.DIGITAL, x: 26, y:  0, side:'top' },
    { id:'A4', label:'4A', type:PIN_TYPE.DIGITAL, x: 34, y:  0, side:'top' },
    { id:'Y3', label:'3Y', type:PIN_TYPE.DIGITAL, x: 50, y:  0, side:'top' },
    { id:'B3', label:'3B', type:PIN_TYPE.DIGITAL, x: 66, y:  0, side:'top' },
    { id:'A3', label:'3A', type:PIN_TYPE.DIGITAL, x: 74, y:  0, side:'top' },
    { id:'VCC', label:'VCC', type:PIN_TYPE.POWER, x: 82, y: 50, side:'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = '#1a1a1a';
    roundRect(ctx, 6, 5, 78, 40, 3);
    ctx.fill();
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.stroke();

    ctx.beginPath(); ctx.arc(45, 5, 4, Math.PI, Math.PI * 2);
    ctx.strokeStyle = '#666'; ctx.stroke();

    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(12, 12, 2, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 8px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('74HC32', 45, 22);
    ctx.font = '6px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('Quad OR', 45, 32);

    // OR gate symbols
    const drawOrGate = (cx, cy) => {
      ctx.strokeStyle = '#00979c'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy - 5);
      ctx.quadraticCurveTo(cx - 2, cy, cx - 6, cy + 5);
      ctx.quadraticCurveTo(cx + 2, cy + 6, cx + 6, cy);
      ctx.quadraticCurveTo(cx + 2, cy - 6, cx - 6, cy - 5);
      ctx.stroke();
    };
    drawOrGate(18, 20); drawOrGate(42, 20);
    drawOrGate(18, 36); drawOrGate(42, 36);

    if (inst.selected) drawSelectionRect(ctx, -2, -4, 94, 58);
    ctx.restore();
  }
});

/* ══════════════════════════════════════════════════════════
   74HC595 — 8-Bit Shift Register
   16-pin DIP: QA',QB',QC,QD,QE,QF,QG,QH, GND, SER,
               SRCLK,RCLK,OE',SRCLR',VCC
   ══════════════════════════════════════════════════════════ */
defComp({
  id: 'ic_74hc595',
  name: '74HC595 Shift Reg',
  category: 'Digital ICs',
  icon: 'chip',
  desc: '8-bit serial-in parallel-out shift register with output latch',
  width: 90,
  height: 50,
  defaultProps: {},
  pins: [
    { id:'QA',   label:'QA',  type:PIN_TYPE.DIGITAL, x: 10, y: 50, side:'bottom' },
    { id:'QB',   label:'QB',  type:PIN_TYPE.DIGITAL, x: 18, y: 50, side:'bottom' },
    { id:'QC',   label:'QC',  type:PIN_TYPE.DIGITAL, x: 26, y: 50, side:'bottom' },
    { id:'QD',   label:'QD',  type:PIN_TYPE.DIGITAL, x: 34, y: 50, side:'bottom' },
    { id:'QE',   label:'QE',  type:PIN_TYPE.DIGITAL, x: 42, y: 50, side:'bottom' },
    { id:'QF',   label:'QF',  type:PIN_TYPE.DIGITAL, x: 50, y: 50, side:'bottom' },
    { id:'QG',   label:'QG',  type:PIN_TYPE.DIGITAL, x: 58, y: 50, side:'bottom' },
    { id:'QH',   label:'QH',  type:PIN_TYPE.DIGITAL, x: 66, y: 50, side:'bottom' },
    { id:'GND',  label:'GND', type:PIN_TYPE.GND,     x: 74, y: 50, side:'bottom' },
    { id:'VCC',  label:'VCC', type:PIN_TYPE.POWER,   x: 82, y: 50, side:'bottom' },
    { id:'SER',  label:'SER', type:PIN_TYPE.DIGITAL, x: 10, y:  0, side:'top' },
    { id:'SRCLK',label:'SRCLK',type:PIN_TYPE.DIGITAL,x: 26, y:  0, side:'top' },
    { id:'RCLK', label:'RCLK', type:PIN_TYPE.DIGITAL, x: 42, y:  0, side:'top' },
    { id:'OE',   label:'OE',  type:PIN_TYPE.DIGITAL, x: 58, y:  0, side:'top' },
    { id:'SRCLR',label:'CLR', type:PIN_TYPE.DIGITAL, x: 74, y:  0, side:'top' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const state = inst.runtimeState || {};
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = '#1a1a1a';
    roundRect(ctx, 6, 5, 78, 40, 3);
    ctx.fill();
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.stroke();

    ctx.beginPath(); ctx.arc(12, 5, 4, Math.PI, Math.PI * 2);
    ctx.strokeStyle = '#666'; ctx.stroke();

    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(12, 12, 2, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 7px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('74HC595', 45, 20);
    ctx.font = '5px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('8-Bit Shift Reg', 45, 28);

    // Output state indicators (8 LEDs for QA-QH)
    const bits = state.bits || 0;
    for (let i = 0; i < 8; i++) {
      const bitOn = (bits >> i) & 1;
      const lx = 14 + i * 9;
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

    if (inst.selected) drawSelectionRect(ctx, -2, -4, 94, 58);
    ctx.restore();
  }
});

/* ══════════════════════════════════════════════════════════
   74HC138 — 3-to-8 Line Decoder
   16-pin DIP: Y0,Y1,Y2,Y3,Y4,Y5,Y6,Y7, GND,
               A0,A1,A2,G1,G2A',G2B',VCC
   ══════════════════════════════════════════════════════════ */
defComp({
  id: 'ic_74hc138',
  name: '74HC138 Decoder',
  category: 'Digital ICs',
  icon: 'chip',
  desc: '3-to-8 line decoder — activates one of 8 outputs based on 3-bit address',
  width: 90,
  height: 50,
  defaultProps: {},
  pins: [
    { id:'Y0', label:'Y0', type:PIN_TYPE.DIGITAL, x: 10, y: 50, side:'bottom' },
    { id:'Y1', label:'Y1', type:PIN_TYPE.DIGITAL, x: 18, y: 50, side:'bottom' },
    { id:'Y2', label:'Y2', type:PIN_TYPE.DIGITAL, x: 26, y: 50, side:'bottom' },
    { id:'Y3', label:'Y3', type:PIN_TYPE.DIGITAL, x: 34, y: 50, side:'bottom' },
    { id:'Y4', label:'Y4', type:PIN_TYPE.DIGITAL, x: 42, y: 50, side:'bottom' },
    { id:'Y5', label:'Y5', type:PIN_TYPE.DIGITAL, x: 50, y: 50, side:'bottom' },
    { id:'Y6', label:'Y6', type:PIN_TYPE.DIGITAL, x: 58, y: 50, side:'bottom' },
    { id:'Y7', label:'Y7', type:PIN_TYPE.DIGITAL, x: 66, y: 50, side:'bottom' },
    { id:'GND', label:'GND', type:PIN_TYPE.GND,   x: 74, y: 50, side:'bottom' },
    { id:'VCC', label:'VCC', type:PIN_TYPE.POWER, x: 82, y: 50, side:'bottom' },
    { id:'A0', label:'A0', type:PIN_TYPE.DIGITAL, x: 10, y:  0, side:'top' },
    { id:'A1', label:'A1', type:PIN_TYPE.DIGITAL, x: 26, y:  0, side:'top' },
    { id:'A2', label:'A2', type:PIN_TYPE.DIGITAL, x: 42, y:  0, side:'top' },
    { id:'G1', label:'G1', type:PIN_TYPE.DIGITAL, x: 58, y:  0, side:'top' },
    { id:'G2A',label:'G2A',type:PIN_TYPE.DIGITAL, x: 66, y:  0, side:'top' },
    { id:'G2B',label:'G2B',type:PIN_TYPE.DIGITAL, x: 74, y:  0, side:'top' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const state = inst.runtimeState || {};
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = '#1a1a1a';
    roundRect(ctx, 6, 5, 78, 40, 3);
    ctx.fill();
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.stroke();

    ctx.beginPath(); ctx.arc(12, 5, 4, Math.PI, Math.PI * 2);
    ctx.strokeStyle = '#666'; ctx.stroke();

    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(12, 12, 2, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 7px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('74HC138', 45, 20);
    ctx.font = '5px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('3-to-8 Decoder', 45, 28);

    // Active output indicator
    const activeY = state.activeOutput;
    for (let i = 0; i < 8; i++) {
      const isActive = activeY === i;
      const lx = 14 + i * 9;
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

    if (inst.selected) drawSelectionRect(ctx, -2, -4, 94, 58);
    ctx.restore();
  }
});

/* ══════════════════════════════════════════════════════════
   74HC245 — Octal Bus Transceiver
   16-pin DIP: DIR,OE', A1..A8, B8..B1, GND, VCC
   ══════════════════════════════════════════════════════════ */
defComp({
  id: 'ic_74hc245',
  name: '74HC245 Bus Xcvr',
  category: 'Digital ICs',
  icon: 'chip',
  desc: 'Octal bus transceiver — bidirectional 8-bit data buffer with direction control',
  width: 90,
  height: 50,
  defaultProps: {},
  pins: [
    { id:'DIR', label:'DIR', type:PIN_TYPE.DIGITAL, x: 10, y: 50, side:'bottom' },
    { id:'OE',  label:'OE',  type:PIN_TYPE.DIGITAL, x: 18, y: 50, side:'bottom' },
    { id:'A1',  label:'A1',  type:PIN_TYPE.DIGITAL, x: 26, y: 50, side:'bottom' },
    { id:'A2',  label:'A2',  type:PIN_TYPE.DIGITAL, x: 34, y: 50, side:'bottom' },
    { id:'A3',  label:'A3',  type:PIN_TYPE.DIGITAL, x: 42, y: 50, side:'bottom' },
    { id:'A4',  label:'A4',  type:PIN_TYPE.DIGITAL, x: 50, y: 50, side:'bottom' },
    { id:'A5',  label:'A5',  type:PIN_TYPE.DIGITAL, x: 58, y: 50, side:'bottom' },
    { id:'A6',  label:'A6',  type:PIN_TYPE.DIGITAL, x: 66, y: 50, side:'bottom' },
    { id:'A7',  label:'A7',  type:PIN_TYPE.DIGITAL, x: 74, y: 50, side:'bottom' },
    { id:'GND', label:'GND', type:PIN_TYPE.GND,     x: 82, y: 50, side:'bottom' },
    { id:'VCC', label:'VCC', type:PIN_TYPE.POWER,   x: 10, y:  0, side:'top' },
    { id:'B1',  label:'B1',  type:PIN_TYPE.DIGITAL, x: 26, y:  0, side:'top' },
    { id:'B2',  label:'B2',  type:PIN_TYPE.DIGITAL, x: 34, y:  0, side:'top' },
    { id:'B3',  label:'B3',  type:PIN_TYPE.DIGITAL, x: 42, y:  0, side:'top' },
    { id:'B4',  label:'B4',  type:PIN_TYPE.DIGITAL, x: 50, y:  0, side:'top' },
    { id:'B5',  label:'B5',  type:PIN_TYPE.DIGITAL, x: 58, y:  0, side:'top' },
    { id:'B6',  label:'B6',  type:PIN_TYPE.DIGITAL, x: 66, y:  0, side:'top' },
    { id:'B7',  label:'B7',  type:PIN_TYPE.DIGITAL, x: 74, y:  0, side:'top' },
    { id:'B8',  label:'B8',  type:PIN_TYPE.DIGITAL, x: 82, y:  0, side:'top' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const state = inst.runtimeState || {};
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = '#1a1a1a';
    roundRect(ctx, 6, 5, 78, 40, 3);
    ctx.fill();
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.stroke();

    ctx.beginPath(); ctx.arc(12, 5, 4, Math.PI, Math.PI * 2);
    ctx.strokeStyle = '#666'; ctx.stroke();

    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(12, 12, 2, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 7px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('74HC245', 45, 20);
    ctx.font = '5px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('Bus Transceiver', 45, 28);

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

    if (inst.selected) drawSelectionRect(ctx, -2, -4, 94, 58);
    ctx.restore();
  }
});
