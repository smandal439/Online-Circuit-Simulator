'use strict';

/* ═══════════════════════════════════════════════════════
   Dedicated Channel Probes — virtual connection to
   Oscilloscope (CH1-CH2) and DSO (CH1-CH4)
   ═══════════════════════════════════════════════════════ */

const PROBE_CHANNEL_COLORS = {
  osc_ch1: '#73ff00',  // oscilloscope CH1 green
  osc_ch2: '#ff9800',  // oscilloscope CH2 orange
  dso_ch1: '#ffe600',  // DSO CH1 yellow
  dso_ch2: '#00e5ff',  // DSO CH2 cyan
  dso_ch3: '#ff3090',  // DSO CH3 magenta
  dso_ch4: '#30ff60',  // DSO CH4 green
  la_ch1: '#00e5ff',   // LA CH1 cyan
  la_ch2: '#ff9800',   // LA CH2 orange
  la_ch3: '#4caf50',   // LA CH3 green
  la_ch4: '#ff5722',   // LA CH4 red-orange
  la_ch5: '#ab47bc',   // LA CH5 purple
  la_ch6: '#ffee33',   // LA CH6 yellow
  la_ch7: '#e91e63',   // LA CH7 pink
  la_ch8: '#76ff03',   // LA CH8 lime
};

const PROBE_CHANNEL_LABELS = {
  osc_ch1: 'OSC CH1',
  osc_ch2: 'OSC CH2',
  dso_ch1: 'DSO CH1',
  dso_ch2: 'DSO CH2',
  dso_ch3: 'DSO CH3',
  dso_ch4: 'DSO CH4',
};

function _defProbe(id, label) {
  const col = PROBE_CHANNEL_COLORS[id];
  defComp({
    id: id,
    name: label,
    category: 'Instruments',
    icon: '🔍',
    desc: 'Place tip on a circuit pin to probe its signal — auto-routed to ' + label,
    width: 16,
    height: 36,
    defaultProps: {},
    interactive: [],
    pins: [
      { id: 'tip', label: 'TIP', type: PIN_TYPE.SIGNAL, x: 8, y: 36, side: 'bottom' },
    ],
    step(inst, sim) {
      const avSim = window.ArduinoSim;
      const readV = (pin) => {
        if (sim && typeof sim.getPinVoltage === 'function') return sim.getPinVoltage(inst, pin);
        if (avSim && typeof avSim.getPinVoltage === 'function') return avSim.getPinVoltage(inst, pin);
        return 0;
      };
      inst.runtimeState.voltage = readV('tip');
      inst.runtimeState.color = col;
      inst.runtimeState.label = label;
    },
    draw(ctx, inst) {
      _drawProbe(ctx, inst, col, label);
    }
  });
}

_defProbe('osc_probe_ch1', 'OSC CH1');
_defProbe('osc_probe_ch2', 'OSC CH2');
_defProbe('dso_probe_ch1', 'DSO CH1');
_defProbe('dso_probe_ch2', 'DSO CH2');
_defProbe('dso_probe_ch3', 'DSO CH3');
_defProbe('dso_probe_ch4', 'DSO CH4');

/* ── Logic Analyzer Probes (8 channels) ── */
_defProbe('la_probe_ch1', 'LA CH1');
_defProbe('la_probe_ch2', 'LA CH2');
_defProbe('la_probe_ch3', 'LA CH3');
_defProbe('la_probe_ch4', 'LA CH4');
_defProbe('la_probe_ch5', 'LA CH5');
_defProbe('la_probe_ch6', 'LA CH6');
_defProbe('la_probe_ch7', 'LA CH7');
_defProbe('la_probe_ch8', 'LA CH8');

/* ── Shared probe drawing ── */
function _drawProbe(ctx, inst, col, label) {
  const { x, y } = inst;
  ctx.save();
  ctx.translate(x, y);

  // Cable stub going up
  ctx.strokeStyle = '#3a3e48';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(8, 5); ctx.stroke();
  ctx.strokeStyle = col;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(8, 5); ctx.stroke();
  ctx.globalAlpha = 1;

  // BNC connector
  ctx.fillStyle = '#6a7488';
  ctx.beginPath(); ctx.arc(8, 5, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(8, 5, 1.5, 0, Math.PI * 2); ctx.fill();

  // Probe body
  const bodyGrad = ctx.createLinearGradient(2, 0, 14, 0);
  bodyGrad.addColorStop(0, '#404858');
  bodyGrad.addColorStop(0.5, '#58606e');
  bodyGrad.addColorStop(1, '#383e4c');
  ctx.fillStyle = bodyGrad;
  ctx.fillRect(2, 8, 12, 16);
  ctx.strokeStyle = '#1a1e28';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(2, 8, 12, 16);

  // Color band
  ctx.fillStyle = col;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(3, 13, 10, 3);
  ctx.globalAlpha = 1;

  // Channel label on body
  ctx.fillStyle = col;
  ctx.font = 'bold 5px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label.replace('OSC ', '').replace('DSO ', ''), 8, 22);

  // Probe tip (triangle)
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(5, 24);
  ctx.lineTo(11, 24);
  ctx.lineTo(8, 36);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#1a1e28';
  ctx.lineWidth = 0.6;
  ctx.stroke();

  // Tip highlight
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.35;
  ctx.beginPath(); ctx.arc(8, 33, 1.2, 0, Math.PI * 2); ctx.fill();
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
    ctx.beginPath(); ctx.arc(8, 33, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  if (inst.selected && typeof drawSelectionRect === 'function') {
    drawSelectionRect(ctx, -3, -6, 22, 48);
  }
  ctx.restore();
}

function _probeFmtV(v) {
  const abs = Math.abs(v);
  if (abs >= 1) return v.toFixed(2) + 'V';
  if (abs >= 0.01) return (v * 1000).toFixed(1) + 'mV';
  return '0.00V';
}
