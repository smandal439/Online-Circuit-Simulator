'use strict';

class App {
  constructor() {
    this.sim = window.ArduinoSim;
    this.editor = window.EditorManager;
    this.canvas = null;
    this.serial = null;
    this.output = null;
    this.osc = null;
    this.plotter = null;
    this.isRunning = false;
    this._runEpoch = 0;
    this._pendingRunEpoch = 0;
    this._bottomHeight = 200;
    this._propsComp = null;
    this._projectName = 'Untitled Project';
    this._autoSaveDebounced = null;
    this._activeView = null;
    this._examplesQuery = '';
    this._examplesFilter = 'all';
    this._savedQuery = '';
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
      this._initPlotter();
      this._attachSimulatorEvents();
      this._renderComponentLibrary();
      this._renderExamples();
      this._initBoardSelector();
      window.GuideManager?.bind?.();
      this._restoreProject();
      this._setupBeforeUnloadGuard();
      this._syncProjectsFromServer();

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

    runBtn?.addEventListener('click', () => this.isRunning ? this.stop() : this.run());
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
    examplesBtn?.addEventListener('click', () => {
      this._renderExamples();
      this._showModal('modal-examples');
    });
    shortcutsBtn?.addEventListener('click', () => this._showModal('modal-shortcuts'));
    const homeBtn = get('btn-home');
    homeBtn?.addEventListener('click', () => window.GuideManager?.open('home'));
    const helpComponentsBtn = get('btn-help-components');
    helpComponentsBtn?.addEventListener('click', () => {
      this._closeHeaderDropdowns();
      window.GuideManager?.open('components');
    });
    const helpTutorialsBtn = get('btn-help-tutorials');
    helpTutorialsBtn?.addEventListener('click', () => {
      this._closeHeaderDropdowns();
      window.GuideManager?.open('tutorials');
    });
    const helpShortcutsBtn = get('btn-help-shortcuts');
    helpShortcutsBtn?.addEventListener('click', () => {
      this._closeHeaderDropdowns();
      this._showModal('modal-shortcuts');
    });
    const guideLaunch = get('guide-launch');
    guideLaunch?.addEventListener('click', () => window.GuideManager?.close());
    const guideClose = get('guide-close');
    guideClose?.addEventListener('click', () => window.GuideManager?.close());
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
    const boardSel = get('board-select');
    boardSel?.addEventListener('change', (e) => this._setBoard(e.target.value));
    oscCh1?.addEventListener('change', (e) => this.osc?.setChannel(1, e.target.value));
    oscCh2?.addEventListener('change', (e) => this.osc?.setChannel(2, e.target.value));
    oscTimebase?.addEventListener('change', (e) => this.osc?.setTimebase(e.target.value));
    propsApply?.addEventListener('click', () => this._applyPropsModal());

    // Modal close
    document.querySelectorAll('.modal-close').forEach(btn => btn.addEventListener('click', () => this._closeModal()));
    document.querySelectorAll('[data-modal]').forEach(btn => btn.addEventListener('click', () => this._closeModal()));
    modalOverlay?.addEventListener('click', (e) => { if (e.target === modalOverlay) this._closeModal(); });

    // Header dropdown menus
    document.querySelectorAll('.hdr-dropdown').forEach(dd => {
      const trigger = dd.querySelector('.hdr-dropdown-trigger');
      trigger?.addEventListener('click', (e) => {
        e.stopPropagation();
        const wasOpen = dd.classList.contains('open');
        this._closeHeaderDropdowns();
        if (!wasOpen) {
          const menu = dd.querySelector('.hdr-dropdown-menu');
          const rect = trigger.getBoundingClientRect();
          if (menu) {
            menu.style.top = `${rect.bottom + 6}px`;
            if (dd.classList.contains('hdr-dropdown-right')) {
              menu.style.left = 'auto';
              menu.style.right = `${Math.max(6, window.innerWidth - rect.right)}px`;
            } else {
              menu.style.right = 'auto';
              menu.style.left = `${Math.max(6, rect.left)}px`;
            }
          }
          dd.classList.add('open');
          trigger.setAttribute('aria-expanded', 'true');
        }
      });
      dd.querySelectorAll('.hdr-dropdown-item').forEach(item => {
        item.addEventListener('click', () => this._closeHeaderDropdowns());
      });
    });
    document.addEventListener('click', () => this._closeHeaderDropdowns());

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

    // Examples library search + filters
    const examplesSearch = get('examples-search');
    examplesSearch?.addEventListener('input', (e) => {
      this._examplesQuery = e.target.value.toLowerCase().trim();
      this._renderExamples();
    });
    const examplesFilters = get('examples-filters');
    examplesFilters?.addEventListener('click', (e) => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;
      this._examplesFilter = chip.dataset.filter || 'all';
      examplesFilters.querySelectorAll('.filter-chip').forEach(c => c.classList.toggle('active', c === chip));
      this._renderExamples();
    });

    // Saved projects search
    const savedSearch = get('saved-search');
    savedSearch?.addEventListener('input', (e) => {
      this._savedQuery = e.target.value.toLowerCase().trim();
      this._renderSavedProjects();
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
        if (window.GuideManager?.isOpen?.()) {
          window.GuideManager.close();
          return;
        }
        this._closeModal();
        this._closeContextMenu();
        this._closeHeaderDropdowns();
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
      this.canvas.onPlacingChanged = (placing) => {
        document.querySelectorAll('.comp-item').forEach(item => {
          item.classList.toggle('placing', placing);
        });
      };
      // Initial sync — if already in placing mode from a previous session
      this.canvas.onPlacingChanged(this.canvas.placingType != null);
      this.canvas.onContextMenu = (inst, x, y) => this._showContextMenu(inst, x, y);
      this._refreshCanvasSummary();
    }
  }

  /* ══════════════════════ BOARD SELECTOR ══════════════════════ */
  _initBoardSelector() {
    const settings = window.StorageManager?.loadSettings?.() || {};
    const board = (settings.board === 'esp32_devkit_v1') ? 'esp32_devkit_v1' : 'arduino_uno';
    this.sim.setBoard(board);
    const sel = document.getElementById('board-select');
    if (sel) sel.value = board;
  }

  // Returns the board type driving the simulation: the board actually placed
  // on the canvas wins; otherwise fall back to the selected board.
  _getActiveBoardType() {
    const boardInst = this.canvas?.getBoardInst?.();
    if (boardInst) return boardInst.type;
    return this.sim.board || 'arduino_uno';
  }

  // Sync sim.board (and the board selector UI) with the board actually placed
  // on the canvas, so LED_BUILTIN / A0–A5 map to the right pins.
  _syncBoardFromCanvas() {
    const active = this._getActiveBoardType();
    if (this.sim.board !== active) {
      this.sim.setBoard(active);
      window.StorageManager?.saveSettings?.({ ...(window.StorageManager.loadSettings() || {}), board: active });
      this._pinMonitorBoard = null;
    }
    const sel = document.getElementById('board-select');
    if (sel && sel.value !== active) sel.value = active;
  }

  _setBoard(board) {
    const b = (board === 'esp32_devkit_v1') ? 'esp32_devkit_v1' : 'arduino_uno';
    this.sim.setBoard(b);
    window.StorageManager?.saveSettings?.({ ...(window.StorageManager.loadSettings() || {}), board: b });

    // Rebuild the pin monitor for the new pin set
    this._pinMonitorBoard = null;

    // If the canvas only holds the default starter circuit, reload it for the new board
    const comps = this.canvas?.components || [];
    const hasOnlyStarterBoard = comps.length === 1 && (comps[0].type === 'arduino_uno' || comps[0].type === 'esp32_devkit_v1');
    if (hasOnlyStarterBoard || comps.length === 0) {
      this._loadExampleCircuit('blink');
      this.showToast(`${b === 'esp32_devkit_v1' ? 'ESP32 DevKit V1' : 'Arduino Uno'} starter circuit loaded`, 'success');
    } else {
      this.showToast(`Board set to ${b === 'esp32_devkit_v1' ? 'ESP32 DevKit V1' : 'Arduino Uno'} — existing wiring assumes the previous board`, 'info');
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
      const suppressed = type === 'data' && this.serial?.isBaudMismatched();
      this.serial?.receive(text, type);
      if (!suppressed) this.plotter?.addSerial(text);
    };

    this.sim.onStart = () => {
      if (this._pendingRunEpoch !== this._runEpoch) return; // stop requested while starting
      this._setRunningState(true);
      this._updateCompileStatus('Running');
      this._updateStatus('Simulation running');
      this.output?.log('Compile OK — running simulation', 'success');
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

      // LCD display events (16×2 parallel and I2C/PCF8574 versions)
      for (const inst of insts) {
        if (inst.type !== 'lcd1602' && inst.type !== 'lcd1602_i2c') continue;
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

      // OLED (SSD1306 I2C) display events — maintains a 128×64 framebuffer
      for (const inst of insts) {
        if (inst.type !== 'oled_ssd1306') continue;
        const o = inst.runtimeState.oled || (inst.runtimeState.oled = {
          power: false,
          invert: false,
          pixels: new Uint8Array(128 * 64),
          texts: [],
        });
        const setPx = (px, py, v) => {
          if (px >= 0 && px < 128 && py >= 0 && py < 64) o.pixels[py * 128 + px] = v ? 1 : 0;
        };
        const drawLinePx = (x0, y0, x1, y1) => {
          let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
          const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
          let err = dx + dy;
          for (;;) {
            setPx(x0, y0, 1);
            if (x0 === x1 && y0 === y1) break;
            const e2 = 2 * err;
            if (e2 >= dy) { err += dy; x0 += sx; }
            if (e2 <= dx) { err += dx; y0 += sy; }
          }
        };

        if (type === 'oled_power') {
          o.power = true;
        } else if (type === 'oled_draw' && data) {
          const op = data.op;
          if (op === 'clear') {
            o.pixels.fill(0);
            o.texts = [];
          } else if (op === 'invert') {
            o.invert = !!data.invert;
          } else if (op === 'print') {
            o.texts.push({
              x: data.cursor ? data.cursor.col : 0,
              y: data.cursor ? data.cursor.row : 0,
              text: String(data.text !== undefined ? data.text : ''),
              size: data.size || 1,
              color: data.color === 0 ? 0 : 1,
            });
          } else if (op === 'pixel') {
            setPx(data.x, data.y, 1);
          } else if (op === 'line') {
            drawLinePx(data.x0, data.y0, data.x1, data.y1);
          } else if (op === 'rect') {
            const x = data.x, y = data.y, w = data.w, h = data.h;
            drawLinePx(x, y, x + w, y);
            drawLinePx(x, y + h, x + w, y + h);
            drawLinePx(x, y, x, y + h);
            drawLinePx(x + w, y, x + w, y + h);
          } else if (op === 'fillRect') {
            for (let py = data.y; py < data.y + data.h; py++) {
              for (let px = data.x; px < data.x + data.w; px++) setPx(px, py, 1);
            }
          } else if (op === 'circle') {
            const cx = data.x, cy = data.y, r = data.r;
            let xx = r, yy = 0, err = 1 - r;
            while (xx >= yy) {
              setPx(cx + xx, cy + yy, 1); setPx(cx - xx, cy + yy, 1);
              setPx(cx + xx, cy - yy, 1); setPx(cx - xx, cy - yy, 1);
              setPx(cx + yy, cy + xx, 1); setPx(cx - yy, cy + xx, 1);
              setPx(cx + yy, cy - xx, 1); setPx(cx - yy, cy - xx, 1);
              yy++;
              if (err < 0) err += 2 * yy + 1;
              else { xx--; err += 2 * (yy - xx) + 1; }
            }
          } else if (op === 'fillCircle') {
            const cx = data.x, cy = data.y, r = data.r;
            for (let yy = -r; yy <= r; yy++) {
              for (let xx = -r; xx <= r; xx++) {
                if (xx * xx + yy * yy <= r * r) setPx(cx + xx, cy + yy, 1);
              }
            }
          } else if (op === 'fillScreen') {
            o.pixels.fill(data.color ? 1 : 0);
          }
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
    this._syncBoardFromCanvas();
    this._updateCompileStatus('Compiling…');
    this._updateStatus('Compiling sketch');
    this.serial?.log('Compiling sketch…', 'system');
    this.output?.log('Compiling sketch…', 'system');
    if (this.editor) this.editor.clearErrors();

    this.sim.stop();
    this._pendingRunEpoch = this._runEpoch;
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
    if (this._pendingRunEpoch !== this._runEpoch) {
      // Stop was requested while this run was in flight — leave the stopped state as-is
      this._updateCompileStatus('Stopped');
      return;
    }
    if (!result) {
      this._setRunningState(false);
      this._updateCompileStatus('Compile failed');
      this.output?.log('Compile failed — see the error message below', 'error');
    }
  }

  stop() {
    const wasRunning = this.isRunning;
    this._runEpoch++;
    this.sim.stop();
    this._setRunningState(false);
    this._updateStatus('Stopped');
    if (wasRunning) this.output?.log('Simulation stopped', 'system');
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
      this._syncBoardFromCanvas();
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
  async _syncProjectsFromServer() {
    try {
      const result = await window.StorageManager?.syncFromServer?.();
      if (!result) return;
      const total = (result.merged || 0) + (result.pushed || 0);
      if (total > 0) {
        this.showToast(`Synced ${result.merged} project(s) from server`, 'info');
      }
    } catch (e) {
      // Backend offline — the app simply continues with local storage
    }
  }

  _openSavedProjects() {
    this._renderSavedProjects();
    this._showModal('modal-saved');
  }

  _renderSavedProjects() {
    const list = document.getElementById('saved-projects-list');
    if (!list) return;
    const projects = window.StorageManager?.getSavedProjects() || [];
    const esc = (s) => String(s).replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));

    if (!projects.length) {
      list.innerHTML = `<div class="saved-empty">No saved projects yet.<br>Click <b>Save</b> in the toolbar to save the current project here.</div>`;
      return;
    }

    const q = (this._savedQuery || '').toLowerCase();
    const filtered = q
      ? projects.filter(p => (p.name || '').toLowerCase().includes(q))
      : projects;

    if (!filtered.length) {
      list.innerHTML = `<div class="saved-empty">No saved projects match “${esc(this._savedQuery)}”.</div>`;
      return;
    }

    list.innerHTML = filtered.map(p => {
      const date = new Date(p.savedAt).toLocaleString();
      const compCount = Array.isArray(p.circuit?.components) ? p.circuit.components.length : 0;
      const wireCount = Array.isArray(p.circuit?.wires) ? p.circuit.wires.length : 0;
      const name = esc(p.name || 'Untitled Project');
      return `
        <div class="saved-project-item">
          <div class="saved-project-thumb"><img alt="" loading="lazy"></div>
          <div class="saved-project-info">
            <strong class="saved-project-name">${name}</strong>
            <span class="saved-project-meta">${compCount} components · ${wireCount} wires · ${esc(date)}</span>
            <span class="saved-project-actions">
              <button class="hdr-btn hdr-btn-ghost saved-load" data-id="${esc(p.id)}">Open</button>
              <button class="hdr-btn hdr-btn-ghost saved-download" data-id="${esc(p.id)}" title="Download as JSON file">Download</button>
              <button class="hdr-btn hdr-btn-ghost saved-delete" data-id="${esc(p.id)}" title="Delete from Saved Projects">Delete</button>
            </span>
          </div>
        </div>`;
    }).join('');

    // Render thumbnails (after DOM insertion so images exist)
    list.querySelectorAll('.saved-project-item').forEach((el, i) => {
      const p = filtered[i];
      const img = el.querySelector('.saved-project-thumb img');
      if (img) window.CircuitThumbnail?.applyTo(img, p.circuit, 200, 120);
    });
  }

  _loadSavedProject(id) {
    const p = (window.StorageManager?.getSavedProjects() || []).find(x => x.id === id);
    if (!p) { this.showToast('Saved project not found', 'error'); return; }
    if (this.editor) this.editor.setCode(p.code || '');
    if (this.canvas) this.canvas.deserialize(p.circuit || { components: [], wires: [] });
    this._syncBoardFromCanvas();
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
      this._autoSaveDebounced = window.Utils?.debounce((code, circuit) => {
        window.StorageManager?.autoSave(code, circuit, this._projectName || 'Untitled Project');
      }, 2000) ?? ((code, circuit) => {
        clearTimeout(this._autoSaveTimer);
        this._autoSaveTimer = setTimeout(() => window.StorageManager?.autoSave(code, circuit, this._projectName || 'Untitled Project'), 2000);
      });
    }
    const code = this.editor?.getCode() || '';
    const circuit = this.canvas?.serialize() || { components: [], wires: [] };
    this._autoSaveDebounced(code, circuit);
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
        const shortDesc = (def.desc || '').length > 42 ? def.desc.slice(0, 42) + '…' : (def.desc || '');
        item.innerHTML = `<span class="comp-icon">${def.icon || '🔧'}</span><span class="comp-info"><span class="comp-name">${def.name}</span>${shortDesc ? `<span class="comp-desc">${shortDesc}</span>` : ''}</span>`;
        item.addEventListener('click', () => {
          if (this.canvas) {
            this.canvas.startPlacing(id);
            this.showToast(`${def.name} selected — click on canvas to place`, 'info');
          }
        });
        // Hover tooltip showing full description
        item.addEventListener('mouseenter', () => {
          const existing = item.querySelector('.comp-tooltip');
          if (existing) return;
          const tip = document.createElement('span');
          tip.className = 'comp-tooltip';
          tip.textContent = def.desc || '';
          tip.style.cssText = 'position:absolute;bottom:100%;left:50%;transform:translateX(-50%) translateY(4px);background:var(--bg-panel);padding:6px 10px;border-radius:var(--radius-sm);font-size:11px;color:var(--text-muted);white-space:normal;max-width:200px;box-shadow:var(--shadow-sm);z-index:10;';
          item.appendChild(tip);
        });
        item.addEventListener('mouseleave', () => {
          const tip = item.querySelector('.comp-tooltip');
          if (tip) tip.remove();
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
      this._syncBoardFromCanvas();
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
      this._syncBoardFromCanvas();
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
    const runLabel = document.getElementById('btn-run-label');
    const runIcon  = document.getElementById('btn-run-icon');
    const pauseBtn = document.getElementById('btn-pause');
    const simDot   = document.getElementById('sim-dot');
    if (runBtn) {
      runBtn.classList.toggle('running', running);
      runBtn.title = running ? 'Stop Simulation (F6)' : 'Compile & Run (F5)';
    }
    if (runLabel) runLabel.textContent = running ? 'Stop' : 'Run';
    if (runIcon) {
      runIcon.innerHTML = running
        ? '<path d="M5 3.5h6A1.5 1.5 0 0 1 12.5 5v6a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11V5A1.5 1.5 0 0 1 5 3.5" />'
        : '<path d="M10.804 8 5 4.633v6.734zm.792-.696a.802.802 0 0 1 0 1.392l-6.363 3.692C4.713 12.69 4 12.345 4 11.692V4.308c0-.653.713-.998 1.233-.696z" />';
    }
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

    // Rebuild when the active board (or pin set) changes
    const boardType = this._getActiveBoardType();
    if (this._pinMonitorBoard !== boardType) {
      this._pinMonitorBoard = boardType;
      this._buildPinMonitor(grid, boardType);
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

  _buildPinMonitor(grid, boardType) {
    grid.innerHTML = '';
    const esp32 = boardType === 'esp32_devkit_v1';
    const pins = esp32 ? [
      { key: 'pin_2',  label: 'D2 · L' },  { key: 'pin_4',  label: 'D4' },
      { key: 'pin_5',  label: 'D5' },      { key: 'pin_12', label: 'D12' },
      { key: 'pin_13', label: 'D13' },     { key: 'pin_14', label: 'D14' },
      { key: 'pin_15', label: 'D15' },     { key: 'pin_16', label: 'D16' },
      { key: 'pin_17', label: 'D17' },     { key: 'pin_18', label: 'D18' },
      { key: 'pin_19', label: 'D19' },     { key: 'pin_21', label: 'D21' },
      { key: 'pin_22', label: 'D22' },     { key: 'pin_23', label: 'D23' },
      { key: 'pin_25', label: 'D25' },     { key: 'pin_26', label: 'D26' },
      { key: 'pin_27', label: 'D27' },     { key: 'pin_32', label: 'D32' },
      { key: 'pin_33', label: 'D33' },     { key: 'pin_34', label: 'D34' },
      { key: 'pin_35', label: 'D35' },     { key: 'pin_36', label: 'VP · 36' },
      { key: 'pin_39', label: 'VN · 39' }, { key: 'pin_1',  label: 'TX0' },
      { key: 'pin_3',  label: 'RX0' },
    ] : [
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

    const compGroup   = document.getElementById('ctx-comp-group');
    const wireGroup   = document.getElementById('ctx-wire-group');
    const itemDelete  = document.getElementById('ctx-delete');
    const itemProps   = document.getElementById('ctx-props');
    const itemDuplicate = document.getElementById('ctx-duplicate');
    const itemRotate  = document.getElementById('ctx-rotate');
    const itemWireAuto = document.getElementById('ctx-wire-auto');
    const wirePalette = document.getElementById('wire-palette');

    const cleanup = () => this._closeContextMenu();

    const isWire = inst && (inst.type === 'wire' || !!inst.wire);
    const wireObj = isWire ? (inst.wire || inst) : null;

    if (isWire) {
      if (compGroup) compGroup.classList.add('hidden');
      if (wireGroup) wireGroup.classList.remove('hidden');

      // Highlight current wire color in palette
      if (wirePalette) {
        wirePalette.querySelectorAll('.wire-color-btn').forEach(btn => {
          const isSelected = wireObj && wireObj.color && wireObj.color.toLowerCase() === btn.dataset.color.toLowerCase();
          btn.classList.toggle('active', !!isSelected);

          btn.onclick = (e) => {
            e.stopPropagation();
            if (wireObj) {
              this.canvas?.setWireColor(wireObj.id, btn.dataset.color);
            }
            cleanup();
          };
        });
      }

      if (itemWireAuto) {
        itemWireAuto.onclick = () => {
          if (wireObj) {
            this.canvas?.setWireColor(wireObj.id, null);
          }
          cleanup();
        };
      }
    } else {
      if (compGroup) compGroup.classList.remove('hidden');
      if (wireGroup) wireGroup.classList.add('hidden');

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

    itemDelete?.removeEventListener('click', itemDelete._handler);
    itemDelete._handler = () => { this.canvas?.deleteSelected(); cleanup(); };
    itemDelete?.addEventListener('click', itemDelete._handler, { once: true });
  }

  _closeContextMenu() {
    const menu = document.getElementById('canvas-context-menu');
    if (menu) { menu.classList.add('hidden'); menu.classList.remove('active'); }
  }

  /* ══════════════════════ HEADER DROPDOWNS ══════════════════════ */
  _closeHeaderDropdowns() {
    document.querySelectorAll('.hdr-dropdown.open').forEach(dd => {
      dd.classList.remove('open');
      const t = dd.querySelector('.hdr-dropdown-trigger');
      if (t) t.setAttribute('aria-expanded', 'false');
      const menu = dd.querySelector('.hdr-dropdown-menu');
      if (menu) {
        menu.style.top = '';
        menu.style.left = '';
        menu.style.right = '';
      }
    });
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
    const mainLayout = document.querySelector('.main-layout');
    const collapsed = bottom.classList.toggle('collapsed');
    document.body.classList.toggle('bottom-collapsed', collapsed);
    if (collapsed) {
      // Clear inline sizes so the CSS collapsed rules can take effect
      bottom.style.height = '';
      if (mainLayout) mainLayout.style.bottom = '';
    } else {
      const h = this._bottomHeight || 200;
      bottom.style.height = `${h}px`;
      if (mainLayout) mainLayout.style.bottom = `${h}px`;
    }
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
    if (target === 'pins') this._updatePinMonitor();
  }

  /* ══════════════════════ VIEW FOCUS MODES ══════════════════════ */
  _setView(view) {
    if (this._activeView === view) {
      // Clicking the active view restores the default layout
      this._activeView = null;
      document.body.classList.remove('view-code', 'view-circuit', 'view-serial');
      this._restoreResizedLayout();
    } else {
      this._activeView = view;
      document.body.classList.remove('view-code', 'view-circuit', 'view-serial');
      document.body.classList.add(`view-${view}`);
      // Clear inline sizes so the view-specific CSS rules take over
      const bottom = document.getElementById('bottom-panel');
      const mainLayout = document.querySelector('.main-layout');
      const editorPanel = document.getElementById('panel-editor');
      const compPanel = document.getElementById('panel-components');
      if (bottom) bottom.style.height = '';
      if (mainLayout) mainLayout.style.bottom = '';
      if (editorPanel) { editorPanel.style.width = ''; editorPanel.style.flex = ''; }
      if (compPanel)   { compPanel.style.width = ''; compPanel.style.flex = ''; }
      if (view === 'serial') {
        const tab = document.getElementById('tab-serial');
        if (tab) this._switchBottomTab(tab);
      }
    }
    this._updateViewButtons();
  }

  _restoreResizedLayout() {
    const bottom = document.getElementById('bottom-panel');
    const mainLayout = document.querySelector('.main-layout');
    const editorPanel = document.getElementById('panel-editor');
    const compPanel = document.getElementById('panel-components');
    if (!bottom || document.body.classList.contains('bottom-collapsed')) return;
    if (editorPanel && this._panelWidths && this._panelWidths.editor) {
      editorPanel.style.width = `${this._panelWidths.editor}px`;
      editorPanel.style.flex = '0 0 auto';
    }
    if (compPanel && this._panelWidths && this._panelWidths.components) {
      compPanel.style.width = `${this._panelWidths.components}px`;
      compPanel.style.flex = '0 0 auto';
    }
    const h = this._bottomHeight || 200;
    bottom.style.height = `${h}px`;
    if (mainLayout) mainLayout.style.bottom = `${h}px`;
  }

  _updateViewButtons() {
    ['code', 'circuit', 'serial'].forEach(v => {
      const btn = document.getElementById(`btn-view-${v}`);
      if (btn) btn.classList.toggle('active', this._activeView === v);
    });
  }

  /* ══════════════════════ PANEL RESIZERS ══════════════════════ */
  _initResizers() {
    const LS_KEY = 'ardusim-layout';
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch (e) { saved = {}; }
    const save = () => {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify({
          editorW: this._panelWidths ? this._panelWidths.editor : undefined,
          compW: this._panelWidths ? this._panelWidths.components : undefined,
          bottomH: this._bottomHeight,
        }));
      } catch (e) { /* noop */ }
    };
    this._panelWidths = { editor: saved.editorW || 320, components: saved.compW || 260 };
    if (saved.bottomH) this._bottomHeight = saved.bottomH;

    // Restore saved sizes
    const editorPanel = document.getElementById('panel-editor');
    const compPanel = document.getElementById('panel-components');
    if (editorPanel) { editorPanel.style.width = `${this._panelWidths.editor}px`; editorPanel.style.flex = '0 0 auto'; }
    if (compPanel)   { compPanel.style.width = `${this._panelWidths.components}px`; compPanel.style.flex = '0 0 auto'; }

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
          if (dir === 'left') this._panelWidths.editor = w;
          else this._panelWidths.components = w;
        };
        const onUp = () => {
          document.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerup', onUp);
          resizer.classList.remove('dragging');
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          save();
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

    // Bottom panel resizer (drag up/down to change height)
    const bottomResizer = document.getElementById('resizer-bottom');
    const bottomPanel = document.getElementById('bottom-panel');
    if (bottomResizer && bottomPanel) {
      const mainLayout = document.querySelector('.main-layout');
      bottomResizer.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (document.body.classList.contains('view-code') ||
            document.body.classList.contains('view-circuit') ||
            document.body.classList.contains('view-serial')) return;
        if (bottomPanel.classList.contains('collapsed')) {
          bottomPanel.classList.remove('collapsed');
          document.body.classList.remove('bottom-collapsed');
        }
        const startY = e.clientY;
        const startH = bottomPanel.getBoundingClientRect().height;
        const minH = 80;
        const maxH = Math.max(minH + 50, window.innerHeight - 240);
        bottomPanel.style.transition = 'none';
        const onMove = (ev) => {
          let h = startH + (startY - ev.clientY);
          h = Math.max(minH, Math.min(maxH, h));
          this._bottomHeight = h;
          bottomPanel.style.height = `${h}px`;
          if (mainLayout) mainLayout.style.bottom = `${h}px`;
        };
        const onUp = () => {
          document.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerup', onUp);
          bottomResizer.classList.remove('dragging');
          bottomPanel.style.transition = '';
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          save();
        };
        bottomResizer.classList.add('dragging');
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
      });
    }

    // Apply restored bottom height (unless collapsed)
    const restoredBottom = document.getElementById('bottom-panel');
    if (restoredBottom && !document.body.classList.contains('bottom-collapsed')) {
      restoredBottom.style.height = `${this._bottomHeight}px`;
      const mainLayout = document.querySelector('.main-layout');
      if (mainLayout) mainLayout.style.bottom = `${this._bottomHeight}px`;
    }
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
    this._syncBoardFromCanvas();
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

  /* ══════════════════════ SERIAL PLOTTER ══════════════════════ */
  _initPlotter() {
    const plotterCanvas = document.getElementById('plotter-canvas');
    if (!plotterCanvas || !window.SerialPlotterClass) return;
    this.plotter = new window.SerialPlotterClass(plotterCanvas);

    const clearBtn = document.getElementById('btn-plotter-clear');
    const pauseBtn = document.getElementById('btn-plotter-pause');
    clearBtn?.addEventListener('click', () => this.plotter?.clear());
    pauseBtn?.addEventListener('click', () => {
      const paused = this.plotter?.togglePause();
      if (pauseBtn) pauseBtn.textContent = paused ? 'Resume' : 'Pause';
    });
  }

  /* ══════════════════════ EXAMPLES ══════════════════════ */
  _renderExamples() {
    const container = document.getElementById('examples-grid');
    if (!container || !window.EXAMPLE_SKETCHES) return;

    const q = (this._examplesQuery || '').toLowerCase();
    const filter = this._examplesFilter || 'all';
    const filtered = window.EXAMPLE_SKETCHES.filter(ex => {
      if (q && !(`${ex.name} ${ex.desc} ${(ex.tags || []).join(' ')}`).toLowerCase().includes(q)) return false;
      if (filter === 'all') return true;
      if (filter === 'display') return (ex.tags || []).some(t => t.includes('lcd') || t.includes('oled') || t === 'display');
      if (filter === 'sensor') return (ex.tags || []).some(t => ['sensor', 'dht11', 'ultrasonic', 'analog'].includes(t));
      return (ex.tags || []).includes(filter);
    });

    const empty = document.getElementById('examples-empty');
    if (empty) empty.classList.toggle('hidden', filtered.length > 0);

    container.innerHTML = '';
    for (const example of filtered) {
      const item = document.createElement('button');
      item.className = 'example-item';
      item.type = 'button';
      const thumb = window.CircuitThumbnail?.render(example.circuit, 260, 150);
      item.innerHTML = `
        <div class="example-thumb">${thumb ? `<img src="${thumb}" alt="" loading="lazy">` : `<span class="example-thumb-icon">${example.icon || '📄'}</span>`}</div>
        <div class="example-info">
          <strong>${this._escHtml(example.name)}</strong>
          <span class="example-desc">${this._escHtml(example.desc)}</span>
          <div class="example-tags">${(example.tags || []).map(t => `<span class="tag">${this._escHtml(t)}</span>`).join('')}</div>
        </div>`;
      item.addEventListener('click', () => {
        this._setProjectName(example.name);
        if (this.editor) this.editor.setCode(example.code || '');
        if (example.circuit && this.canvas) this._loadExampleCircuit(example.circuit);
        this._closeModal();
        this.showToast(`${example.name} loaded`, 'success');
      });
      container.appendChild(item);
    }
  }

  _escHtml(s) {
    return String(s == null ? '' : s).replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
  }

  /* Load a built-in example by its id (used by the guide tutorials). */
  loadExampleById(id) {
    const ex = (window.EXAMPLE_SKETCHES || []).find(x => x.id === id);
    if (!ex) { this.showToast(`Example "${id}" not found`, 'error'); return; }
    this._setProjectName(ex.name);
    if (this.editor) this.editor.setCode(ex.code || '');
    if (ex.circuit && this.canvas) this._loadExampleCircuit(ex.circuit);
    this.showToast(`${ex.name} loaded`, 'success');
  }

  _loadExampleCircuit(key) {
    if (!this.canvas) return;

    // Data-driven circuit (serialized project data) — most examples use this
    if (key && typeof key === 'object' && Array.isArray(key.components)) {
      this.canvas.deserialize(key);
      this._syncBoardFromCanvas();
      this._refreshCanvasSummary();
      return;
    }

    // Legacy named circuits (hardcoded builders)
    const lower = String(key || '').toLowerCase();
    if (lower === 'led_on_13' || lower === 'blink') {
      this.canvas.clearCanvas();
      const boardType = this.sim.board === 'esp32_devkit_v1' ? 'esp32_devkit_v1' : 'arduino_uno';
      const board = this.canvas.addComponent(boardType, 200, 100);
      const led   = this.canvas.addComponent('led', 120, 280);
      const res   = this.canvas.addComponent('resistor', 120, 360);
      if (board && led && res) {
        this.canvas.addWire(board.id, 'D13', led.id, 'anode');
        this.canvas.addWire(led.id, 'cathode', res.id, 'p1');
        this.canvas.addWire(res.id, 'p2', board.id, 'GND1');
      }
      this._syncBoardFromCanvas();
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

    const def = (window.ArduinoComponents && window.ArduinoComponents.COMPONENT_DEFS[comp.type]);
    const g = (window.GuideManagerData && window.GuideManagerData.GUIDE_COMPONENTS[comp.type]) || {};
    if (title) title.textContent = `${def ? def.name : comp.type} Properties`;

    const esc = this._escHtml;
    const pinDescs = g.pins || {};

    // Description header block
    const infoBlock = document.createElement('div');
    infoBlock.className = 'props-info';
    const pinsPreview = (def && def.pins && def.pins.length)
      ? def.pins.map(p => {
          const pinInfo = pinDescs[p.id] || {};
          const label = pinInfo.label || p.label || p.id;
          const tip = pinInfo.desc || '';
          const typeMap = { digital: 'Digital', analog: 'Analog', power: 'Power', gnd: 'GND', pwm: 'PWM', signal: 'Signal' };
          return `<span class="props-pin" title="${esc(tip)}"><code>${esc(label)}</code><i>${esc(typeMap[p.type] || p.type)}</i></span>`;
        }).join('')
      : '';
    infoBlock.innerHTML = `
      <div class="props-desc">
        <span class="props-comp-icon">${def ? def.icon : '🔧'}</span>
        <div>
          <p class="props-desc-text">${esc(g.longDesc || def?.desc || '')}</p>
          <button type="button" class="gh-btn gh-btn-ghost gh-btn-sm props-ref-btn">Open full reference →</button>
        </div>
      </div>
      ${pinsPreview ? `<div class="props-pins"><span class="props-pins-label">Pins</span><div class="props-pins-list">${pinsPreview}</div></div>` : ''}
      <div class="props-hr"></div>
      <p class="props-editable-label">Editable properties</p>`;
    body.innerHTML = '';
    body.appendChild(infoBlock);

    const rows = [];
    Object.entries(comp.props || {}).forEach(([key, value]) => {
      const row   = document.createElement('div');
      row.className = 'prop-row';
      const label = document.createElement('label');
      const propDoc = (g.props && g.props[key]) || '';
      label.textContent = key.replace(/_/g, ' ');
      label.className = 'prop-label';
      label.htmlFor = `prop-${key}`;
      if (propDoc) label.title = propDoc;
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

    rows.forEach(row => body.appendChild(row));

    const refBtn = body.querySelector('.props-ref-btn');
    if (refBtn) refBtn.addEventListener('click', () => {
      this._closeModal();
      window.GuideManager?._renderCompDetail?.(
        document.getElementById('guide-pane-components'),
        comp.type
      );
      window.GuideManager?.open('components');
    });

    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
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
