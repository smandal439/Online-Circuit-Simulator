#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'js', 'simulator.js');
let src = fs.readFileSync(filePath, 'utf8');

// Find and remove EXAMPLE_CIRCUITS
const circuitsStart = src.indexOf('\nconst EXAMPLE_CIRCUITS = {');
const sketchesStart = src.indexOf('\nconst EXAMPLE_SKETCHES = [');
const sketchesEnd = src.lastIndexOf('];') + 2;

if (circuitsStart !== -1 && sketchesEnd !== -1) {
  // Remove from EXAMPLE_CIRCUITS start to EXAMPLE_SKETCHES end
  src = src.slice(0, circuitsStart) + '\n/* Examples are now loaded from the examples/ folder as individual JSON files. */\n' + src.slice(sketchesEnd + 1);
  
  fs.writeFileSync(filePath, src, 'utf8');
  console.log('Removed EXAMPLE_CIRCUITS and EXAMPLE_SKETCHES from simulator.js');
} else {
  console.log('Could not find the blocks to remove');
}
