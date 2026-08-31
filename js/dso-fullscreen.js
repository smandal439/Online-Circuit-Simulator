'use strict';

/* ═══════════════════════════════════════════════════════
   dso-fullscreen.js — Fullscreen DSO Overlay
   High-resolution rendering, smooth cursors, keyboard shortcuts,
   measurements, controls, responsive layout
   ═══════════════════════════════════════════════════════ */

class DSOFullscreen {
  constructor() {
    this.overlay = document.getElementById('dso-fullscreen-overlay');
    this.canvas = document.getElementById('dso-fullscreen-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.inst = null;
    this.visible = false;

    // Cursor target positions (where we're animating to)
    this.timeCursorA = null;
    this.timeCursorB = null;
    this.voltCursorA = null;
    this.voltCursorB = null;

    // Smooth cursor interpolated positions
    this._smoothTCA = null;
    this._smoothTCB = null;
    this._smoothVCA = null;
    this._smoothVCB = null;

    // Cursor dragging state
    this._dragCursor = null;
    this._dragOffset = 0;

    // Screen geometry (computed on render)
    this._scrX = 0;
    this._scrY = 0;
    this._scrW = 0;
    this._scrH = 0;
    this._dW = 0;
    this._dH = 0;
    this._cy = 0;
    this._cx = 0;

    // Layout info for responsive design
    this._ctrlW = 260;
    this._fontSize = 1;
    this._isCompact = false;

    // ResizeObserver for responsive layout
    this._ro = null;

    this._bindEvents();
    this._bindControls();

    this._rafId = null;
  }

  open(inst) {
    this.inst = inst;
    this.visible = true;
    this.timeCursorA = null;
    this.timeCursorB = null;
    this.voltCursorA = null;
    this.voltCursorB = null;
    this._smoothTCA = null;
    this._smoothTCB = null;
    this._smoothVCA = null;
    this._smoothVCB = null;
    this.overlay.classList.remove('hidden');
    this._resize();
    this._syncControlsFromInst();
    this._startRender();

    // Re-create ResizeObserver if needed
    if (window.ResizeObserver && this.canvas?.parentElement && !this._ro) {
      this._ro = new ResizeObserver(() => { if (this.visible) this._resize(); });
      this._ro.observe(this.canvas.parentElement);
    }
  }

  close() {
    this.visible = false;
    this.overlay.classList.add('hidden');
    this._stopRender();
    if (this._ro) { this._ro.disconnect(); this._ro = null; }
  }

  _resize() {
    if (!this.canvas) return;
    const wrap = this.canvas.parentElement;
    if (!wrap) return;
    const dpr = window.devicePixelRatio || 1;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.scale(dpr, dpr);
    this._canvasW = w;
    this._canvasH = h;

    // Responsive layout calculations
    if (w < 700) {
      this._ctrlW = 180;
      this._fontSize = 0.75;
      this._isCompact = true;
    } else if (w < 1000) {
      this._ctrlW = 220;
      this._fontSize = 0.85;
      this._isCompact = false;
    } else {
      this._ctrlW = 260;
      this._fontSize = 1;
      this._isCompact = false;
    }
  }

  _startRender() {
    const loop = () => {
      if (!this.visible) return;
      this._render();
      this._rafId = requestAnimationFrame(loop);
    };
    this._rafId = requestAnimationFrame(loop);
  }

  _stopRender() {
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = null;
  }

  /* ══════════════ RENDERING ══════════════ */
  _render() {
    const ctx = this.ctx;
    const inst = this.inst;
    if (!ctx || !inst) return;

    const W = this._canvasW;
    const H = this._canvasH;
    const rs = inst.runtimeState || {};
    const props = inst.props || {};
    const P = (field, def) => (rs[field] !== undefined) ? rs[field] : (props[field] ?? def);
    const fs = this._fontSize;

    const isPowered = Boolean(rs.powered ?? props.powered ?? 1);
    const isRunning = rs.runStop !== undefined ? Boolean(rs.runStop) : Boolean(props.runStop ?? 1);
    const isSingleArmed = rs.singleTrigger !== undefined ? Boolean(rs.singleTrigger) : Boolean(props.singleTrigger ?? 0);

    // Screen area (fills most of the canvas, leaving room for controls on right)
    const ctrlW = this._ctrlW;
    const scrPadding = this._isCompact ? 8 : 16;
    const scrX = scrPadding;
    const scrY = scrPadding;
    const scrW = Math.max(150, W - ctrlW - scrPadding * 3);
    const measH = this._isCompact ? 0 : 80;
    const scrH = Math.max(80, H - scrPadding * 2 - 60 - measH);
    this._scrX = scrX;
    this._scrY = scrY;
    this._scrW = scrW;
    this._scrH = scrH;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);

    // ── Screen bezel ──
    ctx.fillStyle = '#020406';
    this._rr(ctx, scrX - 3, scrY - 3, scrW + 6, scrH + 6, 6);
    ctx.fill();
    ctx.strokeStyle = '#2a3040';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // ── Screen background ──
    ctx.save();
    this._rr(ctx, scrX, scrY, scrW, scrH, 4);
    ctx.clip();

    const scrGrad = ctx.createRadialGradient(scrX + scrW / 2, scrY + scrH / 2, 20, scrX + scrW / 2, scrY + scrH / 2, scrW * 0.6);
    scrGrad.addColorStop(0, '#060a10');
    scrGrad.addColorStop(1, '#020306');
    ctx.fillStyle = scrGrad;
    ctx.fillRect(scrX, scrY, scrW, scrH);

    // ── Grid ──
    const divsX = 12, divsY = 8;
    const dW = scrW / divsX, dH = scrH / divsY;
    const cy = scrY + scrH / 2;
    const cx = scrX + scrW / 2;
    this._dW = dW;
    this._dH = dH;
    this._cy = cy;
    this._cx = cx;

    ctx.strokeStyle = '#0c1420';
    ctx.lineWidth = 0.5;
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

    // Sub-ticks
    ctx.fillStyle = '#203040';
    for (let i = 0; i <= divsX * 4; i++) {
      const tx = scrX + (scrW / (divsX * 4)) * i;
      ctx.fillRect(tx, cy - 1.5, 0.7, 3);
    }
    for (let i = 0; i <= divsY * 4; i++) {
      const ty = scrY + (scrH / (divsY * 4)) * i;
      ctx.fillRect(cx - 1.5, ty, 3, 0.7);
    }

    // ── Waveforms ──
    const t = inst._lastSimTime || performance.now() / 1000;
    const buf = inst._buffers;
    const totalTime = P('timebase', 0.001) * divsX;

    // Binary search: find index i where tS[i] <= target < tS[i+1]
    const _fsBinSearch = (tS, target) => {
      let lo = 0, hi = tS.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (tS[mid] <= target) lo = mid; else hi = mid - 1;
      }
      return lo;
    };

    if (isPowered) {
      const channels = [
        { id: 'ch1', en: P('ch1_en', true) !== false, col: '#ffe600', glow: '#ffe600', vdiv: P('ch1_vdiv', 1), pos: P('ch1_pos', 2), coup: P('ch1_coupling', 'dc') },
        { id: 'ch2', en: P('ch2_en', true) !== false, col: '#00e5ff', glow: '#00e5ff', vdiv: P('ch2_vdiv', 2), pos: P('ch2_pos', 0), coup: P('ch2_coupling', 'dc') },
        { id: 'ch3', en: P('ch3_en', false) !== false, col: '#ff3090', glow: '#ff3090', vdiv: P('ch3_vdiv', 5), pos: P('ch3_pos', -2), coup: P('ch3_coupling', 'dc') },
        { id: 'ch4', en: P('ch4_en', false) !== false, col: '#30ff60', glow: '#30ff60', vdiv: P('ch4_vdiv', 0.5), pos: P('ch4_pos', -3), coup: P('ch4_coupling', 'dc') },
      ];

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
            const idx = _fsBinSearch(tS, target);
            // Linear interpolation between bracketing samples
            if (idx < samples.length - 1 && tS[idx + 1] !== tS[idx]) {
              const frac = (target - tS[idx]) / (tS[idx + 1] - tS[idx]);
              v = samples[idx] + (samples[idx + 1] - samples[idx]) * Math.max(0, Math.min(1, frac));
            } else {
              v = samples[idx];
            }
            if (ch.coup === 'ac') v -= meanV;
          } else {
            const omega = 2 * Math.PI / (totalTime * 0.4);
            const wavePhase = (t + (px / scrW) * totalTime) * omega;
            v = ch.id === 'ch1' ? Math.sin(wavePhase) * ch.vdiv * 1.5 :
                ch.id === 'ch2' ? (Math.sin(wavePhase * 2) > 0 ? ch.vdiv : -ch.vdiv) : 0;
          }
          pts.push({ px: scrX + px, py: cy - (v * (dH / ch.vdiv)) - (ch.pos * dH) });
        }

        // Glow
        ctx.strokeStyle = ch.glow;
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = 5;
        ctx.shadowColor = ch.glow;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.px, p.py) : ctx.lineTo(p.px, p.py));
        ctx.stroke();

        // Main trace
        ctx.globalAlpha = 0.9;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.px, p.py) : ctx.lineTo(p.px, p.py));
        ctx.stroke();

        // Bright core
        ctx.globalAlpha = 1;
        ctx.lineWidth = 0.8;
        ctx.shadowBlur = 2;
        ctx.beginPath();
        pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.px, p.py) : ctx.lineTo(p.px, p.py));
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        // Ground marker
        const baseY = cy - (ch.pos * dH);
        if (baseY >= scrY && baseY <= scrY + scrH) {
          ctx.fillStyle = ch.col;
          ctx.beginPath();
          ctx.moveTo(scrX, baseY);
          ctx.lineTo(scrX + 8, baseY - 4);
          ctx.lineTo(scrX + 8, baseY + 4);
          ctx.closePath(); ctx.fill();
        }
      });

      // ── Math Channel ──
      const mathOp = P('math_op', 'off');
      if (mathOp !== 'off' && buf && buf.ch1 && buf.ch1.length > 1 && tS) {
        const ch1Samples = buf.ch1;
        const ch2Samples = buf.ch2 || [];
        const mathPts = [];
        const pf1 = P('ch1_probe', 1);
        const pf2 = P('ch2_probe', 1);
        const vdiv = P('ch1_vdiv', 1);
        for (let px = 0; px < scrW; px++) {
          const target = t - totalTime * (1 - px / scrW);
          const idx = _fsBinSearch(tS, target);
          const v1 = (ch1Samples[idx] || 0) * pf1;
          const v2 = (ch2Samples[idx] || 0) * pf2;
          let vm = 0;
          if (mathOp === 'add') vm = v1 + v2;
          else if (mathOp === 'sub') vm = v1 - v2;
          else if (mathOp === 'abs') vm = Math.abs(v1 - v2);
          mathPts.push({ px: scrX + px, py: cy - (vm * (dH / vdiv)) });
        }
        ctx.strokeStyle = '#ff00ff';
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 4;
        ctx.shadowColor = '#ff00ff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        mathPts.forEach((p, i) => i === 0 ? ctx.moveTo(p.px, p.py) : ctx.lineTo(p.px, p.py));
        ctx.stroke();
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        mathPts.forEach((p, i) => i === 0 ? ctx.moveTo(p.px, p.py) : ctx.lineTo(p.px, p.py));
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }

      // ── Trigger Level Line ──
      const trigV = P('trig_level', 0);
      const trigCh = channels.find(c => c.id === (P('trig_source', 'ch1')));
      if (trigCh) {
        const trigY = cy - (trigV * (dH / trigCh.vdiv)) - (trigCh.pos * dH);
        if (trigY >= scrY && trigY <= scrY + scrH) {
          ctx.strokeStyle = 'rgba(255, 170, 0, 0.5)';
          ctx.setLineDash([5, 4]);
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(scrX, trigY); ctx.lineTo(scrX + scrW, trigY); ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = '#ffaa00';
          ctx.beginPath();
          ctx.moveTo(scrX + scrW, trigY);
          ctx.lineTo(scrX + scrW - 8, trigY - 4);
          ctx.lineTo(scrX + scrW - 8, trigY + 4);
          ctx.closePath(); ctx.fill();
        }
      }

      // Scan lines
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      for (let sy = scrY; sy < scrY + scrH; sy += 3) {
        ctx.fillRect(scrX, sy, scrW, 1);
      }
    } else {
      ctx.fillStyle = '#111418';
      ctx.font = `bold ${Math.round(16 * this._fontSize)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('\u2014 STANDBY \u2014', scrX + scrW / 2, scrY + scrH / 2 + 5);
    }

    // ── Smooth Cursor Interpolation (lerp) ──
    const lerp = (a, b, t) => a + (b - a) * t;
    const smoothing = 0.25;
    if (this.timeCursorA !== null) this._smoothTCA = lerp(this._smoothTCA ?? this.timeCursorA, this.timeCursorA, smoothing);
    else this._smoothTCA = null;
    if (this.timeCursorB !== null) this._smoothTCB = lerp(this._smoothTCB ?? this.timeCursorB, this.timeCursorB, smoothing);
    else this._smoothTCB = null;
    if (this.voltCursorA !== null) this._smoothVCA = lerp(this._smoothVCA ?? this.voltCursorA, this.voltCursorA, smoothing);
    else this._smoothVCA = null;
    if (this.voltCursorB !== null) this._smoothVCB = lerp(this._smoothVCB ?? this.voltCursorB, this.voltCursorB, smoothing);
    else this._smoothVCB = null;

    // ── Time Cursors ──
    if (this._smoothTCA !== null) {
      const xA = this._smoothTCA;
      ctx.strokeStyle = 'rgba(255, 230, 0, 0.7)';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(xA, scrY); ctx.lineTo(xA, scrY + scrH); ctx.stroke();
      ctx.setLineDash([]);
      // Cursor label
      ctx.fillStyle = 'rgba(255, 230, 0, 0.9)';
      ctx.font = `${Math.round(8 * fs)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('A', xA, scrY - 4);
    }
    if (this._smoothTCB !== null) {
      const xB = this._smoothTCB;
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.7)';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(xB, scrY); ctx.lineTo(xB, scrY + scrH); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(0, 229, 255, 0.9)';
      ctx.font = `${Math.round(8 * fs)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('B', xB, scrY - 4);
    }

    // ── Voltage Cursors ──
    if (this._smoothVCA !== null) {
      const yA = this._smoothVCA;
      ctx.strokeStyle = 'rgba(255, 100, 100, 0.7)';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(scrX, yA); ctx.lineTo(scrX + scrW, yA); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255, 100, 100, 0.9)';
      ctx.font = `${Math.round(8 * fs)}px monospace`;
      ctx.textAlign = 'left';
      ctx.fillText('A', scrX + scrW + 4, yA + 3);
    }
    if (this._smoothVCB !== null) {
      const yB = this._smoothVCB;
      ctx.strokeStyle = 'rgba(100, 200, 255, 0.7)';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(scrX, yB); ctx.lineTo(scrX + scrW, yB); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(100, 200, 255, 0.9)';
      ctx.font = `${Math.round(8 * fs)}px monospace`;
      ctx.textAlign = 'left';
      ctx.fillText('B', scrX + scrW + 4, yB + 3);
    }

    ctx.restore(); // End screen clip

    // ── OSD Top Bar ──
    const osdY = scrY + 4;
    ctx.fillStyle = 'rgba(2, 4, 8, 0.8)';
    this._rr(ctx, scrX + 2, osdY, scrW - 4, 16, 3);
    ctx.fill();

    const _osd = (ox, txt, col, en) => {
      ctx.fillStyle = en ? col : '#303848';
      ctx.font = `bold ${Math.round(10 * fs)}px monospace`;
      ctx.textAlign = 'left';
      ctx.fillText(txt, ox, osdY + 12);
    };
    const osdGap = this._isCompact ? 60 : 80;
    _osd(scrX + 10, '1:' + this._fmtV(P('ch1_vdiv', 1)) + (P('ch1_coupling', 'dc') === 'ac' ? '~' : '='), '#ffe600', P('ch1_en', true) !== false);
    _osd(scrX + osdGap, '2:' + this._fmtV(P('ch2_vdiv', 2)) + (P('ch2_coupling', 'dc') === 'ac' ? '~' : '='), '#00e5ff', P('ch2_en', true) !== false);
    _osd(scrX + osdGap * 2, '3:' + this._fmtV(P('ch3_vdiv', 5)) + (P('ch3_coupling', 'dc') === 'ac' ? '~' : '='), '#ff3090', P('ch3_en', false) !== false);
    _osd(scrX + osdGap * 3, '4:' + this._fmtV(P('ch4_vdiv', 0.5)) + (P('ch4_coupling', 'dc') === 'ac' ? '~' : '='), '#30ff60', P('ch4_en', false) !== false);

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(10 * fs)}px monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(this._fmtT(P('timebase', 0.001)) + '/div', scrX + scrW - 10, osdY + 12);

    // Math label
    if (P('math_op', 'off') !== 'off') {
      ctx.fillStyle = '#ff00ff';
      ctx.font = `bold ${Math.round(9 * fs)}px monospace`;
      ctx.textAlign = 'left';
      const ml = P('math_op') === 'add' ? 'M:CH1+CH2' : P('math_op') === 'sub' ? 'M:CH1-CH2' : 'M:|CH1-CH2|';
      ctx.fillText(ml, scrX + 10, osdY + 26);
    }

    // ── OSD Bottom Bar ──
    const osdBotY = scrY + scrH - 18;
    ctx.fillStyle = 'rgba(2, 4, 8, 0.8)';
    this._rr(ctx, scrX + 2, osdBotY, scrW - 4, 16, 3);
    ctx.fill();

    ctx.fillStyle = '#ffaa00';
    ctx.font = `${Math.round(9 * fs)}px monospace`;
    ctx.textAlign = 'left';
    const trigSrc = (P('trig_source', 'ch1')).toUpperCase();
    const trigSlope = P('trig_slope', 'rising') === 'falling' ? '\\' : '/';
    ctx.fillText('T:' + trigSrc + ' ' + trigSlope + ' ' + this._fmtV(P('trig_level', 0)), scrX + 10, osdBotY + 12);

    ctx.fillStyle = '#7a889b';
    ctx.textAlign = 'right';
    ctx.fillText(P('trig_mode', 'auto') === 'norm' ? 'NORM' : P('trig_mode', 'auto') === 'single' ? 'SINGLE' : 'AUTO', scrX + scrW - 10, osdBotY + 12);

    // Run/Stop + Single status
    ctx.textAlign = 'center';
    if (!isRunning) {
      ctx.fillStyle = '#ff3366';
      ctx.font = `bold ${Math.round(10 * fs)}px monospace`;
      ctx.fillText('STOP', scrX + scrW / 2, osdBotY + 12);
    } else if (isSingleArmed) {
      ctx.fillStyle = '#ffaa00';
      ctx.font = `bold ${Math.round(10 * fs)}px monospace`;
      ctx.fillText('READY', scrX + scrW / 2, osdBotY + 12);
    } else {
      ctx.fillStyle = '#00ff66';
      ctx.font = `bold ${Math.round(10 * fs)}px monospace`;
      ctx.fillText('TRIG\'D', scrX + scrW / 2, osdBotY + 12);
    }

    // Sample rate
    if (buf && buf.t && buf.t.length > 1) {
      const totalTimeBuf = buf.t[buf.t.length - 1] - buf.t[0];
      const sampleRate = totalTimeBuf > 0 ? buf.t.length / totalTimeBuf : 0;
      if (sampleRate > 0) {
        ctx.fillStyle = '#4a5264';
        ctx.font = `${Math.round(8 * fs)}px monospace`;
        ctx.textAlign = 'right';
        ctx.fillText(this._fmtRate(sampleRate), scrX + scrW - 10, scrY + scrH - 26);
      }
    }

    // ── Cursor Readout ──
    this._drawCursorReadout(ctx, scrX, scrY, scrW, scrH, dW, dH, cy, cx, divsX, divsY, P, buf, totalTime);

    // ── Measurement Panel (below screen) — skip if compact ──
    if (!this._isCompact) {
      const measY = scrY + scrH + 12;
      this._drawMeasurements(ctx, scrX, measY, scrW, P, inst);
    }

    // ── Right Control Panel ──
    this._drawControlPanel(ctx, scrX + scrW + 16, scrY, ctrlW - 16, scrH, P, isPowered, isRunning, isSingleArmed);
  }

  _drawCursorReadout(ctx, scrX, scrY, scrW, scrH, dW, dH, cy, cx, divsX, divsY, P, buf, totalTime) {
    const readoutY = scrY + scrH + 4;
    const fs = this._fontSize;
    ctx.font = `${Math.round(9 * fs)}px monospace`;
    ctx.textAlign = 'left';

    if (this.timeCursorA !== null || this.timeCursorB !== null) {
      let txt = '';
      if (this.timeCursorA !== null && this.timeCursorB !== null) {
        const dt = Math.abs(this.timeCursorB - this.timeCursorA) / scrW * totalTime;
        const freq = dt > 0 ? 1 / dt : 0;
        ctx.fillStyle = '#ffe600';
        txt = 'A:' + this._fmtTimeCursor(this.timeCursorA, scrX, scrW, totalTime) +
              '  B:' + this._fmtTimeCursor(this.timeCursorB, scrX, scrW, totalTime) +
              '  \u0394T:' + this._fmtT(dt) + '  1/\u0394T:' + this._fmtFreq(freq);
      } else if (this.timeCursorA !== null) {
        ctx.fillStyle = '#ffe600';
        txt = 'A:' + this._fmtTimeCursor(this.timeCursorA, scrX, scrW, totalTime);
      } else {
        ctx.fillStyle = '#00e5ff';
        txt = 'B:' + this._fmtTimeCursor(this.timeCursorB, scrX, scrW, totalTime);
      }
      ctx.fillText(txt, scrX, readoutY + 10);
    }

    if (this.voltCursorA !== null || this.voltCursorB !== null) {
      let txt = '';
      if (this.voltCursorA !== null && this.voltCursorB !== null) {
        const dV = Math.abs(this.voltCursorB - this.voltCursorA) / dH;
        ctx.fillStyle = '#ff6464';
        txt = 'A:' + this._fmtVoltCursor(this.voltCursorA, cy, dH) +
              '  B:' + this._fmtVoltCursor(this.voltCursorB, cy, dH) +
              '  \u0394V:' + this._fmtV(dV);
      } else if (this.voltCursorA !== null) {
        ctx.fillStyle = '#ff6464';
        txt = 'A:' + this._fmtVoltCursor(this.voltCursorA, cy, dH);
      } else {
        ctx.fillStyle = '#64c8ff';
        txt = 'B:' + this._fmtVoltCursor(this.voltCursorB, cy, dH);
      }
      ctx.fillText(txt, scrX, readoutY + 22);
    }
  }

  _fmtTimeCursor(px, scrX, scrW, totalTime) {
    const t = ((px - scrX) / scrW) * totalTime;
    return this._fmtT(Math.abs(t));
  }

  _fmtVoltCursor(py, cy, dH) {
    const v = -(py - cy) / dH;
    return this._fmtV(v);
  }

  _drawMeasurements(ctx, x, y, w, P, inst) {
    const meas = inst._computeMeas || {};
    const fs = this._fontSize;
    const channels = [
      { id: 'ch1', en: P('ch1_en', true) !== false, col: '#ffe600', label: 'CH1' },
      { id: 'ch2', en: P('ch2_en', true) !== false, col: '#00e5ff', label: 'CH2' },
      { id: 'ch3', en: P('ch3_en', false) !== false, col: '#ff3090', label: 'CH3' },
      { id: 'ch4', en: P('ch4_en', false) !== false, col: '#30ff60', label: 'CH4' },
    ];

    const colW = w / 4;
    let colIdx = 0;
    channels.forEach((ch) => {
      if (!ch.en) return;
      const m = meas[ch.id];
      if (!m) return;
      const cx = x + colIdx * colW;
      ctx.fillStyle = ch.col;
      ctx.font = `bold ${Math.round(10 * fs)}px monospace`;
      ctx.textAlign = 'left';
      ctx.fillText(ch.label, cx, y + 12);

      ctx.font = `${Math.round(8 * fs)}px monospace`;
      ctx.fillStyle = '#b0bec5';
      const lines = [
        'Vpp:  ' + this._fmtV(m.vpp),
        'Vrms: ' + this._fmtV(m.vrms),
        'Vmax: ' + this._fmtV(m.vmax),
        'Vmin: ' + this._fmtV(m.vmin),
        'Freq: ' + (m.frequency > 0 ? this._fmtFreq(m.frequency) : '---'),
        'Duty: ' + (m.dutyCycle > 0 ? m.dutyCycle.toFixed(1) + '%' : '---'),
      ];
      lines.forEach((line, i) => {
        ctx.fillText(line, cx, y + 24 + i * 11);
      });
      colIdx++;
    });
  }

  _drawControlPanel(ctx, x, y, w, h, P, isPowered, isRunning, isSingleArmed) {
    const fs = this._fontSize;
    // Panel background
    ctx.fillStyle = '#14171e';
    this._rr(ctx, x, y, w, h, 6);
    ctx.fill();
    ctx.strokeStyle = '#2a2e38';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#4a5264';
    ctx.font = `bold ${Math.round(9 * fs)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('CONTROLS', x + w / 2, y + 16);

    let yPos = y + 30;
    const sectionGap = 14;

    // ── Trigger Section ──
    this._drawSection(ctx, x + 8, yPos, w - 16, 'TRIGGER');
    yPos += 16;
    yPos = this._drawSelect(ctx, x + 8, yPos, w - 16, 'Mode', P('trig_mode', 'auto'), [
      { value: 'auto', label: 'Auto' }, { value: 'norm', label: 'Normal' }, { value: 'single', label: 'Single' }
    ], 'dso-fs-trig-mode');
    yPos = this._drawSelect(ctx, x + 8, yPos, w - 16, 'Source', P('trig_source', 'ch1'), [
      { value: 'ch1', label: 'CH1' }, { value: 'ch2', label: 'CH2' },
      { value: 'ch3', label: 'CH3' }, { value: 'ch4', label: 'CH4' }
    ], 'dso-fs-trig-source');
    yPos = this._drawSelect(ctx, x + 8, yPos, w - 16, 'Slope', P('trig_slope', 'rising'), [
      { value: 'rising', label: 'Rising' }, { value: 'falling', label: 'Falling' }
    ], 'dso-fs-trig-slope');
    yPos = this._drawSlider(ctx, x + 8, yPos, w - 16, 'Level', P('trig_level', 0), -10, 10, 0.1, 'V', 'dso-fs-trig-level');
    yPos += sectionGap;

    // ── Channels ──
    const chDefs = [
      { id: 'ch1', col: '#ffe600', defEn: true, defVdiv: 1, defPos: 2 },
      { id: 'ch2', col: '#00e5ff', defEn: true, defVdiv: 2, defPos: 0 },
      { id: 'ch3', col: '#ff3090', defEn: false, defVdiv: 5, defPos: -2 },
      { id: 'ch4', col: '#30ff60', defEn: false, defVdiv: 0.5, defPos: -3 },
    ];
    chDefs.forEach((chDef) => {
      this._drawSection(ctx, x + 8, yPos, w - 16, chDef.id.toUpperCase(), chDef.col);
      yPos += 16;
      yPos = this._drawCheckbox(ctx, x + 8, yPos, w - 16, 'Enable', P(chDef.id + '_en', chDef.defEn), chDef.id + '_en');
      yPos = this._drawSlider(ctx, x + 8, yPos, w - 16, 'V/Div', P(chDef.id + '_vdiv', chDef.defVdiv), 0.05, 20, 0.05, 'V', chDef.id + '_vdiv');
      yPos = this._drawSlider(ctx, x + 8, yPos, w - 16, 'Position', P(chDef.id + '_pos', chDef.defPos), -4, 4, 0.1, 'div', chDef.id + '_pos');
      yPos = this._drawSelect(ctx, x + 8, yPos, w - 16, 'Coupling', P(chDef.id + '_coupling', 'dc'), [
        { value: 'dc', label: 'DC' }, { value: 'ac', label: 'AC' }, { value: 'gnd', label: 'GND' }
      ], chDef.id + '_coupling');
      yPos = this._drawSelect(ctx, x + 8, yPos, w - 16, 'Probe', P(chDef.id + '_probe', 1), [
        { value: '1', label: '1\u00d7' }, { value: '10', label: '10\u00d7' }, { value: '100', label: '100\u00d7' }
      ], chDef.id + '_probe');
      yPos += sectionGap;
    });

    // ── Timebase ──
    this._drawSection(ctx, x + 8, yPos, w - 16, 'TIMEBASE');
    yPos += 16;
    yPos = this._drawSlider(ctx, x + 8, yPos, w - 16, 'Time/Div', P('timebase', 0.001), 0.00001, 0.1, 0.0001, 's', 'dso-fs-timebase');
    yPos += sectionGap;

    // ── Math ──
    this._drawSection(ctx, x + 8, yPos, w - 16, 'MATH', '#ff00ff');
    yPos += 16;
    yPos = this._drawSelect(ctx, x + 8, yPos, w - 16, 'Operation', P('math_op', 'off'), [
      { value: 'off', label: 'OFF' }, { value: 'add', label: 'CH1 + CH2' },
      { value: 'sub', label: 'CH1 \u2212 CH2' }, { value: 'abs', label: '|CH1 \u2212 CH2|' }
    ], 'dso-fs-math-op');
    yPos += sectionGap;

    // ── Transport ──
    this._drawSection(ctx, x + 8, yPos, w - 16, 'TRANSPORT');
    yPos += 16;
    // Run/Stop button
    ctx.fillStyle = isRunning ? '#1a3520' : '#351a1a';
    this._rr(ctx, x + 8, yPos, (w - 20) / 2, 22, 4);
    ctx.fill();
    ctx.strokeStyle = isRunning ? '#00ff66' : '#ff3366';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = isRunning ? '#00ff66' : '#ff3366';
    ctx.font = `bold ${Math.round(10 * fs)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(isRunning ? 'RUN' : 'STOP', x + 8 + (w - 20) / 4, yPos + 15);

    // Single button
    ctx.fillStyle = isSingleArmed ? '#35351a' : '#1a1d24';
    this._rr(ctx, x + 8 + (w - 20) / 2 + 4, yPos, (w - 20) / 2, 22, 4);
    ctx.fill();
    ctx.strokeStyle = isSingleArmed ? '#ffaa00' : '#3a4050';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = isSingleArmed ? '#ffaa00' : '#7a889b';
    ctx.font = `bold ${Math.round(10 * fs)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('SINGLE', x + 8 + (w - 20) * 3 / 4 + 4, yPos + 15);

    // Auto-set button
    yPos += 26;
    ctx.fillStyle = '#1a2550';
    this._rr(ctx, x + 8, yPos, w - 20, 22, 4);
    ctx.fill();
    ctx.strokeStyle = '#3070a0';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#40a0ff';
    ctx.font = `bold ${Math.round(10 * fs)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('AUTO SET', x + 8 + (w - 20) / 2, yPos + 15);

    if (!this._elements) this._elements = {};
    this._elements['dso-fs-autoset-canvas'] = { x: x + 8, y: yPos, w: w - 20, h: 22, type: 'button', field: '_autoSet' };
  }

  _drawSection(ctx, x, y, w, label, col) {
    const fs = this._fontSize;
    ctx.fillStyle = col || '#4a5264';
    ctx.font = `bold ${Math.round(8 * fs)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(label, x, y + 8);
    ctx.strokeStyle = '#2a2e38';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y + 12);
    ctx.lineTo(x + w, y + 12);
    ctx.stroke();
  }

  _drawSelect(ctx, x, y, w, label, value, options, id) {
    const fs = this._fontSize;
    ctx.fillStyle = '#6a7488';
    ctx.font = `${Math.round(8 * fs)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(label, x, y + 8);

    const selW = this._isCompact ? 60 : 80;
    const selX = x + w - selW;
    ctx.fillStyle = '#0d1114';
    this._rr(ctx, selX, y - 2, selW, 14, 3);
    ctx.fill();
    ctx.strokeStyle = '#2a3040';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    const opt = options.find(o => o.value == value) || options[0];
    ctx.fillStyle = '#e0e0e0';
    ctx.font = `${Math.round(8 * fs)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(opt.label, selX + selW / 2, y + 8);

    // Store element reference for click handling
    if (!this._elements) this._elements = {};
    this._elements[id] = { x: selX, y: y - 2, w: selW, h: 14, type: 'select', value, options, field: id };

    return y + 18;
  }

  _drawSlider(ctx, x, y, w, label, value, min, max, step, unit, id) {
    const fs = this._fontSize;
    ctx.fillStyle = '#6a7488';
    ctx.font = `${Math.round(8 * fs)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(label, x, y + 8);

    // Value
    ctx.fillStyle = '#00d4e6';
    ctx.font = `bold ${Math.round(8 * fs)}px monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(this._fmtSliderVal(value, unit), x + w, y + 8);

    // Track
    const trackX = x;
    const trackY = y + 14;
    const trackW = w;
    const trackH = 8;
    const range = max - min || 1;
    const pct = Math.max(0, Math.min(1, (value - min) / range));

    ctx.fillStyle = '#080a0c';
    this._rr(ctx, trackX, trackY, trackW, trackH, trackH / 2);
    ctx.fill();

    if (pct > 0.01) {
      const grad = ctx.createLinearGradient(trackX, 0, trackX + pct * trackW, 0);
      grad.addColorStop(0, 'rgba(0,151,156,0.3)');
      grad.addColorStop(1, 'rgba(0,151,156,0.85)');
      ctx.fillStyle = grad;
      this._rr(ctx, trackX, trackY, Math.max(trackH, pct * trackW), trackH, trackH / 2);
      ctx.fill();
    }

    // Thumb
    const thumbX = trackX + pct * trackW;
    const thumbY = trackY + trackH / 2;
    const thumbGrad = ctx.createRadialGradient(thumbX - 1, thumbY - 1, 1, thumbX, thumbY, 5);
    thumbGrad.addColorStop(0, '#b2ebf2');
    thumbGrad.addColorStop(1, '#00bcd4');
    ctx.fillStyle = thumbGrad;
    ctx.beginPath();
    ctx.arc(thumbX, thumbY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    if (!this._elements) this._elements = {};
    this._elements[id] = { x: trackX, y: trackY, w: trackW, h: trackH, type: 'range', value, min, max, step, field: id };

    return y + 28;
  }

  _drawCheckbox(ctx, x, y, w, label, value, id) {
    const fs = this._fontSize;
    ctx.fillStyle = '#6a7488';
    ctx.font = `${Math.round(8 * fs)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 18, y + 8);

    const cbSize = 10;
    const cbX = x;
    const cbY = y - 1;
    ctx.fillStyle = value ? '#00979c' : '#0d1114';
    this._rr(ctx, cbX, cbY, cbSize, cbSize, 2);
    ctx.fill();
    ctx.strokeStyle = '#2a3040';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    if (value) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cbX + 2, cbY + 5);
      ctx.lineTo(cbX + 4.5, cbY + 7.5);
      ctx.lineTo(cbX + 8, cbY + 2.5);
      ctx.stroke();
    }

    if (!this._elements) this._elements = {};
    this._elements[id] = { x: cbX, y: cbY, w: cbSize, h: cbSize, type: 'checkbox', value, field: id };

    return y + 14;
  }

  _fmtSliderVal(v, unit) {
    if (unit === 's') return this._fmtT(v);
    if (unit === 'V') return this._fmtV(v);
    if (unit === 'div') return v.toFixed(1) + 'div';
    return String(Math.round(v * 10) / 10);
  }

  _rr(c, rx, ry, rw, rh, rad) {
    if (typeof roundRect === 'function') { roundRect(c, rx, ry, rw, rh, rad); return; }
    c.beginPath(); c.moveTo(rx + rad, ry);
    c.arcTo(rx + rw, ry, rx + rw, ry + rh, rad);
    c.arcTo(rx + rw, ry + rh, rx, ry + rh, rad);
    c.arcTo(rx, ry + rh, rx, ry, rad);
    c.arcTo(rx, ry, rx + rw, ry, rad); c.closePath();
  }

  _fmtT(s) {
    if (s >= 1) return s.toFixed(1) + 's';
    if (s >= 1e-3) return (s * 1e3).toFixed(0) + 'ms';
    if (s >= 1e-6) return (s * 1e6).toFixed(0) + 'us';
    return (s * 1e9).toFixed(0) + 'ns';
  }

  _fmtV(v) {
    if (Math.abs(v) >= 1) return v.toFixed(v % 1 === 0 ? 0 : 1) + 'V';
    return (v * 1000).toFixed(0) + 'mV';
  }

  _fmtFreq(f) {
    if (f >= 1e6) return (f / 1e6).toFixed(2) + 'MHz';
    if (f >= 1e3) return (f / 1e3).toFixed(2) + 'kHz';
    return f.toFixed(1) + 'Hz';
  }

  _fmtRate(r) {
    if (r >= 1e9) return (r / 1e9).toFixed(1) + 'GSa/s';
    if (r >= 1e6) return (r / 1e6).toFixed(1) + 'MSa/s';
    if (r >= 1e3) return (r / 1e3).toFixed(1) + 'KSa/s';
    return r.toFixed(0) + 'Sa/s';
  }

  /* ══════════════ EVENT HANDLING ══════════════ */
  _bindEvents() {
    if (!this.overlay) return;

    // Close button
    document.getElementById('dso-fs-close')?.addEventListener('click', () => this.close());

    // Auto-set button
    document.getElementById('dso-fs-autoset')?.addEventListener('click', () => this._autoSet());

    // Save button
    document.getElementById('dso-fs-save')?.addEventListener('click', () => this._saveCSV());

    // Canvas cursor interaction
    if (this.canvas) {
      this.canvas.addEventListener('click', (e) => this._onClick(e));
      this.canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); this._onRightClick(e); });
      this.canvas.addEventListener('dblclick', () => { this.timeCursorA = null; this.timeCursorB = null; this.voltCursorA = null; this.voltCursorB = null; });

      // Cursor drag support
      this.canvas.addEventListener('mousedown', (e) => this._onCursorDragStart(e));
      this.canvas.addEventListener('mousemove', (e) => this._onCursorDragMove(e));
      this.canvas.addEventListener('mouseup', () => { this._dragCursor = null; });

      // Touch support for mobile
      this.canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          const touch = e.touches[0];
          this._onCursorDragStart({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => e.preventDefault() });
        }
      }, { passive: false });
      this.canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) {
          const touch = e.touches[0];
          this._onCursorDragMove({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => e.preventDefault() });
        }
      }, { passive: false });
      this.canvas.addEventListener('touchend', () => { this._dragCursor = null; });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this._onKeyDown(e));

    // ResizeObserver for responsive layout
    if (window.ResizeObserver && this.canvas?.parentElement) {
      this._ro = new ResizeObserver(() => { if (this.visible) this._resize(); });
      this._ro.observe(this.canvas.parentElement);
    }
    window.addEventListener('resize', () => { if (this.visible) this._resize(); });
  }

  /* ══════════════ KEYBOARD SHORTCUTS ══════════════ */
  _onKeyDown(e) {
    if (!this.visible || !this.inst) return;
    const rs = this.inst.runtimeState || {};
    const props = this.inst.props || {};

    // Escape — close
    if (e.key === 'Escape') { this.close(); return; }

    // R — toggle Run/Stop
    if (e.key === 'r' || e.key === 'R') {
      const cur = rs.runStop !== undefined ? rs.runStop : (props.runStop ?? 1);
      rs.runStop = cur ? 0 : 1;
      props.runStop = rs.runStop;
      e.preventDefault(); return;
    }

    // S — toggle Single trigger
    if (e.key === 's' || e.key === 'S') {
      const cur = rs.singleTrigger !== undefined ? rs.singleTrigger : (props.singleTrigger ?? 0);
      rs.singleTrigger = cur ? 0 : 1;
      props.singleTrigger = rs.singleTrigger;
      e.preventDefault(); return;
    }

    // A — auto-set
    if (e.key === 'a' || e.key === 'A') {
      this._autoSet();
      e.preventDefault(); return;
    }

    // 1-4 — toggle channel enable
    const chKeys = { '1': 'ch1', '2': 'ch2', '3': 'ch3', '4': 'ch4' };
    if (chKeys[e.key]) {
      const chId = chKeys[e.key];
      const cur = rs[chId + '_en'] !== undefined ? rs[chId + '_en'] : (props[chId + '_en'] ?? (chId === 'ch1' || chId === 'ch2'));
      rs[chId + '_en'] = !cur;
      props[chId + '_en'] = rs[chId + '_en'];
      e.preventDefault(); return;
    }

    // +/= — zoom in timebase
    if (e.key === '+' || e.key === '=') {
      const tb = rs.timebase !== undefined ? rs.timebase : (props.timebase ?? 0.001);
      const steps = [0.00001, 0.00002, 0.00005, 0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1];
      const idx = steps.findIndex(s => s >= tb * 0.8);
      const newTb = idx > 0 ? steps[idx - 1] : steps[0];
      rs.timebase = newTb;
      props.timebase = newTb;
      e.preventDefault(); return;
    }

    // - — zoom out timebase
    if (e.key === '-') {
      const tb = rs.timebase !== undefined ? rs.timebase : (props.timebase ?? 0.001);
      const steps = [0.00001, 0.00002, 0.00005, 0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1];
      const idx = steps.findIndex(s => s >= tb * 1.2);
      const newTb = idx >= 0 ? steps[idx] : steps[steps.length - 1];
      rs.timebase = newTb;
      props.timebase = newTb;
      e.preventDefault(); return;
    }

    // T — set trigger level to center of first enabled channel signal
    if (e.key === 't' || e.key === 'T') {
      const buf = this.inst._buffers;
      const trigCh = rs.trig_source || props.trig_source || 'ch1';
      const samples = buf && buf[trigCh] ? buf[trigCh] : null;
      if (samples && samples.length > 10) {
        let vmin = Infinity, vmax = -Infinity;
        for (let i = 0; i < samples.length; i++) {
          if (samples[i] < vmin) vmin = samples[i];
          if (samples[i] > vmax) vmax = samples[i];
        }
        const center = (vmax + vmin) / 2;
        rs.trig_level = center;
        props.trig_level = center;
      }
      e.preventDefault(); return;
    }

    // Arrow keys — nudge cursors
    const inScreen = true;
    if (inScreen) {
      const nudge = e.shiftKey ? 0.1 : 1;
      const timeNudge = (this._scrW / 12) * nudge;
      const voltNudge = (this._dH) * nudge;

      // Left/Right — nudge time cursors (A selected first, then B)
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const dir = e.key === 'ArrowLeft' ? -1 : 1;
        const delta = timeNudge * dir;
        if (this.timeCursorA !== null) {
          this.timeCursorA = Math.max(this._scrX, Math.min(this._scrX + this._scrW, this.timeCursorA + delta));
        } else if (this.timeCursorB !== null) {
          this.timeCursorB = Math.max(this._scrX, Math.min(this._scrX + this._scrW, this.timeCursorB + delta));
        }
        e.preventDefault(); return;
      }

      // Up/Down — nudge voltage cursors
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const dir = e.key === 'ArrowUp' ? -1 : 1;
        const delta = voltNudge * dir;
        if (this.voltCursorA !== null) {
          this.voltCursorA = Math.max(this._scrY, Math.min(this._scrY + this._scrH, this.voltCursorA + delta));
        } else if (this.voltCursorB !== null) {
          this.voltCursorB = Math.max(this._scrY, Math.min(this._scrY + this._scrH, this.voltCursorB + delta));
        }
        e.preventDefault(); return;
      }
    }
  }

  /* ══════════════ CURSOR DRAG ══════════════ */
  _onCursorDragStart(e) {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const threshold = 8;

    // Check if clicking near a cursor to start dragging
    if (this.timeCursorA !== null && Math.abs(mx - this.timeCursorA) < threshold && my >= this._scrY && my <= this._scrY + this._scrH) {
      this._dragCursor = 'timeA';
      this._dragOffset = mx - this.timeCursorA;
      e.preventDefault();
    } else if (this.timeCursorB !== null && Math.abs(mx - this.timeCursorB) < threshold && my >= this._scrY && my <= this._scrY + this._scrH) {
      this._dragCursor = 'timeB';
      this._dragOffset = mx - this.timeCursorB;
      e.preventDefault();
    } else if (this.voltCursorA !== null && Math.abs(my - this.voltCursorA) < threshold && mx >= this._scrX && mx <= this._scrX + this._scrW) {
      this._dragCursor = 'voltA';
      this._dragOffset = my - this.voltCursorA;
      e.preventDefault();
    } else if (this.voltCursorB !== null && Math.abs(my - this.voltCursorB) < threshold && mx >= this._scrX && mx <= this._scrX + this._scrW) {
      this._dragCursor = 'voltB';
      this._dragOffset = my - this.voltCursorB;
      e.preventDefault();
    }
  }

  _onCursorDragMove(e) {
    if (!this.canvas || !this._dragCursor) return;
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (this._dragCursor === 'timeA') {
      this.timeCursorA = Math.max(this._scrX, Math.min(this._scrX + this._scrW, mx - this._dragOffset));
    } else if (this._dragCursor === 'timeB') {
      this.timeCursorB = Math.max(this._scrX, Math.min(this._scrX + this._scrW, mx - this._dragOffset));
    } else if (this._dragCursor === 'voltA') {
      this.voltCursorA = Math.max(this._scrY, Math.min(this._scrY + this._scrH, my - this._dragOffset));
    } else if (this._dragCursor === 'voltB') {
      this.voltCursorB = Math.max(this._scrY, Math.min(this._scrY + this._scrH, my - this._dragOffset));
    }
    e.preventDefault();
  }

  _bindControls() {
    if (!this.overlay) return;

    // Delegate click events to control elements
    this.overlay.addEventListener('click', (e) => {
      if (!this.inst || !this._elements) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      for (const [id, el] of Object.entries(this._elements)) {
        if (x >= el.x && x <= el.x + el.w && y >= el.y && y <= el.y + el.h) {
          const rs = this.inst.runtimeState || {};
          if (el.type === 'select') {
            // Cycle through options
            const idx = el.options.findIndex(o => o.value == el.value);
            const next = (idx + 1) % el.options.length;
            rs[el.field] = el.options[next].value;
            this.inst.props[el.field] = el.options[next].value;
          } else if (el.type === 'checkbox') {
            rs[el.field] = !el.value;
            this.inst.props[el.field] = !el.value;
          } else if (el.type === 'range') {
            // Click sets value proportionally
            const pct = Math.max(0, Math.min(1, (x - el.x) / el.w));
            let val = el.min + pct * (el.max - el.min);
            if (el.step) val = Math.round(val / el.step) * el.step;
            val = Math.max(el.min, Math.min(el.max, val));
            rs[el.field] = val;
            this.inst.props[el.field] = val;
          } else if (el.type === 'button') {
            this._autoSet();
          }
          this._syncControlsFromInst();
          e.stopPropagation();
          return;
        }
      }
    });

    // Drag for range sliders
    let dragId = null;
    this.canvas?.addEventListener('mousedown', (e) => {
      if (!this._elements) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      for (const [id, el] of Object.entries(this._elements)) {
        if (el.type === 'range' && x >= el.x && x <= el.x + el.w && y >= el.y && y <= el.y + el.h) {
          dragId = id;
          e.preventDefault();
          return;
        }
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragId || !this.inst || !this._elements) return;
      const el = this._elements[dragId];
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, (x - el.x) / el.w));
      let val = el.min + pct * (el.max - el.min);
      if (el.step) val = Math.round(val / el.step) * el.step;
      val = Math.max(el.min, Math.min(el.max, val));
      this.inst.runtimeState[el.field] = val;
      this.inst.props[el.field] = val;
    });

    document.addEventListener('mouseup', () => { dragId = null; });
  }

  _onClick(e) {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Only place cursors within the screen area
    if (x >= this._scrX && x <= this._scrX + this._scrW &&
        y >= this._scrY && y <= this._scrY + this._scrH) {
      if (this.timeCursorA !== null && this.timeCursorB !== null) {
        this.timeCursorA = null;
        this.timeCursorB = null;
      } else if (this.timeCursorA === null) {
        this.timeCursorA = x;
      } else {
        this.timeCursorB = x;
        if (this.timeCursorA > this.timeCursorB) {
          [this.timeCursorA, this.timeCursorB] = [this.timeCursorB, this.timeCursorA];
        }
      }
    }
  }

  _onRightClick(e) {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x >= this._scrX && x <= this._scrX + this._scrW &&
        y >= this._scrY && y <= this._scrY + this._scrH) {
      if (this.voltCursorA !== null && this.voltCursorB !== null) {
        this.voltCursorA = null;
        this.voltCursorB = null;
      } else if (this.voltCursorA === null) {
        this.voltCursorA = y;
      } else {
        this.voltCursorB = y;
        if (this.voltCursorA > this.voltCursorB) {
          [this.voltCursorA, this.voltCursorB] = [this.voltCursorB, this.voltCursorA];
        }
      }
    }
  }

  _syncControlsFromInst() {
    if (!this.inst) return;
    // Controls are drawn from inst state on each render frame, so just redraw
    this._elements = {};
  }

  _autoSet() {
    if (!this.inst) return;
    const buf = this.inst._buffers;
    const rs = this.inst.runtimeState || {};
    const props = this.inst.props || {};
    const P = (field, def) => (rs[field] !== undefined) ? rs[field] : (props[field] ?? def);

    // Find the first enabled channel with data
    const chIds = ['ch1', 'ch2', 'ch3', 'ch4'];
    for (const chId of chIds) {
      if (!P(chId + '_en', chId === 'ch1' || chId === 'ch2')) continue;
      const samples = buf && buf[chId] && buf[chId].length > 10 ? buf[chId] : null;
      if (!samples) continue;

      // Compute signal range
      let vmin = Infinity, vmax = -Infinity;
      for (let i = 0; i < samples.length; i++) {
        if (samples[i] < vmin) vmin = samples[i];
        if (samples[i] > vmax) vmax = samples[i];
      }
      if (!isFinite(vmin) || !isFinite(vmax)) continue;

      const vpp = vmax - vmin;
      const vCenter = (vmax + vmin) / 2;

      // Auto V/Div: fit Vpp into 6 divisions
      const targetVdiv = vpp / 6;
      const vdivSteps = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20];
      let autoVdiv = vdivSteps[0];
      for (const s of vdivSteps) {
        if (s >= targetVdiv) { autoVdiv = s; break; }
      }
      rs[chId + '_vdiv'] = autoVdiv;
      props[chId + '_vdiv'] = autoVdiv;

      // Auto Position: center the signal
      const autoPos = -(vCenter / autoVdiv) * (8 / 2);
      rs[chId + '_pos'] = Math.max(-4, Math.min(4, autoPos));
      props[chId + '_pos'] = rs[chId + '_pos'];

      // Auto Trigger Level
      rs.trig_level = vCenter;
      props.trig_level = vCenter;
      rs.trig_source = chId;
      props.trig_source = chId;

      break;
    }

    // Auto Timebase: try to fit 2-3 cycles
    const trigCh = P('trig_source', 'ch1');
    const samples = buf && buf[trigCh] ? buf[trigCh] : null;
    if (samples && samples.length > 20) {
      // Estimate frequency from zero crossings
      let crossings = 0;
      for (let i = 1; i < samples.length; i++) {
        if ((samples[i - 1] < 0 && samples[i] >= 0) || (samples[i - 1] >= 0 && samples[i] < 0)) crossings++;
      }
      const totalT = buf.t && buf.t.length > 1 ? buf.t[buf.t.length - 1] - buf.t[0] : 1;
      const freq = crossings > 1 ? (crossings / 2) / totalT : 0;
      if (freq > 0) {
        const period = 1 / freq;
        const targetTimebase = (period * 3) / 12; // 3 cycles across 12 divisions
        const timebaseSteps = [0.00001, 0.00002, 0.00005, 0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1];
        let autoTimebase = timebaseSteps[0];
        for (const s of timebaseSteps) {
          if (s >= targetTimebase) { autoTimebase = s; break; }
        }
        rs.timebase = autoTimebase;
        props.timebase = autoTimebase;
      }
    }
  }

  _saveCSV() {
    if (!this.inst) return;
    const buf = this.inst._buffers;
    if (!buf || !buf.t || buf.t.length === 0) return;

    let csv = 'Time(s),CH1(V),CH2(V),CH3(V),CH4(V)\n';
    for (let i = 0; i < buf.t.length; i++) {
      csv += buf.t[i].toFixed(6) + ',' +
             (buf.ch1[i] || 0).toFixed(4) + ',' +
             (buf.ch2[i] || 0).toFixed(4) + ',' +
             (buf.ch3[i] || 0).toFixed(4) + ',' +
             (buf.ch4[i] || 0).toFixed(4) + '\n';
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dso_waveform_' + Date.now() + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
}

window.DSOFullscreen = DSOFullscreen;
