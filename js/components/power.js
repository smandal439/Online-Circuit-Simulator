/*
 * components/power.js — Power component definitions
 */

'use strict';
/* â”€â”€â”€ Power Supply â”€â”€â”€ */
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
