// esp32Board.js - ArduSim Board Component Definition

export const ESP32Board = {
  type: 'ESP32_DEVKIT_V1',
  name: 'ESP32 DevKit V1',
  width: 140,
  height: 280,
  pins: [
    // Left Header
    { id: 'EN',   x: 10, y: 30,  type: 'CONTROL' },
    { id: 'VP',   x: 10, y: 45,  type: 'ADC', gpio: 36 },
    { id: 'VN',   x: 10, y: 60,  type: 'ADC', gpio: 39 },
    { id: 'D34',  x: 10, y: 75,  type: 'ADC', gpio: 34 },
    { id: 'D35',  x: 10, y: 90,  type: 'ADC', gpio: 35 },
    { id: 'D32',  x: 10, y: 105, type: 'GPIO_PWM_ADC', gpio: 32 },
    { id: 'D33',  x: 10, y: 120, type: 'GPIO_PWM_ADC', gpio: 33 },
    { id: 'D25',  x: 10, y: 135, type: 'DAC', gpio: 25 },
    { id: 'D26',  x: 10, y: 150, type: 'DAC', gpio: 26 },
    { id: 'D27',  x: 10, y: 165, type: 'GPIO_PWM', gpio: 27 },
    { id: 'D14',  x: 10, y: 180, type: 'SPI_CLK', gpio: 14 },
    { id: 'D12',  x: 10, y: 195, type: 'SPI_MISO', gpio: 12 },
    { id: 'D13',  x: 10, y: 210, type: 'SPI_MOSI', gpio: 13 },
    { id: 'GND1', x: 10, y: 225, type: 'GND' },
    { id: 'VIN',  x: 10, y: 240, type: 'VCC_5V' },

    // Right Header
    { id: 'D23',  x: 130, y: 30,  type: 'SPI_MOSI', gpio: 23 },
    { id: 'D22',  x: 130, y: 45,  type: 'I2C_SCL', gpio: 22 },
    { id: 'TX0',  x: 130, y: 60,  type: 'UART_TX', gpio: 1 },
    { id: 'RX0',  x: 130, y: 75,  type: 'UART_RX', gpio: 3 },
    { id: 'D21',  x: 130, y: 90,  type: 'I2C_SDA', gpio: 21 },
    { id: 'D19',  x: 130, y: 105, type: 'SPI_MISO', gpio: 19 },
    { id: 'D18',  x: 130, y: 120, type: 'SPI_CLK', gpio: 18 },
    { id: 'D5',   x: 130, y: 135, type: 'SPI_CS', gpio: 5 },
    { id: 'D17',  x: 130, y: 150, type: 'UART2_TX', gpio: 17 },
    { id: 'D16',  x: 130, y: 165, type: 'UART2_RX', gpio: 16 },
    { id: 'D4',   x: 130, y: 180, type: 'GPIO_PWM', gpio: 4 },
    { id: 'D2',   x: 130, y: 195, type: 'BUILTIN_LED', gpio: 2 },
    { id: 'D15',  x: 130, y: 210, type: 'GPIO_PWM', gpio: 15 },
    { id: 'GND2', x: 130, y: 225, type: 'GND' },
    { id: '3V3',  x: 130, y: 240, type: 'VCC_3V3' }
  ],

  render(ctx, x, y) {
    // Board outline
    ctx.fillStyle = '#1e272e'; // Dark PCB color
    ctx.fillRect(x, y, this.width, this.height);

    // ESP-WROOM-32 Module Metal Shield
    ctx.fillStyle = '#d2dae2';
    ctx.fillRect(x + 25, y + 20, 90, 100);
    ctx.fillStyle = '#485460';
    ctx.font = '10px monospace';
    ctx.fillText('ESP-WROOM-32', x + 30, y + 70);

    // Render Pin Headers
    this.pins.forEach(pin => {
      ctx.fillStyle = pin.type.startsWith('VCC') ? '#e74c3c' : pin.type === 'GND' ? '#000000' : '#f1c40f';
      ctx.fillRect(x + pin.x - 3, y + pin.y - 3, 6, 6);
    });
  }
};