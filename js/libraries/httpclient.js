/**
 * HTTPClient Library Plugin for ArduSim
 *
 * Provides HTTP client simulation with synthetic audio stream.
 */
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['HTTPClient'] = {
  classes: ['HTTPClient'],
  includes: ['<HTTPClient.h>'],

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

  runtime: function(self) {
    return {
      httpNew: function() {
        return { _url: '', _timeout: 5000, _stream: null, __http: true };
      },
      httpBegin: function(obj, url) { obj._url = url; },
      httpSetTimeout: function(obj, ms) { obj._timeout = ms; },
      httpGet: function(obj) {
        self._serialLog('[HTTP] GET ' + obj._url + '\n', 'system');
        var url = obj._url;
        if (url && url.startsWith('http')) {
          fetch(url, { mode: 'no-cors', method: 'HEAD' }).then(function() {
            self._serialLog('[HTTP] Server reachable: ' + url + '\n', 'system');
          }).catch(function() {
            self._serialLog('[HTTP] Using simulated audio (CORS/network)\n', 'system');
          });
        }
        var sr = 44100, dur = 10, channels = 2, bps = 2;
        var totalSamples = sr * dur * channels;
        var buf = new ArrayBuffer(totalSamples * bps);
        var view = new Int16Array(buf);
        for (var i = 0; i < totalSamples; i += 2) {
          var t = (i / 2) / sr;
          var s = 0;
          s += 6000 * Math.sin(2 * Math.PI * 262 * t);
          s += 4000 * Math.sin(2 * Math.PI * 330 * t);
          s += 3000 * Math.sin(2 * Math.PI * 392 * t);
          s += 2000 * Math.sin(2 * Math.PI * 523 * t);
          s += 1500 * Math.sin(2 * Math.PI * 659 * t);
          s *= 1 + 0.03 * Math.sin(2 * Math.PI * 5 * t);
          var env = Math.min(t * 4, 1) * Math.min((dur - t) * 4, 1);
          s = Math.round(Math.max(-32000, Math.min(32000, s * env)));
          view[i] = s;
          view[i + 1] = s;
        }
        obj._stream = new Uint8Array(buf);
        obj._streamPos = 0;
        return 200;
      },
      httpGetStream: function(obj) {
        var hasStream = !!(obj && obj._stream);
        var pos = obj ? obj._streamPos : -1;
        var len = obj && obj._stream ? obj._stream.length : 0;
        self._serialLog('[HTTP] getStreamPtr: stream=' + hasStream + ' pos=' + pos + ' len=' + len + '\n', 'system');
        return {
          connected: function() { return obj._stream && obj._streamPos < obj._stream.length; },
          available: function() {
            return obj._stream ? obj._stream.length - obj._streamPos : 0;
          },
          readBytes: function(dst, len) {
            if (!obj._stream) return 0;
            var remain = obj._stream.length - obj._streamPos;
            var n = Math.min(len, remain);
            for (var i = 0; i < n; i++) dst[i] = obj._stream[obj._streamPos++];
            return n;
          },
        };
      },
      httpEnd: function(obj) { obj._stream = null; obj._streamPos = 0; },
    };
  },

  constants: {},
  constructor: function(args) { return {}; },
};
