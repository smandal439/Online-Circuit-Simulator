/* ═══════════════════════════════════════════════════════
   oscilloscope.js — Real-time Oscilloscope
   ═══════════════════════════════════════════════════════ */

'use strict';

class Oscilloscope {
  constructor(canvasEl) {
    this.canvas  = canvasEl;
    this.ctx     = canvasEl.getContext('2d');
    this.paused  = false;

    /* Config */
    this.ch1Pin   = 'A0';
    this.ch2Pin   = 'none';
    this.timebase = 500; // ms per div
    this.gridDivs = 10;

    /* Data buffers */
    this.ch1Data = [];
    this.ch2Data = [];
    this.maxSamples = 2000;

    /* Colors */
    this.CH1_COLOR = '#00e5ff';
    this.CH2_COLOR = '#ff9800';
    this.GRID_COLOR = 'rgba(255,255,255,0.06)';
    this.GRID_MAJOR = 'rgba(255,255,255,0.12)';
    this.BG_COLOR   = '#0a0e14';

    /* RAF */
    this._rafId  = null;
    this._lastSampleTime = 0;

    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(canvasEl.parentElement || canvasEl);
    this._resize();

    this._startRender();
  }

  _resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    this.canvas.width  = parent.clientWidth  || 800;
    this.canvas.height = parent.clientHeight || 120;
  }

  _startRender() {
    const loop = () => {
      this._render();
      this._rafId = requestAnimationFrame(loop);
    };
    this._rafId = requestAnimationFrame(loop);
  }

  /* Called every tick from the app (e.g., every 50ms) */
  sample(simTime, pinStates) {
    if (this.paused) return;
    if (simTime - this._lastSampleTime < 10) return; // max 100 samples/sec
    this._lastSampleTime = simTime;

    const pin1Num = this._pinNameToNum(this.ch1Pin);
    const pin2Num = this._pinNameToNum(this.ch2Pin);

    const states = (pinStates && typeof pinStates === 'object') ? pinStates : {};

    const v1 = pin1Num !== null ? (states[`pin_${pin1Num}`] || 0) : 0;
    const v2 = pin2Num !== null ? (states[`pin_${pin2Num}`] || 0) : 0;

    this.ch1Data.push({ t: simTime, v: v1 });
    this.ch2Data.push({ t: simTime, v: v2 });

    if (this.ch1Data.length > this.maxSamples) this.ch1Data.shift();
    if (this.ch2Data.length > this.maxSamples) this.ch2Data.shift();
  }

  _render() {
    const { ctx, canvas } = this;
    const W = canvas.width, H = canvas.height;
    if (!W || !H) return;

    ctx.fillStyle = this.BG_COLOR;
    ctx.fillRect(0, 0, W, H);

    this._drawGrid(ctx, W, H);
    this._drawWaveform(ctx, W, H, this.ch1Data, this.CH1_COLOR, 1023);
    if (this.ch2Pin !== 'none') {
      this._drawWaveform(ctx, W, H, this.ch2Data, this.CH2_COLOR, 1023);
    }
    this._drawLabels(ctx, W, H);
  }

  _drawGrid(ctx, W, H) {
    const divW = W / this.gridDivs;
    const divH = H / 8;

    // Vertical lines (time divisions)
    for (let i = 0; i <= this.gridDivs; i++) {
      const x = i * divW;
      ctx.strokeStyle = i % 5 === 0 ? this.GRID_MAJOR : this.GRID_COLOR;
      ctx.lineWidth = i % 5 === 0 ? 1 : 0.5;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }

    // Horizontal lines
    for (let i = 0; i <= 8; i++) {
      const y = i * divH;
      ctx.strokeStyle = i % 4 === 0 ? this.GRID_MAJOR : this.GRID_COLOR;
      ctx.lineWidth = i % 4 === 0 ? 1 : 0.5;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Center lines (bright)
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, H/2); ctx.lineTo(W, H/2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H); ctx.stroke();
  }

  _drawWaveform(ctx, W, H, data, color, maxVal) {
    if (data.length < 2) return;

    const now = data[data.length - 1].t;
    const windowMs = this.timebase * this.gridDivs;
    const startT = now - windowMs;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;
    ctx.beginPath();

    let first = true;
    for (const pt of data) {
      if (pt.t < startT) continue;
      const x = ((pt.t - startT) / windowMs) * W;
      const y = H - (pt.v / maxVal) * H * 0.9 - H * 0.05;
      if (first) { ctx.moveTo(x, y); first = false; }
      else ctx.lineTo(x, y);
    }

    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  _drawLabels(ctx, W, H) {
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillStyle = this.CH1_COLOR;
    ctx.textAlign = 'left';
    ctx.fillText(`CH1: ${this.ch1Pin}`, 8, 16);

    if (this.ch2Pin !== 'none') {
      ctx.fillStyle = this.CH2_COLOR;
      ctx.fillText(`CH2: ${this.ch2Pin}`, 8, 30);
    }

    // Time/div
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.textAlign = 'right';
    ctx.fillText(`${this.timebase}ms/div`, W - 8, 16);

    // Current values
    if (this.ch1Data.length > 0) {
      const last = this.ch1Data[this.ch1Data.length - 1];
      ctx.fillStyle = this.CH1_COLOR;
      ctx.textAlign = 'right';
      ctx.fillText(`${last.v}`, W - 8, H - 8);
    }

    // Pause indicator
    if (this.paused) {
      ctx.fillStyle = 'rgba(255,150,0,0.8)';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⏸ PAUSED', W/2, 20);
    }
  }

  setChannel(ch, pinName) {
    if (ch === 1) { this.ch1Pin = pinName; this.ch1Data = []; }
    if (ch === 2) { this.ch2Pin = pinName; this.ch2Data = []; }
  }

  setTimebase(ms) {
    this.timebase = parseInt(ms) || 500;
  }

  clear() {
    this.ch1Data = [];
    this.ch2Data = [];
  }

  togglePause() {
    this.paused = !this.paused;
    return this.paused;
  }

  _pinNameToNum(name) {
    const map = { A0:14, A1:15, A2:16, A3:17, A4:18, A5:19, D3:3, D5:5, D6:6, D9:9, D10:10, D11:11, D13:13 };
    return map[name] !== undefined ? map[name] : null;
  }
}

window.OscilloscopeClass = Oscilloscope;
