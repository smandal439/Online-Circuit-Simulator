/* ═══════════════════════════════════════════════════════
   storage.js — Save / Load / Share
   ═══════════════════════════════════════════════════════ */

'use strict';

const StorageManager = {
  VERSION: '1.0',
  LS_KEY: 'ardusim_project',
  LS_SETTINGS_KEY: 'ardusim_settings',

  /* Save project to JSON file */
  saveToFile(code, circuitData) {
    const project = {
      version:  this.VERSION,
      savedAt:  new Date().toISOString(),
      name:     'ArduSim Project',
      code,
      circuit:  circuitData,
    };
    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `ardusim_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Project saved!', 'success');
  },

  /* Load project from file */
  loadFromFile(callback) {
    const input = document.getElementById('file-input');
    if (!input) return;
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const project = JSON.parse(ev.target.result);
          if (!project.code) throw new Error('Invalid project file');
          callback(project);
          this.showToast('Project loaded!', 'success');
        } catch (err) {
          this.showToast('Failed to load project: ' + err.message, 'error');
        }
      };
      reader.readAsText(file);
      input.value = '';
    };
    input.click();
  },

  /* Save to localStorage (auto-save) */
  autoSave(code, circuitData) {
    try {
      const project = { version: this.VERSION, code, circuit: circuitData, savedAt: Date.now() };
      localStorage.setItem(this.LS_KEY, JSON.stringify(project));
    } catch (e) {}
  },

  /* Load from localStorage */
  autoLoad() {
    try {
      const raw = localStorage.getItem(this.LS_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  },

  /* Share via URL */
  shareUrl(code, circuitData) {
    try {
      const data = JSON.stringify({ code, circuit: circuitData });
      const compressed = btoa(encodeURIComponent(data));
      const url = `${window.location.origin}${window.location.pathname}?project=${compressed}`;
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

  /* Load from URL */
  loadFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('project');
    if (!encoded) return null;
    try {
      const raw = decodeURIComponent(atob(encoded));
      return JSON.parse(raw);
    } catch (e) { return null; }
  },

  /* Save settings */
  saveSettings(settings) {
    try {
      localStorage.setItem(this.LS_SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {}
  },

  /* Load settings */
  loadSettings() {
    try {
      const raw = localStorage.getItem(this.LS_SETTINGS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },

  _fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    this.showToast('Share URL copied!', 'success');
  },

  showToast(msg, type = 'info') {
    if (window.App) window.App.showToast(msg, type);
  }
};

window.StorageManager = StorageManager;
