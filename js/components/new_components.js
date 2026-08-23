'use strict';
/* components/new_components.js — New Sensors, Actuators, Output & Passive components */

/* ═══════════════════════════════════════════════════════════════
   MPU6050 — 6-DoF Accelerometer + Gyroscope (I2C)
   ═══════════════════════════════════════════════════════════════ */
defComp({
  id: 'mpu6050',
  name: 'MPU6050 IMU',
  category: 'Sensors',
  icon: '📐',
  desc: '6-axis Accelerometer + Gyroscope (I2C @ 0x68). Provides accel X/Y/Z ±2g and gyro X/Y/Z ±250°/s',
  width: 36,
  height: 32,
  defaultProps: { accelX: 0, accelY: 0, accelZ: 1024, gyroX: 0, gyroY: 0, gyroZ: 0 },
  interactive: [
    { field: 'accelX', label: 'AccelX', min: -2048, max: 2047, step: 10, unit: '' },
    { field: 'accelY', label: 'AccelY', min: -2048, max: 2047, step: 10, unit: '' },
    { field: 'accelZ', label: 'AccelZ', min: -2048, max: 2047, step: 10, unit: '' },
  ],
  pins: [
    { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER,  x: 6,  y: 32, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND,    x: 13, y: 32, side: 'bottom' },
    { id: 'SCL', label: 'SCL', type: PIN_TYPE.SIGNAL, x: 22, y: 32, side: 'bottom' },
    { id: 'SDA', label: 'SDA', type: PIN_TYPE.SIGNAL, x: 29, y: 32, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    ctx.save();
    ctx.translate(x, y);

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

/* ═══════════════════════════════════════════════════════════════
   28BYJ-48 Stepper Motor with ULN2003 Driver
   ═══════════════════════════════════════════════════════════════ */
defComp({
  id: 'stepper_28byj',
  name: '28BYJ-48 Stepper',
  category: 'Actuators',
  icon: '⚙️',
  desc: '5V 4-phase unipolar stepper motor with ULN2003 driver. 2048 steps/rev, 5.625°/step',
  width: 50,
  height: 50,
  defaultProps: { angle: 0 },
  interactive: [],
  pins: [
    { id: 'IN1', label: 'IN1', type: PIN_TYPE.DIGITAL, x: 10, y: 50, side: 'bottom' },
    { id: 'IN2', label: 'IN2', type: PIN_TYPE.DIGITAL, x: 20, y: 50, side: 'bottom' },
    { id: 'IN3', label: 'IN3', type: PIN_TYPE.DIGITAL, x: 30, y: 50, side: 'bottom' },
    { id: 'IN4', label: 'IN4', type: PIN_TYPE.DIGITAL, x: 40, y: 50, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const angle = inst.runtimeState?.angle ?? 0;
    ctx.save();
    ctx.translate(x, y);

    // Motor body (cylindrical)
    const grad = ctx.createRadialGradient(25, 20, 5, 25, 20, 22);
    grad.addColorStop(0, '#c0c0c0');
    grad.addColorStop(0.7, '#888');
    grad.addColorStop(1, '#555');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(25, 20, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Motor shaft
    ctx.fillStyle = '#aaa';
    ctx.beginPath();
    ctx.arc(25, 20, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#666';
    ctx.stroke();

    // Shaft indicator line (shows rotation)
    const rad = (angle * Math.PI) / 180;
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(25, 20);
    ctx.lineTo(25 + Math.cos(rad) * 14, 20 + Math.sin(rad) * 14);
    ctx.stroke();

    // Angle label
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(angle % 360)}°`, 25, 43);

    // ULN2003 driver chip on bottom
    ctx.fillStyle = '#1a1a2e';
    roundRect(ctx, 8, 36, 34, 10, 2);
    ctx.fill();
    ctx.fillStyle = '#888';
    ctx.font = '4px monospace';
    ctx.fillText('ULN2003', 25, 43);

    // Pin leads
    const pinXs = [10, 20, 30, 40];
    ctx.strokeStyle = '#a0a0a0';
    ctx.lineWidth = 1.5;
    for (const px of pinXs) {
      ctx.beginPath();
      ctx.moveTo(px, 46);
      ctx.lineTo(px, 50);
      ctx.stroke();
    }

    if (inst.selected) drawSelectionRect(ctx, 0, 0, 50, 50);
    ctx.restore();
  }
});

/* ═══════════════════════════════════════════════════════════════
   WS2812B NeoPixel — Addressable RGB LED
   ═══════════════════════════════════════════════════════════════ */
defComp({
  id: 'neopixel',
  name: 'WS2812B NeoPixel',
  category: 'Output',
  icon: '💡',
  desc: 'Addressable RGB LED (WS2812B). Single pixel — data pin receives color via NeoPixel library',
  width: 20,
  height: 24,
  defaultProps: { r: 0, g: 0, b: 0, brightness: 255 },
  interactive: [
    { field: 'r', label: 'R', min: 0, max: 255, step: 1, unit: '' },
    { field: 'g', label: 'G', min: 0, max: 255, step: 1, unit: '' },
    { field: 'b', label: 'B', min: 0, max: 255, step: 1, unit: '' },
  ],
  pins: [
    { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER,  x: 6,  y: 24, side: 'bottom' },
    { id: 'DOUT', label: 'DOut', type: PIN_TYPE.DIGITAL, x: 10, y: 24, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND,   x: 14, y: 24, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const rs = inst.runtimeState || {};
    const r = rs.r ?? inst.props.r ?? 0;
    const g = rs.g ?? inst.props.g ?? 0;
    const b = rs.b ?? inst.props.b ?? 0;
    const brightness = rs.brightness ?? inst.props.brightness ?? 255;
    ctx.save();
    ctx.translate(x, y);

    // LED body
    const rgb = `rgb(${Math.round(r * brightness / 255)}, ${Math.round(g * brightness / 255)}, ${Math.round(b * brightness / 255)})`;
    const isOn = r > 0 || g > 0 || b > 0;

    if (isOn) {
      // Glow effect
      ctx.shadowColor = rgb;
      ctx.shadowBlur = 12;
    }

    ctx.fillStyle = isOn ? rgb : '#222';
    roundRect(ctx, 2, 2, 16, 16, 3);
    ctx.fill();
    ctx.shadowBlur = 0;

    // LED lens highlight
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.arc(10, 9, 5, 0, Math.PI * 2);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    roundRect(ctx, 2, 2, 16, 16, 3);
    ctx.stroke();

    // Color label
    ctx.fillStyle = '#aaa';
    ctx.font = '4px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`R${r}`, 6, 22);
    ctx.fillText(`G${g}`, 10, 22);
    ctx.fillText(`B${b}`, 14, 22);

    // Pin leads
    ctx.strokeStyle = '#a0a0a0';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(6, 18); ctx.lineTo(6, 24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, 18); ctx.lineTo(10, 24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(14, 18); ctx.lineTo(14, 24); ctx.stroke();

    if (inst.selected) drawSelectionRect(ctx, 0, 0, 20, 24);
    ctx.restore();
  }
});

/* ═══════════════════════════════════════════════════════════════
   IR Obstacle Avoidance Sensor
   ═══════════════════════════════════════════════════════════════ */
defComp({
  id: 'ir_obstacle',
  name: 'IR Obstacle Sensor',
  category: 'Sensors',
  icon: '👁️',
  desc: 'Infrared obstacle detection sensor. Digital output — LOW when obstacle detected (2-30cm range)',
  width: 30,
  height: 40,
  defaultProps: { detected: 0 },
  interactive: [
    { field: 'detected', label: 'Object', min: 0, max: 1, step: 1, unit: '' },
  ],
  pins: [
    { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER,  x: 6,  y: 40, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND,    x: 12, y: 40, side: 'bottom' },
    { id: 'OUT', label: 'OUT', type: PIN_TYPE.DIGITAL, x: 18, y: 40, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const detected = inst.runtimeState?.detected ?? inst.props.detected ?? 0;
    ctx.save();
    ctx.translate(x, y);

    // PCB body
    ctx.fillStyle = '#1a5c1a';
    roundRect(ctx, 0, 0, 24, 34, 3);
    ctx.fill();
    ctx.strokeStyle = '#2a7a2a';
    ctx.lineWidth = 1;
    roundRect(ctx, 0, 0, 24, 34, 3);
    ctx.stroke();

    // IR emitter (top)
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(8, 8, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = detected ? '#ff3333' : '#661111';
    ctx.beginPath();
    ctx.arc(8, 8, 2, 0, Math.PI * 2);
    ctx.fill();
    if (detected) {
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // IR receiver (top)
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(16, 8, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = detected ? '#4400ff' : '#220066';
    ctx.beginPath();
    ctx.arc(16, 8, 2, 0, Math.PI * 2);
    ctx.fill();

    // Status LED
    ctx.fillStyle = detected ? '#00ff00' : '#003300';
    ctx.beginPath();
    ctx.arc(12, 20, 2, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.fillStyle = '#ccc';
    ctx.font = '4px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(detected ? 'DETECT' : 'CLEAR', 12, 30);

    // Pin leads
    ctx.strokeStyle = '#a0a0a0';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(6, 34); ctx.lineTo(6, 40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(12, 34); ctx.lineTo(12, 40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(18, 34); ctx.lineTo(18, 40); ctx.stroke();

    if (inst.selected) drawSelectionRect(ctx, 0, 0, 24, 40);
    ctx.restore();
  }
});

/* ═══════════════════════════════════════════════════════════════
   Flex Sensor — Analog Bend Sensor
   ═══════════════════════════════════════════════════════════════ */
defComp({
  id: 'flex_sensor',
  name: 'Flex Sensor',
  category: 'Sensors',
  icon: '〰️',
  desc: 'Analog flex/bend sensor. Resistance increases when bent. Reads 0-1023 on analog pin',
  width: 50,
  height: 20,
  defaultProps: { bend: 0 },
  interactive: [
    { field: 'bend', label: 'Bend', min: 0, max: 1023, step: 1, unit: '' },
  ],
  pins: [
    { id: 'SIG', label: 'SIG', type: PIN_TYPE.ANALOG, x: 6,  y: 20, side: 'bottom' },
    { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER,  x: 25, y: 20, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND,   x: 44, y: 20, side: 'bottom' },
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

/* ═══════════════════════════════════════════════════════════════
   NTC Thermistor — Analog Temperature Sensor
   ═══════════════════════════════════════════════════════════════ */
defComp({
  id: 'thermistor',
  name: 'NTC Thermistor',
  category: 'Sensors',
  icon: '🌡️',
  desc: '10kΩ NTC thermistor. Resistance decreases with temperature. Reads 0-1023 on analog pin',
  width: 24,
  height: 30,
  defaultProps: { temperature: 25 },
  interactive: [
    { field: 'temperature', label: 'Temp', min: -10, max: 80, step: 1, unit: '°C' },
  ],
  pins: [
    { id: 'p1', label: 'T1', type: PIN_TYPE.ANALOG, x: 8,  y: 30, side: 'bottom' },
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
    ctx.fillText(`${temp}°C`, 12, 26);

    // Wire leads
    ctx.strokeStyle = '#a0a0a0';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(8, 20); ctx.lineTo(8, 30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(16, 20); ctx.lineTo(16, 30); ctx.stroke();

    if (inst.selected) drawSelectionRect(ctx, 0, 0, 24, 30);
    ctx.restore();
  }
});

/* ═══════════════════════════════════════════════════════════════
   1N4007 Diode — Rectifier Diode
   ═══════════════════════════════════════════════════════════════ */
defComp({
  id: 'diode_1n4007',
  name: '1N4007 Diode',
  category: 'Passive',
  icon: '▶️',
  desc: 'General-purpose rectifier diode. 1A forward current, 1000V reverse voltage. 0.7V forward drop',
  width: 40,
  height: 14,
  defaultProps: {},
  interactive: [],
  pins: [
    { id: 'anode',   label: 'A',  type: PIN_TYPE.SIGNAL, x: 4,  y: 14, side: 'bottom' },
    { id: 'cathode', label: 'K',  type: PIN_TYPE.SIGNAL, x: 36, y: 14, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const rs = inst.runtimeState || {};
    const conducting = rs.conducting || false;
    ctx.save();
    ctx.translate(x, y);

    // Body
    ctx.fillStyle = '#1a1a1a';
    roundRect(ctx, 8, 2, 24, 10, 2);
    ctx.fill();

    // Cathode band
    ctx.fillStyle = '#888';
    ctx.fillRect(26, 2, 3, 10);

    // Diode symbol (triangle + bar)
    ctx.fillStyle = conducting ? '#00cc66' : '#555';
    ctx.beginPath();
    ctx.moveTo(12, 7);
    ctx.lineTo(22, 3);
    ctx.lineTo(22, 11);
    ctx.closePath();
    ctx.fill();

    // Cathode bar
    ctx.strokeStyle = conducting ? '#00cc66' : '#888';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(22, 3);
    ctx.lineTo(22, 11);
    ctx.stroke();

    // Arrow direction
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(14, 7);
    ctx.lineTo(18, 7);
    ctx.lineTo(16, 5);
    ctx.moveTo(18, 7);
    ctx.lineTo(16, 9);
    ctx.stroke();

    // Label
    ctx.fillStyle = '#aaa';
    ctx.font = '4px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('1N4007', 18, 8);

    // Wire leads
    ctx.strokeStyle = '#a0a0a0';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(4, 7); ctx.lineTo(8, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(32, 7); ctx.lineTo(36, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4, 7); ctx.lineTo(4, 14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(36, 7); ctx.lineTo(36, 14); ctx.stroke();

    if (inst.selected) drawSelectionRect(ctx, 0, 0, 40, 14);
    ctx.restore();
  }
});

/* ═══════════════════════════════════════════════════════════════
   Export all new component IDs for canvas.js registration
   ═══════════════════════════════════════════════════════════════ */
window.NEW_COMPONENT_IDS = [
  'mpu6050', 'stepper_28byj', 'neopixel',
  'ir_obstacle', 'flex_sensor', 'thermistor',
  'diode_1n4007'
];
