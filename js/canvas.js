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
    this._wireOffsets = {};       // wireId -> {ox, oy} for custom curve position
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

      this._drawWire(ctx, p1, p2, color, isSelected, wire.id);
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

    // Compute a smooth curved wire (quadratic Bézier) with a perpendicular offset
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) {
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.arc(p1.x, p1.y, 3 / this.zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;

    // perpendicular offset (12px scaled by zoom) so the curve is visible
    const ox = -dy / dist * 12 / this.zoom;
    const oy =  dx / dist * 12 / this.zoom;

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.quadraticCurveTo(mx + ox, my + oy, p2.x, p2.y);
    ctx.stroke();

    // Junction dots
    ctx.fillStyle = color;
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(p1.x, p1.y, 3 / this.zoom, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(p2.x, p2.y, 3 / this.zoom, 0, Math.PI * 2); ctx.fill();

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

  addWire(fromInstId, fromPinId, toInstId, toPinId) {
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

      // Check wire click
      const wireHit = this._hitTestWire(world.x, world.y);
      if (wireHit) {
        this._selectAll(false);
        this.selectedWire = wireHit;
        this.selected = null;
        return;
      }

      // ── wire‑drag: move the curve's control point ─────────────────────
      if (this.mode !== 'wiring' && this.mode !== 'panning') {
        for (const wire of this.wires) {
          if (this._isNearWire(world.x, world.y, wire)) {
            this.mode = 'wiredrag';
            this.draggingWire = { wireId: wire.id };
            this._wireOffsets[wire.id] = { ox: 0, oy: 0 };
            break;
          }
        }
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
          offsetY: compHit.y,
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

    if (this.mode === 'wiredrag' && this.draggingWire) {
      const wire = this.wires.find(w => w.id === this.draggingWire.wireId);
      if (wire) {
        const p1 = this._getPinWorldPos(wire.from.instId, wire.from.pinId);
        const p2 = this._getPinWorldPos(wire.to.instId, wire.to.pinId);
        if (p1 && p2) {
          const mx = (p1.x + p2.x) / 2;
          const my = (p1.y + p2.y) / 2;
          this._wireOffsets[wire.id] = {
            ox: world.x - mx,
            oy: world.y - my,
          };
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
    if (pin) {
      this.canvas.style.cursor = 'crosshair';
      this._showPinTooltip(pin, e);
    } else {
      this._hidePinTooltip();
      if (comp) this.canvas.style.cursor = 'move';
      else this.canvas.style.cursor = '';
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
      if (inst.type === 'arduino_uno' && /^[AD]\d+$/.test(pin.id)) {
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

  /** Return true if (wx,wy) is within *threshold* world pixels of the wire's
   *  straight line between its two pin world positions. */
  _isNearWire(wx, wy, wire, thresh = 10 / this.zoom) {
    const p1 = this._getPinWorldPos(wire.from.instId, wire.from.pinId);
    const p2 = this._getPinWorldPos(wire.to.instId, wire.to.pinId);
    if (!p1 || !p2) return false;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len2 = dx*dx + dy*dy;
    if (len2 === 0) {
      const d = Math.hypot(wx - p1.x, wy - p1.y);
      return d < thresh;
    }
    const t = ((wx - p1.x)*dx + (wy - p1.y)*dy) / len2;
    const tClamped = Math.min(Math.max(t, 0), 1);
    const closestX = p1.x + tClamped * dx;
    const closestY = p1.y + tClamped * dy;
    const d = Math.hypot(wx - closestX, wy - closestY);
    return d < thresh;
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
          } else {
            // Complete circuit! Calculate total resistance (anode path + cathode path + Arduino pin resistance)
            const bestGround = cathodeNet.grounds.sort((a, b) => a.resistance - b.resistance)[0];
            const rTotal = Math.max(10, (bestSource.resistance || 0) + (bestGround.resistance || 0) + 25);
            const vSource = bestSource.voltage; // e.g. 5.0V or PWM duty cycle
            const vf = 2.0; // typical LED forward voltage drop (V)

            if (vSource < vf) {
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

              inst.runtimeState.val = bestSource.rawVal;
              inst.runtimeState.lit = normBrightness > 0.02;
              inst.runtimeState.brightness = normBrightness;
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
      if (otherInst.type === 'arduino_uno') {
        return this._pinToNumber(otherPinId);
      }
    }
    return null;
  }
}

/* Export */
window.CircuitCanvas = null; // Will be set in app.js
window.CircuitCanvasClass = CircuitCanvas;
