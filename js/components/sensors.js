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
    { field: 'humidity', label: 'Hum', min: 0, max: 100, step: 1, unit: '%' },
  ],
  pins: [
    { id: 'vcc', label: 'VCC', type: PIN_TYPE.POWER, x: 13, y: 88, side: 'bottom' },
    { id: 'data', label: 'DAT', type: PIN_TYPE.DIGITAL, x: 23, y: 88, side: 'bottom' },
    { id: 'nc', label: 'NC', type: PIN_TYPE.SIGNAL, x: 35, y: 88, side: 'bottom' },
    { id: 'gnd', label: 'GND', type: PIN_TYPE.GND, x: 45, y: 88, side: 'bottom' },
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
      { id: 'vcc', label: 'VCC', x: 13 },
      { id: 'data', label: 'DAT', x: 23 },
      { id: 'nc', label: 'NC', x: 35 },
      { id: 'gnd', label: 'GND', x: 45 },
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
    { id: 'vcc', label: 'VCC', type: PIN_TYPE.POWER, x: 8, y: 0, side: 'top' },
    { id: 'trig', label: 'TRIG', type: PIN_TYPE.DIGITAL, x: 24, y: 0, side: 'top' },
    { id: 'echo', label: 'ECHO', type: PIN_TYPE.DIGITAL, x: 46, y: 0, side: 'top' },
    { id: 'gnd', label: 'GND', type: PIN_TYPE.GND, x: 62, y: 0, side: 'top' },
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
      ctx.beginPath(); ctx.arc(cx, 24, 12, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.arc(cx, 24, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#555';
      ctx.beginPath(); ctx.arc(cx, 24, 5, 0, Math.PI * 2); ctx.fill();
    });

    // Text
    ctx.fillStyle = '#c8c8c8';
    ctx.font = 'bold 6px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HC-SR04', 35, 37);

    // Pin leads
    ctx.strokeStyle = '#c8a84b';
    ctx.lineWidth = 1.5;
    [8, 24, 46, 62].forEach(px => {
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
    { id: 'vcc', label: 'VCC', type: PIN_TYPE.POWER, x: 8, y: 40, side: 'bottom' },
    { id: 'a', label: 'A', type: PIN_TYPE.ANALOG, x: 20, y: 40, side: 'bottom' },
    { id: 'gnd', label: 'GND', type: PIN_TYPE.GND, x: 32, y: 40, side: 'bottom' },
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
    [[8, 40], [20, 40], [32, 40]].forEach(([px, py]) => {
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
    [[-2, 4], [14, -2], [30, 4]].forEach(([rx, ry]) => {
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
    { id: 'vcc', label: 'VCC', type: PIN_TYPE.POWER, x: 12, y: 40, side: 'bottom' },
    { id: 'out', label: 'OUT', type: PIN_TYPE.DIGITAL, x: 25, y: 40, side: 'bottom' },
    { id: 'gnd', label: 'GND', type: PIN_TYPE.GND, x: 38, y: 40, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const motion = inst.runtimeState && inst.runtimeState.motion !== undefined ? !!inst.runtimeState.motion : !!(inst.props.motion || 0);

    ctx.save();
    ctx.translate(x, y);

    // Leads
    ctx.strokeStyle = '#c8a84b';
    ctx.lineWidth = 1.5;
    [[12, 40], [25, 40], [38, 40]].forEach(([px, py]) => {
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
    { id: 'VCC', label: 'VCC (+5V)', type: PIN_TYPE.POWER, x: 15, y: 80, side: 'bottom' },
    { id: 'OUT', label: 'VOUT', type: PIN_TYPE.ANALOG, x: 30, y: 80, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 45, y: 80, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const temp = Number(inst.runtimeState?.temp ?? inst.props.temp ?? 25);

    // Voltage scale factor: 10 mV / °C (0.01 V / °C)
    const vOut = temp * 0.01;

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


/*-----------------------MPU6050 6-axis Accelerometer + Gyroscope (I2C @ 0x68)------------------------ */
defComp({
  id: 'mpu6050',
  name: 'MPU6050 IMU',
  category: 'Sensors',
  icon: '',
  desc: '6-axis Accelerometer + Gyroscope (I2C @ 0x68). Provides accel X/Y/Z Â±2g and gyro X/Y/Z Â±250Â°/s',
  width: 72,   // Scaled from 36 to 72 (2x)
  height: 64,  // Scaled from 32 to 64 (2x)
  defaultProps: { accelX: 0, accelY: 0, accelZ: 1024, gyroX: 0, gyroY: 0, gyroZ: 0 },
  interactive: [
    { field: 'accelX', label: 'AccelX', min: -2048, max: 2047, step: 10, unit: '' },
    { field: 'accelY', label: 'AccelY', min: -2048, max: 2047, step: 10, unit: '' },
    { field: 'accelZ', label: 'AccelZ', min: -2048, max: 2047, step: 10, unit: '' },
  ],
  pins: [
    { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER, x: 12, y: 64, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 26, y: 64, side: 'bottom' },
    { id: 'SCL', label: 'SCL', type: PIN_TYPE.DIGITAL, x: 44, y: 64, side: 'bottom' },
    { id: 'SDA', label: 'SDA', type: PIN_TYPE.DIGITAL, x: 58, y: 64, side: 'bottom' },
  ],

  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const scale = 2; // Scale factor

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale); // Scales all vector drawing, fonts, and borders

    // PCB body
    ctx.fillStyle = '#1a1a2e';
    roundRect(ctx, 0, 0, 36, 28, 3);
    ctx.fill();
    ctx.strokeStyle = '#333355';
    ctx.lineWidth = 1;
    roundRect(ctx, 0, 0, 36, 28, 3);
    ctx.stroke();

    // MPU6050 chip
    ctx.fillStyle = '#111';
    roundRect(ctx, 8, 4, 20, 16, 2);
    ctx.fill();

    // Chip marking
    ctx.fillStyle = '#666';
    ctx.font = 'bold 4px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MPU', 18, 11);
    ctx.fillText('6050', 18, 16);

    // I2C address label
    ctx.fillStyle = '#00979c';
    ctx.font = '4px monospace';
    ctx.fillText('0x68', 18, 24);

    // Pin leads
    const pinXs = [6, 13, 22, 29];
    ctx.strokeStyle = '#a0a0a0';
    ctx.lineWidth = 1.5;
    for (const px of pinXs) {
      ctx.beginPath();
      ctx.moveTo(px, 28);
      ctx.lineTo(px, 32);
      ctx.stroke();
    }

    if (inst.selected) drawSelectionRect(ctx, 0, 0, 36, 32);
    ctx.restore();
  }
});


/* -------------- IR Obstacle Avoidance Sensor Module (Enlarged) ------------------ */
defComp({
  id: 'ir_obstacle',
  name: 'IR Obstacle Sensor',
  category: 'Sensors',
  icon: '',
  desc: 'Infrared obstacle detection sensor module with LM393 comparator (Digital OUT: LOW when obstacle detected, 2â€“30cm range)',
  width: 54,
  height: 92,
  defaultProps: { detected: 0 },
  interactive: [
    { field: 'detected', label: 'Object', min: 0, max: 1, step: 1, unit: '' },
  ],
  pins: [
    { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER, x: 15, y: 92, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 27, y: 92, side: 'bottom' },
    { id: 'OUT', label: 'OUT', type: PIN_TYPE.DIGITAL, x: 39, y: 92, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const detected = Boolean(inst.runtimeState?.detected ?? inst.props.detected ?? 0);

    ctx.save();
    ctx.translate(x, y);

    // 1. Dual IR Optoelectronic Diodes (Protruding from Top)
    // --- IR Emitter (Clear/Blue-tinted 5mm LED, Left) ---
    // Metal Leads
    ctx.strokeStyle = '#cfd8dc';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(13, 20); ctx.lineTo(13, 15);
    ctx.moveTo(17, 20); ctx.lineTo(17, 15);
    ctx.stroke();

    // Emitter Bulb Base & Rim
    ctx.fillStyle = '#b0bec5';
    ctx.fillRect(10.5, 14, 9, 2);

    // Emitter Dome
    const emitGrad = ctx.createRadialGradient(15, 8, 1, 15, 9, 6);
    emitGrad.addColorStop(0, detected ? '#ff8a80' : '#e1f5fe');
    emitGrad.addColorStop(0.6, detected ? '#ff1744' : '#81d4fa');
    emitGrad.addColorStop(1, detected ? '#b71c1c' : '#29b6f6');
    ctx.fillStyle = emitGrad;
    ctx.beginPath();
    ctx.arc(15, 9, 5, Math.PI, 0, false);
    ctx.lineTo(20, 14);
    ctx.lineTo(10, 14);
    ctx.closePath();
    ctx.fill();

    if (detected) {
      // Infrared Emission Glow Halo
      ctx.fillStyle = 'rgba(255, 23, 68, 0.35)';
      ctx.beginPath();
      ctx.arc(15, 9, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- IR Photodiode Receiver (Dark Tinted 5mm Lens, Right) ---
    // Metal Leads
    ctx.strokeStyle = '#cfd8dc';
    ctx.beginPath();
    ctx.moveTo(37, 20); ctx.lineTo(37, 15);
    ctx.moveTo(41, 20); ctx.lineTo(41, 15);
    ctx.stroke();

    // Receiver Bulb Base
    ctx.fillStyle = '#263238';
    ctx.fillRect(34.5, 14, 9, 2);

    // Dark Glossy Filter Dome
    const recvGrad = ctx.createRadialGradient(37.5, 7, 1, 39, 9, 6);
    recvGrad.addColorStop(0, '#546e7a');
    recvGrad.addColorStop(0.5, '#212121');
    recvGrad.addColorStop(1, '#0a0a0a');
    ctx.fillStyle = recvGrad;
    ctx.beginPath();
    ctx.arc(39, 9, 5, Math.PI, 0, false);
    ctx.lineTo(44, 14);
    ctx.lineTo(34, 14);
    ctx.closePath();
    ctx.fill();

    // 2. FR4 Sensor PCB Body
    ctx.fillStyle = '#0a3820';
    roundRect(ctx, 3, 18, 48, 56, 3.5);
    ctx.fill();

    ctx.strokeStyle = '#185934';
    ctx.lineWidth = 1;
    ctx.stroke();

    // PCB Mounting Hole
    ctx.fillStyle = '#c8a452';
    ctx.beginPath(); ctx.arc(27, 26, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#05180f';
    ctx.beginPath(); ctx.arc(27, 26, 1.8, 0, Math.PI * 2); ctx.fill();

    // 3. Sensitivity Trimpot (Blue Cermet Potentiometer)
    ctx.fillStyle = '#1565c0';
    roundRect(ctx, 29, 34, 18, 16, 2);
    ctx.fill();

    // Metal Adjustment Screw Rotor
    ctx.fillStyle = '#d4af37';
    ctx.beginPath(); ctx.arc(38, 42, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#614800';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(35, 42); ctx.lineTo(41, 42);
    ctx.moveTo(38, 39); ctx.lineTo(38, 45);
    ctx.stroke();

    // 4. LM393 Voltage Comparator IC
    ctx.fillStyle = '#1e2224';
    roundRect(ctx, 7, 34, 16, 16, 1.5);
    ctx.fill();

    // IC Pin 1 Notch & Leads
    ctx.fillStyle = '#101010';
    ctx.beginPath(); ctx.arc(10, 36.5, 1, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#9e9e9e';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(5.5, 36 + i * 3.5, 1.5, 1.2);
      ctx.fillRect(23, 36 + i * 3.5, 1.5, 1.2);
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = 'bold 3.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LM393', 15, 43.5);

    // 5. Onboard SMD Indicator LEDs
    // Power Indicator LED (PWR - Red)
    ctx.fillStyle = '#263238';
    ctx.fillRect(8, 54, 5, 3.5);
    ctx.fillStyle = '#ff1744';
    ctx.fillRect(9, 54.8, 3, 1.9);

    // Obstacle Detection LED (D-OUT - Green)
    ctx.fillStyle = '#263238';
    ctx.fillRect(41, 54, 5, 3.5);
    if (detected) {
      ctx.fillStyle = '#00e676';
      ctx.fillRect(42, 54.8, 3, 1.9);
      ctx.fillStyle = 'rgba(0, 230, 118, 0.45)';
      ctx.beginPath(); ctx.arc(43.5, 55.7, 4, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = '#1b5e20';
      ctx.fillRect(42, 54.8, 3, 1.9);
    }

    // 6. Silkscreen Labels & Status Display
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = 'bold 5px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(detected ? 'DETECT' : 'CLEAR', 27, 56.5);

    // Pin Names Silkscreen
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.font = 'bold 4.5px "JetBrains Mono", sans-serif';
    ctx.fillText('VCC', 15, 68);
    ctx.fillText('GND', 27, 68);
    ctx.fillText('OUT', 39, 68);

    // 7. Male Header Socket Strip & Terminal Pins
    ctx.fillStyle = '#1c1c1c';
    roundRect(ctx, 8, 73, 38, 4.5, 1);
    ctx.fill();

    const pins = [15, 27, 39];
    pins.forEach(px => {
      // Solder Pad on PCB
      ctx.fillStyle = '#c8a452';
      ctx.beginPath(); ctx.arc(px, 71.5, 1.5, 0, Math.PI * 2); ctx.fill();

      // Silver Lead Terminal
      const pinGrad = ctx.createLinearGradient(px - 1, 77, px + 1, 77);
      pinGrad.addColorStop(0, '#cfd8dc');
      pinGrad.addColorStop(0.5, '#ffffff');
      pinGrad.addColorStop(1, '#90a4ae');
      ctx.fillStyle = pinGrad;
      ctx.fillRect(px - 1.2, 77.5, 2.4, 14.5);
    });

    if (inst.selected) drawSelectionRect(ctx, -3, -3, 60, 98);
    ctx.restore();
  }
});

/*---------------------Analog flex/bend sensor----------------------*/

defComp({
  id: 'flex_sensor',
  name: 'Flex Sensor',
  category: 'Sensors',
  icon: 'ã€°ï¸',
  desc: 'Analog flex/bend sensor. Resistance increases when bent. Reads 0-1023 on analog pin',
  width: 50,
  height: 20,
  defaultProps: { bend: 0 },
  interactive: [
    { field: 'bend', label: 'Bend', min: 0, max: 1023, step: 1, unit: '' },
  ],
  pins: [
    { id: 'SIG', label: 'SIG', type: PIN_TYPE.ANALOG, x: 6, y: 20, side: 'bottom' },
    { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER, x: 25, y: 20, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 44, y: 20, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const bend = inst.runtimeState?.bend ?? inst.props.bend ?? 0;
    const bendFrac = bend / 1023;
    ctx.save();
    ctx.translate(x, y);

    // Flex strip body
    ctx.fillStyle = '#e8d5a3';
    roundRect(ctx, 2, 2, 46, 12, 2);
    ctx.fill();
    ctx.strokeStyle = '#c4a96a';
    ctx.lineWidth = 1;
    roundRect(ctx, 2, 2, 46, 12, 2);
    ctx.stroke();

    // Resistance track (changes with bend)
    ctx.strokeStyle = bendFrac > 0.5 ? '#cc3333' : '#333';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(6, 8);
    ctx.lineTo(44, 8);
    ctx.stroke();
    ctx.setLineDash([]);

    // Bend indicator arc
    ctx.strokeStyle = '#00979c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const arcRadius = 20 - bendFrac * 15;
    ctx.arc(25, 25, Math.max(5, arcRadius), Math.PI, Math.PI + Math.PI * bendFrac);
    ctx.stroke();

    // Value label
    ctx.fillStyle = '#333';
    ctx.font = 'bold 5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${bend}`, 25, 12);

    // Pin leads
    ctx.strokeStyle = '#a0a0a0';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(6, 14); ctx.lineTo(6, 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(25, 14); ctx.lineTo(25, 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(44, 14); ctx.lineTo(44, 20); ctx.stroke();

    if (inst.selected) drawSelectionRect(ctx, 0, 0, 50, 20);
    ctx.restore();
  }
});

/*--------NTC Thermistor 10k ohms NTC thermistor. Resistance decreases with temperature------------- */
defComp({
  id: 'thermistor',
  name: 'NTC Thermistor',
  category: 'Sensors',
  icon: '',
  desc: '10kÎ© NTC thermistor. Resistance decreases with temperature. Reads 0-1023 on analog pin',
  width: 24,
  height: 30,
  defaultProps: { temperature: 25 },
  interactive: [
    { field: 'temperature', label: 'Temp', min: -10, max: 80, step: 1, unit: 'Â°C' },
  ],
  pins: [
    { id: 'p1', label: 'T1', type: PIN_TYPE.ANALOG, x: 8, y: 30, side: 'bottom' },
    { id: 'p2', label: 'T2', type: PIN_TYPE.ANALOG, x: 16, y: 30, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const temp = inst.runtimeState?.temperature ?? inst.props.temperature ?? 25;
    ctx.save();
    ctx.translate(x, y);

    // Thermistor bead body
    const tempColor = temp > 50 ? '#cc3333' : temp > 25 ? '#cc8833' : '#3366cc';
    ctx.fillStyle = tempColor;
    ctx.beginPath();
    ctx.arc(12, 12, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Marking
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NTC', 12, 10);
    ctx.font = '4px monospace';
    ctx.fillText('10k', 12, 15);

    // Temperature readout
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 5px monospace';
    ctx.fillText(`${temp}Â°C`, 12, 26);

    // Wire leads
    ctx.strokeStyle = '#a0a0a0';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(8, 20); ctx.lineTo(8, 30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(16, 20); ctx.lineTo(16, 30); ctx.stroke();

    if (inst.selected) drawSelectionRect(ctx, 0, 0, 24, 30);
    ctx.restore();
  }
});

/* ---------------BME280 / BMP280 â€” Precision Environment Sensor (I2C @ 0x76)-------------------*/

defComp({
  id: 'bme280',
  name: 'BME280 Sensor',
  category: 'Sensors',
  icon: '',
  desc: 'BME280 precision barometric pressure, temperature, and humidity sensor (I2C @ 0x76)',
  width: 56,
  height: 76,
  defaultProps: { temperature: 25, humidity: 50, pressure: 1013 },
  interactive: [
    { field: 'temperature', label: 'Temp', min: -40, max: 85, step: 0.1, unit: 'Â°C' },
    { field: 'humidity', label: 'Hum', min: 0, max: 100, step: 1, unit: '%' },
    { field: 'pressure', label: 'Press', min: 300, max: 1100, step: 1, unit: 'hPa' },
  ],
  pins: [
    { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER, x: 10, y: 76, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 22, y: 76, side: 'bottom' },
    { id: 'SCL', label: 'SCL', type: PIN_TYPE.DIGITAL, x: 34, y: 76, side: 'bottom' },
    { id: 'SDA', label: 'SDA', type: PIN_TYPE.DIGITAL, x: 46, y: 76, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const temp = inst.runtimeState?.temperature ?? inst.props.temperature ?? 25;
    const hum = inst.runtimeState?.humidity ?? inst.props.humidity ?? 50;
    const pres = inst.runtimeState?.pressure ?? inst.props.pressure ?? 1013;
    const isPowered = sim?.isRunning ? (inst.runtimeState?.powered ?? true) : false;

    ctx.save();
    ctx.translate(x, y);

    // 1. Purple PCB Body (Classic GY-BME280 Breakout)
    ctx.fillStyle = '#2d1448';
    roundRect(ctx, 0, 0, 56, 64, 5);
    ctx.fill();
    ctx.strokeStyle = '#c5a059'; // Gold edge trim
    ctx.lineWidth = 1;
    ctx.stroke();

    // 2. Mounting Hole
    ctx.fillStyle = '#12071f';
    ctx.beginPath();
    ctx.arc(28, 7, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c5a059';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // 3. Metallic BME280 Sensor Package
    const sensorGrad = ctx.createLinearGradient(18, 14, 38, 28);
    sensorGrad.addColorStop(0, '#e0e0e0');
    sensorGrad.addColorStop(0.5, '#9e9e9e');
    sensorGrad.addColorStop(1, '#616161');
    ctx.fillStyle = sensorGrad;
    roundRect(ctx, 18, 14, 20, 14, 2);
    ctx.fill();
    ctx.strokeStyle = '#424242';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Sensor Vent Hole
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(22, 18, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // 4. Power LED Indicator
    ctx.fillStyle = isPowered ? '#00ff66' : '#225533';
    ctx.beginPath();
    ctx.arc(8, 14, 1.5, 0, Math.PI * 2);
    ctx.fill();
    if (isPowered) {
      ctx.shadowColor = '#00ff66';
      ctx.shadowBlur = 4;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 5. Digital Readout Display Screen
    ctx.fillStyle = '#050b14';
    roundRect(ctx, 4, 31, 48, 20, 3);
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Live Readout Text (T, H, P)
    ctx.textAlign = 'left';

    // Temp
    ctx.fillStyle = '#ff9800';
    ctx.font = 'bold 4px monospace';
    ctx.fillText('T:', 6, 37);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${temp.toFixed(1)}Â°C`, 14, 37);

    // Humidity
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 4px monospace';
    ctx.fillText('H:', 6, 43);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${Math.round(hum)}%`, 14, 43);

    // Pressure
    ctx.fillStyle = '#b388ff';
    ctx.font = 'bold 4px monospace';
    ctx.fillText('P:', 6, 49);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${Math.round(pres)}hPa`, 14, 49);

    // 6. Silkscreen Pin Labels
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 4.5px sans-serif';
    ctx.textAlign = 'center';
    const pinLabels = ['VCC', 'GND', 'SCL', 'SDA'];
    const pinXs = [10, 22, 34, 46];

    pinXs.forEach((px, idx) => {
      ctx.fillText(pinLabels[idx], px, 58);

      // Gold Solder Pads
      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.arc(px, 62, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Hole
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.arc(px, 62, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Pin Leads extending to 76
      ctx.strokeStyle = '#d4d4d4';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px, 64);
      ctx.lineTo(px, 76);
      ctx.stroke();

      // Pin Header Metallic Highlight
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(px - 0.5, 64);
      ctx.lineTo(px - 0.5, 76);
      ctx.stroke();
    });

    // Selection Highlight Box
    if (inst.selected && typeof drawSelectionRect === 'function') {
      drawSelectionRect(ctx, -2, -2, 60, 80);
    }

    ctx.restore();
  }
});

/*----------------------VL53L0X  Time-of-Flight Laser Distance Sensor (I2C)--------------*/
defComp({
  id: 'vl53l0x',
  name: 'VL53L0X ToF Sensor',
  category: 'Sensors',
  icon: '',
  desc: 'VL53L0X laser Time-of-Flight distance sensor (I2C @ 0x29). Millimetre accuracy, 200cm range',
  width: 50,
  height: 60,
  defaultProps: { distance: 100 },
  interactive: [
    { field: 'distance', label: 'Dist', min: 0, max: 2000, step: 1, unit: 'mm' },
  ],
  pins: [
    { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER, x: 8, y: 60, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 20, y: 60, side: 'bottom' },
    { id: 'SCL', label: 'SCL', type: PIN_TYPE.DIGITAL, x: 32, y: 60, side: 'bottom' },
    { id: 'SDA', label: 'SDA', type: PIN_TYPE.DIGITAL, x: 44, y: 60, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const dist = inst.runtimeState?.distance ?? inst.props.distance ?? 100;

    ctx.save();
    ctx.translate(x, y);

    // PCB body
    ctx.fillStyle = '#1a1a2e';
    roundRect(ctx, 0, 0, 50, 48, 4);
    ctx.fill();

    // Laser emitter (left)
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(14, 14, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = dist > 0 ? '#ff3333' : '#331111';
    ctx.beginPath();
    ctx.arc(14, 14, 3, 0, Math.PI * 2);
    ctx.fill();
    if (dist > 0 && dist < 200) {
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Laser receiver (right)
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(36, 14, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(36, 14, 4, 0, Math.PI * 2);
    ctx.fill();

    // VL53L0X chip
    ctx.fillStyle = '#111';
    roundRect(ctx, 10, 24, 30, 12, 2);
    ctx.fill();
    ctx.fillStyle = '#666';
    ctx.font = 'bold 4px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('VL53L0X', 25, 32);

    // Distance display
    ctx.fillStyle = '#0a0a1a';
    roundRect(ctx, 4, 38, 42, 8, 2);
    ctx.fill();
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${dist}mm`, 25, 44);

    // Pin leads
    ctx.strokeStyle = '#a0a0a0';
    ctx.lineWidth = 1.5;
    [8, 20, 32, 44].forEach(px => {
      ctx.beginPath(); ctx.moveTo(px, 48); ctx.lineTo(px, 60); ctx.stroke();
    });

    if (inst.selected) drawSelectionRect(ctx, -2, -2, 54, 64);
    ctx.restore();
  }
});

/* --------------------------RC522 â€” 13.56MHz RFID Reader (SPI)------------------*/

defComp({
  id: 'rc522',
  name: 'RC522 RFID Reader',
  category: 'Sensors',
  icon: '',
  desc: 'RC522 13.56MHz RFID tag reader (SPI). For access control and security gate simulations',
  width: 60,
  height: 80,
  defaultProps: { tagPresent: false, uid: '00:00:00:00' },
  interactive: [
    { field: 'tagPresent', label: 'Tag', min: 0, max: 1, step: 1, unit: '' },
  ],
  pins: [
    { id: 'SDA', label: 'SDA', type: PIN_TYPE.DIGITAL, x: 6, y: 80, side: 'bottom' },
    { id: 'SCK', label: 'SCK', type: PIN_TYPE.DIGITAL, x: 16, y: 80, side: 'bottom' },
    { id: 'MOSI', label: 'MOSI', type: PIN_TYPE.DIGITAL, x: 26, y: 80, side: 'bottom' },
    { id: 'MISO', label: 'MISO', type: PIN_TYPE.DIGITAL, x: 36, y: 80, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 46, y: 80, side: 'bottom' },
    { id: 'RST', label: 'RST', type: PIN_TYPE.DIGITAL, x: 8, y: 0, side: 'top' },
    { id: '3V3', label: '3V3', type: PIN_TYPE.POWER, x: 24, y: 0, side: 'top' },
    { id: 'IRQ', label: 'IRQ', type: PIN_TYPE.DIGITAL, x: 40, y: 0, side: 'top' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const tagPresent = inst.runtimeState?.tagPresent ?? inst.props.tagPresent ?? false;

    ctx.save();
    ctx.translate(x, y);

    // PCB body
    ctx.fillStyle = '#0a2463';
    roundRect(ctx, 0, 8, 60, 64, 4);
    ctx.fill();
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Antenna coil (circular traces)
    ctx.strokeStyle = '#c8a452';
    ctx.lineWidth = 1.5;
    for (let r = 12; r <= 26; r += 4) {
      ctx.beginPath();
      ctx.arc(30, 36, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // RC522 chip
    ctx.fillStyle = '#111';
    roundRect(ctx, 18, 28, 24, 16, 2);
    ctx.fill();
    ctx.fillStyle = '#666';
    ctx.font = 'bold 4px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('RC522', 30, 38);

    // Status LED
    ctx.fillStyle = tagPresent ? '#00ff00' : '#003300';
    ctx.beginPath();
    ctx.arc(50, 16, 3, 0, Math.PI * 2);
    ctx.fill();
    if (tagPresent) {
      ctx.shadowColor = '#00ff00';
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Tag indicator
    ctx.fillStyle = '#0a0a1a';
    roundRect(ctx, 8, 52, 44, 10, 2);
    ctx.fill();
    ctx.fillStyle = tagPresent ? '#00ff88' : '#666';
    ctx.font = 'bold 5px monospace';
    ctx.fillText(tagPresent ? 'TAG DETECTED' : 'NO TAG', 30, 59);

    // Pin leads
    ctx.strokeStyle = '#a0a0a0';
    ctx.lineWidth = 1.5;
    [6, 16, 26, 36, 46].forEach(px => {
      ctx.beginPath(); ctx.moveTo(px, 72); ctx.lineTo(px, 80); ctx.stroke();
    });
    [8, 24, 40].forEach(px => {
      ctx.beginPath(); ctx.moveTo(px, 8); ctx.lineTo(px, 0); ctx.stroke();
    });

    if (inst.selected) drawSelectionRect(ctx, -2, -4, 64, 88);
    ctx.restore();
  }
});

/* ---------------------TSOP4838 IR Receiver (38kHz NEC/RC5)----------*/
  
defComp({
  id: 'ir_receiver',
  name: 'IR Receiver TSOP4838',
  category: 'Sensors',
  icon: '',
  desc: 'TSOP4838 38kHz IR receiver module. Decodes NEC/RC5 infrared remote control signals',
  width: 30,
  height: 50,
  defaultProps: { code: 0, decoding: false },
  interactive: [
    { field: 'code', label: 'Code', min: 0, max: 65535, step: 1, unit: '' },
  ],
  pins: [
    { id: 'OUT', label: 'OUT', type: PIN_TYPE.DIGITAL, x: 6, y: 50, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 15, y: 50, side: 'bottom' },
    { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER, x: 24, y: 50, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const decoding = inst.runtimeState?.decoding ?? inst.props.decoding ?? false;
    const code = inst.runtimeState?.code ?? inst.props.code ?? 0;

    ctx.save();
    ctx.translate(x, y);

    // Body
    ctx.fillStyle = '#1a1a1a';
    roundRect(ctx, 2, 4, 26, 36, 3);
    ctx.fill();

    // IR lens
    const lensGrad = ctx.createRadialGradient(15, 16, 2, 15, 16, 10);
    lensGrad.addColorStop(0, '#333');
    lensGrad.addColorStop(1, '#111');
    ctx.fillStyle = lensGrad;
    ctx.beginPath();
    ctx.arc(15, 16, 10, 0, Math.PI * 2);
    ctx.fill();

    // Receiving element
    ctx.fillStyle = decoding ? '#ff0000' : '#440000';
    ctx.beginPath();
    ctx.arc(15, 16, 4, 0, Math.PI * 2);
    ctx.fill();
    if (decoding) {
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Label
    ctx.fillStyle = '#888';
    ctx.font = 'bold 4px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TSOP', 15, 32);
    ctx.fillText('4838', 15, 37);

    // Code display
    if (code > 0) {
      ctx.fillStyle = '#0a0a1a';
      roundRect(ctx, 0, 42, 30, 6, 1);
      ctx.fill();
      ctx.fillStyle = '#00ff88';
      ctx.font = 'bold 4px monospace';
      ctx.fillText(`0x${code.toString(16).toUpperCase().padStart(4, '0')}`, 15, 47);
    }

    // Pin leads
    ctx.strokeStyle = '#a0a0a0';
    ctx.lineWidth = 1.5;
    [6, 15, 24].forEach(px => {
      ctx.beginPath(); ctx.moveTo(px, 40); ctx.lineTo(px, 50); ctx.stroke();
    });

    if (inst.selected) drawSelectionRect(ctx, 0, 0, 30, 52);
    ctx.restore();
  }
});

/*--------------------------  HC-05 Bluetooth Module (UART)  -----------------*/
defComp({
  id: 'hc05',
  name: 'HC-05 Bluetooth',
  category: 'Sensors',
  icon: '',
  desc: 'HC-05 serial-to-Bluetooth transceiver module (UART). For mobile app communication',
  width: 50,
  height: 70,
  defaultProps: { connected: false, rxData: '' },
  interactive: [
    { field: 'connected', label: 'Conn', min: 0, max: 1, step: 1, unit: '' },
    { field: 'rxData', label: 'RX Data', type: 'text' },
  ],
  pins: [
    { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER, x: 8, y: 70, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 20, y: 70, side: 'bottom' },
    { id: 'TXD', label: 'TXD', type: PIN_TYPE.DIGITAL, x: 32, y: 70, side: 'bottom' },
    { id: 'RXD', label: 'RXD', type: PIN_TYPE.DIGITAL, x: 44, y: 70, side: 'bottom' },
  ],
  step(inst, sim) {
    if (!sim || !sim.isRunning) return;
    const connected = inst.runtimeState?.connected ?? inst.props?.connected ?? false;
    if (!connected) return;
    const rxData = inst.runtimeState?.rxData ?? inst.props?.rxData ?? '';
    if (typeof rxData === 'string' && rxData.length > 0) {
      sim.sendSerialInput(rxData);
      if (inst.runtimeState) inst.runtimeState.rxData = '';
      else inst.props.rxData = '';
    }
  },
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const connected = inst.runtimeState?.connected ?? inst.props.connected ?? false;

    ctx.save();
    ctx.translate(x, y);

    // PCB body
    ctx.fillStyle = '#8B1A1A';
    roundRect(ctx, 0, 0, 50, 58, 4);
    ctx.fill();

    // Bluetooth antenna
    ctx.strokeStyle = '#c8a452';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, 8);
    ctx.lineTo(40, 20);
    ctx.quadraticCurveTo(40, 28, 32, 28);
    ctx.stroke();

    // HC-05 chip
    ctx.fillStyle = '#111';
    roundRect(ctx, 8, 12, 24, 16, 2);
    ctx.fill();
    ctx.fillStyle = '#666';
    ctx.font = 'bold 4px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('HC-05', 20, 22);

    // Status LED
    ctx.fillStyle = connected ? '#00ff00' : '#ff0000';
    ctx.beginPath();
    ctx.arc(40, 36, 3, 0, Math.PI * 2);
    ctx.fill();
    if (connected) {
      ctx.shadowColor = '#00ff00';
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Connection status
    ctx.fillStyle = '#0a0a1a';
    roundRect(ctx, 4, 40, 42, 12, 2);
    ctx.fill();
    ctx.fillStyle = connected ? '#00ff88' : '#ff4444';
    ctx.font = 'bold 5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(connected ? 'CONNECTED' : 'PAIRING...', 25, 48);

    // Pin leads
    ctx.strokeStyle = '#a0a0a0';
    ctx.lineWidth = 1.5;
    [8, 20, 32, 44].forEach(px => {
      ctx.beginPath(); ctx.moveTo(px, 58); ctx.lineTo(px, 70); ctx.stroke();
    });

    if (inst.selected) drawSelectionRect(ctx, -2, -2, 54, 74);
    ctx.restore();
  }
});
