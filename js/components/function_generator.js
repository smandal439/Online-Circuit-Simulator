'use strict';

defComp({
  id: 'func_gen',
  name: 'Function Generator',
  category: 'Instruments',
  icon: '〜',
  desc: 'Dual channel DDS function generator — sine, square, triangle, sawtooth, and noise waveforms with phase & duty cycle control',

  width: 280,
  height: 190,

  defaultProps: {
    ch1_wave: 'sine',  ch1_freq: 440,  ch1_amp: 5.0,  ch1_offset: 0,  ch1_phase: 0,   ch1_duty: 50,
    ch2_wave: 'square', ch2_freq: 880, ch2_amp: 3.0, ch2_offset: 0, ch2_phase: 90,  ch2_duty: 50,
  },

  interactive: [
    { field: 'ch1_freq',   label: 'CH1 Freq',   min: 10,  max: 3000, step: 1,  unit: 'Hz' },
    { field: 'ch1_amp',    label: 'CH1 Amp',    min: 0.1, max: 10,   step: 0.1, unit: 'V' },
    { field: 'ch1_offset', label: 'CH1 Off',    min: -5,  max: 5,    step: 0.1, unit: 'V' },
    { field: 'ch1_phase',  label: 'CH1 Phs',    min: 0,   max: 360,  step: 1,  unit: '°' },
    { field: 'ch1_duty',   label: 'CH1 Duty',   min: 5,   max: 95,   step: 1,  unit: '%' },
    { field: 'ch2_freq',   label: 'CH2 Freq',   min: 10,  max: 3000, step: 1,  unit: 'Hz' },
    { field: 'ch2_amp',    label: 'CH2 Amp',    min: 0.1, max: 10,   step: 0.1, unit: 'V' },
    { field: 'ch2_offset', label: 'CH2 Off',    min: -5,  max: 5,    step: 0.1, unit: 'V' },
    { field: 'ch2_phase',  label: 'CH2 Phs',    min: 0,   max: 360,  step: 1,  unit: '°' },
    { field: 'ch2_duty',   label: 'CH2 Duty',   min: 5,   max: 95,   step: 1,  unit: '%' },
    { field: 'ch1_wave', label: 'CH1 Wave', type: 'select', options: [
      { value: 'sine',     label: 'Sine' },
      { value: 'square',   label: 'Square' },
      { value: 'triangle', label: 'Triangle' },
      { value: 'sawtooth', label: 'Sawtooth' },
      { value: 'noise',    label: 'Noise' },
    ]},
    { field: 'ch2_wave', label: 'CH2 Wave', type: 'select', options: [
      { value: 'sine',     label: 'Sine' },
      { value: 'square',   label: 'Square' },
      { value: 'triangle', label: 'Triangle' },
      { value: 'sawtooth', label: 'Sawtooth' },
      { value: 'noise',    label: 'Noise' },
    ]},
  ],

  pins: [
    { id: 'ch1_out', label: 'CH1',  type: PIN_TYPE.SIGNAL, x: 80,  y: 190, side: 'bottom' },
    { id: 'ch1_gnd', label: 'GND1', type: PIN_TYPE.GND,   x: 110, y: 190, side: 'bottom' },
    { id: 'ch2_out', label: 'CH2',  type: PIN_TYPE.SIGNAL, x: 170, y: 190, side: 'bottom' },
    { id: 'ch2_gnd', label: 'GND2', type: PIN_TYPE.GND,   x: 200, y: 190, side: 'bottom' },
  ],

  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const props = inst.props || {};
    const rs = inst.runtimeState || {};
    const W = 280, H = 190;

    ctx.save();
    ctx.translate(x, y);

    // ── Lead wires ──
    const drawLead = (px, py, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px, H - 30); ctx.lineTo(px, H); ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(px, H, 3, 0, Math.PI * 2); ctx.fill();
    };
    drawLead(80,  H, '#00e5ff');
    drawLead(110, H, '#555');
    drawLead(170, H, '#ff3366');
    drawLead(200, H, '#555');

    // ── Main body ──
    ctx.fillStyle = '#22262f';
    roundRect(ctx, 0, 0, W, H - 30, 10);
    ctx.fill();
    ctx.strokeStyle = '#14171c';
    ctx.lineWidth = 3;
    ctx.stroke();

    // ── Top bar ──
    ctx.fillStyle = '#333945';
    ctx.fillRect(8, 6, W - 16, 2);
    ctx.fillStyle = '#556677';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('DUAL-CHANNEL DDS FUNCTION GENERATOR', 12, 18);
    ctx.textAlign = 'right';
    ctx.fillText('CH1 / CH2', W - 12, 18);
    ctx.fillStyle = '#333945';
    ctx.fillRect(8, 22, W - 16, 2);

    // ── Scope screen ──
    const scrX = 10, scrY = 28, scrW = W - 20, scrH = 56;
    ctx.fillStyle = '#090b0e';
    roundRect(ctx, scrX, scrY, scrW, scrH, 4);
    ctx.fill();
    ctx.strokeStyle = '#2d333f';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Graticule
    ctx.strokeStyle = '#1e232d';
    ctx.lineWidth = 0.5;
    for (let gx = 1; gx < 10; gx++) {
      const gxPos = scrX + (scrW / 10) * gx;
      ctx.beginPath(); ctx.moveTo(gxPos, scrY); ctx.lineTo(gxPos, scrY + scrH); ctx.stroke();
    }
    for (let gy = 1; gy < 6; gy++) {
      const gyPos = scrY + (scrH / 6) * gy;
      ctx.beginPath(); ctx.moveTo(scrX, gyPos); ctx.lineTo(scrX + scrW, gyPos); ctx.stroke();
    }
    // Zero line
    ctx.strokeStyle = '#343a46';
    ctx.lineWidth = 0.8;
    const zeroY = scrY + scrH / 2;
    ctx.beginPath(); ctx.moveTo(scrX, zeroY); ctx.lineTo(scrX + scrW, zeroY); ctx.stroke();

    // Draw waveform traces on screen
    const ch1Freq = props.ch1_freq || 440;
    const ch2Freq = props.ch2_freq || 880;
    const baseFreq = ch1Freq || ch2Freq || 100;
    const timeWindow = 2.5 / baseFreq;
    const dt = timeWindow / scrW;
    const vScale = (scrH / 2) / 6.0;

    const _sampleWave = (wave, t, freq, amp, offset, phaseDeg, duty) => {
      const phaseRad = (phaseDeg * Math.PI) / 180;
      const tau = ((t * freq + phaseRad / (2 * Math.PI)) % 1 + 1) % 1;
      const dutyFrac = duty / 100;
      let v = 0;
      switch (wave) {
        case 'sine':     v = Math.sin(2 * Math.PI * tau); break;
        case 'square':   v = tau < dutyFrac ? 1 : -1; break;
        case 'triangle': v = tau < dutyFrac ? -1 + 2 * (tau / dutyFrac) : 1 - 2 * ((tau - dutyFrac) / (1 - dutyFrac)); break;
        case 'sawtooth': v = 2 * tau - 1; break;
        case 'noise':    v = Math.sin(t * freq * 137.5) * 0.7 + Math.sin(t * freq * 239.1) * 0.3; break;
        default:         v = Math.sin(2 * Math.PI * tau); break;
      }
      return offset + v * (amp / 2);
    };

    // CH1 trace (cyan)
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let px = 0; px < scrW; px++) {
      const t = px * dt;
      const v = _sampleWave(props.ch1_wave || 'sine', t, ch1Freq, props.ch1_amp || 5, props.ch1_offset || 0, props.ch1_phase || 0, props.ch1_duty || 50);
      const py = zeroY - v * vScale;
      if (px === 0) ctx.moveTo(scrX + px, py); else ctx.lineTo(scrX + px, py);
    }
    ctx.stroke();

    // CH2 trace (pink)
    ctx.strokeStyle = '#ff3366';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let px = 0; px < scrW; px++) {
      const t = px * dt;
      const v = _sampleWave(props.ch2_wave || 'square', t, ch2Freq, props.ch2_amp || 3, props.ch2_offset || 0, props.ch2_phase || 90, props.ch2_duty || 50);
      const py = zeroY - v * vScale;
      if (px === 0) ctx.moveTo(scrX + px, py); else ctx.lineTo(scrX + px, py);
    }
    ctx.stroke();

    // ── Channel cards ──
    const cardY = 88, cardH = 88, cardGap = 8;
    const cardW = (scrW - cardGap) / 2;

    const _drawCard = (cx, cy, cw, ch, label, labelColor, wave, freq, amp, offset, phase, duty) => {
      // Card background
      ctx.fillStyle = '#181b22';
      roundRect(ctx, cx, cy, cw, ch, 6);
      ctx.fill();
      // Color top border
      ctx.fillStyle = labelColor;
      roundRect(ctx, cx, cy, cw, 3, 6);
      ctx.fill();
      // Label
      ctx.fillStyle = labelColor;
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(label, cx + 8, cy + 16);
      // Wave type badge
      const waveLabels = { sine: 'SIN', square: 'SQR', triangle: 'TRI', sawtooth: 'SAW', noise: 'NOI' };
      ctx.fillStyle = '#2b303c';
      const badgeW = 30;
      roundRect(ctx, cx + cw - badgeW - 8, cy + 6, badgeW, 14, 3);
      ctx.fill();
      ctx.fillStyle = labelColor;
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(waveLabels[wave] || 'SIN', cx + cw - badgeW / 2 - 8, cy + 16);

      // Parameters
      ctx.fillStyle = '#8c9ba5';
      ctx.font = '8px monospace';
      ctx.textAlign = 'left';
      const lineH = 13;
      let py = cy + 30;
      ctx.fillText('Freq: ' + _fmtFreq(freq), cx + 8, py); py += lineH;
      ctx.fillText('Amp:  ' + amp.toFixed(1) + 'Vpp', cx + 8, py); py += lineH;
      ctx.fillText('Off:  ' + offset.toFixed(1) + 'V', cx + 8, py); py += lineH;
      ctx.fillText('Phs:  ' + phase + '\u00B0', cx + 8, py); py += lineH;
      ctx.fillText('Duty: ' + duty + '%', cx + 8, py);
    };

    _drawCard(scrX, cardY, cardW, cardH, 'CHANNEL 1', '#00e5ff',
      props.ch1_wave || 'sine', ch1Freq, props.ch1_amp || 5, props.ch1_offset || 0, props.ch1_phase || 0, props.ch1_duty || 50);
    _drawCard(scrX + cardW + cardGap, cardY, cardW, cardH, 'CHANNEL 2', '#ff3366',
      props.ch2_wave || 'square', ch2Freq, props.ch2_amp || 3, props.ch2_offset || 0, props.ch2_phase || 90, props.ch2_duty || 50);

    // ── Pin labels ──
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#00e5ff';
    ctx.fillText('CH1', 80, H - 8);
    ctx.fillStyle = '#ff3366';
    ctx.fillText('CH2', 170, H - 8);

    // ── Selection highlight ──
    if (inst.selected) drawSelectionRect(ctx, -4, -4, W + 8, H + 4);

    ctx.restore();
  }
});

function _fmtFreq(hz) {
  if (hz >= 1e6) return (hz / 1e6).toFixed(2) + ' MHz';
  if (hz >= 1e3) return (hz / 1e3).toFixed(2) + ' kHz';
  return hz.toFixed(0) + ' Hz';
}
