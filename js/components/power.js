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
