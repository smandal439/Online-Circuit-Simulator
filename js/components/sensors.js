'use strict';
/* components/sensors.js — Sensor component definitions */


/* -------------- DHT11 Sensor with High-Contrast On-Body Live Data Display ------------------ */
defComp({
  id: 'dht11',
  name: 'DHT11 Sensor',
  category: 'Sensors',
  icon: '🌡️',
  desc: 'Digital temperature and humidity sensor with real-time on-body readout',
  width: 58,
  height: 88,
  defaultProps: { temperature: 25, humidity: 60 },
  interactive: [
    { field: 'temperature', label: 'Temp', min: 0, max: 50, step: 1, unit: '°C' },
    { field: 'humidity',    label: 'Hum',  min: 0, max: 100, step: 1, unit: '%' },
  ],
  pins: [
    { id: 'vcc',  label: 'VCC',  type: PIN_TYPE.POWER,   x: 13, y: 88, side: 'bottom' },
    { id: 'data', label: 'DAT',  type: PIN_TYPE.DIGITAL, x: 23, y: 88, side: 'bottom' },
    { id: 'nc',   label: 'NC',   type: PIN_TYPE.SIGNAL,  x: 35, y: 88, side: 'bottom' },
    { id: 'gnd',  label: 'GND',  type: PIN_TYPE.GND,     x: 45, y: 88, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;

    // Resolve current runtime state or fallback to props
    const temp = (inst.runtimeState && inst.runtimeState.temperature !== undefined)
      ? inst.runtimeState.temperature
      : (inst.props.temperature ?? 25);

    const hum = (inst.runtimeState && inst.runtimeState.humidity !== undefined)
      ? inst.runtimeState.humidity
      : (inst.props.humidity ?? 60);

    ctx.save();
    ctx.translate(x, y);

    // 1. Outer Housing Casing
    ctx.fillStyle = '#0e4194';
    roundRect(ctx, 3, 2, 52, 68, 5);
    ctx.fill();

    // 2. Main Blue Textured Plastic Body
    const bodyGrad = ctx.createLinearGradient(3, 2, 55, 70);
    bodyGrad.addColorStop(0, '#2b7cf8');
    bodyGrad.addColorStop(0.5, '#1964d8');
    bodyGrad.addColorStop(1, '#0e4cae');
    ctx.fillStyle = bodyGrad;
    roundRect(ctx, 4, 3, 50, 66, 4);
    ctx.fill();

    // Top Rim Highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(8, 4);
    ctx.lineTo(50, 4);
    ctx.stroke();

    // 3. Sensor Vent Lattice (Top Half)
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 4; col++) {
        const vx = 8 + col * 11;
        const vy = 8 + row * 8;

        // Dark Interior Cavity
        ctx.fillStyle = '#081a3e';
        roundRect(ctx, vx, vy, 8, 5.5, 1);
        ctx.fill();

        // Mesh Texture
        ctx.fillStyle = '#10306b';
        ctx.fillRect(vx + 1.5, vy + 1, 5, 3.5);
      }
    }

    // 4. Silkscreen Sensor ID
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = 'bold 6.5px "JetBrains Mono", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DHT11 SENSOR', 29, 29);

    // 5. High-Contrast Live Data Display Window
    // Display Screen Bezel & Background
    ctx.fillStyle = '#060f1e';
    roundRect(ctx, 7, 33, 44, 26, 3);
    ctx.fill();

    ctx.strokeStyle = '#00c6ff';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Temperature Badge (Row 1)
    ctx.fillStyle = '#ff9800';
    ctx.font = 'bold 5.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('T:', 10, 43);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${temp}°C`, 48, 44);

    // Subtle Divider Line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(10, 47);
    ctx.lineTo(48, 47);
    ctx.stroke();

    // Humidity Badge (Row 2)
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 5.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('H:', 10, 55);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${hum}%`, 48, 56);

    // 6. Base Transition Molding & Silkscreen Pin Labels
    ctx.fillStyle = '#0d367c';
    ctx.fillRect(6, 65, 46, 4);

    const pinDefs = [
      { id: 'vcc',  label: 'VCC', x: 13 },
      { id: 'data', label: 'DAT', x: 23 },
      { id: 'nc',   label: 'NC',  x: 35 },
      { id: 'gnd',  label: 'GND', x: 45 },
    ];

    pinDefs.forEach(p => {
      // Pin Label Silkscreen
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = 'bold 4.5px "JetBrains Mono", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.label, p.x, 64);

      // Pin Header Socket Collar
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(p.x - 2, 69, 4, 3);

      // Metallic Pin Lead
      const pinGrad = ctx.createLinearGradient(p.x - 1, 72, p.x + 1, 72);
      pinGrad.addColorStop(0, '#cfd8dc');
      pinGrad.addColorStop(0.5, '#ffffff');
      pinGrad.addColorStop(1, '#90a4ae');
      ctx.fillStyle = pinGrad;
      ctx.fillRect(p.x - 1.2, 72, 2.4, 16);
    });

    if (inst.selected) drawSelectionRect(ctx, -3, -3, 64, 94);
    ctx.restore();
  }
});

/* ----------------------------Ultrasonic Sensor HC-SR04 -------------------------------- */

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

/*---------------------------LDR Photoresistor ------------------------------------------ */
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

/* ------------------------------------PIR Motion Sensor --------------------------------- */
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


/* -------------- LM35 Precision Centigrade Temperature Sensor (TO-92) ------------------ */
defComp({
  id: 'lm35_sensor',
  name: 'LM35 Temp Sensor',
  category: 'Sensors',
  icon: '🌡️',
  desc: 'Precision centigrade temperature sensor producing 10mV/°C linear analog output voltage (250mV at 25°C)',
  width: 60,
  height: 80,
  defaultProps: { temp: 25 },
  interactive: [
    { field: 'temp', label: 'Temperature', min: -40, max: 125, step: 1, unit: '°C' },
  ],
  pins: [
    { id: 'VCC', label: 'VCC (+5V)', type: PIN_TYPE.POWER,  x: 15, y: 80, side: 'bottom' },
    { id: 'OUT', label: 'VOUT',     type: PIN_TYPE.ANALOG, x: 30, y: 80, side: 'bottom' },
    { id: 'GND', label: 'GND',      type: PIN_TYPE.GND,    x: 45, y: 80, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const temp = Number(inst.runtimeState?.temp ?? inst.props.temp ?? 25);
    
    // Voltage scale factor: 10 mV / °C (0.01 V / °C)
    const vOut = temp * 0.01;

    // Update analog voltage on OUT pin for solver engine
    if (sim && inst.pins.OUT) {
      sim.setPinVoltage(inst.pins.OUT.id, vOut);
    }

    ctx.save();
    ctx.translate(x, y);

    // 1. TO-92 Metallic Lead Pins
    const pinXs = [15, 30, 45];
    pinXs.forEach(px => {
      const pinGrad = ctx.createLinearGradient(px - 1.2, 38, px + 1.2, 38);
      pinGrad.addColorStop(0, '#90a4ae');
      pinGrad.addColorStop(0.5, '#ffffff');
      pinGrad.addColorStop(1, '#607d8b');
      ctx.fillStyle = pinGrad;
      ctx.fillRect(px - 1.2, 38, 2.4, 42);
    });

    // 2. TO-92 Molded Plastic Body
    const bodyGrad = ctx.createLinearGradient(0, 5, 0, 40);
    bodyGrad.addColorStop(0, '#455a64');
    bodyGrad.addColorStop(0.3, '#263238');
    bodyGrad.addColorStop(1, '#101214');
    ctx.fillStyle = bodyGrad;

    ctx.beginPath();
    ctx.moveTo(8, 38);
    ctx.lineTo(52, 38);
    ctx.arcTo(56, 38, 56, 5, 4);
    ctx.arcTo(56, 5, 4, 5, 18);
    ctx.arcTo(4, 5, 4, 38, 4);
    ctx.arcTo(4, 38, 8, 38, 4);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#546e7a';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Flat Front Face Bevel Line
    ctx.fillStyle = '#1c2024';
    roundRect(ctx, 10, 32, 40, 6, 1);
    ctx.fill();

    // 3. Temperature Thermal Color Indicator LED
    // Normalizes -40°C (Blue) to 125°C (Red)
    const tRatio = Math.min(1, Math.max(0, (temp + 40) / 165));
    const r = Math.round(tRatio * 255);
    const b = Math.round((1 - tRatio) * 255);
    ctx.fillStyle = `rgb(${r}, 40, ${b})`;
    ctx.beginPath();
    ctx.arc(30, 15, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // 4. Laser-Etched Silkscreen Markings
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = 'bold 5.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LM35', 30, 23);
    ctx.font = 'bold 4px "JetBrains Mono", monospace';
    ctx.fillText('DZ', 30, 29);

    // 5. Real-Time Telemetry Readout
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 6px "JetBrains Mono", monospace';
    ctx.fillText(`${temp}°C`, 30, 47);

    ctx.fillStyle = '#ffc107';
    ctx.font = 'bold 5px "JetBrains Mono", monospace';
    ctx.fillText(`${(vOut * 1000).toFixed(0)}mV`, 30, 55);

    if (inst.selected) drawSelectionRect(ctx, 0, 0, 60, 80);
    ctx.restore();
  }
});