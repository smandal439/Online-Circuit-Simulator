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

  width: 180,
  height: 130,

  defaultProps: {
    mode: 'V_DC',
    hold: false,
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
    { id: 'probe_red',  label: 'V+',   type: PIN_TYPE.SIGNAL, x: 0, y: 30, side: 'left' },
    { id: 'probe_com',  label: 'COM',  type: PIN_TYPE.GND,    x: 0, y: 60, side: 'left' },
  ],

  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const rs = inst.runtimeState || {};
    const mode     = rs.mode     || inst.props.mode     || 'V_DC';
    const text     = rs.displayText  || '0.000';
    const unit     = rs.displayUnit  || 'V';
    const subMode  = rs.displayMode  || 'DC';
    const beep     = rs.displayBeep  || false;

    ctx.save();
    ctx.translate(x, y);

    // ── Lead wires from body to pin endpoints ──
    // Red probe lead (top pin)
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(40, 30); ctx.lineTo(0, 30); ctx.stroke();
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath(); ctx.arc(0, 30, 3.5, 0, Math.PI * 2); ctx.fill();

    // Black COM lead (bottom pin)
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(40, 60); ctx.lineTo(0, 60); ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(0, 60, 3.5, 0, Math.PI * 2); ctx.fill();

    // ── Orange rubber boot (chassis) ──
    const bootGrad = ctx.createLinearGradient(36, 0, 180, 0);
    bootGrad.addColorStop(0, '#d35400');
    bootGrad.addColorStop(0.5, '#e67e22');
    bootGrad.addColorStop(1, '#d35400');
    ctx.fillStyle = bootGrad;
    roundRect(ctx, 36, 0, 140, 128, 12);
    ctx.fill();
    ctx.strokeStyle = '#a04000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // ── Dark gray body ──
    const bodyGrad = ctx.createLinearGradient(40, 4, 172, 124);
    bodyGrad.addColorStop(0, '#3a4a5a');
    bodyGrad.addColorStop(1, '#2c3e50');
    ctx.fillStyle = bodyGrad;
    roundRect(ctx, 40, 4, 132, 120, 8);
    ctx.fill();

    // ── LCD Screen (large) ──
    ctx.fillStyle = '#8b9b87';
    roundRect(ctx, 48, 12, 116, 60, 6);
    ctx.fill();
    ctx.strokeStyle = '#6a7a66';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // LCD shadow inset
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    roundRect(ctx, 48, 12, 116, 8, 6);
    ctx.fill();

    // Mode label (top-left of LCD)
    const modeLabels = { V_DC: 'DC', V_AC: 'AC', RES: 'Ω', CONT: 'CONT' };
    ctx.fillStyle = '#1a2a1a';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(modeLabels[mode] || '', 54, 30);

    // Unit label (top-right of LCD)
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(unit, 160, 30);

    // Main value (large)
    ctx.fillStyle = '#111';
    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text, 106, 54);

    // Continuity beep indicator
    if (beep && mode === 'CONT') {
      ctx.fillStyle = '#27ae60';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BEEP', 106, 68);
    }

    // ── Label "DIGITAL MULTIMETER" ──
    ctx.fillStyle = '#7788aa';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DIGITAL MULTIMETER', 106, 90);

    // ── Probe labels on body ──
    ctx.fillStyle = '#e74c3c';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('+', 46, 35);
    ctx.fillStyle = '#aaa';
    ctx.fillText('COM', 46, 65);

    // ── Selection highlight ──
    if (inst.selected) drawSelectionRect(ctx, -4, -4, 188, 136);

    ctx.restore();
  }
});
