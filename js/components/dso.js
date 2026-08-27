'use strict';

defComp({
  id: 'dso_4ch',
  name: '4-Channel Digital Storage Oscilloscope',
  category: 'Instruments',
  icon: '∿',
  desc: '4-Channel DSO with high-contrast phosphor TFT screen, independent AC/DC coupling, trigger level sync, and interactive timebase/vertical controls.',

  width: 350,
  height: 240,

  defaultProps: {
    // Timebase & Trigger
    timebase: 0.001,      // 1 ms / div
    trig_source: 'ch1',   // 'ch1', 'ch2', 'ch3', 'ch4'
    trig_level: 0.0,      // Volts
    trig_mode: 'auto',    // 'auto', 'norm'
    trig_slope: 'rising', // 'rising', 'falling'

    // Channel 1 (Yellow)
    ch1_en: true,
    ch1_vdiv: 1.0,        // Volts / div
    ch1_pos: 2.0,         // Vertical position offset in divisions (+/- 4)
    ch1_coupling: 'dc',   // 'dc', 'ac', 'gnd'

    // Channel 2 (Cyan)
    ch2_en: true,
    ch2_vdiv: 2.0,
    ch2_pos: 0.0,
    ch2_coupling: 'dc',

    // Channel 3 (Magenta)
    ch3_en: false,
    ch3_vdiv: 5.0,
    ch3_pos: -2.0,
    ch3_coupling: 'dc',

    // Channel 4 (Green)
    ch4_en: false,
    ch4_vdiv: 0.5,
    ch4_pos: -3.0,
    ch4_coupling: 'dc',
  },

  interactive: [
    // --- Timebase & Triggering ---
    { field: 'timebase',     label: 'Time/Div',       min: 0.00001, max: 0.1, step: 0.0001, unit: 's' },
    { field: 'trig_source',  label: 'Trig Source',    type: 'select', options: [
      { value: 'ch1', label: 'CH1 (Yellow)' },
      { value: 'ch2', label: 'CH2 (Cyan)' },
      { value: 'ch3', label: 'CH3 (Magenta)' },
      { value: 'ch4', label: 'CH4 (Green)' }
    ]},
    { field: 'trig_level',   label: 'Trig Level',     min: -10, max: 10, step: 0.1, unit: 'V' },
    { field: 'trig_slope',   label: 'Trig Slope',     type: 'select', options: [
      { value: 'rising',  label: 'Rising Edge (/) ' },
      { value: 'falling', label: 'Falling Edge (\\)' }
    ]},

    // --- Channel 1 ---
    { field: 'ch1_en',       label: 'CH1 Enable',     type: 'checkbox' },
    { field: 'ch1_vdiv',     label: 'CH1 Volts/Div',  min: 0.05, max: 20, step: 0.05, unit: 'V' },
    { field: 'ch1_pos',      label: 'CH1 Pos Offset', min: -4, max: 4, step: 0.1, unit: 'div' },
    { field: 'ch1_coupling', label: 'CH1 Coupling',   type: 'select', options: [
      { value: 'dc',  label: 'DC Coupling' },
      { value: 'ac',  label: 'AC Coupling' },
      { value: 'gnd', label: 'GND (Ground)' }
    ]},

    // --- Channel 2 ---
    { field: 'ch2_en',       label: 'CH2 Enable',     type: 'checkbox' },
    { field: 'ch2_vdiv',     label: 'CH2 Volts/Div',  min: 0.05, max: 20, step: 0.05, unit: 'V' },
    { field: 'ch2_pos',      label: 'CH2 Pos Offset', min: -4, max: 4, step: 0.1, unit: 'div' },
    { field: 'ch2_coupling', label: 'CH2 Coupling',   type: 'select', options: [
      { value: 'dc',  label: 'DC Coupling' },
      { value: 'ac',  label: 'AC Coupling' },
      { value: 'gnd', label: 'GND (Ground)' }
    ]},

    // --- Channel 3 ---
    { field: 'ch3_en',       label: 'CH3 Enable',     type: 'checkbox' },
    { field: 'ch3_vdiv',     label: 'CH3 Volts/Div',  min: 0.05, max: 20, step: 0.05, unit: 'V' },
    { field: 'ch3_pos',      label: 'CH3 Pos Offset', min: -4, max: 4, step: 0.1, unit: 'div' },
    { field: 'ch3_coupling', label: 'CH3 Coupling',   type: 'select', options: [
      { value: 'dc',  label: 'DC Coupling' },
      { value: 'ac',  label: 'AC Coupling' },
      { value: 'gnd', label: 'GND (Ground)' }
    ]},

    // --- Channel 4 ---
    { field: 'ch4_en',       label: 'CH4 Enable',     type: 'checkbox' },
    { field: 'ch4_vdiv',     label: 'CH4 Volts/Div',  min: 0.05, max: 20, step: 0.05, unit: 'V' },
    { field: 'ch4_pos',      label: 'CH4 Pos Offset', min: -4, max: 4, step: 0.1, unit: 'div' },
    { field: 'ch4_coupling', label: 'CH4 Coupling',   type: 'select', options: [
      { value: 'dc',  label: 'DC Coupling' },
      { value: 'ac',  label: 'AC Coupling' },
      { value: 'gnd', label: 'GND (Ground)' }
    ]},
  ],

  pins: [
    { id: 'ch1_in', label: 'CH1', type: PIN_TYPE.SIGNAL, x: 45,  y: 240, side: 'bottom' },
    { id: 'ch2_in', label: 'CH2', type: PIN_TYPE.SIGNAL, x: 105, y: 240, side: 'bottom' },
    { id: 'ch3_in', label: 'CH3', type: PIN_TYPE.SIGNAL, x: 165, y: 240, side: 'bottom' },
    { id: 'ch4_in', label: 'CH4', type: PIN_TYPE.SIGNAL, x: 225, y: 240, side: 'bottom' },
    { id: 'gnd',    label: 'GND', type: PIN_TYPE.GND,    x: 295, y: 240, side: 'bottom' },
  ],

  /**
   * Sample Input Voltages into Ring Buffers
   */
  step(inst, sim) {
    if (!inst._buffers) {
      inst._buffers = { ch1: [], ch2: [], ch3: [], ch4: [], t: [] };
    }

    const t = sim && typeof sim.time === 'number' ? sim.time : performance.now() / 1000;
    const v1 = (sim && typeof sim.getPinVoltage === 'function') ? sim.getPinVoltage(inst, 'ch1_in') : 0;
    const v2 = (sim && typeof sim.getPinVoltage === 'function') ? sim.getPinVoltage(inst, 'ch2_in') : 0;
    const v3 = (sim && typeof sim.getPinVoltage === 'function') ? sim.getPinVoltage(inst, 'ch3_in') : 0;
    const v4 = (sim && typeof sim.getPinVoltage === 'function') ? sim.getPinVoltage(inst, 'ch4_in') : 0;

    const maxSamples = 400;
    inst._buffers.ch1.push(v1);
    inst._buffers.ch2.push(v2);
    inst._buffers.ch3.push(v3);
    inst._buffers.ch4.push(v4);
    inst._buffers.t.push(t);

    if (inst._buffers.t.length > maxSamples) {
      inst._buffers.ch1.shift();
      inst._buffers.ch2.shift();
      inst._buffers.ch3.shift();
      inst._buffers.ch4.shift();
      inst._buffers.t.shift();
    }
  },

  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const props = inst.props || {};
    const W = 350, H = 240;
    const t = sim && typeof sim.time === 'number' ? sim.time : performance.now() / 1000;

    const drawRRect = (c, rx, ry, rw, rh, rad) => {
      if (typeof roundRect === 'function') { roundRect(c, rx, ry, rw, rh, rad); return; }
      c.beginPath();
      c.moveTo(rx + rad, ry);
      c.arcTo(rx + rw, ry, rx + rw, ry + rh, rad);
      c.arcTo(rx + rw, ry + rh, rx, ry + rh, rad);
      c.arcTo(rx, ry + rh, rx, ry, rad);
      c.arcTo(rx, ry, rx + rw, ry, rad);
      c.closePath();
    };

    ctx.save();
    ctx.translate(x, y);

    // ── Main Chassis (Benchtop Enclosure) ──
    const bodyGrad = ctx.createLinearGradient(0, 0, 0, H);
    bodyGrad.addColorStop(0, '#2e3440');
    bodyGrad.addColorStop(0.6, '#232731');
    bodyGrad.addColorStop(1, '#191c24');
    ctx.fillStyle = bodyGrad;
    drawRRect(ctx, 0, 0, W, H - 25, 8);
    ctx.fill();
    ctx.strokeStyle = '#0e1015';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Protective Corner Caps
    ctx.fillStyle = '#14171d';
    drawRRect(ctx, 0, 0, 10, 10, 2); ctx.fill();
    drawRRect(ctx, W - 10, 0, 10, 10, 2); ctx.fill();
    drawRRect(ctx, 0, H - 35, 10, 10, 2); ctx.fill();
    drawRRect(ctx, W - 10, H - 35, 10, 10, 2); ctx.fill();

    // ── Header Title & System Status ──
    ctx.fillStyle = '#181b22';
    ctx.fillRect(10, 6, W - 20, 18);

    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('DSO-4000', 16, 18);

    ctx.fillStyle = '#7a889b';
    ctx.font = '8px sans-serif';
    ctx.fillText('4-CH DIGITAL STORAGE OSCILLOSCOPE', 76, 18);

    // Trigger Status Indicator (Auto / Trig'd)
    ctx.fillStyle = '#00ff66';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('TRIG\'D', W - 16, 18);

    // ── TFT Display Screen Panel ──
    const scrX = 10, scrY = 28, scrW = 240, scrH = 135;
    ctx.fillStyle = '#030508';
    drawRRect(ctx, scrX, scrY, scrW, scrH, 4);
    ctx.fill();
    ctx.strokeStyle = '#384252';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Reticle Masking
    ctx.save();
    drawRRect(ctx, scrX, scrY, scrW, scrH, 4);
    ctx.clip();

    // Grid Graticule (10 Horizontal Divs, 8 Vertical Divs)
    const divsX = 10, divsY = 8;
    const divW = scrW / divsX;
    const divH = scrH / divsY;
    const zeroY = scrY + scrH / 2;
    const midX = scrX + scrW / 2;

    ctx.strokeStyle = '#101824';
    ctx.lineWidth = 0.5;

    for (let gx = 1; gx < divsX; gx++) {
      const px = scrX + divW * gx;
      ctx.beginPath(); ctx.moveTo(px, scrY); ctx.lineTo(px, scrY + scrH); ctx.stroke();
    }
    for (let gy = 1; gy < divsY; gy++) {
      const py = scrY + divH * gy;
      ctx.beginPath(); ctx.moveTo(scrX, py); ctx.lineTo(scrX + scrW, py); ctx.stroke();
    }

    // Center Axes with Graduation Sub-ticks
    ctx.strokeStyle = '#223044';
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(scrX, zeroY); ctx.lineTo(scrX + scrW, zeroY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(midX, scrY); ctx.lineTo(midX, scrY + scrH); ctx.stroke();

    // Center Sub-tick Marks
    ctx.fillStyle = '#30425c';
    for (let i = 0; i <= divsX * 5; i++) {
      const tx = scrX + (scrW / (divsX * 5)) * i;
      ctx.fillRect(tx, zeroY - 1.5, 0.6, 3);
    }
    for (let i = 0; i <= divsY * 5; i++) {
      const ty = scrY + (scrH / (divsY * 5)) * i;
      ctx.fillRect(midX - 1.5, ty, 3, 0.6);
    }

    // ── Waveform Trace Rendering ──
    const channels = [
      { id: 'ch1', en: props.ch1_en !== false, col: '#ffea00', vdiv: props.ch1_vdiv || 1.0, pos: props.ch1_pos || 0, coup: props.ch1_coupling || 'dc' },
      { id: 'ch2', en: props.ch2_en !== false, col: '#00f0ff', vdiv: props.ch2_vdiv || 2.0, pos: props.ch2_pos || 0, coup: props.ch2_coupling || 'dc' },
      { id: 'ch3', en: props.ch3_en !== false, col: '#ff2aab', vdiv: props.ch3_vdiv || 5.0, pos: props.ch3_pos || 0, coup: props.ch3_coupling || 'dc' },
      { id: 'ch4', en: props.ch4_en !== false, col: '#00ff66', vdiv: props.ch4_vdiv || 0.5, pos: props.ch4_pos || 0, coup: props.ch4_coupling || 'dc' },
    ];

    const buf = inst._buffers;
    const totalTimeSpan = (props.timebase || 0.001) * divsX;

    channels.forEach((ch) => {
      if (!ch.en) return;

      ctx.strokeStyle = ch.col;
      ctx.shadowColor = ch.col;
      ctx.shadowBlur = 4;
      ctx.lineWidth = 1.4;
      ctx.beginPath();

      const samples = (buf && buf[ch.id] && buf[ch.id].length > 0) ? buf[ch.id] : null;
      const tSamples = (buf && buf.t && buf.t.length > 0) ? buf.t : null;

      // Calculate AC coupling mean offset
      let meanV = 0;
      if (ch.coup === 'ac' && samples) {
        const sum = samples.reduce((a, b) => a + b, 0);
        meanV = sum / samples.length;
      }

      for (let px = 0; px < scrW; px++) {
        let v = 0;
        if (ch.coup === 'gnd') {
          v = 0;
        } else if (samples && tSamples && samples.length > 1) {
          const targetTime = t - (totalTimeSpan * (1.0 - px / scrW));
          // Sample lookup / interpolation
          let idx = samples.length - 1;
          for (let i = samples.length - 1; i >= 0; i--) {
            if (tSamples[i] <= targetTime) { idx = i; break; }
          }
          v = samples[idx];
          if (ch.coup === 'ac') v -= meanV;
        } else {
          // Synthetic Preview Wave fallback if no active simulation step data yet
          const omega = 2 * Math.PI * (1 / (totalTimeSpan * 0.4));
          const wavePhase = (t + (px / scrW) * totalTimeSpan) * omega;
          v = ch.id === 'ch1' ? Math.sin(wavePhase) * (ch.vdiv * 1.5) :
              ch.id === 'ch2' ? (Math.sin(wavePhase * 2) > 0 ? ch.vdiv : -ch.vdiv) : 0;
          if (ch.coup === 'ac') v *= 0.8;
        }

        // Map Voltage to Y-pixel coordinate
        const py = zeroY - (v * (divH / ch.vdiv)) - (ch.pos * divH);
        if (px === 0) ctx.moveTo(scrX + px, py); else ctx.lineTo(scrX + px, py);
      }
      ctx.stroke();

      // Channel Baseline Offset Marker (Left Edge)
      const baseMarkerY = zeroY - (ch.pos * divH);
      if (baseMarkerY >= scrY && baseMarkerY <= scrY + scrH) {
        ctx.fillStyle = ch.col;
        ctx.beginPath();
        ctx.moveTo(scrX, baseMarkerY);
        ctx.lineTo(scrX + 5, baseMarkerY - 3);
        ctx.lineTo(scrX + 5, baseMarkerY + 3);
        ctx.closePath();
        ctx.fill();
      }
    });

    // Trigger Level Line Indicator
    const trigV = props.trig_level || 0;
    const trigCh = channels.find(c => c.id === (props.trig_source || 'ch1'));
    if (trigCh) {
      const trigY = zeroY - (trigV * (divH / trigCh.vdiv)) - (trigCh.pos * divH);
      if (trigY >= scrY && trigY <= scrY + scrH) {
        ctx.strokeStyle = 'rgba(255, 170, 0, 0.6)';
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(scrX, trigY); ctx.lineTo(scrX + scrW, trigY); ctx.stroke();
        ctx.setLineDash([]); // Reset line dash

        // Trigger T Marker (Right Edge)
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.moveTo(scrX + scrW, trigY);
        ctx.lineTo(scrX + scrW - 5, trigY - 3);
        ctx.lineTo(scrX + scrW - 5, trigY + 3);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.restore(); // Exit Screen Clipping Context

    // ── Screen On-Screen Display (OSD) Status Bar ──
    const osdY = scrY + scrH - 12;
    ctx.fillStyle = 'rgba(5, 8, 14, 0.85)';
    ctx.fillRect(scrX, osdY, scrW, 12);

    const drawOSDBadge = (ox, txt, col, isEn) => {
      ctx.fillStyle = isEn ? col : '#505c6e';
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(txt, ox, osdY + 9);
    };

    drawOSDBadge(scrX + 4,   '1:' + _fmtVolt(props.ch1_vdiv || 1) + (props.ch1_coupling === 'ac' ? '~' : '='), '#ffea00', props.ch1_en !== false);
    drawOSDBadge(scrX + 56,  '2:' + _fmtVolt(props.ch2_vdiv || 2) + (props.ch2_coupling === 'ac' ? '~' : '='), '#00f0ff', props.ch2_en !== false);
    drawOSDBadge(scrX + 108, '3:' + _fmtVolt(props.ch3_vdiv || 5) + (props.ch3_coupling === 'ac' ? '~' : '='), '#ff2aab', props.ch3_en !== false);
    drawOSDBadge(scrX + 160, '4:' + _fmtVolt(props.ch4_vdiv || 0.5) + (props.ch4_coupling === 'ac' ? '~' : '='), '#00ff66', props.ch4_en !== false);

    // Timebase Readout
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(_fmtTime(props.timebase || 0.001) + '/div', scrX + scrW - 4, osdY + 9);

    // ── Hardware Control Panel (Right Side Knobs & Buttons) ──
    const panX = 260;

    // Timebase Knob
    _drawKnob(ctx, panX + 22, 45, 14, 'SEC/DIV', '#a0aab8');
    // Vertical Scale Knob
    _drawKnob(ctx, panX + 62, 45, 14, 'VOLT/DIV', '#a0aab8');
    // Trigger Level Knob
    _drawKnob(ctx, panX + 42, 92, 12, 'TRIG LEVEL', '#ffaa00');

    // Channel Select Pushbuttons with Lit Color Ring LEDs
    const drawChBtn = (bx, by, lbl, col, isAct) => {
      ctx.fillStyle = isAct ? col : '#262c38';
      drawRRect(ctx, bx, by, 16, 14, 3);
      ctx.fill();
      ctx.strokeStyle = '#12151c'; ctx.lineWidth = 1; ctx.stroke();

      ctx.fillStyle = isAct ? '#000000' : '#8594a6';
      ctx.font = 'bold 7.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(lbl, bx + 8, by + 10);
    };

    drawChBtn(panX + 6,  126, 'CH1', '#ffea00', props.ch1_en !== false);
    drawChBtn(panX + 25, 126, 'CH2', '#00f0ff', props.ch2_en !== false);
    drawChBtn(panX + 44, 126, 'CH3', '#ff2aab', props.ch3_en !== false);
    drawChBtn(panX + 63, 126, 'CH4', '#00ff66', props.ch4_en !== false);

    // Run / Stop Button
    ctx.fillStyle = '#2ed573';
    drawRRect(ctx, panX + 16, 148, 50, 13, 3);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('RUN / STOP', panX + 41, 157);

    // ── Metallic BNC Input Terminals ──
    const _drawBNCTerminal = (bx, by, lbl, col) => {
      // Hex Nut Base
      ctx.fillStyle = '#3a4150';
      ctx.beginPath(); ctx.arc(bx, by, 8.5, 0, Math.PI * 2); ctx.fill();
      // Outer Metallic Shield Ring
      const metalGrad = ctx.createLinearGradient(bx - 6, by - 6, bx + 6, by + 6);
      metalGrad.addColorStop(0, '#dbe2eb');
      metalGrad.addColorStop(0.5, '#7f8c9d');
      metalGrad.addColorStop(1, '#434b57');
      ctx.fillStyle = metalGrad;
      ctx.beginPath(); ctx.arc(bx, by, 6.8, 0, Math.PI * 2); ctx.fill();
      // Black Dielectric Ring
      ctx.fillStyle = '#0a0c0f';
      ctx.beginPath(); ctx.arc(bx, by, 4.2, 0, Math.PI * 2); ctx.fill();
      // Gold Pin Socket
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(bx, by, 1.8, 0, Math.PI * 2); ctx.fill();

      // Terminal Label
      ctx.fillStyle = col;
      ctx.font = 'bold 7.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(lbl, bx, by + 14);
    };

    _drawBNCTerminal(45,  215, 'CH1', '#ffea00');
    _drawBNCTerminal(105, 215, 'CH2', '#00f0ff');
    _drawBNCTerminal(165, 215, 'CH3', '#ff2aab');
    _drawBNCTerminal(225, 215, 'CH4', '#00ff66');
    _drawBNCTerminal(295, 215, 'GND', '#7a889b');

    // Selection Halo
    if (inst.selected && typeof drawSelectionRect === 'function') {
      drawSelectionRect(ctx, -4, -4, W + 8, H + 8);
    }

    ctx.restore();
  }
});

// Helper Function: Draw Control Knob
function _drawKnob(ctx, kx, ky, r, label, col) {
  const kGrad = ctx.createRadialGradient(kx - 2, ky - 2, 1, kx, ky, r);
  kGrad.addColorStop(0, '#586273');
  kGrad.addColorStop(0.7, '#282d38');
  kGrad.addColorStop(1, '#161920');
  ctx.fillStyle = kGrad;
  ctx.beginPath(); ctx.arc(kx, ky, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#0d0f14'; ctx.lineWidth = 1.2; ctx.stroke();

  // Indicator Marker Dot
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(kx, ky - r + 4, 1.6, 0, Math.PI * 2); ctx.fill();

  // Label
  ctx.fillStyle = '#7a889b';
  ctx.font = '6px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, kx, ky + r + 8);
}

// Helper Function: Format Timebase Readout
function _fmtTime(seconds) {
  if (seconds >= 1) return seconds.toFixed(1) + 's';
  if (seconds >= 1e-3) return (seconds * 1e3).toFixed(0) + 'ms';
  if (seconds >= 1e-6) return (seconds * 1e6).toFixed(0) + 'µs';
  return (seconds * 1e9).toFixed(0) + 'ns';
}

// Helper Function: Format Volts Readout
function _fmtVolt(v) {
  if (v >= 1) return v.toFixed(v % 1 === 0 ? 0 : 1) + 'V';
  return (v * 1000).toFixed(0) + 'mV';
}