/* ═══════════════════════════════════════════════════════
   canvas.js — Circuit Canvas (HTML5 Canvas, drag/drop, wiring, pan/zoom)
   ═══════════════════════════════════════════════════════ */

'use strict';

class CircuitCanvas {
  constructor(canvasEl, wrapperEl) {
    this.canvas   = canvasEl;
    this.wrapper  = wrapperEl;
    this.ctx      = canvasEl.getContext('2d');

    /* State */
    this.components   = [];  // { id, type, x, y, props, runtimeState, selected, rotation }
    this.wires        = [];  // { id, from:{instId,pinId}, to:{instId,pinId}, color, waypoints:[] }
    this.selected     = null;
    this.selectedWire = null;

    /* Viewport */
    this.panX  = 0;
    this.panY  = 0;
    this.zoom  = 1;
    this.GRID  = 10;

    /* Interaction state machine */
    this.mode         = 'idle';   // idle | dragging | panning | wiring | placing | wiredrag
    this.dragging     = null;     // { inst, offsetX, offsetY }
    this.wiringFrom   = null;     // { inst, pin, wx, wy }
    this.wireMouse    = null;     // { x, y } world coords
    this.placingType  = null;
    this._wireOffsets = {};       // wireId -> {hx, hy} routing hint for wire reshape
    this.draggingWire = null;     // { wireId, segIdx } — which wire segment is being dragged
    this.placingMouse = null;

    /* History */
    this.history = [];
    this.historyIdx = -1;

    /* Resize */
    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(this.wrapper);
    this._resize();

    /* Events */
    this._bindEvents();
    this._rafId = requestAnimationFrame(() => this._render());

    /* Callbacks */
    this.onWireChanged  = null;
    this.onCompChanged  = null;
    this.onPinClick     = null;  // (inst, pin) when user clicks a pin
    this.onContextMenu  = null;

    /* Pin tooltip */
    this.tooltipEl = null;
    this._tipKey  = null;
  }

  /* ══════════════ RESIZE ══════════════ */
  _resize() {
    const w = this.wrapper.clientWidth;
    const h = this.wrapper.clientHeight;
    this.canvas.width  = w;
    this.canvas.height = h;
    if (this.panX === 0 && this.panY === 0) {
      this.panX = w / 2 - 200;
      this.panY = h / 2 - 150;
    }
  }

  /* ══════════════ RENDER ══════════════ */
  _render() {
    const { ctx, canvas, zoom, panX, panY } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Refresh active simulation states for live glowing & component updates
    if (window.ArduinoSim && window.ArduinoSim.isRunning && window.ArduinoSim.pinStates) {
      this.updateSimState(window.ArduinoSim.pinStates);
    }

    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    this._drawGrid(ctx);
    this._drawWires(ctx);
    this._drawComponents(ctx);
    this._drawInteractives(ctx);
    this._drawOverlays(ctx);

    ctx.restore();
    this._rafId = requestAnimationFrame(() => this._render());
  }

  _drawGrid(ctx) {
    const G = this.GRID;
    const invZ = 1 / this.zoom;
    const startX = Math.floor(-this.panX * invZ / G) * G;
    const startY = Math.floor(-this.panY * invZ / G) * G;
    const endX = startX + (this.canvas.width * invZ) + G;
    const endY = startY + (this.canvas.height * invZ) + G;

    ctx.strokeStyle = this.zoom < 0.5 ? 'transparent' : 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 0.5 / this.zoom;

    for (let x = startX; x <= endX; x += G) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }
    for (let y = startY; y <= endY; y += G) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }

    // Major grid
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1 / this.zoom;
    const MG = G * 5;
    const msX = Math.floor(-this.panX * invZ / MG) * MG;
    const msY = Math.floor(-this.panY * invZ / MG) * MG;
    for (let x = msX; x <= endX; x += MG) {
      ctx.beginPath(); ctx.moveTo(x, startY); ctx.lineTo(x, endY); ctx.stroke();
    }
    for (let y = msY; y <= endY; y += MG) {
      ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(endX, y); ctx.stroke();
    }

    // Origin marker
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1.5 / this.zoom;
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 10); ctx.stroke();
  }

  _drawComponents(ctx) {
    const { COMPONENT_DEFS } = window.ArduinoComponents;
    const sim = window.ArduinoSim;

    for (const inst of this.components) {
      const def = COMPONENT_DEFS[inst.type];
      if (!def) continue;

      ctx.save();
      if (inst.rotation) {
        const cx = inst.x + def.width / 2;
        const cy = inst.y + def.height / 2;
        ctx.translate(cx, cy);
        ctx.rotate(inst.rotation * Math.PI / 2);
        ctx.translate(-cx, -cy);
      }

      def.draw(ctx, { ...inst }, sim.isRunning ? sim : null);

      // Draw pins
      if (this.zoom >= 0.5) {
        this._drawPins(ctx, inst, def);
      }

      ctx.restore();
    }

    // Draw placing ghost
    if (this.mode === 'placing' && this.placingMouse && this.placingType) {
      const def = COMPONENT_DEFS[this.placingType];
      if (def) {
        const gx = this._snap(this.placingMouse.x - def.width / 2);
        const gy = this._snap(this.placingMouse.y - def.height / 2);
        ctx.save();
        ctx.globalAlpha = 0.5;
        def.draw(ctx, { id: '__ghost__', type: this.placingType, x: gx, y: gy, width: def.width, height: def.height, props: def.defaultProps || {}, selected: false }, null);
        ctx.restore();
      }
    }
  }

  _drawPins(ctx, inst, def) {
    const sim = window.ArduinoSim;

    for (const pin of def.pins) {
      const wx = inst.x + pin.x;
      const wy = inst.y + pin.y;

      // Check if wired
      const isWired = this.wires.some(w =>
        (w.from.instId === inst.id && w.from.pinId === pin.id) ||
        (w.to.instId   === inst.id && w.to.pinId   === pin.id)
      );

      // Get pin state
      const pinKey = `pin_${this._pinToNumber(pin.id)}`;
      const val = sim.isRunning ? (sim.pinStates[pinKey] || 0) : 0;

      // Pin color
      let pinColor;
      if (pin.type === 'gnd')    pinColor = '#666';
      else if (pin.type === 'power') pinColor = '#cc3333';
      else if (pin.type === 'pwm')   pinColor = val > 0 ? `rgba(188,140,255,${0.4 + val/255*0.6})` : '#555';
      else if (pin.type === 'analog') pinColor = '#e8c840';
      else pinColor = val > 0 ? '#ff5555' : '#3388cc';

      // Wiring highlight
      const isWiringFrom = this.wiringFrom && this.wiringFrom.inst.id === inst.id && this.wiringFrom.pin.id === pin.id;
      const isWiringTarget = this.mode === 'wiring';

      // Draw pin
      ctx.beginPath();
      ctx.arc(wx, wy, isWired ? 5 : 4, 0, Math.PI * 2);
      ctx.fillStyle = isWiringFrom ? '#00e5ff' : (isWired ? pinColor : '#3a3a3a');
      ctx.fill();
      ctx.strokeStyle = isWiringTarget ? 'rgba(0,229,255,0.5)' : (isWired ? pinColor : '#555');
      ctx.lineWidth = 1.5 / this.zoom;
      ctx.stroke();

      // Hover ring
      if (isWiringTarget && !isWiringFrom) {
        ctx.beginPath();
        ctx.arc(wx, wy, 8, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,229,255,0.3)';
        ctx.lineWidth = 1 / this.zoom;
        ctx.stroke();
      }

      // Pin label (only when zoomed in enough) — boards have baked-in labels
      const isBoard = inst.type === 'arduino_uno' || inst.type === 'esp32_devkit_v1';
      if (this.zoom >= 1 && !isBoard) {
        ctx.fillStyle = '#888';
        ctx.font = `${8 / this.zoom}px Inter, sans-serif`;
        ctx.textAlign = pin.side === 'top' ? 'center' : 'center';
        const lx = wx;
        const ly = pin.side === 'top' ? wy - 8 / this.zoom : wy + 12 / this.zoom;
        ctx.fillText(pin.label, lx, ly);
      }
    }
  }

  // ─── Wire routing (Wokwi / Tinkercad style orthogonal traces) ───
  // A wire exits each pin straight out from the component side, then runs
  // horizontally/vertically with right-angle bends, avoiding component bodies.

  _getPinExitDir(instId, pinId) {
    const inst = this.components.find(c => c.id === instId);
    if (!inst) return { x: 0, y: 1 };
    const def = window.ArduinoComponents && window.ArduinoComponents.COMPONENT_DEFS[inst.type];
    if (!def) return { x: 0, y: 1 };
    const pin = def.pins.find(p => p.id === pinId);
    if (!pin) return { x: 0, y: 1 };
    let side = pin.side;
    if (!side) {
      const w = def.width || 40, h = def.height || 40;
      side = pin.y < h * 0.5 ? 'top' : (pin.y > h * 0.5 ? 'bottom' : (pin.x < w * 0.5 ? 'left' : 'right'));
    }
    const dirs = { top: {x: 0, y: -1}, bottom: {x: 0, y: 1}, left: {x: -1, y: 0}, right: {x: 1, y: 0} };
    let d = dirs[side] || { x: 0, y: 1 };
    const rot = (inst.rotation || 0) % 4;
    for (let i = 0; i < rot; i++) d = { x: -d.y, y: d.x }; // rotate 90° clockwise
    return d;
  }

  _componentRects() {
    const defs = window.ArduinoComponents && window.ArduinoComponents.COMPONENT_DEFS;
    const rects = [];
    for (const c of this.components) {
      const def = defs && defs[c.type];
      if (!def) continue;
      rects.push({ x: c.x - 6, y: c.y - 6, w: (def.width || 40) + 12, h: (def.height || 40) + 12 });
    }
    return rects;
  }

  // Liang–Barsky: does segment (a→b) intersect axis-aligned rect r?
  _segHitsRect(ax, ay, bx, by, r) {
    const l = r.x, t = r.y, ri = r.x + r.w, b = r.y + r.h;
    if ((ax < l && bx < l) || (ax > ri && bx > ri) || (ay < t && by < t) || (ay > b && by > b)) return false;
    let tmin = 0, tmax = 1;
    const dx = bx - ax, dy = by - ay;
    const p = [-dx, dx, -dy, dy];
    const q = [ax - l, ri - ax, ay - t, b - ay];
    for (let i = 0; i < 4; i++) {
      if (p[i] === 0) {
        if (q[i] < 0) return false;
      } else {
        const r0 = q[i] / p[i];
        if (p[i] < 0) { if (r0 > tmax) return false; if (r0 > tmin) tmin = r0; }
        else          { if (r0 < tmin) return false; if (r0 < tmax) tmax = r0; }
      }
    }
    return tmin <= tmax;
  }

  _scorePath(pts) {
    const rects = this._componentRects();
    let penalty = 0, len = 0;
    // Score from index 1..len-1 — excludes the pin→stub end segments
    for (let i = 1; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      len += Math.hypot(b.x - a.x, b.y - a.y);
      for (const r of rects) {
        if (this._segHitsRect(a.x, a.y, b.x, b.y, r)) penalty++;
      }
    }
    return { penalty, bends: pts.length - 2, len };
  }

  _laneCandidates(a, b, hint) {
    const push = (arr, v) => { if (arr.every(e => Math.abs(e - v) > 1)) arr.push(v); };
    const xLanes = [], yLanes = [];
    push(xLanes, (a.x + b.x) / 2); push(xLanes, a.x - 30); push(xLanes, a.x + 30);
    push(xLanes, b.x - 30); push(xLanes, b.x + 30);
    push(yLanes, (a.y + b.y) / 2); push(yLanes, a.y - 30); push(yLanes, a.y + 30);
    push(yLanes, b.y - 30); push(yLanes, b.y + 30);
    if (hint) { push(xLanes, hint.x); push(yLanes, hint.y); }
    return { xLanes, yLanes };
  }

  // Build an orthogonal polyline from pin1 (p1, exiting along d1) to pin2 (p2, exiting d2).
  _routePath(p1, d1, p2, d2, hint) {
    const STUB = 24;
    const s1 = { x: p1.x + d1.x * STUB, y: p1.y + d1.y * STUB };
    const s2 = d2 && (d2.x || d2.y) ? { x: p2.x + d2.x * STUB, y: p2.y + d2.y * STUB } : { x: p2.x, y: p2.y };
    const a = s1, b = s2;

    const candidates = [];
    const mk = (...pts) => candidates.push([a, ...pts, b]);

    if (hint) {
      // Dragging: force the route through the cursor (orthogonal bends around it)
      mk({ x: hint.x, y: a.y }, { x: hint.x, y: b.y });
      mk({ x: a.x, y: hint.y }, { x: b.x, y: hint.y });
      mk({ x: hint.x, y: a.y }, { x: hint.x, y: hint.y }, { x: b.x, y: hint.y });
      mk({ x: a.x, y: hint.y }, { x: hint.x, y: hint.y }, { x: hint.x, y: b.y });
    } else {
      // Two L shapes
      mk({ x: b.x, y: a.y });          // horizontal then vertical
      mk({ x: a.x, y: b.y });          // vertical then horizontal

      // Z shapes through lanes
      const { xLanes, yLanes } = this._laneCandidates(a, b, hint);
      for (const lane of xLanes) mk({ x: lane, y: a.y }, { x: lane, y: b.y });
      for (const lane of yLanes) mk({ x: a.x, y: lane }, { x: b.x, y: lane });
    }

    // Pick the best candidate: least body crossings, then fewest bends, then shortest
    let best = null, bestScore = null;
    for (const cand of candidates) {
      const sc = this._scorePath(cand);
      if (!bestScore ||
          sc.penalty < bestScore.penalty ||
          (sc.penalty === bestScore.penalty && sc.bends < bestScore.bends) ||
          (sc.penalty === bestScore.penalty && sc.bends === bestScore.bends && sc.len < bestScore.len)) {
        best = cand;
        bestScore = sc;
      }
    }
    return [p1, ...(best || [a, b]), p2];
  }

  _wirePath(wire) {
    const p1 = this._getPinWorldPos(wire.from.instId, wire.from.pinId);
    const p2 = this._getPinWorldPos(wire.to.instId, wire.to.pinId);
    if (!p1 || !p2) return null;
    if (wire.waypoints && Array.isArray(wire.waypoints) && wire.waypoints.length > 0) {
      return [p1, ...wire.waypoints.map(wp => ({ x: wp.x, y: wp.y })), p2];
    }
    const d1 = this._getPinExitDir(wire.from.instId, wire.from.pinId);
    const d2 = this._getPinExitDir(wire.to.instId, wire.to.pinId);
    const off = this._wireOffsets && this._wireOffsets[wire.id];
    const hint = off && Number.isFinite(off.hx) ? { x: off.hx, y: off.hy } : null;
    return this._routePath(p1, d1, p2, d2, hint);
  }

  _drawWires(ctx) {
    const sim = window.ArduinoSim;

    for (const wire of this.wires) {
      const p1 = this._getPinWorldPos(wire.from.instId, wire.from.pinId);
      const p2 = this._getPinWorldPos(wire.to.instId, wire.to.pinId);
      if (!p1 || !p2) continue;

      const isSelected = this.selectedWire && this.selectedWire.id === wire.id;

      // Determine color: custom color takes priority, then dynamic sim state
      let color;
      if (wire.color) {
        color = wire.color;
      } else {
        const pinKey = this._getPinKey(wire.from.instId, wire.from.pinId);
        const val = sim.isRunning ? (sim.pinStates[pinKey] || 0) : 0;
        const pinType = this._getPinType(wire.from.instId, wire.from.pinId);
        if (pinType === 'gnd')   color = '#444';
        else if (pinType === 'power') color = '#994444';
        else if (val > 1 && val <= 255) color = `rgba(247,201,72,${0.6 + val/255*0.4})`;
        else color = val > 0 ? '#cc3333' : '#2266aa';
      }

      const pts = this._wirePath(wire);
      if (pts) this._drawWire(ctx, pts, color, isSelected, wire);
    }

    // Active wire preview
    if (this.mode === 'wiring' && this.wiringFrom && this.wireMouse) {
      const p1 = { x: this.wiringFrom.wx, y: this.wiringFrom.wy };
      const d1 = this._getPinExitDir(this.wiringFrom.instId, this.wiringFrom.pinId);
      const pts = this._routePath(p1, d1, this.wireMouse, null, this.wireMouse);
      this._drawWire(ctx, pts, '#00e5ff', true, null);
    }
  }

  _drawWire(ctx, pts, color, highlighted, wire) {
    if (!pts || pts.length < 2) return;
    ctx.save();

    // Selection glow behind wire
    if (highlighted) {
      ctx.strokeStyle = 'rgba(0,229,255,0.25)';
      ctx.lineWidth = 8 / this.zoom;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    }

    // Main wire stroke
    ctx.strokeStyle = highlighted ? '#00e5ff' : color;
    ctx.lineWidth = highlighted ? 3 / this.zoom : 2 / this.zoom;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (highlighted) {
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 6;
    }

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();

    // Junction dots at the pins
    ctx.shadowBlur = 0;
    ctx.fillStyle = highlighted ? '#00e5ff' : color;
    ctx.beginPath(); ctx.arc(pts[0].x, pts[0].y, 3 / this.zoom, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(pts[pts.length - 1].x, pts[pts.length - 1].y, 3 / this.zoom, 0, Math.PI * 2); ctx.fill();

    // Draw bend-point handles on selected wire
    if (highlighted && wire && Array.isArray(wire.waypoints) && wire.waypoints.length > 0) {
      ctx.fillStyle = '#00e5ff';
      ctx.strokeStyle = '#0d1117';
      ctx.lineWidth = 1.5 / this.zoom;
      for (const wp of wire.waypoints) {
        const sz = 4 / this.zoom;
        ctx.fillRect(wp.x - sz, wp.y - sz, sz * 2, sz * 2);
        ctx.strokeRect(wp.x - sz, wp.y - sz, sz * 2, sz * 2);
      }
    }

    ctx.restore();

  }

  // ─── Interactive on-canvas controls (sliders for sensors / potentiometer) ───
  _drawInteractives(ctx) {
    const defs = window.ArduinoComponents && window.ArduinoComponents.COMPONENT_DEFS;
    if (!defs || this.zoom < 0.4) return;
    for (const inst of this.components) {
      const def = defs[inst.type];
      if (!def || !Array.isArray(def.interactive) || def.interactive.length === 0) continue;
      const rects = this._getInteractiveRects(inst);
      for (let i = 0; i < rects.length; i++) {
        this._drawSlider(ctx, inst, def.interactive[i], rects[i]);
      }
    }
  }

  _getInteractiveRects(inst) {
    const defs = window.ArduinoComponents && window.ArduinoComponents.COMPONENT_DEFS;
    const def = defs && defs[inst.type];
    if (!def || !Array.isArray(def.interactive)) return [];
    const w = Math.max(40, def.width || 40);
    const h = def.height || 40;
    return def.interactive.map((ctrl, i) => ({
      x: inst.x,
      y: inst.y + h + 14 + i * 15,
      width: w,
      height: 9,
    }));
  }

  _getInteractiveValue(inst, ctrl) {
    const rs = inst.runtimeState || {};
    if (rs[ctrl.field] !== undefined) return rs[ctrl.field];
    const props = inst.props || {};
    if (props[ctrl.field] !== undefined) return props[ctrl.field];
    return ctrl.min;
  }

  _formatSliderValue(value, ctrl) {
    const v = Number(value);
    if (Number.isInteger(ctrl.step)) return String(Math.round(v));
    return String(Math.round(v * 10) / 10);
  }

  _drawSlider(ctx, inst, ctrl, rect) {
    const value = this._getInteractiveValue(inst, ctrl);
    const range = ctrl.max - ctrl.min || 1;
    const pct = Math.max(0, Math.min(1, (value - ctrl.min) / range));
    const active = !!(window.ArduinoSim && window.ArduinoSim.isRunning);
    const invZ = 1 / this.zoom;

    ctx.save();
    // Label
    ctx.fillStyle = active ? 'rgba(220,240,255,0.95)' : 'rgba(160,165,175,0.8)';
    ctx.font = `${8 * invZ}px Inter, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(`${ctrl.label}: ${this._formatSliderValue(value, ctrl)}${ctrl.unit || ''}`, rect.x, rect.y - 2 * invZ);

    // Track
    ctx.fillStyle = 'rgba(20,20,26,0.85)';
    ctx.strokeStyle = active ? 'rgba(0,151,156,0.6)' : 'rgba(120,120,130,0.5)';
    ctx.lineWidth = 1;
    roundRect(ctx, rect.x, rect.y, rect.width, rect.height, rect.height / 2);
    ctx.fill();
    ctx.stroke();

    // Fill
    if (pct > 0.01) {
      ctx.fillStyle = active ? 'rgba(0,151,156,0.8)' : 'rgba(110,110,125,0.55)';
      roundRect(ctx, rect.x, rect.y, Math.max(rect.height, pct * rect.width), rect.height, rect.height / 2);
      ctx.fill();
    }

    // Thumb
    const tx = rect.x + pct * rect.width;
    ctx.fillStyle = active ? '#0ee0e6' : '#c8c8d0';
    ctx.beginPath();
    ctx.arc(tx, rect.y + rect.height / 2, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
  }

  _hitTestSlider(wx, wy) {
    const defs = window.ArduinoComponents && window.ArduinoComponents.COMPONENT_DEFS;
    if (!defs) return null;
    for (const inst of this.components) {
      const def = defs[inst.type];
      if (!def || !Array.isArray(def.interactive) || def.interactive.length === 0) continue;
      const rects = this._getInteractiveRects(inst);
      for (let i = 0; i < rects.length; i++) {
        const r = rects[i];
        if (wx >= r.x - 6 && wx <= r.x + r.width + 6 && wy >= r.y - 12 && wy <= r.y + r.height + 6) {
          return { inst, ctrl: def.interactive[i], rect: r };
        }
      }
    }
    return null;
  }

  _updateSliderValue(drag, wx) {
    const { inst, ctrl, rect } = drag;
    const pct = Math.max(0, Math.min(1, (wx - rect.x) / rect.width));
    let value = ctrl.min + pct * (ctrl.max - ctrl.min);
    if (ctrl.step) value = Math.round(value / ctrl.step) * ctrl.step;
    value = Math.max(ctrl.min, Math.min(ctrl.max, value));
    inst.runtimeState = inst.runtimeState || {};
    inst.runtimeState[ctrl.field] = value;
  }

  _drawOverlays(ctx) {
    // Draw component labels
    if (this.zoom >= 0.7) {
      for (const inst of this.components) {
        const def = window.ArduinoComponents.COMPONENT_DEFS[inst.type];
        if (!def) continue;
        const labelText = inst.props.label || def.name;
        ctx.save();
        ctx.fillStyle = 'rgba(200,200,200,0.6)';
        ctx.font = `${11 / this.zoom}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(labelText, inst.x + def.width / 2, inst.y - 8 / this.zoom);
        ctx.restore();
      }
    }
  }

  /* ══════════════ COMPONENT MANAGEMENT ══════════════ */
  addComponent(type, worldX, worldY) {
    const def = window.ArduinoComponents.COMPONENT_DEFS[type];
    if (!def) return null;
    const wx = Number.isFinite(Number(worldX)) ? Number(worldX) : 0;
    const wy = Number.isFinite(Number(worldY)) ? Number(worldY) : 0;

    const inst = {
      id:           `comp_${Date.now()}_${Math.random().toString(36).substr(2,5)}`,
      type,
      x:            this._snap(wx - def.width / 2),
      y:            this._snap(wy - def.height / 2),
      width:        def.width,
      height:       def.height,
      props:        { ...(def.defaultProps || {}) },
      runtimeState: {},
      selected:     false,
      rotation:     0,
    };

    this._pushHistory();
    this.components.push(inst);
    this._onChanged();
    return inst;
  }

  removeComponent(id) {
    this._pushHistory();
    this.wires = this.wires.filter(w => w.from.instId !== id && w.to.instId !== id);
    this.components = this.components.filter(c => c.id !== id);
    if (this.selected && this.selected.id === id) this.selected = null;
    this._onChanged();
  }

  addWire(fromInstId, fromPinId, toInstId, toPinId, color = null, waypoints = []) {
    // Never allow a pin to be wired to itself
    if (fromInstId === toInstId && fromPinId === toPinId) return null;

    // Avoid duplicate wires
    const exists = this.wires.some(w =>
      (w.from.instId === fromInstId && w.from.pinId === fromPinId && w.to.instId === toInstId && w.to.pinId === toPinId) ||
      (w.from.instId === toInstId && w.from.pinId === toPinId && w.to.instId === fromInstId && w.to.pinId === fromPinId)
    );
    if (exists) return null;

    this._pushHistory();
    const wire = {
      id: `wire_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      from: { instId: fromInstId, pinId: fromPinId },
      to:   { instId: toInstId,   pinId: toPinId },
      color: color || null,
      waypoints: Array.isArray(waypoints) ? waypoints.map(wp => ({ x: wp.x, y: wp.y })) : []
    };
    this.wires.push(wire);
    this._onChanged();
    return wire;
  }

  setWireColor(wireId, color) {
    const wire = this.wires.find(w => w.id === wireId);
    if (!wire) return;
    this._pushHistory();
    wire.color = color || null;
    this._onChanged();
  }

  _simplifyWaypoints(wire) {
    if (!wire || !wire.waypoints || wire.waypoints.length === 0) return;
    const p1 = this._getPinWorldPos(wire.from.instId, wire.from.pinId);
    const p2 = this._getPinWorldPos(wire.to.instId, wire.to.pinId);
    if (!p1 || !p2) return;

    let pts = [p1, ...wire.waypoints, p2];
    let simplified = [pts[0]];

    for (let i = 1; i < pts.length - 1; i++) {
      const prev = simplified[simplified.length - 1];
      const curr = pts[i];
      const next = pts[i + 1];

      // Skip duplicate consecutive points
      if (Math.abs(curr.x - prev.x) < 0.5 && Math.abs(curr.y - prev.y) < 0.5) continue;

      // Skip redundant collinear points on straight line
      const isCollinearX = Math.abs(prev.x - curr.x) < 0.5 && Math.abs(curr.x - next.x) < 0.5;
      const isCollinearY = Math.abs(prev.y - curr.y) < 0.5 && Math.abs(curr.y - next.y) < 0.5;
      if (isCollinearX || isCollinearY) continue;

      simplified.push(curr);
    }
    simplified.push(p2);

    wire.waypoints = simplified.slice(1, -1).map(p => ({ x: Math.round(p.x), y: Math.round(p.y) }));
  }

  removeWire(id) {
    this._pushHistory();
    this.wires = this.wires.filter(w => w.id !== id);
    if (this.selectedWire && this.selectedWire.id === id) this.selectedWire = null;
    this._onChanged();
  }

  clearCanvas() {
    this._pushHistory();
    this.components = [];
    this.wires = [];
    this.selected = null;
    this.selectedWire = null;
    this._onChanged();
  }

  rotateSelected() {
    if (!this.selected) return;
    this._pushHistory();
    this.selected.rotation = ((this.selected.rotation || 0) + 1) % 4;
    this._onChanged();
  }

  deleteSelected() {
    if (this.selected) { this.removeComponent(this.selected.id); return; }
    if (this.selectedWire) { this.removeWire(this.selectedWire.id); }
  }

  selectAll() {
    this.components.forEach(c => c.selected = true);
    this.selected = this.components[this.components.length - 1] || null;
  }

  duplicateSelected() {
    if (!this.selected) return null;
    const orig = this.selected;
    const def = window.ArduinoComponents.COMPONENT_DEFS[orig.type];
    const offset = this.GRID * 2;
    const copy = {
      id: `${orig.type}_${Date.now()}`,
      type: orig.type,
      x: orig.x + offset,
      y: orig.y + offset,
      props: JSON.parse(JSON.stringify(orig.props || (def ? def.defaultProps : {}))),
      runtimeState: {},
      selected: true,
      rotation: orig.rotation || 0,
    };
    this._pushHistory();
    this._selectAll(false);
    this.components.push(copy);
    this.selected = copy;
    this.selectedWire = null;
    this._onChanged();
    return copy;
  }

  copySelected() {
    if (this.selected) {
      this._clipboard = JSON.parse(JSON.stringify(this.selected));
    }
  }

  paste() {
    if (!this._clipboard) return;
    const orig = this._clipboard;
    const offset = this.GRID * 2;
    const copy = {
      id: `${orig.type}_${Date.now()}`,
      type: orig.type,
      x: orig.x + offset,
      y: orig.y + offset,
      props: JSON.parse(JSON.stringify(orig.props || {})),
      runtimeState: {},
      selected: true,
      rotation: orig.rotation || 0,
    };
    this._pushHistory();
    this._selectAll(false);
    this.components.push(copy);
    this.selected = copy;
    this.selectedWire = null;
    // update clipboard pos for sequential pastes
    this._clipboard.x += offset;
    this._clipboard.y += offset;
    this._onChanged();
  }

  startPlacing(type) {
    this.mode = 'placing';
    this.placingType = type;
    this.canvas.style.cursor = 'crosshair';
    // Show hint
    const hint = document.getElementById('placing-hint');
    const nameEl = document.getElementById('placing-name');
    if (hint && nameEl) {
      const def = window.ArduinoComponents.COMPONENT_DEFS[type];
      nameEl.textContent = def ? def.name : type;
      hint.classList.remove('hidden');
    }
    // Notify app that placing mode started
    if (this.onPlacingChanged) this.onPlacingChanged(true);
  }

  cancelPlacing() {
    this.mode = 'idle';
    this.placingType = null;
    this.placingMouse = null;
    this.canvas.style.cursor = '';
    const hint = document.getElementById('placing-hint');
    if (hint) hint.classList.add('hidden');
    // Remove active class from sidebar
    document.querySelectorAll('.comp-item').forEach(el => el.classList.remove('placing'));
    // Notify app that placing mode ended
    if (this.onPlacingChanged) this.onPlacingChanged(false);
  }

  /* ══════════════ EVENT HANDLING ══════════════ */
  _bindEvents() {
    const canvas = this.canvas;

    canvas.addEventListener('mousedown',  e => this._onMouseDown(e));
    canvas.addEventListener('mousemove',  e => this._onMouseMove(e));
    canvas.addEventListener('mouseup',    e => this._onMouseUp(e));
    canvas.addEventListener('wheel',      e => this._onWheel(e), { passive: false });
    canvas.addEventListener('dblclick',   e => this._onDblClick(e));
    canvas.addEventListener('contextmenu',e => this._onContextMenu(e));
    canvas.addEventListener('mouseleave', () => this._hidePinTooltip());

    document.addEventListener('keydown', e => this._onKeyDown(e));
    document.addEventListener('mouseup', () => { if (this.mode === 'panning') this.mode = 'idle'; });
  }

  _onMouseDown(e) {
    const world = this._toWorld(e.offsetX, e.offsetY);
    this._lastMouse = { x: e.clientX, y: e.clientY };

    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      // Middle/Alt+left = pan
      this.mode = 'panning';
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    if (e.button === 0) {
      if (this.mode === 'placing') {
        this._placeComponent(world);
        return;
      }

      // Check pin click first (start wiring)
      const pinHit = this._hitTestPin(world.x, world.y);
      if (pinHit) {
        if (this.mode === 'wiring') {
          // Complete wire if compatible pin
          if (pinHit.inst.id !== this.wiringFrom.inst.id) {
            this.addWire(this.wiringFrom.inst.id, this.wiringFrom.pin.id, pinHit.inst.id, pinHit.pin.id);
          }
          this._endWiring();
        } else {
          // Start wiring
          this._startWiring(pinHit.inst, pinHit.pin, pinHit.worldX, pinHit.worldY);
        }
        return;
      }

      if (this.mode === 'wiring') {
        this._endWiring();
        return;
      }

      // Interactive on-canvas slider (potentiometer / sensor value)
      const sliderHit = this._hitTestSlider(world.x, world.y);
      if (sliderHit) {
        this._selectAll(false);
        this.selected = null;
        this.selectedWire = null;
        this.mode = 'sliderdrag';
        this.sliderDrag = sliderHit;
        this._updateSliderValue(sliderHit, world.x);
        return;
      }

      // Check wire click (select and/or start dragging segment/handle)
      const wireDetail = this._hitTestWireDetails(world.x, world.y);
      if (wireDetail) {
        this._selectAll(false);
        this.selectedWire = wireDetail.wire;
        this.selected = null;

        const wire = wireDetail.wire;
        const p1 = this._getPinWorldPos(wire.from.instId, wire.from.pinId);
        const p2 = this._getPinWorldPos(wire.to.instId, wire.to.pinId);

        // If wire doesn't have waypoints yet, initialize them from current polyline
        if ((!wire.waypoints || wire.waypoints.length === 0) && wireDetail.pts && wireDetail.pts.length > 2) {
          wire.waypoints = wireDetail.pts.slice(1, -1).map(p => ({ x: Math.round(p.x), y: Math.round(p.y) }));
        }

        const currentPts = this._wirePath(wire) || wireDetail.pts;

        this.mode = 'wiredrag';
        this.draggingWire = {
          wireId: wire.id,
          handleIdx: wireDetail.handleIdx,
          segIdx: wireDetail.segIdx,
          startWorld: { x: world.x, y: world.y },
          initialWaypoints: (wire.waypoints || []).map(p => ({ x: p.x, y: p.y })),
          pts: currentPts.map(p => ({ x: p.x, y: p.y })),
          moved: false
        };
        this.canvas.style.cursor = 'grabbing';
        return;
      }

      // Check component click
      const compHit = this._hitTestComp(world.x, world.y);
      if (compHit) {
        if (!e.shiftKey) this._selectAll(false);
        compHit.selected = true;
        this.selected = compHit;
        this.selectedWire = null;

        // --- New: toggle push_button pressed state on click ---
        if (compHit.type === 'push_button') {
          const inst = compHit;
          inst.runtimeState = inst.runtimeState || {};
          inst.runtimeState.pressed = !inst.runtimeState.pressed;
        }
        // ------------------------------------------------

        this.mode = 'dragging';
        this.dragging = {
          inst: compHit,
          offsetX: world.x - compHit.x,
          offsetY: world.y - compHit.y,
          startX: compHit.x,
          startY: compHit.y,
          moved: false,
        };
        return;
      }

      // Click on empty space — deselect
      this._selectAll(false);
      this.selected = null;
      this.selectedWire = null;

      // Start pan
      this.mode = 'panning';
      this.canvas.style.cursor = 'grabbing';
    }
  }

  _onMouseMove(e) {
    const world = this._toWorld(e.offsetX, e.offsetY);
    this._updateCoords(e.offsetX, e.offsetY, world);

    if (this.mode === 'panning') {
      const dx = e.clientX - this._lastMouse.x;
      const dy = e.clientY - this._lastMouse.y;
      this.panX += dx;
      this.panY += dy;
      this._lastMouse = { x: e.clientX, y: e.clientY };
      this._hidePinTooltip();
      return;
    }

    if (this.mode === 'dragging' && this.dragging) {
      const newX = this._snap(world.x - this.dragging.offsetX);
      const newY = this._snap(world.y - this.dragging.offsetY);
      this.dragging.inst.x = newX;
      this.dragging.inst.y = newY;
      this.dragging.moved = true;
      this._lastMouse = { x: e.clientX, y: e.clientY };
      this._hidePinTooltip();
      return;
    }

    if (this.mode === 'sliderdrag' && this.sliderDrag) {
      this._updateSliderValue(this.sliderDrag, world.x);
      return;
    }

    if (this.mode === 'wiredrag' && this.draggingWire) {
      const wire = this.wires.find(w => w.id === this.draggingWire.wireId);
      if (!wire) return;

      const p1 = this._getPinWorldPos(wire.from.instId, wire.from.pinId);
      const p2 = this._getPinWorldPos(wire.to.instId, wire.to.pinId);
      if (!p1 || !p2) return;

      this.draggingWire.moved = true;
      const snapX = this._snap(world.x);
      const snapY = this._snap(world.y);

      // Case 1: Dragging an existing waypoint handle directly
      if (this.draggingWire.handleIdx >= 0 && wire.waypoints && wire.waypoints[this.draggingWire.handleIdx]) {
        wire.waypoints[this.draggingWire.handleIdx].x = snapX;
        wire.waypoints[this.draggingWire.handleIdx].y = snapY;
        this._render();
        return;
      }

      // Case 2: Dragging a segment
      const initPts = [p1, ...this.draggingWire.initialWaypoints.map(p => ({ x: p.x, y: p.y })), p2];
      const segIdx = this.draggingWire.segIdx;

      if (segIdx >= 0 && segIdx < initPts.length - 1) {
        const a = initPts[segIdx];
        const b = initPts[segIdx + 1];
        const isHoriz = Math.abs(a.y - b.y) <= 2;
        const isVert  = Math.abs(a.x - b.x) <= 2;

        if (isHoriz) {
          if (initPts.length === 2) {
            wire.waypoints = [
              { x: a.x, y: snapY },
              { x: b.x, y: snapY }
            ];
          } else if (segIdx === 0) {
            const nextWp = initPts[1];
            wire.waypoints = [
              { x: a.x, y: snapY },
              { x: nextWp.x, y: snapY },
              ...initPts.slice(2, -1)
            ];
          } else if (segIdx === initPts.length - 2) {
            const prevWp = initPts[initPts.length - 2];
            wire.waypoints = [
              ...initPts.slice(1, -2),
              { x: prevWp.x, y: snapY },
              { x: b.x, y: snapY }
            ];
          } else {
            const wps = this.draggingWire.initialWaypoints.map(p => ({ ...p }));
            const wpAIdx = segIdx - 1;
            const wpBIdx = segIdx;
            if (wps[wpAIdx]) wps[wpAIdx].y = snapY;
            if (wps[wpBIdx]) wps[wpBIdx].y = snapY;
            wire.waypoints = wps;
          }
        } else if (isVert) {
          if (initPts.length === 2) {
            wire.waypoints = [
              { x: snapX, y: a.y },
              { x: snapX, y: b.y }
            ];
          } else if (segIdx === 0) {
            const nextWp = initPts[1];
            wire.waypoints = [
              { x: snapX, y: a.y },
              { x: snapX, y: nextWp.y },
              ...initPts.slice(2, -1)
            ];
          } else if (segIdx === initPts.length - 2) {
            const prevWp = initPts[initPts.length - 2];
            wire.waypoints = [
              ...initPts.slice(1, -2),
              { x: snapX, y: prevWp.y },
              { x: snapX, y: b.y }
            ];
          } else {
            const wps = this.draggingWire.initialWaypoints.map(p => ({ ...p }));
            const wpAIdx = segIdx - 1;
            const wpBIdx = segIdx;
            if (wps[wpAIdx]) wps[wpAIdx].x = snapX;
            if (wps[wpBIdx]) wps[wpBIdx].x = snapX;
            wire.waypoints = wps;
          }
        } else {
          if (segIdx === 0) {
            wire.waypoints = [{ x: snapX, y: snapY }, ...initPts.slice(2, -1)];
          } else {
            const wps = this.draggingWire.initialWaypoints.map(p => ({ ...p }));
            if (wps[segIdx - 1]) {
              wps[segIdx - 1].x = snapX;
              wps[segIdx - 1].y = snapY;
            }
            wire.waypoints = wps;
          }
        }
      }

      this._render();
      return;
    }

    if (this.mode === 'wiring') {
      this.wireMouse = world;
      this._hidePinTooltip();
      return;
    }

    if (this.mode === 'placing') {
      this.placingMouse = world;
      this._hidePinTooltip();
      return;
    }

    // Hover cursor + pin tooltip
    const pin = this._hitTestPin(world.x, world.y);
    const comp = this._hitTestComp(world.x, world.y);
    const wireDetail = this._hitTestWireDetails(world.x, world.y);

    if (pin) {
      this.canvas.style.cursor = 'crosshair';
      this._showPinTooltip(pin, e);
    } else {
      this._hidePinTooltip();
      if (comp) {
        this.canvas.style.cursor = 'move';
      } else if (wireDetail) {
        this.canvas.style.cursor = 'grab';
      } else {
        this.canvas.style.cursor = '';
      }
    }
  }

  _onMouseUp(e) {
    if (this.mode === 'dragging' && this.dragging) {
      if (this.dragging.moved) {
        this._pushHistory();
        this._onChanged();
      }
      this.mode = 'idle';
      this.dragging = null;
    }
    if (this.mode === 'panning') {
      this.mode = 'idle';
      this.canvas.style.cursor = '';
    }
    if (this.mode === 'sliderdrag') {
      this.mode = 'idle';
      this.sliderDrag = null;
    }
    if (this.mode === 'wiredrag' && this.draggingWire) {
      const wire = this.wires.find(w => w.id === this.draggingWire.wireId);
      if (wire) {
        this._simplifyWaypoints(wire);
      }
      if (this.draggingWire.moved) {
        this._pushHistory();
        this._onChanged();
      }
      this.mode = 'idle';
      this.draggingWire = null;
      this.canvas.style.cursor = '';
    }
  }

  _onWheel(e) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Zoom around mouse position
    this.panX -= (mx - this.panX) * (factor - 1);
    this.panY -= (my - this.panY) * (factor - 1);
    this.zoom = Math.max(0.1, Math.min(4, this.zoom * factor));

    this._updateZoomDisplay();
  }

  _onDblClick(e) {
    const world = this._toWorld(e.offsetX, e.offsetY);
    const comp = this._hitTestComp(world.x, world.y);
    if (comp && window.App) {
      window.App.openPropsModal(comp);
    }
  }

  _onContextMenu(e) {
    e.preventDefault();
    const world = this._toWorld(e.offsetX, e.offsetY);
    const comp = this._hitTestComp(world.x, world.y);
    const wire = this._hitTestWire(world.x, world.y);
    if (comp) {
      this._selectAll(false);
      comp.selected = true;
      this.selected = comp;
      this.selectedWire = null;
    } else if (wire) {
      this._selectAll(false);
      this.selectedWire = wire;
      this.selected = null;
    }
    if (this.onContextMenu) {
      this.onContextMenu(comp || (wire ? { type: 'wire', id: wire.id, wire } : null), e.clientX, e.clientY);
    }
  }

  _onKeyDown(e) {
    // Only handle when canvas is in focus (not in editor)
    const t = e.target;
    if (t && typeof t.closest === 'function' && t.closest('#editor-container')) return;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

    if (e.key === 'Delete' || e.key === 'Backspace') { this.deleteSelected(); }
    if (e.key === 'r' || e.key === 'R') { this.rotateSelected(); }
    if (e.key === 'Escape') {
      if (this.mode === 'placing') this.cancelPlacing();
      if (this.mode === 'wiring') this._endWiring();
      this._selectAll(false);
      this.selected = null;
      this.selectedWire = null;
    }
    if (e.key === 'f' || e.key === 'F') { this.fitView(); }
    if (e.ctrlKey && e.key.toLowerCase() === 'c') { this.copySelected(); }
    if (e.ctrlKey && e.key.toLowerCase() === 'v') { this.paste(); }
    if (e.ctrlKey && e.key.toLowerCase() === 'd') { e.preventDefault(); this.duplicateSelected(); }
    if (e.ctrlKey && e.key === 'z') { e.preventDefault(); this.undo(); }
    if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); this.redo(); }
    if (e.ctrlKey && e.key === 'a') { e.preventDefault(); this.selectAll(); }
  }

  /* ══════════════ WIRING ══════════════ */
  _startWiring(inst, pin, wx, wy) {
    this.mode = 'wiring';
    this.wiringFrom = { inst, pin, wx, wy };
    this.wireMouse = { x: wx, y: wy };
    const hint = document.getElementById('wiring-hint');
    if (hint) hint.classList.remove('hidden');
    this.canvas.style.cursor = 'crosshair';
  }

  _endWiring() {
    this.mode = 'idle';
    this.wiringFrom = null;
    this.wireMouse = null;
    this.canvas.style.cursor = '';
    const hint = document.getElementById('wiring-hint');
    if (hint) hint.classList.add('hidden');
  }

  /* ══════════════ HIT TESTING ══════════════ */
  _hitTestPin(wx, wy) {
    const { COMPONENT_DEFS } = window.ArduinoComponents;
    const radius = Math.max(8, 10 / this.zoom);

    for (const inst of [...this.components].reverse()) {
      const def = COMPONENT_DEFS[inst.type];
      if (!def) continue;
      for (const pin of def.pins) {
        const px = inst.x + pin.x;
        const py = inst.y + pin.y;
        const dist = Math.sqrt((wx - px) ** 2 + (wy - py) ** 2);
        if (dist <= radius) {
          return { inst, pin, worldX: px, worldY: py };
        }
      }
    }
    return null;
  }

  /* ══════════════ PIN TOOLTIP ══════════════ */
  _pinTypeLabel(type) {
    const map = {
      digital: 'Digital I/O',
      pwm:     'PWM (Digital)',
      analog:  'Analog In (A/D)',
      power:   'Power',
      gnd:     'Ground',
      signal:  'Signal',
    };
    return map[type] || type;
  }

  _showPinTooltip(hit, e) {
    if (this.mode !== 'idle') return;
    if (!this.tooltipEl) this.tooltipEl = document.getElementById('pin-tooltip');
    const el = this.tooltipEl;
    if (!el) return;

    const { inst, pin } = hit;
    const key = `${inst.id}|${pin.id}`;
    const def = window.ArduinoComponents.COMPONENT_DEFS[inst.type];
    const typeLabel = this._pinTypeLabel(pin.type);
    const pinNum = this._pinToNumber(pin.id);
    const sim = window.ArduinoSim;
    const running = !!(sim && sim.isRunning);

    // Rebuild content only when hovering a different pin
    if (key !== this._tipKey) {
      this._tipKey = key;
      el.innerHTML = '';
      const frag = document.createDocumentFragment();

      const compName = (inst.props && inst.props.label)
        ? inst.props.label
        : ((def && def.name) || inst.type);
      const title = document.createElement('div');
      title.className = 'pin-tip-title';
      title.textContent = `${compName} · ${pin.label}`;
      frag.appendChild(title);

      const addRow = (k, v, cls) => {
        const row = document.createElement('div');
        row.className = 'pin-tip-row';
        const kEl = document.createElement('span');
        kEl.textContent = k;
        const vEl = document.createElement('b');
        vEl.textContent = v;
        if (cls) vEl.className = cls;
        row.appendChild(kEl);
        row.appendChild(vEl);
        frag.appendChild(row);
      };

      addRow('Type', typeLabel);
      // Pin function description from the guide reference
      const pinDoc = window.GuidePinDescs && window.GuidePinDescs[inst.type];
      if (pinDoc) {
        if (pinDoc[pin.id] && pinDoc[pin.id].desc) {
          addRow('Function', pinDoc[pin.id].desc);
        } else {
          // Board-style grouped pins (e.g. D0–D13, VP / VN): find a matching group
          const match = Object.entries(pinDoc).find(([k, v]) =>
            v.label && this._pinMatchesGroup(pin.id, v.label));
          if (match && match[1].desc) addRow('Function', match[1].desc);
        }
      }
      if (inst.type === 'esp32_devkit_v1') {
        const espAliases = { VP:36, VN:39, TX0:1, RX0:3, EN:0 };
        if (pin.id in espAliases || /^D\d+$/.test(pin.id)) {
          addRow('GPIO', pinNum);
        }
      } else if (inst.type === 'arduino_uno' && /^[AD]\d+$/.test(pin.id)) {
        addRow('Arduino Pin', pinNum);
      }
      if (running) {
        const val = sim.pinStates ? (sim.pinStates[`pin_${pinNum}`] || 0) : 0;
        if (pin.type === 'gnd') addRow('State', '0V', 'pin-tip-low');
        else if (pin.type === 'power') addRow('State', pin.label, 'pin-tip-high');
        else if (pin.type === 'pwm' && val > 0) addRow('State', `PWM ${val}`, 'pin-tip-high');
        else addRow('State', val > 0 ? 'HIGH' : 'LOW', val > 0 ? 'pin-tip-high' : 'pin-tip-low');
      } else {
        addRow('State', 'Idle');
      }
      el.appendChild(frag);
    }

    // Follow cursor and clamp to viewport
    const pad = 14;
    el.classList.remove('hidden');
    el.style.left = `${e.clientX + pad}px`;
    el.style.top  = `${e.clientY + pad}px`;
    const r = el.getBoundingClientRect();
    if (r.right > window.innerWidth - 8)  el.style.left = `${Math.max(8, e.clientX - r.width - pad)}px`;
    if (r.bottom > window.innerHeight - 8) el.style.top  = `${Math.max(8, e.clientY - r.height - pad)}px`;
  }

  _hidePinTooltip() {
    this._tipKey = null;
    if (this.tooltipEl) this.tooltipEl.classList.add('hidden');
  }

  _hitTestComp(wx, wy) {
    const { COMPONENT_DEFS } = window.ArduinoComponents;
    for (const inst of [...this.components].reverse()) {
      const def = COMPONENT_DEFS[inst.type];
      if (!def) continue;
      if (wx >= inst.x && wx <= inst.x + def.width &&
          wy >= inst.y && wy <= inst.y + def.height) {
        return inst;
      }
    }
    return null;
  }

  _hitTestWire(wx, wy) {
    const detail = this._hitTestWireDetails(wx, wy);
    return detail ? detail.wire : null;
  }

  _hitTestWireDetails(wx, wy) {
    const threshold = Math.max(6, 8 / this.zoom);
    let best = null;

    for (const wire of [...this.wires].reverse()) {
      const pts = this._wirePath(wire);
      if (!pts || pts.length < 2) continue;

      // Check waypoint handles if wire has waypoints
      if (wire.waypoints && Array.isArray(wire.waypoints)) {
        for (let j = 0; j < wire.waypoints.length; j++) {
          const wp = wire.waypoints[j];
          const dist = Math.hypot(wx - wp.x, wy - wp.y);
          if (dist <= threshold + 4) {
            return { wire, pts, segIdx: -1, handleIdx: j, dist };
          }
        }
      }

      // Check segments
      for (let i = 0; i < pts.length - 1; i++) {
        const d = this._distToSegment(wx, wy, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
        if (d <= threshold) {
          if (!best || d < best.dist) {
            best = { wire, pts, segIdx: i, handleIdx: -1, dist: d };
          }
        }
      }
    }
    return best;
  }

  _distToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const t = Math.max(0, Math.min(1, ((px-x1)*dx + (py-y1)*dy) / (dx*dx + dy*dy || 1)));
    const nx = x1 + t*dx, ny = y1 + t*dy;
    return Math.sqrt((px-nx)**2 + (py-ny)**2);
  }

  /* ══════════════ UTILITIES ══════════════ */
  _toWorld(sx, sy) {
    return {
      x: (sx - this.panX) / this.zoom,
      y: (sy - this.panY) / this.zoom,
    };
  }

  _snap(v) { return Math.round(v / this.GRID) * this.GRID; }

  _selectAll(sel) { this.components.forEach(c => c.selected = sel); }

  _getPinWorldPos(instId, pinId) {
    const inst = this.components.find(c => c.id === instId);
    if (!inst) return null;
    const def = window.ArduinoComponents.COMPONENT_DEFS[inst.type];
    if (!def) return null;
    const pin = def.pins.find(p => p.id === pinId);
    if (!pin) return null;
    return { x: inst.x + pin.x, y: inst.y + pin.y };
  }

  _getPinKey(instId, pinId) {
    const inst = this.components.find(c => c.id === instId);
    if (!inst) return null;
    return `pin_${this._pinToNumber(pinId)}`;
  }

  _getPinType(instId, pinId) {
    const inst = this.components.find(c => c.id === instId);
    if (!inst) return 'digital';
    const def = window.ArduinoComponents.COMPONENT_DEFS[inst.type];
    if (!def) return 'digital';
    const pin = def.pins.find(p => p.id === pinId);
    return pin ? pin.type : 'digital';
  }

  _pinToNumber(pinId) {
    const analogMap = { A0:14, A1:15, A2:16, A3:17, A4:18, A5:19 };
    if (pinId in analogMap) return analogMap[pinId];
    // ESP32 DevKit V1 pin aliases
    const esp32Map = { VP:36, VN:39, TX0:1, RX0:3, EN:0 };
    if (pinId in esp32Map) return esp32Map[pinId];
    const n = parseInt(pinId.replace(/[^0-9]/g,''));
    return isNaN(n) ? 0 : n;
  }

  /* Match a pin like D7/A3/VP against a group label like "D0–D13",
     "A0–A5", "VP / VN" or "D34 / D35". */
  _pinMatchesGroup(pinId, groupLabel) {
    const label = String(groupLabel || '').trim();
    // Range form: "D0–D13"
    if (label.includes('–') || label.includes('-')) {
      const parts = label.split(/[–-]/);
      if (parts.length !== 2) return false;
      const m = /^([AD])(\d+)$/.exec(pinId);
      if (!m) return false;
      const letter = m[1];
      const num = parseInt(m[2], 10);
      const start = /^([AD])(\d+)$/.exec(parts[0].trim());
      const end = /^([AD])(\d+)$/.exec(parts[1].trim());
      if (!start || !end || start[1] !== letter || end[1] !== letter) return false;
      return num >= parseInt(start[2], 10) && num <= parseInt(end[2], 10);
    }
    // List form: "VP / VN" — match if pinId appears on either side
    return label.split('/').map(s => s.trim()).includes(pinId);
  }

  _placeComponent(world) {
    if (!this.placingType) return;
    const inst = this.addComponent(this.placingType, world.x, world.y);
    // Don't cancel placing — allow multiple placement
    // Press ESC to stop
    return inst;
  }

  _updateCoords(sx, sy, world) {
    const el = document.getElementById('canvas-coords');
    if (el) el.textContent = `X: ${Math.round(world.x)}  Y: ${Math.round(world.y)}`;
  }

  _updateZoomDisplay() {
    const el = document.getElementById('zoom-display');
    if (el) el.textContent = `${Math.round(this.zoom * 100)}%`;
  }

  _onChanged() {
    const compEl = document.getElementById('canvas-comp-count');
    const wireEl = document.getElementById('canvas-wire-count');
    if (compEl) compEl.textContent = `${this.components.length} component${this.components.length !== 1 ? 's' : ''}`;
    if (wireEl) wireEl.textContent = `${this.wires.length} wire${this.wires.length !== 1 ? 's' : ''}`;
    if (this.onCompChanged) this.onCompChanged();
  }

  /* ══════════════ VIEWPORT ══════════════ */
  fitView() {
    if (this.components.length === 0) {
      this.panX = this.canvas.width / 2 - 200;
      this.panY = this.canvas.height / 2 - 100;
      this.zoom = 1;
      this._updateZoomDisplay();
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const inst of this.components) {
      const def = window.ArduinoComponents.COMPONENT_DEFS[inst.type];
      if (!def) continue;
      minX = Math.min(minX, inst.x - 20);
      minY = Math.min(minY, inst.y - 20);
      maxX = Math.max(maxX, inst.x + def.width + 20);
      maxY = Math.max(maxY, inst.y + def.height + 20);
    }

    const w = this.canvas.width, h = this.canvas.height;
    const cw = maxX - minX, ch = maxY - minY;
    const safeCw = cw > 0 && Number.isFinite(cw) ? cw : 1;
    const safeCh = ch > 0 && Number.isFinite(ch) ? ch : 1;
    this.zoom = Math.min(4, Math.max(0.2, Math.min(w / safeCw, h / safeCh) * 0.9));
    this.panX = (w - safeCw * this.zoom) / 2 - minX * this.zoom;
    this.panY = (h - safeCh * this.zoom) / 2 - minY * this.zoom;
    this._updateZoomDisplay();
  }

  zoomIn()  { this.zoom = Math.min(4, this.zoom * 1.2); this._updateZoomDisplay(); }
  zoomOut() { this.zoom = Math.max(0.1, this.zoom / 1.2); this._updateZoomDisplay(); }

  /* ══════════════ HISTORY ══════════════ */
  _pushHistory() {
    const state = JSON.stringify({ components: this.components, wires: this.wires });
    this.history = this.history.slice(0, this.historyIdx + 1);
    this.history.push(state);
    if (this.history.length > 50) this.history.shift();
    this.historyIdx = this.history.length - 1;
  }

  undo() {
    if (this.historyIdx <= 0) return;
    this.historyIdx--;
    this._restoreState(this.history[this.historyIdx]);
  }

  redo() {
    if (this.historyIdx >= this.history.length - 1) return;
    this.historyIdx++;
    this._restoreState(this.history[this.historyIdx]);
  }

  _restoreState(json) {
    try {
      const { components, wires } = JSON.parse(json);
      this.components = components;
      this.wires = (Array.isArray(wires) ? wires : []).map(w => ({
        ...w,
        color: (typeof w.color === 'string' && w.color.length > 0) ? w.color : null,
        waypoints: Array.isArray(w.waypoints)
          ? w.waypoints.filter(p => p && Number.isFinite(p.x) && Number.isFinite(p.y)).map(p => ({ x: Number(p.x), y: Number(p.y) }))
          : []
      }));
      this.selected = null;
      this.selectedWire = null;
      this._onChanged();
    } catch(e) {}
  }

  /* ══════════════ SERIALIZE ══════════════ */
  serialize() {
    return { components: this.components, wires: this.wires };
  }

  deserialize(data) {
    if (!data || typeof data !== 'object') return;
    const defs = window.ArduinoComponents && window.ArduinoComponents.COMPONENT_DEFS
      ? window.ArduinoComponents.COMPONENT_DEFS : {};

    // Sanitize components: keep only known types with valid ids/positions
    const seenIds = new Set();
    const components = (Array.isArray(data.components) ? data.components : [])
      .filter(c => c && typeof c === 'object' && c.type && defs[c.type] && c.id)
      .map(c => {
        const def = defs[c.type];
        const x = Number(c.x);
        const y = Number(c.y);
        const rot = Number(c.rotation);
        return {
          id: String(c.id),
          type: c.type,
          x: Number.isFinite(x) ? Math.round(x / this.GRID) * this.GRID : 0,
          y: Number.isFinite(y) ? Math.round(y / this.GRID) * this.GRID : 0,
          width: def.width,
          height: def.height,
          props: Object.assign({}, def.defaultProps || {},
            (c.props && typeof c.props === 'object') ? c.props : {}),
          runtimeState: {},
          selected: false,
          rotation: Number.isFinite(rot) ? ((Math.round(rot) % 4) + 4) % 4 : 0,
        };
      })
      .filter(c => {
        if (seenIds.has(c.id)) return false;
        seenIds.add(c.id);
        return true;
      });

    const idSet = new Set(components.map(c => c.id));
    const seenWires = new Set();
    const wires = (Array.isArray(data.wires) ? data.wires : [])
      .filter(w => w && w.from && w.to && idSet.has(w.from.instId) && idSet.has(w.to.instId))
      .map(w => ({
        id: String(w.id || `wire_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`),
        from: { instId: String(w.from.instId), pinId: String(w.from.pinId) },
        to:   { instId: String(w.to.instId),   pinId: String(w.to.pinId) },
        color: (typeof w.color === 'string' && w.color.length > 0) ? w.color : null,
        waypoints: Array.isArray(w.waypoints)
          ? w.waypoints.filter(p => p && Number.isFinite(p.x) && Number.isFinite(p.y)).map(p => ({ x: Number(p.x), y: Number(p.y) }))
          : []
      }))
      .filter(w => {
        if (w.from.instId === w.to.instId && w.from.pinId === w.to.pinId) return false;
        const a = `${w.from.instId}:${w.from.pinId}:${w.to.instId}:${w.to.pinId}`;
        const b = `${w.to.instId}:${w.to.pinId}:${w.from.instId}:${w.from.pinId}`;
        if (seenWires.has(a) || seenWires.has(b)) return false;
        seenWires.add(a);
        seenWires.add(b);
        return true;
      });

    this.components = components;
    this.wires = wires;
    this.selected = null;
    this.selectedWire = null;

    // Reset history so undo can't roll back into a blank/empty state
    this.history = [JSON.stringify({ components: this.components, wires: this.wires })];
    this.historyIdx = 0;

    this._onChanged();
    setTimeout(() => this.fitView(), 100);
  }

  exportPNG() {
    try {
      // Render to a temp canvas with white background
      const tmp = document.createElement('canvas');
      tmp.width  = this.canvas.width;
      tmp.height = this.canvas.height;
      const tc = tmp.getContext('2d');
      tc.fillStyle = '#0d1117';
      tc.fillRect(0, 0, tmp.width, tmp.height);
      tc.drawImage(this.canvas, 0, 0);
      const a = document.createElement('a');
      a.href = tmp.toDataURL('image/png');
      a.download = 'circuit.png';
      a.click();
    } catch (e) {
      console.error('[ArduSim] Export PNG failed:', e);
      if (window.App && window.App.showToast) window.App.showToast('Could not export image', 'error');
    }
  }

  /* ══════════════ SIM HELPERS ══════════════ */
  // Get Arduino Uno instance (first one found)
  getArduinoInst() {
    return this.components.find(c => c.type === 'arduino_uno') || null;
  }

  // Get whichever microcontroller board instance is placed (first one found)
  getBoardInst() {
    return this.components.find(c => c.type === 'arduino_uno' || c.type === 'esp32_devkit_v1') || null;
  }

  // Update component display based on simulation state and circuit electrical paths
  updateSimState(pinStates) {
    for (const inst of this.components) {
      switch (inst.type) {
        case 'led': {
          // 1. Trace Anode (+) to voltage sources & series resistance
          const anodeNet = this._tracePinNet(inst.id, 'anode');
          // 2. Trace Cathode (-) to Ground paths & series resistance
          const cathodeNet = this._tracePinNet(inst.id, 'cathode');

          const hasGround = cathodeNet.grounds.length > 0;
          const bestSource = anodeNet.sources.sort((a, b) => b.voltage - a.voltage)[0] || null;

          if (!hasGround || !bestSource || bestSource.voltage <= 0) {
            // No complete circuit: missing ground or missing voltage source -> OFF
            inst.runtimeState.val = 0;
            inst.runtimeState.lit = false;
            inst.runtimeState.brightness = 0;
            inst.runtimeState.current_mA = 0;
            inst.runtimeState.overload = false;
            inst.runtimeState.blown = false;
            inst.runtimeState._warnedBlown = false;
          } else {
            // Complete circuit! Calculate total resistance (anode path + cathode path + Arduino pin resistance)
            const bestGround = cathodeNet.grounds.sort((a, b) => a.resistance - b.resistance)[0];
            const rTotal = Math.max(10, (bestSource.resistance || 0) + (bestGround.resistance || 0) + 25);
            const vSource = bestSource.voltage; // e.g. 5.0V or PWM duty cycle
            const vf = 2.0; // typical LED forward voltage drop (V)
            const rawVal = bestSource.rawVal;

            // PWM (analogWrite, value 2–254 on a digital pin): brightness follows the
            // duty cycle directly so fades are clearly visible, even below Vf.
            const isPWM = bestSource.type === 'digital' && rawVal > 1 && rawVal < 255;

            if (isPWM) {
              const frac = rawVal / 255;
              // Slight perceptual ease so the eye sees a smooth ramp
              const normBrightness = Math.max(0, Math.min(1.0, Math.pow(frac, 0.8)));
              inst.runtimeState.val = rawVal;
              inst.runtimeState.lit = normBrightness > 0.02;
              inst.runtimeState.brightness = normBrightness;
              inst.runtimeState.current_mA = vSource >= vf ? ((vSource - vf) / rTotal) * 1000 : 0;
            } else if (vSource < vf) {
              inst.runtimeState.val = 0;
              inst.runtimeState.lit = false;
              inst.runtimeState.brightness = 0;
              inst.runtimeState.current_mA = 0;
            } else {
              // Current in mA: I = (V_source - Vf) / R_total * 1000
              const i_mA = ((vSource - vf) / rTotal) * 1000;
              inst.runtimeState.current_mA = i_mA;

              // LED nominal full brightness is ~15mA (standard 220 ohm resistor gives ~12.2mA -> ~0.93)
              // Human perceptual brightness response: (I / 14mA)^0.55
              const normBrightness = Math.max(0, Math.min(1.0, Math.pow(i_mA / 14.0, 0.55)));

              inst.runtimeState.val = rawVal;
              inst.runtimeState.lit = normBrightness > 0.02;
              inst.runtimeState.brightness = normBrightness;
            }

            // ── Overload / failure detection ──
            // A standard LED is rated for ~20 mA. Above 20 mA it's stressed (warning),
            // above 40 mA (e.g. connected straight to 5V without a resistor) it "blows".
            const iLed = inst.runtimeState.current_mA || 0;
            inst.runtimeState.overload = iLed > 20;
            inst.runtimeState.blown = iLed > 40;

            if (inst.runtimeState.blown) {
              inst.runtimeState.lit = false;
              inst.runtimeState.brightness = 0;
              inst.runtimeState.val = 0;
              if (!inst.runtimeState._warnedBlown) {
                inst.runtimeState._warnedBlown = true;
                if (window.OutputPanel) {
                  window.OutputPanel.log(
                    `LED (${inst.id}) is over-current (~${Math.round(iLed)} mA) without a current-limiting resistor and has blown! Add a 220Ω resistor in series.`,
                    'warn'
                  );
                }
              }
            } else {
              inst.runtimeState._warnedBlown = false;
            }
          }
          break;
        }
        case 'rgb_led': {
          // Cathode must be connected to GND
          const cathodeNet = this._tracePinNet(inst.id, 'gnd');
          const hasGround = cathodeNet.grounds.length > 0;

          if (!hasGround) {
            inst.runtimeState.red = 0;
            inst.runtimeState.green = 0;
            inst.runtimeState.blue = 0;
            inst.runtimeState.r = 0;
            inst.runtimeState.g = 0;
            inst.runtimeState.b = 0;
          } else {
            const bestGround = cathodeNet.grounds.sort((a, b) => a.resistance - b.resistance)[0];
            const gndR = bestGround.resistance || 0;

            const traceChannel = (pinId, vf) => {
              const net = this._tracePinNet(inst.id, pinId);
              const source = net.sources.sort((a, b) => b.voltage - a.voltage)[0] || null;
              if (!source || source.voltage < vf) return 0;
              const rTotal = Math.max(10, (source.resistance || 0) + gndR + 25);
              const i_mA = ((source.voltage - vf) / rTotal) * 1000;
              const norm = Math.max(0, Math.min(1.0, Math.pow(i_mA / 14.0, 0.55)));
              return Math.round(norm * 255);
            };

            inst.runtimeState.r = traceChannel('red', 1.8);
            inst.runtimeState.g = traceChannel('green', 2.2);
            inst.runtimeState.b = traceChannel('blue', 2.8);
            inst.runtimeState.red = inst.runtimeState.r;
            inst.runtimeState.green = inst.runtimeState.g;
            inst.runtimeState.blue = inst.runtimeState.b;
          }
          break;
        }
        case 'buzzer': {
          const vccNet = this._tracePinNet(inst.id, 'vcc');
          const gndNet = this._tracePinNet(inst.id, 'gnd');
          const hasVcc = vccNet.sources.length > 0 && vccNet.sources[0].voltage > 1.5;
          const hasGnd = gndNet.grounds.length > 0;
          inst.runtimeState.active = hasVcc && hasGnd;
          break;
        }
        case 'seg7': {
          const segPins = ['segA','segB','segC','segD','segE','segF','segG','dp'];
          const segKeys = ['A','B','C','D','E','F','G','DP'];
          const segments = {};
          segPins.forEach((pinId, i) => {
            const pinNum = this._getConnectedPinNum(inst.id, pinId);
            let on = false;
            if (pinNum !== null && window.ArduinoSim && window.ArduinoSim.pinStates) {
              on = !!window.ArduinoSim.pinStates[`pin_${pinNum}`];
            }
            segments[segKeys[i]] = on;
          });
          inst.runtimeState.segments = segments;
          break;
        }
        case 'potentiometer': {
          const wiperPin = this._getConnectedPinNum(inst.id, 'wiper');
          if (wiperPin !== null) {
            const val = inst.runtimeState.value !== undefined ? inst.runtimeState.value : (inst.props.value || 512);
            if (window.ArduinoSim && window.ArduinoSim.pinStates) {
              window.ArduinoSim.pinStates[`pin_${wiperPin}`] = val;
            }
          }
          break;
        }
case 'push_button': {
  const pressed = inst.runtimeState.pressed;
  const p1 = this._getConnectedPinNum(inst.id, 'p1');
  const p3 = this._getConnectedPinNum(inst.id, 'p3');
  if (p1 !== null && window.ArduinoSim && window.ArduinoSim.pinStates) {
    if (pressed) {
      window.ArduinoSim.pinStates[`pin_${p1}`] = 0; // pressed → connects to GND → LOW
    } else {
      window.ArduinoSim.pinStates[`pin_${p1}`] = 1; // not pressed → INPUT_PULLUP → HIGH
    }
  }
  break;
}
        case 'servo': {
          const sigNet = this._tracePinNet(inst.id, 'signal');
          const source = sigNet.sources[0];
          if (source) {
            const pwm = source.rawVal || 0;
            inst.runtimeState.angle = Math.round((pwm / 255) * 180);
          }
          break;
        }
        case 'relay': {
          const sigPin = this._getConnectedPinNum(inst.id, 'sig');
          const sigOn = sigPin !== null && window.ArduinoSim && window.ArduinoSim.pinStates
            ? !!window.ArduinoSim.pinStates[`pin_${sigPin}`] : false;
          inst.runtimeState.active = sigOn;
          break;
        }
        case 'dc_motor': {
          const inPin = this._getConnectedPinNum(inst.id, 'in');
          let pwm = 0;
          if (inPin !== null && window.ArduinoSim && window.ArduinoSim.pinStates) {
            pwm = window.ArduinoSim.pinStates[`pin_${inPin}`] || 0;
          }
          const speed = Math.max(0, Math.min(1, (Number(pwm) || 0) / 255));
          inst.runtimeState.speed = speed;
          inst.runtimeState.rpm = Math.round(speed * 120);
          break;
        }
        case 'ldr': {
          const aPin = this._getConnectedPinNum(inst.id, 'a');
          if (aPin !== null) {
            const val = inst.runtimeState.light !== undefined ? inst.runtimeState.light : (inst.props.light || 512);
            if (window.ArduinoSim && window.ArduinoSim.pinStates) {
              window.ArduinoSim.pinStates[`pin_${aPin}`] = val;
            }
          }
          break;
        }
        case 'pir': {
          const outPin = this._getConnectedPinNum(inst.id, 'out');
          if (outPin !== null && window.ArduinoSim && window.ArduinoSim.pinStates) {
            const motion = inst.runtimeState.motion !== undefined ? !!inst.runtimeState.motion : !!(inst.props.motion || 0);
            window.ArduinoSim.pinStates[`pin_${outPin}`] = motion ? 1 : 0;
          }
          break;
        }
        case 'joystick': {
          if (window.ArduinoSim && window.ArduinoSim.pinStates) {
            const xPin = this._getConnectedPinNum(inst.id, 'x');
            const yPin = this._getConnectedPinNum(inst.id, 'y');
            const swPin = this._getConnectedPinNum(inst.id, 'sw');
            const xv = inst.runtimeState.x !== undefined ? inst.runtimeState.x : (inst.props.x || 512);
            const yv = inst.runtimeState.y !== undefined ? inst.runtimeState.y : (inst.props.y || 512);
            const swPressed = inst.runtimeState.sw !== undefined ? !!inst.runtimeState.sw : !!(inst.props.sw || 0);
            if (xPin !== null) window.ArduinoSim.pinStates[`pin_${xPin}`] = xv;
            if (yPin !== null) window.ArduinoSim.pinStates[`pin_${yPin}`] = yv;
            if (swPin !== null) window.ArduinoSim.pinStates[`pin_${swPin}`] = swPressed ? 0 : 1; // INPUT_PULLUP
          }
          break;
        }
      }
    }
  }

  // Electrical graph network tracer: traverses wires and series components to discover sources & ground nodes
  _tracePinNet(startInstId, startPinId) {
    const queue = [{ instId: startInstId, pinId: startPinId, resistance: 0 }];
    const visited = new Set();
    const sources = [];
    const grounds = [];

    while (queue.length > 0) {
      const current = queue.shift();
      const nodeKey = `${current.instId}:${current.pinId}`;
      if (visited.has(nodeKey)) continue;
      visited.add(nodeKey);

      const inst = this.components.find(c => c.id === current.instId);
      if (!inst) continue;

      // 1. Arduino Uno Pins
      if (inst.type === 'arduino_uno') {
        const pinId = current.pinId;
        if (pinId === 'GND1' || pinId === 'GND2' || pinId === 'GND_D' || pinId === 'GND') {
          grounds.push({ type: 'gnd', instId: inst.id, pinId, resistance: current.resistance });
        } else if (pinId === '5V' || pinId === 'VIN') {
          sources.push({ type: '5v', voltage: 5.0, rawVal: 255, resistance: current.resistance });
        } else if (pinId === '3V3') {
          sources.push({ type: '3v3', voltage: 3.3, rawVal: 168, resistance: current.resistance });
        } else {
          // Digital or Analog pin (D0–D13, A0–A5)
          const pinNum = this._pinToNumber(pinId);
          const pinKey = `pin_${pinNum}`;
          const sim = window.ArduinoSim;
          const rawVal = sim && sim.pinStates ? (sim.pinStates[pinKey] || 0) : 0;

          if (rawVal > 0) {
            const voltage = 5.0 * (rawVal > 1 ? (rawVal / 255) : 1.0);
            sources.push({ type: 'digital', pinNum, pinKey, voltage, rawVal, resistance: current.resistance });
          } else {
            // Pin is LOW (0V) -> can act as current sink (GND)
            grounds.push({ type: 'digital_low', pinNum, pinKey, resistance: current.resistance });
          }
        }
        continue;
      }

      // 1b. ESP32 DevKit V1 Pins
      if (inst.type === 'esp32_devkit_v1') {
        const pinId = current.pinId;
        if (pinId === 'GND1' || pinId === 'GND2' || pinId === 'GND') {
          grounds.push({ type: 'gnd', instId: inst.id, pinId, resistance: current.resistance });
        } else if (pinId === 'VIN') {
          sources.push({ type: '5v', voltage: 5.0, rawVal: 255, resistance: current.resistance });
        } else if (pinId === '3V3') {
          sources.push({ type: '3v3', voltage: 3.3, rawVal: 168, resistance: current.resistance });
        } else if (pinId === 'EN') {
          // Reset line — not a usable GPIO
        } else {
          // GPIO (D0–D35), analog ADC pins (VP/VN/D32–D35), UART (TX0/RX0)
          const pinNum = this._pinToNumber(pinId);
          const pinKey = `pin_${pinNum}`;
          const sim = window.ArduinoSim;
          const rawVal = sim && sim.pinStates ? (sim.pinStates[pinKey] || 0) : 0;

          if (rawVal > 0) {
            const voltage = 3.3 * (rawVal > 1 ? (rawVal / 255) : 1.0);
            sources.push({ type: 'digital', pinNum, pinKey, voltage, rawVal, resistance: current.resistance });
          } else {
            grounds.push({ type: 'digital_low', pinNum, pinKey, resistance: current.resistance });
          }
        }
        continue;
      }

      // 2. Power and Ground components
      if (inst.type === 'power_5v') {
        sources.push({ type: '5v', voltage: 5.0, rawVal: 255, resistance: current.resistance });
        continue;
      }
      if (inst.type === 'power_gnd') {
        grounds.push({ type: 'gnd', instId: inst.id, pinId: 'gnd', resistance: current.resistance });
        continue;
      }

      // 3. Resistor internal pass-through (p1 <-> p2)
      if (inst.type === 'resistor') {
        const rVal = Number(inst.props.value) || 220;
        const otherPin = current.pinId === 'p1' ? 'p2' : 'p1';
        queue.push({
          instId: inst.id,
          pinId: otherPin,
          resistance: current.resistance + rVal,
        });
      }

      // 4. Push Button internal pass-through
      if (inst.type === 'push_button') {
        const isPressed = inst.runtimeState && inst.runtimeState.pressed;
        if (current.pinId === 'p1') queue.push({ instId: inst.id, pinId: 'p2', resistance: current.resistance });
        if (current.pinId === 'p2') queue.push({ instId: inst.id, pinId: 'p1', resistance: current.resistance });
        if (current.pinId === 'p3') queue.push({ instId: inst.id, pinId: 'p4', resistance: current.resistance });
        if (current.pinId === 'p4') queue.push({ instId: inst.id, pinId: 'p3', resistance: current.resistance });

        if (isPressed) {
          if (current.pinId === 'p1' || current.pinId === 'p2') {
            queue.push({ instId: inst.id, pinId: 'p3', resistance: current.resistance });
            queue.push({ instId: inst.id, pinId: 'p4', resistance: current.resistance });
          } else {
            queue.push({ instId: inst.id, pinId: 'p1', resistance: current.resistance });
            queue.push({ instId: inst.id, pinId: 'p2', resistance: current.resistance });
          }
        }
      }

      // 4b. Relay internal pass-through (COM ↔ NO when active, COM ↔ NC when inactive)
      if (inst.type === 'relay') {
        const relayOn = !!(inst.runtimeState && inst.runtimeState.active);
        if (current.pinId === 'com') {
          queue.push({ instId: inst.id, pinId: relayOn ? 'no' : 'nc', resistance: current.resistance });
        } else if (current.pinId === 'no' && relayOn) {
          queue.push({ instId: inst.id, pinId: 'com', resistance: current.resistance });
        } else if (current.pinId === 'nc' && !relayOn) {
          queue.push({ instId: inst.id, pinId: 'com', resistance: current.resistance });
        }
      }

      // 5. Traverse connected wires
      for (const wire of this.wires) {
        if (wire.from.instId === current.instId && wire.from.pinId === current.pinId) {
          queue.push({
            instId: wire.to.instId,
            pinId: wire.to.pinId,
            resistance: current.resistance,
          });
        } else if (wire.to.instId === current.instId && wire.to.pinId === current.pinId) {
          queue.push({
            instId: wire.from.instId,
            pinId: wire.from.pinId,
            resistance: current.resistance,
          });
        }
      }
    }

    return { sources, grounds };
  }

  _getConnectedPinNum(instId, pinId) {
    for (const wire of this.wires) {
      let otherInstId, otherPinId;
      if (wire.from.instId === instId && wire.from.pinId === pinId) {
        otherInstId = wire.to.instId;
        otherPinId  = wire.to.pinId;
      } else if (wire.to.instId === instId && wire.to.pinId === pinId) {
        otherInstId = wire.from.instId;
        otherPinId  = wire.from.pinId;
      } else continue;

      const otherInst = this.components.find(c => c.id === otherInstId);
      if (!otherInst) continue;
      if (otherInst.type === 'arduino_uno' || otherInst.type === 'esp32_devkit_v1') {
        return this._pinToNumber(otherPinId);
      }
    }
    return null;
  }
}

/* Export */
window.CircuitCanvas = null; // Will be set in app.js
window.CircuitCanvasClass = CircuitCanvas;
