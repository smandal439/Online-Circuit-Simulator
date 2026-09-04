/*
 * ESP32 I2S Audio Test - Tone Generator
 * 
 * Tests: I2S output, MAX98357A amplifier, speaker
 * 
 * Wiring:
 *   D26 = BCLK
 *   D25 = LRC  
 *   D22 = DIN
 *   VIN = 5V (or VIN)
 *   GND = GND
 *   SD  = GND (enable amp)
 *   
 * If you hear a clear 440Hz tone, hardware is OK.
 * Problem is then in network/streaming code.
 */

#include <driver/i2s.h>
#include <math.h>

#define I2S_PORT       I2S_NUM_0
#define I2S_BCLK_PIN   26
#define I2S_LRCK_PIN   25
#define I2S_DOUT_PIN   22
#define I2S_BUF_SIZE   1024

#define TONE_FREQ      440    // Hz (A4 note)
#define SAMPLE_RATE    44100
#define AMPLITUDE      15000  // Volume (max 32767)

void setupI2S() {
  i2s_config_t i2s_config = {
    .mode                 = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX),
    .sample_rate          = SAMPLE_RATE,
    .bits_per_sample      = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format       = I2S_CHANNEL_FMT_RIGHT_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags     = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count        = 4,
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
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=== ESP32 I2S Audio Test ===");
  Serial.println("Testing I2S output with 440Hz tone...");
  Serial.println("You should hear a clear tone from speaker.");
  Serial.println("If no sound: check wiring, amp, speaker.");
  Serial.println();

  setupI2S();
  
  // Generate and play a 440Hz tone for 3 seconds
  Serial.println("[TEST] Playing 440Hz tone...");
  
  int16_t buffer[I2S_BUF_SIZE];
  float phase = 0;
  float phase_inc = 2.0 * PI * TONE_FREQ / SAMPLE_RATE;
  unsigned long startTime = millis();
  
  while (millis() - startTime < 3000) {  // Play for 3 seconds
    // Fill buffer with sine wave
    for (int i = 0; i < I2S_BUF_SIZE / 2; i++) {
      int16_t sample = (int16_t)(AMPLITUDE * sin(phase));
      buffer[i * 2] = sample;      // Left channel
      buffer[i * 2 + 1] = sample;  // Right channel
      phase += phase_inc;
      if (phase >= 2.0 * PI) phase -= 2.0 * PI;
    }
    
    // Write to I2S
    size_t bytes_written;
    i2s_write(I2S_PORT, buffer, sizeof(buffer), &bytes_written, portMAX_DELAY);
  }
  
  Serial.println("[TEST] Tone finished.");
  Serial.println();
  Serial.println("=== RESULTS ===");
  Serial.println("If you heard a CLEAR TONE:");
  Serial.println("  -> I2S, amplifier, and speaker are OK");
  Serial.println("  -> Problem is in network/streaming code");
  Serial.println();
  Serial.println("If NO SOUND or NOISE:");
  Serial.println("  -> Check wiring (D26->BCLK, D25->LRC, D22->DIN)");
  Serial.println("  -> Check MAX98357A: SD pin to GND, VIN to 5V");
  Serial.println("  -> Check speaker connections");
  Serial.println("  -> Try different volume (change AMPLITUDE)");
  
  // Play a second tone at different frequency
  delay(500);
  Serial.println("\n[TEST] Playing 880Hz tone...");
  
  phase = 0;
  phase_inc = 2.0 * PI * 880.0 / SAMPLE_RATE;
  startTime = millis();
  
  while (millis() - startTime < 2000) {
    for (int i = 0; i < I2S_BUF_SIZE / 2; i++) {
      int16_t sample = (int16_t)(AMPLITUDE * sin(phase));
      buffer[i * 2] = sample;
      buffer[i * 2 + 1] = sample;
      phase += phase_inc;
      if (phase >= 2.0 * PI) phase -= 2.0 * PI;
    }
    size_t bytes_written;
    i2s_write(I2S_PORT, buffer, sizeof(buffer), &bytes_written, portMAX_DELAY);
  }
  
  Serial.println("[TEST] Done. System halted.");
}

void loop() {
  // Nothing - test is complete
}
