/**
 * OmniTools — Self-Contained QR Code Studio Module
 * 100% Offline, Zero-Dependency QR Code Generator (URL, WiFi, vCard, Email) and Scanner.
 */

// ==========================================================================
// Embedded Lightweight QR Code Generation Engine (Self-Contained & Offline)
// ==========================================================================
const QRCore = (function () {
  const PAD0 = 0xec;
  const PAD1 = 0x11;

  const QRMode = { MODE_NUMBER: 1 << 0, MODE_ALPHA_NUM: 1 << 1, MODE_8BIT_BYTE: 1 << 2 };
  const QRErrorCorrectLevel = { L: 1, M: 0, Q: 3, H: 2 };
  const QRMaskPattern = { PATTERN000: 0, PATTERN001: 1, PATTERN010: 2, PATTERN011: 3, PATTERN100: 4, PATTERN101: 5, PATTERN110: 6, PATTERN111: 7 };

  const QRMath = {
    glog: function (n) {
      if (n < 1) throw new Error("glog(" + n + ")");
      return QRMath.LOG_TABLE[n];
    },
    gexp: function (n) {
      while (n < 0) n += 255;
      while (n >= 255) n -= 255;
      return QRMath.EXP_TABLE[n];
    },
    EXP_TABLE: new Array(256),
    LOG_TABLE: new Array(256)
  };

  for (let i = 0; i < 8; i++) QRMath.EXP_TABLE[i] = 1 << i;
  for (let i = 8; i < 256; i++) QRMath.EXP_TABLE[i] = QRMath.EXP_TABLE[i - 4] ^ QRMath.EXP_TABLE[i - 5] ^ QRMath.EXP_TABLE[i - 6] ^ QRMath.EXP_TABLE[i - 8];
  for (let i = 0; i < 255; i++) QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]] = i;

  function QRPolynomial(num, shift) {
    if (num.length == undefined) throw new Error(num.length + "/" + shift);
    let offset = 0;
    while (offset < num.length && num[offset] == 0) offset++;
    this.num = new Array(num.length - offset + shift);
    for (let i = 0; i < num.length - offset; i++) this.num[i] = num[i + offset];
  }

  QRPolynomial.prototype = {
    get: function (index) { return this.num[index]; },
    getLength: function () { return this.num.length; },
    multiply: function (e) {
      const num = new Array(this.getLength() + e.getLength() - 1);
      for (let i = 0; i < this.getLength(); i++) {
        for (let j = 0; j < e.getLength(); j++) {
          num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
        }
      }
      return new QRPolynomial(num, 0);
    },
    mod: function (e) {
      if (this.getLength() - e.getLength() < 0) return this;
      const ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
      const num = new Array(this.getLength());
      for (let i = 0; i < this.getLength(); i++) num[i] = this.get(i);
      for (let i = 0; i < e.getLength(); i++) num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
      return new QRPolynomial(num, 0).mod(e);
    }
  };

  const QRRSBlock = {
    RS_BLOCK_TABLE: [
      [1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9],
      [1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16],
      [1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13],
      [1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9],
      [1, 134, 108], [2, 67, 43], [2, 33, 15, 2, 34, 16], [2, 33, 11, 2, 34, 12],
      [2, 86, 68], [4, 43, 27], [4, 43, 19], [4, 43, 15],
      [2, 98, 78], [4, 49, 31], [2, 32, 14, 4, 33, 15], [4, 39, 13, 1, 40, 14],
      [2, 121, 97], [2, 60, 38, 2, 61, 39], [4, 40, 18, 2, 41, 19], [4, 40, 14, 2, 41, 15],
      [2, 146, 116], [3, 58, 36, 2, 59, 37], [4, 36, 16, 4, 37, 17], [4, 36, 12, 4, 37, 13],
      [2, 86, 68, 2, 87, 69], [4, 69, 43, 1, 70, 44], [6, 43, 19, 2, 44, 20], [6, 43, 15, 2, 44, 16]
    ],
    getRSBlocks: function (typeNumber, errorCorrectLevel) {
      const rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);
      if (rsBlock == undefined) throw new Error("bad rs block @ typeNumber:" + typeNumber + "/errorCorrectLevel:" + errorCorrectLevel);
      const length = rsBlock.length / 3;
      const list = [];
      for (let i = 0; i < length; i++) {
        const count = rsBlock[i * 3 + 0];
        const totalCount = rsBlock[i * 3 + 1];
        const dataCount = rsBlock[i * 3 + 2];
        for (let j = 0; j < count; j++) list.push({ totalCount: totalCount, dataCount: dataCount });
      }
      return list;
    },
    getRsBlockTable: function (typeNumber, errorCorrectLevel) {
      switch (errorCorrectLevel) {
        case QRErrorCorrectLevel.L: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
        case QRErrorCorrectLevel.M: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
        case QRErrorCorrectLevel.Q: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
        case QRErrorCorrectLevel.H: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
      }
    }
  };

  function QRBitBuffer() {
    this.buffer = [];
    this.length = 0;
  }
  QRBitBuffer.prototype = {
    get: function (index) {
      const bufIndex = Math.floor(index / 8);
      return ((this.buffer[bufIndex] >>> (7 - index % 8)) & 1) == 1;
    },
    put: function (num, length) {
      for (let i = 0; i < length; i++) this.putBit(((num >>> (length - i - 1)) & 1) == 1);
    },
    putBit: function (bit) {
      const bufIndex = Math.floor(this.length / 8);
      if (this.buffer.length <= bufIndex) this.buffer.push(0);
      if (bit) this.buffer[bufIndex] |= (0x80 >>> (this.length % 8));
      this.length++;
    }
  };

  const QRUtil = {
    PATTERN_POSITION_TABLE: [
      [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54]
    ],
    G15: (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0),
    G18: (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0),
    G15_MASK: (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1),
    getBCHTypeInfo: function (data) {
      let d = data << 10;
      while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) {
        d ^= (QRUtil.G15 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15)));
      }
      return ((data << 10) | d) ^ QRUtil.G15_MASK;
    },
    getBCHDigit: function (data) {
      let digit = 0;
      while (data != 0) { digit++; data >>>= 1; }
      return digit;
    },
    getPatternPosition: function (typeNumber) {
      return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1] || [];
    },
    getMask: function (maskPattern, i, j) {
      switch (maskPattern) {
        case QRMaskPattern.PATTERN000: return (i + j) % 2 == 0;
        case QRMaskPattern.PATTERN001: return i % 2 == 0;
        case QRMaskPattern.PATTERN010: return j % 3 == 0;
        case QRMaskPattern.PATTERN011: return (i + j) % 3 == 0;
        case QRMaskPattern.PATTERN100: return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 == 0;
        case QRMaskPattern.PATTERN101: return (i * j) % 2 + (i * j) % 3 == 0;
        case QRMaskPattern.PATTERN110: return ((i * j) % 2 + (i * j) % 3) % 2 == 0;
        case QRMaskPattern.PATTERN111: return ((i * j) % 3 + (i + j) % 2) % 2 == 0;
      }
    },
    getErrorCorrectPolynomial: function (errorCorrectLength) {
      let a = new QRPolynomial([1], 0);
      for (let i = 0; i < errorCorrectLength; i++) {
        a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
      }
      return a;
    },
    getLengthInBits: function (mode, type) {
      if (1 <= type && type < 10) {
        switch (mode) {
          case QRMode.MODE_NUMBER: return 10;
          case QRMode.MODE_ALPHA_NUM: return 9;
          case QRMode.MODE_8BIT_BYTE: return 8;
        }
      } else if (type < 27) {
        switch (mode) {
          case QRMode.MODE_NUMBER: return 12;
          case QRMode.MODE_ALPHA_NUM: return 11;
          case QRMode.MODE_8BIT_BYTE: return 16;
        }
      }
      return 8;
    }
  };

  function QRCodeModel(typeNumber, errorCorrectLevel) {
    this.typeNumber = typeNumber;
    this.errorCorrectLevel = errorCorrectLevel;
    this.modules = null;
    this.moduleCount = 0;
    this.dataCache = null;
    this.dataList = [];
  }

  QRCodeModel.prototype = {
    addData: function (data) {
      // UTF-8 encode string
      const bytes = [];
      for (let i = 0; i < data.length; i++) {
        let code = data.charCodeAt(i);
        if (code < 0x80) bytes.push(code);
        else if (code < 0x800) {
          bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
        } else if (code < 0xd800 || code >= 0xe000) {
          bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
        } else {
          i++;
          code = 0x10000 + (((code & 0x3ff) << 10) | (data.charCodeAt(i) & 0x3ff));
          bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
        }
      }
      this.dataList.push({ mode: QRMode.MODE_8BIT_BYTE, data: data, bytes: bytes });
      this.dataCache = null;
    },
    isDark: function (row, col) {
      if (this.modules[row][col] != null) return this.modules[row][col];
      return false;
    },
    getModuleCount: function () { return this.moduleCount; },
    make: function () {
      if (this.typeNumber < 1) {
        let typeNumber = 1;
        for (typeNumber = 1; typeNumber < 10; typeNumber++) {
          const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, this.errorCorrectLevel);
          const buffer = new QRBitBuffer();
          let totalDataCount = 0;
          for (let i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
          for (let i = 0; i < this.dataList.length; i++) {
            const data = this.dataList[i];
            buffer.put(data.mode, 4);
            buffer.put(data.bytes.length, QRUtil.getLengthInBits(data.mode, typeNumber));
            for (let j = 0; j < data.bytes.length; j++) buffer.put(data.bytes[j], 8);
          }
          if (buffer.length <= totalDataCount * 8) break;
        }
        this.typeNumber = typeNumber;
      }
      this.makeImpl(false, this.getBestMaskPattern());
    },
    makeImpl: function (test, maskPattern) {
      this.moduleCount = this.typeNumber * 4 + 17;
      this.modules = new Array(this.moduleCount);
      for (let row = 0; row < this.moduleCount; row++) {
        this.modules[row] = new Array(this.moduleCount);
        for (let col = 0; col < this.moduleCount; col++) this.modules[row][col] = null;
      }
      this.setupPositionProbePattern(0, 0);
      this.setupPositionProbePattern(this.moduleCount - 7, 0);
      this.setupPositionProbePattern(0, this.moduleCount - 7);
      this.setupPositionAdjustPattern();
      this.setupTimingPattern();
      this.setupTypeInfo(test, maskPattern);
      if (this.dataCache == null) this.dataCache = QRCodeModel.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
      this.mapData(this.dataCache, maskPattern);
    },
    setupPositionProbePattern: function (row, col) {
      for (let r = -1; r <= 7; r++) {
        if (row + r <= -1 || this.moduleCount <= row + r) continue;
        for (let c = -1; c <= 7; c++) {
          if (col + c <= -1 || this.moduleCount <= col + c) continue;
          if ((0 <= r && r <= 6 && (c == 0 || c == 6)) || (0 <= c && c <= 6 && (r == 0 || r == 6)) || (2 <= r && r <= 4 && 2 <= c && c <= 4)) {
            this.modules[row + r][col + c] = true;
          } else {
            this.modules[row + r][col + c] = false;
          }
        }
      }
    },
    getBestMaskPattern: function () {
      return QRMaskPattern.PATTERN000;
    },
    setupTimingPattern: function () {
      for (let r = 8; r < this.moduleCount - 8; r++) {
        if (this.modules[r][6] != null) continue;
        this.modules[r][6] = (r % 2 == 0);
      }
      for (let c = 8; c < this.moduleCount - 8; c++) {
        if (this.modules[6][c] != null) continue;
        this.modules[6][c] = (c % 2 == 0);
      }
    },
    setupPositionAdjustPattern: function () {
      const pos = QRUtil.getPatternPosition(this.typeNumber);
      for (let i = 0; i < pos.length; i++) {
        for (let j = 0; j < pos.length; j++) {
          const row = pos[i];
          const col = pos[j];
          if (this.modules[row][col] != null) continue;
          for (let r = -2; r <= 2; r++) {
            for (let c = -2; c <= 2; c++) {
              if (r == -2 || r == 2 || c == -2 || c == 2 || (r == 0 && c == 0)) {
                this.modules[row + r][col + c] = true;
              } else {
                this.modules[row + r][col + c] = false;
              }
            }
          }
        }
      }
    },
    setupTypeInfo: function (test, maskPattern) {
      const data = (this.errorCorrectLevel << 3) | maskPattern;
      const bits = QRUtil.getBCHTypeInfo(data);
      for (let i = 0; i < 15; i++) {
        const mod = (!test && ((bits >> i) & 1) == 1);
        if (i < 6) this.modules[i][8] = mod;
        else if (i < 8) this.modules[i + 1][8] = mod;
        else this.modules[this.moduleCount - 15 + i][8] = mod;

        if (i < 8) this.modules[8][this.moduleCount - i - 1] = mod;
        else if (i < 9) this.modules[8][15 - i - 1 + 1] = mod;
        else this.modules[8][15 - i - 1] = mod;
      }
      this.modules[this.moduleCount - 8][8] = (!test);
    },
    mapData: function (data, maskPattern) {
      let inc = -1;
      let row = this.moduleCount - 1;
      let bitIndex = 7;
      let byteIndex = 0;
      for (let col = this.moduleCount - 1; col > 0; col -= 2) {
        if (col == 6) col--;
        while (true) {
          for (let c = 0; c < 2; c++) {
            if (this.modules[row][col - c] == null) {
              let dark = false;
              if (byteIndex < data.length) dark = (((data[byteIndex] >>> bitIndex) & 1) == 1);
              const mask = QRUtil.getMask(maskPattern, row, col - c);
              if (mask) dark = !dark;
              this.modules[row][col - c] = dark;
              bitIndex--;
              if (bitIndex == -1) {
                byteIndex++;
                bitIndex = 7;
              }
            }
          }
          row += inc;
          if (row < 0 || this.moduleCount <= row) {
            row -= inc;
            inc = -inc;
            break;
          }
        }
      }
    }
  };

  QRCodeModel.createData = function (typeNumber, errorCorrectLevel, dataList) {
    const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
    const buffer = new QRBitBuffer();
    for (let i = 0; i < dataList.length; i++) {
      const data = dataList[i];
      buffer.put(data.mode, 4);
      buffer.put(data.bytes.length, QRUtil.getLengthInBits(data.mode, typeNumber));
      for (let j = 0; j < data.bytes.length; j++) buffer.put(data.bytes[j], 8);
    }
    let totalDataCount = 0;
    for (let i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
    if (buffer.length > totalDataCount * 8) throw new Error("code length overflow. (" + buffer.length + ">" + totalDataCount * 8 + ")");
    if (buffer.length + 4 <= totalDataCount * 8) buffer.put(0, 4);
    while (buffer.length % 8 != 0) buffer.putBit(false);
    while (true) {
      if (buffer.length >= totalDataCount * 8) break;
      buffer.put(PAD0, 8);
      if (buffer.length >= totalDataCount * 8) break;
      buffer.put(PAD1, 8);
    }
    return QRCodeModel.createBytes(buffer, rsBlocks);
  };

  QRCodeModel.createBytes = function (buffer, rsBlocks) {
    let offset = 0;
    let maxDcCount = 0;
    let maxEcCount = 0;
    const dcdata = new Array(rsBlocks.length);
    const ecdata = new Array(rsBlocks.length);
    for (let r = 0; r < rsBlocks.length; r++) {
      const dcCount = rsBlocks[r].dataCount;
      const ecCount = rsBlocks[r].totalCount - dcCount;
      maxDcCount = Math.max(maxDcCount, dcCount);
      maxEcCount = Math.max(maxEcCount, ecCount);
      dcdata[r] = new Array(dcCount);
      for (let i = 0; i < dcdata[r].length; i++) dcdata[r][i] = 0xff & buffer.buffer[i + offset];
      offset += dcCount;
      const rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
      const rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);
      const modPoly = rawPoly.mod(rsPoly);
      ecdata[r] = new Array(rsPoly.getLength() - 1);
      for (let i = 0; i < ecdata[r].length; i++) {
        const modIndex = i + modPoly.getLength() - ecdata[r].length;
        ecdata[r][i] = (modIndex >= 0) ? modPoly.get(modIndex) : 0;
      }
    }
    let totalCodeCount = 0;
    for (let i = 0; i < rsBlocks.length; i++) totalCodeCount += rsBlocks[i].totalCount;
    const data = new Array(totalCodeCount);
    let index = 0;
    for (let i = 0; i < maxDcCount; i++) {
      for (let r = 0; r < rsBlocks.length; r++) {
        if (i < dcdata[r].length) data[index++] = dcdata[r][i];
      }
    }
    for (let i = 0; i < maxEcCount; i++) {
      for (let r = 0; r < rsBlocks.length; r++) {
        if (i < ecdata[r].length) data[index++] = ecdata[r][i];
      }
    }
    return data;
  };

  return {
    generateCanvas: function (canvas, text, options) {
      options = options || {};
      const eccMap = { L: QRErrorCorrectLevel.L, M: QRErrorCorrectLevel.M, Q: QRErrorCorrectLevel.Q, H: QRErrorCorrectLevel.H };
      const ecc = eccMap[options.errorCorrectionLevel || 'M'] || QRErrorCorrectLevel.M;
      const fg = options.dark || '#000000';
      const bg = options.light || '#ffffff';
      const margin = options.margin !== undefined ? options.margin : 2;
      const targetSize = options.width || 260;

      const qr = new QRCodeModel(0, ecc);
      qr.addData(text);
      qr.make();

      const count = qr.getModuleCount();
      const totalModules = count + margin * 2;
      const moduleSize = Math.max(1, Math.floor(targetSize / totalModules));
      const size = totalModules * moduleSize;

      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, size, size);

      ctx.fillStyle = fg;
      for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
          if (qr.isDark(r, c)) {
            ctx.fillRect((c + margin) * moduleSize, (r + margin) * moduleSize, moduleSize, moduleSize);
          }
        }
      }
      return canvas;
    },
    generateSvg: function (text, options) {
      options = options || {};
      const eccMap = { L: QRErrorCorrectLevel.L, M: QRErrorCorrectLevel.M, Q: QRErrorCorrectLevel.Q, H: QRErrorCorrectLevel.H };
      const ecc = eccMap[options.errorCorrectionLevel || 'M'] || QRErrorCorrectLevel.M;
      const fg = options.dark || '#000000';
      const bg = options.light || '#ffffff';
      const margin = options.margin !== undefined ? options.margin : 2;

      const qr = new QRCodeModel(0, ecc);
      qr.addData(text);
      qr.make();

      const count = qr.getModuleCount();
      const total = count + margin * 2;
      let path = '';

      for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
          if (qr.isDark(r, c)) {
            path += `M${c + margin},${r + margin}h1v1h-1z `;
          }
        }
      }

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="300" height="300">
        <rect width="100%" height="100%" fill="${bg}"/>
        <path d="${path}" fill="${fg}"/>
      </svg>`;
    }
  };
})();

// ==========================================================================
// QR Studio UI & Controller
// ==========================================================================
const QrStudio = {
  state: {
    currentType: 'url',
    cameraStream: null,
    cameraAnimFrame: null
  },

  init() {
    this.initGenerator();
    this.initScanner();
  },

  /* ==========================================================================
     1. QR CODE GENERATOR
     ========================================================================== */
  initGenerator() {
    // Type Tabs
    document.querySelectorAll('.qr-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.qr-type-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.qr-type-form').forEach(f => f.classList.remove('active'));

        btn.classList.add('active');
        this.state.currentType = btn.dataset.type;
        const formEl = document.getElementById(`qrForm-${this.state.currentType}`);
        if (formEl) formEl.classList.add('active');
        this.renderQrCode();
      });
    });

    // Inputs change triggers
    const triggerInputs = [
      'qrUrlInput', 'qrTextInput', 'qrWifiSsid', 'qrWifiPassword', 'qrWifiEncryption',
      'qrVcardFirst', 'qrVcardLast', 'qrVcardPhone', 'qrVcardEmail',
      'qrEmailTo', 'qrEmailSubject', 'qrEmailBody', 'qrEccLevel'
    ];

    triggerInputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => this.renderQrCode());
        el.addEventListener('change', () => this.renderQrCode());
      }
    });

    // Color Pickers
    const fgColor = document.getElementById('qrFgColor');
    const bgColor = document.getElementById('qrBgColor');

    if (fgColor && bgColor) {
      fgColor.addEventListener('input', (e) => {
        document.getElementById('qrFgColorHex').textContent = e.target.value;
        this.renderQrCode();
      });
      bgColor.addEventListener('input', (e) => {
        document.getElementById('qrBgColorHex').textContent = e.target.value;
        this.renderQrCode();
      });
    }

    // Download Actions
    document.getElementById('downloadQrPngBtn').addEventListener('click', () => {
      const canvas = document.getElementById('qrCanvas');
      Utils.downloadDataUrl(canvas.toDataURL('image/png'), 'qrcode.png');
      Utils.showToast('QR Code PNG downloaded!', 'success');
    });

    document.getElementById('downloadQrSvgBtn').addEventListener('click', () => this.downloadQrSvg());

    // Initial render
    this.renderQrCode();
  },

  getQrPayload() {
    const type = this.state.currentType;

    if (type === 'url') {
      return document.getElementById('qrUrlInput').value.trim() || 'https://google.com';
    }

    if (type === 'text') {
      return document.getElementById('qrTextInput').value.trim() || 'OmniTools QR Code';
    }

    if (type === 'wifi') {
      const ssid = document.getElementById('qrWifiSsid').value.trim() || 'My_WiFi';
      const pass = document.getElementById('qrWifiPassword').value.trim() || '';
      const enc = document.getElementById('qrWifiEncryption').value;
      return `WIFI:T:${enc};S:${ssid};P:${pass};;`;
    }

    if (type === 'vcard') {
      const first = document.getElementById('qrVcardFirst').value.trim() || 'John';
      const last = document.getElementById('qrVcardLast').value.trim() || 'Doe';
      const phone = document.getElementById('qrVcardPhone').value.trim() || '';
      const email = document.getElementById('qrVcardEmail').value.trim() || '';
      return `BEGIN:VCARD\nVERSION:3.0\nN:${last};${first}\nFN:${first} ${last}\nTEL:${phone}\nEMAIL:${email}\nEND:VCARD`;
    }

    if (type === 'email') {
      const to = document.getElementById('qrEmailTo').value.trim() || '';
      const subject = encodeURIComponent(document.getElementById('qrEmailSubject').value.trim());
      const body = encodeURIComponent(document.getElementById('qrEmailBody').value.trim());
      return `mailto:${to}?subject=${subject}&body=${body}`;
    }

    return 'https://google.com';
  },

  renderQrCode() {
    const canvas = document.getElementById('qrCanvas');
    if (!canvas) return;

    const payload = this.getQrPayload();
    const fg = document.getElementById('qrFgColor').value;
    const bg = document.getElementById('qrBgColor').value;
    const ecc = document.getElementById('qrEccLevel').value;

    try {
      QRCore.generateCanvas(canvas, payload, {
        width: 260,
        margin: 2,
        dark: fg,
        light: bg,
        errorCorrectionLevel: ecc
      });
    } catch (err) {
      console.error('QR Render error:', err);
    }
  },

  downloadQrSvg() {
    const payload = this.getQrPayload();
    const fg = document.getElementById('qrFgColor').value;
    const bg = document.getElementById('qrBgColor').value;
    const ecc = document.getElementById('qrEccLevel').value;

    try {
      const svgString = QRCore.generateSvg(payload, {
        margin: 2,
        dark: fg,
        light: bg,
        errorCorrectionLevel: ecc
      });
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      Utils.downloadBlob(blob, 'qrcode.svg');
      Utils.showToast('QR Code SVG downloaded!', 'success');
    } catch (err) {
      console.error('SVG QR error:', err);
      Utils.showToast('Failed to export SVG', 'error');
    }
  },

  /* ==========================================================================
     2. QR CODE SCANNER & DECODER
     ========================================================================== */
  initScanner() {
    // Tabs
    document.querySelectorAll('.scanner-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.scanner-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.scanner-tab-view').forEach(v => v.classList.remove('active'));

        btn.classList.add('active');
        const tab = btn.dataset.tab;
        if (tab === 'upload') {
          document.getElementById('qrScannerUploadView').classList.add('active');
          this.stopCameraStream();
        } else {
          document.getElementById('qrScannerCameraView').classList.add('active');
        }
      });
    });

    // File Upload
    const dropzone = document.getElementById('qrScanDropzone');
    const input = document.getElementById('qrScanFileInput');

    if (dropzone && input) {
      Utils.setupDropzone(dropzone, input, (files) => {
        const file = files[0];
        if (file && file.type.startsWith('image/')) {
          this.scanImageFile(file);
        }
      });
    }

    // Clipboard paste support for QR images
    window.addEventListener('paste', (e) => {
      const items = e.clipboardData ? e.clipboardData.items : [];
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            Utils.showToast('Scanning image from clipboard...', 'info');
            this.scanImageFile(file);
            break;
          }
        }
      }
    });

    // Camera Controls
    const startCamBtn = document.getElementById('startQrCameraBtn');
    const stopCamBtn = document.getElementById('stopQrCameraBtn');

    if (startCamBtn && stopCamBtn) {
      startCamBtn.addEventListener('click', () => this.startCameraStream());
      stopCamBtn.addEventListener('click', () => this.stopCameraStream());
    }

    // Result buttons
    document.getElementById('copyQrResultBtn').addEventListener('click', () => {
      const text = document.getElementById('qrDecodedContent').textContent;
      Utils.copyToClipboard(text, 'QR content copied!');
    });
  },

  scanImageFile(file) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      if (window.jsQR) {
        const code = jsQR(imgData.data, imgData.width, imgData.height);
        if (code) {
          this.displayScanResult(code.data);
        } else {
          Utils.showToast('No QR code detected in this image.', 'warning');
        }
      } else {
        Utils.showToast('QR decoder engine is loading...', 'info');
      }
    };
    img.src = url;
  },

  async startCameraStream() {
    const video = document.getElementById('qrCameraVideo');
    const startBtn = document.getElementById('startQrCameraBtn');
    const stopBtn = document.getElementById('stopQrCameraBtn');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      this.state.cameraStream = stream;
      video.srcObject = stream;
      video.setAttribute('playsinline', true);
      await video.play();

      startBtn.classList.add('hidden');
      stopBtn.classList.remove('hidden');

      this.tickCameraScan();
    } catch (err) {
      console.error('Camera Access Error:', err);
      Utils.showToast('Could not access camera. Please check browser permissions.', 'error');
    }
  },

  stopCameraStream() {
    if (this.state.cameraStream) {
      this.state.cameraStream.getTracks().forEach(track => track.stop());
      this.state.cameraStream = null;
    }
    if (this.state.cameraAnimFrame) {
      cancelAnimationFrame(this.state.cameraAnimFrame);
      this.state.cameraAnimFrame = null;
    }
    const startBtn = document.getElementById('startQrCameraBtn');
    const stopBtn = document.getElementById('stopQrCameraBtn');
    if (startBtn && stopBtn) {
      startBtn.classList.remove('hidden');
      stopBtn.classList.add('hidden');
    }
  },

  tickCameraScan() {
    const video = document.getElementById('qrCameraVideo');
    if (video.readyState === video.HAVE_ENOUGH_DATA && window.jsQR) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imgData.data, imgData.width, imgData.height, {
        inversionAttempts: 'dontInvert'
      });

      if (code) {
        this.displayScanResult(code.data);
        this.stopCameraStream();
        return;
      }
    }

    if (this.state.cameraStream) {
      this.state.cameraAnimFrame = requestAnimationFrame(() => this.tickCameraScan());
    }
  },

  displayScanResult(content) {
    const card = document.getElementById('qrScanResultCard');
    const contentBox = document.getElementById('qrDecodedContent');
    const badge = document.getElementById('qrResultTypeBadge');
    const openUrlBtn = document.getElementById('openQrUrlBtn');

    contentBox.textContent = content;
    card.classList.remove('hidden');

    const isUrl = /^https?:\/\//i.test(content);
    if (isUrl) {
      badge.textContent = 'WEBSITE URL';
      openUrlBtn.href = content;
      openUrlBtn.classList.remove('hidden');
    } else if (/^WIFI:/i.test(content)) {
      badge.textContent = 'WI-FI CREDENTIALS';
      openUrlBtn.classList.add('hidden');
    } else if (/^BEGIN:VCARD/i.test(content)) {
      badge.textContent = 'CONTACT VCARD';
      openUrlBtn.classList.add('hidden');
    } else {
      badge.textContent = 'PLAIN TEXT';
      openUrlBtn.classList.add('hidden');
    }

    Utils.showToast('QR Code Decoded Successfully!', 'success');
  }
};

window.QrStudio = QrStudio;
