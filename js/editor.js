/* ═══════════════════════════════════════════════════════
   editor.js — Monaco Editor Integration (with Hash Sharing)
   ═══════════════════════════════════════════════════════ */

'use strict';

const EditorManager = {
  editor: null,
  monacoReady: false,

  DEFAULT_CODE: `/*
 * ArduSim — Arduino Online Simulator
 * Write your Arduino sketch below.
 * Click "Run" to start the simulation.
 *
 * Add components to the canvas on the right,
 * then connect their pins with wires.
 */

// Built-in LED pin
int ledPin = 13;

void setup() {
  // Run once at startup
  pinMode(ledPin, OUTPUT);
  Serial.begin(9600);
  Serial.println("ArduSim Ready!");
}

void loop() {
  // Runs repeatedly
  digitalWrite(ledPin, HIGH);
  Serial.println("LED ON");
  delay(1000);

  digitalWrite(ledPin, LOW);
  Serial.println("LED OFF");
  delay(1000);
}`,

  init() {
    if (typeof require === 'undefined') {
      console.error('Monaco loader not available');
      this._initFallback();
      return;
    }

    require(['vs/editor/editor.main'], () => {
      this._registerArduinoLanguage();
      this._createEditor();
      this.monacoReady = true;

      // Auto-load project from URL Hash if present
      const hashLoaded = this.loadFromUrlHash();

      if (window.App) window.App.onEditorReady(hashLoaded);
    }, (err) => {
      // Monaco failed to load (CDN blocked, offline, or config issue) — fall back to a
      // plain textarea so the editor always has content and examples still load code.
      console.error('Monaco failed to load, falling back to plain text editor:', err);
      this._initFallback();
    });
  },

  _registerArduinoLanguage() {
    monaco.languages.register({ id: 'arduino' });

    monaco.languages.setMonarchTokensProvider('arduino', {
      keywords: [
        'void', 'int', 'long', 'float', 'double', 'byte', 'boolean', 'bool',
        'char', 'String', 'unsigned', 'const', 'return', 'if', 'else',
        'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
        'struct', 'class', 'new', 'delete', 'true', 'false',
        'uint8_t', 'uint16_t', 'uint32_t', 'int8_t', 'int16_t', 'int32_t',
        'volatile', 'static', 'extern', 'inline',
      ],
      arduino_constants: [
        'HIGH', 'LOW', 'INPUT', 'OUTPUT', 'INPUT_PULLUP', 'LED_BUILTIN',
        'A0', 'A1', 'A2', 'A3', 'A4', 'A5',
        'D2', 'D4', 'D12', 'D13', 'D14', 'D15', 'D18', 'D19', 'D21', 'D22', 'D23', 'D25', 'D26', 'D27', 'D32', 'D33',
        'PI', 'TWO_PI', 'HALF_PI', 'DEG_TO_RAD', 'RAD_TO_DEG',
        'RISING', 'FALLING', 'CHANGE',
        'HEX', 'DEC', 'OCT', 'BIN',
      ],
      arduino_functions: [
        'setup', 'loop',
        'pinMode', 'digitalWrite', 'digitalRead', 'analogWrite', 'analogRead',
        'delay', 'delayMicroseconds', 'millis', 'micros',
        'tone', 'noTone', 'pulseIn',
        'attachInterrupt', 'detachInterrupt',
        'map', 'constrain', 'random', 'randomSeed',
        'abs', 'min', 'max', 'sqrt', 'pow', 'sin', 'cos', 'tan',
        'ledcSetup', 'ledcAttachPin', 'ledcWrite', 'hallRead', 'touchRead', 'analogReadMilliVolts',
        'Serial', 'Servo', 'LiquidCrystal', 'Wire',
      ],
      tokenizer: {
        root: [
          [/\/\/.*$/, 'comment'],
          [/\/\*/, 'comment', '@block_comment'],
          [/#[^\n]*/, 'preprocessor'],
          [/"([^"\\]|\\.)*"/, 'string'],
          [/'([^'\\]|\\.)*'/, 'string'],
          [/\b\d+\.?\d*[fF]?\b/, 'number'],
          [/\b0x[0-9a-fA-F]+\b/, 'number.hex'],
          [/\b0b[01]+\b/, 'number.binary'],
          [/\b(HIGH|LOW|INPUT|OUTPUT|INPUT_PULLUP|LED_BUILTIN|A[0-5]|D\d+|HEX|DEC|OCT|BIN|RISING|FALLING|CHANGE|PI|TWO_PI|HALF_PI)\b/, 'constant'],
          [/\b(void|int|long|float|double|byte|boolean|bool|char|String|unsigned|const|return|if|else|for|while|do|switch|case|break|continue|true|false|static|volatile|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t)\b/, 'keyword'],
          [/\b(setup|loop|pinMode|digitalWrite|digitalRead|analogWrite|analogRead|delay|delayMicroseconds|millis|micros|tone|noTone|pulseIn|map|constrain|random|randomSeed|ledcSetup|ledcAttachPin|ledcWrite|hallRead|touchRead|analogReadMilliVolts|Serial|Servo|LiquidCrystal|Wire)\b/, 'arduino-api'],
          [/[a-zA-Z_]\w*/, 'identifier'],
        ],
        block_comment: [
          [/[^/*]+/, 'comment'],
          [/\*\//, 'comment', '@pop'],
          [/[/*]/, 'comment'],
        ],
      }
    });

    monaco.languages.setLanguageConfiguration('arduino', {
      comments: { lineComment: '//', blockComment: ['/*', '*/'] },
      brackets: [['(', ')'], ['{', '}'], ['[', ']']],
      autoClosingPairs: [
        { open: '(', close: ')' }, { open: '{', close: '}' },
        { open: '[', close: ']' }, { open: '"', close: '"' },
        { open: "'", close: "'" },
      ],
      indentationRules: {
        increaseIndentPattern: /.*\{[^}"']*$/,
        decreaseIndentPattern: /^\s*\}/,
      },
    });

    // Register completions
    monaco.languages.registerCompletionItemProvider('arduino', {
      provideCompletionItems(model, position) {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const snippets = [
          {
            label: 'setup', kind: monaco.languages.CompletionItemKind.Snippet, insertTextRules: 4,
            insertText: 'void setup() {\n\t${1:// setup code}\n}', documentation: 'Setup function — runs once at start'
          },
          {
            label: 'loop', kind: monaco.languages.CompletionItemKind.Snippet, insertTextRules: 4,
            insertText: 'void loop() {\n\t${1:// loop code}\n}', documentation: 'Loop function — runs repeatedly'
          },
          {
            label: 'for', kind: monaco.languages.CompletionItemKind.Snippet, insertTextRules: 4,
            insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:10}; ${1:i}++) {\n\t${3}\n}'
          },
          {
            label: 'if', kind: monaco.languages.CompletionItemKind.Snippet, insertTextRules: 4,
            insertText: 'if (${1:condition}) {\n\t${2}\n}'
          },
          { label: 'Serial.begin', kind: monaco.languages.CompletionItemKind.Function, insertTextRules: 4, insertText: 'Serial.begin(${1:9600});' },
          { label: 'Serial.println', kind: monaco.languages.CompletionItemKind.Function, insertTextRules: 4, insertText: 'Serial.println(${1:value});' },
          { label: 'pinMode', kind: monaco.languages.CompletionItemKind.Function, insertTextRules: 4, insertText: 'pinMode(${1:pin}, ${2:OUTPUT});' },
          { label: 'digitalWrite', kind: monaco.languages.CompletionItemKind.Function, insertTextRules: 4, insertText: 'digitalWrite(${1:pin}, ${2:HIGH});' },
          { label: 'digitalRead', kind: monaco.languages.CompletionItemKind.Function, insertTextRules: 4, insertText: 'digitalRead(${1:pin})' },
          { label: 'analogWrite', kind: monaco.languages.CompletionItemKind.Function, insertTextRules: 4, insertText: 'analogWrite(${1:pin}, ${2:value});' },
          { label: 'analogRead', kind: monaco.languages.CompletionItemKind.Function, insertTextRules: 4, insertText: 'analogRead(${1:pin})' },
          { label: 'delay', kind: monaco.languages.CompletionItemKind.Function, insertTextRules: 4, insertText: 'delay(${1:1000});' },
          { label: 'ledcSetup', kind: monaco.languages.CompletionItemKind.Function, insertTextRules: 4, insertText: 'ledcSetup(${1:channel}, ${2:freq}, ${3:resolution});' },
          { label: 'ledcAttachPin', kind: monaco.languages.CompletionItemKind.Function, insertTextRules: 4, insertText: 'ledcAttachPin(${1:pin}, ${2:channel});' },
          { label: 'ledcWrite', kind: monaco.languages.CompletionItemKind.Function, insertTextRules: 4, insertText: 'ledcWrite(${1:channel}, ${2:duty});' },
        ];

        return { suggestions: snippets.map(s => ({ ...s, range })) };
      }
    });

    // Dark Theme
    monaco.editor.defineTheme('arduino-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '5a6676', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'cc99cd' },
        { token: 'constant', foreground: 'f7c948' },
        { token: 'string', foreground: '7ec699' },
        { token: 'number', foreground: 'f08d49' },
        { token: 'preprocessor', foreground: 'cc9966' },
        { token: 'arduino-api', foreground: '6fb3d2', fontStyle: 'bold' },
        { token: 'identifier', foreground: 'e6edf3' },
      ],
      colors: {
        'editor.background': '#0d1117',
        'editor.foreground': '#e6edf3',
        'editor.lineHighlightBackground': '#161b22',
        'editorCursor.foreground': '#00979c',
        'editor.selectionBackground': '#264f78',
        'editorLineNumber.foreground': '#484f58',
      }
    });
  },

  // _createEditor() {
  //   const container = document.getElementById('editor-container');
  //   if (!container) return;

  //   this.editor = monaco.editor.create(container, {
  //     value: this.DEFAULT_CODE,
  //     language: 'arduino',
  //     theme: 'arduino-dark',
  //     fontSize: 18,
  //     fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
  //     fontLigatures: true,
  //     lineNumbers: 'on',
  //     minimap: { enabled: true, scale: 0.8 },
  //     scrollBeyondLastLine: false,
  //     automaticLayout: true,
  //     folding: true,
  //     tabSize: 2,
  //     insertSpaces: true,
  //   });

  _createEditor() {
    const container = document.getElementById('editor-container');
    if (!container) return;

    this.editor = monaco.editor.create(container, {
      value: this.DEFAULT_CODE,
      language: 'arduino',
      theme: 'arduino-dark',
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      fontLigatures: true,
      lineNumbers: 'on',
      minimap: { enabled: true, scale: 0.8 },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      folding: true,
      tabSize: 2,
      insertSpaces: true,
      mouseWheelZoom: true, // <--- Add this line
    });

    container.addEventListener('wheel', (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const currentSize = this.editor.getOption(monaco.editor.EditorOption.fontSize);
        const newSize = e.deltaY < 0 ? currentSize + 1 : currentSize - 1;
        const clampedSize = Math.max(8, Math.min(32, newSize)); // Min: 8px, Max: 32px
        this.editor.updateOptions({ fontSize: clampedSize });
      }
    }, { passive: false });

    // Cursor position display
    this.editor.onDidChangeCursorPosition(e => {
      const pos = document.getElementById('editor-cursor');
      if (pos) pos.textContent = `Ln ${e.position.lineNumber}, Col ${e.position.column}`;
    });

    // Auto-save on change (debounced)
    this.editor.onDidChangeModelContent(() => {
      if (window.StorageManager) window.StorageManager.markDirty();
      clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(() => {
        if (window.CircuitCanvas && window.StorageManager && window.App) {
          const projectName = window.App.getProjectName ? window.App.getProjectName() : 'Untitled Project';
          window.StorageManager.autoSave(this.getCode(), window.CircuitCanvas.serialize(), projectName);
        }
      }, 2000);
    });

    // Keyboard Shortcuts
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyR, () => {
      if (window.App) window.App.run();
    });
    this.editor.addCommand(monaco.KeyCode.F5, () => {
      if (window.App) window.App.run();
    });
    this.editor.addCommand(monaco.KeyCode.F6, () => {
      if (window.App) window.App.stop();
    });
    // Copy Shareable URL Shortcut (Ctrl+Shift+S)
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS, async () => {
      const shareUrl = this.getShareableUrl();
      if (shareUrl) {
        await navigator.clipboard.writeText(shareUrl);
        if (window.App && window.App.showToast) {
          window.App.showToast("Shareable project URL copied to clipboard!");
        } else {
          alert("Shareable project URL copied to clipboard!");
        }
      }
    });
  },

  _initFallback() {
    const container = document.getElementById('editor-container');
    if (!container) return;
    const ta = document.createElement('textarea');
    ta.value = this.DEFAULT_CODE;
    ta.style.cssText = `width:100%;height:100%;background:#0d1117;color:#e6edf3;font-family:'JetBrains Mono',monospace;font-size:13px;padding:12px;border:none;outline:none;resize:none;`;
    container.appendChild(ta);
    this._fallbackTA = ta;
    if (window.App) window.App.onEditorReady(this.loadFromUrlHash());
  },

  getCode() {
    if (this.editor) return this.editor.getValue();
    if (this._fallbackTA) return this._fallbackTA.value;
    return '';
  },

  setCode(code) {
    if (this.editor) {
      this.editor.setValue(code);
      this.editor.revealLine(1);
    } else if (this._fallbackTA) {
      this._fallbackTA.value = code;
    }
  },

  /**
   * Serializes current Monaco code and Canvas circuit state into a URL hash string
   */
  getShareableUrl() {
    const circuitData = window.CircuitCanvas ? window.CircuitCanvas.serialize() : null;
    const payload = {
      v: 1,
      code: this.getCode(),
      circuit: circuitData
    };

    try {
      const jsonString = JSON.stringify(payload);
      const encoded = btoa(encodeURIComponent(jsonString).replace(/%([0-9A-F]{2})/g,
        (_, p1) => String.fromCharCode('0x' + p1)
      ));
      return `${window.location.origin}${window.location.pathname}#project=${encoded}`;
    } catch (err) {
      console.error("Failed to generate share URL:", err);
      return null;
    }
  },

  /**
   * Checks window.location.hash for encoded project data and restores it
   * @returns {boolean} True if a project was restored from URL
   */
  loadFromUrlHash() {
    const hash = window.location.hash;
    if (!hash.includes('#project=')) return false;

    try {
      const base64Data = hash.split('#project=')[1];
      const jsonString = decodeURIComponent(
        Array.prototype.map.call(atob(base64Data), c =>
          '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join('')
      );

      const payload = JSON.parse(jsonString);

      if (payload.code) {
        this.setCode(payload.code);
      }

      if (payload.circuit && window.CircuitCanvas && window.CircuitCanvas.deserialize) {
        window.CircuitCanvas.deserialize(payload.circuit);
      }

      console.log("ArduSim project successfully restored from URL hash.");
      return true;
    } catch (err) {
      console.error("Failed to parse project from URL hash:", err);
      return false;
    }
  },

  setTheme(dark) {
    if (this.editor) {
      monaco.editor.setTheme(dark ? 'arduino-dark' : 'arduino-light');
    }
  },

  formatCode() {
    if (this.editor) {
      this.editor.getAction('editor.action.formatDocument')?.run();
    }
  },

  showError(line, msg) {
    if (!this.editor) return;
    const model = this.editor.getModel();
    monaco.editor.setModelMarkers(model, 'ardusim', [{
      severity: monaco.MarkerSeverity.Error,
      startLineNumber: line || 1,
      startColumn: 1,
      endLineNumber: line || 1,
      endColumn: 100,
      message: msg,
    }]);
    const el = document.getElementById('editor-errors');
    if (el) el.textContent = `⛔ ${msg}`;
  },

  clearErrors() {
    if (!this.editor) return;
    const model = this.editor.getModel();
    if (model) monaco.editor.setModelMarkers(model, 'ardusim', []);
    const el = document.getElementById('editor-errors');
    if (el) el.textContent = '';
  },
};

window.EditorManager = EditorManager;