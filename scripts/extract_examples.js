#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'simulator.js'), 'utf8');

// Extract EXAMPLE_CIRCUITS block
const circuitsStart = src.indexOf('const EXAMPLE_CIRCUITS = {');
const circuitsEnd = src.indexOf('};', circuitsStart) + 2;
const circuitsCode = src.slice(circuitsStart, circuitsEnd);

// Extract EXAMPLE_SKETCHES block
const sketchesStart = src.indexOf('const EXAMPLE_SKETCHES = [');
const sketchesEnd = src.lastIndexOf('];') + 2;
const sketchesCode = src.slice(sketchesStart, sketchesEnd);

// Evaluate in a sandbox
const sandbox = {};
const fn = new Function('return function(){' + circuitsCode + '\n' + sketchesCode + '\nreturn {EXAMPLE_CIRCUITS, EXAMPLE_SKETCHES};}');
const getter = fn();
const { EXAMPLE_CIRCUITS, EXAMPLE_SKETCHES } = getter();

const outDir = path.join(__dirname, '..', 'examples');

for (const sketch of EXAMPLE_SKETCHES) {
  const circuit = sketch.circuit;
  const data = {
    id: sketch.id,
    name: sketch.name,
    icon: sketch.icon,
    desc: sketch.desc,
    tags: sketch.tags,
    circuit: circuit,
    code: sketch.code,
  };
  const filePath = path.join(outDir, `${sketch.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Created ${sketch.id}.json`);
}

console.log(`\nDone! Created ${EXAMPLE_SKETCHES.length} example files.`);
