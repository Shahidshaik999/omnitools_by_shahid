/**
 * OmniTools — Text, JSON & Cryptographic Utilities
 * In-browser text analysis, string transformations, JSON beautification, and cryptography.
 */

const TextTools = {
  init() {
    this.initCaseConverter();
    this.initJsonStudio();
    this.initEncoderHash();
  },

  /* ==========================================================================
     1. CASE CONVERTER & TEXT STATS
     ========================================================================== */
  initCaseConverter() {
    const input = document.getElementById('caseInputText');
    const clearBtn = document.getElementById('clearCaseTextBtn');
    const copyBtn = document.getElementById('copyCaseTextBtn');

    if (!input) return;

    input.addEventListener('input', () => this.updateTextStats());

    document.querySelectorAll('.case-action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = input.value;
        const caseType = btn.dataset.case;
        input.value = this.transformCase(text, caseType);
        this.updateTextStats();
        Utils.showToast(`Converted to ${btn.textContent}!`, 'info');
      });
    });

    clearBtn.addEventListener('click', () => {
      input.value = '';
      this.updateTextStats();
    });

    copyBtn.addEventListener('click', () => {
      Utils.copyToClipboard(input.value, 'Text copied to clipboard!');
    });
  },

  updateTextStats() {
    const text = document.getElementById('caseInputText').value;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const charsNoSpace = text.replace(/\s/g, '').length;
    const lines = text ? text.split('\n').length : 0;
    const readTimeMinutes = Math.ceil(words / 200);

    document.getElementById('statWords').textContent = words.toLocaleString();
    document.getElementById('statChars').textContent = chars.toLocaleString();
    document.getElementById('statCharsNoSpace').textContent = charsNoSpace.toLocaleString();
    document.getElementById('statLines').textContent = lines.toLocaleString();
    document.getElementById('statReadingTime').textContent = words === 0 ? '0 min' : `${readTimeMinutes} min`;
  },

  transformCase(text, type) {
    if (!text) return '';

    switch (type) {
      case 'upper':
        return text.toUpperCase();
      case 'lower':
        return text.toLowerCase();
      case 'title':
        return text.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
      case 'sentence':
        return text.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, c => c.toUpperCase());
      case 'camel':
        return text
          .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
          .replace(/^([A-Z])/, c => c.toLowerCase());
      case 'pascal':
        return text
          .replace(/(?:^\w|[A-Z]|\b\w)/g, word => word.toUpperCase())
          .replace(/[^a-zA-Z0-9]/g, '');
      case 'snake':
        return text
          .replace(/\W+/g, ' ')
          .trim()
          .split(' ')
          .join('_')
          .toLowerCase();
      case 'kebab':
        return text
          .replace(/\W+/g, ' ')
          .trim()
          .split(' ')
          .join('-')
          .toLowerCase();
      case 'trim':
        return text.replace(/\s+/g, ' ').trim();
      case 'reverse':
        return text.split('').reverse().join('');
      default:
        return text;
    }
  },

  /* ==========================================================================
     2. JSON FORMATTER & STUDIO
     ========================================================================== */
  initJsonStudio() {
    const editor = document.getElementById('jsonEditor');
    const beautifyBtn = document.getElementById('beautifyJsonBtn');
    const minifyBtn = document.getElementById('minifyJsonBtn');
    const repairBtn = document.getElementById('repairJsonBtn');
    const sampleBtn = document.getElementById('loadSampleJsonBtn');
    const copyBtn = document.getElementById('copyJsonBtn');
    const clearBtn = document.getElementById('clearJsonBtn');

    if (!editor) return;

    editor.addEventListener('input', () => this.validateJson());

    beautifyBtn.addEventListener('click', () => {
      try {
        const parsed = JSON.parse(editor.value);
        editor.value = JSON.stringify(parsed, null, 2);
        this.validateJson();
        Utils.showToast('JSON Beautified (2 spaces)', 'success');
      } catch (err) {
        Utils.showToast('Invalid JSON: ' + err.message, 'error');
      }
    });

    minifyBtn.addEventListener('click', () => {
      try {
        const parsed = JSON.parse(editor.value);
        editor.value = JSON.stringify(parsed);
        this.validateJson();
        Utils.showToast('JSON Minified', 'success');
      } catch (err) {
        Utils.showToast('Invalid JSON: ' + err.message, 'error');
      }
    });

    repairBtn.addEventListener('click', () => {
      let raw = editor.value;
      // Fix single quotes to double quotes, clean trailing commas
      raw = raw.replace(/'/g, '"');
      raw = raw.replace(/,\s*([\]}])/g, '$1');
      // Quote unquoted keys
      raw = raw.replace(/([{,]\s*)([a-zA-Z0-9_]+?)\s*:/g, '$1"$2":');
      try {
        const parsed = JSON.parse(raw);
        editor.value = JSON.stringify(parsed, null, 2);
        this.validateJson();
        Utils.showToast('JSON Repaired and Validated!', 'success');
      } catch (err) {
        Utils.showToast('Could not automatically fix JSON: ' + err.message, 'error');
      }
    });

    sampleBtn.addEventListener('click', () => {
      const sample = {
        app: "OmniTools Daily Suite",
        version: "2.4.0",
        clientSide: true,
        features: ["PDF to Word", "Image Compressor", "QR Studio", "Crypto Hashes"],
        meta: {
          privacyRating: "100% Private",
          offlineReady: true,
          buildYear: 2026
        }
      };
      editor.value = JSON.stringify(sample, null, 2);
      this.validateJson();
    });

    copyBtn.addEventListener('click', () => Utils.copyToClipboard(editor.value, 'JSON copied!'));
    clearBtn.addEventListener('click', () => {
      editor.value = '';
      this.validateJson();
    });

    // Sample default
    sampleBtn.click();
  },

  validateJson() {
    const editor = document.getElementById('jsonEditor');
    const banner = document.getElementById('jsonStatusBanner');
    const text = document.getElementById('jsonStatusText');

    if (!editor.value.trim()) {
      banner.className = 'json-status-banner valid';
      text.textContent = 'Ready for JSON input';
      return;
    }

    try {
      JSON.parse(editor.value);
      banner.className = 'json-status-banner valid';
      text.textContent = 'Valid JSON Structure ✓';
    } catch (err) {
      banner.className = 'json-status-banner invalid';
      text.textContent = 'Syntax Error: ' + err.message;
    }
  },

  /* ==========================================================================
     3. BASE64, URL & HASH STUDIO
     ========================================================================== */
  initEncoderHash() {
    const input = document.getElementById('encoderInputText');
    const output = document.getElementById('encoderOutputText');
    const clearBtn = document.getElementById('clearEncoderInputBtn');
    const copyBtn = document.getElementById('copyEncoderOutputBtn');

    if (!input) return;

    input.addEventListener('input', () => this.updateHashes(input.value));

    document.getElementById('encodeBase64Btn').addEventListener('click', () => {
      try {
        // UTF-8 safe Base64 encoding
        output.value = btoa(unescape(encodeURIComponent(input.value)));
        Utils.showToast('Base64 Encoded!', 'info');
      } catch (err) {
        Utils.showToast('Base64 Encoding Error', 'error');
      }
    });

    document.getElementById('decodeBase64Btn').addEventListener('click', () => {
      try {
        output.value = decodeURIComponent(escape(atob(input.value.trim())));
        Utils.showToast('Base64 Decoded!', 'info');
      } catch (err) {
        Utils.showToast('Invalid Base64 string', 'error');
      }
    });

    document.getElementById('encodeUrlBtn').addEventListener('click', () => {
      output.value = encodeURIComponent(input.value);
      Utils.showToast('URL Encoded!', 'info');
    });

    document.getElementById('decodeUrlBtn').addEventListener('click', () => {
      try {
        output.value = decodeURIComponent(input.value);
        Utils.showToast('URL Decoded!', 'info');
      } catch (err) {
        Utils.showToast('Invalid URL encoding', 'error');
      }
    });

    clearBtn.addEventListener('click', () => {
      input.value = '';
      output.value = '';
      this.updateHashes('');
    });

    copyBtn.addEventListener('click', () => {
      Utils.copyToClipboard(output.value, 'Output copied!');
    });

    document.querySelectorAll('.copy-hash-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const val = document.getElementById(targetId).value;
        if (val) Utils.copyToClipboard(val, 'Hash copied!');
      });
    });

    // Default test string
    input.value = 'OmniTools Daily Swiss-Army Knife';
    this.updateHashes(input.value);
  },

  async updateHashes(str) {
    if (!str) {
      document.getElementById('hashSha256').value = '';
      document.getElementById('hashSha512').value = '';
      return;
    }

    const sha256 = await Utils.sha256(str);
    const sha512 = await Utils.sha512(str);

    document.getElementById('hashSha256').value = sha256;
    document.getElementById('hashSha512').value = sha512;
  }
};

window.TextTools = TextTools;
