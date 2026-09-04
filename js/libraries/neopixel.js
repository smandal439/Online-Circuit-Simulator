window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['Adafruit_NeoPixel'] = {
  classes: ['Adafruit_NeoPixel'],
  transpile: [
    [/Adafruit_NeoPixel\s+(\w+)\s*=\s*Adafruit_NeoPixel\((\d+)\s*,\s*(\d+)\s*,\s*(\w+)\)/g, 'var $1 = _a.neopixelNew($2, $3, $4)'],
    [/Adafruit_NeoPixel\s+(\w+)\((\d+)\s*,\s*(\d+)\s*,\s*(\w+)\)/g, 'var $1 = _a.neopixelNew($2, $3, $4)'],
    [/(?<!Serial|WiFi|Wire|SPI)(\w+)\.show\(\)/g, '_a.neopixelShow($1)'],
    [/(\w+)\.setPixelColor\(/g, '_a.neopixelSetPixelColor($1, '],
    [/(\w+)\.getPixelColor\(/g, '_a.neopixelGetPixelColor($1, '],
    [/(\w+)\.setBrightness\(/g, '_a.neopixelSetBrightness($1, '],
    [/(\w+)\.Color\(/g, '_a.neopixelColor($1, '],
    [/(\w+)\.numPixels\(\)/g, '_a.neopixelNumPixels($1)'],
    [/(\w+)\.ColorHSV\(/g, '_a.neopixelColorHSV($1, '],
    [/(\w+)\.gamma32\(/g, '_a.neopixelGamma32($1, '],
  ],
  constants: {
    NEO_GRB: 0x02,
    NEO_GRBW: 0x04,
    NEO_KHZ800: 0x00,
    NEO_KHZ400: 0x01,
    NEO_RGB: 0x00,
    NEO_RGBW: 0x03,
    NEO_BRG: 0x01,
    NEO_RBG: 0x02,
  },
};
