'use strict';

defComp({
  id: 'dso_4ch',
  name: '4-Channel Digital Storage Oscilloscope',
  category: 'Instruments',
  icon: '∿',
  desc: '4-Channel DSO with phosphor display, AC/DC coupling, trigger, and interactive controls.',

  width: 420,
  height: 300,

  defaultProps: {
    timebase: 0.001,
    trig_source: 'ch1',
    trig_level: 0.0,
    trig_mode: 'auto',
    trig_slope: 'rising',
    ch1_en: true,  ch1_vdiv: 1.0,  ch1_pos: 2.0,  ch1_coupling: 'dc',
    ch2_en: true,  ch2_vdiv: 2.0,  ch2_pos: 0.0,  ch2_coupling: 'dc',
    ch3_en: false, ch3_vdiv: 5.0,  ch3_pos: -2.0, ch3_coupling: 'dc',
    ch4_en: false, ch4_vdiv: 0.5,  ch4_pos: -3.0, ch4_coupling: 'dc',
  },

  interactive: [
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
    if (!inst._buffers) {
      inst._buffers = { ch1: [], ch2: [], ch3: [], ch4: [], t: [] };
    }
    const t = sim && typeof sim.time === 'number' ? sim.time : performance.now() / 1000;
    const avSim = window.ArduinoSim;
    const readV = (pin) => {
      if (sim && typeof sim.getPinVoltage === 'function') return sim.getPinVoltage(inst, pin);
      if (avSim && typeof avSim.getPinVoltage === 'function') return avSim.getPinVoltage(inst, pin);
      return 0;
    };
    const readChannel = (pin, probeType) => {
      // Wire-based reading (existing)
      const wireV = readV(pin);
      if (Math.abs(wireV) > 0.001) return wireV;
      // Dedicated DSO probe reading (no wire needed)
      const probe = _dsoFindProbe(probeType);
      return probe && probe.runtimeState ? (probe.runtimeState.voltage || 0) : 0;
    };
    inst._buffers.ch1.push(readChannel('ch1_in', 'dso_probe_ch1'));
    inst._buffers.ch2.push(readChannel('ch2_in', 'dso_probe_ch2'));
    inst._buffers.ch3.push(readChannel('ch3_in', 'dso_probe_ch3'));
    inst._buffers.ch4.push(readChannel('ch4_in', 'dso_probe_ch4'));
    inst._buffers.t.push(t);
    if (inst._buffers.t.length > 500) {
      inst._buffers.ch1.shift(); inst._buffers.ch2.shift();
      inst._buffers.ch3.shift(); inst._buffers.ch4.shift();
      inst._buffers.t.shift();
    }
  },

  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const props = inst.props || {};
    const W = 420, H = 300;
    const t = sim && typeof sim.time === 'number' ? sim.time : performance.now() / 1000;

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
    ctx.fillStyle = '#00d4e6';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('DSO-4100', 18, 20);

    ctx.fillStyle = '#606878';
    ctx.font = '7px sans-serif';
    ctx.fillText('4-CH DIGITAL STORAGE OSCILLOSCOPE', 82, 20);

    // Trigger Status
    ctx.fillStyle = '#00ff66';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('TRIG\'D', W - 18, 20);

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

    // Screen Background Gradient (subtle vignette)
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

    // Main grid lines
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

    // Center crosshair (brighter)
    ctx.strokeStyle = '#182838';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(scrX, cy); ctx.lineTo(scrX + scrW, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, scrY); ctx.lineTo(cx, scrY + scrH); ctx.stroke();

    // Sub-tick marks on center axes
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
      { id: 'ch1', en: props.ch1_en !== false, col: '#ffe600', glow: '#ffe600', vdiv: props.ch1_vdiv || 1, pos: props.ch1_pos || 0, coup: props.ch1_coupling || 'dc' },
      { id: 'ch2', en: props.ch2_en !== false, col: '#00e5ff', glow: '#00e5ff', vdiv: props.ch2_vdiv || 2, pos: props.ch2_pos || 0, coup: props.ch2_coupling || 'dc' },
      { id: 'ch3', en: props.ch3_en !== false, col: '#ff3090', glow: '#ff3090', vdiv: props.ch3_vdiv || 5, pos: props.ch3_pos || 0, coup: props.ch3_coupling || 'dc' },
      { id: 'ch4', en: props.ch4_en !== false, col: '#30ff60', glow: '#30ff60', vdiv: props.ch4_vdiv || 0.5, pos: props.ch4_pos || 0, coup: props.ch4_coupling || 'dc' },
    ];

    const buf = inst._buffers;
    const totalTime = (props.timebase || 0.001) * divsX;

    channels.forEach((ch) => {
      if (!ch.en) return;
      const samples = buf && buf[ch.id] && buf[ch.id].length > 0 ? buf[ch.id] : null;
      const tS = buf && buf.t && buf.t.length > 0 ? buf.t : null;

      let meanV = 0;
      if (ch.coup === 'ac' && samples) {
        meanV = samples.reduce((a, b) => a + b, 0) / samples.length;
      }

      // Build path points
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

      // Glow layer (wider, dimmer)
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

      // Ground reference marker (left edge triangle)
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

    // ── Trigger Level Line ──
    const trigV = props.trig_level || 0;
    const trigCh = channels.find(c => c.id === (props.trig_source || 'ch1'));
    if (trigCh) {
      const trigY = cy - (trigV * (dH / trigCh.vdiv)) - (trigCh.pos * dH);
      if (trigY >= scrY && trigY <= scrY + scrH) {
        ctx.strokeStyle = 'rgba(255, 170, 0, 0.5)';
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(scrX, trigY); ctx.lineTo(scrX + scrW, trigY); ctx.stroke();
        ctx.setLineDash([]);
        // Trigger arrow marker
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.moveTo(scrX + scrW, trigY);
        ctx.lineTo(scrX + scrW - 6, trigY - 3);
        ctx.lineTo(scrX + scrW - 6, trigY + 3);
        ctx.closePath(); ctx.fill();
      }
    }

    // Scan line effect (subtle horizontal lines)
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    for (let sy = scrY; sy < scrY + scrH; sy += 2) {
      ctx.fillRect(scrX, sy, scrW, 1);
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
    _osd(scrX + 8, '1:' + _fmtV(props.ch1_vdiv || 1) + (props.ch1_coupling === 'ac' ? '~' : '='), '#ffe600', props.ch1_en !== false);
    _osd(scrX + 72, '2:' + _fmtV(props.ch2_vdiv || 2) + (props.ch2_coupling === 'ac' ? '~' : '='), '#00e5ff', props.ch2_en !== false);
    _osd(scrX + 136, '3:' + _fmtV(props.ch3_vdiv || 5) + (props.ch3_coupling === 'ac' ? '~' : '='), '#ff3090', props.ch3_en !== false);
    _osd(scrX + 200, '4:' + _fmtV(props.ch4_vdiv || 0.5) + (props.ch4_coupling === 'ac' ? '~' : '='), '#30ff60', props.ch4_en !== false);

    // Timebase on right
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(_fmtT(props.timebase || 0.001) + '/div', scrX + scrW - 8, osdY + 10);

    // ── Bottom OSD Bar ──
    const osdBotY = scrY + scrH - 16;
    ctx.fillStyle = 'rgba(2, 4, 8, 0.75)';
    _rr(ctx, scrX + 2, osdBotY, scrW - 4, 14, 2); ctx.fill();

    // Trigger info
    ctx.fillStyle = '#ffaa00';
    ctx.font = '7px monospace';
    ctx.textAlign = 'left';
    const trigSrc = (props.trig_source || 'ch1').toUpperCase();
    const trigSlope = props.trig_slope === 'falling' ? '\\' : '/';
    ctx.fillText('T:' + trigSrc + ' ' + trigSlope + ' ' + _fmtV(props.trig_level || 0), scrX + 8, osdBotY + 10);

    // Trigger mode
    ctx.fillStyle = '#7a889b';
    ctx.textAlign = 'right';
    ctx.fillText(props.trig_mode === 'norm' ? 'NORM' : 'AUTO', scrX + scrW - 8, osdBotY + 10);

    // ── Right Panel Controls ──
    const panX = 306;

    // Panel background
    ctx.fillStyle = '#1a1d24';
    _rr(ctx, panX - 4, 32, W - panX + 4, scrH + 20, 6); ctx.fill();
    ctx.strokeStyle = '#2a2e38'; ctx.lineWidth = 0.8; ctx.stroke();

    // Panel label
    ctx.fillStyle = '#4a5264';
    ctx.font = 'bold 6px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CONTROLS', panX + 52, 42);

    // ── Rotary Knobs ──
    const _knob = (kx, ky, r, label, col) => {
      // Knob body
      const kg = ctx.createRadialGradient(kx - 1.5, ky - 1.5, 0.5, kx, ky, r);
      kg.addColorStop(0, '#4a5060'); kg.addColorStop(0.6, '#282d38'); kg.addColorStop(1, '#14171e');
      ctx.fillStyle = kg;
      ctx.beginPath(); ctx.arc(kx, ky, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#0a0c10'; ctx.lineWidth = 1.5; ctx.stroke();

      // Knurled ring
      ctx.strokeStyle = '#3a3f4a'; ctx.lineWidth = 0.4;
      for (let a = 0; a < Math.PI * 2; a += 0.3) {
        ctx.beginPath();
        ctx.moveTo(kx + Math.cos(a) * (r - 2), ky + Math.sin(a) * (r - 2));
        ctx.lineTo(kx + Math.cos(a) * (r - 0.5), ky + Math.sin(a) * (r - 0.5));
        ctx.stroke();
      }

      // Position indicator line
      ctx.strokeStyle = col; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(kx, ky);
      ctx.lineTo(kx, ky - r + 3);
      ctx.stroke();

      // Center dot
      ctx.fillStyle = '#5a6070';
      ctx.beginPath(); ctx.arc(kx, ky, 2, 0, Math.PI * 2); ctx.fill();

      // Label
      ctx.fillStyle = '#6a7488';
      ctx.font = '5.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, kx, ky + r + 9);
    };

    _knob(panX + 20, 68, 16, 'SEC/DIV', '#a0b0c0');
    _knob(panX + 60, 68, 16, 'VOLTS/DIV', '#a0b0c0');
    _knob(panX + 40, 120, 13, 'TRIG LVL', '#ffaa00');

    // ── Channel Buttons ──
    const _chBtn = (bx, by, lbl, col, active) => {
      // Button body
      const cbg = ctx.createLinearGradient(bx, by, bx, by + 16);
      cbg.addColorStop(0, active ? col : '#222830');
      cbg.addColorStop(1, active ? _darken(col, 0.3) : '#181c22');
      ctx.fillStyle = cbg;
      _rr(ctx, bx, by, 20, 16, 3); ctx.fill();
      ctx.strokeStyle = active ? '#0a0c10' : '#1a1e28'; ctx.lineWidth = 1; ctx.stroke();

      // LED indicator
      ctx.fillStyle = active ? col : '#2a3040';
      ctx.beginPath(); ctx.arc(bx + 10, by - 3, 2.5, 0, Math.PI * 2); ctx.fill();
      if (active) { ctx.shadowColor = col; ctx.shadowBlur = 4; ctx.beginPath(); ctx.arc(bx + 10, by - 3, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }

      // Label
      ctx.fillStyle = active ? '#000000' : '#6a7488';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(lbl, bx + 10, by + 11);
    };

    const btnY = 155;
    _chBtn(panX + 4,  btnY, 'CH1', '#ffe600', props.ch1_en !== false);
    _chBtn(panX + 28, btnY, 'CH2', '#00e5ff', props.ch2_en !== false);
    _chBtn(panX + 52, btnY, 'CH3', '#ff3090', props.ch3_en !== false);
    _chBtn(panX + 76, btnY, 'CH4', '#30ff60', props.ch4_en !== false);

    // ── Run/Stop Button ──
    const rsY = 185;
    const rsGrad = ctx.createLinearGradient(panX + 10, rsY, panX + 10, rsY + 16);
    rsGrad.addColorStop(0, '#28c85a'); rsGrad.addColorStop(1, '#1a9040');
    ctx.fillStyle = rsGrad;
    _rr(ctx, panX + 10, rsY, 80, 16, 4); ctx.fill();
    ctx.strokeStyle = '#0a1a0e'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('RUN / STOP', panX + 50, rsY + 11);

    // ── BNC Connectors ──
    const _bnc = (bx, by, lbl, col) => {
      // Mounting hole
      ctx.fillStyle = '#2a2e38';
      ctx.beginPath(); ctx.arc(bx, by, 12, 0, Math.PI * 2); ctx.fill();

      // Outer hex ring
      ctx.fillStyle = '#3a4050';
      ctx.beginPath(); ctx.arc(bx, by, 10, 0, Math.PI * 2); ctx.fill();

      // Metallic shield
      const mg = ctx.createLinearGradient(bx - 7, by - 7, bx + 7, by + 7);
      mg.addColorStop(0, '#c8d0da'); mg.addColorStop(0.4, '#8090a0');
      mg.addColorStop(0.6, '#606878'); mg.addColorStop(1, '#3a4050');
      ctx.fillStyle = mg;
      ctx.beginPath(); ctx.arc(bx, by, 8, 0, Math.PI * 2); ctx.fill();

      // Inner dielectric
      ctx.fillStyle = '#0c0e12';
      ctx.beginPath(); ctx.arc(bx, by, 5, 0, Math.PI * 2); ctx.fill();

      // Center pin
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(bx, by, 2, 0, Math.PI * 2); ctx.fill();

      // Color ring around BNC
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.4;
      ctx.beginPath(); ctx.arc(bx, by, 10.5, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;

      // Label
      ctx.fillStyle = col;
      ctx.font = 'bold 7px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(lbl, bx, by + 18);
    };

    const bncY = 248;
    _bnc(50,  bncY, 'CH1', '#ffe600');
    _bnc(120, bncY, 'CH2', '#00e5ff');
    _bnc(190, bncY, 'CH3', '#ff3090');
    _bnc(260, bncY, 'CH4', '#30ff60');
    _bnc(350, bncY, 'GND', '#7a889b');

    // ── Bottom Edge Label ──
    ctx.fillStyle = '#2a2e38';
    ctx.fillRect(10, H - 38, W - 20, 1);
    ctx.fillStyle = '#3a4050';
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

function _dsoFindProbe(probeType) {
  const canvas = window.CircuitCanvas;
  if (!canvas) return null;
  const comps = canvas.components || [];
  for (let i = 0; i < comps.length; i++) {
    if (comps[i].type === probeType) return comps[i];
  }
  return null;
}

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
