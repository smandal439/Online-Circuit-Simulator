window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['DHT'] = {
  classes: ['DHT'],
  includes: ['<DHT.h>'],
  transpile: [],
  constants: {
    DHT11: 11,
    DHT22: 22,
    DHT21: 21,
    AM2301: 22,
    AM2302: 22,
    DHT12: 12
  },
  constructor: function (pin, type) {
    function findInst() {
      var canvas = window.CircuitCanvas;
      if (!canvas || !Array.isArray(canvas.components)) return null;
      return canvas.components.find(function(c) { return c.type === 'dht11'; }) || null;
    }
    return {
      __dht: true,
      _pin: Number(pin) || 2,
      _type: Number(type) || 11,
      begin() { },
      readTemperature(scale) {
        var inst = findInst();
        if (!inst) return NaN;
        var t = (inst.runtimeState && inst.runtimeState.temperature !== undefined)
          ? inst.runtimeState.temperature : (inst.props ? inst.props.temperature : 25);
        if (scale === 'F' || scale === 1) t = t * 9.0 / 5.0 + 32;
        return t;
      },
      readHumidity() {
        var inst = findInst();
        if (!inst) return NaN;
        return (inst.runtimeState && inst.runtimeState.humidity !== undefined)
          ? inst.runtimeState.humidity : (inst.props ? inst.props.humidity : 60);
      },
      convertCtoF(c) { return c * 9.0 / 5.0 + 32; },
      convertFtoC(f) { return (f - 32) * 5.0 / 9.0; },
      computeHeatIndex(t, h, si) { return si ? t : (t - 0.55 * (1 - h / 100) * (t - 14.5)); },
    };
  },
  runtime: function (self) {
    return {};
  },
};
