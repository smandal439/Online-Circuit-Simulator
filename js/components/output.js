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



/* --------------LCD 16x2 ------------------ */
defComp({
  id: 'lcd1602',
  name: 'LCD 16×2',
  category: 'Output',
  icon: '🖥️',
  desc: '16x2 character LCD display with parallel interface',
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



/*------------LCD 16x2 (I2C)-------------- */
defComp({
  id: 'lcd1602_i2c',
  name: 'LCD 16x2 (I2C)',
  category: 'Output',
  icon: '🖥️',
  desc: '16x2 character LCD with PCF8574 I2C adapter — uses only SDA and SCL',
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



/*---------OLED 128x64 (SSD1306, I2C)--------------- */
defComp({
  id: 'oled_ssd1306',
  name: 'OLED 128x64 (I2C)',
  category: 'Output',
  icon: '🖥️',
  desc: '128x64 monochrome OLED display with SSD1306 I2C controller',
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

    // Screen (128Ã—64 internal, rendered 1:1)
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

