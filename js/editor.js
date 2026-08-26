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
    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    if (isMobile) {
      this._initMobileEditor();
      return;
    }

    if (typeof require !== 'function' || typeof require.config !== 'function') {
      console.error('Monaco loader not available');
      this._initFallback();
      return;
    }

    require(['vs/editor/editor.main'], () => {
      this._registerArduinoLanguage();
      this._createEditor();
      this.monacoReady = true;

      const hashLoaded = this.loadFromUrlHash();
      this.loadSavedTheme();
      this._listenSystemThemeChanges();

      if (window.App) window.App.onEditorReady(hashLoaded);
    }, (err) => {
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
            insertText: 'void setup() {\n\t${1:// Put your setup code here, to run once when the board starts:}\n}', documentation: 'Setup function — runs once at start'
          },
          {
            label: 'loop', kind: monaco.languages.CompletionItemKind.Snippet, insertTextRules: 4,
            insertText: 'void loop() {\n\t${1:// Put your main code here, to run repeatedly indefinitely:}\n}', documentation: 'Loop function — runs repeatedly'
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

    // Custom formatter for Arduino language
    this._registerArduinoFormatter();

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

    // Light Theme
    monaco.editor.defineTheme('arduino-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6a7b8c', fontStyle: 'italic' },
        { token: 'keyword', foreground: '9b59b6' },
        { token: 'constant', foreground: 'e67e22' },
        { token: 'string', foreground: '27ae60' },
        { token: 'number', foreground: 'd35400' },
        { token: 'preprocessor', foreground: '8e44ad' },
        { token: 'arduino-api', foreground: '2980b9', fontStyle: 'bold' },
        { token: 'identifier', foreground: '2c3e50' },
      ],
      colors: {
        'editor.background': '#fafbfc',
        'editor.foreground': '#2c3e50',
        'editor.lineHighlightBackground': '#f0f2f5',
        'editorCursor.foreground': '#00979c',
        'editor.selectionBackground': '#c8d6e5',
        'editorLineNumber.foreground': '#8395a7',
        'editor.overviewRulerBorder': '#e1e4e8',
        'editorGutter.background': '#fafbfc',
      }
    });
  },

  /**
   * Register custom formatter for Arduino language
   * This provides Format Document and Format Selection functionality
   */
  _registerArduinoFormatter() {
    // Simple Arduino code formatter
    const formatArduinoCode = (code, options = {}) => {
      const tabSize = options.tabSize || 2;
      const insertSpaces = options.insertSpaces !== false;
      const indent = insertSpaces ? ' '.repeat(tabSize) : '\t';
      
      let lines = code.split('\n');
      let formattedLines = [];
      let indentLevel = 0;
      let inBlockComment = false;
      
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        let trimmed = line.trim();
        
        // Skip empty lines
        if (trimmed === '') {
          formattedLines.push('');
          continue;
        }
        
        // Skip preprocessor directives and comments (keep them at start of line)
        if (trimmed.startsWith('#') || trimmed.startsWith('//')) {
          formattedLines.push(trimmed);
          continue;
        }
        
        // Handle block comments
        if (trimmed.startsWith('/*')) {
          inBlockComment = true;
          formattedLines.push(trimmed);
          continue;
        }
        if (trimmed.endsWith('*/')) {
          inBlockComment = false;
          formattedLines.push(trimmed);
          continue;
        }
        if (inBlockComment) {
          formattedLines.push(trimmed);
          continue;
        }
        
        // Calculate indentation level
        let currentIndent = indentLevel;
        
        // Decrease indent for closing braces
        if (trimmed.startsWith('}')) {
          currentIndent = Math.max(0, indentLevel - 1);
        }
        
        // Apply indentation
        let formattedLine = indent.repeat(currentIndent) + trimmed;
        
        // Handle multi-line statements
        if (trimmed.includes('{') && !trimmed.includes('}')) {
          indentLevel++;
        }
        if (trimmed.includes('}') && !trimmed.includes('{')) {
          indentLevel = Math.max(0, indentLevel - 1);
        }
        if (trimmed.includes('{') && trimmed.includes('}')) {
          // Same line opening and closing
        }
        
        formattedLines.push(formattedLine);
      }
      
      return formattedLines.join('\n');
    };

    // Register document formatter
    monaco.languages.registerDocumentFormattingEditProvider('arduino', {
      provideDocumentFormattingEdits(model, options) {
        const code = model.getValue();
        const formattedCode = formatArduinoCode(code, options);
        
        return [{
          range: model.getFullModelRange(),
          text: formattedCode
        }];
      }
    });

    // Register range formatter for selection formatting
    monaco.languages.registerDocumentRangeFormattingEditProvider('arduino', {
      provideDocumentRangeFormattingEdits(model, range, options) {
        const selectedCode = model.getValueInRange(range);
        const formattedCode = formatArduinoCode(selectedCode, options);
        
        return [{
          range: range,
          text: formattedCode
        }];
      }
    });
  },

  _createEditor() {
    const container = document.getElementById('editor-container');
    if (!container) return;

    this.editor = monaco.editor.create(container, {
      value: this.DEFAULT_CODE,
      language: 'arduino',
      theme: 'arduino-dark',
      fontSize: 15,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      fontLigatures: true,
      lineNumbers: 'on',
      minimap: { enabled: true, scale: 0.8 },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      folding: true,
      tabSize: 2,
      insertSpaces: true,
      mouseWheelZoom: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      smoothScrolling: true,
    });

    container.addEventListener('wheel', (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const currentSize = this.editor.getOption(monaco.editor.EditorOption.fontSize);
        const newSize = e.deltaY < 0 ? currentSize + 1 : currentSize - 1;
        const clampedSize = Math.max(8, Math.min(32, newSize));
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
    
    // Format Document Shortcut (Shift+Alt+F)
    this.editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => {
      this.formatCode(false);
    });
    
    // Format Selection Shortcut (Ctrl+K Ctrl+F)
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
      // This is a two-part shortcut, handled differently
      this._formatSelectionShortcut();
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
    
    // Theme Toggle Shortcut (Ctrl+Shift+T)
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyT, () => {
      this.toggleTheme();
      const theme = this.editor._themeService?._theme?.themeName || 'arduino-dark';
      if (window.App && window.App.showToast) {
        window.App.showToast(`Theme switched to ${theme.replace('arduino-', '')} mode`);
      }
    });
  },

  /**
   * Handle the Ctrl+K Ctrl+F format selection shortcut
   */
  _formatSelectionShortcut() {
    // This is called when Ctrl+K is pressed
    // We need to handle the next key press
    let formatListener = null;
    
    formatListener = this.editor.onKeyDown((e) => {
      if (e.keyCode === monaco.KeyCode.KeyF) {
        // Ctrl+K Ctrl+F detected - format selection
        this.formatCode(true);
        if (formatListener) formatListener.dispose();
      }
    });
    
    // Dispose listener after 2 seconds if not used
    setTimeout(() => {
      if (formatListener) formatListener.dispose();
    }, 2000);
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

  /* Mobile-optimized code editor using enhanced textarea with line numbers */
  _initMobileEditor() {
    const container = document.getElementById('editor-container');
    if (!container) return;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;width:100%;height:100%;overflow:hidden;background:#0d1117;';

    // Line numbers gutter
    const gutter = document.createElement('div');
    gutter.style.cssText = 'width:40px;padding:12px 4px 12px 8px;text-align:right;color:#484f58;font-family:"JetBrains Mono",monospace;font-size:13px;line-height:1.6;overflow:hidden;user-select:none;flex-shrink:0;background:#0d1117;border-right:1px solid #21262d;';
    gutter.id = 'mobile-line-numbers';

    // Code textarea
    const ta = document.createElement('textarea');
    ta.value = this.DEFAULT_CODE;
    ta.spellcheck = false;
    ta.autocomplete = 'off';
    ta.autocorrect = 'off';
    ta.autocapitalize = 'off';
    ta.style.cssText = `flex:1;width:100%;background:#0d1117;color:#e6edf3;font-family:'JetBrains Mono',monospace;font-size:14px;padding:12px;border:none;outline:none;resize:none;tab-size:2;white-space:pre;line-height:1.6;overflow:auto;-webkit-overflow-scrolling:touch;`;

    wrapper.appendChild(gutter);
    wrapper.appendChild(ta);
    container.appendChild(wrapper);

    this._fallbackTA = ta;

    // Update line numbers
    const updateLineNumbers = () => {
      const lines = ta.value.split('\n').length;
      gutter.innerHTML = Array.from({ length: lines }, (_, i) => `<div style="height:1.6em">${i + 1}</div>`).join('');
    };
    updateLineNumbers();

    ta.addEventListener('input', updateLineNumbers);
    ta.addEventListener('scroll', () => {
      gutter.scrollTop = ta.scrollTop;
    });

    // Handle Tab key for indentation
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        ta.value = ta.value.substring(0, start) + '  ' + ta.value.substring(end);
        ta.selectionStart = ta.selectionEnd = start + 2;
        updateLineNumbers();
      }
    });

    // Auto-save on change (debounced)
    ta.addEventListener('input', () => {
      if (window.StorageManager) window.StorageManager.markDirty();
      clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(() => {
        if (window.CircuitCanvas && window.StorageManager && window.App) {
          const projectName = window.App.getProjectName ? window.App.getProjectName() : 'Untitled Project';
          window.StorageManager.autoSave(this.getCode(), window.CircuitCanvas.serialize(), projectName);
        }
      }, 2000);
    });

    this.monacoReady = false;
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
   * Format code in the editor
   * @param {boolean} selectionOnly - If true, format only selected text
   */
  formatCode(selectionOnly = false) {
    if (!this.editor || !this.monacoReady) {
      if (window.App && window.App.showToast) {
        window.App.showToast('Editor not ready', 'warning');
      }
      return;
    }

    try {
      const action = selectionOnly ? 
        'editor.action.formatSelection' : 
        'editor.action.formatDocument';
      
      const actionObj = this.editor.getAction(action);
      
      if (actionObj) {
        actionObj.run().then(() => {
          if (window.App && window.App.showToast) {
            window.App.showToast(selectionOnly ? 'Selection formatted' : 'Document formatted');
          }
        }).catch((err) => {
          console.error('Formatting error:', err);
          if (window.App && window.App.showToast) {
            window.App.showToast('Formatting failed', 'error');
          }
        });
      } else {
        // Fallback: manually format using our custom formatter
        const model = this.editor.getModel();
        if (model) {
          const code = model.getValue();
          const formatted = this._formatArduinoCode(code);
          model.setValue(formatted);
          if (window.App && window.App.showToast) {
            window.App.showToast('Document formatted (manual)');
          }
        }
      }
    } catch (err) {
      console.error('Formatting error:', err);
      if (window.App && window.App.showToast) {
        window.App.showToast('Formatting failed', 'error');
      }
    }
  },

  /**
   * Simple Arduino code formatter (fallback)
   */
  _formatArduinoCode(code) {
    const lines = code.split('\n');
    const formatted = [];
    let indentLevel = 0;
    const indent = '  ';
    
    for (let line of lines) {
      const trimmed = line.trim();
      
      if (trimmed === '') {
        formatted.push('');
        continue;
      }
      
      if (trimmed.startsWith('#') || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        formatted.push(trimmed);
        continue;
      }
      
      if (trimmed.startsWith('}')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }
      
      formatted.push(indent.repeat(indentLevel) + trimmed);
      
      if (trimmed.endsWith('{') && !trimmed.includes('//')) {
        indentLevel++;
      }
      
      if (trimmed.endsWith('}') && !trimmed.includes('{')) {
        // Already handled above
      }
    }
    
    return formatted.join('\n');
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

  /**
   * Toggle between dark and light themes with smooth transition
   */
  toggleTheme() {
    if (!this.editor || !this.monacoReady) return;

    const currentTheme = this.editor._themeService?._theme?.themeName || 'arduino-dark';
    const newTheme = currentTheme === 'arduino-dark' ? 'arduino-light' : 'arduino-dark';
    
    this.editor.updateOptions({ 
      theme: newTheme,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on'
    });

    localStorage.setItem('ardusim-theme', newTheme);
    this.updateThemeButtonUI(newTheme);

    if (window.App && window.App.onThemeChange) {
      window.App.onThemeChange(newTheme);
    }

    return newTheme;
  },

  /**
   * Update the theme toggle button UI
   */
  updateThemeButtonUI(theme) {
    const btn = document.getElementById('btn-theme');
    if (!btn) return;

    if (theme === 'arduino-light') {
      btn.innerHTML = '🌙';
      btn.title = 'Switch to Dark Theme';
      btn.classList.add('light-mode');
      btn.classList.remove('dark-mode');
    } else {
      btn.innerHTML = '☀️';
      btn.title = 'Switch to Light Theme';
      btn.classList.add('dark-mode');
      btn.classList.remove('light-mode');
    }

    document.body.classList.toggle('light-theme', theme === 'arduino-light');
    document.body.classList.toggle('dark-theme', theme !== 'arduino-light');
  },

  /**
   * Load saved theme preference
   */
  loadSavedTheme() {
    if (!this.editor || !this.monacoReady) return;

    let savedTheme = localStorage.getItem('ardusim-theme');
    
    if (!savedTheme || savedTheme === 'dark') {
      savedTheme = 'arduino-dark';
    } else if (savedTheme === 'light') {
      savedTheme = 'arduino-light';
    } else if (savedTheme !== 'arduino-dark' && savedTheme !== 'arduino-light') {
      savedTheme = this.detectSystemTheme();
    }

    this.editor.updateOptions({ theme: savedTheme });
    localStorage.setItem('ardusim-theme', savedTheme);
    this.updateThemeButtonUI(savedTheme);
    
    return savedTheme;
  },

  /**
   * Detect system theme preference
   */
  detectSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'arduino-dark';
    } else {
      return 'arduino-light';
    }
  },

  /**
   * Listen for system theme changes
   */
  _listenSystemThemeChanges() {
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', (e) => {
        if (!localStorage.getItem('ardusim-theme')) {
          const newTheme = e.matches ? 'arduino-dark' : 'arduino-light';
          if (this.editor && this.monacoReady) {
            this.editor.updateOptions({ theme: newTheme });
            this.updateThemeButtonUI(newTheme);
          }
        }
      });
    }
  },

  setTheme(dark) {
    if (this.editor && this.monacoReady) {
      const theme = dark ? 'arduino-dark' : 'arduino-light';
      this.editor.updateOptions({ theme });
      localStorage.setItem('ardusim-theme', theme);
      this.updateThemeButtonUI(theme);
    }
  },

  /**
   * Get Monaco editor action by ID
   * @param {string} actionId - The action ID
   * @returns {monaco.editor.IActionDescriptor|null}
   */
  getAction(actionId) {
    if (!this.editor || !this.monacoReady) return null;
    return this.editor.getAction(actionId);
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

  /**
   * Clean up resources
   */
  dispose() {
    if (this.editor) {
      this.editor.dispose();
      this.editor = null;
    }
    if (this._fallbackTA) {
      this._fallbackTA.remove();
      this._fallbackTA = null;
    }
  }
};

window.EditorManager = EditorManager;