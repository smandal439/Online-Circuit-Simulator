'use strict';
/* components/input.js — Input component definitions */

/* ─── PUSH BUTTON ─── */


/* ═══════════════════════════════════════════════════════
   4-Pin Tactile Push Button Component
   ═══════════════════════════════════════════════════════ */

defComp({
  id: 'push_button',
  name: 'Push Button',
  category: 'Input',
  icon: '🔘',
  desc: 'Momentary tactile push button — bridges left and right vertical rails when pressed',
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
    const pressed = !!(inst.runtimeState?.pressed || inst.props?.pressed);

    ctx.save();
    ctx.translate(x, y);

    // ── Outer Pin Terminal Leads ──
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    [[8, 0], [32, 0], [8, 40], [32, 40]].forEach(([px, py]) => {
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px, py < 20 ? 10 : 30);
      ctx.stroke();
    });

    // ── Main Body Housing ──
    ctx.fillStyle = '#222';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(4, 8, 32, 24, 4);
    } else if (typeof roundRect === 'function') {
      roundRect(ctx, 4, 8, 32, 24, 4);
    } else {
      ctx.rect(4, 8, 32, 24);
    }
    ctx.fill();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.stroke();

    // ── Vertical Internal Side Bus Rails ──
    // Left side rail (Pin 1 to Pin 3)
    ctx.strokeStyle = pressed ? '#00e5ff' : '#aaa';
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(8, 10); ctx.lineTo(8, 30); ctx.stroke();

    // Right side rail (Pin 2 to Pin 4)
    ctx.strokeStyle = pressed ? '#00e5ff' : '#aaa';
    ctx.beginPath(); ctx.moveTo(32, 10); ctx.lineTo(32, 30); ctx.stroke();

    // ── Internal Contact Points & Bridging Bar ──
    if (pressed) {
      // CLOSED STATE: Active bridge connects left rail (x=8) straight to right rail (x=32)
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#00ffcc';
      ctx.shadowBlur = 8;

      ctx.beginPath();
      ctx.moveTo(8, 20);
      ctx.lineTo(32, 20);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Contact point nodes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(8, 20, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(32, 20, 2, 0, Math.PI * 2); ctx.fill();
    } else {
      // OPEN STATE: Contact stubs with open central gap and suspended bridge bar above
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 1.5;

      // Left terminal contact stub
      ctx.beginPath(); ctx.moveTo(8, 20); ctx.lineTo(13, 20); ctx.stroke();
      // Right terminal contact stub
      ctx.beginPath(); ctx.moveTo(32, 20); ctx.lineTo(27, 20); ctx.stroke();

      // Disconnected bridge bar suspended above contact gap (Open Circuit)
      ctx.strokeStyle = '#e74c3c';
      ctx.beginPath(); ctx.moveTo(13, 15); ctx.lineTo(27, 15); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(20, 15); ctx.lineTo(20, 11); ctx.stroke(); // Actuator stem
    }

    // ── Tactile Button Center Plunger Cap ──
    const capRadius = pressed ? 6.5 : 7.5;
    ctx.fillStyle = pressed ? '#1b4f72' : '#2980b9';
    ctx.beginPath();
    ctx.arc(20, 20, capRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = pressed ? '#00e5ff' : '#5DADE2';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Specular Highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(pressed ? 18.5 : 18, pressed ? 18.5 : 18, 2, 0, Math.PI * 2);
    ctx.fill();

    // ── Selection Boundary ──
    if (inst.selected && typeof drawSelectionRect === 'function') {
      drawSelectionRect(ctx, -3, -3, 46, 46);
    }

    ctx.restore();
  }
});
/* ─── POTENTIOMETER ─── */
defComp({
  id: 'potentiometer',
  name: 'Potentiometer',
  category: 'Input',
  icon: '🎚️',
  desc: '10k-ohm variable resistor with wiper output (0-1023)',
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

/* ─── Joystick ─── */
defComp({
  id: 'joystick',
  name: 'Joystick Module',
  category: 'Input',
  icon: '🕹️',
  desc: '2-axis analog joystick with center-push button (X, Y, switch)',
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


/* -------------- 4x4 Matrix Membrane Keypad ------------------ */
defComp({
  id: 'keypad_4x4',
  name: '4x4 Matrix Keypad',
  category: 'Input',
  icon: '⌨️',
  desc: '16-button matrix keypad with 8-pin interface (4 Row pins, 4 Column pins) for microcontroller scanning',
  width: 140,
  height: 160,
  defaultProps: {
    pressedKey: null,
  },
  pins: [
    { id: 'R1', label: 'R1', type: PIN_TYPE.DIGITAL, x: 20,  y: 160, side: 'bottom' },
    { id: 'R2', label: 'R2', type: PIN_TYPE.DIGITAL, x: 34,  y: 160, side: 'bottom' },
    { id: 'R3', label: 'R3', type: PIN_TYPE.DIGITAL, x: 48,  y: 160, side: 'bottom' },
    { id: 'R4', label: 'R4', type: PIN_TYPE.DIGITAL, x: 62,  y: 160, side: 'bottom' },
    { id: 'C1', label: 'C1', type: PIN_TYPE.DIGITAL, x: 78,  y: 160, side: 'bottom' },
    { id: 'C2', label: 'C2', type: PIN_TYPE.DIGITAL, x: 92,  y: 160, side: 'bottom' },
    { id: 'C3', label: 'C3', type: PIN_TYPE.DIGITAL, x: 106, y: 160, side: 'bottom' },
    { id: 'C4', label: 'C4', type: PIN_TYPE.DIGITAL, x: 120, y: 160, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const pressedKey = inst.runtimeState?.pressedKey ?? inst.props.pressedKey ?? null;

    const keys = [
      ['1', '2', '3', 'A'],
      ['4', '5', '6', 'B'],
      ['7', '8', '9', 'C'],
      ['*', '0', '#', 'D']
    ];

    ctx.save();
    ctx.translate(x, y);

    // 1. Black Flexible Polymer Membrane Backing Sheet
    ctx.fillStyle = '#181a1b';
    roundRect(ctx, 4, 4, 132, 142, 6);
    ctx.fill();
    ctx.strokeStyle = '#2d3135';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Graphic Outline Bevel Frame
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 1.5;
    roundRect(ctx, 8, 8, 124, 114, 4);
    ctx.stroke();

    // 2. Render 4x4 Keypad Buttons
    const btnW = 24;
    const btnH = 20;
    const startX = 14;
    const startY = 14;
    const gapX = 6;
    const gapY = 6;

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const keyChar = keys[row][col];
        const kx = startX + col * (btnW + gapX);
        const ky = startY + row * (btnH + gapY);
        const isPressed = (pressedKey === keyChar);
        const isLetter = ['A', 'B', 'C', 'D'].includes(keyChar);

        // (Keypad column state is computed live in simulator digitalRead)

        // Button Surface Base
        const btnGrad = ctx.createLinearGradient(kx, ky, kx, ky + btnH);
        if (isPressed) {
          btnGrad.addColorStop(0, '#ffa000');
          btnGrad.addColorStop(1, '#ff6f00');
        } else if (isLetter) {
          btnGrad.addColorStop(0, '#37474f');
          btnGrad.addColorStop(1, '#212121');
        } else {
          btnGrad.addColorStop(0, '#424242');
          btnGrad.addColorStop(1, '#1c1c1c');
        }

        ctx.fillStyle = btnGrad;
        roundRect(ctx, kx, ky, btnW, btnH, 3);
        ctx.fill();

        // Key Border Highlight & Inset Shadow
        ctx.strokeStyle = isPressed ? '#ffe082' : (isLetter ? '#78909c' : '#616161');
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Key Characters / Legend Printing
        ctx.fillStyle = isPressed ? '#000000' : (isLetter ? '#ffb74d' : '#ffffff');
        ctx.font = 'bold 10px "JetBrains Mono", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(keyChar, kx + btnW / 2, ky + btnH / 2 + 3.5);
      }
    }

    // 3. Ribbon Cable Escape Connector Tail
    ctx.fillStyle = '#101213';
    ctx.fillRect(12, 122, 116, 16);

    // Flex cable trace silkscreen lines
    ctx.strokeStyle = '#c8a452';
    ctx.lineWidth = 0.8;
    const pinXs = [20, 34, 48, 62, 78, 92, 106, 120];
    pinXs.forEach(px => {
      ctx.beginPath();
      ctx.moveTo(px, 122);
      ctx.lineTo(px, 148);
      ctx.stroke();
    });

    // Silkscreen Pin Labels
    ctx.fillStyle = '#b0bec5';
    ctx.font = 'bold 5px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ['R1', 'R2', 'R3', 'R4', 'C1', 'C2', 'C3', 'C4'].forEach((lbl, idx) => {
      ctx.fillText(lbl, pinXs[idx], 130);
    });

    // Bottom Solder Pad Headers
    pinXs.forEach(px => {
      ctx.fillStyle = '#c8a452';
      ctx.beginPath(); ctx.arc(px, 150, 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0f1112';
      ctx.beginPath(); ctx.arc(px, 150, 1, 0, Math.PI * 2); ctx.fill();
    });

    if (inst.selected) drawSelectionRect(ctx, 0, 0, 140, 160);
    ctx.restore();
  }
});