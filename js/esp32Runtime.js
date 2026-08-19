// esp32Runtime.js - Runtime Mocks for ESP32 functions

export const ESP32Mocks = {
  // PWM LED Control API (ledc)
  ledcSetup(channel, freq, resolution) {
    console.log(`[ESP32] PWM Channel ${channel} initialized at ${freq}Hz (${resolution}-bit)`);
  },
  
  ledcAttachPin(pin, channel) {
    console.log(`[ESP32] Attached GPIO ${pin} to PWM Channel ${channel}`);
  },

  ledcWrite(channel, duty) {
    // Forward duty cycle value to canvas pin output renderer
    if (window.CircuitEngine) {
      window.CircuitEngine.setPwmOutputByChannel(channel, duty);
    }
  },

  // Simulated Wi-Fi stack
  WiFi: {
    begin(ssid, pass) {
      console.log(`[ESP32 Wi-Fi] Connecting to ${ssid}...`);
      setTimeout(() => console.log(`[ESP32 Wi-Fi] Connected! IP: 192.168.1.105`), 1000);
    },
    localIP() { return "192.168.1.105"; }
  }
};