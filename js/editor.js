/* ═══════════════════════════════════════════════════════
   editor.js — Monaco Editor Integration
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

      if (window.App) window.App.onEditorReady();
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
          [/\b(HIGH|LOW|INPUT|OUTPUT|INPUT_PULLUP|LED_BUILTIN|A[0-5]|HEX|DEC|OCT|BIN|RISING|FALLING|CHANGE|PI|TWO_PI|HALF_PI)\b/, 'constant'],
          [/\b(void|int|long|float|double|byte|boolean|bool|char|String|unsigned|const|return|if|else|for|while|do|switch|case|break|continue|true|false|static|volatile|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t)\b/, 'keyword'],
          [/\b(setup|loop|pinMode|digitalWrite|digitalRead|analogWrite|analogRead|delay|delayMicroseconds|millis|micros|tone|noTone|pulseIn|map|constrain|random|randomSeed|Serial|Servo|LiquidCrystal|Wire)\b/, 'arduino-api'],
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
          endLineNumber:   position.lineNumber,
          startColumn:     word.startColumn,
          endColumn:       word.endColumn,
        };

        const snippets = [
          // Setup/loop templates
          { label: 'setup', kind: monaco.languages.CompletionItemKind.Snippet, insertTextRules: 4,
            insertText: 'void setup() {\n\t${1:// setup code}\n}', documentation: 'Setup function — runs once at start' },
          { label: 'loop',  kind: monaco.languages.CompletionItemKind.Snippet, insertTextRules: 4,
            insertText: 'void loop() {\n\t${1:// loop code}\n}', documentation: 'Loop function — runs repeatedly' },
          // Control flow
          { label: 'for',   kind: monaco.languages.CompletionItemKind.Snippet, insertTextRules: 4,
            insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:10}; ${1:i}++) {\n\t${3}\n}' },
          { label: 'forin', kind: monaco.languages.CompletionItemKind.Snippet, insertTextRules: 4,
            insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:arr}.length; ${1:i}++) {\n\t${3}\n}',
            documentation: 'Iterate over array' },
          { label: 'if',    kind: monaco.languages.CompletionItemKind.Snippet, insertTextRules: 4,
            insertText: 'if (${1:condition}) {\n\t${2}\n}' },
          { label: 'ifelse', kind: monaco.languages.CompletionItemKind.Snippet, insertTextRules: 4,
            insertText: 'if (${1:condition}) {\n\t${2}\n} else {\n\t${3}\n}' },
          { label: 'while', kind: monaco.languages.CompletionItemKind.Snippet, insertTextRules: 4,
            insertText: 'while (${1:condition}) {\n\t${2}\n}' },
          { label: 'switch', kind: monaco.languages.CompletionItemKind.Snippet, insertTextRules: 4,
            insertText: 'switch (${1:variable}) {\n\tcase ${2:value}:\n\t\t${3}\n\t\tbreak;\n\tdefault:\n\t\tbreak;\n}' },
          // Arduino core
          { label: 'Serial.begin',    kind: 4, insertTextRules: 4, insertText: 'Serial.begin(${1:9600});',
            documentation: 'Initialize serial communication at the given baud rate' },
          { label: 'Serial.print',    kind: 4, insertTextRules: 4, insertText: 'Serial.print(${1:value});',
            documentation: 'Print data to serial monitor' },
          { label: 'Serial.println',  kind: 4, insertTextRules: 4, insertText: 'Serial.println(${1:value});',
            documentation: 'Print data to serial monitor with newline' },
          { label: 'Serial.read',     kind: 4, insertTextRules: 4, insertText: 'Serial.read()', documentation: 'Read incoming serial byte' },
          { label: 'Serial.available',kind: 4, insertTextRules: 4, insertText: 'Serial.available()', documentation: 'Get number of bytes available to read' },
          { label: 'pinMode',         kind: 4, insertTextRules: 4, insertText: 'pinMode(${1:pin}, ${2:OUTPUT});',
            documentation: 'Configure a pin as INPUT or OUTPUT' },
          { label: 'digitalWrite',    kind: 4, insertTextRules: 4, insertText: 'digitalWrite(${1:pin}, ${2:HIGH});',
            documentation: 'Write HIGH or LOW to a digital pin' },
          { label: 'digitalRead',     kind: 4, insertTextRules: 4, insertText: 'digitalRead(${1:pin})',
            documentation: 'Read the value from a digital pin' },
          { label: 'analogWrite',     kind: 4, insertTextRules: 4, insertText: 'analogWrite(${1:pin}, ${2:value});',
            documentation: 'Write a PWM value (0-255) to a pin' },
          { label: 'analogRead',      kind: 4, insertTextRules: 4, insertText: 'analogRead(${1:pin})',
            documentation: 'Read the analog value from a pin (0-1023)' },
          { label: 'delay',           kind: 4, insertTextRules: 4, insertText: 'delay(${1:1000});',
            documentation: 'Pause execution for the given number of milliseconds' },
          { label: 'delayMicroseconds', kind: 4, insertTextRules: 4, insertText: 'delayMicroseconds(${1:100});' },
          { label: 'millis',          kind: 4, insertTextRules: 4, insertText: 'millis()',
            documentation: 'Return the number of milliseconds since the board began running' },
          { label: 'micros',          kind: 4, insertTextRules: 4, insertText: 'micros()' },
          { label: 'map',             kind: 4, insertTextRules: 4,
            insertText: 'map(${1:value}, ${2:fromLow}, ${3:fromHigh}, ${4:toLow}, ${5:toHigh})',
            documentation: 'Re-map a number from one range to another' },
          { label: 'constrain',       kind: 4, insertTextRules: 4, insertText: 'constrain(${1:x}, ${2:a}, ${3:b})',
            documentation: 'Constrain a number to be within a range' },
          { label: 'random',          kind: 4, insertTextRules: 4, insertText: 'random(${1:min}, ${2:max})' },
          { label: 'tone',            kind: 4, insertTextRules: 4, insertText: 'tone(${1:pin}, ${2:frequency});' },
          { label: 'noTone',          kind: 4, insertTextRules: 4, insertText: 'noTone(${1:pin});' },
          { label: 'attachInterrupt', kind: 4, insertTextRules: 4,
            insertText: 'attachInterrupt(digitalPinToInterrupt(${1:pin}), ${2:ISR}, ${3:RISING});' },
          // EEPROM
          { label: 'EEPROM.read',     kind: 4, insertTextRules: 4, insertText: 'EEPROM.read(${1:address})',
            documentation: 'Read a byte from EEPROM' },
          { label: 'EEPROM.write',    kind: 4, insertTextRules: 4, insertText: 'EEPROM.write(${1:address}, ${2:value});',
            documentation: 'Write a byte to EEPROM' },
          // Wire
          { label: 'Wire.begin',      kind: 4, insertTextRules: 4, insertText: 'Wire.begin();' },
          { label: 'Wire.beginTransmission', kind: 4, insertTextRules: 4, insertText: 'Wire.beginTransmission(${1:address});' },
          { label: 'Wire.write',      kind: 4, insertTextRules: 4, insertText: 'Wire.write(${1:data});' },
          { label: 'Wire.endTransmission', kind: 4, insertTextRules: 4, insertText: 'Wire.endTransmission();' },
          { label: 'Wire.requestFrom', kind: 4, insertTextRules: 4, insertText: 'Wire.requestFrom(${1:address}, ${2:quantity});' },
          { label: 'Wire.read',       kind: 4, insertTextRules: 4, insertText: 'Wire.read()' },
          // Common patterns
          { label: 'blink-led',  kind: monaco.languages.CompletionItemKind.Snippet, insertTextRules: 4,
            insertText: 'digitalWrite(${1:LED_BUILTIN}, HIGH);\ndelay(${2:1000});\ndigitalWrite(${1:LED_BUILTIN}, LOW);\ndelay(${2:1000});',
            documentation: 'Blink an LED' },
          { label: 'non-blocking-blink', kind: monaco.languages.CompletionItemKind.Snippet, insertTextRules: 4,
            insertText: 'unsigned long ${1:previousMillis} = 0;\nconst long ${2:interval} = ${3:1000};\n\nvoid loop() {\n\tunsigned long currentMillis = millis();\n\tif (currentMillis - ${1:previousMillis} >= ${2:interval}) {\n\t\t${1:previousMillis} = currentMillis;\n\t\t// toggle LED\n\t}\n}',
            documentation: 'Non-blocking LED blink using millis()' },
        ];

        return { suggestions: snippets.map(s => ({ ...s, range })) };
      }
    });

    // Dark theme tokens
    monaco.editor.defineTheme('arduino-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment',     foreground: '5a6676', fontStyle: 'italic' },
        { token: 'keyword',     foreground: 'cc99cd' },
        { token: 'constant',    foreground: 'f7c948' },
        { token: 'string',      foreground: '7ec699' },
        { token: 'number',      foreground: 'f08d49' },
        { token: 'number.hex',  foreground: 'f08d49' },
        { token: 'preprocessor',foreground: 'cc9966' },
        { token: 'arduino-api', foreground: '6fb3d2', fontStyle: 'bold' },
        { token: 'identifier',  foreground: 'e6edf3' },
      ],
      colors: {
        'editor.background':         '#0d1117',
        'editor.foreground':         '#e6edf3',
        'editor.lineHighlightBackground': '#161b22',
        'editorCursor.foreground':   '#00979c',
        'editor.selectionBackground':'#264f78',
        'editorLineNumber.foreground':'#484f58',
        'editorLineNumber.activeForeground': '#e6edf3',
        'editorGutter.background':   '#0d1117',
        'editorIndentGuide.background':'#21262d',
        'editor.selectionHighlightBackground': '#3a3a4a',
      }
    });

    monaco.editor.defineTheme('arduino-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment',     foreground: '6a9955', fontStyle: 'italic' },
        { token: 'keyword',     foreground: '0000ff' },
        { token: 'constant',    foreground: '09885a' },
        { token: 'string',      foreground: 'a31515' },
        { token: 'number',      foreground: '098658' },
        { token: 'preprocessor',foreground: '800000' },
        { token: 'arduino-api', foreground: '267f99', fontStyle: 'bold' },
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#1f2328',
        'editorCursor.foreground': '#00979c',
      }
    });
  },

  _createEditor() {
    const container = document.getElementById('editor-container');
    if (!container) return;

    this.editor = monaco.editor.create(container, {
      value:     this.DEFAULT_CODE,
      language:  'arduino',
      theme:     'arduino-dark',
      fontSize:  13,
      fontFamily:"'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      fontLigatures: true,
      lineNumbers:'on',
      minimap:   { enabled: true, scale: 0.8 },
      scrollBeyondLastLine: false,
      wordWrap:  'off',
      renderLineHighlight: 'all',
      cursorStyle: 'line',
      cursorBlinking: 'smooth',
      smoothScrolling: true,
      automaticLayout: true,
      folding: true,
      bracketPairColorization: { enabled: true },
      suggest: { snippetsPreventQuickSuggestions: false },
      quickSuggestions: { other: true, comments: false, strings: false },
      tabSize: 2,
      insertSpaces: true,
      trimAutoWhitespace: true,
    });

    // Update cursor position display
    this.editor.onDidChangeCursorPosition(e => {
      const pos = document.getElementById('editor-cursor');
      if (pos) pos.textContent = `Ln ${e.position.lineNumber}, Col ${e.position.column}`;
    });

    // Auto-save on change (debounced)
    this.editor.onDidChangeModelContent(() => {
      // Mark project dirty
      if (window.StorageManager) window.StorageManager.markDirty();
      clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(() => {
        if (window.CircuitCanvas && window.StorageManager && window.App) {
          const projectName = window.App.getProjectName ? window.App.getProjectName() : 'Untitled Project';
          window.StorageManager.autoSave(this.getCode(), window.CircuitCanvas.serialize(), projectName);
        }
      }, 2000);
    });

    // Register keyboard shortcuts
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyR, () => {
      if (window.App) window.App.run();
    });
    this.editor.addCommand(monaco.KeyCode.F5, () => {
      if (window.App) window.App.run();
    });
    this.editor.addCommand(monaco.KeyCode.F6, () => {
      if (window.App) window.App.stop();
    });
  },

  _initFallback() {
    // Fallback: simple textarea
    const container = document.getElementById('editor-container');
    if (!container) return;
    const ta = document.createElement('textarea');
    ta.value = this.DEFAULT_CODE;
    ta.style.cssText = `width:100%;height:100%;background:#0d1117;color:#e6edf3;font-family:'JetBrains Mono',monospace;font-size:13px;padding:12px;border:none;outline:none;resize:none;`;
    container.appendChild(ta);
    this._fallbackTA = ta;
    if (window.App) window.App.onEditorReady();
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

  toggleWordWrap() {
    if (!this.editor) return;
    const current = this.editor.getOption(monaco.editor.EditorOption.wordWrap);
    this.editor.updateOptions({ wordWrap: current === 'off' ? 'on' : 'off' });
  },

  increaseFontSize() {
    if (!this.editor) return;
    const sz = this.editor.getOption(monaco.editor.EditorOption.fontSize);
    this.editor.updateOptions({ fontSize: Math.min(sz + 2, 28) });
  },

  decreaseFontSize() {
    if (!this.editor) return;
    const sz = this.editor.getOption(monaco.editor.EditorOption.fontSize);
    this.editor.updateOptions({ fontSize: Math.max(sz - 2, 9) });
  },

  showError(line, msg) {
    if (!this.editor) return;
    const model = this.editor.getModel();
    monaco.editor.setModelMarkers(model, 'ardusim', [{
      severity:  monaco.MarkerSeverity.Error,
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
