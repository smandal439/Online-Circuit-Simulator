'use strict';
/* components/new_components.js — New Sensors, Actuators, Output & Passive components */

/* ═══════════════════════════════════════════════════════════════
   MPU6050 — 6-DoF Accelerometer + Gyroscope (I2C)
   ═══════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════
   MPU6050 IMU (Enlarged 2x: 72x64)
   ═══════════════════════════════════════════════════════════════ */
defComp({
  id: 'mpu6050',
  name: 'MPU6050 IMU',
  category: 'Sensors',
  icon: '📐',
  desc: '6-axis Accelerometer + Gyroscope (I2C @ 0x68). Provides accel X/Y/Z ±2g and gyro X/Y/Z ±250°/s',
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
// /* ═══════════════════════════════════════════════════════════════
//    28BYJ-48 Stepper Motor with ULN2003 Driver
//    ═══════════════════════════════════════════════════════════════ */
// defComp({
//   id: 'stepper_28byj',
//   name: '28BYJ-48 Stepper',
//   category: 'Actuators',
//   icon: '⚙️',
//   desc: '5V 4-phase unipolar stepper motor with ULN2003 driver. 2048 steps/rev, 5.625°/step',
//   width: 50,
//   height: 50,
//   defaultProps: { angle: 0 },
//   interactive: [],
//   pins: [
//     { id: 'IN1', label: 'IN1', type: PIN_TYPE.DIGITAL, x: 10, y: 50, side: 'bottom' },
//     { id: 'IN2', label: 'IN2', type: PIN_TYPE.DIGITAL, x: 20, y: 50, side: 'bottom' },
//     { id: 'IN3', label: 'IN3', type: PIN_TYPE.DIGITAL, x: 30, y: 50, side: 'bottom' },
//     { id: 'IN4', label: 'IN4', type: PIN_TYPE.DIGITAL, x: 40, y: 50, side: 'bottom' },
//   ],
//   draw(ctx, inst, sim) {
//     const { x, y } = inst;
//     const angle = inst.runtimeState?.angle ?? 0;
//     ctx.save();
//     ctx.translate(x, y);

//     // Motor body (cylindrical)
//     const grad = ctx.createRadialGradient(25, 20, 5, 25, 20, 22);
//     grad.addColorStop(0, '#c0c0c0');
//     grad.addColorStop(0.7, '#888');
//     grad.addColorStop(1, '#555');
//     ctx.fillStyle = grad;
//     ctx.beginPath();
//     ctx.arc(25, 20, 18, 0, Math.PI * 2);
//     ctx.fill();
//     ctx.strokeStyle = '#444';
//     ctx.lineWidth = 1.5;
//     ctx.stroke();

//     // Motor shaft
//     ctx.fillStyle = '#aaa';
//     ctx.beginPath();
//     ctx.arc(25, 20, 4, 0, Math.PI * 2);
//     ctx.fill();
//     ctx.strokeStyle = '#666';
//     ctx.stroke();

//     // Shaft indicator line (shows rotation)
//     const rad = (angle * Math.PI) / 180;
//     ctx.strokeStyle = '#e74c3c';
//     ctx.lineWidth = 2;
//     ctx.beginPath();
//     ctx.moveTo(25, 20);
//     ctx.lineTo(25 + Math.cos(rad) * 14, 20 + Math.sin(rad) * 14);
//     ctx.stroke();

//     // Angle label
//     ctx.fillStyle = '#fff';
//     ctx.font = 'bold 6px monospace';
//     ctx.textAlign = 'center';
//     ctx.fillText(`${Math.round(angle % 360)}°`, 25, 43);

//     // ULN2003 driver chip on bottom
//     ctx.fillStyle = '#1a1a2e';
//     roundRect(ctx, 8, 36, 34, 10, 2);
//     ctx.fill();
//     ctx.fillStyle = '#888';
//     ctx.font = '4px monospace';
//     ctx.fillText('ULN2003', 25, 43);

//     // Pin leads
//     const pinXs = [10, 20, 30, 40];
//     ctx.strokeStyle = '#a0a0a0';
//     ctx.lineWidth = 1.5;
//     for (const px of pinXs) {
//       ctx.beginPath();
//       ctx.moveTo(px, 46);
//       ctx.lineTo(px, 50);
//       ctx.stroke();
//     }

//     if (inst.selected) drawSelectionRect(ctx, 0, 0, 50, 50);
//     ctx.restore();
//   }
// });

/* ═══════════════════════════════════════════════════════════════
   28BYJ-48 Stepper Motor with ULN2003 Driver (2x Scaled: 100x100)
   ═══════════════════════════════════════════════════════════════ */
// defComp({
//   id: 'stepper_28byj',
//   name: '28BYJ-48 Stepper',
//   category: 'Actuators',
//   icon: '⚙️',
//   desc: '5V 4-phase unipolar stepper motor with ULN2003 driver. 2048 steps/rev, 5.625°/step',

//   // 1. Double the component dimensions (was 50 x 50)
//   width: 100,
//   height: 100,
//   defaultProps: { angle: 0 },
//   interactive: [],

//   // 2. Scale pin connection points (multiplied by 2)
//   pins: [
//     { id: 'IN1', label: 'IN1', type: PIN_TYPE.DIGITAL, x: 20, y: 100, side: 'bottom' },
//     { id: 'IN2', label: 'IN2', type: PIN_TYPE.DIGITAL, x: 40, y: 100, side: 'bottom' },
//     { id: 'IN3', label: 'IN3', type: PIN_TYPE.DIGITAL, x: 60, y: 100, side: 'bottom' },
//     { id: 'IN4', label: 'IN4', type: PIN_TYPE.DIGITAL, x: 80, y: 100, side: 'bottom' },
//   ],

//   draw(ctx, inst, sim) {
//     const { x, y } = inst;
//     const angle = inst.runtimeState?.angle ?? 0;

//     ctx.save();
//     ctx.translate(x, y);

//     // 3. Apply 2x scale to all drawing operations
//     ctx.scale(2, 2);

//     // Motor body (cylindrical)
//     const grad = ctx.createRadialGradient(25, 20, 5, 25, 20, 22);
//     grad.addColorStop(0, '#c0c0c0');
//     grad.addColorStop(0.7, '#888');
//     grad.addColorStop(1, '#555');
//     ctx.fillStyle = grad;
//     ctx.beginPath();
//     ctx.arc(25, 20, 18, 0, Math.PI * 2);
//     ctx.fill();
//     ctx.strokeStyle = '#444';
//     ctx.lineWidth = 1.5;
//     ctx.stroke();

//     // Motor shaft
//     ctx.fillStyle = '#aaa';
//     ctx.beginPath();
//     ctx.arc(25, 20, 4, 0, Math.PI * 2);
//     ctx.fill();
//     ctx.strokeStyle = '#666';
//     ctx.stroke();

//     // Shaft indicator line
//     const rad = (angle * Math.PI) / 180;
//     ctx.strokeStyle = '#e74c3c';
//     ctx.lineWidth = 2;
//     ctx.beginPath();
//     ctx.moveTo(25, 20);
//     ctx.lineTo(25 + Math.cos(rad) * 14, 20 + Math.sin(rad) * 14);
//     ctx.stroke();

//     // Angle label
//     ctx.fillStyle = '#fff';
//     ctx.font = 'bold 6px monospace';
//     ctx.textAlign = 'center';
//     ctx.fillText(`${Math.round(angle % 360)}°`, 25, 43);

//     // ULN2003 driver chip
//     ctx.fillStyle = '#1a1a2e';
//     roundRect(ctx, 8, 36, 34, 10, 2);
//     ctx.fill();
//     ctx.fillStyle = '#888';
//     ctx.font = '4px monospace';
//     ctx.fillText('ULN2003', 25, 43);

//     // Pin leads
//     const pinXs = [10, 20, 30, 40];
//     ctx.strokeStyle = '#a0a0a0';
//     ctx.lineWidth = 1.5;
//     for (const px of pinXs) {
//       ctx.beginPath();
//       ctx.moveTo(px, 46);
//       ctx.lineTo(px, 50);
//       ctx.stroke();
//     }

//     if (inst.selected) drawSelectionRect(ctx, 0, 0, 50, 50);
//     ctx.restore();
//   }
// });

/* ═══════════════════════════════════════════════════════════════
   WS2812B NeoPixel — Addressable RGB LED
   ═══════════════════════════════════════════════════════════════ */
// defComp({
//   id: 'neopixel',
//   name: 'WS2812B NeoPixel',
//   category: 'Output',
//   icon: '💡',
//   desc: 'Addressable RGB LED (WS2812B). Single pixel — data pin receives color via NeoPixel library',
//   width: 20,
//   height: 24,
//   defaultProps: { r: 0, g: 0, b: 0, brightness: 255 },
//   interactive: [
//     { field: 'r', label: 'R', min: 0, max: 255, step: 1, unit: '' },
//     { field: 'g', label: 'G', min: 0, max: 255, step: 1, unit: '' },
//     { field: 'b', label: 'B', min: 0, max: 255, step: 1, unit: '' },
//   ],
//   pins: [
//     { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER, x: 6, y: 24, side: 'bottom' },
//     { id: 'DOUT', label: 'DOut', type: PIN_TYPE.DIGITAL, x: 10, y: 24, side: 'bottom' },
//     { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 14, y: 24, side: 'bottom' },
//   ],
//   draw(ctx, inst, sim) {
//     const { x, y } = inst;
//     const rs = inst.runtimeState || {};
//     const r = rs.r ?? inst.props.r ?? 0;
//     const g = rs.g ?? inst.props.g ?? 0;
//     const b = rs.b ?? inst.props.b ?? 0;
//     const brightness = rs.brightness ?? inst.props.brightness ?? 255;
//     ctx.save();
//     ctx.translate(x, y);

//     // LED body
//     const rgb = `rgb(${Math.round(r * brightness / 255)}, ${Math.round(g * brightness / 255)}, ${Math.round(b * brightness / 255)})`;
//     const isOn = r > 0 || g > 0 || b > 0;

//     if (isOn) {
//       // Glow effect
//       ctx.shadowColor = rgb;
//       ctx.shadowBlur = 12;
//     }

//     ctx.fillStyle = isOn ? rgb : '#222';
//     roundRect(ctx, 2, 2, 16, 16, 3);
//     ctx.fill();
//     ctx.shadowBlur = 0;

//     // LED lens highlight
//     ctx.fillStyle = 'rgba(255,255,255,0.15)';
//     ctx.beginPath();
//     ctx.arc(10, 9, 5, 0, Math.PI * 2);
//     ctx.fill();

//     // Border
//     ctx.strokeStyle = '#555';
//     ctx.lineWidth = 1;
//     roundRect(ctx, 2, 2, 16, 16, 3);
//     ctx.stroke();

//     // Color label
//     ctx.fillStyle = '#aaa';
//     ctx.font = '4px monospace';
//     ctx.textAlign = 'center';
//     ctx.fillText(`R${r}`, 6, 22);
//     ctx.fillText(`G${g}`, 10, 22);
//     ctx.fillText(`B${b}`, 14, 22);

//     // Pin leads
//     ctx.strokeStyle = '#a0a0a0';
//     ctx.lineWidth = 1.5;
//     ctx.beginPath(); ctx.moveTo(6, 18); ctx.lineTo(6, 24); ctx.stroke();
//     ctx.beginPath(); ctx.moveTo(10, 18); ctx.lineTo(10, 24); ctx.stroke();
//     ctx.beginPath(); ctx.moveTo(14, 18); ctx.lineTo(14, 24); ctx.stroke();

//     if (inst.selected) drawSelectionRect(ctx, 0, 0, 20, 24);
//     ctx.restore();
//   }
// });

/* -------------- 28BYJ-48 Stepper Motor + ULN2003 Driver (Realistic Design) ------------------ */
defComp({
  id: 'stepper_28byj',
  name: '28BYJ-48 Stepper',
  category: 'Actuators',
  icon: '⚙️',
  desc: '5V 4-phase unipolar stepper motor with ULN2003 driver (2048 steps/rev, 5.625°/step)',
  width: 100,
  height: 100,
  defaultProps: { angle: 0 },
  interactive: [],
  pins: [
    { id: 'IN1', label: 'IN1', type: PIN_TYPE.DIGITAL, x: 20, y: 100, side: 'bottom' },
    { id: 'IN2', label: 'IN2', type: PIN_TYPE.DIGITAL, x: 40, y: 100, side: 'bottom' },
    { id: 'IN3', label: 'IN3', type: PIN_TYPE.DIGITAL, x: 60, y: 100, side: 'bottom' },
    { id: 'IN4', label: 'IN4', type: PIN_TYPE.DIGITAL, x: 80, y: 100, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const angle = inst.runtimeState?.angle ?? inst.props.angle ?? 0;
    const rad = (angle * Math.PI) / 180;

    ctx.save();
    ctx.translate(x, y);

    // ==========================================
    // 1. 28BYJ-48 MOTOR ENCLOSURE (Top Section)
    // ==========================================

    // Stamped Metal Mounting Ears (Flanges)
    ctx.fillStyle = '#b0bec5';
    roundRect(ctx, 8, 22, 84, 12, 5);
    ctx.fill();
    ctx.strokeStyle = '#78909c';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Screw Mounting Slots on Ears
    [[14, 28], [86, 28]].forEach(([hx, hy]) => {
      ctx.fillStyle = '#455a64';
      ctx.beginPath();
      ctx.ellipse(hx, hy, 3.5, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#cfd8dc';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });

    // Cylindrical Motor Body (Nickel-Plated Steel Sheen)
    const motorGrad = ctx.createRadialGradient(44, 22, 3, 50, 28, 25);
    motorGrad.addColorStop(0, '#ffffff');
    motorGrad.addColorStop(0.35, '#cfd8dc');
    motorGrad.addColorStop(0.75, '#90a4ae');
    motorGrad.addColorStop(1, '#546e7a');
    ctx.fillStyle = motorGrad;
    ctx.beginPath();
    ctx.arc(50, 28, 24, 0, Math.PI * 2);
    ctx.fill();

    // Motor Outer Rim Ring
    ctx.strokeStyle = '#455a64';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Molded Blue Wire Strain Relief Casing (Authentic 28BYJ-48 feature)
    ctx.fillStyle = '#1565c0';
    roundRect(ctx, 18, 6, 16, 9, 2);
    ctx.fill();
    ctx.strokeStyle = '#0d47a1';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // 5 Colored Motor Wires (Blue, Pink, Yellow, Orange, Red)
    const wireColors = ['#1e88e5', '#ec407a', '#fbc02d', '#fb8c00', '#e53935'];
    wireColors.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(20 + i * 2.5, 2, 1.8, 5);
    });

    // Raised Bearing Collar
    const collarGrad = ctx.createRadialGradient(48, 26, 1, 50, 28, 9);
    collarGrad.addColorStop(0, '#e0e0e0');
    collarGrad.addColorStop(1, '#757575');
    ctx.fillStyle = collarGrad;
    ctx.beginPath();
    ctx.arc(50, 28, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#424242';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Brass D-Cut Shaft & Needle Indicator (Rotates with angle)
    ctx.save();
    ctx.translate(50, 28);
    ctx.rotate(rad);

    // Brass Shaft Base
    const brassGrad = ctx.createRadialGradient(-1, -1, 1, 0, 0, 5);
    brassGrad.addColorStop(0, '#ffe082');
    brassGrad.addColorStop(0.6, '#ffd54f');
    brassGrad.addColorStop(1, '#b58105');
    ctx.fillStyle = brassGrad;
    ctx.beginPath();
    // Flattened D-shaft profile
    ctx.arc(0, 0, 5, -Math.PI * 0.72, Math.PI * 0.72, false);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#8d6200';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // High-Visibility Index Pointer (Red needle + Hub pin)
    ctx.strokeStyle = '#e53935';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(19, 0);
    ctx.stroke();

    ctx.fillStyle = '#d32f2f';
    ctx.beginPath();
    ctx.arc(19, 0, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Angle Overlay Tag
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    roundRect(ctx, 33, 43, 34, 10, 3);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 7px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(((angle % 360) + 360) % 360)}°`, 50, 48);

    // ==========================================
    // 2. ULN2003 DRIVER BOARD (Bottom Section)
    // ==========================================

    // Blue FR4 Driver PCB
    const pcbX = 8, pcbY = 56, pcbW = 84, pcbH = 34;
    ctx.fillStyle = '#0f2744';
    roundRect(ctx, pcbX, pcbY, pcbW, pcbH, 3);
    ctx.fill();
    ctx.strokeStyle = '#1e4976';
    ctx.lineWidth = 1;
    ctx.stroke();

    // PCB Mounting Holes
    [[pcbX + 4, pcbY + 4], [pcbX + pcbW - 4, pcbY + 4]].forEach(([hx, hy]) => {
      ctx.fillStyle = '#c8a452';
      ctx.beginPath(); ctx.arc(hx, hy, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#061322';
      ctx.beginPath(); ctx.arc(hx, hy, 1.2, 0, Math.PI * 2); ctx.fill();
    });

    // ULN2003A Darlington Transistor IC (SOIC-16 Package)
    ctx.fillStyle = '#1c1c1c';
    roundRect(ctx, pcbX + 5, pcbY + 11, 28, 12, 1);
    ctx.fill();

    // IC Pin 1 Notch & Silkscreen
    ctx.fillStyle = '#333333';
    ctx.beginPath(); ctx.arc(pcbX + 7.5, pcbY + 14, 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = 'bold 5px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('ULN2003A', pcbX + 9.5, pcbY + 17);

    // IC Gull-Wing Leads
    ctx.fillStyle = '#b0bec5';
    for (let p = 0; p < 6; p++) {
      ctx.fillRect(pcbX + 8 + p * 4, pcbY + 9.5, 1.8, 1.5);
      ctx.fillRect(pcbX + 8 + p * 4, pcbY + 23, 1.8, 1.5);
    }

    // 4-Phase Stepper Status Indicator LEDs (A, B, C, D)
    const activePhase = Math.floor((((angle % 360) + 360) % 360) / 90) % 4;
    for (let i = 0; i < 4; i++) {
      const lx = pcbX + 40 + i * 10;
      const ly = pcbY + 12;
      const isLit = activePhase === i;

      // SMD LED Body
      ctx.fillStyle = '#212121';
      roundRect(ctx, lx, ly, 7, 5, 1);
      ctx.fill();

      // LED Lens & Glow
      ctx.fillStyle = isLit ? '#facc15' : '#713f12';
      ctx.fillRect(lx + 1.5, ly + 1.2, 4, 2.6);

      if (isLit) {
        ctx.fillStyle = 'rgba(250, 204, 21, 0.35)';
        ctx.beginPath();
        ctx.arc(lx + 3.5, ly + 2.5, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Phase Labels A, B, C, D
      ctx.fillStyle = isLit ? '#fef08a' : 'rgba(255, 255, 255, 0.4)';
      ctx.font = '4.5px "JetBrains Mono", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(['A', 'B', 'C', 'D'][i], lx + 3.5, ly + 9.5);
    }

    // Silkscreen Pin Labels (IN1..IN4)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = 'bold 5px "JetBrains Mono", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('IN1', 20, 84);
    ctx.fillText('IN2', 40, 84);
    ctx.fillText('IN3', 60, 84);
    ctx.fillText('IN4', 80, 84);

    // Black Header Connector Shroud
    ctx.fillStyle = '#141414';
    roundRect(ctx, 12, 88, 76, 4, 1);
    ctx.fill();

    // 4 Input Pin Leads (Gold Terminals)
    const pinXs = [20, 40, 60, 80];
    pinXs.forEach(px => {
      // PCB Solder Pad
      ctx.fillStyle = '#c8a452';
      ctx.beginPath(); ctx.arc(px, 87, 1.3, 0, Math.PI * 2); ctx.fill();
      // Gold Pin Header Lead
      ctx.fillStyle = '#ffd066';
      ctx.fillRect(px - 1.2, 91, 2.4, 9);
    });

    if (inst.selected) drawSelectionRect(ctx, -3, -3, 106, 106);
    ctx.restore();
  }
});

/* ═══════════════════════════════════════════════════════════════
   WS2812B NeoPixel (Enlarged 2x: 40x48)
   ═══════════════════════════════════════════════════════════════ */
defComp({
  id: 'neopixel',
  name: 'WS2812B NeoPixel',
  category: 'Output',
  icon: '💡',
  desc: 'Addressable RGB LED (WS2812B). Single pixel — data pin receives color via NeoPixel library',
  width: 40,   // Scaled from 20 to 40 (2x)
  height: 48,  // Scaled from 24 to 48 (2x)
  defaultProps: { r: 0, g: 0, b: 0, brightness: 255 },
  interactive: [
    { field: 'r', label: 'R', min: 0, max: 255, step: 1, unit: '' },
    { field: 'g', label: 'G', min: 0, max: 255, step: 1, unit: '' },
    { field: 'b', label: 'B', min: 0, max: 255, step: 1, unit: '' },
  ],
  pins: [
    // Scaled pin offsets by 2x
    { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER, x: 12, y: 48, side: 'bottom' },
    { id: 'DOUT', label: 'DOut', type: PIN_TYPE.DIGITAL, x: 20, y: 48, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 28, y: 48, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const rs = inst.runtimeState || {};
    const r = rs.r ?? inst.props.r ?? 0;
    const g = rs.g ?? inst.props.g ?? 0;
    const b = rs.b ?? inst.props.b ?? 0;
    const brightness = rs.brightness ?? inst.props.brightness ?? 255;
    const scale = 2; // Scale factor

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale); // Scales all vector drawing, fonts, and borders

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

    // Uses base dimensions because the canvas context is already scaled
    if (inst.selected) drawSelectionRect(ctx, 0, 0, 20, 24);
    ctx.restore();
  }
});

/* ═══════════════════════════════════════════════════════════════
   IR Obstacle Avoidance Sensor
   ═══════════════════════════════════════════════════════════════ */
// defComp({
//   id: 'ir_obstacle',
//   name: 'IR Obstacle Sensor',
//   category: 'Sensors',
//   icon: '👁️',
//   desc: 'Infrared obstacle detection sensor. Digital output — LOW when obstacle detected (2-30cm range)',
//   width: 30,
//   height: 40,
//   defaultProps: { detected: 0 },
//   interactive: [
//     { field: 'detected', label: 'Object', min: 0, max: 1, step: 1, unit: '' },
//   ],
//   pins: [
//     { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER, x: 6, y: 40, side: 'bottom' },
//     { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 12, y: 40, side: 'bottom' },
//     { id: 'OUT', label: 'OUT', type: PIN_TYPE.DIGITAL, x: 18, y: 40, side: 'bottom' },
//   ],
//   draw(ctx, inst, sim) {
//     const { x, y } = inst;
//     const detected = inst.runtimeState?.detected ?? inst.props.detected ?? 0;
//     ctx.save();
//     ctx.translate(x, y);
//     // 3. Apply 2x scale to all drawing operations
//     ctx.scale(4, 4);

//     // PCB body
//     ctx.fillStyle = '#1a5c1a';
//     roundRect(ctx, 0, 0, 24, 34, 3);
//     ctx.fill();
//     ctx.strokeStyle = '#2a7a2a';
//     ctx.lineWidth = 1;
//     roundRect(ctx, 0, 0, 24, 34, 3);
//     ctx.stroke();

//     // IR emitter (top)
//     ctx.fillStyle = '#333';
//     ctx.beginPath();
//     ctx.arc(8, 8, 4, 0, Math.PI * 2);
//     ctx.fill();
//     ctx.fillStyle = detected ? '#ff3333' : '#661111';
//     ctx.beginPath();
//     ctx.arc(8, 8, 2, 0, Math.PI * 2);
//     ctx.fill();
//     if (detected) {
//       ctx.shadowColor = '#ff0000';
//       ctx.shadowBlur = 6;
//       ctx.fill();
//       ctx.shadowBlur = 0;
//     }

//     // IR receiver (top)
//     ctx.fillStyle = '#222';
//     ctx.beginPath();
//     ctx.arc(16, 8, 4, 0, Math.PI * 2);
//     ctx.fill();
//     ctx.fillStyle = detected ? '#4400ff' : '#220066';
//     ctx.beginPath();
//     ctx.arc(16, 8, 2, 0, Math.PI * 2);
//     ctx.fill();

//     // Status LED
//     ctx.fillStyle = detected ? '#00ff00' : '#003300';
//     ctx.beginPath();
//     ctx.arc(12, 20, 2, 0, Math.PI * 2);
//     ctx.fill();

//     // Label
//     ctx.fillStyle = '#ccc';
//     ctx.font = '4px monospace';
//     ctx.textAlign = 'center';
//     ctx.fillText(detected ? 'DETECT' : 'CLEAR', 12, 30);

//     // Pin leads
//     ctx.strokeStyle = '#a0a0a0';
//     ctx.lineWidth = 1.5;
//     ctx.beginPath(); ctx.moveTo(6, 34); ctx.lineTo(6, 40); ctx.stroke();
//     ctx.beginPath(); ctx.moveTo(12, 34); ctx.lineTo(12, 40); ctx.stroke();
//     ctx.beginPath(); ctx.moveTo(18, 34); ctx.lineTo(18, 40); ctx.stroke();

//     if (inst.selected) drawSelectionRect(ctx, 0, 0, 24, 40);
//     ctx.restore();
//   }
// });

/* -------------- IR Obstacle Avoidance Sensor Module (Enlarged) ------------------ */
defComp({
  id: 'ir_obstacle',
  name: 'IR Obstacle Sensor',
  category: 'Sensors',
  icon: '👁️',
  desc: 'Infrared obstacle detection sensor module with LM393 comparator (Digital OUT: LOW when obstacle detected, 2–30cm range)',
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
    { id: 'anode', label: 'A', type: PIN_TYPE.SIGNAL, x: 4, y: 14, side: 'bottom' },
    { id: 'cathode', label: 'K', type: PIN_TYPE.SIGNAL, x: 36, y: 14, side: 'bottom' },
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
   BME280 / BMP280 — Precision Environment Sensor (I2C)
   ═══════════════════════════════════════════════════════════════ */
// defComp({
//   id: 'bme280',
//   name: 'BME280 Sensor',
//   category: 'Sensors',
//   icon: '🌡️',
//   desc: 'BME280 precision barometric pressure, temperature, and humidity sensor (I2C @ 0x76)',
//   width: 56,
//   height: 72,
//   defaultProps: { temperature: 25, humidity: 50, pressure: 1013 },
//   interactive: [
//     { field: 'temperature', label: 'Temp', min: -40, max: 85, step: 0.1, unit: '°C' },
//     { field: 'humidity', label: 'Hum', min: 0, max: 100, step: 1, unit: '%' },
//     { field: 'pressure', label: 'hPa', min: 300, max: 1100, step: 1, unit: 'hPa' },
//   ],
//   pins: [
//     { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER, x: 8, y: 72, side: 'bottom' },
//     { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 20, y: 72, side: 'bottom' },
//     { id: 'SCL', label: 'SCL', type: PIN_TYPE.DIGITAL, x: 36, y: 72, side: 'bottom' },
//     { id: 'SDA', label: 'SDA', type: PIN_TYPE.DIGITAL, x: 48, y: 72, side: 'bottom' },
//   ],
//   draw(ctx, inst, sim) {
//     const { x, y } = inst;
//     const temp = inst.runtimeState?.temperature ?? inst.props.temperature ?? 25;
//     const hum = inst.runtimeState?.humidity ?? inst.props.humidity ?? 50;
//     const pres = inst.runtimeState?.pressure ?? inst.props.pressure ?? 1013;

//     ctx.save();
//     ctx.translate(x, y);

//     // PCB body
//     ctx.fillStyle = '#1a1a2e';
//     roundRect(ctx, 0, 0, 56, 60, 4);
//     ctx.fill();
//     ctx.strokeStyle = '#333355';
//     ctx.lineWidth = 1;
//     ctx.stroke();

//     // BME280 chip
//     ctx.fillStyle = '#111';
//     roundRect(ctx, 12, 8, 32, 20, 2);
//     ctx.fill();
//     ctx.fillStyle = '#666';
//     ctx.font = 'bold 5px monospace';
//     ctx.textAlign = 'center';
//     ctx.fillText('BME280', 28, 18);

//     // Sensor hole
//     ctx.fillStyle = '#333';
//     ctx.beginPath();
//     ctx.arc(28, 36, 6, 0, Math.PI * 2);
//     ctx.fill();
//     ctx.fillStyle = '#222';
//     ctx.beginPath();
//     ctx.arc(28, 36, 4, 0, Math.PI * 2);
//     ctx.fill();

//     // Live data display
//     ctx.fillStyle = '#0a0a1a';
//     roundRect(ctx, 4, 44, 48, 14, 2);
//     ctx.fill();
//     ctx.fillStyle = '#ff9800';
//     ctx.font = 'bold 4px monospace';
//     ctx.textAlign = 'left';
//     ctx.fillText('T:', 6, 50);
//     ctx.fillStyle = '#fff';
//     ctx.font = 'bold 5px monospace';
//     ctx.fillText(`${temp.toFixed(1)}°C`, 14, 50);
//     ctx.fillStyle = '#00e5ff';
//     ctx.font = 'bold 4px monospace';
//     ctx.fillText('H:', 6, 56);
//     ctx.fillStyle = '#fff';
//     ctx.fillText(`${hum}%`, 14, 56);

//     // Pin leads
//     ctx.strokeStyle = '#a0a0a0';
//     ctx.lineWidth = 1.5;
//     [8, 20, 36, 48].forEach(px => {
//       ctx.beginPath(); ctx.moveTo(px, 60); ctx.lineTo(px, 72); ctx.stroke();
//     });

//     if (inst.selected) drawSelectionRect(ctx, -2, -2, 60, 76);
//     ctx.restore();
//   }
// });

/* ═══════════════════════════════════════════════════════════════
   BME280 / BMP280 — Precision Environment Sensor (I2C @ 0x76)
   ═══════════════════════════════════════════════════════════════ */
defComp({
  id: 'bme280',
  name: 'BME280 Sensor',
  category: 'Sensors',
  icon: '🌡️',
  desc: 'BME280 precision barometric pressure, temperature, and humidity sensor (I2C @ 0x76)',
  width: 56,
  height: 76,
  defaultProps: { temperature: 25, humidity: 50, pressure: 1013 },
  interactive: [
    { field: 'temperature', label: 'Temp', min: -40, max: 85, step: 0.1, unit: '°C' },
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
    ctx.fillText(`${temp.toFixed(1)}°C`, 14, 37);

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

/* ═══════════════════════════════════════════════════════════════
   VL53L0X — Time-of-Flight Laser Distance Sensor (I2C)
   ═══════════════════════════════════════════════════════════════ */
defComp({
  id: 'vl53l0x',
  name: 'VL53L0X ToF Sensor',
  category: 'Sensors',
  icon: '📏',
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

/* ═══════════════════════════════════════════════════════════════
   RC522 — 13.56MHz RFID Reader (SPI)
   ═══════════════════════════════════════════════════════════════ */
defComp({
  id: 'rc522',
  name: 'RC522 RFID Reader',
  category: 'Sensors',
  icon: '💳',
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

/* ═══════════════════════════════════════════════════════════════
   TSOP4838 — IR Receiver (38kHz NEC/RC5)
   ═══════════════════════════════════════════════════════════════ */
defComp({
  id: 'ir_receiver',
  name: 'IR Receiver TSOP4838',
  category: 'Sensors',
  icon: '📡',
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

/* ═══════════════════════════════════════════════════════════════
   MAX7219 — 8x8 LED Matrix Display (SPI)
   ═══════════════════════════════════════════════════════════════ */
defComp({
  id: 'max7219',
  name: 'MAX7219 LED Matrix',
  category: 'Output',
  icon: '🔲',
  desc: 'MAX7219 8x8 LED matrix display driver (SPI). Daisy-chainable for scrolling text and animations',
  width: 80,
  height: 100,
  defaultProps: { pattern: 0 },
  interactive: [],
  pins: [
    { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER, x: 8, y: 100, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 22, y: 100, side: 'bottom' },
    { id: 'DIN', label: 'DIN', type: PIN_TYPE.DIGITAL, x: 36, y: 100, side: 'bottom' },
    { id: 'CS', label: 'CS', type: PIN_TYPE.DIGITAL, x: 50, y: 100, side: 'bottom' },
    { id: 'CLK', label: 'CLK', type: PIN_TYPE.DIGITAL, x: 64, y: 100, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const pattern = inst.runtimeState?.pattern ?? inst.props.pattern ?? 0;

    ctx.save();
    ctx.translate(x, y);

    // PCB body
    ctx.fillStyle = '#1a1a2e';
    roundRect(ctx, 0, 0, 80, 88, 4);
    ctx.fill();

    // 8x8 LED matrix
    ctx.fillStyle = '#0a0a0a';
    roundRect(ctx, 8, 8, 64, 64, 2);
    ctx.fill();

    // LED grid
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const bit = (pattern >> (row * 8 + col)) & 1;
        const lx = 12 + col * 7.5;
        const ly = 12 + row * 7.5;
        ctx.fillStyle = bit ? '#ff3333' : '#1a0a0a';
        ctx.fillRect(lx, ly, 6, 6);
        if (bit) {
          ctx.shadowColor = '#ff0000';
          ctx.shadowBlur = 3;
          ctx.fillRect(lx, ly, 6, 6);
          ctx.shadowBlur = 0;
        }
      }
    }

    // MAX7219 chip
    ctx.fillStyle = '#111';
    roundRect(ctx, 24, 76, 32, 8, 1);
    ctx.fill();
    ctx.fillStyle = '#666';
    ctx.font = 'bold 4px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MAX7219', 40, 81);

    // Pin leads
    ctx.strokeStyle = '#a0a0a0';
    ctx.lineWidth = 1.5;
    [8, 22, 36, 50, 64].forEach(px => {
      ctx.beginPath(); ctx.moveTo(px, 88); ctx.lineTo(px, 100); ctx.stroke();
    });

    if (inst.selected) drawSelectionRect(ctx, -2, -2, 84, 104);
    ctx.restore();
  }
});

/* ═══════════════════════════════════════════════════════════════
   ILI9341 — 2.4" TFT Display (SPI)
   ═══════════════════════════════════════════════════════════════ */
defComp({
  id: 'ili9341',
  name: 'ILI9341 TFT Display',
  category: 'Output',
  icon: '🖥️',
  desc: 'ILI9341 2.4" 240x320 TFT LCD display (SPI). Full-color with Adafruit_GFX support',
  width: 80,
  height: 110,
  defaultProps: { color: 0x0000 },
  interactive: [],
  pins: [
    { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER, x: 8, y: 110, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 20, y: 110, side: 'bottom' },
    { id: 'CS', label: 'CS', type: PIN_TYPE.DIGITAL, x: 32, y: 110, side: 'bottom' },
    { id: 'DC', label: 'DC', type: PIN_TYPE.DIGITAL, x: 44, y: 110, side: 'bottom' },
    { id: 'MOSI', label: 'MOSI', type: PIN_TYPE.DIGITAL, x: 56, y: 110, side: 'bottom' },
    { id: 'SCK', label: 'SCK', type: PIN_TYPE.DIGITAL, x: 68, y: 110, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const color = inst.runtimeState?.color ?? inst.props.color ?? 0x0000;

    ctx.save();
    ctx.translate(x, y);

    // Display bezel
    ctx.fillStyle = '#222';
    roundRect(ctx, 0, 0, 80, 96, 4);
    ctx.fill();

    // Screen
    const r = (color >> 16) & 0xFF;
    const g = (color >> 8) & 0xFF;
    const b = color & 0xFF;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(6, 6, 68, 74);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(6, 6, 68, 74);

    // Touch panel border
    ctx.fillStyle = '#333';
    roundRect(ctx, 4, 82, 72, 10, 2);
    ctx.fill();
    ctx.fillStyle = '#888';
    ctx.font = 'bold 5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ILI9341 240x320', 40, 89);

    // Pin leads
    ctx.strokeStyle = '#a0a0a0';
    ctx.lineWidth = 1.5;
    [8, 20, 32, 44, 56, 68].forEach(px => {
      ctx.beginPath(); ctx.moveTo(px, 96); ctx.lineTo(px, 110); ctx.stroke();
    });

    if (inst.selected) drawSelectionRect(ctx, -2, -2, 84, 114);
    ctx.restore();
  }
});

/* ═══════════════════════════════════════════════════════════════
   L298N — Dual H-Bridge Motor Driver
   ═══════════════════════════════════════════════════════════════ */
defComp({
  id: 'l298n',
  name: 'L298N Motor Driver',
  category: 'Actuators',
  icon: '🔌',
  desc: 'L298N dual H-bridge motor driver. Controls direction and PWM speed for two DC motors',
  width: 100,
  height: 80,
  defaultProps: {},
  pins: [
    { id: 'IN1', label: 'IN1', type: PIN_TYPE.DIGITAL, x: 10, y: 80, side: 'bottom' },
    { id: 'IN2', label: 'IN2', type: PIN_TYPE.DIGITAL, x: 26, y: 80, side: 'bottom' },
    { id: 'IN3', label: 'IN3', type: PIN_TYPE.DIGITAL, x: 42, y: 80, side: 'bottom' },
    { id: 'IN4', label: 'IN4', type: PIN_TYPE.DIGITAL, x: 58, y: 80, side: 'bottom' },
    { id: 'ENA', label: 'ENA', type: PIN_TYPE.PWM, x: 74, y: 80, side: 'bottom' },
    { id: 'ENB', label: 'ENB', type: PIN_TYPE.PWM, x: 90, y: 80, side: 'bottom' },
    { id: 'OUT1', label: 'M1+', type: PIN_TYPE.SIGNAL, x: 10, y: 0, side: 'top' },
    { id: 'OUT2', label: 'M1-', type: PIN_TYPE.SIGNAL, x: 30, y: 0, side: 'top' },
    { id: 'OUT3', label: 'M2+', type: PIN_TYPE.SIGNAL, x: 70, y: 0, side: 'top' },
    { id: 'OUT4', label: 'M2-', type: PIN_TYPE.SIGNAL, x: 90, y: 0, side: 'top' },
    { id: 'VS', label: 'VS', type: PIN_TYPE.POWER, x: 50, y: 0, side: 'top' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 50, y: 80, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;

    ctx.save();
    ctx.translate(x, y);

    // PCB body
    ctx.fillStyle = '#0a3d0a';
    roundRect(ctx, 0, 8, 100, 64, 4);
    ctx.fill();
    ctx.strokeStyle = '#1a5c1a';
    ctx.lineWidth = 1;
    ctx.stroke();

    // L298N heatsink
    ctx.fillStyle = '#333';
    roundRect(ctx, 30, 16, 40, 24, 2);
    ctx.fill();
    ctx.fillStyle = '#555';
    ctx.font = 'bold 5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('L298N', 50, 30);

    // Motor output terminals
    ctx.fillStyle = '#c8a452';
    [[15, 12], [35, 12], [65, 12], [85, 12]].forEach(([tx, ty]) => {
      ctx.beginPath();
      ctx.arc(tx, ty, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Status LEDs
    ctx.fillStyle = '#00ff00';
    ctx.beginPath(); ctx.arc(10, 50, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff0000';
    ctx.beginPath(); ctx.arc(20, 50, 2, 0, Math.PI * 2); ctx.fill();

    // Labels
    ctx.fillStyle = '#aaa';
    ctx.font = 'bold 4px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MOTOR A', 22, 60);
    ctx.fillText('MOTOR B', 78, 60);

    // Pin leads
    ctx.strokeStyle = '#a0a0a0';
    ctx.lineWidth = 1.5;
    [10, 26, 42, 58, 74, 90].forEach(px => {
      ctx.beginPath(); ctx.moveTo(px, 72); ctx.lineTo(px, 80); ctx.stroke();
    });
    [10, 30, 50, 70, 90].forEach(px => {
      ctx.beginPath(); ctx.moveTo(px, 8); ctx.lineTo(px, 0); ctx.stroke();
    });

    if (inst.selected) drawSelectionRect(ctx, -2, -4, 104, 88);
    ctx.restore();
  }
});

/* ═══════════════════════════════════════════════════════════════
   Continuous Rotation Servo
   ═══════════════════════════════════════════════════════════════ */
defComp({
  id: 'servo_continuous',
  name: 'Cont. Rotation Servo',
  category: 'Actuators',
  icon: '⚙️',
  desc: 'Continuous rotation servo motor. Variable speed control in both directions (not 0-180° positioning)',
  width: 60,
  height: 50,
  defaultProps: { speed: 0 },
  interactive: [
    { field: 'speed', label: 'Speed', min: -100, max: 100, step: 1, unit: '%' },
  ],
  pins: [
    { id: 'signal', label: 'SIG', type: PIN_TYPE.PWM, x: 8, y: 50, side: 'bottom' },
    { id: 'vcc', label: '+', type: PIN_TYPE.POWER, x: 25, y: 50, side: 'bottom' },
    { id: 'gnd', label: '−', type: PIN_TYPE.GND, x: 42, y: 50, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const speed = inst.runtimeState?.speed ?? inst.props.speed ?? 0;
    const rotation = Date.now() * speed * 0.01;

    ctx.save();
    ctx.translate(x, y);

    // Leads
    ctx.strokeStyle = '#f5c842';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(8, 50); ctx.lineTo(8, 44); ctx.stroke();
    ctx.strokeStyle = '#cc3333';
    ctx.beginPath(); ctx.moveTo(25, 50); ctx.lineTo(25, 44); ctx.stroke();
    ctx.strokeStyle = '#333';
    ctx.beginPath(); ctx.moveTo(42, 50); ctx.lineTo(42, 44); ctx.stroke();

    // Body
    const bodyGrad = ctx.createLinearGradient(0, 5, 60, 45);
    bodyGrad.addColorStop(0, '#3a3a3a');
    bodyGrad.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = bodyGrad;
    roundRect(ctx, 0, 5, 60, 40, 6);
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Gear hub
    ctx.fillStyle = '#555';
    ctx.beginPath(); ctx.arc(30, 22, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(30, 22, 7, 0, Math.PI * 2); ctx.fill();

    // Rotating arm
    ctx.save();
    ctx.translate(30, 22);
    ctx.rotate(rotation);
    ctx.fillStyle = '#aaa';
    roundRect(ctx, -4, -20, 8, 22, 3);
    ctx.fill();
    ctx.fillStyle = '#ccc';
    ctx.beginPath(); ctx.arc(0, -18, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Center hub
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(30, 22, 4, 0, Math.PI * 2); ctx.fill();

    // Speed display
    ctx.fillStyle = '#aaa';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    const dir = speed > 0 ? 'CW' : speed < 0 ? 'CCW' : 'STOP';
    ctx.fillText(`${Math.abs(speed)}% ${dir}`, 30, 42);

    if (inst.selected) drawSelectionRect(ctx, -3, 2, 66, 55);
    ctx.restore();
  }
});

/* ═══════════════════════════════════════════════════════════════
   EC11 Rotary Encoder with Push Button
   ═══════════════════════════════════════════════════════════════ */
defComp({
  id: 'rotary_encoder',
  name: 'Rotary Encoder EC11',
  category: 'Input',
  icon: '🎛️',
  desc: 'EC11 rotary encoder with push button. Infinite rotation with quadrature output (A, B) + switch',
  width: 40,
  height: 50,
  defaultProps: { position: 0, pressed: false },
  interactive: [
    { field: 'position', label: 'Pos', min: -100, max: 100, step: 1, unit: '' },
  ],
  pins: [
    { id: 'A', label: 'A', type: PIN_TYPE.DIGITAL, x: 6, y: 50, side: 'bottom' },
    { id: 'B', label: 'B', type: PIN_TYPE.DIGITAL, x: 16, y: 50, side: 'bottom' },
    { id: 'SW', label: 'SW', type: PIN_TYPE.DIGITAL, x: 26, y: 50, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 36, y: 50, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const pressed = inst.runtimeState?.pressed ?? inst.props.pressed ?? false;
    const position = inst.runtimeState?.position ?? inst.props.position ?? 0;

    ctx.save();
    ctx.translate(x, y);

    // Shaft
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(20, 18, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#aaa';
    ctx.beginPath(); ctx.arc(20, 18, 5, 0, Math.PI * 2); ctx.fill();

    // Knob
    ctx.fillStyle = pressed ? '#333' : '#444';
    ctx.beginPath(); ctx.arc(20, 18, 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Knob indicator
    const angle = (position * 3.6) * Math.PI / 180;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, 18);
    ctx.lineTo(20 + Math.cos(angle) * 10, 18 + Math.sin(angle) * 10);
    ctx.stroke();

    // Position display
    ctx.fillStyle = '#0a0a1a';
    roundRect(ctx, 2, 34, 36, 10, 2);
    ctx.fill();
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${position}`, 20, 42);

    // Pin leads
    ctx.strokeStyle = '#a0a0a0';
    ctx.lineWidth = 1.5;
    [6, 16, 26, 36].forEach(px => {
      ctx.beginPath(); ctx.moveTo(px, 44); ctx.lineTo(px, 50); ctx.stroke();
    });

    if (inst.selected) drawSelectionRect(ctx, -2, -2, 44, 54);
    ctx.restore();
  }
});

/* ═══════════════════════════════════════════════════════════════
   DIP Switch Bank (8-position)
   ═══════════════════════════════════════════════════════════════ */
defComp({
  id: 'dip_switch',
  name: 'DIP Switch 8-Pos',
  category: 'Input',
  icon: '🎚️',
  desc: '8-position DIP switch bank. Multi-position toggle for hardware settings and binary input',
  width: 70,
  height: 30,
  defaultProps: { switches: 0 },
  interactive: [
    { field: 'switches', label: 'Value', min: 0, max: 255, step: 1, unit: '' },
  ],
  pins: [
    { id: '1', label: '1', type: PIN_TYPE.DIGITAL, x: 6, y: 30, side: 'bottom' },
    { id: '2', label: '2', type: PIN_TYPE.DIGITAL, x: 14, y: 30, side: 'bottom' },
    { id: '3', label: '3', type: PIN_TYPE.DIGITAL, x: 22, y: 30, side: 'bottom' },
    { id: '4', label: '4', type: PIN_TYPE.DIGITAL, x: 30, y: 30, side: 'bottom' },
    { id: '5', label: '5', type: PIN_TYPE.DIGITAL, x: 38, y: 30, side: 'bottom' },
    { id: '6', label: '6', type: PIN_TYPE.DIGITAL, x: 46, y: 30, side: 'bottom' },
    { id: '7', label: '7', type: PIN_TYPE.DIGITAL, x: 54, y: 30, side: 'bottom' },
    { id: '8', label: '8', type: PIN_TYPE.DIGITAL, x: 62, y: 30, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const switches = inst.runtimeState?.switches ?? inst.props.switches ?? 0;

    ctx.save();
    ctx.translate(x, y);

    // Body
    ctx.fillStyle = '#1a1a1a';
    roundRect(ctx, 0, 2, 70, 22, 3);
    ctx.fill();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Switches
    for (let i = 0; i < 8; i++) {
      const isOn = (switches >> i) & 1;
      const sx = 6 + i * 8;

      // Switch housing
      ctx.fillStyle = '#333';
      roundRect(ctx, sx - 2, 6, 6, 12, 1);
      ctx.fill();

      // Switch toggle
      ctx.fillStyle = isOn ? '#00cc00' : '#cc0000';
      ctx.fillRect(sx - 1, isOn ? 7 : 13, 4, 5);

      // Label
      ctx.fillStyle = '#888';
      ctx.font = '4px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${i + 1}`, sx + 1, 22);
    }

    // Binary value display
    ctx.fillStyle = '#0a0a1a';
    roundRect(ctx, 18, 24, 34, 5, 1);
    ctx.fill();
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 4px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(switches.toString(2).padStart(8, '0'), 35, 28);

    // Pin leads
    ctx.strokeStyle = '#a0a0a0';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const px = 6 + i * 8;
      ctx.beginPath(); ctx.moveTo(px, 24); ctx.lineTo(px, 30); ctx.stroke();
    }

    if (inst.selected) drawSelectionRect(ctx, -2, 0, 74, 32);
    ctx.restore();
  }
});

/* ═══════════════════════════════════════════════════════════════
   HC-05 Bluetooth Module (UART)
   ═══════════════════════════════════════════════════════════════ */
defComp({
  id: 'hc05',
  name: 'HC-05 Bluetooth',
  category: 'Sensors',
  icon: '📶',
  desc: 'HC-05 serial-to-Bluetooth transceiver module (UART). For mobile app communication',
  width: 50,
  height: 70,
  defaultProps: { connected: false, rxData: '' },
  interactive: [
    { field: 'connected', label: 'Conn', min: 0, max: 1, step: 1, unit: '' },
  ],
  pins: [
    { id: 'VCC', label: 'VCC', type: PIN_TYPE.POWER, x: 8, y: 70, side: 'bottom' },
    { id: 'GND', label: 'GND', type: PIN_TYPE.GND, x: 20, y: 70, side: 'bottom' },
    { id: 'TXD', label: 'TXD', type: PIN_TYPE.DIGITAL, x: 32, y: 70, side: 'bottom' },
    { id: 'RXD', label: 'RXD', type: PIN_TYPE.DIGITAL, x: 44, y: 70, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const connected = inst.runtimeState?.connected ?? inst.props.connected ?? false;

    ctx.save();
    ctx.translate(x, y);

    // PCB body
    ctx.fillStyle = '#0a2463';
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

/* ═══════════════════════════════════════════════════════════════
   Export all new component IDs for canvas.js registration
   ═══════════════════════════════════════════════════════════════ */
window.NEW_COMPONENT_IDS = [
  'mpu6050', 'stepper_28byj', 'neopixel',
  'ir_obstacle', 'flex_sensor', 'thermistor',
  'diode_1n4007',
  'bme280', 'vl53l0x', 'rc522', 'ir_receiver',
  'max7219', 'ili9341',
  'l298n', 'servo_continuous',
  'rotary_encoder', 'dip_switch', 'hc05'
];
