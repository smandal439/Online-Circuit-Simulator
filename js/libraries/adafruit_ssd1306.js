window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['Adafruit_SSD1306'] = {
  classes: ['Adafruit_SSD1306'],
  includes: ['<Adafruit_SSD1306.h>'],
  transpile: [],
  constants: {
    SSD1306_SWITCHCAPVCC: 0x01,
    SSD1306_EXTERNALVCC: 0x02,
    SSD1306_I2C_ADDRESS: 0x3C,
    SSD1306_WHITE: 1,
    SSD1306_BLACK: 0,
    SSD1306_SETCONTRAST: 0x81,
    SSD1306_SETVCOMDETECT: 0xDB,
  },
  constructor: function(width, height, wire, reset) {
    return { __oled: true, width: width, height: height, wire: wire, reset: reset };
  },
  runtime: function(self) {
    return {};
  },
};
