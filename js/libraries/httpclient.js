window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['HTTPClient'] = {
  classes: ['HTTPClient'],
  transpile: [
    [/^HTTPClient\s+(\w+)\s*;/gm, function(m, v) {
      return 'var ' + v + ' = _a.httpNew();';
    }],
    [/\b(\w+)\.begin\s*\(\s*([^)]+)\)\s*;/g, function(m, v, url) {
      if (/^(http|client)/i.test(v)) return '_a.httpBegin(' + v + ', ' + url + ');';
      return m;
    }],
    [/\b(\w+)\.setTimeout\s*\(\s*([^)]+)\)\s*;/g, function(m, v, ms) {
      if (/^(http|client)/i.test(v)) return '_a.httpSetTimeout(' + v + ', ' + ms + ');';
      return m;
    }],
    [/\b(\w+)\.GET\s*\(\s*\)\s*;/g, function(m, v) {
      if (/^(http|client)/i.test(v)) return '_a.httpGet(' + v + ');';
      return m;
    }],
    [/\b(\w+)\.GET\s*\(\s*\)/g, function(m, v) {
      if (/^(http|client)/i.test(v)) return '_a.httpGet(' + v + ')';
      return m;
    }],
    [/\b(\w+)\.getStreamPtr\s*\(\s*\)\s*;/g, function(m, v) {
      if (/^(http|client)/i.test(v)) return '_a.httpGetStream(' + v + ');';
      return m;
    }],
    [/\b(\w+)\.getStreamPtr\s*\(\s*\)/g, function(m, v) {
      if (/^(http|client)/i.test(v)) return '_a.httpGetStream(' + v + ')';
      return m;
    }],
    [/\b(\w+)\.end\s*\(\s*\)\s*;/g, function(m, v) {
      if (/^(http|client)/i.test(v)) return '_a.httpEnd(' + v + ');';
      return m;
    }],
  ],
  constants: {},
  constructor: function(args) { return {}; },
};
