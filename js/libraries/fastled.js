window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['FastLED'] = {
  classes: ['CRGB', 'CHSV'],
  transpile: [
    [/FastLED\.addLeds\(/g, '_a.fastledAddLeds('],
    [/FastLED\.show\(\)/g, '_a.fastledShow()'],
    [/FastLED\.setBrightness\(/g, '_a.fastledSetBrightness('],
    [/FastLED\.setCorrection\(/g, '_a.fastledSetCorrection('],
    [/FastLED\.setColorCorrection\(/g, '_a.fastledSetColorCorrection('],
    [/FastLED\.maxPowerInMilliamps\(/g, '_a.fastledMaxPower('],
    [/FastLED\.clear\(\)/g, '_a.fastledClear()'],
    [/CRGB\s+(\w+)\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)/g, 'var $1 = _a.crgbNew($2, $3, $4)'],
    [/CRGB\s+(\w+)\[(\d+)\]/g, 'var $1 = _a.crgbArray($2)'],
    [/CHSV\s+(\w+)\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)/g, 'var $1 = _a.chsvNew($2, $3, $4)'],
  ],
  constants: {
    TWhite: 255,
  },
};
