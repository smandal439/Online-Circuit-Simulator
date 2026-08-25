/*
 * components/power.js — Power component definitions
 */

'use strict';
/*--------------------------- Power Supply------------------------------------- */
defComp({
  id: 'power_5v',
  name: '5V Power',
  category: 'Power',
  icon: '⚡',
  desc: '5V DC power supply terminal',
  width: 30,
  height: 30,
  defaultProps: {},
  pins: [
    { id: 'vcc', label: '5V', type: PIN_TYPE.POWER, x: 15, y: 30, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#cc3333';
    roundRect(ctx, 2, 2, 26, 22, 4);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('5V', 15, 16);
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(15, 24); ctx.lineTo(15, 30); ctx.stroke();
    if (inst.selected) drawSelectionRect(ctx, -2, -2, 34, 34);
    ctx.restore();
  }
});

defComp({
  id: 'power_gnd',
  name: 'GND',
  category: 'Power',
  icon: '⏚',
  desc: 'Ground (GND) reference terminal',
  width: 30,
  height: 30,
  defaultProps: {},
  pins: [
    { id: 'gnd', label: 'GND', type: PIN_TYPE.GND, x: 15, y: 0, side: 'top' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(15, 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4, 12); ctx.lineTo(26, 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, 17); ctx.lineTo(22, 17); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(12, 22); ctx.lineTo(18, 22); ctx.stroke();
    ctx.fillStyle = '#888';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GND', 15, 30);
    if (inst.selected) drawSelectionRect(ctx, -2, -2, 34, 34);
    ctx.restore();
  }
});

/* -------------- MB102 Breadboard Power Supply Module (3.3V / 5V Dual Rail) ------------------ */
defComp({
  id: 'mb102_power',
  name: 'MB102 Power Supply',
  category: 'Power',
  icon: '⚡',
  desc: 'MB102 3.3V/5V breadboard power supply module with DC barrel jack, USB-A input/output, dual AMS1117 regulators, and rail selector jumpers',
  width: 160,
  height: 96,
  defaultProps: {
    powered: 1,
    topVoltage: '5V',
    bottomVoltage: '3.3V',
  },
  interactive: [
    { field: 'powered',       label: 'Power Switch', min: 0, max: 1, step: 1, unit: '' },
    { field: 'topVoltage',    label: 'Top Rail',     type: 'select', options: ['OFF', '3.3V', '5V'] },
    { field: 'bottomVoltage', label: 'Bottom Rail',  type: 'select', options: ['OFF', '3.3V', '5V'] },
  ],
  pins: [
    { id: 'vcc_t', label: 'VCC_TOP', type: PIN_TYPE.POWER, x: 148, y: 12, side: 'top' },
    { id: 'gnd_t', label: 'GND_TOP', type: PIN_TYPE.GND,   x: 148, y: 22, side: 'top' },
    { id: 'aux_gnd', label: 'GND',  type: PIN_TYPE.GND,   x: 104, y: 44, side: 'right' },
    { id: 'aux_3v3', label: '3.3V', type: PIN_TYPE.POWER, x: 104, y: 52, side: 'right' },
    { id: 'aux_5v',  label: '5V',   type: PIN_TYPE.POWER, x: 104, y: 60, side: 'right' },
    { id: 'vcc_b', label: 'VCC_BOT', type: PIN_TYPE.POWER, x: 148, y: 74, side: 'bottom' },
    { id: 'gnd_b', label: 'GND_BOT', type: PIN_TYPE.GND,   x: 148, y: 84, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const isPowered = Boolean(inst.runtimeState?.powered ?? inst.props.powered ?? 1);
    const topV = inst.props.topVoltage ?? '5V';
    const botV = inst.props.bottomVoltage ?? '3.3V';

    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = '#14171a';
    roundRect(ctx, 4, 4, 152, 88, 5);
    ctx.fill();

    ctx.strokeStyle = '#222830';
    ctx.lineWidth = 1.2;
    roundRect(ctx, 6, 6, 148, 84, 4);
    ctx.stroke();

    const holes = [[8, 8], [8, 88], [152, 8], [152, 88]];
    holes.forEach(([hx, hy]) => {
      ctx.fillStyle = '#c8a452';
      ctx.beginPath(); ctx.arc(hx, hy, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0a0d10';
      ctx.beginPath(); ctx.arc(hx, hy, 1.8, 0, Math.PI * 2); ctx.fill();
    });

    const jackGrad = ctx.createLinearGradient(6, 10, 6, 36);
    jackGrad.addColorStop(0, '#2e3238');
    jackGrad.addColorStop(0.5, '#191b1e');
    jackGrad.addColorStop(1, '#0e1012');
    ctx.fillStyle = jackGrad;
    roundRect(ctx, 6, 10, 32, 24, 2);
    ctx.fill();

    ctx.strokeStyle = '#8a939e';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(6, 12, 5, 20);

    ctx.fillStyle = '#08080a';
    ctx.beginPath(); ctx.arc(6, 22, 6.5, -Math.PI / 2, Math.PI / 2); ctx.fill();

    ctx.fillStyle = '#d4af37';
    ctx.beginPath(); ctx.arc(6, 22, 2.2, -Math.PI / 2, Math.PI / 2); ctx.fill();

    const usbGrad = ctx.createLinearGradient(6, 48, 6, 78);
    usbGrad.addColorStop(0, '#dce3eb');
    usbGrad.addColorStop(0.3, '#bcc5cf');
    usbGrad.addColorStop(0.7, '#8f9aa6');
    usbGrad.addColorStop(1, '#5f6974');
    ctx.fillStyle = usbGrad;
    roundRect(ctx, 6, 48, 30, 26, 2);
    ctx.fill();

    ctx.fillStyle = '#1c2024';
    ctx.fillRect(6, 52, 4, 18);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(14, 55, 6, 4);
    ctx.fillRect(14, 63, 6, 4);

    ctx.fillStyle = '#1e2227';
    roundRect(ctx, 44, 26, 18, 18, 2);
    ctx.fill();
    ctx.strokeStyle = '#424952';
    ctx.lineWidth = 1;
    ctx.stroke();

    const btnRadius = isPowered ? 5.8 : 6.8;
    const btnGrad = ctx.createRadialGradient(53, 35, 1, 53, 35, btnRadius);
    btnGrad.addColorStop(0, isPowered ? '#ff5252' : '#d32f2f');
    btnGrad.addColorStop(0.7, isPowered ? '#d50000' : '#9a0007');
    btnGrad.addColorStop(1, '#5c0000');
    ctx.fillStyle = btnGrad;
    ctx.beginPath();
    ctx.arc(53, 35, btnRadius, 0, Math.PI * 2);
    ctx.fill();

    const regulators = [
      { label: 'AMS1117\n5.0', y: 15 },
      { label: 'AMS1117\n3.3', y: 55 }
    ];

    regulators.forEach(reg => {
      ctx.fillStyle = '#cfd8dc';
      roundRect(ctx, 68, reg.y - 3, 14, 3, 0.5);
      ctx.fill();

      ctx.fillStyle = '#1e2022';
      roundRect(ctx, 67, reg.y, 16, 15, 1.5);
      ctx.fill();

      ctx.fillStyle = '#b0bec5';
      ctx.fillRect(68.5, reg.y + 15, 2.5, 3);
      ctx.fillRect(73.5, reg.y + 15, 2.5, 3);
      ctx.fillRect(78.5, reg.y + 15, 2.5, 3);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = 'bold 3.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      const lines = reg.label.split('\n');
      ctx.fillText(lines[0], 75, reg.y + 6);
      ctx.fillText(lines[1], 75, reg.y + 11);
    });

    const caps = [{ x: 50, y: 64 }, { x: 50, y: 78 }];
    caps.forEach(cap => {
      const capGrad = ctx.createRadialGradient(cap.x, cap.y, 1, cap.x, cap.y, 5);
      capGrad.addColorStop(0, '#546e7a');
      capGrad.addColorStop(0.7, '#263238');
      capGrad.addColorStop(1, '#101416');
      ctx.fillStyle = capGrad;
      ctx.beginPath(); ctx.arc(cap.x, cap.y, 5, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#cfd8dc';
      ctx.beginPath();
      ctx.arc(cap.x, cap.y, 5, -Math.PI / 4, Math.PI / 4);
      ctx.lineTo(cap.x, cap.y);
      ctx.closePath();
      ctx.fill();
    });

    ctx.fillStyle = '#212529';
    roundRect(ctx, 47, 10, 6, 8, 1);
    ctx.fill();

    if (isPowered) {
      ctx.fillStyle = 'rgba(0, 230, 118, 0.35)';
      ctx.beginPath(); ctx.arc(50, 14, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#00e676';
      ctx.beginPath(); ctx.arc(50, 14, 2.4, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = '#1b5e20';
      ctx.beginPath(); ctx.arc(50, 14, 2.2, 0, Math.PI * 2); ctx.fill();
    }

    function drawJumperBlock(jx, jy, selectedVal) {
      ctx.fillStyle = '#1a1a1a';
      roundRect(ctx, jx - 1, jy - 1, 18, 8, 1);
      ctx.fill();

      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = '#ffd066';
        ctx.beginPath(); ctx.arc(jx + 2.5 + i * 5.5, jy + 3, 1.2, 0, Math.PI * 2); ctx.fill();
      }

      ctx.fillStyle = '#fbc02d';
      ctx.strokeStyle = '#c49000';
      ctx.lineWidth = 0.5;

      if (selectedVal === '5V') {
        roundRect(ctx, jx + 0.5, jy + 0.5, 9, 5, 1);
        ctx.fill(); ctx.stroke();
      } else if (selectedVal === '3.3V') {
        roundRect(ctx, jx + 6, jy + 0.5, 9, 5, 1);
        ctx.fill(); ctx.stroke();
      }
    }

    drawJumperBlock(96, 18, topV);
    drawJumperBlock(96, 72, botV);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = 'bold 5.5px "JetBrains Mono", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MB-102', 124, 42);
    ctx.fillText('POWER MODULE', 124, 49);

    ctx.font = 'bold 4.5px "JetBrains Mono", sans-serif';
    ctx.fillText('ON/OFF', 53, 49);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.font = 'bold 4px "JetBrains Mono", monospace';
    ctx.fillText('5V  OFF 3V3', 105, 14);
    ctx.fillText('5V  OFF 3V3', 105, 85);

    const railPins = [
      { label: '+', color: '#e53935', x: 148, y: 12 },
      { label: '-', color: '#1e88e5', x: 148, y: 22 },
      { label: '+', color: '#e53935', x: 148, y: 74 },
      { label: '-', color: '#1e88e5', x: 148, y: 84 },
    ];

    railPins.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.font = 'bold 8px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(p.label, p.x - 7, p.y + 3);

      ctx.fillStyle = '#c8a452';
      ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#ffd066';
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2); ctx.fill();
    });

    ctx.fillStyle = '#1c1c1c';
    roundRect(ctx, 92, 38, 16, 24, 1.5);
    ctx.fill();

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 2; c++) {
        ctx.fillStyle = '#ffd066';
        ctx.beginPath();
        ctx.arc(96 + c * 8, 42 + r * 5.5, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (inst.selected) drawSelectionRect(ctx, 0, 0, 160, 96);
    ctx.restore();
  }
});

/* -------------- Programmable Benchtop DC Power Supply (0–32V / 0–5A) ------------------ */
defComp({
  id: 'bench_power_supply',
  name: 'Benchtop Power Supply',
  category: 'Power',
  icon: '🎛️',
  desc: 'Precision adjustable 0–32V / 0–5A DC benchtop power supply with digital LED readout, Constant Voltage (CV) / Constant Current (CC) modes, and 4mm banana binding posts',
  width: 270,
  height: 200,
  defaultProps: {
    powered: 1,
    outputEnabled: 1,
    voltageSet: 12.0,
    currentLimit: 2.5,
    actualCurrent: 0.0,
    mode: 'CV',
  },
  interactive: [
    { field: 'powered',       label: 'Power',   type: 'toggle', min: 0, max: 1, step: 1, unit: '', inline: { x: 78, y: 138, w: 32, h: 42 } },
    { field: 'outputEnabled', label: 'Output',  type: 'toggle', min: 0, max: 1, step: 1, unit: '', inline: { x: 26, y: 138, w: 32, h: 42 } },
    { field: 'voltageSet',    label: 'Voltage',  min: 0.0, max: 32.0, step: 0.1, unit: 'V' },
    { field: 'currentLimit',  label: 'Current',  min: 0.0, max: 5.0,  step: 0.05, unit: 'A' },
  ],
  pins: [
    { id: 'POS', label: '+ (0-32V)', type: PIN_TYPE.POWER, x: 195, y: 172, side: 'bottom' },
    { id: 'GND', label: 'EARTH ⏚',   type: PIN_TYPE.GND,   x: 222, y: 172, side: 'bottom' },
    { id: 'NEG', label: '- (GND)',   type: PIN_TYPE.GND,   x: 249, y: 172, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const isPowered = Boolean(inst.runtimeState?.powered ?? inst.props.powered ?? 1);
    const isOutOn = isPowered && Boolean(inst.runtimeState?.outputEnabled ?? inst.props.outputEnabled ?? 1);
    const vSet = Number(inst.runtimeState?.voltageSet ?? inst.props.voltageSet ?? 12.0);
    const iLim = Number(inst.runtimeState?.currentLimit ?? inst.props.currentLimit ?? 2.5);
    const iAct = isOutOn ? Number(inst.runtimeState?.actualCurrent ?? inst.props.actualCurrent ?? 0.0) : 0.0;
    const mode = inst.runtimeState?.mode ?? inst.props.mode ?? 'CV';
    const pOut = isOutOn ? vSet * iAct : 0.0;

    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = '#1c2024';
    roundRect(ctx, 0, 0, 270, 200, 8);
    ctx.fill();

    const panelGrad = ctx.createLinearGradient(0, 4, 0, 196);
    panelGrad.addColorStop(0, '#32383e');
    panelGrad.addColorStop(0.3, '#262b30');
    panelGrad.addColorStop(1, '#1e2226');
    ctx.fillStyle = panelGrad;
    roundRect(ctx, 4, 4, 262, 192, 6);
    ctx.fill();

    ctx.fillStyle = '#0f1214';
    roundRect(ctx, 8, 2, 26, 4, 1); ctx.fill();
    roundRect(ctx, 236, 2, 26, 4, 1); ctx.fill();
    roundRect(ctx, 8, 194, 26, 4, 1); ctx.fill();
    roundRect(ctx, 236, 194, 26, 4, 1); ctx.fill();

    ctx.fillStyle = '#eceff1';
    ctx.font = 'bold 9px "JetBrains Mono", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('DC POWER SUPPLY', 14, 18);

    ctx.fillStyle = '#78909c';
    ctx.font = 'bold 7px "JetBrains Mono", monospace';
    ctx.fillText('DPS-3205 PRO • 32V / 5A', 14, 28);

    ctx.fillStyle = '#121518';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(190 + i * 16, 14, 11, 2.5);
    }

    ctx.fillStyle = '#0a0d0f';
    roundRect(ctx, 12, 34, 160, 96, 4);
    ctx.fill();
    ctx.strokeStyle = '#455a64';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (isPowered) {
      ctx.font = 'bold 24px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';

      ctx.fillStyle = 'rgba(0, 229, 255, 0.06)';
      ctx.fillText('88.88', 115, 68);
      ctx.fillStyle = 'rgba(0, 230, 118, 0.06)';
      ctx.fillText('8.888', 115, 98);
      ctx.fillStyle = 'rgba(255, 171, 0, 0.06)';
      ctx.font = 'bold 15px "JetBrains Mono", monospace';
      ctx.fillText('888.8', 115, 122);

      ctx.fillStyle = isOutOn ? '#00e5ff' : '#0097a7';
      ctx.font = 'bold 24px "JetBrains Mono", monospace';
      ctx.fillText(vSet.toFixed(2).padStart(5, '0'), 115, 68);

      ctx.fillStyle = isOutOn ? '#00e676' : '#2e7d32';
      ctx.fillText(iAct.toFixed(3), 115, 98);

      ctx.fillStyle = isOutOn ? '#ffab00' : '#c67c00';
      ctx.font = 'bold 15px "JetBrains Mono", monospace';
      ctx.fillText(pOut.toFixed(2).padStart(5, '0'), 115, 122);

      ctx.font = 'bold 13px "JetBrains Mono", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#00e5ff'; ctx.fillText('V', 122, 66);
      ctx.fillStyle = '#00e676'; ctx.fillText('A', 122, 96);
      ctx.font = 'bold 10px "JetBrains Mono", sans-serif';
      ctx.fillStyle = '#ffab00'; ctx.fillText('W', 122, 121);

      const isCV = mode === 'CV' && isOutOn;
      ctx.fillStyle = isCV ? '#00e676' : '#1b3a24';
      ctx.beginPath(); ctx.arc(148, 50, 3, 0, Math.PI * 2); ctx.fill();
      if (isCV) { ctx.fillStyle = 'rgba(0, 230, 118, 0.4)'; ctx.beginPath(); ctx.arc(148, 50, 6, 0, Math.PI * 2); ctx.fill(); }
      ctx.font = 'bold 6.5px "JetBrains Mono", sans-serif';
      ctx.fillStyle = isCV ? '#ffffff' : '#546e7a';
      ctx.fillText('CV', 154, 52);

      const isCC = mode === 'CC' && isOutOn;
      ctx.fillStyle = isCC ? '#ff1744' : '#3a141a';
      ctx.beginPath(); ctx.arc(148, 64, 3, 0, Math.PI * 2); ctx.fill();
      if (isCC) { ctx.fillStyle = 'rgba(255, 23, 68, 0.4)'; ctx.beginPath(); ctx.arc(148, 64, 6, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = isCC ? '#ffffff' : '#546e7a';
      ctx.fillText('CC', 154, 66);

      ctx.fillStyle = isOutOn ? '#29b6f6' : '#132836';
      ctx.beginPath(); ctx.arc(148, 78, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = isOutOn ? '#ffffff' : '#546e7a';
      ctx.fillText('ON', 154, 80);
    } else {
      ctx.fillStyle = '#1a2327';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('— STANDBY —', 92, 85);
    }

    function drawRotaryKnob(kx, ky, label, valueText, accentColor) {
      ctx.fillStyle = '#181b1e';
      ctx.beginPath(); ctx.arc(kx, ky, 19, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = '#37474f';
      ctx.lineWidth = 1;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
        ctx.beginPath();
        ctx.moveTo(kx + Math.cos(a) * 16, ky + Math.sin(a) * 16);
        ctx.lineTo(kx + Math.cos(a) * 19, ky + Math.sin(a) * 19);
        ctx.stroke();
      }

      const knobGrad = ctx.createRadialGradient(kx - 4, ky - 4, 1, kx, ky, 15);
      knobGrad.addColorStop(0, '#cfd8dc');
      knobGrad.addColorStop(0.5, '#90a4ae');
      knobGrad.addColorStop(1, '#455a64');
      ctx.fillStyle = knobGrad;
      ctx.beginPath(); ctx.arc(kx, ky, 15, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = accentColor;
      ctx.beginPath(); ctx.arc(kx + 9, ky - 6, 2, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#b0bec5';
      ctx.font = 'bold 7.5px "JetBrains Mono", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, kx, ky + 28);

      ctx.fillStyle = accentColor;
      ctx.font = 'bold 7px "JetBrains Mono", monospace';
      ctx.fillText(valueText, kx, ky - 23);
    }

    drawRotaryKnob(220, 56, 'VOLTAGE', `${vSet.toFixed(1)}V`, '#00e5ff');
    drawRotaryKnob(220, 116, 'CURRENT', `${iLim.toFixed(2)}A`, '#00e676');

    function drawToggleSwitch(tx, ty, tw, th, isOn, label) {
      // Background plate
      ctx.fillStyle = '#0e1114';
      roundRect(ctx, tx, ty, tw, th, 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(80,90,100,0.4)';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Track groove
      const trackW = tw * 0.7;
      const trackH = 8;
      const trackX = tx + (tw - trackW) / 2;
      const trackY = ty + th / 2 - 2;
      ctx.fillStyle = '#080a0c';
      roundRect(ctx, trackX, trackY, trackW, trackH, trackH / 2);
      ctx.fill();

      // Lit fill when ON
      if (isOn) {
        const grad = ctx.createLinearGradient(trackX, 0, trackX + trackW, 0);
        grad.addColorStop(0, 'rgba(0,230,118,0.2)');
        grad.addColorStop(1, 'rgba(0,230,118,0.65)');
        ctx.fillStyle = grad;
        roundRect(ctx, trackX, trackY, trackW, trackH, trackH / 2);
        ctx.fill();
      }

      // Thumb
      const thumbR = 5;
      const thumbX = isOn ? trackX + trackW - thumbR - 1 : trackX + thumbR + 1;
      const thumbY = trackY + trackH / 2;
      if (isFinite(thumbX) && isFinite(thumbY)) {
        const thumbGrad = ctx.createRadialGradient(thumbX - 1, thumbY - 1, 0.5, thumbX, thumbY, thumbR);
        thumbGrad.addColorStop(0, isOn ? '#c8e6c9' : '#b0bec5');
        thumbGrad.addColorStop(1, isOn ? '#2e7d32' : '#546e7a');
        ctx.fillStyle = thumbGrad;
        ctx.beginPath();
        ctx.arc(thumbX, thumbY, thumbR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }

      // Status LED
      const ledX = tx + tw / 2;
      const ledY = ty + 5;
      ctx.fillStyle = isOn ? '#00e676' : '#1b3a24';
      ctx.beginPath(); ctx.arc(ledX, ledY, 2, 0, Math.PI * 2); ctx.fill();
      if (isOn) {
        ctx.fillStyle = 'rgba(0,230,118,0.3)';
        ctx.beginPath(); ctx.arc(ledX, ledY, 4.5, 0, Math.PI * 2); ctx.fill();
      }

      // Label below
      ctx.fillStyle = isOn ? '#eceff1' : '#78909c';
      ctx.font = 'bold 5.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, tx + tw / 2, ty + th - 3);
    }

    drawToggleSwitch(78, 138, 32, 42, isPowered, 'POWER');
    drawToggleSwitch(26, 138, 32, 42, isOutOn, 'OUTPUT');

    function drawBindingPost(bx, by, colorHex, rimColor, symbol, label) {
      ctx.fillStyle = '#14181b';
      ctx.beginPath(); ctx.arc(bx, by, 11, 0, Math.PI * 2); ctx.fill();

      const postGrad = ctx.createRadialGradient(bx - 3, by - 3, 2, bx, by, 9);
      postGrad.addColorStop(0, rimColor);
      postGrad.addColorStop(0.7, colorHex);
      postGrad.addColorStop(1, '#0d1012');
      ctx.fillStyle = postGrad;
      ctx.beginPath(); ctx.arc(bx, by, 9, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#d4af37';
      ctx.beginPath(); ctx.arc(bx, by, 4.5, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#08080a';
      ctx.beginPath(); ctx.arc(bx, by, 2.8, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#eceff1';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(symbol, bx, by + 18);

      ctx.fillStyle = '#78909c';
      ctx.font = 'bold 5.5px "JetBrains Mono", sans-serif';
      ctx.fillText(label, bx, by - 14);
    }

    drawBindingPost(195, 154, '#d50000', '#ff5252', '+', 'POS');
    drawBindingPost(222, 154, '#2e7d32', '#00e676', '⏚', 'EARTH');
    drawBindingPost(249, 154, '#212121', '#546e7a', '−', 'NEG');

    if (inst.selected) drawSelectionRect(ctx, -2, -2, 274, 204);
    ctx.restore();
  }
});
