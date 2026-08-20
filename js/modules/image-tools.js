/**
 * OmniTools — Media & Image Tools Module
 * 100% Client-side Image Compression, Format Conversion, Document Scanner, and Palette Extraction.
 */

const ImageTools = {
  state: {
    compressFile: null,
    compressImageObj: null,
    compressedBlob: null,
    batchConvertFiles: [],
    docScanFile: null,
    docScanImageObj: null,
    docScanPreset: 'bw',
    paletteFile: null
  },

  init() {
    this.initCompressor();
    this.initConverter();
    this.initDocScanner();
    this.initColorPalette();
  },

  /* ==========================================================================
     1. SMART IMAGE COMPRESSOR & RESIZER
     ========================================================================== */
  initCompressor() {
    const dropzone = document.getElementById('imgCompressDropzone');
    const input = document.getElementById('imgCompressInput');
    const workspace = document.getElementById('imgCompressWorkspace');
    const qualitySlider = document.getElementById('compressQualitySlider');
    const qualityVal = document.getElementById('compressQualityVal');
    const maxWidthInput = document.getElementById('compressMaxWidthInput');
    const formatSelect = document.getElementById('compressOutputFormat');
    const downloadBtn = document.getElementById('downloadCompressedBtn');

    if (!dropzone || !input) return;

    Utils.setupDropzone(dropzone, input, (files) => {
      const file = files[0];
      if (file && file.type.startsWith('image/')) {
        this.state.compressFile = file;
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          this.state.compressImageObj = img;
          document.getElementById('origImgPreview').src = url;
          document.getElementById('origSizeDisplay').textContent = Utils.formatBytes(file.size);
          maxWidthInput.value = img.width;
          maxWidthInput.placeholder = `Max ${img.width}px`;
          dropzone.classList.add('hidden');
          workspace.classList.remove('hidden');
          this.processCompression();
        };
        img.src = url;
      } else {
        Utils.showToast('Please select a valid image file.', 'warning');
      }
    });

    qualitySlider.addEventListener('input', (e) => {
      qualityVal.textContent = `${e.target.value}%`;
      this.processCompression();
    });

    maxWidthInput.addEventListener('change', () => this.processCompression());
    formatSelect.addEventListener('change', () => this.processCompression());

    downloadBtn.addEventListener('click', () => {
      if (this.state.compressedBlob) {
        const fmt = formatSelect.value;
        const ext = fmt === 'image/webp' ? 'webp' : (fmt === 'image/png' ? 'png' : 'jpg');
        const filename = `optimized_${this.state.compressFile.name.replace(/\.[^/.]+$/, '')}.${ext}`;
        Utils.downloadBlob(this.state.compressedBlob, filename);
        Utils.showToast('Optimized image downloaded!', 'success');
      }
    });
  },

  processCompression() {
    const img = this.state.compressImageObj;
    if (!img) return;

    const quality = parseInt(document.getElementById('compressQualitySlider').value) / 100;
    const format = document.getElementById('compressOutputFormat').value;
    const maxW = parseInt(document.getElementById('compressMaxWidthInput').value) || img.width;

    const scale = Math.min(1, maxW / img.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);

    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      this.state.compressedBlob = blob;
      const previewUrl = URL.createObjectURL(blob);
      document.getElementById('compressedImgPreview').src = previewUrl;
      document.getElementById('newSizeDisplay').textContent = Utils.formatBytes(blob.size);

      const origSize = this.state.compressFile.size;
      const savings = Math.round(((origSize - blob.size) / origSize) * 100);
      const savingsBadge = document.getElementById('savingsPctBadge');

      if (savings > 0) {
        savingsBadge.textContent = `-${savings}% Saved`;
        savingsBadge.style.color = 'var(--success)';
        savingsBadge.style.background = 'rgba(16, 185, 129, 0.15)';
      } else {
        savingsBadge.textContent = `+${Math.abs(savings)}% Size`;
        savingsBadge.style.color = 'var(--warning)';
        savingsBadge.style.background = 'rgba(245, 158, 11, 0.15)';
      }
    }, format, quality);
  },

  /* ==========================================================================
     2. UNIVERSAL IMAGE FORMAT CONVERTER
     ========================================================================== */
  initConverter() {
    const dropzone = document.getElementById('imgConvertDropzone');
    const input = document.getElementById('imgConvertInput');
    const workspace = document.getElementById('imgConvertWorkspace');
    const executeBtn = document.getElementById('executeBatchConvertBtn');

    if (!dropzone || !input) return;

    Utils.setupDropzone(dropzone, input, (files) => {
      const imgFiles = files.filter(f => f.type.startsWith('image/'));
      if (imgFiles.length === 0) {
        Utils.showToast('Please select valid image files.', 'warning');
        return;
      }
      this.state.batchConvertFiles.push(...imgFiles);
      dropzone.classList.add('hidden');
      workspace.classList.remove('hidden');
      this.renderBatchConvertGrid();
    });

    executeBtn.addEventListener('click', () => this.executeBatchConvert());
  },

  renderBatchConvertGrid() {
    const grid = document.getElementById('batchConvertGrid');
    const countBadge = document.getElementById('convertCountBadge');
    countBadge.textContent = this.state.batchConvertFiles.length;

    grid.innerHTML = '';
    this.state.batchConvertFiles.forEach((file, index) => {
      const card = document.createElement('div');
      card.className = 'img-item-card';

      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      card.appendChild(img);

      const footer = document.createElement('div');
      footer.className = 'img-item-footer';
      footer.innerHTML = `
        <span>${file.name.substring(0, 14)}...</span>
        <button class="icon-btn btn-xs remove-convert-btn" data-idx="${index}"><i data-lucide="trash-2"></i></button>
      `;
      card.appendChild(footer);
      grid.appendChild(card);
    });

    if (window.lucide) window.lucide.createIcons();

    grid.querySelectorAll('.remove-convert-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        this.state.batchConvertFiles.splice(idx, 1);
        if (this.state.batchConvertFiles.length === 0) {
          document.getElementById('imgConvertWorkspace').classList.add('hidden');
          document.getElementById('imgConvertDropzone').classList.remove('hidden');
        } else {
          this.renderBatchConvertGrid();
        }
      });
    });
  },

  async executeBatchConvert() {
    const files = this.state.batchConvertFiles;
    if (files.length === 0) return;

    const targetFormat = document.getElementById('targetImageFormat').value;
    const ext = targetFormat === 'image/png' ? 'png' : (targetFormat === 'image/jpeg' ? 'jpg' : (targetFormat === 'image/webp' ? 'webp' : 'bmp'));

    const btn = document.getElementById('executeBatchConvertBtn');
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> Converting...';
    if (window.lucide) window.lucide.createIcons();

    try {
      if (files.length === 1) {
        const blob = await this.convertSingleImage(files[0], targetFormat);
        const name = `${files[0].name.replace(/\.[^/.]+$/, '')}.${ext}`;
        Utils.downloadBlob(blob, name);
        Utils.showToast(`Converted ${files[0].name} to ${ext.toUpperCase()}!`, 'success');
      } else {
        const zip = new JSZip();
        for (const file of files) {
          const blob = await this.convertSingleImage(file, targetFormat);
          const name = `${file.name.replace(/\.[^/.]+$/, '')}.${ext}`;
          zip.file(name, blob);
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        Utils.downloadBlob(zipBlob, `converted_images_${ext}.zip`);
        Utils.showToast(`Batch converted ${files.length} images to ZIP!`, 'success');
      }
    } catch (err) {
      console.error('Batch convert error:', err);
      Utils.showToast('Failed to convert images.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="download"></i> Convert & Download (${files.length})`;
      if (window.lucide) window.lucide.createIcons();
    }
  },

  convertSingleImage(file, targetFormat) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (targetFormat === 'image/jpeg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => resolve(blob), targetFormat, 0.95);
      };
      img.onerror = reject;
      img.src = url;
    });
  },

  /* ==========================================================================
     3. DOCUMENT PHOTO SCAN ENHANCER
     ========================================================================== */
  initDocScanner() {
    const dropzone = document.getElementById('docScanDropzone');
    const input = document.getElementById('docScanInput');
    const workspace = document.getElementById('docScanWorkspace');
    const thresholdSlider = document.getElementById('scanThresholdSlider');
    const contrastSlider = document.getElementById('scanContrastSlider');
    const downloadBtn = document.getElementById('downloadScannedDocBtn');
    const savePdfBtn = document.getElementById('saveScanAsPdfBtn');

    if (!dropzone || !input) return;

    Utils.setupDropzone(dropzone, input, (files) => {
      const file = files[0];
      if (file && file.type.startsWith('image/')) {
        this.state.docScanFile = file;
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          this.state.docScanImageObj = img;
          document.getElementById('origScanPhoto').src = url;
          dropzone.classList.add('hidden');
          workspace.classList.remove('hidden');
          this.applyScanFilter();
        };
        img.src = url;
      }
    });

    document.querySelectorAll('.scan-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.scan-preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.state.docScanPreset = btn.dataset.preset;
        this.applyScanFilter();
      });
    });

    thresholdSlider.addEventListener('input', () => this.applyScanFilter());
    contrastSlider.addEventListener('input', () => this.applyScanFilter());

    downloadBtn.addEventListener('click', () => {
      const canvas = document.getElementById('scanResultCanvas');
      canvas.toBlob((blob) => {
        Utils.downloadBlob(blob, `scanned_doc_${this.state.docScanFile.name}`);
        Utils.showToast('Scanned document image saved!', 'success');
      }, 'image/jpeg', 0.95);
    });

    savePdfBtn.addEventListener('click', async () => {
      const canvas = document.getElementById('scanResultCanvas');
      const pngDataUrl = canvas.toDataURL('image/png');
      const pdfDoc = await PDFLib.PDFDocument.create();
      const pngBytes = await PdfTools.convertImageToPngBytes(pngDataUrl);
      const embedded = await pdfDoc.embedPng(pngBytes);
      const page = pdfDoc.addPage([embedded.width, embedded.height]);
      page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
      const pdfBytes = await pdfDoc.save();
      Utils.downloadBlob(new Blob([pdfBytes], { type: 'application/pdf' }), 'scanned_document.pdf');
      Utils.showToast('Document saved as PDF!', 'success');
    });
  },

  applyScanFilter() {
    const img = this.state.docScanImageObj;
    if (!img) return;

    const canvas = document.getElementById('scanResultCanvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;

    const threshold = parseInt(document.getElementById('scanThresholdSlider').value);
    const contrast = parseFloat(document.getElementById('scanContrastSlider').value);
    const preset = this.state.docScanPreset;

    for (let i = 0; i < d.length; i += 4) {
      let r = d[i];
      let g = d[i + 1];
      let b = d[i + 2];

      // Luminance
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      if (preset === 'bw') {
        // High contrast Black & White thresholding
        const val = lum > threshold ? 255 : 0;
        d[i] = val;
        d[i + 1] = val;
        d[i + 2] = val;
      } else if (preset === 'grayscale') {
        // Boost contrast on grayscale
        const factor = (259 * (contrast * 30 + 255)) / (255 * (259 - (contrast * 30)));
        const newVal = Math.min(255, Math.max(0, factor * (lum - 128) + 128));
        d[i] = newVal;
        d[i + 1] = newVal;
        d[i + 2] = newVal;
      } else if (preset === 'magic') {
        // Flatten background paper to white, keep dark text
        if (lum > threshold - 20) {
          d[i] = 255;
          d[i + 1] = 255;
          d[i + 2] = 255;
        } else {
          d[i] = Math.max(0, r * 0.7);
          d[i + 1] = Math.max(0, g * 0.7);
          d[i + 2] = Math.max(0, b * 0.7);
        }
      } else if (preset === 'high-contrast') {
        // Enhance color contrast
        const factor = (259 * (contrast * 25 + 255)) / (255 * (259 - (contrast * 25)));
        d[i] = Math.min(255, Math.max(0, factor * (r - 128) + 128));
        d[i + 1] = Math.min(255, Math.max(0, factor * (g - 128) + 128));
        d[i + 2] = Math.min(255, Math.max(0, factor * (b - 128) + 128));
      }
    }

    ctx.putImageData(imgData, 0, 0);
  },

  /* ==========================================================================
     4. COLOR PALETTE & CSS TOKENS
     ========================================================================== */
  initColorPalette() {
    const dropzone = document.getElementById('paletteDropzone');
    const input = document.getElementById('paletteInput');
    const workspace = document.getElementById('paletteWorkspace');
    const copyCssBtn = document.getElementById('copyCssTokensBtn');

    if (!dropzone || !input) return;

    Utils.setupDropzone(dropzone, input, (files) => {
      const file = files[0];
      if (file && file.type.startsWith('image/')) {
        this.state.paletteFile = file;
        const url = URL.createObjectURL(file);
        document.getElementById('paletteSourceImg').src = url;
        dropzone.classList.add('hidden');
        workspace.classList.remove('hidden');

        const img = new Image();
        img.onload = () => this.extractPalette(img);
        img.src = url;
      }
    });

    copyCssBtn.addEventListener('click', () => {
      const cssText = document.getElementById('cssTokensDisplay').textContent;
      Utils.copyToClipboard(cssText, 'CSS Variables copied!');
    });
  },

  extractPalette(img) {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, 100, 100);

    const imgData = ctx.getImageData(0, 0, 100, 100).data;
    const colorCounts = {};

    for (let i = 0; i < imgData.length; i += 16) {
      // Sample every 4th pixel
      const r = Math.round(imgData[i] / 24) * 24;
      const g = Math.round(imgData[i + 1] / 24) * 24;
      const b = Math.round(imgData[i + 2] / 24) * 24;
      const key = `${r},${g},${b}`;
      colorCounts[key] = (colorCounts[key] || 0) + 1;
    }

    const sorted = Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(entry => {
        const [r, g, b] = entry[0].split(',').map(Number);
        const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
        return { hex, rgb: `rgb(${r}, ${g}, ${b})` };
      });

    // Render Swatches
    const container = document.getElementById('swatchesContainer');
    container.innerHTML = '';

    let cssTokens = ':root {\n';

    sorted.forEach((col, idx) => {
      const card = document.createElement('div');
      card.className = 'swatch-card';
      card.innerHTML = `
        <div class="swatch-preview" style="background: ${col.hex};"></div>
        <div class="swatch-info">
          <div>${col.hex}</div>
          <div style="font-size: 0.7rem; color: var(--text-muted);">${col.rgb}</div>
        </div>
      `;
      card.onclick = () => Utils.copyToClipboard(col.hex, `Copied ${col.hex}`);
      container.appendChild(card);

      cssTokens += `  --palette-color-${idx + 1}: ${col.hex};\n`;
    });

    cssTokens += '}';
    document.getElementById('cssTokensDisplay').textContent = cssTokens;
  }
};

window.ImageTools = ImageTools;
