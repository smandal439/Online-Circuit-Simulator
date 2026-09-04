window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['MFRC522'] = {
  classes: ['MFRC522'],
  transpile: [
    [/\bMFRC522\s+(\w+)\s*\(([^)]+)\)/g, 'var $1 = _a.rfidNew($2)'],
    [/\b(\w+)\.PCD_Init\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidInit(' + varName + ')';
    }],
    [/\b(\w+)\.PCD_DumpVersionToSerial\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidDumpVersion(' + varName + ')';
    }],
    [/\b(\w+)\.PICC_IsNewCardPresent\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidIsNewCard(' + varName + ')';
    }],
    [/\b(\w+)\.PICC_ReadCardSerial\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidReadCard(' + varName + ')';
    }],
    [/\b(\w+)\.PICC_HaltA\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidHaltA(' + varName + ')';
    }],
    [/\b(\w+)\.PCD_StopCrypto1\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidStopCrypto(' + varName + ')';
    }],
    [/\b(\w+)\.uid\.uidByte\b/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidUidBytes(' + varName + ')';
    }],
    [/\b(\w+)\.uid\.size\b/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidUidSize(' + varName + ')';
    }],
    [/\b(\w+)\.MIFARE_Read\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidMifareRead(' + varName + ', ';
    }],
    [/\b(\w+)\.MIFARE_Write\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidMifareWrite(' + varName + ', ';
    }],
    [/\b(\w+)\.PICC_REQA\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidREQA(' + varName + ')';
    }],
    [/\b(\w+)\.PICC_WUPA\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidWUPA(' + varName + ')';
    }],
    [/\b(\w+)\.PICC_Select\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidSelect(' + varName + ')';
    }],
    [/\b(\w+)\.PICC_ComputeBCC\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidComputeBCC(' + varName + ', ';
    }],
    [/\b(\w+)\.PICC_StopCrypto1\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidStopCrypto(' + varName + ')';
    }],
    [/\b(\w+)\.PICC_DumpDetailsToSerial\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidDumpDetails(' + varName + ')';
    }],
    [/\b(\w+)\.PICC_DumpToSerial\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidDumpToSerial(' + varName + ')';
    }],
    [/\b(\w+)\.PICC_DumpMifareClassicSectorToSerial\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidDumpSector(' + varName + ', ';
    }],
    [/\b(\w+)\.PICC_DumpMifareClassicToSerial\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidDumpClassic(' + varName + ', ';
    }],
    [/\b(\w+)\.PICC_DumpMifareUltralightToSerial\s*\(/g, function (match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidDumpUltralight(' + varName + ')';
    }],
    [/\bMFRC522::MIFARE_Key\b/g, 'var'],
    [/\bMFRC522::PICC_Type\b/g, 'var'],
  ],
  constants: {
    PICC_TYPE_MIFARE_1K: 1,
    PICC_TYPE_MIFARE_4K: 2,
    PICC_TYPE_MIFARE_UL: 3,
    PICC_TYPE_NOT_COMPLETE: 0,
    STATUS_OK: 0,
    STATUS_ERROR: 1,
    STATUS_COLLISION: 2,
    STATUS_TIMEOUT: 3,
    STATUS_NO_ROOM: 4,
    STATUS_INTERNAL_ERROR: 5,
    STATUS_INVALID: 6,
    STATUS_CRC_WRONG: 7,
    STATUS_MIFARE_NACK: 8,
  },
};
