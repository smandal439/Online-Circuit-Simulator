'use strict';

/* ═══════════════════════════════════════════════════════
   Oscilloscope Probe — lightweight signal tap
   ═══════════════════════════════════════════════════════ */

defComp({
  id: 'probe',
  name: 'Oscilloscope Probe',
  category: 'Instruments',
  icon: '🔍',
  desc: 'Passive probe tap — wire tip to circuit node and out to DSO channel.',

  width: 16,
  height: 36,

  defaultProps: {},

  interactive: [],

  pins: [
    { id: 'tip', label: 'TIP', type: PIN_TYPE.SIGNAL, x: 8, y: 36, side: 'bottom' },
    { id: 'out', label: 'OUT', type: PIN_TYPE.SIGNAL, x: 8, y: 0,  side: 'top' },
  ],

  step(inst, sim) {
    const avSim = window.ArduinoSim;
    const readV = (pin) => {
      if (sim && typeof sim.getPinVoltage === 'function') return sim.getPinVoltage(inst, pin);
      if (avSim && typeof avSim.getPinVoltage === 'function') return avSim.getPinVoltage(inst, pin);
      return 0;
    };
    inst.runtimeState.voltage = readV('tip');

    // Auto-detect color by walking wires from OUT pin toward DSO
    if (!inst.runtimeState._lastColorCheck || performance.now() - inst.runtimeState._lastColorCheck > 500) {
      inst.runtimeState._lastColorCheck = performance.now();
      inst.runtimeState.color = _probeAutoColor(inst);
    }
  },

  draw(ctx, inst) {
    const { x, y } = inst;
    const col = (inst.runtimeState && inst.runtimeState.color) || '#ffffff';

    ctx.save();
    ctx.translate(x, y);

    // Probe cable (thin line from out to body top)
    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(8, 4);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Cable bundle (wider behind)
    ctx.strokeStyle = '#3a3e48';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(8, 4);
    ctx.stroke();

    // Probe body (cylindrical handle)
    const bodyGrad = ctx.createLinearGradient(2, 0, 14, 0);
    bodyGrad.addColorStop(0, '#404858');
    bodyGrad.addColorStop(0.5, '#58606e');
    bodyGrad.addColorStop(1, '#383e4c');
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(2, 4, 12, 18);
    ctx.strokeStyle = '#1a1e28';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(2, 4, 12, 18);

    // Color band on body
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(3, 10, 10, 3);
    ctx.globalAlpha = 1;

    // BNC connector nub at top of body
    ctx.fillStyle = '#6a7488';
    ctx.beginPath();
    ctx.arc(8, 4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3a3e48';
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // Inner BNC pin
    ctx.fillStyle = '#c0c8d4';
    ctx.beginPath();
    ctx.arc(8, 4, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Probe tip (pointed triangle)
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(5, 22);
    ctx.lineTo(11, 22);
    ctx.lineTo(8, 36);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1a1e28';
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // Tip highlight
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(8, 33, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Voltage readout
    const v = inst.runtimeState ? inst.runtimeState.voltage || 0 : 0;
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.9;
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(_probeFmtV(v), 8, -2);
    ctx.globalAlpha = 1;

    // Signal glow
    if (Math.abs(v) > 0.01) {
      ctx.save();
      ctx.shadowColor = col;
      ctx.shadowBlur = 8;
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.arc(8, 33, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (inst.selected && typeof drawSelectionRect === 'function') {
      drawSelectionRect(ctx, -3, -6, 22, 48);
    }

    ctx.restore();
  }
});

/* ── Helpers ── */

function _probeFmtV(v) {
  const abs = Math.abs(v);
  if (abs >= 1) return v.toFixed(2) + 'V';
  if (abs >= 0.01) return (v * 1000).toFixed(1) + 'mV';
  return '0.00V';
}

function _probeAutoColor(inst) {
  const canvas = window.CircuitCanvas;
  if (!canvas) return '#ffffff';
  const wires = canvas.wires || [];
  const components = canvas.components || [];

  for (const w of wires) {
    let nextInstId = null, nextPinId = null;
    if (w.from.instId === inst.id && w.from.pinId === 'out') {
      nextInstId = w.to.instId; nextPinId = w.to.pinId;
    } else if (w.to.instId === inst.id && w.to.pinId === 'out') {
      nextInstId = w.from.instId; nextPinId = w.from.pinId;
    }
    if (!nextInstId) continue;

    const target = components.find(c => c.id === nextInstId);
    if (!target) continue;

    if (target.type === 'dso_4ch') {
      return _probeCHColor(nextPinId);
    }
  }
  return '#ffffff';
}

function _probeCHColor(pinId) {
  return {
    'ch1_in': '#ffe600',
    'ch2_in': '#00e5ff',
    'ch3_in': '#ff3090',
    'ch4_in': '#30ff60',
  }[pinId] || '#ffffff';
}
