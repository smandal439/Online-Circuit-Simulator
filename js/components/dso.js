'use strict';

defComp({
  id: 'dso_4ch',
  name: '4-Channel Digital Storage Oscilloscope',
  category: 'Instruments',
  icon: '∿',
  desc: '4-Channel DSO with phosphor display, AC/DC coupling, trigger, measurements, cursors, math channel, and fullscreen mode.',

  width: 440,
  height: 300,

  defaultProps: {
    powered: 1,
    runStop: 1,
    singleTrigger: 0,
    timebase: 0.001,
    trig_source: 'ch1',
    trig_level: 0.0,
    trig_mode: 'auto',
    trig_slope: 'rising',
    ch1_en: true,  ch1_vdiv: 1.0,  ch1_pos: 2.0,  ch1_coupling: 'dc', ch1_probe: 1,
    ch2_en: true,  ch2_vdiv: 2.0,  ch2_pos: 0.0,  ch2_coupling: 'dc', ch2_probe: 1,
    ch3_en: false, ch3_vdiv: 5.0,  ch3_pos: -2.0, ch3_coupling: 'dc', ch3_probe: 1,
    ch4_en: false, ch4_vdiv: 0.5,  ch4_pos: -3.0, ch4_coupling: 'dc', ch4_probe: 1,
    math_op: 'off',
  },

  interactive: [
    { field: 'powered',     label: 'Power',      type: 'toggle', min: 0, max: 1, step: 1, unit: '', inline: { x: 388, y: 38, w: 26, h: 42 } },
    { field: 'runStop',     label: 'Run/Stop',   type: 'toggle', min: 0, max: 1, step: 1, unit: '', inline: { x: 306, y: 224, w: 40, h: 18 } },
    { field: 'singleTrigger', label: 'Single',   type: 'toggle', min: 0, max: 1, step: 1, unit: '', inline: { x: 350, y: 224, w: 40, h: 18 } },
    { field: 'timebase',    label: 'Time/Div',     min: 0.00001, max: 0.1, step: 0.0001, unit: 's' },
    { field: 'trig_source', label: 'Trig Source',  type: 'select', options: [
      { value: 'ch1', label: 'CH1' }, { value: 'ch2', label: 'CH2' },
      { value: 'ch3', label: 'CH3' }, { value: 'ch4', label: 'CH4' }
    ]},
    { field: 'trig_level',  label: 'Trig Level',   min: -10, max: 10, step: 0.1, unit: 'V' },
    { field: 'trig_slope',  label: 'Trig Slope',   type: 'select', options: [
      { value: 'rising', label: 'Rising' }, { value: 'falling', label: 'Falling' }
    ]},
    { field: 'ch1_en',       label: 'CH1 Enable',   type: 'checkbox' },
    { field: 'ch1_vdiv',     label: 'CH1 V/Div',    min: 0.05, max: 20, step: 0.05, unit: 'V' },
    { field: 'ch1_pos',      label: 'CH1 Position',  min: -4, max: 4, step: 0.1, unit: 'div' },
    { field: 'ch1_coupling', label: 'CH1 Coupling',  type: 'select', options: [
      { value: 'dc', label: 'DC' }, { value: 'ac', label: 'AC' }, { value: 'gnd', label: 'GND' }
    ]},
    { field: 'ch2_en',       label: 'CH2 Enable',   type: 'checkbox' },
    { field: 'ch2_vdiv',     label: 'CH2 V/Div',    min: 0.05, max: 20, step: 0.05, unit: 'V' },
    { field: 'ch2_pos',      label: 'CH2 Position',  min: -4, max: 4, step: 0.1, unit: 'div' },
    { field: 'ch2_coupling', label: 'CH2 Coupling',  type: 'select', options: [
      { value: 'dc', label: 'DC' }, { value: 'ac', label: 'AC' }, { value: 'gnd', label: 'GND' }
    ]},
    { field: 'ch3_en',       label: 'CH3 Enable',   type: 'checkbox' },
    { field: 'ch3_vdiv',     label: 'CH3 V/Div',    min: 0.05, max: 20, step: 0.05, unit: 'V' },
    { field: 'ch3_pos',      label: 'CH3 Position',  min: -4, max: 4, step: 0.1, unit: 'div' },
    { field: 'ch3_coupling', label: 'CH3 Coupling',  type: 'select', options: [
      { value: 'dc', label: 'DC' }, { value: 'ac', label: 'AC' }, { value: 'gnd', label: 'GND' }
    ]},
    { field: 'ch4_en',       label: 'CH4 Enable',   type: 'checkbox' },
    { field: 'ch4_vdiv',     label: 'CH4 V/Div',    min: 0.05, max: 20, step: 0.05, unit: 'V' },
    { field: 'ch4_pos',      label: 'CH4 Position',  min: -4, max: 4, step: 0.1, unit: 'div' },
    { field: 'ch4_coupling', label: 'CH4 Coupling',  type: 'select', options: [
      { value: 'dc', label: 'DC' }, { value: 'ac', label: 'AC' }, { value: 'gnd', label: 'GND' }
    ]},
  ],

  pins: [
    { id: 'ch1_in', label: 'CH1', type: PIN_TYPE.SIGNAL, x: 50,  y: 300, side: 'bottom' },
    { id: 'ch2_in', label: 'CH2', type: PIN_TYPE.SIGNAL, x: 120, y: 300, side: 'bottom' },
    { id: 'ch3_in', label: 'CH3', type: PIN_TYPE.SIGNAL, x: 190, y: 300, side: 'bottom' },
    { id: 'ch4_in', label: 'CH4', type: PIN_TYPE.SIGNAL, x: 260, y: 300, side: 'bottom' },
    { id: 'gnd',    label: 'GND', type: PIN_TYPE.GND,    x: 350, y: 300, side: 'bottom' },
  ],

  step(inst, sim) {
    const isPowered = Boolean(inst.runtimeState?.powered ?? inst.props.powered ?? 1);
    if (!isPowered) return;

    const rs = inst.runtimeState || {};
    const P = (runtime, pr, field, def) => (runtime[field] !== undefined) ? runtime[field] : (pr[field] ?? def);
    const isRunning = rs.runStop !== undefined ? Boolean(rs.runStop) : Boolean(inst.props.runStop ?? 1);
    const isSingleArmed = rs.singleTrigger !== undefined ? Boolean(rs.singleTrigger) : Boolean(inst.props.singleTrigger ?? 0);

    if (!inst._buffers) {
      inst._buffers = { ch1: [], ch2: [], ch3: [], ch4: [], t: [] };
      inst._triggered = false;
    }

    const t = sim && typeof sim.time === 'number' ? sim.time : performance.now() / 1000;
    const avSim = window.ArduinoSim;
    const readV = (pin) => {
      if (sim && typeof sim.getPinVoltage === 'function') return sim.getPinVoltage(inst, pin);
      if (avSim && typeof avSim.getPinVoltage === 'function') return avSim.getPinVoltage(inst, pin);
      return 0;
    };
    const readChannel = (pin, probeType) => {
      const wireV = readV(pin);
      if (Math.abs(wireV) > 0.001) return wireV;
      const probe = _dsoFindProbe(probeType);
      return probe && probe.runtimeState ? (probe.runtimeState.voltage || 0) : 0;
    };

    const buf = inst._buffers;

    if (!isRunning && !isSingleArmed) {
      // Stopped — don't append, but still compute measurements
      inst._computeMeas = inst._computeMeas || {};
      const divsX = 12;
      ['ch1', 'ch2', 'ch3', 'ch4'].forEach((chId, i) => {
        const probeFactor = P(rs, inst.props, chId + '_probe', 1);
        const rawSamples = buf[chId] && buf[chId].length > 0 ? buf[chId] : null;
        const samples = rawSamples ? rawSamples.map(v => v * probeFactor) : null;
        inst._computeMeas[chId] = dsoComputeMeasurements(samples, P(rs, inst.props, 'timebase', 0.001), divsX);
      });
      return;
    }

    // Append samples
    const probeFactor1 = P(rs, inst.props, 'ch1_probe', 1);
    const probeFactor2 = P(rs, inst.props, 'ch2_probe', 1);
    const probeFactor3 = P(rs, inst.props, 'ch3_probe', 1);
    const probeFactor4 = P(rs, inst.props, 'ch4_probe', 1);
    buf.ch1.push(readChannel('ch1_in', 'dso_probe_ch1') * probeFactor1);
    buf.ch2.push(readChannel('ch2_in', 'dso_probe_ch2') * probeFactor2);
    buf.ch3.push(readChannel('ch3_in', 'dso_probe_ch3') * probeFactor3);
    buf.ch4.push(readChannel('ch4_in', 'dso_probe_ch4') * probeFactor4);
    buf.t.push(t);
    if (buf.t.length > 500) {
      buf.ch1.shift(); buf.ch2.shift();
      buf.ch3.shift(); buf.ch4.shift();
      buf.t.shift();
    }

    // Single trigger logic
    if (isSingleArmed && !inst._triggered) {
      const trigSource = P(rs, inst.props, 'trig_source', 'ch1');
      const trigLevel = P(rs, inst.props, 'trig_level', 0);
      const trigSlope = P(rs, inst.props, 'trig_slope', 'rising');
      const chSamples = buf[trigSource];
      if (chSamples && chSamples.length >= 2) {
        const prev = chSamples[chSamples.length - 2];
        const curr = chSamples[chSamples.length - 1];
        const triggered = trigSlope === 'rising'
          ? (prev < trigLevel && curr >= trigLevel)
          : (prev > trigLevel && curr <= trigLevel);
        if (triggered) {
          inst._triggered = true;
          rs.singleTrigger = 0;
          rs.runStop = 0;
        }
      }
    }

    // Compute measurements for each enabled channel
    inst._computeMeas = inst._computeMeas || {};
    const divsX = 12;
    ['ch1', 'ch2', 'ch3', 'ch4'].forEach((chId) => {
      const probeFactor = P(rs, inst.props, chId + '_probe', 1);
      const rawSamples = buf[chId] && buf[chId].length > 0 ? buf[chId] : null;
      const samples = rawSamples ? rawSamples.map(v => v * probeFactor) : null;
      inst._computeMeas[chId] = dsoComputeMeasurements(samples, P(rs, inst.props, 'timebase', 0.001), divsX);
    });
  },

  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const props = inst.props || {};
    const rs = inst.runtimeState || {};
    const W = 440, H = 300;
    const t = sim && typeof sim.time === 'number' ? sim.time : performance.now() / 1000;
    const isPowered = Boolean(inst.runtimeState?.powered ?? inst.props.powered ?? 1);
    const isRunning = rs.runStop !== undefined ? Boolean(rs.runStop) : Boolean(inst.props.runStop ?? 1);
    const isSingleArmed = rs.singleTrigger !== undefined ? Boolean(rs.singleTrigger) : Boolean(inst.props.singleTrigger ?? 0);

    const P = (field, def) => (rs[field] !== undefined) ? rs[field] : (props[field] ?? def);

    const _rr = (c, rx, ry, rw, rh, rad) => {
      if (typeof roundRect === 'function') { roundRect(c, rx, ry, rw, rh, rad); return; }
      c.beginPath(); c.moveTo(rx + rad, ry);
      c.arcTo(rx + rw, ry, rx + rw, ry + rh, rad);
      c.arcTo(rx + rw, ry + rh, rx, ry + rh, rad);
      c.arcTo(rx, ry + rh, rx, ry, rad);
      c.arcTo(rx, ry, rx + rw, ry, rad); c.closePath();
    };

    ctx.save();
    ctx.translate(x, y);

    // ── Chassis Body ──
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#2a2e38'); bg.addColorStop(0.5, '#22262f'); bg.addColorStop(1, '#181b22');
    ctx.fillStyle = bg;
    _rr(ctx, 0, 0, W, H - 40, 10); ctx.fill();
    ctx.strokeStyle = '#0c0e12'; ctx.lineWidth = 3; ctx.stroke();

    // ── Bezel Screws ──
    const _screw = (sx, sy) => {
      ctx.fillStyle = '#3a3f4a';
      ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#1a1d22'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.strokeStyle = '#4a4f5a'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(sx - 2.5, sy); ctx.lineTo(sx + 2.5, sy); ctx.stroke();
    };
    _screw(12, 12); _screw(W - 12, 12); _screw(12, H - 52); _screw(W - 12, H - 52);

    // ── Top Bar ──
    ctx.fillStyle = '#1a1d24';
    ctx.fillRect(10, 6, W - 20, 20);

    // Brand Logo
    ctx.fillStyle = isPowered ? '#00d4e6' : '#1a2a30';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('DSO-4100', 18, 20);

    ctx.fillStyle = isPowered ? '#606878' : '#2a2e38';
    ctx.font = '7px sans-serif';
    ctx.fillText('4-CH DIGITAL STORAGE OSCILLOSCOPE', 82, 20);

    // Run/Stop status
    if (isPowered) {
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'right';
      if (!isRunning) {
        ctx.fillStyle = '#ff3366';
        ctx.fillText('STOP', W - 80, 20);
      } else if (isSingleArmed) {
        ctx.fillStyle = '#ffaa00';
        ctx.fillText('READY', W - 80, 20);
      } else {
        ctx.fillStyle = '#00ff66';
        ctx.fillText('TRIG\'D', W - 80, 20);
      }
    }

    // Power LED
    ctx.fillStyle = isPowered ? '#00e676' : '#1b3a24';
    ctx.beginPath(); ctx.arc(W - 18, 15, 3, 0, Math.PI * 2); ctx.fill();
    if (isPowered) {
      ctx.fillStyle = 'rgba(0,230,118,0.3)';
      ctx.beginPath(); ctx.arc(W - 18, 15, 6, 0, Math.PI * 2); ctx.fill();
    }

    // ── Screen Panel ──
    const scrX = 12, scrY = 32, scrW = 280, scrH = 170;
    ctx.fillStyle = '#020406';
    _rr(ctx, scrX - 2, scrY - 2, scrW + 4, scrH + 4, 5); ctx.fill();
    ctx.fillStyle = '#010204';
    _rr(ctx, scrX, scrY, scrW, scrH, 3); ctx.fill();
    ctx.strokeStyle = '#2a3040'; ctx.lineWidth = 1; ctx.stroke();

    // ── Phosphor Screen Clip ──
    ctx.save();
    _rr(ctx, scrX, scrY, scrW, scrH, 3);
    ctx.clip();

    // Screen Background Gradient
    const scrGrad = ctx.createRadialGradient(scrX + scrW / 2, scrY + scrH / 2, 20, scrX + scrW / 2, scrY + scrH / 2, scrW * 0.6);
    scrGrad.addColorStop(0, '#060a10');
    scrGrad.addColorStop(1, '#020306');
    ctx.fillStyle = scrGrad;
    ctx.fillRect(scrX, scrY, scrW, scrH);

    // ── Grid Graticule ──
    const divsX = 12, divsY = 8;
    const dW = scrW / divsX, dH = scrH / divsY;
    const cy = scrY + scrH / 2;
    const cx = scrX + scrW / 2;

    ctx.strokeStyle = '#0c1420';
    ctx.lineWidth = 0.6;
    for (let i = 1; i < divsX; i++) {
      const px = scrX + dW * i;
      ctx.beginPath(); ctx.moveTo(px, scrY); ctx.lineTo(px, scrY + scrH); ctx.stroke();
    }
    for (let i = 1; i < divsY; i++) {
      const py = scrY + dH * i;
      ctx.beginPath(); ctx.moveTo(scrX, py); ctx.lineTo(scrX + scrW, py); ctx.stroke();
    }

    // Center crosshair
    ctx.strokeStyle = '#182838';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(scrX, cy); ctx.lineTo(scrX + scrW, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, scrY); ctx.lineTo(cx, scrY + scrH); ctx.stroke();

    // Sub-tick marks
    ctx.fillStyle = '#203040';
    for (let i = 0; i <= divsX * 4; i++) {
      const tx = scrX + (scrW / (divsX * 4)) * i;
      ctx.fillRect(tx, cy - 1, 0.5, 2);
    }
    for (let i = 0; i <= divsY * 4; i++) {
      const ty = scrY + (scrH / (divsY * 4)) * i;
      ctx.fillRect(cx - 1, ty, 2, 0.5);
    }

    // ── Waveform Rendering ──
    const channels = [
      { id: 'ch1', en: P('ch1_en', true) !== false, col: '#ffe600', glow: '#ffe600', vdiv: P('ch1_vdiv', 1), pos: P('ch1_pos', 2), coup: P('ch1_coupling', 'dc') },
      { id: 'ch2', en: P('ch2_en', true) !== false, col: '#00e5ff', glow: '#00e5ff', vdiv: P('ch2_vdiv', 2), pos: P('ch2_pos', 0), coup: P('ch2_coupling', 'dc') },
      { id: 'ch3', en: P('ch3_en', false) !== false, col: '#ff3090', glow: '#ff3090', vdiv: P('ch3_vdiv', 5), pos: P('ch3_pos', -2), coup: P('ch3_coupling', 'dc') },
      { id: 'ch4', en: P('ch4_en', false) !== false, col: '#30ff60', glow: '#30ff60', vdiv: P('ch4_vdiv', 0.5), pos: P('ch4_pos', -3), coup: P('ch4_coupling', 'dc') },
    ];

    const buf = inst._buffers;
    const totalTime = P('timebase', 0.001) * divsX;

    if (isPowered) {

    channels.forEach((ch) => {
      if (!ch.en) return;
      const samples = buf && buf[ch.id] && buf[ch.id].length > 0 ? buf[ch.id] : null;
      const tS = buf && buf.t && buf.t.length > 0 ? buf.t : null;

      let meanV = 0;
      if (ch.coup === 'ac' && samples) {
        meanV = samples.reduce((a, b) => a + b, 0) / samples.length;
      }

      const pts = [];
      for (let px = 0; px < scrW; px++) {
        let v = 0;
        if (ch.coup === 'gnd') {
          v = 0;
        } else if (samples && tS && samples.length > 1) {
          const target = t - totalTime * (1 - px / scrW);
          let idx = samples.length - 1;
          for (let i = samples.length - 1; i >= 0; i--) {
            if (tS[i] <= target) { idx = i; break; }
          }
          v = samples[idx];
          if (ch.coup === 'ac') v -= meanV;
        } else {
          const omega = 2 * Math.PI / (totalTime * 0.4);
          const wavePhase = (t + (px / scrW) * totalTime) * omega;
          v = ch.id === 'ch1' ? Math.sin(wavePhase) * ch.vdiv * 1.5 :
              ch.id === 'ch2' ? (Math.sin(wavePhase * 2) > 0 ? ch.vdiv : -ch.vdiv) : 0;
        }
        pts.push({ px: scrX + px, py: cy - (v * (dH / ch.vdiv)) - (ch.pos * dH) });
      }

      // Glow layer
      ctx.strokeStyle = ch.glow;
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 4;
      ctx.shadowColor = ch.glow;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.px, p.py) : ctx.lineTo(p.px, p.py));
      ctx.stroke();

      // Main trace
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.px, p.py) : ctx.lineTo(p.px, p.py));
      ctx.stroke();

      // Bright core
      ctx.globalAlpha = 1;
      ctx.lineWidth = 0.6;
      ctx.shadowBlur = 2;
      ctx.beginPath();
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.px, p.py) : ctx.lineTo(p.px, p.py));
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      // Ground reference marker
      const baseY = cy - (ch.pos * dH);
      if (baseY >= scrY && baseY <= scrY + scrH) {
        ctx.fillStyle = ch.col;
        ctx.beginPath();
        ctx.moveTo(scrX, baseY);
        ctx.lineTo(scrX + 6, baseY - 3);
        ctx.lineTo(scrX + 6, baseY + 3);
        ctx.closePath(); ctx.fill();
      }
    });

    // ── Math Channel ──
    const mathOp = P('math_op', 'off');
    if (mathOp !== 'off' && buf && buf.ch1 && buf.ch1.length > 1) {
      const ch1Samples = buf.ch1;
      const ch2Samples = buf.ch2 || [];
      const mathPts = [];
      const minLen = Math.min(ch1Samples.length, ch2Samples.length);
      if (minLen > 0) {
        const pf1 = P('ch1_probe', 1);
        const pf2 = P('ch2_probe', 1);
        const vdiv = P('ch1_vdiv', 1);
        const pos = 0;
        for (let px = 0; px < scrW; px++) {
          const idx = Math.floor((px / scrW) * (minLen - 1));
          const v1 = (ch1Samples[idx] || 0) * pf1;
          const v2 = (ch2Samples[idx] || 0) * pf2;
          let vm = 0;
          if (mathOp === 'add') vm = v1 + v2;
          else if (mathOp === 'sub') vm = v1 - v2;
          else if (mathOp === 'abs') vm = Math.abs(v1 - v2);
          mathPts.push({ px: scrX + px, py: cy - (vm * (dH / vdiv)) - (pos * dH) });
        }
        // Math trace (magenta)
        ctx.strokeStyle = '#ff00ff';
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ff00ff';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        mathPts.forEach((p, i) => i === 0 ? ctx.moveTo(p.px, p.py) : ctx.lineTo(p.px, p.py));
        ctx.stroke();
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = 1.2;
        ctx.shadowBlur = 3;
        ctx.beginPath();
        mathPts.forEach((p, i) => i === 0 ? ctx.moveTo(p.px, p.py) : ctx.lineTo(p.px, p.py));
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
    }

    // ── Trigger Level Line ──
    const trigV = P('trig_level', 0);
    const trigCh = channels.find(c => c.id === (P('trig_source', 'ch1')));
    if (trigCh) {
      const trigY = cy - (trigV * (dH / trigCh.vdiv)) - (trigCh.pos * dH);
      if (trigY >= scrY && trigY <= scrY + scrH) {
        ctx.strokeStyle = 'rgba(255, 170, 0, 0.5)';
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(scrX, trigY); ctx.lineTo(scrX + scrW, trigY); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.moveTo(scrX + scrW, trigY);
        ctx.lineTo(scrX + scrW - 6, trigY - 3);
        ctx.lineTo(scrX + scrW - 6, trigY + 3);
        ctx.closePath(); ctx.fill();
      }
    }

    // Scan line effect
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    for (let sy = scrY; sy < scrY + scrH; sy += 2) {
      ctx.fillRect(scrX, sy, scrW, 1);
    }
    } else {
      ctx.fillStyle = '#111418';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('\u2014 STANDBY \u2014', scrX + scrW / 2, scrY + scrH / 2 + 4);
    }

    ctx.restore(); // End screen clip

    // ── Top OSD Bar ──
    const osdY = scrY + 4;
    ctx.fillStyle = 'rgba(2, 4, 8, 0.75)';
    _rr(ctx, scrX + 2, osdY, scrW - 4, 14, 2); ctx.fill();

    const _osd = (ox, txt, col, en) => {
      ctx.fillStyle = en ? col : '#303848';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(txt, ox, osdY + 10);
    };
    _osd(scrX + 8, '1:' + _fmtV(P('ch1_vdiv', 1)) + (P('ch1_coupling', 'dc') === 'ac' ? '~' : '='), '#ffe600', P('ch1_en', true) !== false);
    _osd(scrX + 72, '2:' + _fmtV(P('ch2_vdiv', 2)) + (P('ch2_coupling', 'dc') === 'ac' ? '~' : '='), '#00e5ff', P('ch2_en', true) !== false);
    _osd(scrX + 136, '3:' + _fmtV(P('ch3_vdiv', 5)) + (P('ch3_coupling', 'dc') === 'ac' ? '~' : '='), '#ff3090', P('ch3_en', false) !== false);
    _osd(scrX + 200, '4:' + _fmtV(P('ch4_vdiv', 0.5)) + (P('ch4_coupling', 'dc') === 'ac' ? '~' : '='), '#30ff60', P('ch4_en', false) !== false);

    // Timebase on right
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(_fmtT(P('timebase', 0.001)) + '/div', scrX + scrW - 8, osdY + 10);

    // Math channel label
    if (P('math_op', 'off') !== 'off') {
      ctx.fillStyle = '#ff00ff';
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'left';
      const mathLabel = P('math_op', 'off') === 'add' ? 'M:CH1+CH2' : P('math_op', 'off') === 'sub' ? 'M:CH1-CH2' : 'M:|CH1-CH2|';
      ctx.fillText(mathLabel, scrX + 8, osdY + 22);
    }

    // ── Bottom OSD Bar ──
    const osdBotY = scrY + scrH - 16;
    ctx.fillStyle = 'rgba(2, 4, 8, 0.75)';
    _rr(ctx, scrX + 2, osdBotY, scrW - 4, 14, 2); ctx.fill();

    ctx.fillStyle = '#ffaa00';
    ctx.font = '7px monospace';
    ctx.textAlign = 'left';
    const trigSrc = (P('trig_source', 'ch1')).toUpperCase();
    const trigSlope = P('trig_slope', 'rising') === 'falling' ? '\\' : '/';
    ctx.fillText('T:' + trigSrc + ' ' + trigSlope + ' ' + _fmtV(P('trig_level', 0)), scrX + 8, osdBotY + 10);

    ctx.fillStyle = '#7a889b';
    ctx.textAlign = 'right';
    ctx.fillText(P('trig_mode', 'auto') === 'norm' ? 'NORM' : P('trig_mode', 'auto') === 'single' ? 'SINGLE' : 'AUTO', scrX + scrW - 8, osdBotY + 10);

    // Sample rate
    if (buf && buf.t && buf.t.length > 1) {
      const totalTimeBuf = buf.t[buf.t.length - 1] - buf.t[0];
      const sampleRate = totalTimeBuf > 0 ? buf.t.length / totalTimeBuf : 0;
      if (sampleRate > 0) {
        ctx.fillStyle = '#4a5264';
        ctx.font = '6px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(_fmtRate(sampleRate), scrX + scrW / 2, osdBotY + 10);
      }
    }

    // ── Measurement Display (below screen) ──
    const measY = scrY + scrH + 4;
    const meas = inst._computeMeas || {};
    const measCh = channels.find(c => c.en) || channels[0];
    const m = meas[measCh.id];
    if (m && isPowered) {
      ctx.fillStyle = 'rgba(2, 4, 8, 0.6)';
      _rr(ctx, scrX, measY, scrW, 16, 2); ctx.fill();
      ctx.font = '6.5px monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = measCh.col;
      const freqStr = m.frequency > 0 ? ' f=' + _fmtFreq(m.frequency) : '';
      const vppStr = ' Vpp=' + _fmtV(m.vpp);
      const vrmsStr = ' Vrms=' + _fmtV(m.vrms);
      const dutyStr = m.dutyCycle > 0 ? ' D=' + m.dutyCycle.toFixed(1) + '%' : '';
      ctx.fillText(vppStr + vrmsStr + freqStr + dutyStr, scrX + 4, measY + 11);
    }

    // ── Right Panel Controls ──
    const panX = 306;

    ctx.fillStyle = isPowered ? '#1a1d24' : '#13151a';
    _rr(ctx, panX - 4, 32, W - panX + 4, scrH + 20, 6); ctx.fill();
    ctx.strokeStyle = '#2a2e38'; ctx.lineWidth = 0.8; ctx.stroke();

    ctx.fillStyle = isPowered ? '#4a5264' : '#2a2e38';
    ctx.font = 'bold 6px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CONTROLS', panX + 52, 42);

    // ── Rotary Knobs ──
    const _knob = (kx, ky, r, label, col) => {
      const kg = ctx.createRadialGradient(kx - 1.5, ky - 1.5, 0.5, kx, ky, r);
      kg.addColorStop(0, '#4a5060'); kg.addColorStop(0.6, '#282d38'); kg.addColorStop(1, '#14171e');
      ctx.fillStyle = kg;
      ctx.beginPath(); ctx.arc(kx, ky, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#0a0c10'; ctx.lineWidth = 1.5; ctx.stroke();

      ctx.strokeStyle = '#3a3f4a'; ctx.lineWidth = 0.4;
      for (let a = 0; a < Math.PI * 2; a += 0.3) {
        ctx.beginPath();
        ctx.moveTo(kx + Math.cos(a) * (r - 2), ky + Math.sin(a) * (r - 2));
        ctx.lineTo(kx + Math.cos(a) * (r - 0.5), ky + Math.sin(a) * (r - 0.5));
        ctx.stroke();
      }

      ctx.strokeStyle = col; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(kx, ky);
      ctx.lineTo(kx, ky - r + 3);
      ctx.stroke();

      ctx.fillStyle = '#5a6070';
      ctx.beginPath(); ctx.arc(kx, ky, 2, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#6a7488';
      ctx.font = '5.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, kx, ky + r + 9);
    };

    _knob(panX + 20, 68, 16, 'SEC/DIV', isPowered ? '#a0b0c0' : '#3a4050');
    _knob(panX + 60, 68, 16, 'VOLTS/DIV', isPowered ? '#a0b0c0' : '#3a4050');
    _knob(panX + 40, 120, 13, 'TRIG LVL', isPowered ? '#ffaa00' : '#3a3a2a');

    // ── Channel Buttons ──
    const _chBtn = (bx, by, lbl, col, active) => {
      const cbg = ctx.createLinearGradient(bx, by, bx, by + 16);
      cbg.addColorStop(0, active ? col : '#222830');
      cbg.addColorStop(1, active ? _darken(col, 0.3) : '#181c22');
      ctx.fillStyle = cbg;
      _rr(ctx, bx, by, 20, 16, 3); ctx.fill();
      ctx.strokeStyle = active ? '#0a0c10' : '#1a1e28'; ctx.lineWidth = 1; ctx.stroke();

      ctx.fillStyle = active ? col : '#2a3040';
      ctx.beginPath(); ctx.arc(bx + 10, by - 3, 2.5, 0, Math.PI * 2); ctx.fill();
      if (active) { ctx.shadowColor = col; ctx.shadowBlur = 4; ctx.beginPath(); ctx.arc(bx + 10, by - 3, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }

      ctx.fillStyle = active ? '#000000' : '#6a7488';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(lbl, bx + 10, by + 11);
    };

    const btnY = 155;
    _chBtn(panX + 4,  btnY, 'CH1', '#ffe600', isPowered && P('ch1_en', true) !== false);
    _chBtn(panX + 28, btnY, 'CH2', '#00e5ff', isPowered && P('ch2_en', true) !== false);
    _chBtn(panX + 52, btnY, 'CH3', '#ff3090', isPowered && P('ch3_en', false) !== false);
    _chBtn(panX + 76, btnY, 'CH4', '#30ff60', isPowered && P('ch4_en', false) !== false);

    // ── Run/Stop Button ──
    const rsY = 185;
    const rsBg = ctx.createLinearGradient(panX + 10, rsY, panX + 10, rsY + 30);
    if (isRunning) { rsBg.addColorStop(0, '#1a3520'); rsBg.addColorStop(1, '#0e2210'); }
    else { rsBg.addColorStop(0, '#351a1a'); rsBg.addColorStop(1, '#220e0e'); }
    ctx.fillStyle = rsBg;
    _rr(ctx, panX + 10, rsY, 38, 18, 4); ctx.fill();
    ctx.strokeStyle = '#0a0c10'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = isRunning ? '#00ff66' : '#ff3366';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isRunning ? 'RUN' : 'STOP', panX + 29, rsY + 12);

    // Single button
    const sglBg = ctx.createLinearGradient(panX + 52, rsY, panX + 52, rsY + 18);
    if (isSingleArmed) { sglBg.addColorStop(0, '#35351a'); sglBg.addColorStop(1, '#22220e'); }
    else { sglBg.addColorStop(0, '#222830'); sglBg.addColorStop(1, '#181c22'); }
    ctx.fillStyle = sglBg;
    _rr(ctx, panX + 52, rsY, 38, 18, 4); ctx.fill();
    ctx.strokeStyle = '#0a0c10'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = isSingleArmed ? '#ffaa00' : '#6a7488';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SINGLE', panX + 71, rsY + 12);

    // ── Fullscreen Button ──
    const fsX = panX + 52, fsY = rsY + 24;
    ctx.fillStyle = isPowered ? '#1a2550' : '#181c22';
    _rr(ctx, fsX - 20, fsY, 80, 16, 3); ctx.fill();
    ctx.strokeStyle = isPowered ? '#00979c' : '#2a2e38'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.fillStyle = isPowered ? '#00d4e6' : '#4a5264';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('\u26F6 FULLSCREEN', fsX + 20, fsY + 11);

    // ── Power toggle switch ──
    function drawToggleSwitch(tx, ty, tw, th, isOn, label) {
      ctx.fillStyle = '#0e1114';
      roundRect(ctx, tx, ty, tw, th, 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(80,90,100,0.4)';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      const trackW = tw * 0.7;
      const trackH = 8;
      const trackX = tx + (tw - trackW) / 2;
      const trackY = ty + th / 2 - 2;
      ctx.fillStyle = '#080a0c';
      roundRect(ctx, trackX, trackY, trackW, trackH, trackH / 2);
      ctx.fill();

      if (isOn) {
        const grad = ctx.createLinearGradient(trackX, 0, trackX + trackW, 0);
        grad.addColorStop(0, 'rgba(0,230,118,0.2)');
        grad.addColorStop(1, 'rgba(0,230,118,0.65)');
        ctx.fillStyle = grad;
        roundRect(ctx, trackX, trackY, trackW, trackH, trackH / 2);
        ctx.fill();
      }

      const thumbR = 5;
      const thumbX = isOn ? trackX + trackW - thumbR - 1 : trackX + thumbR + 1;
      const thumbY = trackY + trackH / 2;
      if (isFinite(thumbX) && isFinite(thumbY)) {
        const thumbGrad = ctx.createRadialGradient(thumbX - 1, thumbY - 1, 0.5, thumbX, thumbY, thumbR);
        thumbGrad.addColorStop(0, isOn ? '#c8e6c9' : '#b0bec5');
        thumbGrad.addColorStop(1, isOn ? '#2e7d32' : '#546e7a');
        ctx.fillStyle = thumbGrad;
        ctx.beginPath();
        ctx.arc(thumbX, thumbY, thumbR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }

      const ledX = tx + tw / 2;
      const ledY = ty + 5;
      ctx.fillStyle = isOn ? '#00e676' : '#1b3a24';
      ctx.beginPath(); ctx.arc(ledX, ledY, 2, 0, Math.PI * 2); ctx.fill();
      if (isOn) {
        ctx.fillStyle = 'rgba(0,230,118,0.3)';
        ctx.beginPath(); ctx.arc(ledX, ledY, 4.5, 0, Math.PI * 2); ctx.fill();
      }

      ctx.fillStyle = isOn ? '#eceff1' : '#78909c';
      ctx.font = 'bold 5.5px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, tx + tw / 2, ty + th - 3);
    }

    drawToggleSwitch(388, 38, 26, 42, isPowered, 'POWER');

    // ── BNC Connectors ──
    const _bnc = (bx, by, lbl, col) => {
      ctx.fillStyle = '#2a2e38';
      ctx.beginPath(); ctx.arc(bx, by, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a4050';
      ctx.beginPath(); ctx.arc(bx, by, 10, 0, Math.PI * 2); ctx.fill();
      const mg = ctx.createLinearGradient(bx - 7, by - 7, bx + 7, by + 7);
      mg.addColorStop(0, '#c8d0da'); mg.addColorStop(0.4, '#8090a0');
      mg.addColorStop(0.6, '#606878'); mg.addColorStop(1, '#3a4050');
      ctx.fillStyle = mg;
      ctx.beginPath(); ctx.arc(bx, by, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0c0e12';
      ctx.beginPath(); ctx.arc(bx, by, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(bx, by, 2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.4;
      ctx.beginPath(); ctx.arc(bx, by, 10.5, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = col;
      ctx.font = 'bold 7px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(lbl, bx, by + 18);
    };

    const bncY = 248;
    if (isPowered) {
      _bnc(50,  bncY, 'CH1', '#ffe600');
      _bnc(120, bncY, 'CH2', '#00e5ff');
      _bnc(190, bncY, 'CH3', '#ff3090');
      _bnc(260, bncY, 'CH4', '#30ff60');
      _bnc(350, bncY, 'GND', '#7a889b');
    } else {
      _bnc(50,  bncY, 'CH1', '#3a4050');
      _bnc(120, bncY, 'CH2', '#3a4050');
      _bnc(190, bncY, 'CH3', '#3a4050');
      _bnc(260, bncY, 'CH4', '#3a4050');
      _bnc(350, bncY, 'GND', '#3a4050');
    }

    // ── Bottom Edge Label ──
    ctx.fillStyle = '#2a2e38';
    ctx.fillRect(10, H - 38, W - 20, 1);
    ctx.fillStyle = isPowered ? '#3a4050' : '#22262f';
    ctx.font = '5px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('4-CHANNEL DIGITAL STORAGE OSCILLOSCOPE  |  100MHz  |  1 GSa/s', W / 2, H - 28);

    // ── Selection ──
    if (inst.selected && typeof drawSelectionRect === 'function') {
      drawSelectionRect(ctx, -4, -4, W + 8, H + 8);
    }

    ctx.restore();
  }
});

/* ── Measurement Engine ── */
function dsoComputeMeasurements(samples, timebase, divsX) {
  if (!samples || samples.length < 2) return { vmax: 0, vmin: 0, vpp: 0, vrms: 0, mean: 0, frequency: 0, period: 0, dutyCycle: 0 };
  let vmax = -Infinity, vmin = Infinity, sum = 0, sumSq = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i];
    if (v > vmax) vmax = v;
    if (v < vmin) vmin = v;
    sum += v;
    sumSq += v * v;
  }
  if (!isFinite(vmax)) vmax = 0;
  if (!isFinite(vmin)) vmin = 0;
  const vpp = vmax - vmin;
  const mean = samples.length > 0 ? sum / samples.length : 0;
  const vrms = samples.length > 0 ? Math.sqrt(sumSq / samples.length) : 0;

  // Frequency from zero crossings
  let crossings = 0;
  for (let i = 1; i < samples.length; i++) {
    if ((samples[i - 1] < 0 && samples[i] >= 0) || (samples[i - 1] >= 0 && samples[i] < 0)) {
      crossings++;
    }
  }
  const totalTime = timebase * divsX;
  const frequency = crossings > 1 ? (crossings / 2) / totalTime : 0;
  const period = frequency > 0 ? 1 / frequency : 0;

  // Duty cycle
  let highCount = 0;
  for (let i = 0; i < samples.length; i++) {
    if (samples[i] > 0) highCount++;
  }
  const dutyCycle = samples.length > 0 ? (highCount / samples.length) * 100 : 0;

  return { vmax, vmin, vpp, vrms, mean, frequency, period, dutyCycle };
}

/* ── Probe Finder ── */
function _dsoFindProbe(probeType) {
  const canvas = window.CircuitCanvas;
  if (!canvas) return null;
  const comps = canvas.components || [];
  for (let i = 0; i < comps.length; i++) {
    if (comps[i].type === probeType) return comps[i];
  }
  return null;
}

/* ── Helpers ── */
function _darken(hex, amt) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * (1 - amt))},${Math.round(g * (1 - amt))},${Math.round(b * (1 - amt))})`;
}

function _fmtT(s) {
  if (s >= 1) return s.toFixed(1) + 's';
  if (s >= 1e-3) return (s * 1e3).toFixed(0) + 'ms';
  if (s >= 1e-6) return (s * 1e6).toFixed(0) + 'us';
  return (s * 1e9).toFixed(0) + 'ns';
}

function _fmtV(v) {
  if (Math.abs(v) >= 1) return v.toFixed(v % 1 === 0 ? 0 : 1) + 'V';
  return (v * 1000).toFixed(0) + 'mV';
}

function _fmtFreq(f) {
  if (f >= 1e6) return (f / 1e6).toFixed(2) + 'MHz';
  if (f >= 1e3) return (f / 1e3).toFixed(2) + 'kHz';
  return f.toFixed(1) + 'Hz';
}

function _fmtRate(r) {
  if (r >= 1e9) return (r / 1e9).toFixed(1) + 'GSa/s';
  if (r >= 1e6) return (r / 1e6).toFixed(1) + 'MSa/s';
  if (r >= 1e3) return (r / 1e3).toFixed(1) + 'KSa/s';
  return r.toFixed(0) + 'Sa/s';
}
