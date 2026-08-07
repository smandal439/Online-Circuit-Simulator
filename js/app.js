'use strict';

class App {
  constructor() {
    this.sim = window.ArduinoSim;
    this.editor = window.EditorManager;
    this.canvas = null;
    this.serial = null;
    this.osc = null;
    this.toastTimer = null;
    this.isRunning = false;
    this._propsComp = null;
  }

  init() {
    this._bindUi();
    this._loadTheme();
    this._initCanvas();
    this._initSerial();
    this._initOscilloscope();
    this._attachSimulatorEvents();
    this._renderComponentLibrary();
    this._renderExamples();
    this._restoreProject();

    if (this.editor) {
      this.editor.init();
    }

    this._updateStatus('Ready — press Run to start simulation');
    this._updateCompileStatus('Ready');
    this._hideLoadingOverlay();
  }

  onEditorReady() {
    this._restoreProject();
    this._updateStatus('Editor ready');
    this._updateCompileStatus('Ready');
    this._hideLoadingOverlay();
  }

  _bindUi() {
    const runBtn = document.getElementById('btn-run');
    const stopBtn = document.getElementById('btn-stop');
    const pauseBtn = document.getElementById('btn-pause');
    const saveBtn = document.getElementById('btn-save');
    const loadBtn = document.getElementById('btn-load');
    const shareBtn = document.getElementById('btn-share');
    const clearBtn = document.getElementById('btn-clear-canvas');
    const exportBtn = document.getElementById('btn-export-img');
    const formatBtn = document.getElementById('btn-format-code');
    const verifyBtn = document.getElementById('btn-verify');
    const examplesBtn = document.getElementById('btn-examples');
    const shortcutsBtn = document.getElementById('btn-shortcuts');
    const toggleEditorBtn = document.getElementById('btn-toggle-editor');
    const toggleComponentsBtn = document.getElementById('btn-toggle-components');
    const toggleBottomBtn = document.getElementById('btn-toggle-bottom');
    const zoomInBtn = document.getElementById('btn-zoom-in');
    const zoomOutBtn = document.getElementById('btn-zoom-out');
    const fitViewBtn = document.getElementById('btn-fit-view');
    const undoBtn = document.getElementById('btn-undo-canvas');
    const redoBtn = document.getElementById('btn-redo-canvas');
    const oscClearBtn = document.getElementById('btn-osc-clear');
    const oscPauseBtn = document.getElementById('btn-osc-pause');
    const themeBtn = document.getElementById('btn-theme');
    const themeIconDark = document.getElementById('theme-icon-dark');
    const themeIconLight = document.getElementById('theme-icon-light');
    const searchBox = document.getElementById('component-search');
    const speedSel = document.getElementById('sim-speed');
    const propsApply = document.getElementById('btn-props-apply');
    const modalCloseBtns = document.querySelectorAll('.modal-close');
    const modalOverlay = document.getElementById('modal-overlay');
    const bottomTabButtons = document.querySelectorAll('.btm-tab');

    runBtn?.addEventListener('click', () => this.run());
    stopBtn?.addEventListener('click', () => this.stop());
    pauseBtn?.addEventListener('click', () => this.pauseResume());
    saveBtn?.addEventListener('click', () => this.saveProject());
    loadBtn?.addEventListener('click', () => this.loadProject());
    shareBtn?.addEventListener('click', () => this.shareProject());
    clearBtn?.addEventListener('click', () => this.clearCanvas());
    exportBtn?.addEventListener('click', () => this.exportImage());
    formatBtn?.addEventListener('click', () => this.formatCode());
    verifyBtn?.addEventListener('click', () => this.verify());
    examplesBtn?.addEventListener('click', () => this._showModal('modal-examples'));
    shortcutsBtn?.addEventListener('click', () => this._showModal('modal-shortcuts'));
    toggleEditorBtn?.addEventListener('click', () => this._togglePanel('panel-editor', toggleEditorBtn, 'Collapse Editor', 'Expand Editor'));
    toggleComponentsBtn?.addEventListener('click', () => this._togglePanel('panel-components', toggleComponentsBtn, 'Collapse Panel', 'Expand Panel'));
    toggleBottomBtn?.addEventListener('click', () => this._toggleBottomPanel(toggleBottomBtn));
    zoomInBtn?.addEventListener('click', () => this.canvas?.zoomIn());
    zoomOutBtn?.addEventListener('click', () => this.canvas?.zoomOut());
    fitViewBtn?.addEventListener('click', () => this.canvas?.fitView());
    undoBtn?.addEventListener('click', () => this.canvas?.undo());
    redoBtn?.addEventListener('click', () => this.canvas?.redo());
    oscClearBtn?.addEventListener('click', () => this.osc?.clear());
    oscPauseBtn?.addEventListener('click', () => this._toggleOscPause(oscPauseBtn));
    themeBtn?.addEventListener('click', () => this._toggleTheme(themeIconDark, themeIconLight));
    searchBox?.addEventListener('input', (e) => this._filterComponents(e.target.value));
    speedSel?.addEventListener('change', (e) => this.sim.setSpeed(e.target.value));
    propsApply?.addEventListener('click', () => this._applyPropsModal());
    modalCloseBtns.forEach(btn => btn.addEventListener('click', () => this._closeModal()));
    document.querySelectorAll('[data-modal]').forEach(btn => btn.addEventListener('click', () => this._closeModal()));

    bottomTabButtons.forEach(btn => btn.addEventListener('click', (e) => this._switchBottomTab(e.currentTarget)));
    modalOverlay?.addEventListener('click', (e) => { if (e.target === modalOverlay) this._closeModal(); });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        this.saveProject();
      }
      if (e.key === 'Escape') {
        this._closeModal();
      }
    });
  }

  _initCanvas() {
    const canvasEl = document.getElementById('circuit-canvas');
    const wrapperEl = document.getElementById('canvas-wrapper');
    if (canvasEl && wrapperEl && window.CircuitCanvasClass) {
      this.canvas = new window.CircuitCanvasClass(canvasEl, wrapperEl);
      window.CircuitCanvas = this.canvas;
      this.canvas.onCompChanged = () => this._refreshCanvasSummary();
      this._refreshCanvasSummary();
    }
  }

  _initSerial() {
    if (window.SerialMonitorClass) {
      this.serial = new window.SerialMonitorClass();
      window.SerialMonitor = this.serial;
      this.serial.log('ArduSim ready. Add components, wire them up, and press Run.', 'system');
    }
  }

  _attachSimulatorEvents() {
    this.sim.onSerial = (text, type) => {
      this.serial?.receive(text, type);
      this._updateStatus('Running');
    };

    this.sim.onPinChange = (pinKey, value) => {
      if (this.canvas) {
        this.canvas.updateSimState(this.sim.pinStates);
      }
      if (this.osc) {
        this.osc.sample(this.sim.simTime, this.sim.pinStates);
      }
      this._updateStatus(this.isRunning ? 'Running' : 'Idle');
    };

    this.sim.onError = (err) => {
      this._updateCompileStatus(`Error: ${err}`);
      this.showToast(err, 'error');
      this._setRunningState(false);
    };

    this.sim.onStop = () => {
      this._setRunningState(false);
      this._updateStatus('Stopped');
    };

    this.sim.onEvent = (type, data) => {
      if (!this.canvas) return;
      const insts = this.canvas.components || [];
      for (const inst of insts) {
        if (inst.type === 'lcd1602' && type === 'lcd_print') {
          inst.runtimeState.line1 = (inst.runtimeState.line1 || '').slice(0, 16);
          inst.runtimeState.line2 = (inst.runtimeState.line2 || '').slice(0, 16);
          break;
        }
      }
    };
  }

  async run() {
    if (!this.editor) return;
    const code = this.editor.getCode();
    this._updateCompileStatus('Compiling…');
    this._updateStatus('Compiling sketch');
    this.serial?.log('Compiling sketch…', 'system');

    this.sim.stop();
    const result = await this.sim.run(code);
    if (result) {
      this._setRunningState(true);
      this._updateCompileStatus('Running');
      this._updateStatus('Simulation running');
    } else {
      this._setRunningState(false);
      this._updateCompileStatus('Compile failed');
    }
  }

  stop() {
    this.sim.stop();
    this._setRunningState(false);
    this._updateStatus('Stopped');
  }

  pauseResume() {
    if (!this.isRunning) return;
    if (this.sim.isPaused) {
      this.sim.resume();
      this._updateStatus('Simulation resumed');
      document.getElementById('btn-pause').textContent = 'Pause';
    } else {
      this.sim.pause();
      this._updateStatus('Simulation paused');
      document.getElementById('btn-pause').textContent = 'Resume';
    }
  }

  clearCanvas() {
    this.canvas?.clearCanvas();
    this.showToast('Circuit cleared', 'info');
  }

  exportImage() {
    this.canvas?.exportPNG();
  }

  formatCode() {
    this.editor?.formatCode();
  }

  saveProject() {
    const code = this.editor?.getCode() || '';
    const circuitData = this.canvas?.serialize() || { components: [], wires: [] };
    window.StorageManager?.saveToFile(code, circuitData);
  }

  loadProject() {
    window.StorageManager?.loadFromFile((project) => {
      if (this.editor) this.editor.setCode(project.code || '');
      if (this.canvas) this.canvas.deserialize(project.circuit || { components: [], wires: [] });
      this._refreshCanvasSummary();
    });
  }

  shareProject() {
    const code = this.editor?.getCode() || '';
    const circuitData = this.canvas?.serialize() || { components: [], wires: [] };
    window.StorageManager?.shareUrl(code, circuitData);
  }

  _renderComponentLibrary() {
    const container = document.getElementById('components-container');
    if (!container || !window.ArduinoComponents?.COMPONENT_CATALOG) return;

    container.innerHTML = '';
    const defs = window.ArduinoComponents.COMPONENT_DEFS || {};

    for (const group of window.ArduinoComponents.COMPONENT_CATALOG) {
      const section = document.createElement('div');
      section.className = 'comp-group';
      const title = document.createElement('div');
      title.className = 'comp-group-title';
      title.textContent = group.category;
      section.appendChild(title);

      for (const id of group.ids) {
        const def = defs[id];
        if (!def) continue;
        const item = document.createElement('button');
        item.className = 'comp-item';
        item.innerHTML = `<span class="comp-icon">${def.icon || '🔧'}</span><span class="comp-name">${def.name}</span>`;
        item.addEventListener('click', () => {
          if (this.canvas) {
            this.canvas.startPlacing(id);
            this.showToast(`${def.name} selected. Click on canvas to place it.`, 'info');
          }
        });
        section.appendChild(item);
      }

      container.appendChild(section);
    }
  }

  _filterComponents(term) {
    const query = (term || '').toLowerCase();
    document.querySelectorAll('.comp-item').forEach(item => {
      const name = item.textContent.toLowerCase();
      item.style.display = name.includes(query) ? '' : 'none';
    });
    document.querySelectorAll('.comp-group').forEach(group => {
      const visible = Array.from(group.querySelectorAll('.comp-item')).some(item => item.style.display !== 'none');
      group.style.display = visible ? '' : 'none';
    });
  }

  _refreshCanvasSummary() {
    const compEl = document.getElementById('canvas-comp-count');
    const wireEl = document.getElementById('canvas-wire-count');
    if (!this.canvas) return;
    if (compEl) compEl.textContent = `${this.canvas.components.length} component${this.canvas.components.length !== 1 ? 's' : ''}`;
    if (wireEl) wireEl.textContent = `${this.canvas.wires.length} wire${this.canvas.wires.length !== 1 ? 's' : ''}`;
  }

  _restoreProject() {
    const project = window.StorageManager?.autoLoad?.();
    if (project) {
      if (this.editor) this.editor.setCode(project.code || '');
      if (this.canvas) this.canvas.deserialize(project.circuit || { components: [], wires: [] });
      this._refreshCanvasSummary();
      this.showToast('Previous project restored', 'success');
      return;
    }

    const shared = window.StorageManager?.loadFromUrl?.();
    if (shared) {
      if (this.editor) this.editor.setCode(shared.code || '');
      if (this.canvas) this.canvas.deserialize(shared.circuit || { components: [], wires: [] });
      this._refreshCanvasSummary();
    }
  }

  _setRunningState(running) {
    this.isRunning = running;
    const runBtn = document.getElementById('btn-run');
    const stopBtn = document.getElementById('btn-stop');
    const pauseBtn = document.getElementById('btn-pause');
    if (runBtn) runBtn.classList.toggle('hidden', running);
    if (stopBtn) stopBtn.classList.toggle('hidden', !running);
    if (pauseBtn) pauseBtn.disabled = !running;
  }

  _hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (!overlay) return;
    overlay.classList.add('hidden');
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 400);
  }

  _toggleTheme(iconDark, iconLight) {
    const body = document.body;
    const isDark = body.classList.contains('dark-theme');
    const darkMode = !isDark;

    body.classList.toggle('dark-theme', darkMode);
    body.classList.toggle('light-theme', !darkMode);

    if (this.editor?.setTheme) {
      this.editor.setTheme(darkMode);
    }

    if (iconDark) iconDark.classList.toggle('hidden', !darkMode);
    if (iconLight) iconLight.classList.toggle('hidden', darkMode);

    try {
      localStorage.setItem('ardusim-theme', darkMode ? 'dark' : 'light');
    } catch (err) {
      // ignore storage errors
    }
  }

  _loadTheme() {
    let theme;
    try {
      theme = localStorage.getItem('ardusim-theme');
    } catch (err) {
      theme = null;
    }

    const darkMode = theme !== 'light';
    const iconDark = document.getElementById('theme-icon-dark');
    const iconLight = document.getElementById('theme-icon-light');

    document.body.classList.toggle('dark-theme', darkMode);
    document.body.classList.toggle('light-theme', !darkMode);
    if (this.editor?.setTheme) {
      this.editor.setTheme(darkMode);
    }
    if (iconDark) iconDark.classList.toggle('hidden', !darkMode);
    if (iconLight) iconLight.classList.toggle('hidden', darkMode);
  }

  _updateStatus(msg) {
    const el = document.getElementById('sim-status-text');
    if (el) el.textContent = msg;
  }

  _updateCompileStatus(msg) {
    const el = document.getElementById('compile-status');
    if (el) el.textContent = `● ${msg}`;
  }

  _showModal(modalId) {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById(modalId);
    if (!overlay || !modal) return;
    overlay.classList.remove('hidden');
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    modal.classList.add('active');
  }

  _closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.add('hidden');
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    this._closePropsModal();
  }

  _togglePanel(panelId, button, collapseTitle, expandTitle) {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    const hidden = panel.classList.toggle('hidden');
    if (button) button.title = hidden ? expandTitle : collapseTitle;
  }

  _toggleBottomPanel(button) {
    const bottom = document.getElementById('bottom-panel');
    if (!bottom) return;
    const collapsed = bottom.classList.toggle('collapsed');
    if (button) {
      const icon = document.getElementById('bottom-toggle-icon');
      if (icon) icon.style.transform = collapsed ? 'rotate(180deg)' : 'rotate(0deg)';
      button.title = collapsed ? 'Show Bottom Panel' : 'Hide Bottom Panel';
    }
  }

  _switchBottomTab(button) {
    if (!button) return;
    const target = button.dataset.tab;
    if (!target) return;
    document.querySelectorAll('.btm-tab').forEach(tab => tab.classList.toggle('active', tab === button));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.toggle('active', pane.id === `pane-${target}`));
  }

  _toggleOscPause(button) {
    if (!this.osc) return;
    const paused = this.osc.togglePause();
    if (button) button.textContent = paused ? 'Resume' : 'Pause';
  }

  async verify() {
    if (!this.editor) return;
    const code = this.editor.getCode();
    this._updateCompileStatus('Verifying…');
    this._updateStatus('Verifying sketch');
    this.serial?.log('Verifying sketch…', 'system');

    const result = await this.sim.compile(code);
    if (result.ok) {
      this._updateCompileStatus('Verified');
      this._updateStatus('Verification succeeded');
      this.showToast('Verification succeeded', 'success');
      return true;
    }

    this._updateCompileStatus(`Error: ${result.error}`);
    this._updateStatus('Verification failed');
    this.showToast(result.error || 'Verification failed', 'error');
    return false;
  }

  _initOscilloscope() {
    const oscCanvas = document.getElementById('oscilloscope-canvas');
    if (!oscCanvas || !window.OscilloscopeClass) return;
    this.osc = new window.OscilloscopeClass(oscCanvas);
    this.sim.onPinChange = (pinKey, value) => {
      if (this.canvas) {
        this.canvas.updateSimState(this.sim.pinStates);
      }
      if (this.osc) {
        this.osc.sample(this.sim.simTime, this.sim.pinStates);
      }
      this._updateStatus(this.isRunning ? 'Running' : 'Idle');
    };
  }

  _renderExamples() {
    const container = document.getElementById('examples-grid');
    if (!container || !window.EXAMPLE_SKETCHES) return;
    container.innerHTML = '';
    for (const example of window.EXAMPLE_SKETCHES) {
      const item = document.createElement('button');
      item.className = 'example-item';
      item.innerHTML = `<div class="example-icon">${example.icon || '📄'}</div><div class="example-info"><strong>${example.name}</strong><span>${example.desc}</span></div>`;
      item.addEventListener('click', () => {
        if (this.editor) this.editor.setCode(example.code || '');
        if (example.circuit && this.canvas) {
          this._loadExampleCircuit(example.circuit);
        }
        this._closeModal();
        this.showToast(`${example.name} loaded`, 'success');
      });
      container.appendChild(item);
    }
  }

  _loadExampleCircuit(key) {
    if (!this.canvas) return;
    const lower = String(key).toLowerCase();
    if (lower === 'led_on_13') {
      this.canvas.clearCanvas();
      const board = this.canvas.addComponent('arduino_uno', 300, 120);
      const led = this.canvas.addComponent('led', 300, 260);
      const gnd = this.canvas.addComponent('gnd', 260, 300);
      if (board && led) {
        this.canvas.addWire(board.id, 'D13', led.id, 'anode');
        if (gnd) this.canvas.addWire(led.id, 'cathode', gnd.id, 'GND');
      }
      this._refreshCanvasSummary();
      this.canvas.fitView();
    }
  }

  openPropsModal(comp) {
    this._propsComp = comp;
    const title = document.getElementById('modal-props-title');
    const body = document.getElementById('modal-props-body');
    const modal = document.getElementById('modal-props');
    const overlay = document.getElementById('modal-overlay');

    if (!comp || !body || !modal || !overlay) return;
    if (title) title.textContent = `${comp.type} properties`;

    const rows = [];
    Object.entries(comp.props || {}).forEach(([key, value]) => {
      const row = document.createElement('div');
      row.className = 'prop-row';
      const label = document.createElement('label');
      label.textContent = key;
      label.className = 'prop-label';
      const input = document.createElement('input');
      input.className = 'prop-input';
      input.name = key;
      input.value = value;
      if (typeof value === 'number') {
        input.type = 'number';
      } else if (typeof value === 'boolean') {
        input.type = 'checkbox';
        input.checked = value;
      } else {
        input.type = 'text';
      }
      row.appendChild(label);
      row.appendChild(input);
      rows.push(row);
    });

    body.innerHTML = '';
    rows.forEach(row => body.appendChild(row));
    overlay.classList.remove('hidden');
    modal.classList.add('active');
  }

  _applyPropsModal() {
    if (!this._propsComp) return;
    const body = document.getElementById('modal-props-body');
    if (!body) return;
    const inputs = body.querySelectorAll('.prop-input');
    inputs.forEach(input => {
      const key = input.name;
      let val = input.value;
      if (input.type === 'number') val = Number(val);
      if (input.type === 'checkbox') val = input.checked;
      this._propsComp.props[key] = val;
    });
    this.canvas?._onChanged?.();
    this._closeModal();
    this.showToast('Properties updated', 'success');
  }

  _closePropsModal() {
    const modal = document.getElementById('modal-props');
    if (modal) modal.classList.remove('active');
    this._propsComp = null;
  }

  showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.remove();
    }, 2200);
  }
}

window.App = new App();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.App.init());
} else {
  window.App.init();
}
