/* ═══════════════════════════════════════════════════════
   storage.js — Save / Load / Share / Auto-save
   ═══════════════════════════════════════════════════════ */

'use strict';

const StorageManager = {
  VERSION: '1.1',
  LS_KEY: 'ardusim_project',
  LS_SETTINGS_KEY: 'ardusim_settings',

  _lastSavedAt: null,
  _isDirty: false,

  /* ── Mark project as dirty (unsaved) ── */
  markDirty() {
    this._isDirty = true;
    this._updateDirtyIndicator();
  },

  markClean() {
    this._isDirty = false;
    this._updateDirtyIndicator();
  },

  isDirty() {
    return this._isDirty;
  },

  _updateDirtyIndicator() {
    const dot = document.getElementById('unsaved-dot');
    if (dot) dot.classList.toggle('hidden', !this._isDirty);
  },

  /* ── Version migration ── */
  _migrateProject(project) {
    if (!project || typeof project !== 'object') return null;
    // v1.0 → v1.1: ensure circuit has components and wires arrays
    if (!project.circuit || typeof project.circuit !== 'object') project.circuit = { components: [], wires: [] };
    if (!Array.isArray(project.circuit.components)) project.circuit.components = [];
    if (!Array.isArray(project.circuit.wires)) project.circuit.wires = [];
    if (typeof project.code !== 'string') project.code = '';
    if (typeof project.name !== 'string' || !project.name.trim()) project.name = 'Untitled Project';
    project.version = this.VERSION;
    return project;
  },

  /* ── Save project to JSON file ── */
  saveToFile(code, circuitData, projectName = 'ArduSim Project') {
    const project = {
      version:  this.VERSION,
      savedAt:  new Date().toISOString(),
      name:     projectName,
      code,
      circuit:  circuitData,
    };
    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    const safeName = projectName.replace(/[^a-z0-9_\-]/gi, '_').toLowerCase();
    a.download = `${safeName}_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this._lastSavedAt = Date.now();
    this.markClean();
    this.showToast('Project saved!', 'success');
  },

  /* ── Load project from file ── */
  loadFromFile(callback) {
    const input = document.getElementById('file-input');
    if (!input) return;
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const raw = JSON.parse(ev.target.result);
          const project = this._migrateProject(raw);
          if (!project) throw new Error('Invalid project file');
          callback(project);
          this._lastSavedAt = Date.now();
          this.markClean();
          this.showToast(`"${project.name}" loaded!`, 'success');
        } catch (err) {
          this.showToast('Failed to load project: ' + err.message, 'error');
        }
      };
      reader.onerror = () => this.showToast('Could not read file', 'error');
      reader.readAsText(file);
      input.value = '';
    };
    input.click();
  },

  /* ── Save to localStorage (auto-save) ── */
  autoSave(code, circuitData, projectName = 'Untitled Project') {
    try {
      const project = {
        version:   this.VERSION,
        code,
        circuit:   circuitData,
        name:      projectName,
        savedAt:   Date.now(),
      };
      const json = JSON.stringify(project);
      localStorage.setItem(this.LS_KEY, json);
      this._lastSavedAt = Date.now();
      this.markClean();
      this._updateAutoSaveStatus();
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        this.showToast('Auto-save failed: browser storage is full. Please save your project to a file.', 'error');
      }
      // Silently ignore other errors
    }
  },

  _updateAutoSaveStatus() {
    const el = document.getElementById('autosave-status');
    if (!el || !this._lastSavedAt) return;
    const d = new Date(this._lastSavedAt);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    el.textContent = `Auto-saved ${hh}:${mm}:${ss}`;
    el.title = `Last auto-saved at ${d.toLocaleString()}`;
  },

  /* ── Load from localStorage ── */
  autoLoad() {
    try {
      const raw = localStorage.getItem(this.LS_KEY);
      if (!raw) return null;
      const project = JSON.parse(raw);
      return this._migrateProject(project);
    } catch (e) { return null; }
  },

  /* ── Share via URL ── */
  shareUrl(code, circuitData) {
    try {
      const data = JSON.stringify({ code, circuit: circuitData });
      // Use btoa with URI encoding for unicode safety
      const compressed = btoa(unescape(encodeURIComponent(data)));
      const url = `${window.location.origin}${window.location.pathname}?project=${compressed}`;
      if (url.length > 8000) {
        this.showToast('Project too large to share via URL. Please use the Save file option.', 'warn');
        return;
      }
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url)
          .then(() => this.showToast('Share URL copied to clipboard!', 'success'))
          .catch(() => this._fallbackCopy(url));
      } else {
        this._fallbackCopy(url);
      }
    } catch (e) {
      this.showToast('Failed to generate share URL', 'error');
    }
  },

  /* ── Load from URL ── */
  loadFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('project');
    if (!encoded) return null;
    try {
      const raw = decodeURIComponent(escape(atob(encoded)));
      const project = JSON.parse(raw);
      return this._migrateProject(project);
    } catch (e) { return null; }
  },

  /* ── Save settings ── */
  saveSettings(settings) {
    try {
      localStorage.setItem(this.LS_SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {}
  },

  /* ── Load settings ── */
  loadSettings() {
    try {
      const raw = localStorage.getItem(this.LS_SETTINGS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },

  _fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    this.showToast('Share URL copied!', 'success');
  },

  showToast(msg, type = 'info') {
    if (window.App) window.App.showToast(msg, type);
  },
};

window.StorageManager = StorageManager;
