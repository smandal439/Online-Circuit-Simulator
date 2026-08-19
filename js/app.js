'use strict';

class App {
  constructor() {
    this.sim = window.ArduinoSim;
    this.editor = window.EditorManager;
    this.canvas = null;
    this.serial = null;
    this.output = null;
    this.osc = null;
    this.isRunning = false;
    this._propsComp = null;
    this._projectName = 'Untitled Project';
    this._autoSaveDebounced = null;
    this._activeView = null;
  }

  init() {
    try {
      this._initErrorHandlers();
      this._bindUi();
      this._initResizers();
      this._loadTheme();
      this._initCanvas();
      this._initSerial();
      this._initOutput();
      this._initOscilloscope();
      this._attachSimulatorEvents();
      this._renderComponentLibrary();
      this._renderExamples();
      this._restoreProject();
      this._setupBeforeUnloadGuard();

      if (this.editor) {
        this.editor.init();
      }

      this._updateStatus('Ready — press Run to start simulation');
      this._updateCompileStatus('Ready');
      this._hideLoadingOverlay();
    } catch (err) {
      console.error('[ArduSim] Init error:', err);
      this._showInitError(err.message || String(err));
    }
  }

  _showInitError(msg) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.innerHTML = `
        <div class="loading-error">
          <svg width="48" height="48" viewBox="0 0 16 16" fill="#da3633"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1m0 3a.905.905 0 0 1 .9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995A.905.905 0 0 1 8 4m.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2"/></svg>
          <h3>Failed to initialize ArduSim</h3>
          <p>${String(msg).replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]))}</p>
          <button onclick="location.reload()">Reload</button>
        </div>`;
    }
  }

  /* ══════════════════════ GLOBAL ERROR HANDLING ══════════════════════ */
  _initErrorHandlers() {
    window.addEventListener('error', (e) => {
      console.error('[ArduSim] Uncaught error:', e.error || e.message);
      this._reportGlobalError((e.error && e.error.message) || e.message || 'unknown error');
    });

    window.addEventListener('unhandledrejection', (e) => {
      const reason = e && e.reason;
      const msg = reason && reason.message ? reason.message : String(reason || 'unknown error');
      console.error('[ArduSim] Unhandled promise rejection:', reason);
      this._reportGlobalError(msg);
    });
  }

  _reportGlobalError(msg) {
    // Throttle so a flood of errors can't spam the toast stack
    if (this._errorCooldown) return;
    this._errorCooldown = true;
    setTimeout(() => { this._errorCooldown = false; }, 4000);
    this.showToast(`Unexpected error: ${msg}`, 'error');
  }

  onEditorReady() {
    this._restoreProject();
    this._updateStatus('Editor ready');
    this._updateCompileStatus('Ready');
    this._hideLoadingOverlay();
  }

  /* ══════════════════════ UI BINDING ══════════════════════ */
  _bindUi() {
    const get = id => document.getElementById(id);

    const runBtn    = get('btn-run');
    const stopBtn   = get('btn-stop');
    const pauseBtn  = get('btn-pause');
    const saveBtn   = get('btn-save');
    const downloadBtn = get('btn-download');
    const loadBtn   = get('btn-load');
    const savedProjectsBtn = get('btn-saved-projects');
    const shareBtn  = get('btn-share');
    const clearBtn  = get('btn-clear-canvas');
    const exportBtn = get('btn-export-img');
    const formatBtn = get('btn-format-code');
    const verifyBtn = get('btn-verify');
    const examplesBtn    = get('btn-examples');
    const shortcutsBtn   = get('btn-shortcuts');
    const toggleEditorBtn    = get('btn-toggle-editor');
    const toggleComponentsBtn = get('btn-toggle-components');
    const toggleBottomBtn     = get('btn-toggle-bottom');
    const showEditorBtn       = get('btn-show-editor');
    const showComponentsBtn   = get('btn-show-components');
    const newProjectBtn  = get('btn-new-project');
    const zoomInBtn  = get('btn-zoom-in');
    const zoomOutBtn = get('btn-zoom-out');
    const fitViewBtn = get('btn-fit-view');
    const undoBtn    = get('btn-undo-canvas');
    const redoBtn    = get('btn-redo-canvas');
    const oscClearBtn = get('btn-osc-clear');
    const oscPauseBtn = get('btn-osc-pause');
    const themeBtn   = get('btn-theme');
    const themeIconDark  = get('theme-icon-dark');
    const themeIconLight = get('theme-icon-light');
    const searchBox  = get('component-search');
    const speedSel   = get('sim-speed');
    const propsApply = get('btn-props-apply');
    const oscCh1     = get('osc-ch1');
    const oscCh2     = get('osc-ch2');
    const oscTimebase = get('osc-timebase');
    const modalOverlay = get('modal-overlay');
    const bottomTabButtons = document.querySelectorAll('.btm-tab');
    const projectNameEl = get('project-name');

    runBtn?.addEventListener('click', () => this.run());
    stopBtn?.addEventListener('click', () => this.stop());
    pauseBtn?.addEventListener('click', () => this.pauseResume());
    saveBtn?.addEventListener('click', () => this.saveProject());
    downloadBtn?.addEventListener('click', () => this.downloadProject());
    loadBtn?.addEventListener('click', () => this.loadProject());
    savedProjectsBtn?.addEventListener('click', () => this._openSavedProjects());
    shareBtn?.addEventListener('click', () => this.shareProject());
    newProjectBtn?.addEventListener('click', () => this._newProject());
    clearBtn?.addEventListener('click', () => this.clearCanvas());
    exportBtn?.addEventListener('click', () => this.exportImage());
    formatBtn?.addEventListener('click', () => this.formatCode());
    verifyBtn?.addEventListener('click', () => this.verify());
    examplesBtn?.addEventListener('click', () => this._showModal('modal-examples'));
    shortcutsBtn?.addEventListener('click', () => this._showModal('modal-shortcuts'));
    toggleEditorBtn?.addEventListener('click', () => this._togglePanel('panel-editor', toggleEditorBtn, 'Collapse Editor', 'Expand Editor'));
    toggleComponentsBtn?.addEventListener('click', () => this._togglePanel('panel-components', toggleComponentsBtn, 'Collapse Panel', 'Expand Panel'));
    showEditorBtn?.addEventListener('click', () => this._togglePanel('panel-editor', toggleEditorBtn, 'Collapse Editor', 'Expand Editor'));
    showComponentsBtn?.addEventListener('click', () => this._togglePanel('panel-components', toggleComponentsBtn, 'Collapse Panel', 'Expand Panel'));
    toggleBottomBtn?.addEventListener('click', () => this._toggleBottomPanel(toggleBottomBtn));
    const viewCodeBtn = get('btn-view-code');
    const viewCircuitBtn = get('btn-view-circuit');
    const viewSerialBtn = get('btn-view-serial');
    viewCodeBtn?.addEventListener('click', () => this._setView('code'));
    viewCircuitBtn?.addEventListener('click', () => this._setView('circuit'));
    viewSerialBtn?.addEventListener('click', () => this._setView('serial'));
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
    oscCh1?.addEventListener('change', (e) => this.osc?.setChannel(1, e.target.value));
    oscCh2?.addEventListener('change', (e) => this.osc?.setChannel(2, e.target.value));
    oscTimebase?.addEventListener('change', (e) => this.osc?.setTimebase(e.target.value));
    propsApply?.addEventListener('click', () => this._applyPropsModal());

    // Modal close
    document.querySelectorAll('.modal-close').forEach(btn => btn.addEventListener('click', () => this._closeModal()));
    document.querySelectorAll('[data-modal]').forEach(btn => btn.addEventListener('click', () => this._closeModal()));
    modalOverlay?.addEventListener('click', (e) => { if (e.target === modalOverlay) this._closeModal(); });

    // Bottom tabs
    bottomTabButtons.forEach(btn => btn.addEventListener('click', (e) => this._switchBottomTab(e.currentTarget)));

    // Saved projects list (event delegation)
    const savedList = get('saved-projects-list');
    savedList?.addEventListener('click', (e) => {
      const btn = e.target.closest('button.saved-load, button.saved-download, button.saved-delete');
      if (!btn || !btn.dataset.id) return;
      if (btn.classList.contains('saved-load')) this._loadSavedProject(btn.dataset.id);
      else if (btn.classList.contains('saved-download')) this._downloadSavedProject(btn.dataset.id);
      else if (btn.classList.contains('saved-delete')) this._deleteSavedProject(btn.dataset.id);
    });

    // Editable project name
    if (projectNameEl) {
      projectNameEl.addEventListener('input', (e) => {
        this._projectName = (e.target.value || 'Untitled Project').trim() || 'Untitled Project';
        document.title = `${this._projectName} — ArduSim`;
        window.StorageManager?.markDirty();
      });
      projectNameEl.addEventListener('blur', () => {
        this._triggerAutoSave();
      });
    }

    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Don't intercept when user is typing in an input
      const tag = document.activeElement?.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        this.downloadProject();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        this.saveProject();
        return;
      }
      if (e.key === 'Escape') {
        this._closeModal();
        this._closeContextMenu();
        return;
      }
      if (inInput) return; // don't intercept remaining shortcuts while typing

      if (e.key === 'F5') { e.preventDefault(); this.run(); return; }
      if (e.key === 'F6') { e.preventDefault(); this.stop(); return; }
      if (e.key === 'F7') { e.preventDefault(); this.pauseResume(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (!e.shiftKey) this.canvas?.undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        this.canvas?.redo();
        return;
      }
    });

    // Context menu
    document.addEventListener('click', (e) => {
      const ctxMenu = document.getElementById('canvas-context-menu');
      if (ctxMenu && !ctxMenu.contains(e.target)) {
        this._closeContextMenu();
      }
    });
  }

  /* ══════════════════════ CANVAS INIT ══════════════════════ */
  _initCanvas() {
    const canvasEl = document.getElementById('circuit-canvas');
    const wrapperEl = document.getElementById('canvas-wrapper');
    if (canvasEl && wrapperEl && window.CircuitCanvasClass) {
      this.canvas = new window.CircuitCanvasClass(canvasEl, wrapperEl);
      window.CircuitCanvas = this.canvas;
      this.canvas.onCompChanged = () => {
        this._refreshCanvasSummary();
        this._triggerAutoSave();
        window.StorageManager?.markDirty();
      };
      this.canvas.onContextMenu = (inst, x, y) => this._showContextMenu(inst, x, y);
      this._refreshCanvasSummary();
    }
  }

  /* ══════════════════════ SERIAL INIT ══════════════════════ */
  _initSerial() {
    if (window.SerialMonitorClass) {
      this.serial = new window.SerialMonitorClass();
      window.SerialMonitor = this.serial;
      this.serial.log('ArduSim ready. Add components, wire them up, and press Run.', 'system');
    }
  }

  /* ══════════════════════ OUTPUT / DEBUG INIT ══════════════════════ */
  _initOutput() {
    if (window.OutputPanelClass) {
      this.output = new window.OutputPanelClass();
      window.OutputPanel = this.output;
      this.output.log('ArduSim ready. Code errors and debug messages will appear here.', 'system');
    }
  }

  /* ══════════════════════ SIMULATOR EVENTS ══════════════════════ */
  _attachSimulatorEvents() {
    this.sim.onSerial = (text, type) => {
      this.serial?.receive(text, type);
    };

    this.sim.onPinChange = (pinKey, value) => {
      if (this.canvas) this.canvas.updateSimState(this.sim.pinStates);
      if (this.osc)    this.osc.sample(this.sim.simTime, this.sim.pinStates);
      this._updatePinMonitor();
    };

    this.sim.onTick = (simTime, fps) => {
      const simTimeEl = document.getElementById('sim-time');
      const fpsEl     = document.getElementById('sim-fps');
      if (simTimeEl) simTimeEl.textContent = `⏱ ${(simTime / 1000).toFixed(2)}s`;
      if (fpsEl)     fpsEl.textContent     = `${fps} FPS`;
    };

    this.sim.onError = (err) => {
      this._updateCompileStatus(`Error: ${err}`);
      this.showToast(err, 'error');
      this.output?.log(`Error: ${err}`, 'error');
      this._setRunningState(false);
      // Try to extract line number from error and show squiggle
      const lineMatch = err.match(/line[:\s]+(\d+)/i);
      if (this.editor && lineMatch) {
        this.editor.showError(parseInt(lineMatch[1]), err);
      }
    };

    this.sim.onStop = () => {
      this._setRunningState(false);
      this._updateStatus('Stopped');
      const simDot = document.getElementById('sim-dot');
      if (simDot) simDot.classList.remove('running');
    };

    this.sim.onEvent = (type, data) => {
      if (!this.canvas) return;
      const insts = this.canvas.components || [];

      // LCD display events
      for (const inst of insts) {
        if (inst.type !== 'lcd1602') continue;
        if (type === 'lcd_power') {
          inst.runtimeState.powered = true;
        } else if (type === 'lcd_clear') {
          inst.runtimeState.line1 = '';
          inst.runtimeState.line2 = '';
        } else if (type === 'lcd_print') {
          const cursor = (data && data.cursor) || { col: 0, row: 0 };
          const lineKey = cursor.row === 1 ? 'line2' : 'line1';
          const text = String(data && data.text !== undefined ? data.text : '');
          const line = String(inst.runtimeState[lineKey] || '').padEnd(16, ' ').slice(0, 16).split('');
          const col = Math.max(0, Math.min(15, cursor.col || 0));
          for (let i = 0; i < text.length && col + i < 16; i++) {
            line[col + i] = text[i];
          }
          inst.runtimeState[lineKey] = line.join('');
        }
      }

      // Servo events
      if (type === 'servo' && data && Number.isFinite(Number(data.angle))) {
        const angle = Math.max(0, Math.min(180, Number(data.angle)));
        for (const inst of insts) {
          if (inst.type === 'servo') {
            inst.runtimeState.angle = angle;
            break;
          }
        }
      }
    };
  }

  /* ══════════════════════ RUN / STOP / PAUSE ══════════════════════ */
  async run() {
    if (!this.editor) return;
    const code = this.editor.getCode();
    this._updateCompileStatus('Compiling…');
    this._updateStatus('Compiling sketch');
    this.serial?.log('Compiling sketch…', 'system');
    this.output?.log('Compiling sketch…', 'system');
    if (this.editor) this.editor.clearErrors();

    this.sim.stop();
    let result;
    try {
      result = await this.sim.run(code);
    } catch (err) {
      console.error('[ArduSim] Run error:', err);
      this._updateCompileStatus('Compile failed');
      this._updateStatus('Simulation failed');
      this.output?.log(`Simulation failed unexpectedly: ${err && err.message ? err.message : err}`, 'error');
      this.showToast('Simulation failed unexpectedly', 'error');
      this._setRunningState(false);
      return;
    }
    if (result) {
      this._setRunningState(true);
      this._updateCompileStatus('Running');
      this._updateStatus('Simulation running');
      this.output?.log('Compile OK — running simulation', 'success');
    } else {
      this._setRunningState(false);
      this._updateCompileStatus('Compile failed');
      this.output?.log('Compile failed — see the error message below', 'error');
    }
  }

  stop() {
    this.sim.stop();
    this._setRunningState(false);
    this._updateStatus('Stopped');
    this.output?.log('Simulation stopped', 'system');
    const fpsEl = document.getElementById('sim-fps');
    if (fpsEl) fpsEl.textContent = '0 FPS';
  }

  pauseResume() {
    if (!this.isRunning) return;
    const pauseBtn = document.getElementById('btn-pause');
    if (this.sim.isPaused) {
      this.sim.resume();
      this._updateStatus('Simulation resumed');
      this.output?.log('Simulation resumed', 'success');
      if (pauseBtn) {
        pauseBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M6 3.5a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5m4 0a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5"/></svg> Pause`;
      }
    } else {
      this.sim.pause();
      this._updateStatus('Simulation paused');
      this.output?.log('Simulation paused', 'warn');
      if (pauseBtn) {
        pauseBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M10.804 8 5 4.633v6.734zm.792-.696a.802.802 0 0 1 0 1.392l-6.363 3.692C4.713 12.69 4 12.345 4 11.692V4.308c0-.653.713-.998 1.233-.696z"/></svg> Resume`;
      }
    }
  }

  clearCanvas() {
    if (!this.canvas) return;
    const hasComponents = this.canvas.components.length > 0 || this.canvas.wires.length > 0;
    if (!hasComponents) return;
    window.Utils?.ConfirmDialog.show('Clear the canvas? This will remove all components and wires.', 'Clear Canvas')
      .then(ok => {
        if (!ok) return;
        this.canvas.clearCanvas();
        this._refreshCanvasSummary();
        this.showToast('Circuit cleared', 'info');
        this._triggerAutoSave();
      });
  }

  exportImage() {
    this.canvas?.exportPNG();
  }

  formatCode() {
    this.editor?.formatCode();
  }

  /* ══════════════════════ PROJECT NAME ══════════════════════ */
  getProjectName() {
    return this._projectName || 'Untitled Project';
  }

  _setProjectName(name) {
    this._projectName = name || 'Untitled Project';
    document.title = `${this._projectName} — ArduSim`;
    const el = document.getElementById('project-name');
    if (el) el.value = this._projectName;
  }

  /* ══════════════════════ SAVE / DOWNLOAD / LOAD / SHARE ══════════════════════ */
  saveProject() {
    const code = this.editor?.getCode() || '';
    const circuitData = this.canvas?.serialize() || { components: [], wires: [] };
    window.StorageManager?.saveToLibrary(code, circuitData, this._projectName);
  }

  downloadProject() {
    const code = this.editor?.getCode() || '';
    const circuitData = this.canvas?.serialize() || { components: [], wires: [] };
    window.StorageManager?.downloadProject(code, circuitData, this._projectName);
  }

  loadProject() {
    window.StorageManager?.loadFromFile((project) => {
      if (this.editor) this.editor.setCode(project.code || '');
      if (this.canvas) this.canvas.deserialize(project.circuit || { components: [], wires: [] });
      this._setProjectName(project.name || 'Untitled Project');
      this._refreshCanvasSummary();
    });
  }

  shareProject() {
    const code = this.editor?.getCode() || '';
    const circuitData = this.canvas?.serialize() || { components: [], wires: [] };
    window.StorageManager?.shareUrl(code, circuitData);
  }

  /* ══════════════════════ SAVED PROJECTS ══════════════════════ */
  _openSavedProjects() {
    this._renderSavedProjects();
    this._showModal('modal-saved');
  }

  _renderSavedProjects() {
    const list = document.getElementById('saved-projects-list');
    if (!list) return;
    const projects = window.StorageManager?.getSavedProjects() || [];
    if (!projects.length) {
      list.innerHTML = `<div class="saved-empty">No saved projects yet.<br>Click <b>Save</b> in the toolbar to save the current project here.</div>`;
      return;
    }
    list.innerHTML = projects.map(p => {
      const date = new Date(p.savedAt).toLocaleString();
      const compCount = Array.isArray(p.circuit?.components) ? p.circuit.components.length : 0;
      const wireCount = Array.isArray(p.circuit?.wires) ? p.circuit.wires.length : 0;
      const name = String(p.name || 'Untitled Project').replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
      return `
        <div class="saved-project-item">
          <div class="saved-project-info">
            <strong class="saved-project-name">${name}</strong>
            <span class="saved-project-meta">${compCount} components · ${wireCount} wires · ${date}</span>
          </div>
          <div class="saved-project-actions">
            <button class="hdr-btn hdr-btn-ghost saved-load" data-id="${p.id}">Open</button>
            <button class="hdr-btn hdr-btn-ghost saved-download" data-id="${p.id}" title="Download as JSON file">Download</button>
            <button class="hdr-btn hdr-btn-ghost saved-delete" data-id="${p.id}" title="Delete from Saved Projects">Delete</button>
          </div>
        </div>`;
    }).join('');
  }

  _loadSavedProject(id) {
    const p = (window.StorageManager?.getSavedProjects() || []).find(x => x.id === id);
    if (!p) { this.showToast('Saved project not found', 'error'); return; }
    if (this.editor) this.editor.setCode(p.code || '');
    if (this.canvas) this.canvas.deserialize(p.circuit || { components: [], wires: [] });
    this._setProjectName(p.name || 'Untitled Project');
    this._refreshCanvasSummary();
    this._closeModal();
    this.showToast(`"${p.name}" opened`, 'success');
  }

  _downloadSavedProject(id) {
    const p = (window.StorageManager?.getSavedProjects() || []).find(x => x.id === id);
    if (!p) return;
    window.StorageManager?.downloadProject(p.code || '', p.circuit || { components: [], wires: [] }, p.name || 'Untitled Project');
  }

  _deleteSavedProject(id) {
    window.StorageManager?.deleteSavedProject(id);
    this._renderSavedProjects();
  }

_newProject() {
    // Reset the canvas and editor to a fresh state
    this.canvas?.clearCanvas();
    this.editor?.setCode('void setup() {\n  // setup code\n}\nvoid loop() {\n  // loop code\n}');
    this._setProjectName('Untitled Project');
    this.output?.log('New project created', 'system');
    // Focus the editor for immediate typing
    const codeEl = document.getElementById('editor-code');
    if (codeEl) codeEl.focus();
  }

  /* ══════════════════════ AUTO-SAVE ══════════════════════ */
  _triggerAutoSave() {
    if (!this._autoSaveDebounced) {
      this._autoSaveDebounced = window.Utils?.debounce((code, circuit, name) => {
        window.StorageManager?.autoSave(code, circuit, name);
      }, 2000) ?? ((code, circuit, name) => {
        clearTimeout(this._autoSaveTimer);
        this._autoSaveTimer = setTimeout(() => window.StorageManager?.autoSave(code, circuit, name), 2000);
      });
    }
    const code = this.editor?.getCode() || '';
    const circuit = this.canvas?.serialize() || { components: [], wires: [] };
    this._autoSaveDebounced(code, circuit, this._projectName);
  }

  /* ══════════════════════ COMPONENT LIBRARY ══════════════════════ */
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
        item.title = def.desc || def.name;
        item.innerHTML = `<span class="comp-icon">${def.icon || '🔧'}</span><span class="comp-name">${def.name}</span>`;
        item.addEventListener('click', () => {
          if (this.canvas) {
            this.canvas.startPlacing(id);
            this.showToast(`${def.name} selected — click on canvas to place`, 'info');
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

  /* ══════════════════════ CANVAS SUMMARY ══════════════════════ */
  _refreshCanvasSummary() {
    const compEl = document.getElementById('canvas-comp-count');
    const wireEl = document.getElementById('canvas-wire-count');
    if (!this.canvas) return;
    const nc = this.canvas.components.length;
    const nw = this.canvas.wires.length;
    if (compEl) compEl.textContent = `${nc} component${nc !== 1 ? 's' : ''}`;
    if (wireEl) wireEl.textContent = `${nw} wire${nw !== 1 ? 's' : ''}`;
  }

  /* ══════════════════════ RESTORE PROJECT ══════════════════════ */
  _restoreProject() {
    const project = window.StorageManager?.autoLoad?.();
    if (project) {
      if (this.editor) this.editor.setCode(project.code || '');
      if (this.canvas) this.canvas.deserialize(project.circuit || { components: [], wires: [] });
      this._setProjectName(project.name || 'Untitled Project');
      this._refreshCanvasSummary();
      this.showToast('Previous project restored', 'success');
      window.StorageManager?.markClean();
      return;
    }

    const shared = window.StorageManager?.loadFromUrl?.();
    if (shared) {
      if (this.editor) this.editor.setCode(shared.code || '');
      if (this.canvas) this.canvas.deserialize(shared.circuit || { components: [], wires: [] });
      this._setProjectName(shared.name || 'Shared Project');
      this._refreshCanvasSummary();
      this.showToast('Shared project loaded', 'success');
      return;
    }

    // Default starter circuit if canvas is empty
    if (this.canvas && this.canvas.components.length === 0) {
      this._loadExampleCircuit('blink');
    }
  }

  /* ══════════════════════ RUNNING STATE ══════════════════════ */
  _setRunningState(running) {
    this.isRunning = running;
    const runBtn   = document.getElementById('btn-run');
    const stopBtn  = document.getElementById('btn-stop');
    const pauseBtn = document.getElementById('btn-pause');
    const simDot   = document.getElementById('sim-dot');
    if (runBtn)  runBtn.classList.toggle('hidden', running);
    if (stopBtn) stopBtn.classList.toggle('hidden', !running);
    if (pauseBtn) pauseBtn.disabled = !running;
    if (simDot) simDot.classList.toggle('running', running);
    if (!running) {
      const fpsEl = document.getElementById('sim-fps');
      if (fpsEl) fpsEl.textContent = '0 FPS';
    }
  }

  /* ══════════════════════ PIN MONITOR ══════════════════════ */
  _updatePinMonitor() {
    const grid = document.getElementById('pin-monitor-grid');
    if (!grid || !this.sim) return;

    // Rebuild only if not running or empty
    if (grid.childElementCount === 0) {
      this._buildPinMonitor(grid);
    }

    // Update values
    grid.querySelectorAll('.pin-row').forEach(row => {
      const pinKey = row.dataset.pin;
      const valEl  = row.querySelector('.pin-val');
      const barEl  = row.querySelector('.pin-bar-fill');
      const modeEl = row.querySelector('.pin-mode');
      const val = this.sim.pinStates[pinKey];
      const mode = this.sim.pinModes[pinKey];
      if (valEl) {
        if (val === undefined || val === null) {
          valEl.textContent = '—';
          row.classList.remove('pin-high', 'pin-pwm');
        } else if (val <= 1) {
          valEl.textContent = val ? 'HIGH' : 'LOW';
          row.classList.toggle('pin-high', val === 1);
          row.classList.remove('pin-pwm');
        } else {
          valEl.textContent = val;
          row.classList.add('pin-pwm');
          row.classList.remove('pin-high');
        }
      }
      if (barEl) {
        const pct = val !== undefined ? Math.round((val / 255) * 100) : 0;
        barEl.style.width = `${pct}%`;
      }
      if (modeEl) {
        modeEl.textContent = mode || '—';
      }
    });
  }

  _buildPinMonitor(grid) {
    grid.innerHTML = '';
    const pins = [
      { key: 'pin_0',  label: 'D0' },  { key: 'pin_1',  label: 'D1' },
      { key: 'pin_2',  label: 'D2' },  { key: 'pin_3',  label: 'D3~' },
      { key: 'pin_4',  label: 'D4' },  { key: 'pin_5',  label: 'D5~' },
      { key: 'pin_6',  label: 'D6~' }, { key: 'pin_7',  label: 'D7' },
      { key: 'pin_8',  label: 'D8' },  { key: 'pin_9',  label: 'D9~' },
      { key: 'pin_10', label: 'D10~'},  { key: 'pin_11', label: 'D11~'},
      { key: 'pin_12', label: 'D12' }, { key: 'pin_13', label: 'D13' },
      { key: 'pin_14', label: 'A0' },  { key: 'pin_15', label: 'A1' },
      { key: 'pin_16', label: 'A2' },  { key: 'pin_17', label: 'A3' },
      { key: 'pin_18', label: 'A4' },  { key: 'pin_19', label: 'A5' },
    ];
    pins.forEach(pin => {
      const row = document.createElement('div');
      row.className = 'pin-row';
      row.dataset.pin = pin.key;
      row.innerHTML = `
        <span class="pin-label">${pin.label}</span>
        <span class="pin-mode">—</span>
        <span class="pin-val">—</span>
        <div class="pin-bar"><div class="pin-bar-fill"></div></div>`;
      grid.appendChild(row);
    });
  }

  /* ══════════════════════ BEFORE UNLOAD GUARD ══════════════════════ */
  _setupBeforeUnloadGuard() {
    window.addEventListener('beforeunload', (e) => {
      if (window.StorageManager?.isDirty()) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    });
  }

  /* ══════════════════════ LOADING OVERLAY ══════════════════════ */
  _hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (!overlay) return;
    overlay.classList.add('fade-out');
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 400);
  }

  /* ══════════════════════ THEME ══════════════════════ */
  _toggleTheme(iconDark, iconLight) {
    const body = document.body;
    const isDark = body.classList.contains('dark-theme');
    const darkMode = !isDark;
    body.classList.toggle('dark-theme', darkMode);
    body.classList.toggle('light-theme', !darkMode);
    if (this.editor?.setTheme) this.editor.setTheme(darkMode);
    if (iconDark)  iconDark.classList.toggle('hidden', !darkMode);
    if (iconLight) iconLight.classList.toggle('hidden', darkMode);
    try { localStorage.setItem('ardusim-theme', darkMode ? 'dark' : 'light'); } catch (e) {}
  }

  _loadTheme() {
    let theme;
    try { theme = localStorage.getItem('ardusim-theme'); } catch (e) { theme = null; }
    const darkMode = theme !== 'light';
    const iconDark  = document.getElementById('theme-icon-dark');
    const iconLight = document.getElementById('theme-icon-light');
    document.body.classList.toggle('dark-theme', darkMode);
    document.body.classList.toggle('light-theme', !darkMode);
    if (this.editor?.setTheme) this.editor.setTheme(darkMode);
    if (iconDark)  iconDark.classList.toggle('hidden', !darkMode);
    if (iconLight) iconLight.classList.toggle('hidden', darkMode);
  }

  /* ══════════════════════ STATUS BAR ══════════════════════ */
  _updateStatus(msg) {
    const el = document.getElementById('sim-status-text');
    if (el) el.textContent = msg;
  }

  _updateCompileStatus(msg) {
    const el = document.getElementById('compile-status');
    if (el) el.textContent = `● ${msg}`;
  }

  /* ══════════════════════ MODALS ══════════════════════ */
  _showModal(modalId) {
    const overlay = document.getElementById('modal-overlay');
    const modal   = document.getElementById(modalId);
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

  /* ══════════════════════ CONTEXT MENU ══════════════════════ */
  _showContextMenu(inst, x, y) {
    this._closeContextMenu();
    const menu = document.getElementById('canvas-context-menu');
    if (!menu) return;
    menu.style.left = `${x}px`;
    menu.style.top  = `${y}px`;
    menu.classList.remove('hidden');
    menu.classList.add('active');

    const itemDelete    = document.getElementById('ctx-delete');
    const itemProps     = document.getElementById('ctx-props');
    const itemDuplicate = document.getElementById('ctx-duplicate');
    const itemRotate    = document.getElementById('ctx-rotate');

    const cleanup = () => this._closeContextMenu();

    itemDelete?.removeEventListener('click', itemDelete._handler);
    itemDelete._handler = () => { this.canvas?.deleteSelected(); cleanup(); };
    itemDelete?.addEventListener('click', itemDelete._handler, { once: true });

    itemProps?.removeEventListener('click', itemProps._handler);
    itemProps._handler = () => { if (inst) this.openPropsModal(inst); cleanup(); };
    itemProps?.addEventListener('click', itemProps._handler, { once: true });

    itemDuplicate?.removeEventListener('click', itemDuplicate._handler);
    itemDuplicate._handler = () => { this.canvas?.duplicateSelected?.(); cleanup(); };
    itemDuplicate?.addEventListener('click', itemDuplicate._handler, { once: true });

    itemRotate?.removeEventListener('click', itemRotate._handler);
    itemRotate._handler = () => { this.canvas?.rotateSelected?.(); cleanup(); };
    itemRotate?.addEventListener('click', itemRotate._handler, { once: true });
  }

  _closeContextMenu() {
    const menu = document.getElementById('canvas-context-menu');
    if (menu) { menu.classList.add('hidden'); menu.classList.remove('active'); }
  }

  /* ══════════════════════ PANEL TOGGLES ══════════════════════ */
  _togglePanel(panelId, button, collapseTitle, expandTitle) {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    const hidden = !panel.classList.contains('hidden');
    panel.classList.toggle('hidden', hidden);
    if (button) button.title = hidden ? expandTitle : collapseTitle;

    // Adjacent resizer follows the panel visibility
    const resizerId = panelId === 'panel-editor' ? 'resizer-left'
                    : panelId === 'panel-components' ? 'resizer-right' : null;
    if (resizerId) {
      const resizer = document.getElementById(resizerId);
      if (resizer) resizer.classList.toggle('hidden', hidden);
    }

    // Always-visible toggle in the canvas header (collapse + expand)
    const canvasToggleId = panelId === 'panel-editor' ? 'btn-show-editor'
                         : panelId === 'panel-components' ? 'btn-show-components' : null;
    if (canvasToggleId) {
      const canvasToggle = document.getElementById(canvasToggleId);
      if (canvasToggle) {
        canvasToggle.title = hidden ? expandTitle : collapseTitle;
        const icon = canvasToggle.querySelector('svg');
        if (icon) icon.style.transform = hidden ? 'rotate(180deg)' : '';
      }
    }
  }

  _toggleBottomPanel(button) {
    const bottom = document.getElementById('bottom-panel');
    if (!bottom) return;
    const collapsed = bottom.classList.toggle('collapsed');
    document.body.classList.toggle('bottom-collapsed', collapsed);
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

  /* ══════════════════════ VIEW FOCUS MODES ══════════════════════ */
  _setView(view) {
    if (this._activeView === view) {
      // Clicking the active view restores the default layout
      this._activeView = null;
      document.body.classList.remove('view-code', 'view-circuit', 'view-serial');
    } else {
      this._activeView = view;
      document.body.classList.remove('view-code', 'view-circuit', 'view-serial');
      document.body.classList.add(`view-${view}`);
      if (view === 'serial') {
        const tab = document.getElementById('tab-serial');
        if (tab) this._switchBottomTab(tab);
      }
    }
    this._updateViewButtons();
  }

  _updateViewButtons() {
    ['code', 'circuit', 'serial'].forEach(v => {
      const btn = document.getElementById(`btn-view-${v}`);
      if (btn) btn.classList.toggle('active', this._activeView === v);
    });
  }

  /* ══════════════════════ PANEL RESIZERS ══════════════════════ */
  _initResizers() {
    const bindResizer = (resizerId, panelId, dir) => {
      const resizer = document.getElementById(resizerId);
      const panel = document.getElementById(panelId);
      if (!resizer || !panel) return;
      resizer.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (document.body.classList.contains('view-code') ||
            document.body.classList.contains('view-circuit') ||
            document.body.classList.contains('view-serial')) return;
        const startX = e.clientX;
        const startW = panel.getBoundingClientRect().width;
        const minW = 120;
        const maxW = Math.max(minW + 100, window.innerWidth - 360);
        const onMove = (ev) => {
          let w = dir === 'left' ? startW + (ev.clientX - startX) : startW - (ev.clientX - startX);
          w = Math.max(minW, Math.min(maxW, w));
          panel.style.width = `${w}px`;
          panel.style.flex = '0 0 auto';
        };
        const onUp = () => {
          document.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerup', onUp);
          resizer.classList.remove('dragging');
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
        };
        resizer.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
      });
    };
    bindResizer('resizer-left', 'panel-editor', 'left');
    bindResizer('resizer-right', 'panel-components', 'right');
  }

  _toggleOscPause(button) {
    if (!this.osc) return;
    const paused = this.osc.togglePause();
    if (button) button.textContent = paused ? 'Resume' : 'Pause';
  }

  /* ══════════════════════ VERIFY ══════════════════════ */
  async verify() {
    if (!this.editor) return;
    const code = this.editor.getCode();
    this._updateCompileStatus('Verifying…');
    this._updateStatus('Verifying sketch');
    this.serial?.log('Verifying sketch…', 'system');
    this.output?.log('Verifying sketch…', 'system');
    if (this.editor) this.editor.clearErrors();

    let result;
    try {
      result = await this.sim.compile(code);
    } catch (err) {
      console.error('[ArduSim] Verify error:', err);
      this._updateCompileStatus('Verification failed');
      this._updateStatus('Verification failed');
      this.output?.log(`Verification failed unexpectedly: ${err && err.message ? err.message : err}`, 'error');
      this.showToast('Verification failed unexpectedly', 'error');
      return false;
    }
    if (result.ok) {
      this._updateCompileStatus('Verified ✓');
      this._updateStatus('Verification succeeded');
      this.output?.log('✓ Sketch verified — no errors found', 'success');
      this.showToast('✓ Sketch verified — no errors found!', 'success');
      return true;
    }

    this._updateCompileStatus(`Error: ${result.error}`);
    this._updateStatus('Verification failed');
    this.output?.log(`Error: ${result.error}`, 'error');
    this.showToast(result.error || 'Verification failed', 'error');
    if (this.editor) this.editor.showError(1, result.error);
    return false;
  }

  /* ══════════════════════ OSCILLOSCOPE ══════════════════════ */
  _initOscilloscope() {
    const oscCanvas = document.getElementById('oscilloscope-canvas');
    if (!oscCanvas || !window.OscilloscopeClass) return;
    this.osc = new window.OscilloscopeClass(oscCanvas);
  }

  /* ══════════════════════ EXAMPLES ══════════════════════ */
  _renderExamples() {
    const container = document.getElementById('examples-grid');
    if (!container || !window.EXAMPLE_SKETCHES) return;
    container.innerHTML = '';
    for (const example of window.EXAMPLE_SKETCHES) {
      const item = document.createElement('button');
      item.className = 'example-item';
      item.innerHTML = `<div class="example-icon">${example.icon || '📄'}</div><div class="example-info"><strong>${example.name}</strong><span>${example.desc}</span><div class="example-tags">${(example.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('')}</div></div>`;
      item.addEventListener('click', () => {
        if (this.editor) this.editor.setCode(example.code || '');
        if (example.circuit && this.canvas) this._loadExampleCircuit(example.circuit);
        this._closeModal();
        this.showToast(`${example.name} loaded`, 'success');
        this._setProjectName(example.name);
      });
      container.appendChild(item);
    }
  }

  _loadExampleCircuit(key) {
    if (!this.canvas) return;

    // Data-driven circuit (serialized project data) — most examples use this
    if (key && typeof key === 'object' && Array.isArray(key.components)) {
      this.canvas.deserialize(key);
      this._refreshCanvasSummary();
      return;
    }

    // Legacy named circuits (hardcoded builders)
    const lower = String(key || '').toLowerCase();
    if (lower === 'led_on_13' || lower === 'blink') {
      this.canvas.clearCanvas();
      const board = this.canvas.addComponent('arduino_uno', 200, 100);
      const led   = this.canvas.addComponent('led', 120, 280);
      const res   = this.canvas.addComponent('resistor', 120, 360);
      if (board && led && res) {
        this.canvas.addWire(board.id, 'D13', led.id, 'anode');
        this.canvas.addWire(led.id, 'cathode', res.id, 'p1');
        this.canvas.addWire(res.id, 'p2', board.id, 'GND1');
      }
      this._refreshCanvasSummary();
      setTimeout(() => this.canvas.fitView(), 80);
    }
  }

  /* ══════════════════════ PROPERTIES MODAL ══════════════════════ */
  openPropsModal(comp) {
    this._propsComp = comp;
    const title   = document.getElementById('modal-props-title');
    const body    = document.getElementById('modal-props-body');
    const modal   = document.getElementById('modal-props');
    const overlay = document.getElementById('modal-overlay');

    if (!comp || !body || !modal || !overlay) return;
    if (title) title.textContent = `${comp.type} Properties`;

    const rows = [];
    Object.entries(comp.props || {}).forEach(([key, value]) => {
      const row   = document.createElement('div');
      row.className = 'prop-row';
      const label = document.createElement('label');
      label.textContent = key.replace(/_/g, ' ');
      label.className = 'prop-label';
      label.htmlFor = `prop-${key}`;
      const input = document.createElement('input');
      input.className = 'prop-input';
      input.name = key;
      input.id   = `prop-${key}`;
      input.value = value;
      if (typeof value === 'number') { input.type = 'number'; }
      else if (typeof value === 'boolean') { input.type = 'checkbox'; input.checked = value; }
      else { input.type = 'text'; }
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
    body.querySelectorAll('.prop-input').forEach(input => {
      const key = input.name;
      let val = input.value;
      if (input.type === 'number')   val = Number(val);
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

  /* ══════════════════════ TOAST STACK ══════════════════════ */
  showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = { success: '✓', error: '✕', warn: '⚠', info: 'ℹ' };
    const icon = document.createElement('span');
    icon.className = 'toast-icon';
    icon.textContent = icons[type] || 'ℹ';
    const text = document.createElement('span');
    text.className = 'toast-msg';
    text.textContent = String(msg);
    toast.appendChild(icon);
    toast.appendChild(text);

    container.appendChild(toast);

    // Auto-dismiss
    const DURATION = type === 'error' ? 5000 : 3000;
    setTimeout(() => {
      toast.classList.add('toast-hide');
      setTimeout(() => toast.remove(), 350);
    }, DURATION);

    // Limit stack to 5 toasts
    while (container.childElementCount > 5) {
      container.firstChild?.remove();
    }
  }
}

window.App = new App();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.App.init());
} else {
  window.App.init();
}
