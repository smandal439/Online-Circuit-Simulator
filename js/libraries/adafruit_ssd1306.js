window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['Adafruit_SSD1306'] = {
  classes: ['Adafruit_SSD1306'],
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
  constructor: null,
  runtime: function(self) {
    return {};
  },
};
