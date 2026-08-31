# DSO Realistic Upgrade + Fullscreen — Implementation Plan

## Goal
Transform the DSO component from a basic waveform viewer into a realistic 4-channel digital storage oscilloscope with full measurement capabilities, cursor system, math channels, and a fullscreen overlay for detailed analysis.

---

## Architecture Overview

### Files to Modify
| File | Changes |
|------|---------|
| `js/components/dso.js` | Add new props, measurements, enhanced draw, fullscreen button, Run/Stop, probe attenuation |
| `js/canvas.js` | Intercept double-click on DSO → open fullscreen instead of props modal |
| `js/app.js` | Add `openDSOFullscreen(comp)` method |
| `css/style.css` | Add fullscreen overlay styles, measurement panel, cursor readouts |
| `index.html` | Add fullscreen overlay DOM structure |

### New Files
| File | Purpose |
|------|---------|
| `js/dso-fullscreen.js` | `DSOFullscreen` class — fullscreen overlay rendering, cursor interaction, measurements panel, control panel, math channel |

---

## Feature Breakdown

### 1. Run/Stop & Single Trigger
- **Run/Stop button** on the DSO panel (already has visual, needs logic)
- When stopped, buffer freezes — no new samples appended
- **Single trigger** button: waits for one trigger event, captures one screen, then auto-stops
- RuntimeState fields: `runStop` (1=run, 0=stop), `singleTrigger` (boolean)

### 2. Measurement Engine
Compute from buffer data for each enabled channel:
- **Vmax**, **Vmin** — peak values
- **Vpp** — peak-to-peak (Vmax - Vmin)
- **Vrms** — root mean square
- **Frequency** — zero-crossing based (rising edges)
- **Period** — 1/frequency
- **Duty Cycle** — percentage of high time per period
- **Mean** — average DC value

Display measurements in the OSD bar (on-component) and in a dedicated panel (fullscreen).

### 3. Dual Cursor System
- **Time cursors** (vertical): Left-click on screen to place Cursor A, left-click again for Cursor B
- **Voltage cursors** (horizontal): Right-click to place Voltage Cursor A, right-click again for Voltage Cursor B
- Between cursors show: ΔT, 1/ΔT (freq), ΔV
- Cursors only active in fullscreen mode (on-component screen too small)

### 4. Math Channel
- Options: OFF, CH1+CH2, CH1-CH2, |CH1-CH2|
- Rendered as a purple/magenta trace with distinct style
- Computed from buffer data of the two source channels
- Toggle via interactive control in fullscreen panel

### 5. FFT (Bonus)
- Compute FFT of selected channel buffer
- Display as frequency-domain plot (log scale)
- Toggle between time-domain and FFT view

### 6. Probe Attenuation
- Per-channel setting: 1x, 10x, 100x
- Multiplies the displayed voltage by the probe factor
- Stored in props: `ch1_probe`, `ch2_probe`, etc.

### 7. Auto-Set
- Button that automatically adjusts:
  - Timebase to fit ~2-3 cycles of detected signal
  - V/Div to fit signal amplitude
  - Trigger level to 50% of signal swing

### 8. Sample Rate Display
- Calculate from buffer: `sampleRate = bufferLength / totalTime`
- Display in OSD: "1.0 MSa/s" format

### 9. Save Waveform
- Export buffer data as CSV (time, ch1, ch2, ch3, ch4)
- Download as file

---

## Fullscreen Overlay Design

### DOM Structure (added to `index.html`)
```html
<div id="dso-fullscreen-overlay" class="dso-fullscreen-overlay hidden">
  <div class="dso-fullscreen-container">
    <!-- Header bar -->
    <div class="dso-fs-header">
      <span class="dso-fs-title">DSO-4100 — 4CH Digital Storage Oscilloscope</span>
      <div class="dso-fs-header-controls">
        <button id="dso-fs-autoset" class="dso-fs-btn">Auto Set</button>
        <button id="dso-fs-save" class="dso-fs-btn">Save CSV</button>
        <button id="dso-fs-close" class="dso-fs-btn dso-fs-close-btn">✕</button>
      </div>
    </div>
    
    <!-- Main area -->
    <div class="dso-fs-body">
      <!-- Large screen canvas -->
      <div class="dso-fs-screen-wrap">
        <canvas id="dso-fullscreen-canvas"></canvas>
        <!-- Cursor readout overlay -->
        <div id="dso-fs-cursor-readout" class="dso-fs-cursor-readout"></div>
      </div>
      
      <!-- Right control panel -->
      <div class="dso-fs-controls">
        <!-- Trigger section -->
        <div class="dso-fs-section">
          <div class="dso-fs-section-title">TRIGGER</div>
          <label>Mode
            <select id="dso-fs-trig-mode">
              <option value="auto">Auto</option>
              <option value="norm">Normal</option>
              <option value="single">Single</option>
            </select>
          </label>
          <label>Source
            <select id="dso-fs-trig-source">
              <option value="ch1">CH1</option>
              <option value="ch2">CH2</option>
              <option value="ch3">CH3</option>
              <option value="ch4">CH4</option>
            </select>
          </label>
          <label>Slope
            <select id="dso-fs-trig-slope">
              <option value="rising">Rising</option>
              <option value="falling">Falling</option>
            </select>
          </label>
          <label>Level <input type="range" id="dso-fs-trig-level" min="-10" max="10" step="0.1" value="0"><span id="dso-fs-trig-level-val">0.0V</span></label>
        </div>
        
        <!-- Channel sections (×4) -->
        <div class="dso-fs-section" id="dso-fs-ch1-section">
          <div class="dso-fs-section-title" style="color:#ffe600">CH1</div>
          <label><input type="checkbox" id="dso-fs-ch1-en" checked> Enable</label>
          <label>V/Div <input type="range" id="dso-fs-ch1-vdiv" min="0.05" max="20" step="0.05" value="1"><span id="dso-fs-ch1-vdiv-val">1.0V</span></label>
          <label>Position <input type="range" id="dso-fs-ch1-pos" min="-4" max="4" step="0.1" value="2"><span id="dso-fs-ch1-pos-val">2.0</span></label>
          <label>Coupling
            <select id="dso-fs-ch1-coupling">
              <option value="dc">DC</option>
              <option value="ac">AC</option>
              <option value="gnd">GND</option>
            </select>
          </label>
          <label>Probe
            <select id="dso-fs-ch1-probe">
              <option value="1">1×</option>
              <option value="10">10×</option>
              <option value="100">100×</option>
            </select>
          </label>
        </div>
        <!-- ... repeat for CH2, CH3, CH4 ... -->
        
        <!-- Timebase section -->
        <div class="dso-fs-section">
          <div class="dso-fs-section-title">TIMEBASE</div>
          <label>Time/Div <input type="range" id="dso-fs-timebase" min="0.00001" max="0.1" step="0.0001" value="0.001"><span id="dso-fs-timebase-val">1.0ms</span></label>
        </div>
        
        <!-- Math channel -->
        <div class="dso-fs-section">
          <div class="dso-fs-section-title">MATH</div>
          <label>Operation
            <select id="dso-fs-math-op">
              <option value="off">OFF</option>
              <option value="add">CH1 + CH2</option>
              <option value="sub">CH1 − CH2</option>
              <option value="abs">|CH1 − CH2|</option>
            </select>
          </label>
        </div>
        
        <!-- Run/Stop + Single -->
        <div class="dso-fs-section dso-fs-transport">
          <button id="dso-fs-runstop" class="dso-fs-btn dso-fs-runstop-btn running">RUN</button>
          <button id="dso-fs-single" class="dso-fs-btn">SINGLE</button>
        </div>
        
        <!-- Measurements -->
        <div class="dso-fs-section" id="dso-fs-measurements">
          <div class="dso-fs-section-title">MEASUREMENTS</div>
          <div class="dso-fs-meas-grid" id="dso-fs-meas-grid">
            <!-- Populated by JS -->
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

### CSS (additions to `css/style.css`)
- `.dso-fullscreen-overlay` — fixed overlay, z-index 1000, dark background
- `.dso-fullscreen-container` — flex column, max 95vw × 95vh
- `.dso-fs-header` — title bar with close button
- `.dso-fs-body` — flex row: canvas (flex:1) + control panel (280px width)
- `.dso-fs-screen-wrap` — the canvas container with relative positioning for cursor readout
- `.dso-fs-controls` — scrollable right panel with sections
- `.dso-fs-section` — grouped controls
- `.dso-fs-cursor-readout` — floating overlay on canvas showing cursor values
- `.dso-fs-meas-grid` — grid of measurement values
- `.dso-fs-btn` — styled buttons matching the dark theme
- `.dso-fs-runstop-btn.running` — green when running, red when stopped

### Fullscreen Canvas Rendering
The `DSOFullscreen` class renders a high-resolution version of the DSO screen:
- Canvas size: fill available space (responsive via ResizeObserver)
- Grid: 12×8 divisions (same as component but larger)
- Waveforms: same phosphor rendering (glow + core) but at higher resolution
- OSD bars: top (channel info) + bottom (trigger info) + measurements panel below screen
- Cursor lines: vertical (time) and horizontal (voltage) with value readouts
- Math channel: rendered as additional trace in magenta
- FFT mode: alternative display showing frequency spectrum

---

## Detailed Code Changes

### `js/components/dso.js` — New Props & Logic

**New defaultProps:**
```javascript
runStop: 1,           // 1=running, 0=stopped
singleTrigger: 0,     // 1=armed for single capture
ch1_probe: 1,         // probe attenuation factor
ch2_probe: 1,
ch3_probe: 1,
ch4_probe: 1,
math_op: 'off',       // 'off', 'add', 'sub', 'abs'
```

**New interactive controls:**
```javascript
{ field: 'runStop',     label: 'Run/Stop',  type: 'toggle', min: 0, max: 1, step: 1, inline: { x: 306, y: 200, w: 44, h: 22 } },
{ field: 'singleTrigger', label: 'Single',   type: 'toggle', min: 0, max: 1, step: 1, inline: { x: 354, y: 200, w: 44, h: 22 } },
```

**Enhanced step() function:**
- Check `runStop` — if stopped, don't append new samples
- Check `singleTrigger` — if armed, wait for trigger condition, capture one screen, then set runStop=0
- Apply probe attenuation: `voltage * probe_factor`

**New measurement calculation function:**
```javascript
function _computeMeasurements(samples, timebase, divsX) {
  if (!samples || samples.length < 2) return null;
  const vmax = Math.max(...samples);
  const vmin = Math.min(...samples);
  const vpp = vmax - vmin;
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const vrms = Math.sqrt(samples.reduce((a, b) => a + b * b, 0) / samples.length);
  
  // Frequency from zero crossings
  let crossings = 0;
  for (let i = 1; i < samples.length; i++) {
    if ((samples[i-1] < 0 && samples[i] >= 0) || (samples[i-1] >= 0 && samples[i] < 0)) {
      crossings++;
    }
  }
  const totalTime = timebase * divsX;
  const frequency = crossings > 1 ? (crossings / 2) / totalTime : 0;
  const period = frequency > 0 ? 1 / frequency : 0;
  
  // Duty cycle from positive half-cycles
  let highTime = 0;
  for (let i = 1; i < samples.length; i++) {
    if (samples[i] > 0) highTime += (totalTime / samples.length);
  }
  const dutyCycle = frequency > 0 ? (highTime / totalTime) * 100 : 0;
  
  return { vmax, vmin, vpp, vrms, mean, frequency, period, dutyCycle };
}
```

**Enhanced draw() additions:**
- Run/Stop indicator in top bar: green "RUN" or red "STOP"
- Single trigger armed indicator: "READY" in yellow
- Sample rate display: "1.0 MSa/s" in OSD
- Fullscreen button: small icon in top-right corner of DSO panel
- Probe attenuation indicator per channel: "10×" next to V/Div

### `js/canvas.js` — Double-Click Override

In `_onDblClick(e)`:
```javascript
_onDblClick(e) {
  const world = this._toWorld(e.offsetX, e.offsetY);
  const comp = this._hitTestComp(world.x, world.y);
  if (comp) {
    // DSO components open fullscreen instead of props modal
    if (comp.type === 'dso_4ch' && window.App) {
      window.App.openDSOFullscreen(comp);
      return;
    }
    if (window.App) window.App.openPropsModal(comp);
  }
}
```

### `js/app.js` — New Methods

```javascript
openDSOFullscreen(comp) {
  if (!this._dsoFS) {
    this._dsoFS = new DSOFullscreen();
  }
  this._dsoFS.open(comp);
}

closeDSOFullscreen() {
  if (this._dsoFS) this._dsoFS.close();
}
```

### `js/dso-fullscreen.js` — New Class

```javascript
class DSOFullscreen {
  constructor() {
    this.overlay = document.getElementById('dso-fullscreen-overlay');
    this.canvas = document.getElementById('dso-fullscreen-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.inst = null; // DSO component instance
    this.visible = false;
    
    // Cursor state
    this.timeCursorA = null; // x pixel
    this.timeCursorB = null;
    this.voltCursorA = null; // y pixel
    this.voltCursorB = null;
    
    // Mouse interaction
    this.canvas.addEventListener('click', (e) => this._onClick(e));
    this.canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); this._onRightClick(e); });
    this.canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
    
    // Close button
    document.getElementById('dso-fs-close')?.addEventListener('click', () => this.close());
    
    // Control bindings
    this._bindControls();
    
    // Resize observer
    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(this.canvas.parentElement);
    
    // Render loop
    this._rafId = null;
  }
  
  open(inst) {
    this.inst = inst;
    this.visible = true;
    this.overlay.classList.remove('hidden');
    this._syncControlsFromInst();
    this._resize();
    this._startRender();
  }
  
  close() {
    this.visible = false;
    this.overlay.classList.add('hidden');
    this._stopRender();
  }
  
  _resize() {
    const wrap = this.canvas.parentElement;
    if (!wrap) return;
    this.canvas.width = wrap.clientWidth;
    this.canvas.height = wrap.clientHeight;
  }
  
  _startRender() {
    const loop = () => {
      if (!this.visible) return;
      this._render();
      this._rafId = requestAnimationFrame(loop);
    };
    this._rafId = requestAnimationFrame(loop);
  }
  
  _stopRender() {
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = null;
  }
  
  _render() {
    // Same rendering as DSO component draw() but at full canvas resolution
    // + cursors + measurements + math channel
  }
  
  _onClick(e) {
    // Place time cursor A (left click)
  }
  
  _onRightClick(e) {
    // Place voltage cursor A (right click)
  }
  
  _onMouseMove(e) {
    // Update cursor readout display
  }
  
  _bindControls() {
    // Bind all select/input elements to update inst.runtimeState
  }
  
  _syncControlsFromInst() {
    // Read inst.runtimeState/props and set control values
  }
  
  _updateMeasurements() {
    // Compute and display measurements for each enabled channel
  }
}
```

---

## Implementation Order

1. **Phase 1: Core enhancements to `dso.js`**
   - Add new props (runStop, singleTrigger, probe, math_op)
   - Implement measurement calculation function
   - Enhance `step()` with Run/Stop and Single trigger logic
   - Add measurement display to OSD
   - Add sample rate display
   - Add probe attenuation indicator
   - Add fullscreen button visual

2. **Phase 2: Fullscreen overlay DOM + CSS**
   - Add overlay HTML to `index.html`
   - Add all CSS styles
   - Create `js/dso-fullscreen.js` with class skeleton

3. **Phase 3: Fullscreen rendering**
   - Port DSO screen rendering to fullscreen canvas (higher resolution)
   - Add cursor rendering
   - Add math channel rendering
   - Add measurement panel updates

4. **Phase 4: Fullscreen controls + interaction**
   - Bind all control elements to DSO instance
   - Implement cursor click placement
   - Implement cursor readout display
   - Implement Auto-Set algorithm
   - Implement Save CSV

5. **Phase 5: Integration**
   - Modify `canvas.js` double-click handler
   - Add `openDSOFullscreen` to `app.js`
   - Add fullscreen button click handler on component
   - Test end-to-end

6. **Phase 6: Polish**
   - Smooth cursor movement
   - Keyboard shortcuts in fullscreen (arrow keys for cursor nudge)
   - Responsive layout for different screen sizes
   - Edge cases (empty buffer, single channel, no trigger)
