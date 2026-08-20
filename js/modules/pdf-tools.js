/**
 * OmniTools — PDF & Document Tools Module
 * 100% Client-side PDF manipulation with PDF-Lib, PDF.js, docx.js, and JSZip.
 */

const PdfTools = {
  // State
  state: {
    pdfToWordFile: null,
    mergeFiles: [],
    splitFile: null,
    splitPdfDoc: null,
    splitTotalPages: 0,
    imagesToPdfList: [],
    pdfToImgFile: null,
    pdfSignFile: null,
    pdfSignDoc: null,
    pdfSignCurrentPage: 1,
    pdfSignTotalPages: 1,
    signatureDataUrl: null,
    annotations: [] // array of { type: 'signature'|'text', page: number, x: pct, y: pct, content: dataUrl|string }
  },

  init() {
    this.initPdfToWord();
    this.initPdfMerge();
    this.initPdfSplit();
    this.initImagesToPdf();
    this.initPdfToImages();
    this.initPdfSigner();
  },

  /* ==========================================================================
     1. PDF TO WORD (.docx)
     ========================================================================== */
  initPdfToWord() {
    const dropzone = document.getElementById('pdfToWordDropzone');
    const input = document.getElementById('pdfToWordInput');
    const card = document.getElementById('pdfToWordActiveCard');
    const removeBtn = document.getElementById('pdfToWordRemoveBtn');
    const convertBtn = document.getElementById('pdfToWordConvertBtn');

    if (!dropzone || !input) return;

    Utils.setupDropzone(dropzone, input, (files) => {
      const file = files[0];
      if (file && file.type === 'application/pdf') {
        this.state.pdfToWordFile = file;
        document.getElementById('pdfToWordFileName').textContent = file.name;
        document.getElementById('pdfToWordFileSize').textContent = Utils.formatBytes(file.size);
        dropzone.classList.add('hidden');
        card.classList.remove('hidden');
      } else {
        Utils.showToast('Please select a valid PDF file.', 'warning');
      }
    });

    removeBtn.addEventListener('click', () => {
      this.state.pdfToWordFile = null;
      input.value = '';
      card.classList.add('hidden');
      dropzone.classList.remove('hidden');
      document.getElementById('pdfToWordPreviewBox').classList.add('hidden');
    });

    convertBtn.addEventListener('click', () => this.executePdfToWord());
  },

  async executePdfToWord() {
    const file = this.state.pdfToWordFile;
    if (!file) return;

    const convertBtn = document.getElementById('pdfToWordConvertBtn');
    convertBtn.disabled = true;
    convertBtn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> Extracting & Generating .docx...';
    if (window.lucide) window.lucide.createIcons();

    try {
      const arrayBuffer = await Utils.readFileAsArrayBuffer(file);
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;

      const paragraphs = [];
      let fullTextPreview = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Group items by line according to Y-coordinate
        const linesMap = new Map();
        textContent.items.forEach(item => {
          const y = Math.round(item.transform[5]);
          if (!linesMap.has(y)) linesMap.set(y, []);
          linesMap.get(y).push(item.str);
        });

        // Sort descending by Y coordinate (PDF coordinates start from bottom-left)
        const sortedY = Array.from(linesMap.keys()).sort((a, b) => b - a);

        sortedY.forEach(y => {
          const lineText = linesMap.get(y).join(' ').trim();
          if (lineText) {
            fullTextPreview += lineText + '\n';
            if (window.docx) {
              paragraphs.push(new docx.Paragraph({
                children: [new docx.TextRun(lineText)]
              }));
            }
          }
        });

        // Page break in Word if multi-page
        if (i < pdf.numPages && window.docx) {
          paragraphs.push(new docx.Paragraph({
            children: [new docx.PageBreak()]
          }));
        }
      }

      // Display Preview
      const previewBox = document.getElementById('pdfToWordPreviewBox');
      const textPreview = document.getElementById('pdfToWordTextPreview');
      textPreview.textContent = fullTextPreview || 'No extractable text found in this PDF (it might be a scanned image).';
      previewBox.classList.remove('hidden');

      if (window.docx) {
        const doc = new docx.Document({
          sections: [{
            properties: {},
            children: paragraphs.length > 0 ? paragraphs : [new docx.Paragraph({ children: [new docx.TextRun("Extracted PDF Content")] })]
          }]
        });

        const blob = await docx.Packer.toBlob(doc);
        const outName = file.name.replace(/\.pdf$/i, '') + '.docx';
        Utils.downloadBlob(blob, outName);
        Utils.showToast(`Converted ${file.name} to Word successfully!`, 'success');
      } else {
        // Fallback: download as text file if docx library was offline
        const blob = new Blob([fullTextPreview], { type: 'text/plain;charset=utf-8' });
        Utils.downloadBlob(blob, file.name.replace(/\.pdf$/i, '') + '.txt');
        Utils.showToast(`Extracted text file saved!`, 'success');
      }
    } catch (err) {
      console.error('PDF to Word Error:', err);
      Utils.showToast('Failed to convert PDF. Ensure it is not password-protected.', 'error');
    } finally {
      convertBtn.disabled = false;
      convertBtn.innerHTML = '<i data-lucide="download"></i> Convert & Download .docx';
      if (window.lucide) window.lucide.createIcons();
    }
  },

  /* ==========================================================================
     2. MERGE PDFS
     ========================================================================== */
  initPdfMerge() {
    const dropzone = document.getElementById('pdfMergeDropzone');
    const input = document.getElementById('pdfMergeInput');
    const listWrapper = document.getElementById('pdfMergeListWrapper');
    const addMoreBtn = document.getElementById('addMorePdfsBtn');
    const executeBtn = document.getElementById('mergePdfsExecuteBtn');

    if (!dropzone || !input) return;

    const handleFiles = (files) => {
      const pdfs = files.filter(f => f.type === 'application/pdf');
      if (pdfs.length === 0) {
        Utils.showToast('Please select valid PDF files.', 'warning');
        return;
      }
      this.state.mergeFiles.push(...pdfs);
      dropzone.classList.add('hidden');
      listWrapper.classList.remove('hidden');
      this.renderMergeQueue();
    };

    Utils.setupDropzone(dropzone, input, handleFiles);

    addMoreBtn.addEventListener('click', () => {
      const tempInput = document.createElement('input');
      tempInput.type = 'file';
      tempInput.accept = 'application/pdf';
      tempInput.multiple = true;
      tempInput.onchange = (e) => {
        if (e.target.files) handleFiles(Array.from(e.target.files));
      };
      tempInput.click();
    });

    executeBtn.addEventListener('click', () => this.executePdfMerge());
  },

  renderMergeQueue() {
    const queueEl = document.getElementById('pdfMergeQueue');
    const countEl = document.getElementById('mergeCount');
    const dropzone = document.getElementById('pdfMergeDropzone');
    const listWrapper = document.getElementById('pdfMergeListWrapper');

    countEl.textContent = this.state.mergeFiles.length;

    if (this.state.mergeFiles.length === 0) {
      listWrapper.classList.add('hidden');
      dropzone.classList.remove('hidden');
      return;
    }

    queueEl.innerHTML = '';
    this.state.mergeFiles.forEach((file, index) => {
      const item = document.createElement('div');
      item.className = 'queue-item';
      item.innerHTML = `
        <span class="queue-index">#${index + 1}</span>
        <span class="queue-name" title="${file.name}">${file.name}</span>
        <span class="filesize">${Utils.formatBytes(file.size)}</span>
        <div class="queue-actions">
          <button class="icon-btn btn-sm move-up-btn" data-idx="${index}" title="Move Up" ${index === 0 ? 'disabled' : ''}>
            <i data-lucide="arrow-up"></i>
          </button>
          <button class="icon-btn btn-sm move-down-btn" data-idx="${index}" title="Move Down" ${index === this.state.mergeFiles.length - 1 ? 'disabled' : ''}>
            <i data-lucide="arrow-down"></i>
          </button>
          <button class="icon-btn btn-sm remove-merge-btn" data-idx="${index}" title="Remove">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      `;
      queueEl.appendChild(item);
    });

    if (window.lucide) window.lucide.createIcons();

    // Event listeners
    queueEl.querySelectorAll('.move-up-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(btn.dataset.idx);
        if (idx > 0) {
          const temp = this.state.mergeFiles[idx];
          this.state.mergeFiles[idx] = this.state.mergeFiles[idx - 1];
          this.state.mergeFiles[idx - 1] = temp;
          this.renderMergeQueue();
        }
      });
    });

    queueEl.querySelectorAll('.move-down-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(btn.dataset.idx);
        if (idx < this.state.mergeFiles.length - 1) {
          const temp = this.state.mergeFiles[idx];
          this.state.mergeFiles[idx] = this.state.mergeFiles[idx + 1];
          this.state.mergeFiles[idx + 1] = temp;
          this.renderMergeQueue();
        }
      });
    });

    queueEl.querySelectorAll('.remove-merge-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        this.state.mergeFiles.splice(idx, 1);
        this.renderMergeQueue();
      });
    });
  },

  async executePdfMerge() {
    if (this.state.mergeFiles.length < 2) {
      Utils.showToast('Please add at least 2 PDF files to merge.', 'warning');
      return;
    }

    const btn = document.getElementById('mergePdfsExecuteBtn');
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> Merging PDFs...';
    if (window.lucide) window.lucide.createIcons();

    try {
      const mergedPdf = await PDFLib.PDFDocument.create();

      for (const file of this.state.mergeFiles) {
        const fileBuffer = await Utils.readFileAsArrayBuffer(file);
        const pdf = await PDFLib.PDFDocument.load(fileBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      Utils.downloadBlob(blob, 'merged_document.pdf');
      Utils.showToast('Merged successfully into single PDF!', 'success');
    } catch (err) {
      console.error('PDF Merge Error:', err);
      Utils.showToast('Failed to merge PDFs. One of the files may be corrupted or encrypted.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="combine"></i> Merge & Download PDF';
      if (window.lucide) window.lucide.createIcons();
    }
  },

  /* ==========================================================================
     3. SPLIT & EXTRACT PDF
     ========================================================================== */
  initPdfSplit() {
    const dropzone = document.getElementById('pdfSplitDropzone');
    const input = document.getElementById('pdfSplitInput');
    const card = document.getElementById('pdfSplitActiveCard');
    const removeBtn = document.getElementById('pdfSplitRemoveBtn');
    const executeBtn = document.getElementById('pdfSplitExecuteBtn');

    if (!dropzone || !input) return;

    Utils.setupDropzone(dropzone, input, async (files) => {
      const file = files[0];
      if (file && file.type === 'application/pdf') {
        this.state.splitFile = file;
        document.getElementById('pdfSplitFileName').textContent = file.name;
        dropzone.classList.add('hidden');
        card.classList.remove('hidden');
        await this.loadPdfSplitThumbnails(file);
      }
    });

    removeBtn.addEventListener('click', () => {
      this.state.splitFile = null;
      this.state.splitPdfDoc = null;
      input.value = '';
      card.classList.add('hidden');
      dropzone.classList.remove('hidden');
    });

    executeBtn.addEventListener('click', () => this.executePdfSplit());
  },

  async loadPdfSplitThumbnails(file) {
    const container = document.getElementById('pdfSplitThumbnails');
    container.innerHTML = '<div style="padding: 20px; color: var(--text-muted);">Generating page thumbnails...</div>';

    try {
      const buffer = await Utils.readFileAsArrayBuffer(file);
      const loadingTask = pdfjsLib.getDocument({ data: buffer });
      const pdf = await loadingTask.promise;
      this.state.splitPdfDoc = pdf;
      this.state.splitTotalPages = pdf.numPages;
      document.getElementById('pdfSplitPageCount').textContent = `Total Pages: ${pdf.numPages}`;
      
      container.innerHTML = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.25 });

        const thumbCard = document.createElement('div');
        thumbCard.className = 'page-thumb-card selected';
        thumbCard.dataset.page = i;

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        await page.render({ canvasContext: ctx, viewport }).promise;

        thumbCard.appendChild(canvas);
        const numLabel = document.createElement('span');
        numLabel.className = 'page-thumb-number';
        numLabel.textContent = `Page ${i}`;
        thumbCard.appendChild(numLabel);

        thumbCard.addEventListener('click', () => {
          thumbCard.classList.toggle('selected');
          this.syncSplitRangeFromThumbnails();
        });

        container.appendChild(thumbCard);
      }

      this.syncSplitRangeFromThumbnails();
    } catch (err) {
      console.error('Split Thumbnail error:', err);
      container.innerHTML = '<div style="color: var(--danger); padding: 10px;">Failed to render page previews.</div>';
    }
  },

  syncSplitRangeFromThumbnails() {
    const selectedThumbs = document.querySelectorAll('.page-thumb-card.selected');
    const pages = Array.from(selectedThumbs).map(t => parseInt(t.dataset.page)).sort((a, b) => a - b);
    document.getElementById('pdfSplitRangeInput').value = pages.join(', ');
  },

  async executePdfSplit() {
    const file = this.state.splitFile;
    if (!file || !this.state.splitPdfDoc) return;

    const rangeStr = document.getElementById('pdfSplitRangeInput').value.trim();
    const btn = document.getElementById('pdfSplitExecuteBtn');

    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> Extracting Pages...';
    if (window.lucide) window.lucide.createIcons();

    try {
      const selectedPages = this.parsePageRanges(rangeStr, this.state.splitTotalPages);
      if (selectedPages.length === 0) {
        Utils.showToast('Please select at least one page to extract.', 'warning');
        return;
      }

      const fileBuffer = await Utils.readFileAsArrayBuffer(file);
      const srcDoc = await PDFLib.PDFDocument.load(fileBuffer);
      const newDoc = await PDFLib.PDFDocument.create();

      // Convert 1-indexed to 0-indexed indices
      const pageIndices = selectedPages.map(p => p - 1);
      const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
      copiedPages.forEach(p => newDoc.addPage(p));

      const newBytes = await newDoc.save();
      const blob = new Blob([newBytes], { type: 'application/pdf' });
      Utils.downloadBlob(blob, `extracted_${file.name}`);
      Utils.showToast(`Extracted ${selectedPages.length} pages successfully!`, 'success');
    } catch (err) {
      console.error('PDF Split error:', err);
      Utils.showToast('Failed to split PDF.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="download"></i> Extract & Download';
      if (window.lucide) window.lucide.createIcons();
    }
  },

  parsePageRanges(rangeStr, maxPages) {
    const pages = new Set();
    const parts = rangeStr.split(',');
    parts.forEach(part => {
      part = part.trim();
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(n => parseInt(n.trim()));
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = Math.max(1, start); i <= Math.min(maxPages, end); i++) {
            pages.add(i);
          }
        }
      } else {
        const num = parseInt(part);
        if (!isNaN(num) && num >= 1 && num <= maxPages) {
          pages.add(num);
        }
      }
    });
    return Array.from(pages).sort((a, b) => a - b);
  },

  /* ==========================================================================
     4. IMAGES TO PDF
     ========================================================================== */
  initImagesToPdf() {
    const dropzone = document.getElementById('imagesToPdfDropzone');
    const input = document.getElementById('imagesToPdfInput');
    const workspace = document.getElementById('imagesToPdfWorkspace');
    const addMoreBtn = document.getElementById('addMoreImagesBtn');
    const generateBtn = document.getElementById('generateImagesPdfBtn');

    if (!dropzone || !input) return;

    const handleImages = (files) => {
      const imageFiles = files.filter(f => f.type.startsWith('image/'));
      if (imageFiles.length === 0) {
        Utils.showToast('Please select valid image files (JPG, PNG, WebP).', 'warning');
        return;
      }
      this.state.imagesToPdfList.push(...imageFiles);
      dropzone.classList.add('hidden');
      workspace.classList.remove('hidden');
      this.renderImagesToPdfGrid();
    };

    Utils.setupDropzone(dropzone, input, handleImages);

    addMoreBtn.addEventListener('click', () => {
      const tempInput = document.createElement('input');
      tempInput.type = 'file';
      tempInput.accept = 'image/*';
      tempInput.multiple = true;
      tempInput.onchange = (e) => {
        if (e.target.files) handleImages(Array.from(e.target.files));
      };
      tempInput.click();
    });

    generateBtn.addEventListener('click', () => this.executeImagesToPdf());
  },

  renderImagesToPdfGrid() {
    const grid = document.getElementById('imagesToPdfGrid');
    const dropzone = document.getElementById('imagesToPdfDropzone');
    const workspace = document.getElementById('imagesToPdfWorkspace');

    if (this.state.imagesToPdfList.length === 0) {
      workspace.classList.add('hidden');
      dropzone.classList.remove('hidden');
      return;
    }

    grid.innerHTML = '';
    this.state.imagesToPdfList.forEach((file, index) => {
      const card = document.createElement('div');
      card.className = 'img-item-card';

      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      card.appendChild(img);

      const footer = document.createElement('div');
      footer.className = 'img-item-footer';
      footer.innerHTML = `
        <span>Page ${index + 1}</span>
        <button class="icon-btn btn-xs remove-img-btn" data-idx="${index}"><i data-lucide="trash-2"></i></button>
      `;
      card.appendChild(footer);
      grid.appendChild(card);
    });

    if (window.lucide) window.lucide.createIcons();

    grid.querySelectorAll('.remove-img-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        this.state.imagesToPdfList.splice(idx, 1);
        this.renderImagesToPdfGrid();
      });
    });
  },

  async executeImagesToPdf() {
    if (this.state.imagesToPdfList.length === 0) return;

    const btn = document.getElementById('generateImagesPdfBtn');
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> Building PDF...';
    if (window.lucide) window.lucide.createIcons();

    const orientation = document.getElementById('imgPdfOrientation').value;
    const margin = parseInt(document.getElementById('imgPdfMargin').value) || 0;

    try {
      const pdfDoc = await PDFLib.PDFDocument.create();

      for (const file of this.state.imagesToPdfList) {
        let imageBytes = await Utils.readFileAsArrayBuffer(file);
        let embeddedImage;

        if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
          embeddedImage = await pdfDoc.embedJpg(imageBytes);
        } else if (file.type === 'image/png') {
          embeddedImage = await pdfDoc.embedPng(imageBytes);
        } else {
          // Convert WebP or other formats via canvas to PNG first
          const dataUrl = await Utils.readFileAsDataURL(file);
          const pngBytes = await this.convertImageToPngBytes(dataUrl);
          embeddedImage = await pdfDoc.embedPng(pngBytes);
        }

        const imgWidth = embeddedImage.width;
        const imgHeight = embeddedImage.height;

        let pageWidth, pageHeight;
        if (orientation === 'portrait') {
          pageWidth = 595.28; // Standard A4 points
          pageHeight = 841.89;
        } else if (orientation === 'landscape') {
          pageWidth = 841.89;
          pageHeight = 595.28;
        } else {
          // Auto
          pageWidth = imgWidth + margin * 2;
          pageHeight = imgHeight + margin * 2;
        }

        const page = pdfDoc.addPage([pageWidth, pageHeight]);

        // Fit image within margins
        const availableWidth = pageWidth - margin * 2;
        const availableHeight = pageHeight - margin * 2;
        const scale = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);

        const drawWidth = imgWidth * scale;
        const drawHeight = imgHeight * scale;
        const x = (pageWidth - drawWidth) / 2;
        const y = (pageHeight - drawHeight) / 2;

        page.drawImage(embeddedImage, {
          x,
          y,
          width: drawWidth,
          height: drawHeight
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      Utils.downloadBlob(blob, 'images_bundle.pdf');
      Utils.showToast('Images converted into PDF successfully!', 'success');
    } catch (err) {
      console.error('Images to PDF error:', err);
      Utils.showToast('Failed to compile PDF from images.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="file-check"></i> Generate & Download PDF';
      if (window.lucide) window.lucide.createIcons();
    }
  },

  convertImageToPngBytes(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(async (blob) => {
          const buffer = await blob.arrayBuffer();
          resolve(buffer);
        }, 'image/png');
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  },

  /* ==========================================================================
     5. PDF TO IMAGES
     ========================================================================== */
  initPdfToImages() {
    const dropzone = document.getElementById('pdfToImgDropzone');
    const input = document.getElementById('pdfToImgInput');
    const card = document.getElementById('pdfToImgActiveCard');
    const removeBtn = document.getElementById('pdfToImgRemoveBtn');
    const convertBtn = document.getElementById('pdfToImgConvertBtn');

    if (!dropzone || !input) return;

    Utils.setupDropzone(dropzone, input, async (files) => {
      const file = files[0];
      if (file && file.type === 'application/pdf') {
        this.state.pdfToImgFile = file;
        document.getElementById('pdfToImgFileName').textContent = file.name;
        dropzone.classList.add('hidden');
        card.classList.remove('hidden');

        const buffer = await Utils.readFileAsArrayBuffer(file);
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        document.getElementById('pdfToImgPageCount').textContent = `Total Pages: ${pdf.numPages}`;
      }
    });

    removeBtn.addEventListener('click', () => {
      this.state.pdfToImgFile = null;
      input.value = '';
      card.classList.add('hidden');
      dropzone.classList.remove('hidden');
      document.getElementById('pdfToImgPreviewGrid').innerHTML = '';
    });

    convertBtn.addEventListener('click', () => this.executePdfToImages());
  },

  async executePdfToImages() {
    const file = this.state.pdfToImgFile;
    if (!file) return;

    const btn = document.getElementById('pdfToImgConvertBtn');
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> Rendering & Zipping Images...';
    if (window.lucide) window.lucide.createIcons();

    const format = document.getElementById('pdfToImgFormat').value; // 'image/png', 'image/jpeg', 'image/webp'
    const scaleVal = parseFloat(document.getElementById('pdfToImgScale').value) || 2.0;
    const ext = format === 'image/png' ? 'png' : (format === 'image/jpeg' ? 'jpg' : 'webp');

    try {
      const buffer = await Utils.readFileAsArrayBuffer(file);
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      const zip = new JSZip();
      const grid = document.getElementById('pdfToImgPreviewGrid');
      grid.innerHTML = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: scaleVal });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        await page.render({ canvasContext: ctx, viewport }).promise;

        const blob = await new Promise(res => canvas.toBlob(res, format, 0.92));
        zip.file(`page_${String(i).padStart(3, '0')}.${ext}`, blob);

        // Add to preview
        const thumb = document.createElement('img');
        thumb.src = URL.createObjectURL(blob);
        thumb.style.maxWidth = '160px';
        thumb.style.borderRadius = '6px';
        thumb.style.border = '1px solid var(--border-color)';
        grid.appendChild(thumb);
      }

      const zipContent = await zip.generateAsync({ type: 'blob' });
      Utils.downloadBlob(zipContent, `${file.name.replace(/\.pdf$/i, '')}_images.zip`);
      Utils.showToast(`Converted all ${pdf.numPages} pages to ${ext.toUpperCase()} in ZIP!`, 'success');
    } catch (err) {
      console.error('PDF to Images error:', err);
      Utils.showToast('Failed to convert PDF to images.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="archive"></i> Convert & Download All as ZIP';
      if (window.lucide) window.lucide.createIcons();
    }
  },

  /* ==========================================================================
     6. SIGN & ANNOTATE PDF
     ========================================================================== */
  initPdfSigner() {
    const dropzone = document.getElementById('pdfSignDropzone');
    const input = document.getElementById('pdfSignInput');
    const workspace = document.getElementById('pdfSignWorkspace');
    const prevBtn = document.getElementById('prevPageSignBtn');
    const nextBtn = document.getElementById('nextPageSignBtn');
    const exportBtn = document.getElementById('exportSignedPdfBtn');

    // Signature Modal
    const openModalBtn = document.getElementById('openSignatureModalBtn');
    const modal = document.getElementById('signatureModal');
    const closeModalBtn = document.getElementById('closeSignatureModalBtn');
    const cancelModalBtn = document.getElementById('cancelSignatureBtn');
    const applyModalBtn = document.getElementById('applySignatureBtn');
    const clearPadBtn = document.getElementById('clearSignaturePadBtn');

    if (!dropzone || !input) return;

    Utils.setupDropzone(dropzone, input, async (files) => {
      const file = files[0];
      if (file && file.type === 'application/pdf') {
        this.state.pdfSignFile = file;
        this.state.pdfSignCurrentPage = 1;
        this.state.annotations = [];
        dropzone.classList.add('hidden');
        workspace.classList.remove('hidden');

        const buffer = await Utils.readFileAsArrayBuffer(file);
        this.state.pdfSignDoc = await pdfjsLib.getDocument({ data: buffer }).promise;
        this.state.pdfSignTotalPages = this.state.pdfSignDoc.numPages;
        document.getElementById('totalSignPages').textContent = this.state.pdfSignTotalPages;
        await this.renderSignerPage(1);
      }
    });

    prevBtn.addEventListener('click', () => {
      if (this.state.pdfSignCurrentPage > 1) {
        this.state.pdfSignCurrentPage--;
        this.renderSignerPage(this.state.pdfSignCurrentPage);
      }
    });

    nextBtn.addEventListener('click', () => {
      if (this.state.pdfSignCurrentPage < this.state.pdfSignTotalPages) {
        this.state.pdfSignCurrentPage++;
        this.renderSignerPage(this.state.pdfSignCurrentPage);
      }
    });

    // Signature Pad logic
    const padCanvas = document.getElementById('signaturePadCanvas');
    const padCtx = padCanvas.getContext('2d');
    let isDrawing = false;
    let strokeColor = '#000000';

    const getPos = (e) => {
      const rect = padCanvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * (padCanvas.width / rect.width),
        y: (clientY - rect.top) * (padCanvas.height / rect.height)
      };
    };

    const startDraw = (e) => {
      isDrawing = true;
      const pos = getPos(e);
      padCtx.beginPath();
      padCtx.moveTo(pos.x, pos.y);
      padCtx.strokeStyle = strokeColor;
      padCtx.lineWidth = 3;
      padCtx.lineCap = 'round';
    };

    const moveDraw = (e) => {
      if (!isDrawing) return;
      e.preventDefault();
      const pos = getPos(e);
      padCtx.lineTo(pos.x, pos.y);
      padCtx.stroke();
    };

    const stopDraw = () => { isDrawing = false; };

    padCanvas.addEventListener('mousedown', startDraw);
    padCanvas.addEventListener('mousemove', moveDraw);
    window.addEventListener('mouseup', stopDraw);

    padCanvas.addEventListener('touchstart', startDraw);
    padCanvas.addEventListener('touchmove', moveDraw);
    window.addEventListener('touchend', stopDraw);

    document.querySelectorAll('.color-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        strokeColor = dot.dataset.color;
      });
    });

    clearPadBtn.addEventListener('click', () => {
      padCtx.clearRect(0, 0, padCanvas.width, padCanvas.height);
    });

    openModalBtn.addEventListener('click', () => {
      modal.classList.remove('hidden');
      padCtx.clearRect(0, 0, padCanvas.width, padCanvas.height);
    });

    const hideModal = () => modal.classList.add('hidden');
    closeModalBtn.addEventListener('click', hideModal);
    cancelModalBtn.addEventListener('click', hideModal);

    applyModalBtn.addEventListener('click', () => {
      const signData = padCanvas.toDataURL('image/png');
      this.state.signatureDataUrl = signData;
      hideModal();
      this.addSignatureToOverlay(signData);
    });

    document.getElementById('addTextAnnotationBtn').addEventListener('click', () => {
      const text = prompt('Enter text / date to insert:', new Date().toLocaleDateString());
      if (text) {
        this.addTextToOverlay(text);
      }
    });

    exportBtn.addEventListener('click', () => this.exportSignedPdf());
  },

  async renderSignerPage(pageNumber) {
    if (!this.state.pdfSignDoc) return;
    document.getElementById('currentSignPageNum').textContent = pageNumber;

    const page = await this.state.pdfSignDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.2 });

    const canvas = document.getElementById('pdfSignCanvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    await page.render({ canvasContext: ctx, viewport }).promise;

    const overlay = document.getElementById('annotationsOverlay');
    overlay.style.width = `${viewport.width}px`;
    overlay.style.height = `${viewport.height}px`;

    this.renderOverlayAnnotations();
  },

  addSignatureToOverlay(dataUrl) {
    const annot = {
      id: Date.now(),
      type: 'signature',
      page: this.state.pdfSignCurrentPage,
      x: 30, // percent
      y: 70, // percent
      width: 140,
      height: 60,
      content: dataUrl
    };
    this.state.annotations.push(annot);
    this.renderOverlayAnnotations();
    Utils.showToast('Signature added! Drag to position.', 'info');
  },

  addTextToOverlay(text) {
    const annot = {
      id: Date.now(),
      type: 'text',
      page: this.state.pdfSignCurrentPage,
      x: 30,
      y: 80,
      content: text
    };
    this.state.annotations.push(annot);
    this.renderOverlayAnnotations();
    Utils.showToast('Text annotation added! Drag to position.', 'info');
  },

  renderOverlayAnnotations() {
    const overlay = document.getElementById('annotationsOverlay');
    overlay.innerHTML = '';

    const currentAnnots = this.state.annotations.filter(a => a.page === this.state.pdfSignCurrentPage);

    currentAnnots.forEach(annot => {
      const el = document.createElement('div');
      el.className = 'draggable-element';
      el.style.left = `${annot.x}%`;
      el.style.top = `${annot.y}%`;

      if (annot.type === 'signature') {
        const img = document.createElement('img');
        img.src = annot.content;
        img.style.width = `${annot.width}px`;
        img.style.height = `${annot.height}px`;
        el.appendChild(img);
      } else {
        const span = document.createElement('span');
        span.textContent = annot.content;
        span.style.fontSize = '14px';
        span.style.fontWeight = '600';
        span.style.color = '#000000';
        el.appendChild(span);
      }

      const delBtn = document.createElement('button');
      delBtn.className = 'delete-annot-btn';
      delBtn.innerHTML = '×';
      delBtn.onclick = (e) => {
        e.stopPropagation();
        this.state.annotations = this.state.annotations.filter(a => a.id !== annot.id);
        this.renderOverlayAnnotations();
      };
      el.appendChild(delBtn);

      // Make draggable
      let startX, startY, initialLeft, initialTop;
      const onMouseDown = (e) => {
        e.preventDefault();
        startX = e.clientX;
        startY = e.clientY;
        const rect = el.getBoundingClientRect();
        const parentRect = overlay.getBoundingClientRect();
        initialLeft = rect.left - parentRect.left;
        initialTop = rect.top - parentRect.top;

        const onMouseMove = (moveEvent) => {
          const dx = moveEvent.clientX - startX;
          const dy = moveEvent.clientY - startY;
          const newLeft = Math.max(0, Math.min(parentRect.width - rect.width, initialLeft + dx));
          const newTop = Math.max(0, Math.min(parentRect.height - rect.height, initialTop + dy));

          annot.x = (newLeft / parentRect.width) * 100;
          annot.y = (newTop / parentRect.height) * 100;

          el.style.left = `${annot.x}%`;
          el.style.top = `${annot.y}%`;
        };

        const onMouseUp = () => {
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      };

      el.addEventListener('mousedown', onMouseDown);
      overlay.appendChild(el);
    });
  },

  async exportSignedPdf() {
    const file = this.state.pdfSignFile;
    if (!file) return;

    const btn = document.getElementById('exportSignedPdfBtn');
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> Embedding Signature...';
    if (window.lucide) window.lucide.createIcons();

    try {
      const buffer = await Utils.readFileAsArrayBuffer(file);
      const pdfDoc = await PDFLib.PDFDocument.load(buffer);

      for (const annot of this.state.annotations) {
        const page = pdfDoc.getPage(annot.page - 1);
        const { width, height } = page.getSize();

        // Convert percentage to PDF coordinates (PDF Y starts from bottom)
        const pdfX = (annot.x / 100) * width;
        const pdfY = height - ((annot.y / 100) * height) - (annot.type === 'signature' ? 40 : 15);

        if (annot.type === 'signature') {
          const pngBytes = await this.convertImageToPngBytes(annot.content);
          const sigImage = await pdfDoc.embedPng(pngBytes);
          page.drawImage(sigImage, {
            x: pdfX,
            y: pdfY,
            width: 120,
            height: 50
          });
        } else {
          page.drawText(annot.content, {
            x: pdfX,
            y: pdfY,
            size: 12,
            color: PDFLib.rgb(0, 0, 0)
          });
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      Utils.downloadBlob(blob, `signed_${file.name}`);
      Utils.showToast('Signed PDF exported successfully!', 'success');
    } catch (err) {
      console.error('PDF Sign export error:', err);
      Utils.showToast('Failed to export signed PDF.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="download"></i> Download Signed PDF';
      if (window.lucide) window.lucide.createIcons();
    }
  }
};

window.PdfTools = PdfTools;
