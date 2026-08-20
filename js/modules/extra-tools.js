/**
 * OmniTools — Extra Productivity Suite Module
 * Includes: Password Generator, Text Diff Checker, Unix Timestamp & Date Calculator, 
 * Markdown Scratchpad, and Regex Pattern Tester.
 */

const ExtraTools = {
  init() {
    this.initPasswordGen();
    this.initDiffChecker();
    this.initTimeCalc();
    this.initScratchpad();
    this.initRegexTester();
  },

  /* ==========================================================================
     1. SECURE PASSWORD & PASSPHRASE GENERATOR
     ========================================================================== */
  initPasswordGen() {
    const lengthSlider = document.getElementById('pwLengthSlider');
    const lengthVal = document.getElementById('pwLengthVal');
    const generateBtn = document.getElementById('generatePwBtn');
    const copyBtn = document.getElementById('copyPwBtn');
    const output = document.getElementById('pwOutput');
    const modeTabs = document.querySelectorAll('.pw-mode-btn');

    if (!lengthSlider || !output) return;

    let currentMode = 'random'; // 'random' or 'passphrase'

    modeTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        modeTabs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.dataset.mode;
        
        const randomOptions = document.getElementById('pwRandomOptions');
        const passphraseOptions = document.getElementById('pwPassphraseOptions');

        if (currentMode === 'random') {
          randomOptions.classList.remove('hidden');
          passphraseOptions.classList.add('hidden');
          lengthSlider.min = 8;
          lengthSlider.max = 64;
          lengthSlider.value = 18;
          lengthVal.textContent = '18 chars';
        } else {
          randomOptions.classList.add('hidden');
          passphraseOptions.classList.remove('hidden');
          lengthSlider.min = 3;
          lengthSlider.max = 10;
          lengthSlider.value = 4;
          lengthVal.textContent = '4 words';
        }
        generate();
      });
    });

    const generate = () => {
      if (currentMode === 'random') {
        const length = parseInt(lengthSlider.value);
        const incUpper = document.getElementById('pwIncUpper').checked;
        const incLower = document.getElementById('pwIncLower').checked;
        const incNumbers = document.getElementById('pwIncNumbers').checked;
        const incSymbols = document.getElementById('pwIncSymbols').checked;
        const noAmbiguous = document.getElementById('pwNoAmbiguous').checked;

        let chars = '';
        if (incUpper) chars += noAmbiguous ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (incLower) chars += noAmbiguous ? 'abcdefghijkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
        if (incNumbers) chars += noAmbiguous ? '23456789' : '0123456789';
        if (incSymbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

        if (!chars) {
          chars = 'abcdefghijklmnopqrstuvwxyz';
          document.getElementById('pwIncLower').checked = true;
        }

        const array = new Uint32Array(length);
        crypto.getRandomValues(array);
        let password = '';
        for (let i = 0; i < length; i++) {
          password += chars[array[i] % chars.length];
        }

        output.value = password;
        this.updatePasswordStrength(password, chars.length);
      } else {
        // Passphrase mode (Diceware style)
        const wordCount = parseInt(lengthSlider.value);
        const separator = document.getElementById('pwSeparatorSelect').value;
        const capitalize = document.getElementById('pwCapitalizeWords').checked;
        const includeNumber = document.getElementById('pwIncludeNumberInWord').checked;

        const wordlist = [
          'galaxy', 'quantum', 'cipher', 'velvet', 'aurora', 'nexus', 'prism', 'falcon',
          'horizon', 'matrix', 'crystal', 'vector', 'cascade', 'zenith', 'pulse', 'shadow',
          'beacon', 'orbit', 'stellar', 'plasma', 'vortex', 'ember', 'glacier', 'phantom',
          'radiant', 'tempest', 'voyage', 'summit', 'meteor', 'timber', 'obsidian', 'nebula',
          'breeze', 'canyon', 'dynamo', 'echo', 'frost', 'harbor', 'island', 'jupiter',
          'kinetic', 'lunar', 'magnet', 'oasis', 'pioneer', 'quest', 'radar', 'safari'
        ];

        const selectedWords = [];
        const array = new Uint32Array(wordCount);
        crypto.getRandomValues(array);

        for (let i = 0; i < wordCount; i++) {
          let word = wordlist[array[i] % wordlist.length];
          if (capitalize) word = word.charAt(0).toUpperCase() + word.slice(1);
          selectedWords.push(word);
        }

        if (includeNumber) {
          const randNum = Math.floor(Math.random() * 90 + 10);
          selectedWords[selectedWords.length - 1] += randNum;
        }

        const passphrase = selectedWords.join(separator);
        output.value = passphrase;
        this.updatePasswordStrength(passphrase, wordlist.length);
      }
    };

    lengthSlider.addEventListener('input', (e) => {
      lengthVal.textContent = currentMode === 'random' ? `${e.target.value} chars` : `${e.target.value} words`;
      generate();
    });

    const triggerIds = ['pwIncUpper', 'pwIncLower', 'pwIncNumbers', 'pwIncSymbols', 'pwNoAmbiguous', 'pwSeparatorSelect', 'pwCapitalizeWords', 'pwIncludeNumberInWord'];
    triggerIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', generate);
    });

    generateBtn.addEventListener('click', generate);
    copyBtn.addEventListener('click', () => {
      Utils.copyToClipboard(output.value, 'Password copied to clipboard!');
    });

    // Initial generate
    generate();
  },

  updatePasswordStrength(password, poolSize) {
    const entropy = Math.round(password.length * Math.log2(Math.max(2, poolSize)));
    const strengthBar = document.getElementById('pwStrengthBar');
    const strengthLabel = document.getElementById('pwStrengthLabel');
    const entropyDisplay = document.getElementById('pwEntropyDisplay');

    if (!strengthBar) return;

    entropyDisplay.textContent = `${entropy} bits of entropy`;

    if (entropy < 40) {
      strengthBar.style.width = '25%';
      strengthBar.style.background = 'var(--danger)';
      strengthLabel.textContent = 'Weak';
      strengthLabel.style.color = 'var(--danger)';
    } else if (entropy < 65) {
      strengthBar.style.width = '55%';
      strengthBar.style.background = 'var(--warning)';
      strengthLabel.textContent = 'Moderate';
      strengthLabel.style.color = 'var(--warning)';
    } else if (entropy < 90) {
      strengthBar.style.width = '80%';
      strengthBar.style.background = '#3b82f6';
      strengthLabel.textContent = 'Strong';
      strengthLabel.style.color = '#3b82f6';
    } else {
      strengthBar.style.width = '100%';
      strengthBar.style.background = 'var(--success)';
      strengthLabel.textContent = 'Very Strong & Secure';
      strengthLabel.style.color = 'var(--success)';
    }
  },

  /* ==========================================================================
     2. TEXT & CODE DIFF CHECKER
     ========================================================================== */
  initDiffChecker() {
    const textA = document.getElementById('diffTextA');
    const textB = document.getElementById('diffTextB');
    const compareBtn = document.getElementById('compareDiffBtn');
    const swapBtn = document.getElementById('swapDiffBtn');
    const clearBtn = document.getElementById('clearDiffBtn');
    const output = document.getElementById('diffOutputContainer');
    const sampleBtn = document.getElementById('loadSampleDiffBtn');

    if (!textA || !textB) return;

    const runDiff = () => {
      const linesA = textA.value.split('\n');
      const linesB = textB.value.split('\n');

      const diffResult = this.computeLineDiff(linesA, linesB);
      this.renderDiffOutput(diffResult);
    };

    compareBtn.addEventListener('click', runDiff);

    swapBtn.addEventListener('click', () => {
      const temp = textA.value;
      textA.value = textB.value;
      textB.value = temp;
      runDiff();
    });

    clearBtn.addEventListener('click', () => {
      textA.value = '';
      textB.value = '';
      output.innerHTML = '<div style="padding: 24px; text-align: center; color: var(--text-muted);">Enter text in both panels and click Compare.</div>';
    });

    sampleBtn.addEventListener('click', () => {
      textA.value = `function calculateTotal(items, taxRate) {
  let subtotal = 0;
  for (let i = 0; i < items.length; i++) {
    subtotal += items[i].price;
  }
  const tax = subtotal * taxRate;
  return subtotal + tax;
}`;
      textB.value = `function calculateTotal(items, taxRate = 0.05) {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const tax = subtotal * taxRate;
  const grandTotal = subtotal + tax;
  return Number(grandTotal.toFixed(2));
}`;
      runDiff();
    });

    // Run sample on start
    sampleBtn.click();
  },

  computeLineDiff(a, b) {
    const m = a.length;
    const n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        if (a[i] === b[j]) {
          dp[i + 1][j + 1] = dp[i][j] + 1;
        } else {
          dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
      }
    }

    let i = m, j = n;
    const result = [];

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
        result.unshift({ type: 'same', text: a[i - 1] });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        result.unshift({ type: 'added', text: b[j - 1] });
        j--;
      } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
        result.unshift({ type: 'removed', text: a[i - 1] });
        i--;
      }
    }

    return result;
  },

  renderDiffOutput(diffResult) {
    const container = document.getElementById('diffOutputContainer');
    container.innerHTML = '';

    let addedCount = 0;
    let removedCount = 0;

    const wrapper = document.createElement('div');
    wrapper.className = 'diff-view-lines';

    diffResult.forEach((line, idx) => {
      const lineEl = document.createElement('div');
      lineEl.className = `diff-line diff-${line.type}`;

      let symbol = ' ';
      if (line.type === 'added') {
        symbol = '+';
        addedCount++;
      } else if (line.type === 'removed') {
        symbol = '-';
        removedCount++;
      }

      lineEl.innerHTML = `
        <span class="diff-line-num">${idx + 1}</span>
        <span class="diff-line-sign">${symbol}</span>
        <span class="diff-line-text">${this.escapeHtml(line.text) || '&nbsp;'}</span>
      `;
      wrapper.appendChild(lineEl);
    });

    document.getElementById('diffAddedBadge').textContent = `+${addedCount} additions`;
    document.getElementById('diffRemovedBadge').textContent = `-${removedCount} deletions`;

    container.appendChild(wrapper);
  },

  escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  /* ==========================================================================
     3. TIMESTAMP & DATE CALCULATOR
     ========================================================================== */
  initTimeCalc() {
    const nowEpochInput = document.getElementById('currentEpochDisplay');
    const epochInput = document.getElementById('epochToDateInput');
    const epochUnitSelect = document.getElementById('epochUnitSelect');
    const epochConvertBtn = document.getElementById('convertEpochBtn');
    const dateInput = document.getElementById('dateToEpochInput');
    const dateConvertBtn = document.getElementById('convertDateBtn');

    if (!nowEpochInput) return;

    // Real-time ticking epoch clock
    setInterval(() => {
      nowEpochInput.value = Math.floor(Date.now() / 1000);
    }, 1000);
    nowEpochInput.value = Math.floor(Date.now() / 1000);

    document.getElementById('copyCurrentEpochBtn').addEventListener('click', () => {
      Utils.copyToClipboard(nowEpochInput.value, 'Current timestamp copied!');
    });

    // Epoch to Date
    const convertEpoch = () => {
      const val = parseInt(epochInput.value.trim());
      if (isNaN(val)) return;

      const isMs = epochUnitSelect.value === 'ms';
      const d = new Date(isMs ? val : val * 1000);

      document.getElementById('epochUtcResult').textContent = d.toUTCString();
      document.getElementById('epochLocalResult').textContent = d.toLocaleString();
      document.getElementById('epochIsoResult').textContent = d.toISOString();
      document.getElementById('epochRelativeResult').textContent = this.getRelativeTimeString(d);
    };

    epochConvertBtn.addEventListener('click', convertEpoch);
    epochInput.value = Math.floor(Date.now() / 1000);
    convertEpoch();

    // Date to Epoch
    const convertDate = () => {
      const val = dateInput.value;
      if (!val) return;
      const d = new Date(val);
      document.getElementById('dateToEpochSec').textContent = Math.floor(d.getTime() / 1000);
      document.getElementById('dateToEpochMs').textContent = d.getTime();
    };

    dateConvertBtn.addEventListener('click', convertDate);
    // Default current datetime
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    dateInput.value = now.toISOString().slice(0, 16);
    convertDate();

    // Date Difference Calculator
    const dateStart = document.getElementById('diffDateStart');
    const dateEnd = document.getElementById('diffDateEnd');
    const calcDateDiffBtn = document.getElementById('calcDateDiffBtn');

    if (dateStart && dateEnd) {
      dateStart.value = new Date().toISOString().slice(0, 10);
      const nextWeek = new Date(Date.now() + 14 * 86400000);
      dateEnd.value = nextWeek.toISOString().slice(0, 10);

      const calcDiff = () => {
        const d1 = new Date(dateStart.value);
        const d2 = new Date(dateEnd.value);
        const diffMs = Math.abs(d2 - d1);
        const days = Math.round(diffMs / 86400000);
        const weeks = (days / 7).toFixed(1);
        const hours = days * 24;

        document.getElementById('dateDiffDays').textContent = `${days} Days`;
        document.getElementById('dateDiffWeeks').textContent = `${weeks} Weeks`;
        document.getElementById('dateDiffHours').textContent = `${hours} Hours`;
      };

      calcDateDiffBtn.addEventListener('click', calcDiff);
      calcDiff();
    }
  },

  getRelativeTimeString(date) {
    const diff = Math.round((date.getTime() - Date.now()) / 1000);
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    if (Math.abs(diff) < 60) return rtf.format(diff, 'second');
    if (Math.abs(diff) < 3600) return rtf.format(Math.round(diff / 60), 'minute');
    if (Math.abs(diff) < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
    return rtf.format(Math.round(diff / 86400), 'day');
  },

  /* ==========================================================================
     4. MARKDOWN SCRATCHPAD & QUICK NOTES
     ========================================================================== */
  initScratchpad() {
    const editor = document.getElementById('scratchpadEditor');
    const preview = document.getElementById('scratchpadPreview');
    const clearBtn = document.getElementById('clearScratchpadBtn');
    const copyBtn = document.getElementById('copyScratchpadBtn');
    const downloadBtn = document.getElementById('downloadScratchpadBtn');

    if (!editor || !preview) return;

    // Load saved notes
    const saved = localStorage.getItem('omnitools_scratchpad');
    if (saved) {
      editor.value = saved;
    } else {
      editor.value = `# 📝 Daily Scratchpad & Quick Notes

Welcome to your offline **OmniTools Notes**! Everything you type here is saved automatically in your browser's local storage.

### ✨ Quick Features:
- [x] Auto-saved in real-time
- [x] Markdown live rendering
- [ ] Export directly to \`.md\` or \`.txt\`

> **Note:** Zero server storage—100% private to your device!`;
    }

    const renderMarkdown = () => {
      const text = editor.value;
      localStorage.setItem('omnitools_scratchpad', text);

      // Fast lightweight markdown parser
      let html = text
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
        .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*)\*/gim, '<em>$1</em>')
        .replace(/`([^`]+)`/gim, '<code>$1</code>')
        .replace(/^- \[(x| )\] (.*$)/gim, (_, check, item) => `<div class="check-item ${check === 'x' ? 'checked' : ''}"><input type="checkbox" ${check === 'x' ? 'checked' : ''} disabled> ${item}</div>`)
        .replace(/^- (.*$)/gim, '<li>$1</li>')
        .replace(/\n\n/gim, '<br><br>');

      preview.innerHTML = html;

      // Stats
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      document.getElementById('scratchpadWordCount').textContent = `${words} words`;
    };

    editor.addEventListener('input', renderMarkdown);
    clearBtn.addEventListener('click', () => {
      if (confirm('Clear scratchpad content?')) {
        editor.value = '';
        renderMarkdown();
      }
    });

    copyBtn.addEventListener('click', () => {
      Utils.copyToClipboard(editor.value, 'Notes copied to clipboard!');
    });

    downloadBtn.addEventListener('click', () => {
      const blob = new Blob([editor.value], { type: 'text/markdown;charset=utf-8' });
      Utils.downloadBlob(blob, 'notes.md');
      Utils.showToast('Downloaded notes.md!', 'success');
    });

    renderMarkdown();
  },

  /* ==========================================================================
     5. REGEX PATTERN PLAYGROUND & PRESETS
     ========================================================================== */
  initRegexTester() {
    const patternInput = document.getElementById('regexPatternInput');
    const testTextInput = document.getElementById('regexTestTextInput');
    const resultsContainer = document.getElementById('regexResultsContainer');
    const flagGlobal = document.getElementById('flagGlobal');
    const flagCase = document.getElementById('flagCase');
    const flagMultiline = document.getElementById('flagMultiline');
    const matchCountBadge = document.getElementById('regexMatchCount');

    if (!patternInput || !testTextInput) return;

    const testRegex = () => {
      const pattern = patternInput.value;
      const text = testTextInput.value;

      if (!pattern) {
        resultsContainer.innerHTML = '<div style="color: var(--text-muted); padding: 14px;">Enter a regular expression above.</div>';
        matchCountBadge.textContent = '0 matches';
        return;
      }

      let flags = '';
      if (flagGlobal.checked) flags += 'g';
      if (flagCase.checked) flags += 'i';
      if (flagMultiline.checked) flags += 'm';

      try {
        const regex = new RegExp(pattern, flags);
        const matches = [];

        if (flags.includes('g')) {
          let match;
          while ((match = regex.exec(text)) !== null) {
            matches.push({ text: match[0], index: match.index, groups: match.slice(1) });
            if (match.index === regex.lastIndex) regex.lastIndex++;
          }
        } else {
          const match = regex.exec(text);
          if (match) matches.push({ text: match[0], index: match.index, groups: match.slice(1) });
        }

        matchCountBadge.textContent = `${matches.length} matches`;

        if (matches.length === 0) {
          resultsContainer.innerHTML = '<div style="color: var(--warning); padding: 14px;">No matches found.</div>';
          return;
        }

        resultsContainer.innerHTML = '';
        matches.forEach((m, idx) => {
          const card = document.createElement('div');
          card.className = 'regex-match-pill';
          card.innerHTML = `
            <span class="match-num">#${idx + 1}</span>
            <span class="match-val">${this.escapeHtml(m.text)}</span>
            <span class="match-pos">Index: ${m.index}</span>
          `;
          resultsContainer.appendChild(card);
        });

      } catch (err) {
        matchCountBadge.textContent = 'Error';
        resultsContainer.innerHTML = `<div style="color: var(--danger); padding: 14px;">Syntax Error: ${err.message}</div>`;
      }
    };

    [patternInput, testTextInput, flagGlobal, flagCase, flagMultiline].forEach(el => {
      el.addEventListener('input', testRegex);
      el.addEventListener('change', testRegex);
    });

    // Preset buttons
    document.querySelectorAll('.regex-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = btn.dataset.preset;
        if (preset === 'email') {
          patternInput.value = '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}';
          testTextInput.value = 'Contact us at support@omnitools.dev or admin@example.org for help.';
        } else if (preset === 'url') {
          patternInput.value = 'https?:\\/\\/[^\\s/$.?#].[^\\s]*';
          testTextInput.value = 'Visit https://github.com or http://localhost:8080 to get started.';
        } else if (preset === 'phone') {
          patternInput.value = '\\+?\\d{1,3}?[-.\\s]?\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}';
          testTextInput.value = 'Call +1 (555) 234-5678 or 555-876-5432.';
        } else if (preset === 'ipv4') {
          patternInput.value = '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b';
          testTextInput.value = 'Local gateway is 192.168.1.1 and DNS is 8.8.8.8.';
        }
        testRegex();
      });
    });

    // Default preset
    document.querySelector('.regex-preset-btn[data-preset="email"]').click();
  }
};

window.ExtraTools = ExtraTools;
