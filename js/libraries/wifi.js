/**
 * WiFi Library Plugin for ArduSim (ESP32)
 *
 * Provides WiFi simulation.
 * Supports: begin, localIP, softAPIP, status, disconnect, mode, softAP, reconnect.
 *
 * Usage in Arduino code:
 *   #include <WiFi.h>
 *   WiFi.begin(ssid, password);
 *   WiFi.localIP();
 *   WiFi.softAPIP();
 *   WiFi.status();
 *   WiFi.disconnect();
 *   WiFi.mode(WIFI_STA);
 *   WiFi.softAP(ssid, password);
 *   WiFi.reconnect();
 */
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['WiFi'] = {
  classes: [],

  transpile: [
    // WiFi.begin() → _a.wifiBegin()
    [/\bWiFi\.begin\s*\(/g, '_a.wifiBegin('],
    // WiFi.localIP() → _a.wifiLocalIP()
    [/\bWiFi\.localIP\s*\(/g, '_a.wifiLocalIP('],
    // WiFi.softAPIP() → _a.wifiSoftAPIP()
    [/\bWiFi\.softAPIP\s*\(/g, '_a.wifiSoftAPIP('],
    // WiFi.status() → _a.wifiStatus()
    [/\bWiFi\.status\s*\(/g, '_a.wifiStatus('],
    // WiFi.disconnect() → _a.wifiDisconnect()
    [/\bWiFi\.disconnect\s*\(/g, '_a.wifiDisconnect('],
    // WiFi.mode() → _a.wifiMode()
    [/\bWiFi\.mode\s*\(/g, '_a.wifiMode('],
    // WiFi.softAP() → _a.wifiSoftAP()
    [/\bWiFi\.softAP\s*\(/g, '_a.wifiSoftAP('],
    // WiFi.reconnect() → _a.wifiReconnect()
    [/\bWiFi\.reconnect\s*\(/g, '_a.wifiReconnect('],
  ],

  constants: {},

  constructor: null,

  runtime: function(self) {
    return {
      wifiBegin: function(ssid, pass) {
        self._serialLog('[ESP32 Wi-Fi] Connecting to "' + ssid + '"...\n', 'system');
        setTimeout(function() {
          self._serialLog('[ESP32 Wi-Fi] Connected! IP: 192.168.1.105\n', 'system');
        }, Math.max(50, 800 / self.speed));
      },
      wifiLocalIP: function() { return '192.168.1.105'; },
      wifiSoftAPIP: function() { return '192.168.4.1'; },
      wifiStatus: function() { return 3; },
      wifiDisconnect: function() { self._serialLog('[ESP32 Wi-Fi] Disconnected\n', 'system'); },
      wifiReconnect: function() { self._serialLog('[ESP32 Wi-Fi] Reconnected\n', 'system'); },
      wifiMode: function() { },
      wifiSoftAP: function(ssid, pass) {
        self._serialLog('[ESP32 Wi-Fi] SoftAP "' + ssid + '" started\n', 'system');
      },
    };
  },
};
