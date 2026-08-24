/* components/output.js — Output component definitions */
'use strict';


/*  Shared LED draw helper — used by all coloured LED variants  */
function drawLED(ctx, inst, sim) {
  const { x, y } = inst;
  const col = inst.props.color || '#ff3333';
  const brightness = (inst.runtimeState && inst.runtimeState.brightness !== undefined)
    ? inst.runtimeState.brightness
    : (getInstPinState(inst, 'anode', sim) > 1 ? getInstPinState(inst, 'anode', sim) / 255 : (getInstPinState(inst, 'anode', sim) > 0.05 ? 1 : 0));
  const isOn = (inst.runtimeState && inst.runtimeState.lit !== undefined)
    ? (inst.runtimeState.lit && brightness > 0.01)
    : (brightness > 0.02);
  const blown = !!(inst.runtimeState && inst.runtimeState.blown);

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
    const glowR = 32 + brightness * 20;
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
    ctx.shadowBlur = 18 + brightness * 14;
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

/* LED — Red (default) */
defComp({
  id: 'led',
  name: 'LED (Red)',
  category: 'Output',
  icon: '🔴',
  desc: 'Red light emitting diode — glows when current flows through the anode',
  width: 30,
  height: 60,
  defaultProps: { color: '#ff3333', colorName: 'Red' },
  pins: [
    { id: 'anode',   label: '+', type: PIN_TYPE.PWM,     x: 15, y:  0, side: 'top' },
    { id: 'cathode', label: '−', type: PIN_TYPE.GND,     x: 15, y: 60, side: 'bottom' },
  ],
  draw(ctx, inst, sim) { drawLED(ctx, inst, sim); }
});

/* LED — Green */
defComp({
  id: 'led_green',
  name: 'LED (Green)',
  category: 'Output',
  icon: '🟢',
  desc: 'Green light emitting diode — glows when current flows through the anode',
  width: 30,
  height: 60,
  defaultProps: { color: '#33ff66', colorName: 'Green' },
  pins: [
    { id: 'anode',   label: '+', type: PIN_TYPE.PWM,     x: 15, y:  0, side: 'top' },
    { id: 'cathode', label: '−', type: PIN_TYPE.GND,     x: 15, y: 60, side: 'bottom' },
  ],
  draw(ctx, inst, sim) { drawLED(ctx, inst, sim); }
});

/* LED — Blue */
defComp({
  id: 'led_blue',
  name: 'LED (Blue)',
  category: 'Output',
  icon: '🔵',
  desc: 'Blue light emitting diode — glows when current flows through the anode',
  width: 30,
  height: 60,
  defaultProps: { color: '#3399ff', colorName: 'Blue' },
  pins: [
    { id: 'anode',   label: '+', type: PIN_TYPE.PWM,     x: 15, y:  0, side: 'top' },
    { id: 'cathode', label: '−', type: PIN_TYPE.GND,     x: 15, y: 60, side: 'bottom' },
  ],
  draw(ctx, inst, sim) { drawLED(ctx, inst, sim); }
});

/* LED — Yellow */
defComp({
  id: 'led_yellow',
  name: 'LED (Yellow)',
  category: 'Output',
  icon: '🟡',
  desc: 'Yellow light emitting diode — glows when current flows through the anode',
  width: 30,
  height: 60,
  defaultProps: { color: '#ffee33', colorName: 'Yellow' },
  pins: [
    { id: 'anode',   label: '+', type: PIN_TYPE.PWM,     x: 15, y:  0, side: 'top' },
    { id: 'cathode', label: '−', type: PIN_TYPE.GND,     x: 15, y: 60, side: 'bottom' },
  ],
  draw(ctx, inst, sim) { drawLED(ctx, inst, sim); }
});

/* LED — Orange */
defComp({
  id: 'led_orange',
  name: 'LED (Orange)',
  category: 'Output',
  icon: '🟠',
  desc: 'Orange light emitting diode — glows when current flows through the anode',
  width: 30,
  height: 60,
  defaultProps: { color: '#ff8833', colorName: 'Orange' },
  pins: [
    { id: 'anode',   label: '+', type: PIN_TYPE.PWM,     x: 15, y:  0, side: 'top' },
    { id: 'cathode', label: '−', type: PIN_TYPE.GND,     x: 15, y: 60, side: 'bottom' },
  ],
  draw(ctx, inst, sim) { drawLED(ctx, inst, sim); }
});

/* LED — White */
defComp({
  id: 'led_white',
  name: 'LED (White)',
  category: 'Output',
  icon: '⚪',
  desc: 'White light emitting diode — glows when current flows through the anode',
  width: 30,
  height: 60,
  defaultProps: { color: '#ffffff', colorName: 'White' },
  pins: [
    { id: 'anode',   label: '+', type: PIN_TYPE.PWM,     x: 15, y:  0, side: 'top' },
    { id: 'cathode', label: '−', type: PIN_TYPE.GND,     x: 15, y: 60, side: 'bottom' },
  ],
  draw(ctx, inst, sim) { drawLED(ctx, inst, sim); }
});




/* â”€â”€â”€ Multi-Color LED Array â”€â”€â”€ */
defComp({
  id: 'multi_led_array',
  name: 'Multi-Color LED Array',
  category: 'Output',
  icon: '🌈',
  desc: 'Module with 4 individually controlled LEDs (Red, Yellow, Green, Blue) sharing a common ground',
  width: 90,
  height: 60,
  defaultProps: {},
  pins: [
    { id: 'led_r', label: 'R', type: PIN_TYPE.DIGITAL, x: 15, y: 60, side: 'bottom' },
    { id: 'led_y', label: 'Y', type: PIN_TYPE.DIGITAL, x: 30, y: 60, side: 'bottom' },
    { id: 'led_g', label: 'G', type: PIN_TYPE.DIGITAL, x: 45, y: 60, side: 'bottom' },
    { id: 'led_b', label: 'B', type: PIN_TYPE.DIGITAL, x: 60, y: 60, side: 'bottom' },
    { id: 'gnd',   label: 'âˆ’', type: PIN_TYPE.GND,     x: 75, y: 60, side: 'bottom' },
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
    ctx.fillText('âˆ’', 75, 53);

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



/*-----------RGB LED----------------*/
defComp({
  id: 'rgb_led',
  name: 'RGB LED',
  category: 'Output',
  icon: '🌈',
  desc: 'Tri-color LED with red, green, and blue channels (common cathode)',
  width: 30,
  height: 70,
  defaultProps: {},
  pins: [
    { id: 'red',    label: 'R', type: PIN_TYPE.PWM,  x:  6, y:  0, side: 'top' },
    { id: 'green',  label: 'G', type: PIN_TYPE.PWM,  x: 15, y:  0, side: 'top' },
    { id: 'blue',   label: 'B', type: PIN_TYPE.PWM,  x: 24, y:  0, side: 'top' },
    { id: 'gnd',    label: 'âˆ’', type: PIN_TYPE.GND,  x: 15, y: 70, side: 'bottom' },
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



/* -------BUZZER-------------- */
defComp({
  id: 'buzzer',
  name: 'Buzzer',
  category: 'Output',
  icon: '🔔',
  desc: 'Piezoelectric buzzer — produces a tone when a digital signal is applied',
  width: 40,
  height: 50,
  defaultProps: { frequency: 1000 },
  pins: [
    { id: 'vcc', label: '+', type: PIN_TYPE.DIGITAL, x: 12, y: 50, side: 'bottom' },
    { id: 'gnd', label: 'âˆ’', type: PIN_TYPE.GND,     x: 28, y: 50, side: 'bottom' },
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

    // + and âˆ’ marks
    ctx.fillStyle = '#888';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('+', 12, 48);
    ctx.fillText('âˆ’', 28, 48);

    if (inst.selected) drawSelectionRect(ctx, -3, -3, 46, 56);
    ctx.restore();
  }
});



/* 7-SEGMENT DISPLAY  */
defComp({
  id: 'seg7',
  name: '7-Segment Display',
  category: 'Output',
  icon: '🔢',
  desc: 'Single-digit 7-segment LED display with decimal point',
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


/* -------------- LCD 16x2 (Realistic Design) ------------------ */
// defComp({
//   id: 'lcd1602',
//   name: 'LCD 16×2',
//   category: 'Output',
//   icon: '🖥️',
//   desc: '16x2 character LCD display with HD44780-compatible parallel interface',
//   width: 170,
//   height: 90,
//   defaultProps: { line1: 'Hello, World!  ', line2: 'ArduSim v1.0   ' },
//   pins: [
//     { id:'gnd',  label:'GND', type:PIN_TYPE.GND,     x:  8, y:60, side:'bottom' },
//     { id:'vcc',  label:'VCC', type:PIN_TYPE.POWER,   x: 18, y:60, side:'bottom' },
//     { id:'vo',   label:'V0',  type:PIN_TYPE.SIGNAL,  x: 28, y:60, side:'bottom' },
//     { id:'rs',   label:'RS',  type:PIN_TYPE.DIGITAL, x: 38, y:60, side:'bottom' },
//     { id:'rw',   label:'R/W', type:PIN_TYPE.DIGITAL, x: 48, y:60, side:'bottom' },
//     { id:'en',   label:'EN',  type:PIN_TYPE.DIGITAL, x: 58, y:60, side:'bottom' },
//     { id:'d4',   label:'D4',  type:PIN_TYPE.DIGITAL, x: 78, y:60, side:'bottom' },
//     { id:'d5',   label:'D5',  type:PIN_TYPE.DIGITAL, x: 88, y:60, side:'bottom' },
//     { id:'d6',   label:'D6',  type:PIN_TYPE.DIGITAL, x: 98, y:60, side:'bottom' },
//     { id:'d7',   label:'D7',  type:PIN_TYPE.DIGITAL, x:108, y:60, side:'bottom' },
//   ],
//   draw(ctx, inst, sim) {
//     const { x, y } = inst;
//     const line1 = ((inst.runtimeState && inst.runtimeState.line1) || inst.props.line1 || '').padEnd(16, ' ').substring(0, 16);
//     const line2 = ((inst.runtimeState && inst.runtimeState.line2) || inst.props.line2 || '').padEnd(16, ' ').substring(0, 16);
//     const powered = Boolean(inst.runtimeState && inst.runtimeState.powered);

//     ctx.save();
//     ctx.translate(x, y);

//     // 1. PCB Board (FR4 dark blue/green soldermask)
//     ctx.fillStyle = '#0a3020';
//     roundRect(ctx, 0, 0, 120, 50, 3);
//     ctx.fill();

//     // PCB Corner Mounting Holes (with annular copper rings)
//     const screwHoles = [[4, 4], [116, 4], [4, 46], [116, 46]];
//     screwHoles.forEach(([hx, hy]) => {
//       ctx.fillStyle = '#c8a452'; // Gold/copper pad
//       ctx.beginPath(); ctx.arc(hx, hy, 2.5, 0, Math.PI * 2); ctx.fill();
//       ctx.fillStyle = '#05180f'; // Drill hole
//       ctx.beginPath(); ctx.arc(hx, hy, 1.5, 0, Math.PI * 2); ctx.fill();
//     });

//     // PCB Silkscreen Label
//     ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
//     ctx.font = '5px "JetBrains Mono", monospace';
//     ctx.fillText('1602A', 8, 48);

//     // 2. Metal Bezel Frame (Stamped dark anodized metal casing)
//     const bezelX = 6, bezelY = 4, bezelW = 108, bezelH = 40;
    
//     // Outer Bezel Shadow & Base
//     ctx.fillStyle = '#1e2224';
//     roundRect(ctx, bezelX, bezelY, bezelW, bezelH, 2);
//     ctx.fill();

//     // Metallic Rim Highlights & Shadow (Top-left light, Bottom-right shade)
//     ctx.strokeStyle = '#3a3f44';
//     ctx.lineWidth = 1;
//     ctx.stroke();

//     // Bezel Locking Tabs (Realistic stamped metal tabs)
//     ctx.fillStyle = '#141719';
//     [[bezelX + 22, bezelY - 1], [bezelX + 80, bezelY - 1], [bezelX + 22, bezelY + bezelH - 2], [bezelX + 80, bezelY + bezelH - 2]].forEach(([tx, ty]) => {
//       ctx.fillRect(tx, ty, 6, 3);
//     });

//     // 3. LCD Active Glass Area
//     const glassX = 11, glassY = 8, glassW = 98, glassH = 32;
    
//     // Backlight/Glass Base
//     if (powered) {
//       // Classic HD44780 Yellow-Green Backlight Gradient
//       const bgGrad = ctx.createLinearGradient(glassX, glassY, glassX, glassY + glassH);
//       bgGrad.addColorStop(0, '#a2d638');
//       bgGrad.addColorStop(1, '#81b827');
//       ctx.fillStyle = bgGrad;
//     } else {
//       // Unpowered dark fluid crystal matrix
//       ctx.fillStyle = '#23301a';
//     }
//     ctx.fillRect(glassX, glassY, glassW, glassH);

//     // Glass Inner Drop Shadow
//     ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
//     ctx.lineWidth = 1;
//     ctx.strokeRect(glassX + 0.5, glassY + 0.5, glassW - 1, glassH - 1);

//     // 4. Character Matrix Cells (16x2 Grid Background)
//     const cellW = 5.2;
//     const cellH = 11.5;
//     const startX = 13;
//     const row1Y = 12;
//     const row2Y = 25.5;

//     // Draw unlit 5x8 character cell placeholders
//     ctx.fillStyle = powered ? 'rgba(0, 0, 0, 0.055)' : 'rgba(255, 255, 255, 0.025)';
//     for (let c = 0; c < 16; c++) {
//       ctx.fillRect(startX + c * 6, row1Y, cellW, cellH);
//       ctx.fillRect(startX + c * 6, row2Y, cellW, cellH);
//     }

//     // 5. Active Segment Characters
//     ctx.font = 'bold 8.5px "JetBrains Mono", "Courier New", monospace';
//     ctx.textAlign = 'left';
//     ctx.textBaseline = 'top';

//     if (powered) {
//       // Segment shadow (subtle blur below active LCD fluid)
//       ctx.fillStyle = 'rgba(20, 35, 10, 0.25)';
//       for (let i = 0; i < 16; i++) {
//         ctx.fillText(line1[i], startX + i * 6 + 0.5, row1Y + 2.5);
//         ctx.fillText(line2[i], startX + i * 6 + 0.5, row2Y + 2.5);
//       }
//       // Crisp active segment fluid
//       ctx.fillStyle = '#11220a';
//     } else {
//       ctx.fillStyle = '#2c3d23';
//     }

//     for (let i = 0; i < 16; i++) {
//       ctx.fillText(line1[i], startX + i * 6, row1Y + 2);
//       ctx.fillText(line2[i], startX + i * 6, row2Y + 2);
//     }

//     // 6. Header Strip & Gold Pins
//     // Black plastic pin header mold
//     ctx.fillStyle = '#1c1c1c';
//     ctx.fillRect(5, 48, 110, 4);

//     // Pin contacts and leads
//     const pinXs = [8, 18, 28, 38, 48, 58, 78, 88, 98, 108];
//     pinXs.forEach(px => {
//       // Gold/Silver Pin Lead
//       ctx.fillStyle = '#ffd066';
//       ctx.fillRect(px - 1, 52, 2, 8);
//       // Solder point on PCB
//       ctx.fillStyle = '#d4af37';
//       ctx.beginPath(); ctx.arc(px, 50, 1.2, 0, Math.PI * 2); ctx.fill();
//     });

//     if (inst.selected) drawSelectionRect(ctx, -3, -3, 126, 66);
//     ctx.restore();
//   }
// });

/* -------------- LCD 16x2 (Parallel HD44780 - Large Realistic Design) ------------------ */
defComp({
  id: 'lcd1602',
  name: 'LCD 16×2',
  category: 'Output',
  icon: '🖥️',
  desc: '16x2 character LCD display with HD44780-compatible 4-bit parallel interface (Enlarged)',
  width: 170,
  height: 90,
  defaultProps: { line1: 'Hello, World!  ', line2: 'ArduSim v1.0   ' },
  pins: [
    { id: 'gnd', label: 'GND', type: PIN_TYPE.GND,     x:  14, y: 90, side: 'bottom' },
    { id: 'vcc', label: 'VCC', type: PIN_TYPE.POWER,   x:  28, y: 90, side: 'bottom' },
    { id: 'vo',  label: 'V0',  type: PIN_TYPE.SIGNAL,  x:  42, y: 90, side: 'bottom' },
    { id: 'rs',  label: 'RS',  type: PIN_TYPE.DIGITAL, x:  56, y: 90, side: 'bottom' },
    { id: 'rw',  label: 'R/W', type: PIN_TYPE.DIGITAL, x:  70, y: 90, side: 'bottom' },
    { id: 'en',  label: 'EN',  type: PIN_TYPE.DIGITAL, x:  84, y: 90, side: 'bottom' },
    { id: 'd4',  label: 'D4',  type: PIN_TYPE.DIGITAL, x: 112, y: 90, side: 'bottom' },
    { id: 'd5',  label: 'D5',  type: PIN_TYPE.DIGITAL, x: 126, y: 90, side: 'bottom' },
    { id: 'd6',  label: 'D6',  type: PIN_TYPE.DIGITAL, x: 140, y: 90, side: 'bottom' },
    { id: 'd7',  label: 'D7',  type: PIN_TYPE.DIGITAL, x: 154, y: 90, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const line1 = ((inst.runtimeState && inst.runtimeState.line1) || inst.props.line1 || '').padEnd(16, ' ').substring(0, 16);
    const line2 = ((inst.runtimeState && inst.runtimeState.line2) || inst.props.line2 || '').padEnd(16, ' ').substring(0, 16);
    const powered = Boolean(inst.runtimeState && inst.runtimeState.powered);

    ctx.save();
    ctx.translate(x, y);

    // 1. PCB Main Board (FR4 Dark Forest Green Mask)
    ctx.fillStyle = '#0a3020';
    roundRect(ctx, 0, 0, 170, 74, 4);
    ctx.fill();

    // Corner Mounting Holes with Annular Gold Rings
    const screwHoles = [[6, 6], [164, 6], [6, 68], [164, 68]];
    screwHoles.forEach(([hx, hy]) => {
      ctx.fillStyle = '#c8a452';
      ctx.beginPath(); ctx.arc(hx, hy, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#05180f';
      ctx.beginPath(); ctx.arc(hx, hy, 2, 0, Math.PI * 2); ctx.fill();
    });

    // Board Model Silkscreen
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = 'bold 6px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('1602A HD44780', 14, 69);

    // 2. Metal Bezel Frame (Dark Anodized Stamped Metal Enclosure)
    const bezelX = 10, bezelY = 5, bezelW = 150, bezelH = 55;
    ctx.fillStyle = '#1e2224';
    roundRect(ctx, bezelX, bezelY, bezelW, bezelH, 3);
    ctx.fill();

    // Metallic Outer Rim Highlight & Shadow
    ctx.strokeStyle = '#3a3f44';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Metal Locking Tabs (Stamped Casing Clasps)
    ctx.fillStyle = '#121517';
    [[bezelX + 30, bezelY - 1], [bezelX + 114, bezelY - 1], [bezelX + 30, bezelY + bezelH - 2], [bezelX + 114, bezelY + bezelH - 2]].forEach(([tx, ty]) => {
      ctx.fillRect(tx, ty, 8, 3.5);
    });

    // 3. Active LCD Glass Area
    const glassX = 16, glassY = 10, glassW = 138, glassH = 45;
    if (powered) {
      // Classic HD44780 Yellow-Green Backlight Gradient
      const bgGrad = ctx.createLinearGradient(glassX, glassY, glassX, glassY + glassH);
      bgGrad.addColorStop(0, '#a5db3b');
      bgGrad.addColorStop(1, '#81b827');
      ctx.fillStyle = bgGrad;
    } else {
      // Unpowered Liquid Crystal
      ctx.fillStyle = '#23301a';
    }
    ctx.fillRect(glassX, glassY, glassW, glassH);

    // Inner Glass Shadow
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(glassX + 0.5, glassY + 0.5, glassW - 1, glassH - 1);

    // 4. Character Matrix Cells (16x2 Grid Background Ghosting)
    const cellW = 7.5, cellH = 16.5, startX = 20, row1Y = 13.5, row2Y = 33.5;
    ctx.fillStyle = powered ? 'rgba(0, 0, 0, 0.055)' : 'rgba(255, 255, 255, 0.025)';
    for (let c = 0; c < 16; c++) {
      ctx.fillRect(startX + c * 8.4, row1Y, cellW, cellH);
      ctx.fillRect(startX + c * 8.4, row2Y, cellW, cellH);
    }

    // 5. Active Text Segments
    ctx.font = 'bold 12.5px "JetBrains Mono", "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    if (powered) {
      // Fluid Sub-Pixel Drop Shadow
      ctx.fillStyle = 'rgba(20, 35, 10, 0.25)';
      for (let i = 0; i < 16; i++) {
        ctx.fillText(line1[i], startX + i * 8.4 + 0.5, row1Y + 2);
        ctx.fillText(line2[i], startX + i * 8.4 + 0.5, row2Y + 2);
      }
      ctx.fillStyle = '#11220a';
    } else {
      ctx.fillStyle = '#2c3d23';
    }

    for (let i = 0; i < 16; i++) {
      ctx.fillText(line1[i], startX + i * 8.4, row1Y + 1.5);
      ctx.fillText(line2[i], startX + i * 8.4, row2Y + 1.5);
    }

    // 6. Pinout Silkscreen Labels
    const pins = [
      { label: 'GND', x: 14 }, { label: 'VCC', x: 28 }, { label: 'V0', x: 42 },
      { label: 'RS',  x: 56 }, { label: 'RW',  x: 70 }, { label: 'E',  x: 84 },
      { label: 'D4',  x: 112 }, { label: 'D5', x: 126 }, { label: 'D6', x: 140 }, { label: 'D7', x: 154 }
    ];

    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = 'bold 5px "JetBrains Mono", sans-serif';
    ctx.textAlign = 'center';
    pins.forEach(p => {
      ctx.fillText(p.label, p.x, 69);
    });

    // 7. Molded Plastic Header Shroud & Gold Pin Leads
    ctx.fillStyle = '#181818';
    roundRect(ctx, 8, 73, 154, 5, 1);
    ctx.fill();

    pins.forEach(p => {
      // Solder Pad on PCB
      ctx.fillStyle = '#c8a452';
      ctx.beginPath(); ctx.arc(p.x, 70.5, 1.5, 0, Math.PI * 2); ctx.fill();

      // Gold Lead Terminal
      ctx.fillStyle = '#ffd066';
      ctx.fillRect(p.x - 1.2, 78, 2.4, 12);
    });

    if (inst.selected) drawSelectionRect(ctx, -4, -4, 178, 98);
    ctx.restore();
  }
});
/* -------------- LCD 16x2 (I2C Backpack - Large Realistic Design) ------------------ */
defComp({
  id: 'lcd1602_i2c',
  name: 'LCD 16x2 (I2C)',
  category: 'Output',
  icon: '🖥️',
  desc: '16x2 character LCD display with integrated PCF8574 I2C daughterboard adapter (Enlarged)',
  width: 170,
  height: 90,
  defaultProps: { address: '0x27', line1: 'Hello, I2C!    ', line2: 'Addr: 0x27      ' },
  // interactive: [
  //   { field: 'address', label: 'I2C Addr', type: 'text' },
  // ],
  pins: [
    { id: 'gnd', label: 'GND', type: PIN_TYPE.GND,     x: 50, y: 90, side: 'bottom' },
    { id: 'vcc', label: 'VCC', type: PIN_TYPE.POWER,   x: 70, y: 90, side: 'bottom' },
    { id: 'sda', label: 'SDA', type: PIN_TYPE.DIGITAL, x: 90, y: 90, side: 'bottom' },
    { id: 'scl', label: 'SCL', type: PIN_TYPE.DIGITAL, x: 110, y: 90, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const line1 = ((inst.runtimeState && inst.runtimeState.line1) || inst.props.line1 || '').padEnd(16, ' ').substring(0, 16);
    const line2 = ((inst.runtimeState && inst.runtimeState.line2) || inst.props.line2 || '').padEnd(16, ' ').substring(0, 16);
    const powered = Boolean(inst.runtimeState && inst.runtimeState.powered);

    ctx.save();
    ctx.translate(x, y);

    // 1. Main Display PCB (FR4 Dark Green/Blue Mask) - Enlarged
    ctx.fillStyle = '#0a3020';
    roundRect(ctx, 0, 0, 170, 70, 4);
    ctx.fill();

    // Corner Mounting Holes with Gold Annular Rings
    const screwHoles = [[6, 6], [164, 6], [6, 64], [164, 64]];
    screwHoles.forEach(([hx, hy]) => {
      ctx.fillStyle = '#c8a452';
      ctx.beginPath(); ctx.arc(hx, hy, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#05180f';
      ctx.beginPath(); ctx.arc(hx, hy, 2, 0, Math.PI * 2); ctx.fill();
    });

    // 2. Metal Enclosure Bezel - Enlarged & Proportional
    const bezelX = 10, bezelY = 5, bezelW = 150, bezelH = 54;
    ctx.fillStyle = '#1e2224';
    roundRect(ctx, bezelX, bezelY, bezelW, bezelH, 3);
    ctx.fill();

    ctx.strokeStyle = '#3a3f44';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Stamped Metal Bezel Clamps
    ctx.fillStyle = '#121517';
    [[bezelX + 30, bezelY - 1], [bezelX + 114, bezelY - 1], [bezelX + 30, bezelY + bezelH - 2], [bezelX + 114, bezelY + bezelH - 2]].forEach(([tx, ty]) => {
      ctx.fillRect(tx, ty, 8, 3.5);
    });

    // 3. LCD Active Matrix Glass (High-Contrast HD44780 Backlight)
    const glassX = 16, glassY = 10, glassW = 138, glassH = 44;
    if (powered) {
      const grad = ctx.createLinearGradient(glassX, glassY, glassX, glassY + glassH);
      grad.addColorStop(0, '#a5db3b');
      grad.addColorStop(1, '#81b827');
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = '#23301a';
    }
    ctx.fillRect(glassX, glassY, glassW, glassH);

    // Inner Glass Shadow
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(glassX + 0.5, glassY + 0.5, glassW - 1, glassH - 1);

    // 4. Character Cells (5x8 Grid Ghost Matrix) - Scaled Up
    const cellW = 7.5, cellH = 16, startX = 20, row1Y = 13, row2Y = 32;
    ctx.fillStyle = powered ? 'rgba(0, 0, 0, 0.055)' : 'rgba(255, 255, 255, 0.025)';
    for (let c = 0; c < 16; c++) {
      ctx.fillRect(startX + c * 8.4, row1Y, cellW, cellH);
      ctx.fillRect(startX + c * 8.4, row2Y, cellW, cellH);
    }

    // 5. Active Text Segments - Larger Readable Font
    ctx.font = 'bold 12.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    if (powered) {
      ctx.fillStyle = 'rgba(20, 35, 10, 0.25)';
      for (let i = 0; i < 16; i++) {
        ctx.fillText(line1[i], startX + i * 8.4 + 0.5, row1Y + 2);
        ctx.fillText(line2[i], startX + i * 8.4 + 0.5, row2Y + 2);
      }
      ctx.fillStyle = '#11220a';
    } else {
      ctx.fillStyle = '#2c3d23';
    }

    for (let i = 0; i < 16; i++) {
      ctx.fillText(line1[i], startX + i * 8.4, row1Y + 1.5);
      ctx.fillText(line2[i], startX + i * 8.4, row2Y + 1.5);
    }

    // 6. I2C Daughterboard (Piggyback PCB - Dark Blue FR4) - Scaled & Repositioned
    const bpX = 30, bpY = 64, bpW = 110, bpH = 20;
    ctx.fillStyle = '#0f2744';
    roundRect(ctx, bpX, bpY, bpW, bpH, 2.5);
    ctx.fill();
    ctx.strokeStyle = '#1e4878';
    ctx.lineWidth = 1;
    ctx.stroke();

    // PCF8574 Expander IC (SOIC Package)
    ctx.fillStyle = '#1c1c1c';
    ctx.fillRect(bpX + 6, bpY + 4, 18, 12);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = '5.5px "JetBrains Mono", monospace';
    ctx.fillText('PCF8574', bpX + 7, bpY + 8);
    // Pin 1 Notch/Dot
    ctx.fillStyle = '#444';
    ctx.beginPath(); ctx.arc(bpX + 9, bpY + 6.5, 0.8, 0, Math.PI * 2); ctx.fill();

    // Contrast Trimpot (Blue casing with brass center dial)
    ctx.fillStyle = '#1d4ed8';
    roundRect(ctx, bpX + 90, bpY + 3, 12, 12, 1.5);
    ctx.fill();
    ctx.fillStyle = '#eab308';
    ctx.beginPath(); ctx.arc(bpX + 96, bpY + 9, 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#854d0e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bpX + 93.5, bpY + 9); ctx.lineTo(bpX + 98.5, bpY + 9);
    ctx.moveTo(bpX + 96, bpY + 6.5); ctx.lineTo(bpX + 96, bpY + 11.5);
    ctx.stroke();

    // Backlight Jumper Cap (Black 2-pin shunt)
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(bpX + 74, bpY + 4.5, 8, 10);
    ctx.fillStyle = '#eab308';
    ctx.fillRect(bpX + 75.5, bpY + 3, 1.5, 1.5);
    ctx.fillRect(bpX + 79, bpY + 3, 1.5, 1.5);

    // Silkscreen Pin Labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '6px "JetBrains Mono", sans-serif';
    ctx.fillText('GND', bpX + 17, bpY + 13);
    ctx.fillText('VCC', bpX + 37, bpY + 13);
    ctx.fillText('SDA', bpX + 57, bpY + 13);
    ctx.fillText('SCL', bpX + 77, bpY + 13);

    // 7. 4-Pin Header Mold & Terminals
    ctx.fillStyle = '#181818';
    roundRect(ctx, 43, 84, 84, 6, 1);
    ctx.fill();

    const pinXs = [50, 70, 90, 110];
    pinXs.forEach(px => {
      // Solder Joint on Adapter PCB
      ctx.fillStyle = '#c8a452';
      ctx.beginPath(); ctx.arc(px, 80, 1.8, 0, Math.PI * 2); ctx.fill();
      // Gold Pin Lead
      ctx.fillStyle = '#ffd066';
      ctx.fillRect(px - 1.2, 84, 2.4, 6);
    });

    if (inst.selected) drawSelectionRect(ctx, -4, -4, 178, 98);
    ctx.restore();
  }
});
/*---------OLED 128x64 (SSD1306, I2C)--------------- */

/* -------------- OLED 128x64 SSD1306 (Realistic Design) ------------------ */
defComp({
  id: 'oled_ssd1306',
  name: 'OLED 128x64 (I2C)',
  category: 'Output',
  icon: '🖥️',
  desc: '0.96" 128x64 monochrome OLED display with SSD1306 I2C controller',
  width: 132,
  height: 76,
  defaultProps: { address: '0x3C' },
  // interactive: [
  //   { field: 'address', label: 'I2C Addr', type: 'text' },
  // ],
  pins: [
    { id: 'gnd', label: 'GND', type: PIN_TYPE.GND,     x: 36, y: 76, side: 'bottom' },
    { id: 'vcc', label: 'VCC', type: PIN_TYPE.POWER,   x: 52, y: 76, side: 'bottom' },
    { id: 'scl', label: 'SCL', type: PIN_TYPE.DIGITAL, x: 68, y: 76, side: 'bottom' },
    { id: 'sda', label: 'SDA', type: PIN_TYPE.DIGITAL, x: 84, y: 76, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const o = inst.runtimeState && inst.runtimeState.oled;
    const powered = Boolean(o && o.power);

    ctx.save();
    ctx.translate(x, y);

    // 1. Blue FR4 Module PCB Board
    ctx.fillStyle = '#0a1628';
    roundRect(ctx, 0, 0, 132, 68, 3);
    ctx.fill();

    // Subtle PCB copper ground plane edge
    ctx.strokeStyle = '#183153';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 4 Corner Gold-Plated Mounting Holes
    const screwHoles = [[4, 4], [128, 4], [4, 64], [128, 64]];
    screwHoles.forEach(([hx, hy]) => {
      ctx.fillStyle = '#c8a452'; // Gold pad
      ctx.beginPath(); ctx.arc(hx, hy, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#040b14'; // Drill hole
      ctx.beginPath(); ctx.arc(hx, hy, 1.4, 0, Math.PI * 2); ctx.fill();
    });

    // PCB Silkscreen Labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '5px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('0.96" OLED', 8, 65);

    ctx.textAlign = 'right';
    ctx.fillText(inst.props.address || '0x3C', 124, 65);

    // 2. Ultra-Thin Protective Glass Panel Substrate
    const glassX = 1.5, glassY = 2, glassW = 129, glassH = 55;
    
    // Glass Outer Shadow & Bevel
    ctx.fillStyle = '#03070d';
    roundRect(ctx, glassX, glassY, glassW, glassH, 1.5);
    ctx.fill();

    // Glass Polished Edge Reflection Highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Bottom Kapton Flex Ribbon Connector (amber ribbon peek under glass)
    ctx.fillStyle = '#995c00';
    ctx.fillRect(40, 56, 52, 2.5);
    ctx.fillStyle = '#b36b00';
    for (let rx = 42; rx < 90; rx += 3) {
      ctx.fillRect(rx, 56, 1.2, 2.5);
    }

    // 3. Active 128x64 OLED Matrix Area
    const screenX = 2, screenY = 3, screenW = 128, screenH = 52;
    // Deep Infinite Pitch Black OLED Base
    ctx.fillStyle = powered ? '#010306' : '#040810';
    ctx.fillRect(screenX, screenY, screenW, screenH);

    // 4. Pixel & Buffer Rendering
    const litColor = o && o.invert ? '#010306' : '#38bdf8'; // Vivid Cyan-Blue OLED Emissive
    const dimColor = o && o.invert ? '#38bdf8' : '#010306';

    if (o && o.pixels) {
      if (o.invert) {
        ctx.fillStyle = dimColor;
        ctx.fillRect(screenX, screenY, screenW, screenH);
      }
      ctx.fillStyle = litColor;
      const px = o.pixels;
      for (let i = 0; i < px.length; i++) {
        if (!px[i]) continue;
        ctx.fillRect(screenX + (i % 128), screenY + ((i / 128) | 0), 1, 1);
      }
    }

    // Text Overlay Layer (Adafruit_GFX / SSD1306 driver compatibility)
    if (o && o.texts) {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      for (const t of o.texts) {
        ctx.font = `${t.size * 8}px "JetBrains Mono", monospace`;
        ctx.fillStyle = (o.invert ? t.color === 0 : t.color === 1) ? '#38bdf8' : '#010306';
        ctx.fillText(t.text, screenX + t.x, screenY + t.y);
      }
    }

    // Glass Surface Specular Reflection Glare
    const glareGrad = ctx.createLinearGradient(screenX, screenY, screenX + screenW, screenY + screenH);
    glareGrad.addColorStop(0, 'rgba(255, 255, 255, 0.04)');
    glareGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.01)');
    glareGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = glareGrad;
    ctx.fillRect(screenX, screenY, screenW, screenH);

    // 5. Standby Screen (When unpowered or booting)
    if (!powered) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
      ctx.font = 'bold 8px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('SSD1306 OLED', 66, 29);
    }

    // 6. I2C Pinout Silkscreen Labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = 'bold 5px "JetBrains Mono", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GND', 36, 62);
    ctx.fillText('VCC', 52, 62);
    ctx.fillText('SCL', 68, 62);
    ctx.fillText('SDA', 84, 62);

    // 7. 4-Pin Male Header Strip & Solder Terminals
    ctx.fillStyle = '#111111';
    roundRect(ctx, 28, 66, 64, 4, 1);
    ctx.fill();

    const pinXs = [36, 52, 68, 84];
    pinXs.forEach(px => {
      // Circular Gold PCB Solder Pad
      ctx.fillStyle = '#c8a452';
      ctx.beginPath(); ctx.arc(px, 60, 1.2, 0, Math.PI * 2); ctx.fill();
      // Gold Contact Pin Lead
      ctx.fillStyle = '#ffd066';
      ctx.fillRect(px - 1, 68, 2, 8);
    });

    if (inst.selected) drawSelectionRect(ctx, -3, -3, 138, 82);
    ctx.restore();
  }
});