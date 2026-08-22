'use strict';
/* components/sensors.js — Sensor component definitions */

/* ─── DHT11 Temperature Sensor ─── */
defComp({
  id: 'dht11',
  name: 'DHT11 Sensor',
  category: 'Sensors',
  icon: '🌡️',
  desc: 'Digital temperature and humidity sensor (0-50C, 20-80% RH)',
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
  desc: 'Ultrasonic distance sensor — measures 2cm to 400cm range',
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

/* ─── LDR Photoresistor ─── */
defComp({
  id: 'ldr',
  name: 'LDR Photoresistor',
  category: 'Sensors',
  icon: '💡',
  desc: 'Light-dependent resistor — outputs analog light level from 0 to 1023',
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
  desc: 'Passive infrared motion sensor — outputs HIGH when movement detected',
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
