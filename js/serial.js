/* ═══════════════════════════════════════════════════════
   serial.js — Serial Monitor
   ═══════════════════════════════════════════════════════ */

'use strict';

class SerialMonitor {
  constructor() {
    this.outputEl   = document.getElementById('serial-output');
    this.inputEl    = document.getElementById('serial-input');
    this.sendBtn    = document.getElementById('btn-serial-send');
    this.clearBtn   = document.getElementById('btn-clear-serial');
    this.exportBtn  = document.getElementById('btn-export-serial');
    this.baudSel    = document.getElementById('serial-baud');
    this.eolSel     = document.getElementById('serial-eol');
    this.autoScroll = document.getElementById('serial-autoscroll');
    this.showTS     = document.getElementById('serial-timestamp');
    this.showHex    = document.getElementById('serial-show-hex');

    this.buffer = '';
    this.lineCount = 0;
    this.maxLines = 2000;
    this._pendingFlush = null;

    this._bind();
  }

  _bind() {
    this.sendBtn && this.sendBtn.addEventListener('click', () => this._sendInput());
    this.inputEl && this.inputEl.addEventListener('keydown', e => {
      if (e.key === 'Enter') this._sendInput();
    });
    this.clearBtn && this.clearBtn.addEventListener('click', () => this.clear());
    this.exportBtn && this.exportBtn.addEventListener('click', () => this._export());
  }

  receive(text, type = 'data') {
    this.buffer += text;
    // Buffer and flush on newline or after short delay
    if (!this._pendingFlush) {
      this._pendingFlush = setTimeout(() => {
        this._flush();
        this._pendingFlush = null;
      }, 16);
    }
    if (this.buffer.includes('\n')) {
      clearTimeout(this._pendingFlush);
      this._pendingFlush = null;
      this._flush();
    }
  }

  _flush() {
    if (!this.buffer || !this.outputEl) return;
    const lines = this.buffer.split('\n');
    this.buffer = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (i < lines.length - 1) {
        this._appendLine(line, 'data');
      } else if (line.length > 0) {
        // Partial line
        this._appendPartial(line, 'data');
      }
    }
  }

  _appendLine(text, type) {
    if (!this.outputEl) return;
    this.lineCount++;
    if (this.lineCount > this.maxLines) {
      // Remove oldest line
      const first = this.outputEl.firstChild;
      if (first) this.outputEl.removeChild(first);
    }

    const span = document.createElement('span');
    span.className = `serial-line ${type}`;

    let content = '';
    if (this.showTS && this.showTS.checked) {
      content += `<span class="serial-timestamp">${this._timestamp()}</span>`;
    }
    if (this.showHex && this.showHex.checked) {
      content += this._toHex(text) + '  ';
    }
    content += this._escapeHtml(text);

    span.innerHTML = content;
    this.outputEl.appendChild(span);
    this.outputEl.appendChild(document.createTextNode('\n'));

    if (this.autoScroll && this.autoScroll.checked) {
      this.outputEl.scrollTop = this.outputEl.scrollHeight;
    }
  }

  _appendPartial(text, type) {
    if (!this.outputEl) return;
    // Find last line element and append to it
    const last = this.outputEl.lastElementChild;
    if (last && last.classList.contains('serial-line') && !last.dataset.complete) {
      last.innerHTML += this._escapeHtml(text);
    } else {
      const span = document.createElement('span');
      span.className = `serial-line ${type}`;
      span.innerHTML = (this.showTS && this.showTS.checked ? `<span class="serial-timestamp">${this._timestamp()}</span>` : '') + this._escapeHtml(text);
      this.outputEl.appendChild(span);
    }
    if (this.autoScroll && this.autoScroll.checked) {
      this.outputEl.scrollTop = this.outputEl.scrollHeight;
    }
  }

  log(text, type = 'system') {
    this._appendLine(text, type);
  }

  clear() {
    if (this.outputEl) this.outputEl.innerHTML = '';
    this.lineCount = 0;
    this.buffer = '';
  }

  _sendInput() {
    if (!this.inputEl) return;
    const text = this.inputEl.value;
    if (!text) return;
    const eol = (this.eolSel && this.eolSel.value) || '\n';
    const toSend = text + eol;
    this.inputEl.value = '';

    // Echo in serial monitor
    this._appendLine(`> ${text}`, 'info');

    // Send to simulator
    if (window.ArduinoSim) {
      window.ArduinoSim.sendSerialInput(toSend);
    }
  }

  _export() {
    if (!this.outputEl) return;
    const text = this.outputEl.innerText;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `serial_log_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  _timestamp() {
    const now = new Date();
    return `[${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}.${String(now.getMilliseconds()).padStart(3,'0')}]`;
  }

  _toHex(str) {
    return Array.from(str).map(c => c.charCodeAt(0).toString(16).padStart(2,'0').toUpperCase()).join(' ');
  }

  _escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

window.SerialMonitor = null; // Set in app.js
window.SerialMonitorClass = SerialMonitor;
