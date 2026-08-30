'use strict';
/* components/actuators.js — Actuator component definitions */

/* ─── SERVO MOTOR ─── */
defComp({
  id: 'servo',
  name: 'Servo Motor',
  category: 'Actuators',
  icon: '⚙️',
  desc: 'RC servo motor — rotates 0 to 180 degrees based on PWM signal',
  width: 60,
  height: 50,
  defaultProps: { angle: 90, minAngle: 0, maxAngle: 180 },
  pins: [
    { id: 'signal', label: 'SIG', type: PIN_TYPE.PWM, x: 8, y: 50, side: 'bottom' },
    { id: 'vcc', label: '+', type: PIN_TYPE.POWER, x: 25, y: 50, side: 'bottom' },
    { id: 'gnd', label: '−', type: PIN_TYPE.GND, x: 42, y: 50, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const angle = inst.runtimeState && inst.runtimeState.angle !== undefined
      ? inst.runtimeState.angle : (inst.props.angle || 90);
    const rad = (angle - 90) * Math.PI / 180;

    ctx.save();
    ctx.translate(x, y);

    // Leads
    ctx.strokeStyle = '#f5c842'; // signal = yellow
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
    ctx.beginPath();
    ctx.arc(30, 22, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.arc(30, 22, 7, 0, Math.PI * 2);
    ctx.fill();

    // Servo arm
    ctx.save();
    ctx.translate(30, 22);
    ctx.rotate(rad);
    ctx.fillStyle = '#aaa';
    roundRect(ctx, -4, -20, 8, 22, 3);
    ctx.fill();
    ctx.fillStyle = '#ccc';
    ctx.beginPath();
    ctx.arc(0, -18, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Center hub
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(30, 22, 4, 0, Math.PI * 2);
    ctx.fill();

    // Angle display
    ctx.fillStyle = '#aaa';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(angle) + '°', 30, 40);

    if (inst.selected) drawSelectionRect(ctx, -3, 2, 66, 55);
    ctx.restore();
  }
});




/* ─── Electromagnetic Relay ─── */
defComp({
  id: 'relay',
  name: 'Relay Module',
  category: 'Actuators',
  icon: '⚡',
  desc: 'Electromagnetic relay — a digital signal switches COM between NO and NC contacts',
  width: 90,
  height: 50,
  defaultProps: { label: 'RELAY' },
  pins: [
    { id: 'vcc', label: 'VCC', type: PIN_TYPE.POWER, x: 12, y: 50, side: 'bottom' },
    { id: 'gnd', label: 'GND', type: PIN_TYPE.GND, x: 24, y: 50, side: 'bottom' },
    { id: 'sig', label: 'IN', type: PIN_TYPE.DIGITAL, x: 36, y: 50, side: 'bottom' },
    { id: 'com', label: 'COM', type: PIN_TYPE.SIGNAL, x: 54, y: 50, side: 'bottom' },
    { id: 'no', label: 'NO', type: PIN_TYPE.SIGNAL, x: 66, y: 50, side: 'bottom' },
    { id: 'nc', label: 'NC', type: PIN_TYPE.SIGNAL, x: 78, y: 50, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const active = inst.runtimeState && inst.runtimeState.active;

    ctx.save();
    ctx.translate(x, y);

    // Pin leads
    ctx.strokeStyle = '#c8a84b';
    ctx.lineWidth = 1.5;
    [12, 24, 36, 54, 66, 78].forEach(px => {
      ctx.beginPath(); ctx.moveTo(px, 44); ctx.lineTo(px, 50); ctx.stroke();
    });

    // Body
    const bodyGrad = ctx.createLinearGradient(0, 4, 90, 46);
    bodyGrad.addColorStop(0, '#3d4a5a');
    bodyGrad.addColorStop(1, '#1c2530');
    ctx.fillStyle = bodyGrad;
    roundRect(ctx, 2, 4, 86, 40, 5);
    ctx.fill();
    ctx.strokeStyle = '#55677a';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Coil (left) — inductor loops
    ctx.strokeStyle = '#ffd24a';
    ctx.lineWidth = 2;
    const coilY = 22;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const cx = 14 + i * 5;
      ctx.moveTo(cx, coilY + 3);
      ctx.arc(cx, coilY, 3, 0, Math.PI);
    }
    ctx.stroke();

    // Signal LED indicator
    ctx.fillStyle = active ? '#33ff66' : '#335533';
    ctx.beginPath(); ctx.arc(26, 22, 3.5, 0, Math.PI * 2); ctx.fill();
    if (active) { ctx.shadowColor = '#33ff66'; ctx.shadowBlur = 6; }
    ctx.beginPath(); ctx.arc(26, 22, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Contacts: COM terminal at right, lever swings between NO / NC
    ctx.fillStyle = '#999';
    ctx.fillRect(48, 20, 4, 4);   // COM fixed contact
    ctx.fillRect(active ? 60 : 72, 12, 4, 4);  // NO (top) or NC (bottom) contact
    // Moving lever
    ctx.strokeStyle = active ? '#33ff66' : '#cc3333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, 22);
    ctx.lineTo(active ? 62 : 74, active ? 14 : 30);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#aab4c0';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(active ? 'ON' : 'OFF', 72, 42);
    ctx.fillText('RELAY', 40, 10);

    if (inst.selected) drawSelectionRect(ctx, -3, 2, 96, 55);
    ctx.restore();
  }
});


// defComp({
//   id: 'dc_motor',
//   name: 'DC Motor',
//   category: 'Actuators',
//   icon: '🌀',
//   desc: 'Brushed DC motor with dynamic rotation, direction support, and metallic rendering',
//   width: 50,
//   height: 60,
//   defaultProps: { label: 'MOTOR' },
//   pins: [
//     { id: 'in',  label: 'IN',  type: PIN_TYPE.PWM, x: 18, y: 60, side: 'bottom' },
//     { id: 'gnd', label: 'GND', type: PIN_TYPE.GND, x: 32, y: 60, side: 'bottom' },
//   ],
//   draw(ctx, inst, sim) {
//     const { x, y } = inst;
//     const speed = inst.runtimeState?.speed ?? 0; // Can be positive or negative for direction
//     const rpm = inst.runtimeState?.rpm ?? Math.round(Math.abs(speed) * 3000);
//     const t = sim?.simTime ?? 0;

//     ctx.save();
//     ctx.translate(x, y);

//     // --- 1. Terminal Leads & Brass Tabs ---
//     ctx.lineWidth = 2;
//     // IN Pin (Brass/Gold)
//     ctx.strokeStyle = '#d4af37';
//     ctx.beginPath(); ctx.moveTo(18, 60); ctx.lineTo(18, 50); ctx.stroke();
//     // GND Pin (Silver/Lead)
//     ctx.strokeStyle = '#a0a5aa';
//     ctx.beginPath(); ctx.moveTo(32, 60); ctx.lineTo(32, 50); ctx.stroke();

//     // Red/Black polarity indicators on end-cap
//     ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.arc(18, 50, 2, 0, Math.PI * 2); ctx.fill();
//     ctx.fillStyle = '#2c3e50'; ctx.beginPath(); ctx.arc(32, 50, 2, 0, Math.PI * 2); ctx.fill();

//     // --- 2. Rear Plastic End-Cap ---
//     const capGrad = ctx.createLinearGradient(6, 0, 44, 0);
//     capGrad.addColorStop(0, '#1a1b1e');
//     capGrad.addColorStop(0.5, '#34373d');
//     capGrad.addColorStop(1, '#1a1b1e');
//     ctx.fillStyle = capGrad;
//     roundRect(ctx, 6, 44, 38, 8, 3);
//     ctx.fill();

//     // --- 3. Metallic Main Body (Steel Can) ---
//     const bodyGrad = ctx.createLinearGradient(6, 0, 44, 0);
//     bodyGrad.addColorStop(0.0, '#2e3136');
//     bodyGrad.addColorStop(0.2, '#8e939d');
//     bodyGrad.addColorStop(0.4, '#e8ecf1'); // High specular reflection
//     bodyGrad.addColorStop(0.7, '#63676e');
//     bodyGrad.addColorStop(1.0, '#202225');
    
//     ctx.fillStyle = bodyGrad;
//     roundRect(ctx, 6, 12, 38, 34, 4);
//     ctx.fill();

//     // Body outline & bevel shadow
//     ctx.strokeStyle = '#1d1f22';
//     ctx.lineWidth = 1;
//     ctx.stroke();

//     // Casing Vent Holes/Slots
//     ctx.fillStyle = '#18191c';
//     roundRect(ctx, 10, 20, 4, 18, 1); ctx.fill();
//     roundRect(ctx, 36, 20, 4, 18, 1); ctx.fill();

//     // --- 4. Front Bearing Collar ---
//     const collarGrad = ctx.createLinearGradient(18, 0, 32, 0);
//     collarGrad.addColorStop(0, '#4a4d52');
//     collarGrad.addColorStop(0.5, '#bdc3c7');
//     collarGrad.addColorStop(1, '#3a3d42');
//     ctx.fillStyle = collarGrad;
//     roundRect(ctx, 19, 7, 12, 6, 2);
//     ctx.fill();

//     // --- 5. Rotating Steel Shaft & Fan Blades ---
//     ctx.save();
//     ctx.translate(25, 24);
    
//     // Continuous rotation angle based on simulation time and speed/direction
//     const angle = t * 0.05 * speed;
//     ctx.rotate(angle);

//     const absSpeed = Math.abs(speed);
//     const bladeOpacity = Math.max(0.3, 1 - absSpeed * 0.4); // Motion blur simulation

//     // Fan Blades / Rotor Indicator
//     ctx.fillStyle = `rgba(52, 152, 219, ${bladeOpacity})`;
//     ctx.strokeStyle = `rgba(41, 128, 185, ${bladeOpacity})`;
//     ctx.lineWidth = 1;

//     for (let i = 0; i < 3; i++) {
//       ctx.save();
//       ctx.rotate((i * Math.PI * 2) / 3);
      
//       // Teardrop-shaped fan blade
//       ctx.beginPath();
//       ctx.moveTo(0, 0);
//       ctx.bezierCurveTo(-5, -8, -6, -16, 0, -17);
//       ctx.bezierCurveTo(6, -16, 5, -8, 0, 0);
//       ctx.fill();
//       ctx.stroke();
      
//       ctx.restore();
//     }

//     // High-speed motion blur arc effect
//     if (absSpeed > 0.1) {
//       ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(0.6, absSpeed * 0.5)})`;
//       ctx.lineWidth = 1.5;
//       ctx.beginPath();
//       ctx.arc(0, 0, 14, 0, Math.PI * 1.5 * Math.sign(speed));
//       ctx.stroke();
//     }

//     // Shaft Center Hub (Brass/Steel core)
//     const shaftGrad = ctx.createRadialGradient(-1, -1, 0, 0, 0, 5);
//     shaftGrad.addColorStop(0, '#ffffff');
//     shaftGrad.addColorStop(0.5, '#7f8c8d');
//     shaftGrad.addColorStop(1, '#2c3e50');
    
//     ctx.fillStyle = shaftGrad;
//     ctx.beginPath();
//     ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
//     ctx.fill();

//     // Flat D-shaft marker line
//     ctx.strokeStyle = '#111';
//     ctx.lineWidth = 1.2;
//     ctx.beginPath();
//     ctx.moveTo(-3, -1);
//     ctx.lineTo(3, -1);
//     ctx.stroke();

//     ctx.restore();

//     // --- 6. RPM & Direction Status Display ---
//     const isActive = absSpeed > 0.01;
//     ctx.fillStyle = isActive ? '#00ffcc' : '#7f8c8d';
//     ctx.font = '600 7px "Courier New", monospace';
//     ctx.textAlign = 'center';
    
//     const dirSymbol = speed > 0.01 ? '↻ ' : speed < -0.01 ? '↺ ' : '';
//     ctx.fillText(`${dirSymbol}${rpm} RPM`, 25, 42);

//     // Selection highlight overlay
//     if (inst.selected && typeof drawSelectionRect === 'function') {
//       drawSelectionRect(ctx, 3, 3, 44, 59);
//     }

//     ctx.restore();
//   }
// });

// defComp({
//   id: 'dc_motor',
//   name: 'DC Motor',
//   category: 'Actuators',
//   icon: '🌀',
//   desc: 'Brushed DC motor (Front View) — speed controlled by PWM',
//   width: 50,
//   height: 60,
//   defaultProps: { label: 'MOTOR' },
//   pins: [
//     { id: 'in',  label: 'IN',  type: PIN_TYPE.PWM, x: 18, y: 60, side: 'bottom' },
//     { id: 'gnd', label: 'GND', type: PIN_TYPE.GND, x: 32, y: 60, side: 'bottom' },
//   ],
//   draw(ctx, inst, sim) {
//     const { x, y } = inst;
//     const speed = inst.runtimeState?.speed ?? 0;
//     const rpm = inst.runtimeState?.rpm ?? Math.round(Math.abs(speed) * 3000);
//     const t = sim?.simTime ?? 0;
//     const cx = 25, cy = 25; // Motor front center

//     ctx.save();
//     ctx.translate(x, y);

//     // --- 1. Rear Terminal Leads (Extending down to pins) ---
//     ctx.lineWidth = 2;
//     // IN Pin (Brass lead)
//     ctx.strokeStyle = '#d4af37';
//     ctx.beginPath(); ctx.moveTo(18, 44); ctx.lineTo(18, 60); ctx.stroke();
//     // GND Pin (Silver lead)
//     ctx.strokeStyle = '#a0a5aa';
//     ctx.beginPath(); ctx.moveTo(32, 44); ctx.lineTo(32, 60); ctx.stroke();

//     // Solder tabs at rear of casing
//     ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.arc(18, 44, 3, 0, Math.PI * 2); ctx.fill(); // (+) Red
//     ctx.fillStyle = '#2c3e50'; ctx.beginPath(); ctx.arc(32, 44, 3, 0, Math.PI * 2); ctx.fill(); // (-) Black

//     // --- 2. Outer Motor Casing (Front Face Projection) ---
//     // Outer drop shadow
//     ctx.fillStyle = 'rgba(0,0,0,0.25)';
//     ctx.beginPath(); ctx.arc(cx, cy + 2, 21, 0, Math.PI * 2); ctx.fill();

//     // Metallic Can Body (Cylindrical Front Face)
//     const casingGrad = ctx.createRadialGradient(cx - 6, cy - 6, 2, cx, cy, 21);
//     casingGrad.addColorStop(0.0, '#ffffff');
//     casingGrad.addColorStop(0.3, '#bcc1c9');
//     casingGrad.addColorStop(0.7, '#676b73');
//     casingGrad.addColorStop(1.0, '#2b2d31');

//     ctx.fillStyle = casingGrad;
//     ctx.beginPath(); ctx.arc(cx, cy, 21, 0, Math.PI * 2); ctx.fill();
//     ctx.strokeStyle = '#1d1f22';
//     ctx.lineWidth = 1;
//     ctx.stroke();

//     // Front Face Stamped Ring
//     ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
//     ctx.lineWidth = 1;
//     ctx.beginPath(); ctx.arc(cx, cy, 18.5, 0, Math.PI * 2); ctx.stroke();

//     // --- 3. Front Mounting Holes & Vent Slots ---
//     ctx.fillStyle = '#18191c';
//     // Left & Right Screw Mounting Holes
//     ctx.beginPath(); ctx.arc(14, cy, 2, 0, Math.PI * 2); ctx.fill();
//     ctx.beginPath(); ctx.arc(36, cy, 2, 0, Math.PI * 2); ctx.fill();

//     // Top & Bottom Stamped Vent Slits
//     roundRect(ctx, 21, 8, 8, 2, 1); ctx.fill();
//     roundRect(ctx, 21, 40, 8, 2, 1); ctx.fill();

//     // --- 4. Central Raised Bearing Hub ---
//     const hubGrad = ctx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, 7);
//     hubGrad.addColorStop(0, '#f0f3f7');
//     hubGrad.addColorStop(0.5, '#959a9e');
//     hubGrad.addColorStop(1, '#3a3d42');

//     ctx.fillStyle = hubGrad;
//     ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill();
//     ctx.strokeStyle = '#222';
//     ctx.lineWidth = 0.8;
//     ctx.stroke();

//     // Brass Bushing Inner Ring
//     ctx.strokeStyle = '#d4af37';
//     ctx.lineWidth = 1;
//     ctx.beginPath(); ctx.arc(cx, cy, 4.5, 0, Math.PI * 2); ctx.stroke();

//     // --- 5. Front-Mounted Shaft & Fan Blade Assembly ---
//     ctx.save();
//     ctx.translate(cx, cy);

//     const absSpeed = Math.abs(speed);
//     const angle = t * 0.05 * speed;
//     ctx.rotate(angle);

//     // Dynamic motion blur opacity
//     const opacity = Math.max(0.35, 1 - absSpeed * 0.45);

//     // 3-Blade Front Fan
//     ctx.fillStyle = `rgba(52, 152, 219, ${opacity})`;
//     ctx.strokeStyle = `rgba(41, 128, 185, ${opacity})`;
//     ctx.lineWidth = 1;

//     for (let i = 0; i < 3; i++) {
//       ctx.save();
//       ctx.rotate((i * Math.PI * 2) / 3);
      
//       ctx.beginPath();
//       ctx.moveTo(0, 0);
//       ctx.bezierCurveTo(-6, -6, -7, -15, 0, -16.5);
//       ctx.bezierCurveTo(7, -15, 6, -6, 0, 0);
//       ctx.fill();
//       ctx.stroke();
      
//       ctx.restore();
//     }

//     // High-speed arc blur trace
//     if (absSpeed > 0.1) {
//       ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(0.65, absSpeed * 0.5)})`;
//       ctx.lineWidth = 2;
//       ctx.beginPath();
//       ctx.arc(0, 0, 13, 0, Math.PI * 1.6 * Math.sign(speed));
//       ctx.stroke();
//     }

//     // D-Shaft Center (Steel tip)
//     const shaftGrad = ctx.createRadialGradient(-1, -1, 0, 0, 0, 3.5);
//     shaftGrad.addColorStop(0, '#ffffff');
//     shaftGrad.addColorStop(0.7, '#7f8c8d');
//     shaftGrad.addColorStop(1, '#2c3e50');

//     ctx.fillStyle = shaftGrad;
//     ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2); ctx.fill();

//     // Flat D-shaft marker line
//     ctx.strokeStyle = '#1a1a1a';
//     ctx.lineWidth = 1;
//     ctx.beginPath(); ctx.moveTo(-2.5, -1); ctx.lineTo(2.5, -1); ctx.stroke();

//     ctx.restore();

//     // --- 6. RPM & Status Display ---
//     const isActive = absSpeed > 0.01;
//     ctx.fillStyle = isActive ? '#00ffcc' : '#8a8e96';
//     ctx.font = '600 7px "Courier New", monospace';
//     ctx.textAlign = 'center';

//     const dirSymbol = speed > 0.01 ? '↻ ' : speed < -0.01 ? '↺ ' : '';
//     ctx.fillText(`${dirSymbol}${rpm} RPM`, cx, 57);

//     if (inst.selected && typeof drawSelectionRect === 'function') {
//       drawSelectionRect(ctx, 2, 2, 46, 58);
//     }

//     ctx.restore();
//   }
// });


// defComp({
//   id: 'dc_motor',
//   name: 'DC Motor',
//   category: 'Actuators',
//   icon: '🌀',
//   desc: 'Brushed DC motor in full front view — speed & direction controlled by PWM',
//   width: 50,
//   height: 60,
//   defaultProps: { label: 'MOTOR' },
//   pins: [
//     { id: 'in',  label: 'IN',  type: PIN_TYPE.PWM, x: 18, y: 60, side: 'bottom' },
//     { id: 'gnd', label: 'GND', type: PIN_TYPE.GND, x: 32, y: 60, side: 'bottom' },
//   ],
//   draw(ctx, inst, sim) {
//     const { x, y } = inst;
//     const speed = inst.runtimeState?.speed ?? 0;
//     const rpm = inst.runtimeState?.rpm ?? Math.round(Math.abs(speed) * 3000);
//     const t = sim?.simTime ?? 0;

//     ctx.save();
//     ctx.translate(x, y);

//     // --- 1. Bottom Wire Leads & Polarity Pins ---
//     ctx.lineWidth = 2;
//     ctx.strokeStyle = '#d4af37'; // IN pin (Brass)
//     ctx.beginPath(); ctx.moveTo(18, 60); ctx.lineTo(18, 44); ctx.stroke();
//     ctx.strokeStyle = '#a0a5aa'; // GND pin (Silver)
//     ctx.beginPath(); ctx.moveTo(32, 60); ctx.lineTo(32, 44); ctx.stroke();

//     // Solder tabs at bottom of casing
//     ctx.fillStyle = '#c8a84b'; ctx.fillRect(15, 42, 6, 3);
//     ctx.fillStyle = '#7f8c8d'; ctx.fillRect(29, 42, 6, 3);

//     // Polarity indicators
//     ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.arc(18, 40, 1.8, 0, Math.PI * 2); ctx.fill();
//     ctx.fillStyle = '#2c3e50'; ctx.beginPath(); ctx.arc(32, 40, 1.8, 0, Math.PI * 2); ctx.fill();

//     // --- 2. Front Metallic Motor Body (Head-on Face Plate) ---
//     const bodyGrad = ctx.createRadialGradient(25, 25, 4, 25, 25, 22);
//     bodyGrad.addColorStop(0.0, '#e2e7ec');
//     bodyGrad.addColorStop(0.55, '#959da6');
//     bodyGrad.addColorStop(0.85, '#484c52');
//     bodyGrad.addColorStop(1.0, '#25272a');

//     ctx.fillStyle = bodyGrad;
//     // Classic 130 DC Motor front-face rounded rectangle contour
//     roundRect(ctx, 6, 6, 38, 38, 11);
//     ctx.fill();
//     ctx.strokeStyle = '#1d1f22';
//     ctx.lineWidth = 1.2;
//     ctx.stroke();

//     // Inner bevel highlight ring
//     ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
//     ctx.lineWidth = 1;
//     roundRect(ctx, 8, 8, 34, 34, 9);
//     ctx.stroke();

//     // --- 3. Front Face Details (Screw Mount Holes) ---
//     ctx.fillStyle = '#1c1e21';
//     ctx.beginPath(); ctx.arc(14, 25, 2.2, 0, Math.PI * 2); ctx.fill();
//     ctx.beginPath(); ctx.arc(36, 25, 2.2, 0, Math.PI * 2); ctx.fill();

//     // --- 4. Central Brass Bearing Bush Collar ---
//     const bushGrad = ctx.createRadialGradient(24, 24, 0, 25, 25, 7);
//     bushGrad.addColorStop(0, '#ffe89c');
//     bushGrad.addColorStop(0.7, '#c59b27');
//     bushGrad.addColorStop(1, '#574108');

//     ctx.fillStyle = bushGrad;
//     ctx.beginPath();
//     ctx.arc(25, 25, 6.5, 0, Math.PI * 2);
//     ctx.fill();
//     ctx.strokeStyle = '#3a2b05';
//     ctx.lineWidth = 0.8;
//     ctx.stroke();

//     // --- 5. Front Shaft & Rotating Fan Blade Assembly ---
//     ctx.save();
//     ctx.translate(25, 25); // Concentric with front bearing bush

//     const angle = t * 0.05 * speed;
//     ctx.rotate(angle);

//     const absSpeed = Math.abs(speed);
//     const bladeOpacity = Math.max(0.35, 1 - absSpeed * 0.4);

//     // Front-mounted Fan Blades
//     ctx.fillStyle = `rgba(52, 152, 219, ${bladeOpacity})`;
//     ctx.strokeStyle = `rgba(41, 128, 185, ${bladeOpacity})`;
//     ctx.lineWidth = 1;

//     for (let i = 0; i < 3; i++) {
//       ctx.save();
//       ctx.rotate((i * Math.PI * 2) / 3);

//       ctx.beginPath();
//       ctx.moveTo(0, 0);
//       ctx.bezierCurveTo(-5, -8, -6, -16, 0, -17);
//       ctx.bezierCurveTo(6, -16, 5, -8, 0, 0);
//       ctx.fill();
//       ctx.stroke();

//       ctx.restore();
//     }

//     // High-speed rotation arc overlay
//     if (absSpeed > 0.1) {
//       ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(0.65, absSpeed * 0.5)})`;
//       ctx.lineWidth = 1.5;
//       ctx.beginPath();
//       ctx.arc(0, 0, 14, 0, Math.PI * 1.5 * Math.sign(speed));
//       ctx.stroke();
//     }

//     // Front Steel D-Shaft Hub
//     const shaftGrad = ctx.createRadialGradient(-1, -1, 0, 0, 0, 4);
//     shaftGrad.addColorStop(0, '#ffffff');
//     shaftGrad.addColorStop(0.6, '#95a5a6');
//     shaftGrad.addColorStop(1, '#2c3e50');

//     ctx.fillStyle = shaftGrad;
//     ctx.beginPath();
//     ctx.arc(0, 0, 4, 0, Math.PI * 2);
//     ctx.fill();

//     // Shaft D-cut profile line
//     ctx.strokeStyle = '#1a252f';
//     ctx.lineWidth = 1.2;
//     ctx.beginPath();
//     ctx.moveTo(-2.5, -1);
//     ctx.lineTo(2.5, -1);
//     ctx.stroke();

//     ctx.restore();

//     // --- 6. Status Text (RPM & Direction) ---
//     const isActive = absSpeed > 0.01;
//     ctx.fillStyle = isActive ? '#00ffcc' : '#95a5a6';
//     ctx.font = '600 7px "Courier New", monospace';
//     ctx.textAlign = 'center';

//     const dirSymbol = speed > 0.01 ? '↻ ' : speed < -0.01 ? '↺ ' : '';
//     ctx.fillText(`${dirSymbol}${rpm} RPM`, 25, 57);

//     // Selection highlight frame
//     if (inst.selected && typeof drawSelectionRect === 'function') {
//       drawSelectionRect(ctx, 3, 3, 44, 57);
//     }

//     ctx.restore();
//   }
// });


defComp({
  id: 'dc_motor',
  name: 'DC Motor',
  category: 'Actuators',
  icon: '🌀',
  desc: 'Brushed DC motor (Enlarged Front View) — speed controlled by PWM',
  width: 80,
  height: 100,
  defaultProps: { label: 'MOTOR' },
  pins: [
    { id: 'in',  label: 'IN',  type: PIN_TYPE.PWM, x: 30, y: 100, side: 'bottom' },
    { id: 'gnd', label: 'GND', type: PIN_TYPE.GND, x: 50, y: 100, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const speed = inst.runtimeState?.speed ?? 0;
    const rpm = inst.runtimeState?.rpm ?? Math.round(Math.abs(speed) * 3000);
    const t = sim?.simTime ?? 0;
    const cx = 40, cy = 40; // Center of front casing

    ctx.save();
    ctx.translate(x, y);

    // --- 1. Rear Terminal Leads & Solder Tabs ---
    ctx.lineWidth = 3;
    // IN Pin (Brass Lead)
    ctx.strokeStyle = '#d4af37';
    ctx.beginPath(); ctx.moveTo(30, 68); ctx.lineTo(30, 100); ctx.stroke();
    // GND Pin (Silver Lead)
    ctx.strokeStyle = '#a0a5aa';
    ctx.beginPath(); ctx.moveTo(50, 68); ctx.lineTo(50, 100); ctx.stroke();

    // Red (+) and Black (-) Terminal Solder Points
    ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.arc(30, 68, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2c3e50'; ctx.beginPath(); ctx.arc(50, 68, 4.5, 0, Math.PI * 2); ctx.fill();

    // --- 2. Outer Metallic Motor Body ---
    // Casing Drop Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.arc(cx, cy + 3, 34, 0, Math.PI * 2); ctx.fill();

    // Metallic Can Body
    const casingGrad = ctx.createRadialGradient(cx - 10, cy - 10, 3, cx, cy, 34);
    casingGrad.addColorStop(0.0, '#ffffff');
    casingGrad.addColorStop(0.3, '#bcc1c9');
    casingGrad.addColorStop(0.7, '#676b73');
    casingGrad.addColorStop(1.0, '#2b2d31');

    ctx.fillStyle = casingGrad;
    ctx.beginPath(); ctx.arc(cx, cy, 34, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1d1f22';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Front Face Stamped Ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2); ctx.stroke();

    // --- 3. Mounting Holes & Heat Vents ---
    ctx.fillStyle = '#18191c';
    // Left & Right Screw Mounts
    ctx.beginPath(); ctx.arc(22, cy, 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(58, cy, 3.2, 0, Math.PI * 2); ctx.fill();

    // Stamped Air Vent Slits
    roundRect(ctx, 33, 13, 14, 3.5, 1.5); ctx.fill();
    roundRect(ctx, 33, 63.5, 14, 3.5, 1.5); ctx.fill();

    // --- 4. Central Raised Bearing Hub ---
    const hubGrad = ctx.createRadialGradient(cx - 3, cy - 3, 2, cx, cy, 11);
    hubGrad.addColorStop(0, '#f0f3f7');
    hubGrad.addColorStop(0.5, '#959a9e');
    hubGrad.addColorStop(1, '#3a3d42');

    ctx.fillStyle = hubGrad;
    ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Brass Bushing Ring
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, 7.5, 0, Math.PI * 2); ctx.stroke();

    // --- 5. Front Fan & Rotor Shaft ---
    ctx.save();
    ctx.translate(cx, cy);

    const absSpeed = Math.abs(speed);
    const angle = t * 0.05 * speed;
    ctx.rotate(angle);

    const opacity = Math.max(0.35, 1 - absSpeed * 0.45);

    // 3-Blade Front Fan
    ctx.fillStyle = `rgba(52, 152, 219, ${opacity})`;
    ctx.strokeStyle = `rgba(41, 128, 185, ${opacity})`;
    ctx.lineWidth = 1.5;

    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI * 2) / 3);
      
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-10, -10, -11, -25, 0, -27);
      ctx.bezierCurveTo(11, -25, 10, -10, 0, 0);
      ctx.fill();
      ctx.stroke();
      
      ctx.restore();
    }

    // High-Speed Motion Blur Arc
    if (absSpeed > 0.1) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(0.65, absSpeed * 0.5)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 21, 0, Math.PI * 1.6 * Math.sign(speed));
      ctx.stroke();
    }

    // Steel Shaft Tip (D-Profile)
    const shaftGrad = ctx.createRadialGradient(-1.5, -1.5, 0, 0, 0, 5.5);
    shaftGrad.addColorStop(0, '#ffffff');
    shaftGrad.addColorStop(0.7, '#7f8c8d');
    shaftGrad.addColorStop(1, '#2c3e50');

    ctx.fillStyle = shaftGrad;
    ctx.beginPath(); ctx.arc(0, 0, 5.5, 0, Math.PI * 2); ctx.fill();

    // D-Shaft Cutout Line
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-4, -1.5); ctx.lineTo(4, -1.5); ctx.stroke();

    ctx.restore();

    // --- 6. RPM & Readout Text ---
    const isActive = absSpeed > 0.01;
    ctx.fillStyle = isActive ? '#00ffcc' : '#8a8e96';
    ctx.font = '600 10px "Courier New", monospace';
    ctx.textAlign = 'center';

    const dirSymbol = speed > 0.01 ? '↻ ' : speed < -0.01 ? '↺ ' : '';
    ctx.fillText(`${dirSymbol}${rpm} RPM`, cx, 94);

    if (inst.selected && typeof drawSelectionRect === 'function') {
      drawSelectionRect(ctx, 3, 3, 74, 95);
    }

    ctx.restore();
  }
});
/* -------------- 28BYJ-48 Stepper Motor + ULN2003 Driver (Realistic Design) ------------------ */
defComp({
  id: 'stepper_28byj',
  name: '28BYJ-48 Stepper',
  category: 'Actuators',
  icon: 'âš™ï¸',
  desc: '5V 4-phase unipolar stepper motor with ULN2003 driver (2048 steps/rev, 5.625Â°/step)',
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
    ctx.fillText(`${Math.round(((angle % 360) + 360) % 360)}Â°`, 50, 48);

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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   L298N â€” Dual H-Bridge Motor Driver
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
defComp({
  id: 'l298n',
  name: 'L298N Motor Driver',
  category: 'Actuators',
  icon: 'ðŸ”Œ',
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

    // Status LEDs â€” green when motor runs forward, red when reverse, dim when stopped
    const mA = inst.runtimeState?.motorA ?? 0;
    const mB = inst.runtimeState?.motorB ?? 0;
    // Motor A LED
    ctx.fillStyle = mA > 0 ? '#00ff00' : mA < 0 ? '#ff4444' : '#333';
    if (mA !== 0) { ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 4; }
    ctx.beginPath(); ctx.arc(10, 50, 2, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // Motor B LED
    ctx.fillStyle = mB > 0 ? '#00ff00' : mB < 0 ? '#ff4444' : '#333';
    if (mB !== 0) { ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 4; }
    ctx.beginPath(); ctx.arc(20, 50, 2, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Labels
    ctx.fillStyle = '#aaa';
    ctx.font = 'bold 4px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MOTOR A', 22, 60);
    ctx.fillText('MOTOR B', 78, 60);
    ctx.fillStyle = '#0f0';
    ctx.font = 'bold 3.5px monospace';
    const aPct = Math.round(Math.abs(mA) * 100);
    const bPct = Math.round(Math.abs(mB) * 100);
    ctx.fillText(mA !== 0 ? `${aPct}% ${mA > 0 ? 'FWD' : 'REV'}` : 'STOP', 22, 66);
    ctx.fillText(mB !== 0 ? `${bPct}% ${mB > 0 ? 'FWD' : 'REV'}` : 'STOP', 78, 66);

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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   Continuous Rotation Servo
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
defComp({
  id: 'servo_continuous',
  name: 'Cont. Rotation Servo',
  category: 'Actuators',
  icon: 'âš™ï¸',
  desc: 'Continuous rotation servo motor. Variable speed control in both directions (not 0-180Â° positioning)',
  width: 60,
  height: 50,
  defaultProps: { speed: 0 },
  // interactive: [
  //   { field: 'speed', label: 'Speed', min: -100, max: 100, step: 1, unit: '%' },
  // ],
  pins: [
    { id: 'signal', label: 'SIG', type: PIN_TYPE.PWM, x: 8, y: 50, side: 'bottom' },
    { id: 'vcc', label: '+', type: PIN_TYPE.POWER, x: 25, y: 50, side: 'bottom' },
    { id: 'gnd', label: 'âˆ’', type: PIN_TYPE.GND, x: 42, y: 50, side: 'bottom' },
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
