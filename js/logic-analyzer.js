/* ═══════════════════════════════════════════════════════
   logic-analyzer.js — Multi-channel digital Logic Analyzer
   Captures and displays digital pin states (HIGH/LOW) over time.
   ═══════════════════════════════════════════════════════ */

'use strict';

class LogicAnalyzer {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.paused = false;

    /* Channel configuration — up to 8 digital channels */
    this.channels = [
      { pin: 'D2',  label: 'CH1', color: '#00e5ff', enabled: true },
      { pin: 'D3',  label: 'CH2', color: '#ff9800', enabled: false },
      { pin: 'D4',  label: 'CH3', color: '#4caf50', enabled: false },
      { pin: 'D5',  label: 'CH4', color: '#ff5722', enabled: false },
      { pin: 'D6',  label: 'CH5', color: '#ab47bc', enabled: false },
      { pin: 'D7',  label: 'CH6', color: '#ffee33', enabled: false },
      { pin: 'D8',  label: 'CH7', color: '#e91e63', enabled: false },
      { pin: 'D13', label: 'CH8', color: '#76ff03', enabled: false },
    ];

    /* Timing */
    this.timebase = 200; // ms per division
    this.gridDivs = 10;

    /* Data — ring buffer per channel */
    this.maxSamples = 4000;
    this.data = {};
    this.channels.forEach(ch => { this.data[ch.pin] = []; });

    /* Cursor measurement */
    this.cursorX = null;

    /* Colors */
    this.BG_COLOR = '#0a0e14';
    this.GRID_COLOR = 'rgba(255,255,255,0.06)';
    this.GRID_MAJOR = 'rgba(255,255,255,0.12)';
    this.LABEL_BG = 'rgba(255,255,255,0.05)';
    this.TEXT_COLOR = 'rgba(255,255,255,0.4)';

    /* RAF */
    this._rafId = null;
    this._lastSampleTime = 0;

    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(canvasEl.parentElement || canvasEl);
    this._resize();

    /* Mouse cursor for time measurement */
    canvasEl.addEventListener('mousemove', (e) => {
      const rect = canvasEl.getBoundingClientRect();
      this.cursorX = e.clientX - rect.left;
    });
    canvasEl.addEventListener('mouseleave', () => { this.cursorX = null; });

    this._startRender();
  }

  _resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    this.canvas.width = parent.clientWidth || 800;
    this.canvas.height = parent.clientHeight || 150;
  }

  _startRender() {
    const loop = () => {
      this._render();
      this._rafId = requestAnimationFrame(loop);
    };
    this._rafId = requestAnimationFrame(loop);
  }

  /* ── Called every simulation tick ── */
  sample(simTime, pinStates) {
    if (this.paused) return;
    if (simTime - this._lastSampleTime < 10) return;
    this._lastSampleTime = simTime;

    const states = (pinStates && typeof pinStates === 'object') ? pinStates : {};

    for (const ch of this.channels) {
      if (!ch.enabled) continue;
      const pinNum = this._pinNameToNum(ch.pin);
      if (pinNum === null) continue;
      const raw = states[`pin_${pinNum}`] || 0;
      const high = raw > 127; // threshold at ~50% of 255
      this.data[ch.pin].push({ t: simTime, v: high ? 1 : 0 });
      if (this.data[ch.pin].length > this.maxSamples) this.data[ch.pin].shift();
    }
  }

  /* ── Rendering ── */
  _render() {
    const { ctx, canvas } = this;
    const W = canvas.width, H = canvas.height;
    if (!W || !H) return;

    ctx.fillStyle = this.BG_COLOR;
    ctx.fillRect(0, 0, W, H);

    const activeChannels = this.channels.filter(ch => ch.enabled);
    const channelCount = activeChannels.length || 1;
    const labelW = 60;
    const plotW = W - labelW;
    const channelH = Math.floor(H / channelCount);
    const windowMs = this.timebase * this.gridDivs;

    // Determine time window from data
    let now = 0;
    for (const ch of activeChannels) {
      const d = this.data[ch.pin];
      if (d.length > 0) {
        const last = d[d.length - 1].t;
        if (last > now) now = last;
      }
    }
    const startT = now - windowMs;
    const endT = now;

    // Draw grid
    this._drawGrid(ctx, labelW, plotW, H, channelCount, channelH, startT, endT);

    // Draw each channel
    activeChannels.forEach((ch, i) => {
      const y0 = i * channelH;
      const yMid = y0 + channelH / 2;
      const color = ch.color;

      // Channel separator line
      if (i > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(labelW, y0);
        ctx.lineTo(W, y0);
        ctx.stroke();
      }

      // Label background
      ctx.fillStyle = this.LABEL_BG;
      ctx.fillRect(0, y0, labelW, channelH);

      // Channel label
      ctx.fillStyle = color;
      ctx.font = 'bold 9px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(ch.label, labelW / 2, yMid - 6);

      ctx.fillStyle = this.TEXT_COLOR;
      ctx.font = '8px JetBrains Mono, monospace';
      ctx.fillText(ch.pin, labelW / 2, yMid + 8);

      // HIGH / LOW state label
      const d = this.data[ch.pin];
      const lastVal = d.length > 0 ? d[d.length - 1].v : 0;
      ctx.fillStyle = lastVal ? color : 'rgba(255,255,255,0.2)';
      ctx.font = 'bold 7px JetBrains Mono, monospace';
      ctx.fillText(lastVal ? 'HIGH' : 'LOW', labelW / 2, yMid + 20);

      // Draw waveform
      this._drawChannelWaveform(ctx, ch, d, labelW, plotW, y0, channelH, startT, endT, color);
    });

    // Cursor measurement line
    if (this.cursorX !== null && this.cursorX >= labelW) {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(this.cursorX, 0);
      ctx.lineTo(this.cursorX, H);
      ctx.stroke();
      ctx.setLineDash([]);

      const cursorT = startT + ((this.cursorX - labelW) / plotW) * windowMs;
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '8px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${cursorT.toFixed(1)}ms`, this.cursorX, H - 4);
    }

    // Bottom info bar
    this._drawInfoBar(ctx, W, H, activeChannels, startT, endT);
  }

  _drawGrid(ctx, labelW, plotW, H, channelCount, channelH, startT, endT) {
    const windowMs = endT - startT;
    if (windowMs <= 0) return;

    // Vertical time grid lines
    for (let i = 0; i <= this.gridDivs; i++) {
      const x = labelW + (i / this.gridDivs) * plotW;
      ctx.strokeStyle = i % 5 === 0 ? this.GRID_MAJOR : this.GRID_COLOR;
      ctx.lineWidth = i % 5 === 0 ? 1 : 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();

      // Time labels at bottom
      if (i < this.gridDivs) {
        const t = startT + (i / this.gridDivs) * windowMs;
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.font = '7px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${t.toFixed(0)}ms`, x + (plotW / this.gridDivs) / 2, H - 3);
      }
    }

    // Channel HIGH/LOW reference lines
    for (let i = 0; i < channelCount; i++) {
      const y0 = i * channelH;
      const yHigh = y0 + channelH * 0.25;
      const yLow = y0 + channelH * 0.75;

      // LOW reference
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(labelW, yLow);
      ctx.lineTo(labelW + plotW, yLow);
      ctx.stroke();

      // HIGH reference
      ctx.beginPath();
      ctx.moveTo(labelW, yHigh);
      ctx.lineTo(labelW + plotW, yHigh);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  _drawChannelWaveform(ctx, ch, data, labelW, plotW, y0, channelH, startT, endT, color) {
    if (data.length < 2) return;

    const windowMs = endT - startT;
    if (windowMs <= 0) return;

    const yHigh = y0 + channelH * 0.25;
    const yLow = y0 + channelH * 0.75;
    const yPad = 4;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    let started = false;
    for (let i = 0; i < data.length; i++) {
      const pt = data[i];
      if (pt.t < startT - 100) continue;
      if (pt.t > endT + 100) break;

      const x = labelW + ((pt.t - startT) / windowMs) * plotW;
      const y = pt.v ? yHigh + yPad : yLow - yPad;

      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        // Draw square wave: horizontal to transition point, then vertical
        const prev = data[i - 1];
        const prevY = prev.v ? yHigh + yPad : yLow - yPad;
        if (prevY !== y) {
          // Transition — draw vertical line
          ctx.lineTo(x, prevY);
          ctx.lineTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    ctx.stroke();

    // Glow effect
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  _drawInfoBar(ctx, W, H, activeChannels, startT, endT) {
    // Top-right: timebase info
    ctx.fillStyle = this.TEXT_COLOR;
    ctx.font = '8px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${this.timebase}ms/div · ${activeChannels.length} ch`, W - 8, 12);

    if (this.paused) {
      ctx.fillStyle = 'rgba(255,150,0,0.8)';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', W / 2, 14);
    }
  }

  /* ── Pin name to Arduino pin number ── */
  _pinNameToNum(name) {
    const map = {
      D0: 0, D1: 1, D2: 2, D3: 3, D4: 4, D5: 5, D6: 6, D7: 7,
      D8: 8, D9: 9, D10: 10, D11: 11, D12: 12, D13: 13,
      A0: 14, A1: 15, A2: 16, A3: 17, A4: 18, A5: 19
    };
    return map[name] !== undefined ? map[name] : null;
  }

  /* ── Public API ── */
  setChannel(index, pinName) {
    if (index < 0 || index >= this.channels.length) return;
    this.channels[index].pin = pinName;
    this.data[pinName] = [];
  }

  setChannelEnabled(index, enabled) {
    if (index < 0 || index >= this.channels.length) return;
    this.channels[index].enabled = enabled;
  }

  setTimebase(ms) {
    this.timebase = parseInt(ms) || 200;
  }

  setCursorX(x) {
    this.cursorX = x;
  }

  clear() {
    this.channels.forEach(ch => { this.data[ch.pin] = []; });
  }

  togglePause() {
    this.paused = !this.paused;
    return this.paused;
  }

  destroy() {
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._ro?.disconnect();
  }
}

window.LogicAnalyzerClass = LogicAnalyzer;
