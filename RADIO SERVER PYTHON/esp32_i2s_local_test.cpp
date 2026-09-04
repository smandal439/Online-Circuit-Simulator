/*
 * ESP32 I2S Music Player - Local Radio Server Test Version
 * 
 * This version uses the local Python radio server instead of external stations.
 * Run radio_server.py on your PC first, then update YOUR_PC_IP below.
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <driver/i2s.h>

// --- WiFi credentials ---
const char* ssid     = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASS";

// --- Local server IP (update this!) ---
const char* SERVER_IP = "192.168.1.100";  // Change to your PC's IP

// --- I2S Configuration ---
#define I2S_PORT       I2S_NUM_0
#define I2S_BCLK_PIN   26
#define I2S_LRCK_PIN   25
#define I2S_DOUT_PIN   22
#define I2S_BUF_SIZE   1024
#define I2S_BUF_COUNT  4

// --- Button pins ---
#define BTN_PLAY_PIN   2
#define BTN_NEXT_PIN   3
#define BTN_PREV_PIN   4

// --- Station list (local server) ---
String STATION_URLS[3];
const char* STATION_NAMES[] = { "Station 1 (440Hz)", "Station 2 (523Hz)", "Station 3 (659Hz)" };
const int NUM_STATIONS = 3;

// --- Playback state ---
bool playing        = false;
int  currentStation = 0;
bool lastPlayState  = HIGH;
bool lastNextState  = HIGH;
bool lastPrevState  = HIGH;
unsigned long lastDebounce = 0;
#define DEBOUNCE_MS 200

void setupI2S() {
  i2s_config_t i2s_config = {
    .mode                 = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX),
    .sample_rate          = 44100,
    .bits_per_sample      = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format       = I2S_CHANNEL_FMT_RIGHT_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags     = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count        = I2S_BUF_COUNT,
    .dma_buf_len          = I2S_BUF_SIZE,
    .use_apll             = false,
    .tx_desc_auto_clear   = true,
  };

  i2s_pin_config_t pin_config = {
    .bck_io_num   = I2S_BCLK_PIN,
    .ws_io_num    = I2S_LRCK_PIN,
    .data_out_num = I2S_DOUT_PIN,
    .data_in_num  = I2S_PIN_NO_CHANGE,
  };

  i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_PORT, &pin_config);
  i2s_zero_dma_buffer(I2S_PORT);
  Serial.println("[I2S] Driver initialized");
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=== ESP32 I2S Local Radio Test ===");

  // Build station URLs
  STATION_URLS[0] = String("http://") + SERVER_IP + ":8000/station1";
  STATION_URLS[1] = String("http://") + SERVER_IP + ":8000/station2";
  STATION_URLS[2] = String("http://") + SERVER_IP + ":8000/station3";

  // Button inputs with internal pull-ups
  pinMode(BTN_PLAY_PIN, INPUT_PULLUP);
  pinMode(BTN_NEXT_PIN, INPUT_PULLUP);
  pinMode(BTN_PREV_PIN, INPUT_PULLUP);

  // Connect to WiFi
  Serial.printf("[WIFI] Connecting to %s", ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.printf("\n[WIFI] Connected! IP: %s\n", WiFi.localIP().toString().c_str());

  setupI2S();
  Serial.println("[RADIO] Ready. Press buttons to control.");
  Serial.printf("[RADIO] Server: %s:8000\n", SERVER_IP);
  Serial.printf("[RADIO] Station 1/%d: %s\n", NUM_STATIONS, STATION_NAMES[currentStation]);
}

void streamStation() {
  HTTPClient http;
  http.begin(STATION_URLS[currentStation]);
  http.setTimeout(10000);

  Serial.printf("[RADIO] Connecting to: %s\n", STATION_URLS[currentStation].c_str());
  int httpCode = http.GET();
  if (httpCode != HTTP_CODE_OK) {
    Serial.printf("[RADIO] Server error: %d\n", httpCode);
    return;
  }

  WiFiClient* stream = http.getStreamPtr();
  uint8_t buffer[I2S_BUF_SIZE];
  size_t totalPlayed = 0;
  unsigned long startTime = millis();

  while (playing && stream->connected() && stream->available()) {
    int bytesRead = stream->readBytes(buffer, sizeof(buffer));
    if (bytesRead <= 0) continue;

    size_t bytesWritten = 0;
    i2s_write(I2S_PORT, buffer, bytesRead, &bytesWritten, portMAX_DELAY);
    totalPlayed += bytesWritten;

    checkButtons();

    if ((totalPlayed / 102400) != ((totalPlayed - bytesWritten) / 102400)) {
      Serial.printf("[RADIO] Played %.1f KB\n", totalPlayed / 1024.0);
    }

    if (millis() - startTime > 30000) break;
  }

  Serial.printf("[RADIO] Stream finished (%.2f KB)\n", totalPlayed / 1024.0);
  http.end();
}

void checkButtons() {
  unsigned long now = millis();
  if (now - lastDebounce < DEBOUNCE_MS) return;

  bool playState = digitalRead(BTN_PLAY_PIN);
  bool nextState = digitalRead(BTN_NEXT_PIN);
  bool prevState = digitalRead(BTN_PREV_PIN);

  if (playState == LOW && lastPlayState == HIGH) {
    playing = !playing;
    Serial.printf("[CTRL] %s\n", playing ? "PLAY" : "PAUSE");
    lastDebounce = now;
  }
  lastPlayState = playState;

  if (nextState == LOW && lastNextState == HIGH) {
    currentStation = (currentStation + 1) % NUM_STATIONS;
    playing = true;
    Serial.printf("[CTRL] NEXT -> Station %d/%d: %s\n", currentStation + 1, NUM_STATIONS, STATION_NAMES[currentStation]);
    lastDebounce = now;
  }
  lastNextState = nextState;

  if (prevState == LOW && lastPrevState == HIGH) {
    currentStation = (currentStation - 1 + NUM_STATIONS) % NUM_STATIONS;
    playing = true;
    Serial.printf("[CTRL] PREV -> Station %d/%d: %s\n", currentStation + 1, NUM_STATIONS, STATION_NAMES[currentStation]);
    lastDebounce = now;
  }
  lastPrevState = prevState;
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WIFI] Disconnected. Reconnecting...");
    WiFi.reconnect();
    while (WiFi.status() != WL_CONNECTED) delay(500);
  }

  checkButtons();

  if (playing) {
    Serial.printf("[RADIO] Now playing: %s\n", STATION_NAMES[currentStation]);
    streamStation();
    if (playing) {
      Serial.println("[RADIO] Restarting stream...");
      delay(1000);
    }
  } else {
    delay(100);
  }
}
