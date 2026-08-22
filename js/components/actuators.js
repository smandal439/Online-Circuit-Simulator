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
    { id: 'signal', label: 'SIG', type: PIN_TYPE.PWM,   x:  8, y: 50, side: 'bottom' },
    { id: 'vcc',    label: '+',   type: PIN_TYPE.POWER,  x: 25, y: 50, side: 'bottom' },
    { id: 'gnd',    label: '−',   type: PIN_TYPE.GND,    x: 42, y: 50, side: 'bottom' },
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

/* ─── DC Motor ─── */
defComp({
  id: 'dc_motor',
  name: 'DC Motor',
  category: 'Actuators',
  icon: '🌀',
  desc: 'Brushed DC motor — speed controlled by PWM on the input pin',
  width: 50,
  height: 60,
  defaultProps: { label: 'MOTOR' },
  pins: [
    { id: 'in',   label: 'IN',  type: PIN_TYPE.PWM,  x: 20, y: 60, side: 'bottom' },
    { id: 'gnd',  label: 'GND', type: PIN_TYPE.GND,  x: 34, y: 60, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const speed = inst.runtimeState && inst.runtimeState.speed !== undefined ? inst.runtimeState.speed : 0;
    const rpm = inst.runtimeState && inst.runtimeState.rpm !== undefined ? inst.runtimeState.rpm : 0;
    const t = (sim && sim.simTime) || 0;

    ctx.save();
    ctx.translate(x, y);

    // Leads
    ctx.strokeStyle = '#c8a84b';
    ctx.lineWidth = 1.5;
    [[20,60],[34,60]].forEach(([px,py]) => {
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, 52); ctx.stroke();
    });

    // Body
    const bodyGrad = ctx.createLinearGradient(2, 6, 48, 54);
    bodyGrad.addColorStop(0, '#45474b');
    bodyGrad.addColorStop(1, '#222428');
    ctx.fillStyle = bodyGrad;
    roundRect(ctx, 4, 6, 42, 46, 5);
    ctx.fill();
    ctx.strokeStyle = '#5a5d63';
    ctx.lineWidth = 1;
    ctx.stroke();

    // End cap lines
    ctx.strokeStyle = '#3a3d42';
    ctx.beginPath(); ctx.moveTo(18, 8); ctx.lineTo(18, 50); ctx.stroke();

    // Rotating shaft + fan (spins proportional to speed)
    ctx.save();
    ctx.translate(32, 26);
    ctx.rotate(t * 0.02 * speed);
    ctx.fillStyle = '#8a8e96';
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI * 2) / 3);
      roundRect(ctx, -2, -14, 4, 12, 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#555';
    ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Speed display
    ctx.fillStyle = speed > 0.02 ? '#33ffcc' : '#8a8e96';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${rpm} RPM`, 25, 48);

    if (inst.selected) drawSelectionRect(ctx, -3, 3, 56, 63);
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
    { id: 'vcc',  label: 'VCC',  type: PIN_TYPE.POWER,   x: 12, y: 50, side: 'bottom' },
    { id: 'gnd',  label: 'GND',  type: PIN_TYPE.GND,     x: 24, y: 50, side: 'bottom' },
    { id: 'sig',  label: 'IN',   type: PIN_TYPE.DIGITAL, x: 36, y: 50, side: 'bottom' },
    { id: 'com',  label: 'COM',  type: PIN_TYPE.SIGNAL,  x: 54, y: 50, side: 'bottom' },
    { id: 'no',   label: 'NO',   type: PIN_TYPE.SIGNAL,  x: 66, y: 50, side: 'bottom' },
    { id: 'nc',   label: 'NC',   type: PIN_TYPE.SIGNAL,  x: 78, y: 50, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const active = inst.runtimeState && inst.runtimeState.active;

    ctx.save();
    ctx.translate(x, y);

    // Pin leads
    ctx.strokeStyle = '#c8a84b';
    ctx.lineWidth = 1.5;
    [12,24,36,54,66,78].forEach(px => {
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
