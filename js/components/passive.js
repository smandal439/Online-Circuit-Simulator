/*
 * components/passive.js — Passive component definitions
 */

'use strict';
/* â”€â”€â”€ RESISTOR â”€â”€â”€ */
defComp({
  id: 'resistor',
  name: 'Resistor',
  category: 'Passive',
  icon: '⬛',
  desc: 'Fixed value resistor with color band marking',
  width: 20,
  height: 60,
  defaultProps: { value: 220, unit: 'Î©' },
  pins: [
    { id: 'p1', label: '1', type: PIN_TYPE.SIGNAL, x: 10, y:  0, side: 'top' },
    { id: 'p2', label: '2', type: PIN_TYPE.SIGNAL, x: 10, y: 60, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    const val = inst.props.value || 220;
    const bands = resistorBands(val);

    ctx.save();
    ctx.translate(x, y);

    // Lead wires
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(10, 0);  ctx.lineTo(10, 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, 44); ctx.lineTo(10, 60); ctx.stroke();

    // Body
    ctx.fillStyle = '#d4c4a0';
    roundRect(ctx, 2, 16, 16, 28, 3);
    ctx.fill();
    ctx.strokeStyle = '#b0a080';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Color bands
    const bandX = [5, 9, 13, 17];
    const bandColors = [...bands, '#c0a040'];
    bandColors.forEach((col, i) => {
      if (i >= 4) return;
      ctx.fillStyle = col;
      ctx.fillRect(bandX[i], 16, 3, 28);
    });

    // Tolerance band (last)
    ctx.fillStyle = '#c0a040';
    ctx.fillRect(17, 20, 3, 20);

    // Value label
    ctx.fillStyle = '#555';
    ctx.font = '7px sans-serif';
    ctx.textAlign = 'center';
    ctx.save();
    ctx.translate(10, 30);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.font = 'bold 6px sans-serif';
    ctx.fillText(formatResistance(val), 0, 2);
    ctx.restore();

    if (inst.selected) drawSelectionRect(ctx, -3, -3, 26, 66);
    ctx.restore();
  }
});

/*----------------Capacitor -------------- */
defComp({
  id: 'capacitor',
  name: 'Capacitor',
  category: 'Passive',
  icon: '⚡',
  desc: 'Electrolytic capacitor — stores electrical charge between two plates',
  width: 20,
  height: 60,
  defaultProps: { value: 100, unit: 'ÂµF' },
  pins: [
    { id: 'pos', label: '+', type: PIN_TYPE.SIGNAL, x: 10, y:  0, side: 'top' },
    { id: 'neg', label: 'âˆ’', type: PIN_TYPE.GND,    x: 10, y: 60, side: 'bottom' },
  ],
  draw(ctx, inst, sim) {
    const { x, y } = inst;
    ctx.save();
    ctx.translate(x, y);
    // Leads
    ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(10, 0);  ctx.lineTo(10, 22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, 38); ctx.lineTo(10, 60); ctx.stroke();
    // Plates
    ctx.strokeStyle = '#aaa'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(2, 22); ctx.lineTo(18, 22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2, 30); ctx.lineTo(18, 30); ctx.stroke();
    // + mark
    ctx.fillStyle = '#aaa';
    ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('+', 4, 22);
    // Body curve
    ctx.strokeStyle = '#888'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(10, 30, 8, 0, Math.PI);
    ctx.stroke();
    // Value
    ctx.fillStyle = '#888'; ctx.font = '6px sans-serif';
    ctx.save(); ctx.translate(10, 34); ctx.rotate(-Math.PI/2);
    ctx.fillText((inst.props.value||100)+(inst.props.unit||'ÂµF'), 0, 2);
    ctx.restore();
    if (inst.selected) drawSelectionRect(ctx, -3, -3, 26, 66);
    ctx.restore();
  }
});

/* --------BREADBOARD (Realistic Half-Size / 400 Tie-Points)----------- */
defComp({
  id: 'breadboard',
  name: 'Breadboard',
  category: 'Passive',
  icon: '🟦',
  desc: '400 tie-point solderless breadboard for prototyping',
  width: 580,
  height: 220,
  defaultProps: {},
  pins: [], // Dynamic â€” breadboard holes
  draw(ctx, inst, sim) {
    const { x, y, width: W, height: H } = inst;
    ctx.save();
    ctx.translate(x, y);

    // --- 1. Main Plastic Body ---
    // Outer drop shadow & bevel base
    ctx.fillStyle = '#e8e5dc';
    roundRect(ctx, 0, 0, W, H, 8);
    ctx.fill();

    // Top surface (warm off-white plastic)
    const bodyGrad = ctx.createLinearGradient(0, 0, 0, H);
    bodyGrad.addColorStop(0, '#faf8f3');
    bodyGrad.addColorStop(1, '#f1ede4');
    ctx.fillStyle = bodyGrad;
    roundRect(ctx, 2, 2, W - 4, H - 4, 6);
    ctx.fill();

    // Subtle edge border
    ctx.strokeStyle = '#c8c4b7';
    ctx.lineWidth = 1.2;
    roundRect(ctx, 0.5, 0.5, W - 1, H - 1, 8);
    ctx.stroke();

    // Side interlocking tabs & notches
    ctx.fillStyle = '#dfdbd0';
    // Left notch
    roundRect(ctx, -2, H / 2 - 12, 4, 24, 2);
    ctx.fill();
    // Right tab
    roundRect(ctx, W - 2, H / 2 - 12, 4, 24, 2);
    ctx.fill();

    // --- 2. Center DIP Groove / Trough ---
    const midY = H / 2;
    const grooveH = 10;
    const grooveGrad = ctx.createLinearGradient(0, midY - grooveH / 2, 0, midY + grooveH / 2);
    grooveGrad.addColorStop(0, '#c2beb3');
    grooveGrad.addColorStop(0.3, '#d8d4c8');
    grooveGrad.addColorStop(0.7, '#e8e5dc');
    grooveGrad.addColorStop(1, '#ffffff');
    ctx.fillStyle = grooveGrad;
    ctx.fillRect(18, midY - grooveH / 2, W - 36, grooveH);

    // --- 3. Power Rail Stripes & Indicators ---
    const railX1 = 34;
    const railX2 = W - 34;

    // Top rails (+ Red, - Blue)
    ctx.strokeStyle = '#df3838';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(railX1, 13);
    ctx.lineTo(railX2, 13);
    ctx.stroke();

    ctx.strokeStyle = '#2b6cd4';
    ctx.beginPath();
    ctx.moveTo(railX1, 37);
    ctx.lineTo(railX2, 37);
    ctx.stroke();

    // Bottom rails (+ Red, - Blue)
    ctx.strokeStyle = '#df3838';
    ctx.beginPath();
    ctx.moveTo(railX1, H - 37);
    ctx.lineTo(railX2, H - 37);
    ctx.stroke();

    ctx.strokeStyle = '#2b6cd4';
    ctx.beginPath();
    ctx.moveTo(railX1, H - 13);
    ctx.lineTo(railX2, H - 13);
    ctx.stroke();

    // Rail polarity labels
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#df3838';
    ctx.fillText('+', 22, 13);
    ctx.fillText('+', W - 22, 13);
    ctx.fillText('+', 22, H - 37);
    ctx.fillText('+', W - 22, H - 37);

    ctx.fillStyle = '#2b6cd4';
    ctx.fillText('âˆ’', 22, 37);
    ctx.fillText('âˆ’', W - 22, 37);
    ctx.fillText('âˆ’', 22, H - 13);
    ctx.fillText('âˆ’', W - 22, H - 13);

    // --- 4. Helper Function to Draw Realistic Sockets ---
    function drawTieHole(hx, hy) {
      // Outer beveled bevel/cavity
      ctx.fillStyle = '#ded9ce';
      ctx.fillRect(hx - 3.5, hy - 3.5, 7, 7);
      // Dark internal socket hole
      ctx.fillStyle = '#1c1b18';
      ctx.fillRect(hx - 2.5, hy - 2.5, 5, 5);
      // Metallic contact clip highlight
      ctx.fillStyle = '#4a4843';
      ctx.fillRect(hx - 1.5, hy - 1, 3, 2);
    }

    // --- 5. Draw 30 Columns & Coordinate System ---
    const cols = 30;
    const startX = 42;
    const stepX = (W - 84) / (cols - 1); // ~17.1px pitch

    // Row positions (a-e upper, f-j lower)
    const upperRowsY = [55, 68, 81, 94, 107];
    const lowerRowsY = [123, 136, 149, 162, 175];
    const rowLabelsUpper = ['a', 'b', 'c', 'd', 'e'];
    const rowLabelsLower = ['f', 'g', 'h', 'i', 'j'];

    // Row Letter Labels
    ctx.fillStyle = '#7a766c';
    ctx.font = '9px sans-serif';

    // Left and Right row labels
    for (let r = 0; r < 5; r++) {
      ctx.fillText(rowLabelsUpper[r], 24, upperRowsY[r]);
      ctx.fillText(rowLabelsUpper[r], W - 24, upperRowsY[r]);
      ctx.fillText(rowLabelsLower[r], 24, lowerRowsY[r]);
      ctx.fillText(rowLabelsLower[r], W - 24, lowerRowsY[r]);
    }

    // Draw Column numbers & Terminal Holes
    for (let col = 0; col < cols; col++) {
      const hx = startX + col * stepX;
      const colNum = col + 1;

      // Silk-screen column numbers (1, 5, 10, 15, 20, 25, 30)
      if (colNum === 1 || colNum % 5 === 0) {
        ctx.fillStyle = '#6b665c';
        ctx.font = 'bold 8.5px sans-serif';
        ctx.fillText(colNum.toString(), hx, 45);
        ctx.fillText(colNum.toString(), hx, H - 45);
      }

      // Upper rows (aâ€“e)
      for (let r = 0; r < 5; r++) {
        drawTieHole(hx, upperRowsY[r]);
      }

      // Lower rows (fâ€“j)
      for (let r = 0; r < 5; r++) {
        drawTieHole(hx, lowerRowsY[r]);
      }
    }

    // --- 6. Power Rail Holes (5-hole groups with separators) ---
    for (let i = 0; i < 25; i++) {
      // Grouping offset to mirror physical breadboards (5 groups of 5)
      const groupOffset = Math.floor(i / 5) * 8;
      const hx = 45 + i * ((W - 122) / 24) + groupOffset;

      // Top power rails (+ and -)
      drawTieHole(hx, 19);
      drawTieHole(hx, 31);

      // Bottom power rails (+ and -)
      drawTieHole(hx, H - 31);
      drawTieHole(hx, H - 19);
    }

    if (inst.selected) drawSelectionRect(ctx, -4, -4, W + 8, H + 8);
    ctx.restore();
  }
});
