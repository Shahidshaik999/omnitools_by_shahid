/**
 * OmniTools Utility Helpers
 * High-performance, client-side helpers for file handling, toasts, hashing, and downloads.
 */

const Utils = {
  /**
   * Display a floating toast notification
   * @param {string} message 
   * @param {'success'|'error'|'info'|'warning'} type 
   */
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-triangle';
    if (type === 'warning') iconName = 'alert-circle';

    toast.innerHTML = `
      <i data-lucide="${iconName}"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(40px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  },

  /**
   * Format bytes to human readable string (KB, MB, GB)
   * @param {number} bytes 
   */
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  },

  /**
   * Copy text to clipboard with feedback
   * @param {string} text 
   * @param {string} [successMsg]
   */
  async copyToClipboard(text, successMsg = 'Copied to clipboard!') {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }
      Utils.showToast(successMsg, 'success');
      return true;
    } catch (err) {
      Utils.showToast('Failed to copy text', 'error');
      return false;
    }
  },

  /**
   * Trigger direct browser file download from Blob
   * @param {Blob} blob 
   * @param {string} filename 
   */
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
  },

  /**
   * Trigger download from Data URL
   * @param {string} dataUrl 
   * @param {string} filename 
   */
  downloadDataUrl(dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },

  /**
   * Wire up drag & drop for a file input & dropzone
   * @param {HTMLElement} dropzoneEl 
   * @param {HTMLInputElement} fileInputEl 
   * @param {Function} onFilesSelected 
   */
  setupDropzone(dropzoneEl, fileInputEl, onFilesSelected) {
    if (!dropzoneEl || !fileInputEl) return;

    dropzoneEl.addEventListener('click', () => {
      fileInputEl.click();
    });

    fileInputEl.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        onFilesSelected(Array.from(e.target.files));
      }
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzoneEl.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzoneEl.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzoneEl.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzoneEl.classList.remove('dragover');
      });
    });

    dropzoneEl.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length > 0) {
        onFilesSelected(Array.from(dt.files));
      }
    });
  },

  /**
   * Calculate SHA-256 Hash using SubtleCrypto
   * @param {string} text 
   * @returns {Promise<string>}
   */
  async sha256(text) {
    const msgBuffer = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  /**
   * Calculate SHA-512 Hash using SubtleCrypto
   * @param {string} text 
   * @returns {Promise<string>}
   */
  async sha512(text) {
    const msgBuffer = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-512', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  /**
   * Read file as ArrayBuffer
   * @param {File} file 
   * @returns {Promise<ArrayBuffer>}
   */
  readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  },

  /**
   * Read file as Data URL
   * @param {File} file 
   * @returns {Promise<string>}
   */
  readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
};

window.Utils = Utils;
