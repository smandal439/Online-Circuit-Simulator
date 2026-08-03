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
    this.wires        = [];  // { id, from:{instId,pinId}, to:{instId,pinId}, color }
    this.selected     = null;
    this.selectedWire = null;

    /* Viewport */
    this.panX  = 0;
    this.panY  = 0;
    this.zoom  = 1;
    this.GRID  = 20;

    /* Interaction state machine */
    this.mode         = 'idle';   // idle | dragging | panning | wiring | placing | wiredrag
    this.dragging     = null;     // { inst, offsetX, offsetY }
    this.wiringFrom   = null;     // { inst, pin, wx, wy }
    this.wireMouse    = null;     // { x, y } world coords
    this.placingType  = null;
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
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    this._drawGrid(ctx);
    this._drawWires(ctx);
    this._drawComponents(ctx);
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

      // Pin label (only when zoomed in enough)
      if (this.zoom >= 1) {
        ctx.fillStyle = '#888';
        ctx.font = `${8 / this.zoom}px Inter, sans-serif`;
        ctx.textAlign = pin.side === 'top' ? 'center' : 'center';
        const lx = wx;
        const ly = pin.side === 'top' ? wy - 8 / this.zoom : wy + 12 / this.zoom;
        ctx.fillText(pin.label, lx, ly);
      }
    }
  }

  _drawWires(ctx) {
    const sim = window.ArduinoSim;

    for (const wire of this.wires) {
      const p1 = this._getPinWorldPos(wire.from.instId, wire.from.pinId);
      const p2 = this._getPinWorldPos(wire.to.instId, wire.to.pinId);
      if (!p1 || !p2) continue;

      // Get wire state from simulation
      const pinKey = this._getPinKey(wire.from.instId, wire.from.pinId);
      const val = sim.isRunning ? (sim.pinStates[pinKey] || 0) : 0;

      let color;
      const pinType = this._getPinType(wire.from.instId, wire.from.pinId);
      if (pinType === 'gnd')   color = '#444';
      else if (pinType === 'power') color = '#994444';
      else if (val > 1 && val <= 255) color = `rgba(247,201,72,${0.6 + val/255*0.4})`; // PWM yellow
      else color = val > 0 ? '#cc3333' : '#2266aa'; // HIGH=red, LOW=blue

      const isSelected = this.selectedWire && this.selectedWire.id === wire.id;
      if (isSelected) color = '#00e5ff';

      this._drawWire(ctx, p1, p2, color, isSelected);
    }

    // Active wire preview
    if (this.mode === 'wiring' && this.wiringFrom && this.wireMouse) {
      const p1 = { x: this.wiringFrom.wx, y: this.wiringFrom.wy };
      const p2 = this.wireMouse;
      this._drawWire(ctx, p1, p2, '#00e5ff', true);
    }
  }

  _drawWire(ctx, p1, p2, color, highlighted) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = highlighted ? 3 / this.zoom : 2 / this.zoom;
    ctx.lineCap = 'round';
    if (highlighted) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
    }

    // Manhattan routing
    const mx = (p1.x + p2.x) / 2;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(mx, p1.y);
    ctx.lineTo(mx, p2.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    // Junction dots
    ctx.fillStyle = color;
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(p1.x, p1.y, 3/this.zoom, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(p2.x, p2.y, 3/this.zoom, 0, Math.PI*2); ctx.fill();

    ctx.restore();
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

    const inst = {
      id:           `comp_${Date.now()}_${Math.random().toString(36).substr(2,5)}`,
      type,
      x:            this._snap(worldX - def.width / 2),
      y:            this._snap(worldY - def.height / 2),
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

  addWire(fromInstId, fromPinId, toInstId, toPinId) {
    // Avoid duplicate wires
    const exists = this.wires.some(w =>
      (w.from.instId === fromInstId && w.from.pinId === fromPinId && w.to.instId === toInstId && w.to.pinId === toPinId) ||
      (w.from.instId === toInstId && w.from.pinId === toPinId && w.to.instId === fromInstId && w.to.pinId === fromPinId)
    );
    if (exists) return null;

    this._pushHistory();
    const wire = {
      id: `wire_${Date.now()}`,
      from: { instId: fromInstId, pinId: fromPinId },
      to:   { instId: toInstId,   pinId: toPinId },
    };
    this.wires.push(wire);
    this._onChanged();
    return wire;
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

      // Check wire click
      const wireHit = this._hitTestWire(world.x, world.y);
      if (wireHit) {
        this._selectAll(false);
        this.selectedWire = wireHit;
        this.selected = null;
        return;
      }

      // Check component click
      const compHit = this._hitTestComp(world.x, world.y);
      if (compHit) {
        if (!e.shiftKey) this._selectAll(false);
        compHit.selected = true;
        this.selected = compHit;
        this.selectedWire = null;
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
      return;
    }

    if (this.mode === 'dragging' && this.dragging) {
      const newX = this._snap(world.x - this.dragging.offsetX);
      const newY = this._snap(world.y - this.dragging.offsetY);
      this.dragging.inst.x = newX;
      this.dragging.inst.y = newY;
      this.dragging.moved = true;
      this._lastMouse = { x: e.clientX, y: e.clientY };
      return;
    }

    if (this.mode === 'wiring') {
      this.wireMouse = world;
      return;
    }

    if (this.mode === 'placing') {
      this.placingMouse = world;
      return;
    }

    // Hover cursor
    const pin = this._hitTestPin(world.x, world.y);
    const comp = this._hitTestComp(world.x, world.y);
    if (pin) this.canvas.style.cursor = 'crosshair';
    else if (comp) this.canvas.style.cursor = 'move';
    else this.canvas.style.cursor = '';
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
    if (this.onContextMenu) this.onContextMenu(e, comp, wire, world);
  }

  _onKeyDown(e) {
    // Only handle when canvas is in focus (not in editor)
    if (e.target.closest('#editor-container') || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

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
    const threshold = Math.max(5, 6 / this.zoom);
    for (const wire of [...this.wires].reverse()) {
      const p1 = this._getPinWorldPos(wire.from.instId, wire.from.pinId);
      const p2 = this._getPinWorldPos(wire.to.instId, wire.to.pinId);
      if (!p1 || !p2) continue;
      // Manhattan wire: check horizontal then vertical segment
      const mx = (p1.x + p2.x) / 2;
      const d1 = this._distToSegment(wx, wy, p1.x, p1.y, mx, p1.y);
      const d2 = this._distToSegment(wx, wy, mx, p1.y, mx, p2.y);
      const d3 = this._distToSegment(wx, wy, mx, p2.y, p2.x, p2.y);
      if (Math.min(d1, d2, d3) <= threshold) return wire;
    }
    return null;
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
    const n = parseInt(pinId.replace(/[^0-9]/g,''));
    return isNaN(n) ? 0 : n;
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
    this.zoom = Math.min(4, Math.max(0.2, Math.min(w / cw, h / ch) * 0.9));
    this.panX = (w - cw * this.zoom) / 2 - minX * this.zoom;
    this.panY = (h - ch * this.zoom) / 2 - minY * this.zoom;
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
      this.wires = wires;
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
    if (!data) return;
    this.components = data.components || [];
    this.wires      = data.wires || [];
    this.selected   = null;
    this.selectedWire = null;
    this._onChanged();
    setTimeout(() => this.fitView(), 100);
  }

  exportPNG() {
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
  }

  /* ══════════════ SIM HELPERS ══════════════ */
  // Get Arduino Uno instance (first one found)
  getArduinoInst() {
    return this.components.find(c => c.type === 'arduino_uno') || null;
  }

  // Update component display based on simulation state
  updateSimState(pinStates) {
    for (const inst of this.components) {
      switch (inst.type) {
        case 'led': {
          const aPin = this._getConnectedPinNum(inst.id, 'anode');
          if (aPin !== null) {
            inst.runtimeState.lit = (pinStates[`pin_${aPin}`] || 0) > 0;
          }
          break;
        }
        case 'buzzer': {
          const vPin = this._getConnectedPinNum(inst.id, 'vcc');
          if (vPin !== null) {
            inst.runtimeState.active = (pinStates[`pin_${vPin}`] || 0) > 0;
          }
          break;
        }
        case 'potentiometer': {
          // Potentiometer pushes value to connected analog pin
          const wiperPin = this._getConnectedPinNum(inst.id, 'wiper');
          if (wiperPin !== null) {
            const val = inst.runtimeState.value !== undefined ? inst.runtimeState.value : (inst.props.value || 512);
            window.ArduinoSim.pinStates[`pin_${wiperPin}`] = val;
          }
          break;
        }
        case 'push_button': {
          // Button: if pressed, connect p1 to p3 (short them)
          const pressed = inst.runtimeState.pressed;
          const p1 = this._getConnectedPinNum(inst.id, 'p1');
          const p3 = this._getConnectedPinNum(inst.id, 'p3');
          if (p1 !== null && pressed) {
            window.ArduinoSim.pinStates[`pin_${p1}`] = 1;
          } else if (p1 !== null && !pressed) {
            // Don't override unless pullup
          }
          break;
        }
        case 'servo': {
          const sigPin = this._getConnectedPinNum(inst.id, 'signal');
          if (sigPin !== null) {
            const pwm = pinStates[`pin_${sigPin}`] || 0;
            inst.runtimeState.angle = Math.round((pwm / 255) * 180);
          }
          break;
        }
        case 'lcd1602': {
          // LCD state managed via events
          break;
        }
      }
    }
  }

  _getConnectedPinNum(instId, pinId) {
    // Find wire connected to this pin, get the other end's pin number
    for (const wire of this.wires) {
      let otherInstId, otherPinId;
      if (wire.from.instId === instId && wire.from.pinId === pinId) {
        otherInstId = wire.to.instId;
        otherPinId  = wire.to.pinId;
      } else if (wire.to.instId === instId && wire.to.pinId === pinId) {
        otherInstId = wire.from.instId;
        otherPinId  = wire.from.pinId;
      } else continue;

      // Get pin number
      const def = window.ArduinoComponents.COMPONENT_DEFS;
      const otherInst = this.components.find(c => c.id === otherInstId);
      if (!otherInst) continue;
      const otherDef = def[otherInst.type];
      if (!otherDef) continue;
      const otherPin = otherDef.pins.find(p => p.id === otherPinId);
      if (!otherPin) continue;
      return this._pinToNumber(otherPinId);
    }
    return null;
  }
}

/* Export */
window.CircuitCanvas = null; // Will be set in app.js
window.CircuitCanvasClass = CircuitCanvas;
