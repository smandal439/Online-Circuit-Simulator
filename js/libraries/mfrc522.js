/**
 * MFRC522 RFID Library Plugin for ArduSim
 *
 * Provides RFID card simulation with random card detection.
 */
window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['MFRC522'] = {
  classes: ['MFRC522'],
  includes: ['<MFRC522.h>'],

  transpile: [
    [/\bMFRC522\s+(\w+)\s*\(([^)]+)\)/g, 'var $1 = _a.rfidNew($2)'],
    [/\b(\w+)\.PCD_Init\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidInit(' + varName + ')';
    }],
    [/\b(\w+)\.PCD_DumpVersionToSerial\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidDumpVersion(' + varName + ')';
    }],
    [/\b(\w+)\.PICC_IsNewCardPresent\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidIsNewCard(' + varName + ')';
    }],
    [/\b(\w+)\.PICC_ReadCardSerial\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidReadCard(' + varName + ')';
    }],
    [/\b(\w+)\.PICC_HaltA\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidHaltA(' + varName + ')';
    }],
    [/\b(\w+)\.PCD_StopCrypto1\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidStopCrypto(' + varName + ')';
    }],
    [/\b(\w+)\.uid\.uidByte\b/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidUidBytes(' + varName + ')';
    }],
    [/\b(\w+)\.uid\.size\b/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidUidSize(' + varName + ')';
    }],
    [/\b(\w+)\.MIFARE_Read\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidMifareRead(' + varName + ', ';
    }],
    [/\b(\w+)\.MIFARE_Write\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidMifareWrite(' + varName + ', ';
    }],
    [/\b(\w+)\.PICC_REQA\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidREQA(' + varName + ')';
    }],
    [/\b(\w+)\.PICC_WUPA\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidWUPA(' + varName + ')';
    }],
    [/\b(\w+)\.PICC_Select\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidSelect(' + varName + ')';
    }],
    [/\b(\w+)\.PICC_ComputeBCC\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidComputeBCC(' + varName + ', ';
    }],
    [/\b(\w+)\.PICC_StopCrypto1\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidStopCrypto(' + varName + ')';
    }],
    [/\b(\w+)\.PICC_DumpDetailsToSerial\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidDumpDetails(' + varName + ')';
    }],
    [/\b(\w+)\.PICC_DumpToSerial\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidDumpToSerial(' + varName + ')';
    }],
    [/\b(\w+)\.PICC_DumpMifareClassicSectorToSerial\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidDumpSector(' + varName + ', ';
    }],
    [/\b(\w+)\.PICC_DumpMifareClassicToSerial\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidDumpClassic(' + varName + ', ';
    }],
    [/\b(\w+)\.PICC_DumpMifareUltralightToSerial\s*\(/g, function(match, varName) {
      if (varName === 'Serial' || varName === 'WiFi' || varName === 'Wire' || varName === 'SPI') return match;
      return '_a.rfidDumpUltralight(' + varName + ')';
    }],
    [/\bMFRC522::MIFARE_Key\b/g, 'var'],
    [/\bMFRC522::PICC_Type\b/g, 'var'],
  ],

  runtime: function(self) {
    return {
      rfidNew: function(csPin, rstPin) {
        var id = '_rfid_' + csPin + '_' + rstPin;
        self._rfid = self._rfid || {};
        self._rfid[id] = { csPin: csPin, rstPin: rstPin, initialized: false, cardPresent: false, uidBytes: [0xA1, 0xB2, 0xC3, 0xD4], uidSize: 4 };
        self._serialLog('[MFRC522] Created CS=' + csPin + ' RST=' + rstPin + '\n', 'system');
        return { _rfidId: id, uid: { uidByte: null, size: 0 } };
      },
      rfidInit: function(obj) {
        var r = self._rfid && self._rfid[obj._rfidId];
        if (r) {
          r.initialized = true;
          self._serialLog('[MFRC522] PCD_Init\n', 'system');
          self._serialLog('[MFRC522] Firmware: v0x92 (simulated)\n', 'system');
        }
      },
      rfidDumpVersion: function(obj) {
        self._serialLog('[MFRC522] PCD Version: v2.0 (simulated)\n', 'system');
      },
      rfidIsNewCard: function(obj) {
        var r = self._rfid && self._rfid[obj._rfidId];
        if (!r || !r.initialized) return false;
        r.cardPresent = Math.random() < 0.3;
        return r.cardPresent;
      },
      rfidReadCard: function(obj) {
        var r = self._rfid && self._rfid[obj._rfidId];
        if (!r || !r.cardPresent) return false;
        obj.uid = { uidByte: r.uidBytes, size: r.uidSize };
        self._serialLog('[MFRC522] Card UID: ' + r.uidBytes.map(function(b) { return b.toString(16).toUpperCase().padStart(2, '0'); }).join(' ') + '\n', 'system');
        return true;
      },
      rfidHaltA: function(obj) { },
      rfidStopCrypto: function(obj) { },
      rfidUidBytes: function(obj) {
        var r = self._rfid && self._rfid[obj._rfidId];
        return r ? r.uidBytes : [0];
      },
      rfidUidSize: function(obj) {
        var r = self._rfid && self._rfid[obj._rfidId];
        return r ? r.uidSize : 0;
      },
      rfidMifareRead: function(obj, blockAddr, buf) {
        self._serialLog('[MFRC522] MIFARE_Read block ' + blockAddr + '\n', 'system');
        return true;
      },
      rfidMifareWrite: function(obj, blockAddr, buf) {
        self._serialLog('[MFRC522] MIFARE_Write block ' + blockAddr + '\n', 'system');
        return true;
      },
      rfidREQA: function(obj) { return 0; },
      rfidWUPA: function(obj) { return 0; },
      rfidSelect: function(obj) { return 0; },
      rfidComputeBCC: function(obj, buf) { return 0; },
      rfidDumpDetails: function(obj) { },
      rfidDumpToSerial: function(obj) { },
      rfidDumpSector: function(obj, uid, sector) { },
      rfidDumpClassic: function(obj, uid, type) { },
      rfidDumpUltralight: function(obj) { },
    };
  },

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
