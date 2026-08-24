'use strict';

/* ═══════════════════════════════════════════════════════
   Digital Multimeter — Measuring Instrument
   ═══════════════════════════════════════════════════════ */

defComp({
  id: 'multimeter',
  name: 'Digital Multimeter',
  category: 'Instruments',
  icon: '🔧',
  desc: 'Digital multimeter — measures DC/AC voltage, resistance, and continuity between two probe points',

  width: 120,
  height: 90,

  defaultProps: {
    mode: 'V_DC',
    hold: false,
    displayText: '0.000',
    displayUnit: 'V',
    displayMode: 'DC',
    displayBeep: false,
  },

  interactive: [
    { field: 'mode', label: 'Mode', type: 'select', options: [
      { value: 'V_DC',  label: 'DC Voltage (V⎓)' },
      { value: 'V_AC',  label: 'AC Voltage (V~)' },
      { value: 'RES',   label: 'Resistance (Ω)' },
      { value: 'CONT',  label: 'Continuity (🔊)' },
    ]},
  ],

  pins: [
    { id: 'probe_red',  label: 'V+',   type: PIN_TYPE.SIGNAL, x: 0, y: 22, side: 'left' },
    { id: 'probe_com',  label: 'COM',  type: PIN_TYPE.GND,    x: 0, y: 44, side: 'left' },
  ],

  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const rs = inst.runtimeState || {};
    const mode     = rs.mode     || inst.props.mode     || 'V_DC';
    const hold     = rs.hold     || inst.props.hold     || false;
    const text     = rs.displayText  || inst.props.displayText  || '0.000';
    const unit     = rs.displayUnit  || inst.props.displayUnit  || 'V';
    const subMode  = rs.displayMode  || inst.props.displayMode  || 'DC';
    const beep     = rs.displayBeep || inst.props.displayBeep || false;

    ctx.save();
    ctx.translate(x, y);

    // ── Lead wires from body to pin endpoints ──
    // Red probe lead (top pin)
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(32, 22); ctx.lineTo(0, 22); ctx.stroke();
    // Red probe tip dot
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath(); ctx.arc(0, 22, 3, 0, Math.PI * 2); ctx.fill();

    // Black COM lead (bottom pin)
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(32, 44); ctx.lineTo(0, 44); ctx.stroke();
    // Black probe tip dot
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(0, 44, 3, 0, Math.PI * 2); ctx.fill();

    // ── Orange rubber boot (chassis) ──
    const bootGrad = ctx.createLinearGradient(28, 0, 120, 0);
    bootGrad.addColorStop(0, '#d35400');
    bootGrad.addColorStop(0.5, '#e67e22');
    bootGrad.addColorStop(1, '#d35400');
    ctx.fillStyle = bootGrad;
    roundRect(ctx, 28, 0, 88, 88, 10);
    ctx.fill();
    ctx.strokeStyle = '#a04000';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // ── Dark gray body ──
    const bodyGrad = ctx.createLinearGradient(32, 3, 114, 85);
    bodyGrad.addColorStop(0, '#3a4a5a');
    bodyGrad.addColorStop(1, '#2c3e50');
    ctx.fillStyle = bodyGrad;
    roundRect(ctx, 32, 3, 82, 82, 8);
    ctx.fill();

    // ── LCD Screen ──
    ctx.fillStyle = '#8b9b87';
    roundRect(ctx, 38, 8, 70, 22, 4);
    ctx.fill();
    ctx.strokeStyle = '#6a7a66';
    ctx.lineWidth = 1;
    ctx.stroke();

    // LCD shadow inset
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    roundRect(ctx, 38, 8, 70, 4, 4);
    ctx.fill();

    // Mode label (top-left of LCD)
    ctx.fillStyle = '#1a2a1a';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'left';
    const modeLabels = { V_DC: 'DC', V_AC: 'AC', RES: 'Ω', CONT: 'CONT' };
    ctx.fillText(modeLabels[mode] || '', 42, 16);

    // Hold indicator
    if (hold) {
      ctx.fillStyle = '#c0392b';
      ctx.font = 'bold 6px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('HOLD', 75, 16);
    }

    // Unit label (top-right of LCD)
    ctx.fillStyle = '#1a2a1a';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(unit, 105, 16);

    // Main value (large)
    ctx.fillStyle = '#111';
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text, 73, 27);

    // Continuity beep indicator
    if (beep && mode === 'CONT') {
      ctx.fillStyle = '#27ae60';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🔊 BEEP', 73, 40);
    }

    // ── Rotary switch / mode selector area ──
    // Switch housing
    ctx.fillStyle = '#1a252f';
    ctx.beginPath(); ctx.arc(73, 52, 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Switch knob
    const knobGrad = ctx.createRadialGradient(73, 52, 2, 73, 52, 10);
    knobGrad.addColorStop(0, '#666');
    knobGrad.addColorStop(1, '#333');
    ctx.fillStyle = knobGrad;
    ctx.beginPath(); ctx.arc(73, 52, 10, 0, Math.PI * 2); ctx.fill();

    // Mode indicator dot (rotated based on mode)
    const modeAngles = { V_DC: -Math.PI * 0.6, V_AC: -Math.PI * 0.2, RES: Math.PI * 0.2, CONT: Math.PI * 0.6 };
    const angle = modeAngles[mode] || 0;
    ctx.save();
    ctx.translate(73, 52);
    ctx.rotate(angle);
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath(); ctx.arc(0, -7, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Mode labels around switch
    ctx.fillStyle = '#8899aa';
    ctx.font = '5px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('V⎓', 55, 44);
    ctx.fillText('V~', 91, 44);
    ctx.fillText('Ω', 91, 64);
    ctx.fillText('🔊', 55, 64);

    // ── Label "DIGITAL MULTIMETER" ──
    ctx.fillStyle = '#7788aa';
    ctx.font = 'bold 5px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DIGITAL MULTIMETER', 73, 75);

    // ── Probe labels on body ──
    ctx.fillStyle = '#e74c3c';
    ctx.font = 'bold 6px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('+', 35, 25);
    ctx.fillStyle = '#aaa';
    ctx.fillText('COM', 35, 47);

    // ── Selection highlight ──
    if (inst.selected) drawSelectionRect(ctx, -4, -4, 128, 96);

    ctx.restore();
  }
});
