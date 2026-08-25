// 'use strict';

// /* ═══════════════════════════════════════════════════════
//    Digital Multimeter — Measuring Instrument
//    ═══════════════════════════════════════════════════════ */

// defComp({
//   id: 'multimeter',
//   name: 'Digital Multimeter',
//   category: 'Instruments',
//   icon: '🔧',
//   desc: 'Digital multimeter — measures DC/AC voltage, resistance, and continuity between two probe points',

//   width: 180,
//   height: 130,

//   defaultProps: {
//     mode: 'V_DC',
//     hold: false,
//   },

//   interactive: [
//     { field: 'mode', label: 'Mode', type: 'select', options: [
//       { value: 'V_DC',  label: 'DC Voltage (V⎓)' },
//       { value: 'V_AC',  label: 'AC Voltage (V~)' },
//       { value: 'A_DC',  label: 'DC Current (A)' },
//       { value: 'RES',   label: 'Resistance (Ω)' },
//       { value: 'CONT',  label: 'Continuity (🔊)' },
//     ]},
//   ],

//   pins: [
//     { id: 'probe_red',  label: 'V+',   type: PIN_TYPE.SIGNAL, x: 0, y: 30, side: 'left' },
//     { id: 'probe_com',  label: 'COM',  type: PIN_TYPE.GND,    x: 0, y: 60, side: 'left' },
//   ],

//   draw(ctx, inst, sim) {
//     const { x, y } = inst;
//     const rs = inst.runtimeState || {};
//     const mode     = rs.mode     || inst.props.mode     || 'V_DC';
//     const text     = rs.displayText  || '0.000';
//     const unit     = rs.displayUnit  || 'V';
//     const subMode  = rs.displayMode  || 'DC';
//     const beep     = rs.displayBeep  || false;

//     ctx.save();
//     ctx.translate(x, y);

//     // ── Lead wires from body to pin endpoints ──
//     // Red probe lead (top pin)
//     ctx.strokeStyle = '#e74c3c';
//     ctx.lineWidth = 2.5;
//     ctx.beginPath(); ctx.moveTo(40, 30); ctx.lineTo(0, 30); ctx.stroke();
//     ctx.fillStyle = '#e74c3c';
//     ctx.beginPath(); ctx.arc(0, 30, 3.5, 0, Math.PI * 2); ctx.fill();

//     // Black COM lead (bottom pin)
//     ctx.strokeStyle = '#222';
//     ctx.lineWidth = 2.5;
//     ctx.beginPath(); ctx.moveTo(40, 60); ctx.lineTo(0, 60); ctx.stroke();
//     ctx.fillStyle = '#111';
//     ctx.beginPath(); ctx.arc(0, 60, 3.5, 0, Math.PI * 2); ctx.fill();

//     // ── Orange rubber boot (chassis) ──
//     const bootGrad = ctx.createLinearGradient(36, 0, 180, 0);
//     bootGrad.addColorStop(0, '#d35400');
//     bootGrad.addColorStop(0.5, '#e67e22');
//     bootGrad.addColorStop(1, '#d35400');
//     ctx.fillStyle = bootGrad;
//     roundRect(ctx, 36, 0, 140, 128, 12);
//     ctx.fill();
//     ctx.strokeStyle = '#a04000';
//     ctx.lineWidth = 2;
//     ctx.stroke();

//     // ── Dark gray body ──
//     const bodyGrad = ctx.createLinearGradient(40, 4, 172, 124);
//     bodyGrad.addColorStop(0, '#3a4a5a');
//     bodyGrad.addColorStop(1, '#2c3e50');
//     ctx.fillStyle = bodyGrad;
//     roundRect(ctx, 40, 4, 132, 120, 8);
//     ctx.fill();

//     // ── LCD Screen (large) ──
//     ctx.fillStyle = '#8b9b87';
//     roundRect(ctx, 48, 12, 116, 60, 6);
//     ctx.fill();
//     ctx.strokeStyle = '#6a7a66';
//     ctx.lineWidth = 1.5;
//     ctx.stroke();

//     // LCD shadow inset
//     ctx.fillStyle = 'rgba(0,0,0,0.15)';
//     roundRect(ctx, 48, 12, 116, 8, 6);
//     ctx.fill();

//     // Mode label (top-left of LCD)
//     const modeLabels = { V_DC: 'DC', V_AC: 'AC', RES: 'Ω', CONT: 'CONT' };
//     ctx.fillStyle = '#1a2a1a';
//     ctx.font = 'bold 12px monospace';
//     ctx.textAlign = 'left';
//     ctx.fillText(modeLabels[mode] || '', 54, 30);

//     // Unit label (top-right of LCD)
//     ctx.font = 'bold 12px monospace';
//     ctx.textAlign = 'right';
//     ctx.fillText(unit, 160, 30);

//     // Main value (large)
//     ctx.fillStyle = '#111';
//     ctx.font = 'bold 28px "Courier New", monospace';
//     ctx.textAlign = 'center';
//     ctx.fillText(text, 106, 54);

//     // Continuity beep indicator
//     if (beep && mode === 'CONT') {
//       ctx.fillStyle = '#27ae60';
//       ctx.font = 'bold 14px sans-serif';
//       ctx.textAlign = 'center';
//       ctx.fillText('BEEP', 106, 68);
//     }

//     // ── Label "DIGITAL MULTIMETER" ──
//     ctx.fillStyle = '#7788aa';
//     ctx.font = 'bold 8px sans-serif';
//     ctx.textAlign = 'center';
//     ctx.fillText('DIGITAL MULTIMETER', 106, 90);

//     // ── Probe labels on body ──
//     ctx.fillStyle = '#e74c3c';
//     ctx.font = 'bold 10px sans-serif';
//     ctx.textAlign = 'left';
//     ctx.fillText('+', 46, 35);
//     ctx.fillStyle = '#aaa';
//     ctx.fillText('COM', 46, 65);

//     // ── Selection highlight ──
//     if (inst.selected) drawSelectionRect(ctx, -4, -4, 188, 136);

//     ctx.restore();
//   }
// });


'use strict';

/* ═══════════════════════════════════════════════════════
   Precision True-RMS Digital Multimeter (6000-Count)
   ═══════════════════════════════════════════════════════ */

// defComp({  


//   id: 'multimeter',
//   name: 'Digital Multimeter',
//   category: 'Instruments',
//   icon: '🎛️',
//   desc: 'True-RMS 6000-count digital multimeter with fast analog bar graph, continuity beeper, diode test, and auto-ranging',

//   width: 190,
//   height: 185,

//   defaultProps: {
//     mode: 'V_DC',
//     hold: false,
//     rel: false,
//     range_auto: true,
//   },

//   interactive: [
//     { field: 'mode', label: 'Rotary Dial Mode', type: 'select', options: [
//       { value: 'V_DC',  label: 'DC Voltage (V⎓)' },
//       { value: 'V_AC',  label: 'AC Voltage True-RMS (V~)' },
//       { value: 'MV_DC', label: 'DC Millivolts (mV⎓)' },
//       { value: 'RES',   label: 'Resistance (Ω)' },
//       { value: 'CONT',  label: 'Continuity (🔊)' },
//       { value: 'DIODE', label: 'Diode Test (⯈|)' },
//       { value: 'A_DC',  label: 'DC Current (10A / A⎓)' },
//       { value: 'A_AC',  label: 'AC Current (A~)' },
//     ]},
//     { field: 'hold', label: 'Data Hold', type: 'checkbox' },
//     { field: 'rel',  label: 'Relative (Δ) Mode', type: 'checkbox' },
//   ],

//   pins: [
//     { id: 'probe_red', label: 'V/Ω',  type: PIN_TYPE.SIGNAL, x: 55,  y: 180,  side: 'bottom' },
//     { id: 'probe_com', label: 'COM',  type: PIN_TYPE.GND,    x: 95,  y: 180,  side: 'bottom' },
//     { id: 'probe_amp', label: '10A',  type: PIN_TYPE.SIGNAL, x: 135, y: 180,  side: 'bottom' },
//   ],

//   /**
//    * Continuous Measurement & Sampling Engine
//    */
//   step(inst, sim) {
//     const rs = inst.runtimeState = inst.runtimeState || {
//       buffer: [],
//       bufIdx: 0,
//       lastUpdate: 0,
//       relOffset: 0,
//       frozenText: null,
//       frozenUnit: null,
//     };
//     const props = inst.props || {};
//     const mode = props.mode || 'V_DC';

//     // Probe Potentials
//     const vRed = sim && typeof sim.getPinVoltage === 'function' ? (sim.getPinVoltage(inst, 'probe_red') || 0) : 0;
//     const vCom = sim && typeof sim.getPinVoltage === 'function' ? (sim.getPinVoltage(inst, 'probe_com') || 0) : 0;
//     const vAmp = sim && typeof sim.getPinVoltage === 'function' ? (sim.getPinVoltage(inst, 'probe_amp') || 0) : 0;
//     const vDiff = vRed - vCom;

//     // Buffer for True-RMS sliding window (128 samples)
//     if (!rs.buffer || rs.buffer.length !== 128) {
//       rs.buffer = new Float32Array(128);
//       rs.bufIdx = 0;
//     }
//     rs.buffer[rs.bufIdx] = (mode === 'A_AC' || mode === 'A_DC') ? (vAmp - vCom) : vDiff;
//     rs.bufIdx = (rs.bufIdx + 1) & 127;

//     // Hold latch
//     if (props.hold) {
//       if (!rs.isHeld) {
//         rs.isHeld = true;
//         rs.heldText = rs.displayText;
//         rs.heldUnit = rs.displayUnit;
//       }
//       return;
//     }
//     rs.isHeld = false;

//     // Measurement Evaluation
//     let displayVal = 0;
//     let unit = 'V';
//     let sub = 'DC';
//     let beep = false;
//     let bargraph = 0; // 0.0 to 1.0

//     switch (mode) {
//       case 'V_DC': {
//         sub = 'DC';
//         displayVal = vDiff;
//         bargraph = Math.min(Math.abs(displayVal) / 10.0, 1.0);
//         const fmt = this._autoScale(displayVal, 'V');
//         rs.displayText = fmt.text;
//         rs.displayUnit = fmt.unit;
//         break;
//       }

//       case 'MV_DC': {
//         sub = 'DC';
//         displayVal = vDiff * 1000.0;
//         bargraph = Math.min(Math.abs(displayVal) / 600.0, 1.0);
//         rs.displayText = displayVal.toFixed(1);
//         rs.displayUnit = 'mV';
//         break;
//       }

//       case 'V_AC': {
//         sub = 'AC';
//         let sumSq = 0;
//         for (let i = 0; i < 128; i++) sumSq += rs.buffer[i] * rs.buffer[i];
//         displayVal = Math.sqrt(sumSq / 128);
//         bargraph = Math.min(displayVal / 10.0, 1.0);
//         const fmt = this._autoScale(displayVal, 'V');
//         rs.displayText = fmt.text;
//         rs.displayUnit = fmt.unit;
//         break;
//       }

//       case 'RES': {
//         sub = 'AUTO';
//         // Virtual Constant Current Injection for Test: 1mA
//         const testCurrent = 0.001;
//         const calcR = Math.abs(vDiff) / testCurrent;
//         if (calcR > 40e6 || isNaN(calcR)) {
//           rs.displayText = 'O.L';
//           rs.displayUnit = 'MΩ';
//           bargraph = 1.0;
//         } else {
//           const fmt = this._autoScale(calcR, 'Ω');
//           rs.displayText = fmt.text;
//           rs.displayUnit = fmt.unit;
//           bargraph = Math.min(calcR / 10000.0, 1.0);
//         }
//         break;
//       }

//       case 'CONT': {
//         sub = 'CONT';
//         unit = 'Ω';
//         const res = Math.abs(vDiff) / 0.001;
//         if (res < 35.0) {
//           beep = true;
//           rs.displayText = res.toFixed(1);
//           bargraph = res / 35.0;
//         } else if (res > 2000) {
//           rs.displayText = 'O.L';
//           bargraph = 1.0;
//         } else {
//           rs.displayText = res.toFixed(0);
//           bargraph = Math.min(res / 500, 1.0);
//         }
//         rs.displayUnit = 'Ω';
//         break;
//       }

//       case 'DIODE': {
//         sub = 'DIODE';
//         if (vDiff > 0.05 && vDiff < 3.0) {
//           rs.displayText = vDiff.toFixed(3);
//         } else {
//           rs.displayText = 'O.L';
//         }
//         rs.displayUnit = 'V';
//         bargraph = Math.min(vDiff / 2.0, 1.0);
//         break;
//       }

//       case 'A_DC': {
//         sub = 'DC';
//         // Shunt resistance: 0.01 Ohm
//         displayVal = (vAmp - vCom) / 0.01;
//         bargraph = Math.min(Math.abs(displayVal) / 10.0, 1.0);
//         const fmt = this._autoScale(displayVal, 'A');
//         rs.displayText = fmt.text;
//         rs.displayUnit = fmt.unit;
//         break;
//       }

//       case 'A_AC': {
//         sub = 'AC';
//         let sumSq = 0;
//         for (let i = 0; i < 128; i++) sumSq += rs.buffer[i] * rs.buffer[i];
//         displayVal = (Math.sqrt(sumSq / 128)) / 0.01;
//         bargraph = Math.min(displayVal / 10.0, 1.0);
//         const fmt = this._autoScale(displayVal, 'A');
//         rs.displayText = fmt.text;
//         rs.displayUnit = fmt.unit;
//         break;
//       }
//     }

//     rs.displayMode = sub;
//     rs.displayBeep = beep;
//     rs.barPct = isNaN(bargraph) ? 0 : Math.max(0, Math.min(1, bargraph));
//   },

//   _autoScale(val, baseUnit) {
//     const abs = Math.abs(val);
//     if (abs >= 1e6) return { text: (val / 1e6).toFixed(3), unit: 'M' + baseUnit };
//     if (abs >= 1e3) return { text: (val / 1e3).toFixed(3), unit: 'k' + baseUnit };
//     if (abs > 0 && abs < 1e-1 && baseUnit === 'V') return { text: (val * 1e3).toFixed(2), unit: 'mV' };
//     if (abs > 0 && abs < 1e-1 && baseUnit === 'A') return { text: (val * 1e3).toFixed(2), unit: 'mA' };
//     return { text: val.toFixed(3), unit: baseUnit };
//   },

//   draw(ctx, inst, sim) {
//     const { x, y } = inst;
//     const props = inst.props || {};
//     const rs = inst.runtimeState || {};
//     const mode = props.mode || 'V_DC';
//     const W = 190, H = 185;

//     const drawRRect = (c, rx, ry, rw, rh, rad) => {
//       if (typeof roundRect === 'function') { roundRect(c, rx, ry, rw, rh, rad); return; }
//       c.beginPath();
//       c.moveTo(rx + rad, ry);
//       c.arcTo(rx + rw, ry, rx + rw, ry + rh, rad);
//       c.arcTo(rx + rw, ry + rh, rx, ry + rh, rad);
//       c.arcTo(rx, ry + rh, rx, ry, rad);
//       c.arcTo(rx, ry, rx + rw, ry, rad);
//       c.closePath();
//     };

//     ctx.save();
//     ctx.translate(x, y);

//     // ── Rugged High-Visibility Holster (Yellow/Orange) ──
//     const bootGrad = ctx.createLinearGradient(32, 0, W, H - 20);
//     bootGrad.addColorStop(0, '#f39c12');
//     bootGrad.addColorStop(0.5, '#e67e22');
//     bootGrad.addColorStop(1, '#d35400');
//     ctx.fillStyle = bootGrad;
//     drawRRect(ctx, 32, 0, W - 32, H - 20, 14);
//     ctx.fill();

//     // Side Grip Ribs
//     ctx.fillStyle = '#b84d05';
//     for (let ribY = 24; ribY < H - 44; ribY += 12) {
//       ctx.fillRect(W - 6, ribY, 4, 6);
//     }

//     // ── Dark Grey Bezel / Meter Core ──
//     const bodyGrad = ctx.createLinearGradient(38, 4, W - 8, H - 24);
//     bodyGrad.addColorStop(0, '#2d3436');
//     bodyGrad.addColorStop(1, '#1e272e');
//     ctx.fillStyle = bodyGrad;
//     drawRRect(ctx, 37, 5, W - 43, H - 30, 10);
//     ctx.fill();
//     ctx.strokeStyle = '#111417';
//     ctx.lineWidth = 1.5;
//     ctx.stroke();

//     // Brand & Cert Markings
//     ctx.fillStyle = '#8395a7';
//     ctx.font = 'bold 8px system-ui, sans-serif';
//     ctx.textAlign = 'left';
//     ctx.fillText('TRUE RMS', 45, 17);
//     ctx.textAlign = 'right';
//     ctx.fillStyle = '#f39c12';
//     ctx.fillText('CAT IV 600V', W - 14, 17);

//     // ── STN Backlit LCD Screen ──
//     const lcdX = 44, lcdY = 22, lcdW = W - 56, lcdH = 50;
//     ctx.fillStyle = '#9cb89d';
//     drawRRect(ctx, lcdX, lcdY, lcdW, lcdH, 4);
//     ctx.fill();
//     ctx.strokeStyle = '#6f8a70';
//     ctx.lineWidth = 1.2;
//     ctx.stroke();

//     // LCD Inset Bezel Shadow
//     ctx.fillStyle = 'rgba(0,0,0,0.12)';
//     ctx.fillRect(lcdX, lcdY, lcdW, 6);

//     // ── LCD Annunciators (Top Header Line) ──
//     ctx.fillStyle = '#1b2a1c';
//     ctx.font = 'bold 7px monospace';
//     ctx.textAlign = 'left';

//     const showHold = props.hold || rs.isHeld;
//     const isRel = props.rel;
//     ctx.fillText(props.range_auto !== false ? 'AUTO' : 'MANU', lcdX + 4, lcdY + 10);
//     if (showHold) ctx.fillText('HOLD', lcdX + 32, lcdY + 10);
//     if (isRel) ctx.fillText('\u0394 REL', lcdX + 58, lcdY + 10);

//     ctx.textAlign = 'right';
//     ctx.fillText(rs.displayMode || 'DC', lcdX + lcdW - 4, lcdY + 10);

//     // ── LCD Main Value ──
//     const readoutText = rs.isHeld ? (rs.heldText || '0.000') : (rs.displayText || '0.000');
//     const readoutUnit = rs.isHeld ? (rs.heldUnit || 'V') : (rs.displayUnit || 'V');

//     // Inactive 7-segment background ghost
//     ctx.fillStyle = '#8ca68d';
//     ctx.font = 'bold 22px monospace';
//     ctx.textAlign = 'right';
//     ctx.fillText('8.8.8.8', lcdX + lcdW - 30, lcdY + 36);

//     // Active Digits
//     ctx.fillStyle = '#0f1710';
//     ctx.fillText(readoutText, lcdX + lcdW - 30, lcdY + 36);

//     // Unit
//     ctx.font = 'bold 10px monospace';
//     ctx.fillText(readoutUnit, lcdX + lcdW - 4, lcdY + 36);

//     // Continuity Beeper Icon
//     if (rs.displayBeep && mode === 'CONT') {
//       ctx.fillStyle = '#0f1710';
//       ctx.font = 'bold 9px system-ui';
//       ctx.textAlign = 'left';
//       ctx.fillText('\uD83D\uDD0A BEEP', lcdX + 4, lcdY + 36);
//     }

//     // ── Analog Segmented Bar Graph ──
//     const barSegments = 24;
//     const activeSegs = Math.round((rs.barPct || 0) * barSegments);
//     const barX = lcdX + 6;
//     const barY = lcdY + 42;
//     const segW = (lcdW - 14) / barSegments;

//     for (let s = 0; s < barSegments; s++) {
//       ctx.fillStyle = s < activeSegs ? '#0f1710' : '#8ca68d';
//       ctx.fillRect(barX + s * segW, barY, segW - 1.5, 4);
//     }

//     // ── Functional Softkeys ──
//     const _drawButton = (bx, by, bw, bh, text, isPressed) => {
//       ctx.fillStyle = isPressed ? '#e74c3c' : '#3d4752';
//       drawRRect(ctx, bx, by, bw, bh, 3);
//       ctx.fill();
//       ctx.fillStyle = '#ffffff';
//       ctx.font = 'bold 6px sans-serif';
//       ctx.textAlign = 'center';
//       ctx.fillText(text, bx + bw / 2, by + bh - 2.5);
//     };

//     _drawButton(45, 78, 26, 9, 'HOLD', showHold);
//     _drawButton(77, 78, 26, 9, 'RANGE', false);
//     _drawButton(109, 78, 26, 9, 'REL \u0394', isRel);
//     _drawButton(141, 78, 26, 9, 'SELECT', false);

//     // ── 3D Physical Rotary Dial ──
//     const dialX = W / 2 + 10;
//     const dialY = 120;
//     const dialR = 21;

//     ctx.fillStyle = '#171a1e';
//     ctx.beginPath(); ctx.arc(dialX, dialY, dialR + 2, 0, Math.PI * 2); ctx.fill();

//     const dialGrad = ctx.createLinearGradient(dialX - dialR, dialY - dialR, dialX + dialR, dialY + dialR);
//     dialGrad.addColorStop(0, '#485460');
//     dialGrad.addColorStop(0.5, '#2d3436');
//     dialGrad.addColorStop(1, '#1e272e');
//     ctx.fillStyle = dialGrad;
//     ctx.beginPath(); ctx.arc(dialX, dialY, dialR, 0, Math.PI * 2); ctx.fill();
//     ctx.strokeStyle = '#000000';
//     ctx.lineWidth = 1;
//     ctx.stroke();

//     const modeAngles = {
//       V_DC: -120, V_AC: -85, MV_DC: -50, RES: -15,
//       CONT: 20, DIODE: 55, A_DC: 90, A_AC: 125,
//     };
//     const curAngleDeg = modeAngles[mode] || -120;
//     const rad = (curAngleDeg * Math.PI) / 180;

//     ctx.save();
//     ctx.translate(dialX, dialY);
//     ctx.rotate(rad);
//     ctx.fillStyle = '#ff3838';
//     ctx.fillRect(-2, -dialR + 2, 4, 12);
//     ctx.fillStyle = '#ffffff';
//     ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
//     ctx.restore();

//     ctx.font = 'bold 7px system-ui, monospace';
//     ctx.fillStyle = '#ffffff';
//     ctx.textAlign = 'center';
//     ctx.fillText('V\u23C1', dialX - 25, dialY - 14);
//     ctx.fillText('V~', dialX - 16, dialY - 25);
//     ctx.fillText('\u03A9', dialX + 16, dialY - 25);
//     ctx.fillText('\uD83D\uDD0A', dialX + 27, dialY - 14);
//     ctx.fillText('A', dialX + 28, dialY + 14);
//     ctx.fillText('OFF', dialX - 26, dialY + 14);

//     // ── Bottom Lead Wires & Banana Plug Terminals ──
//     const _drawBottomLead = (lx, ly, color, label) => {
//       // Vertical wire from body bottom to pin
//       ctx.strokeStyle = color;
//       ctx.lineWidth = 3;
//       ctx.beginPath(); ctx.moveTo(lx, H - 20); ctx.lineTo(lx, ly); ctx.stroke();

//       // Banana plug strain boot
//       ctx.fillStyle = '#1c1f24';
//       drawRRect(ctx, lx - 8, H - 20, 16, 10, 2);
//       ctx.fill();

//       // Terminal Contact ring
//       ctx.fillStyle = '#333';
//       ctx.beginPath(); ctx.arc(lx, H - 20, 7, 0, Math.PI * 2); ctx.fill();
//       ctx.fillStyle = color;
//       ctx.beginPath(); ctx.arc(lx, H - 20, 5, 0, Math.PI * 2); ctx.fill();

//       // Gold contact bore
//       ctx.fillStyle = '#d4af37';
//       ctx.beginPath(); ctx.arc(lx, H - 20, 2.5, 0, Math.PI * 2); ctx.fill();

//       // Label under terminal
//       ctx.fillStyle = color;
//       ctx.font = 'bold 6px "JetBrains Mono", monospace';
//       ctx.textAlign = 'center';
//       ctx.fillText(label, lx, H - 8);
//     };

//     _drawBottomLead(55, 180, '#ff3838', 'V\u03A9');
//     _drawBottomLead(95, 180, '#2f3542', 'COM');
//     _drawBottomLead(135, 180, '#eccc68', '10A');

//     // Selection Highlight
//     if (inst.selected && typeof drawSelectionRect === 'function') {
//       drawSelectionRect(ctx, 28, -4, W - 20, H + 4);
//     }

//     ctx.restore();
//   }
// });


'use strict';

/* ═══════════════════════════════════════════════════════
   Precision True-RMS Digital Multimeter (6000-Count)
   ═══════════════════════════════════════════════════════ */

defComp({
  id: 'multimeter',
  name: 'Digital Multimeter',
  category: 'Instruments',
  icon: '🎛️',
  desc: 'True-RMS 6000-count digital multimeter with fast analog bar graph, continuity beeper, diode test, and auto-ranging',

  width: 190,
  height: 185,

  defaultProps: {
    mode: 'V_DC',
    hold: false,
    rel: false,
    range_auto: true,
  },

  interactive: [
    { field: 'mode', label: 'Rotary Dial Mode', type: 'select', options: [
      { value: 'V_DC',  label: 'DC Voltage (V⎓)' },
      { value: 'V_AC',  label: 'AC Voltage True-RMS (V~)' },
      { value: 'MV_DC', label: 'DC Millivolts (mV⎓)' },
      { value: 'RES',   label: 'Resistance (Ω)' },
      { value: 'CONT',  label: 'Continuity (🔊)' },
      { value: 'DIODE', label: 'Diode Test (⯈|)' },
      { value: 'A_DC',  label: 'DC Current (10A / A⎓)' },
      { value: 'A_AC',  label: 'AC Current (A~)' },
    ]},
    { field: 'hold', label: 'Data Hold', type: 'checkbox' },
    { field: 'rel',  label: 'Relative (Δ) Mode', type: 'checkbox' },
  ],

  pins: [
    { id: 'probe_amp', label: '10A',  type: PIN_TYPE.SIGNAL, x: 72,  y: 180,  side: 'bottom' },
    { id: 'probe_com', label: 'COM',  type: PIN_TYPE.GND,    x: 110,  y: 180,  side: 'bottom' },
    { id: 'probe_red', label: 'V/Ω',  type: PIN_TYPE.SIGNAL, x: 148, y: 180,  side: 'bottom' },
  ],

  /**
   * Continuous Measurement & Sampling Engine
   */
  step(inst, sim) {
    const rs = inst.runtimeState = inst.runtimeState || {
      buffer: [],
      bufIdx: 0,
      lastUpdate: 0,
      relOffset: 0,
      frozenText: null,
      frozenUnit: null,
    };
    const props = inst.props || {};
    const mode = props.mode || 'V_DC';

    // Probe Potentials
    const vRed = sim && typeof sim.getPinVoltage === 'function' ? (sim.getPinVoltage(inst, 'probe_red') || 0) : 0;
    const vCom = sim && typeof sim.getPinVoltage === 'function' ? (sim.getPinVoltage(inst, 'probe_com') || 0) : 0;
    const vAmp = sim && typeof sim.getPinVoltage === 'function' ? (sim.getPinVoltage(inst, 'probe_amp') || 0) : 0;
    const vDiff = vRed - vCom;

    // Buffer for True-RMS sliding window (128 samples)
    if (!rs.buffer || rs.buffer.length !== 128) {
      rs.buffer = new Float32Array(128);
      rs.bufIdx = 0;
    }
    rs.buffer[rs.bufIdx] = (mode === 'A_AC' || mode === 'A_DC') ? (vAmp - vCom) : vDiff;
    rs.bufIdx = (rs.bufIdx + 1) & 127;

    // Hold latch
    if (props.hold) {
      if (!rs.isHeld) {
        rs.isHeld = true;
        rs.heldText = rs.displayText;
        rs.heldUnit = rs.displayUnit;
      }
      return;
    }
    rs.isHeld = false;

    // Measurement Evaluation
    let displayVal = 0;
    let unit = 'V';
    let sub = 'DC';
    let beep = false;
    let bargraph = 0; // 0.0 to 1.0

    switch (mode) {
      case 'V_DC': {
        sub = 'DC';
        displayVal = vDiff;
        bargraph = Math.min(Math.abs(displayVal) / 10.0, 1.0);
        const fmt = this._autoScale(displayVal, 'V');
        rs.displayText = fmt.text;
        rs.displayUnit = fmt.unit;
        break;
      }

      case 'MV_DC': {
        sub = 'DC';
        displayVal = vDiff * 1000.0;
        bargraph = Math.min(Math.abs(displayVal) / 600.0, 1.0);
        rs.displayText = displayVal.toFixed(1);
        rs.displayUnit = 'mV';
        break;
      }

      case 'V_AC': {
        sub = 'AC';
        let sumSq = 0;
        for (let i = 0; i < 128; i++) sumSq += rs.buffer[i] * rs.buffer[i];
        displayVal = Math.sqrt(sumSq / 128);
        bargraph = Math.min(displayVal / 10.0, 1.0);
        const fmt = this._autoScale(displayVal, 'V');
        rs.displayText = fmt.text;
        rs.displayUnit = fmt.unit;
        break;
      }

      case 'RES': {
        sub = 'AUTO';
        // Virtual Constant Current Injection for Test: 1mA
        const testCurrent = 0.001;
        const calcR = Math.abs(vDiff) / testCurrent;
        if (calcR > 40e6 || isNaN(calcR)) {
          rs.displayText = 'O.L';
          rs.displayUnit = 'MΩ';
          bargraph = 1.0;
        } else {
          const fmt = this._autoScale(calcR, 'Ω');
          rs.displayText = fmt.text;
          rs.displayUnit = fmt.unit;
          bargraph = Math.min(calcR / 10000.0, 1.0);
        }
        break;
      }

      case 'CONT': {
        sub = 'CONT';
        unit = 'Ω';
        const res = Math.abs(vDiff) / 0.001;
        if (res < 35.0) {
          beep = true;
          rs.displayText = res.toFixed(1);
          bargraph = res / 35.0;
        } else if (res > 2000) {
          rs.displayText = 'O.L';
          bargraph = 1.0;
        } else {
          rs.displayText = res.toFixed(0);
          bargraph = Math.min(res / 500, 1.0);
        }
        rs.displayUnit = 'Ω';
        break;
      }

      case 'DIODE': {
        sub = 'DIODE';
        if (vDiff > 0.05 && vDiff < 3.0) {
          rs.displayText = vDiff.toFixed(3);
        } else {
          rs.displayText = 'O.L';
        }
        rs.displayUnit = 'V';
        bargraph = Math.min(vDiff / 2.0, 1.0);
        break;
      }

      case 'A_DC': {
        sub = 'DC';
        // Shunt resistance: 0.01 Ohm
        displayVal = (vAmp - vCom) / 0.01;
        bargraph = Math.min(Math.abs(displayVal) / 10.0, 1.0);
        const fmt = this._autoScale(displayVal, 'A');
        rs.displayText = fmt.text;
        rs.displayUnit = fmt.unit;
        break;
      }

      case 'A_AC': {
        sub = 'AC';
        let sumSq = 0;
        for (let i = 0; i < 128; i++) sumSq += rs.buffer[i] * rs.buffer[i];
        displayVal = (Math.sqrt(sumSq / 128)) / 0.01;
        bargraph = Math.min(displayVal / 10.0, 1.0);
        const fmt = this._autoScale(displayVal, 'A');
        rs.displayText = fmt.text;
        rs.displayUnit = fmt.unit;
        break;
      }
    }

    rs.displayMode = sub;
    rs.displayBeep = beep;
    rs.barPct = isNaN(bargraph) ? 0 : Math.max(0, Math.min(1, bargraph));
  },

  _autoScale(val, baseUnit) {
    const abs = Math.abs(val);
    if (abs >= 1e6) return { text: (val / 1e6).toFixed(3), unit: 'M' + baseUnit };
    if (abs >= 1e3) return { text: (val / 1e3).toFixed(3), unit: 'k' + baseUnit };
    if (abs > 0 && abs < 1e-1 && baseUnit === 'V') return { text: (val * 1e3).toFixed(2), unit: 'mV' };
    if (abs > 0 && abs < 1e-1 && baseUnit === 'A') return { text: (val * 1e3).toFixed(2), unit: 'mA' };
    return { text: val.toFixed(3), unit: baseUnit };
  },

  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const props = inst.props || {};
    const rs = inst.runtimeState || {};
    const mode = props.mode || 'V_DC';
    const W = 190, H = 185;

    const drawRRect = (c, rx, ry, rw, rh, rad) => {
      if (typeof roundRect === 'function') { roundRect(c, rx, ry, rw, rh, rad); return; }
      c.beginPath();
      c.moveTo(rx + rad, ry);
      c.arcTo(rx + rw, ry, rx + rw, ry + rh, rad);
      c.arcTo(rx + rw, ry + rh, rx, ry + rh, rad);
      c.arcTo(rx, ry + rh, rx, ry, rad);
      c.arcTo(rx, ry, rx + rw, ry, rad);
      c.closePath();
    };

    ctx.save();
    ctx.translate(x, y);

    // ── Rugged High-Visibility Holster (Yellow/Orange) ──
    const bootGrad = ctx.createLinearGradient(32, 0, W, H - 20);
    bootGrad.addColorStop(0, '#f39c12');
    bootGrad.addColorStop(0.5, '#e67e22');
    bootGrad.addColorStop(1, '#d35400');
    ctx.fillStyle = bootGrad;
    drawRRect(ctx, 32, 0, W - 32, H - 20, 14);
    ctx.fill();

    // Side Grip Ribs
    ctx.fillStyle = '#b84d05';
    for (let ribY = 24; ribY < H - 44; ribY += 12) {
      ctx.fillRect(W - 6, ribY, 4, 6);
    }

    // ── Dark Grey Bezel / Meter Core ──
    const bodyGrad = ctx.createLinearGradient(38, 4, W - 8, H - 24);
    bodyGrad.addColorStop(0, '#2d3436');
    bodyGrad.addColorStop(1, '#1e272e');
    ctx.fillStyle = bodyGrad;
    drawRRect(ctx, 37, 5, W - 43, H - 30, 10);
    ctx.fill();
    ctx.strokeStyle = '#111417';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Brand & Cert Markings
    ctx.fillStyle = '#8395a7';
    ctx.font = 'bold 8px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('TRUE RMS', 45, 17);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#f39c12';
    ctx.fillText('CAT IV 600V', W - 14, 17);

    // ── STN Backlit LCD Screen ──
    const lcdX = 44, lcdY = 22, lcdW = W - 56, lcdH = 50;
    ctx.fillStyle = '#9cb89d';
    drawRRect(ctx, lcdX, lcdY, lcdW, lcdH, 4);
    ctx.fill();
    ctx.strokeStyle = '#6f8a70';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // LCD Inset Bezel Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(lcdX, lcdY, lcdW, 6);

    // ── LCD Annunciators (Top Header Line) ──
    ctx.fillStyle = '#1b2a1c';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'left';

    const showHold = props.hold || rs.isHeld;
    const isRel = props.rel;
    ctx.fillText(props.range_auto !== false ? 'AUTO' : 'MANU', lcdX + 4, lcdY + 10);
    if (showHold) ctx.fillText('HOLD', lcdX + 32, lcdY + 10);
    if (isRel) ctx.fillText('\u0394 REL', lcdX + 58, lcdY + 10);

    ctx.textAlign = 'right';
    ctx.fillText(rs.displayMode || 'DC', lcdX + lcdW - 4, lcdY + 10);

    // ── LCD Main Value ──
    const readoutText = rs.isHeld ? (rs.heldText || '0.000') : (rs.displayText || '0.000');
    const readoutUnit = rs.isHeld ? (rs.heldUnit || 'V') : (rs.displayUnit || 'V');

    // Inactive 7-segment background ghost
    ctx.fillStyle = '#8ca68d';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('8.8.8.8', lcdX + lcdW - 30, lcdY + 36);

    // Active Digits
    ctx.fillStyle = '#0f1710';
    ctx.fillText(readoutText, lcdX + lcdW - 30, lcdY + 36);

    // Unit
    ctx.font = 'bold 10px monospace';
    ctx.fillText(readoutUnit, lcdX + lcdW - 4, lcdY + 36);

    // Continuity Beeper Icon
    if (rs.displayBeep && mode === 'CONT') {
      ctx.fillStyle = '#0f1710';
      ctx.font = 'bold 9px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText('\uD83D\uDD0A BEEP', lcdX + 4, lcdY + 36);
    }

    // ── Analog Segmented Bar Graph ──
    const barSegments = 24;
    const activeSegs = Math.round((rs.barPct || 0) * barSegments);
    const barX = lcdX + 6;
    const barY = lcdY + 42;
    const segW = (lcdW - 14) / barSegments;

    for (let s = 0; s < barSegments; s++) {
      ctx.fillStyle = s < activeSegs ? '#0f1710' : '#8ca68d';
      ctx.fillRect(barX + s * segW, barY, segW - 1.5, 4);
    }

    // ── Functional Softkeys ──
    const _drawButton = (bx, by, bw, bh, text, isPressed) => {
      ctx.fillStyle = isPressed ? '#e74c3c' : '#3d4752';
      drawRRect(ctx, bx, by, bw, bh, 3);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 6px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(text, bx + bw / 2, by + bh - 2.5);
    };

    _drawButton(45, 78, 26, 9, 'HOLD', showHold);
    _drawButton(77, 78, 26, 9, 'RANGE', false);
    _drawButton(109, 78, 26, 9, 'REL \u0394', isRel);
    _drawButton(141, 78, 26, 9, 'SELECT', false);

    // ── 3D Physical Rotary Dial ──
    const dialX = W / 2 + 10;
    const dialY = 120;
    const dialR = 21;

    ctx.fillStyle = '#171a1e';
    ctx.beginPath(); ctx.arc(dialX, dialY, dialR + 2, 0, Math.PI * 2); ctx.fill();

    const dialGrad = ctx.createLinearGradient(dialX - dialR, dialY - dialR, dialX + dialR, dialY + dialR);
    dialGrad.addColorStop(0, '#485460');
    dialGrad.addColorStop(0.5, '#2d3436');
    dialGrad.addColorStop(1, '#1e272e');
    ctx.fillStyle = dialGrad;
    ctx.beginPath(); ctx.arc(dialX, dialY, dialR, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();

    const modeAngles = {
      V_DC: -120, V_AC: -85, MV_DC: -50, RES: -15,
      CONT: 20, DIODE: 55, A_DC: 90, A_AC: 125,
    };
    const curAngleDeg = modeAngles[mode] || -120;
    const rad = (curAngleDeg * Math.PI) / 180;

    ctx.save();
    ctx.translate(dialX, dialY);
    ctx.rotate(rad);
    ctx.fillStyle = '#ff3838';
    ctx.fillRect(-2, -dialR + 2, 4, 12);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.font = 'bold 7px system-ui, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('V\u23C1', dialX - 25, dialY - 14);
    ctx.fillText('V~', dialX - 16, dialY - 25);
    ctx.fillText('\u03A9', dialX + 16, dialY - 25);
    ctx.fillText('\uD83D\uDD0A', dialX + 27, dialY - 14);
    ctx.fillText('A', dialX + 28, dialY + 14);
    ctx.fillText('OFF', dialX - 26, dialY + 14);

    // ── Bottom Lead Wires & Banana Plug Terminals ──
    const _drawBottomLead = (lx, ly, color, label) => {
      // Vertical wire from body bottom to pin
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(lx, H - 20); ctx.lineTo(lx, ly); ctx.stroke();

      // Banana plug strain boot
      ctx.fillStyle = '#1c1f24';
      drawRRect(ctx, lx - 8, H - 20, 16, 10, 2);
      ctx.fill();

      // Terminal Contact ring
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.arc(lx, H - 20, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(lx, H - 20, 5, 0, Math.PI * 2); ctx.fill();

      // Gold contact bore
      ctx.fillStyle = '#d4af37';
      ctx.beginPath(); ctx.arc(lx, H - 20, 2.5, 0, Math.PI * 2); ctx.fill();

      // Label under terminal
      ctx.fillStyle = color;
      ctx.font = 'bold 6px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, lx, H - 8);
    };

    _drawBottomLead(72, 180, '#eccc68', '10A');
    _drawBottomLead(110, 180, '#2f3542', 'COM');
    _drawBottomLead(148, 180, '#ff3838', 'V\u03A9');

    // Selection Highlight
    if (inst.selected && typeof drawSelectionRect === 'function') {
      drawSelectionRect(ctx, 28, -4, W - 20, H + 4);
    }

    ctx.restore();
  }
});