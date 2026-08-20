/**
 * OmniTools — Main Application Controller & Router
 * Manages tool catalog, navigation, command palette (Ctrl+K), favorites, and theme.
 */

const App = {
  // Catalog of all tools
  tools: [
    // Documents & PDF
    {
      id: 'pdf-to-word',
      title: 'PDF to Word (.docx)',
      category: 'pdf',
      categoryLabel: 'DOCUMENT & PDF',
      icon: 'file-text',
      desc: 'Extract text, formatting, and layout structure into an editable Microsoft Word document.'
    },
    {
      id: 'pdf-merge',
      title: 'Merge Multiple PDFs',
      category: 'pdf',
      categoryLabel: 'DOCUMENT & PDF',
      icon: 'files',
      desc: 'Combine multiple PDF files into one clean document with custom drag-and-drop order.'
    },
    {
      id: 'pdf-split',
      title: 'Split & Extract PDF Pages',
      category: 'pdf',
      categoryLabel: 'DOCUMENT & PDF',
      icon: 'scissors',
      desc: 'Extract individual page ranges or split each page into separate files with visual thumbnails.'
    },
    {
      id: 'images-to-pdf',
      title: 'Images to PDF',
      category: 'pdf',
      categoryLabel: 'DOCUMENT & PDF',
      icon: 'file-plus',
      desc: 'Convert multiple JPG, PNG, and WebP photos into a multi-page PDF with margin & orientation controls.'
    },
    {
      id: 'pdf-to-images',
      title: 'PDF to Images (PNG/JPG)',
      category: 'pdf',
      categoryLabel: 'DOCUMENT & PDF',
      icon: 'image-down',
      desc: 'Export all PDF pages as high-resolution PNG, JPG, or WebP images in a single ZIP download.'
    },
    {
      id: 'pdf-signer',
      title: 'Sign & Annotate PDF',
      category: 'pdf',
      categoryLabel: 'DOCUMENT & PDF',
      icon: 'signature',
      desc: 'Draw or insert digital signatures and text directly onto any PDF page without external accounts.'
    },

    // Media & Image
    {
      id: 'image-compress',
      title: 'Image Compressor & Resizer',
      category: 'image',
      categoryLabel: 'MEDIA & IMAGE',
      icon: 'minimize-2',
      desc: 'Shrink image file size by up to 90% with live split-view quality preview and dimension scaling.'
    },
    {
      id: 'image-convert',
      title: 'Universal Image Converter',
      category: 'image',
      categoryLabel: 'MEDIA & IMAGE',
      icon: 'refresh-cw',
      desc: 'Batch convert between PNG, JPG, WebP, and BMP formats instantly inside your browser.'
    },
    {
      id: 'doc-scanner',
      title: 'Document Photo Scan Enhancer',
      category: 'image',
      categoryLabel: 'MEDIA & IMAGE',
      icon: 'scan-line',
      desc: 'Convert smartphone photos of paper and receipts into sharp black & white scanned documents.'
    },
    {
      id: 'color-palette',
      title: 'Color & Palette Picker',
      category: 'image',
      categoryLabel: 'MEDIA & IMAGE',
      icon: 'pipette',
      desc: 'Extract dominant color palettes, hex codes, and CSS variables directly from any photo.'
    },

    // QR Studio
    {
      id: 'qr-generator',
      title: 'Custom QR Code Generator',
      category: 'qr',
      categoryLabel: 'QR STUDIO',
      icon: 'qr-code',
      desc: 'Generate styled QR codes for Websites, Wi-Fi networks, vCards, Emails, and plain text with PNG/SVG export.'
    },
    {
      id: 'qr-scanner',
      title: 'QR Code Scanner',
      category: 'qr',
      categoryLabel: 'QR STUDIO',
      icon: 'scan',
      desc: 'Scan and decode QR codes from image files, clipboard pastes, or live camera video streams.'
    },

    // Text & Data
    {
      id: 'case-converter',
      title: 'Case Converter & Text Stats',
      category: 'text',
      categoryLabel: 'TEXT & DATA',
      icon: 'type',
      desc: 'Convert UPPERCASE, lowercase, camelCase, snake_case, and calculate real-time word & reading statistics.'
    },
    {
      id: 'json-formatter',
      title: 'JSON Formatter & Studio',
      category: 'text',
      categoryLabel: 'TEXT & DATA',
      icon: 'code-2',
      desc: 'Format, beautify, minify, and validate JSON payloads with syntax error detection.'
    },
    {
      id: 'encoder-hash',
      title: 'Base64, URL & Hash Studio',
      category: 'text',
      categoryLabel: 'TEXT & DATA',
      icon: 'lock',
      desc: 'Encode/Decode Base64 and URLs, and calculate SHA-256 / SHA-512 cryptographic hashes.'
    },
    {
      id: 'unit-converter',
      title: 'Unit & Measurement Converter',
      category: 'text',
      categoryLabel: 'TEXT & DATA',
      icon: 'scale',
      desc: 'Convert units across Length, Mass, Temperature, Digital Data, Area, and Time.'
    },

    // Security & Developer Tools
    {
      id: 'password-gen',
      title: 'Password & Passphrase Generator',
      category: 'security',
      categoryLabel: 'SECURITY & DEV',
      icon: 'key-round',
      desc: 'Generate secure random passwords or memorable Diceware passphrases with live entropy strength metering.'
    },
    {
      id: 'diff-checker',
      title: 'Text & Code Diff Checker',
      category: 'security',
      categoryLabel: 'SECURITY & DEV',
      icon: 'git-compare',
      desc: 'Compare two blocks of code or text side-by-side with visual line-by-line additions and deletions.'
    },
    {
      id: 'time-calc',
      title: 'Unix Timestamp & Date Calc',
      category: 'security',
      categoryLabel: 'SECURITY & DEV',
      icon: 'clock',
      desc: 'Real-time Unix epoch converter, date duration calculator, and relative time humanizer.'
    },
    {
      id: 'markdown-scratchpad',
      title: 'Markdown Scratchpad & Notes',
      category: 'security',
      categoryLabel: 'SECURITY & DEV',
      icon: 'notebook-pen',
      desc: 'Distraction-free auto-saving notepad with live markdown rendering and instant local export.'
    },
    {
      id: 'regex-tester',
      title: 'Regular Expression Playground',
      category: 'security',
      categoryLabel: 'SECURITY & DEV',
      icon: 'binary',
      desc: 'Test regex patterns with match highlights, capture groups breakdown, and common presets (Email, URL, IP).'
    }
  ],

  favorites: new Set(),
  currentView: 'dashboard',

  init() {
    this.loadPreferences();
    this.renderDashboardCards();
    this.setupNavigation();
    this.setupCommandPalette();
    this.setupThemeToggle();
    this.setupMobileMenu();

    // Initialize sub-modules
    if (window.PdfTools) PdfTools.init();
    if (window.ImageTools) ImageTools.init();
    if (window.QrStudio) QrStudio.init();
    if (window.TextTools) TextTools.init();
    if (window.UnitConverter) UnitConverter.init();
    if (window.ExtraTools) ExtraTools.init();

    // URL Hash Routing for Deep Linking & SEO
    window.addEventListener('hashchange', () => {
      const hashView = window.location.hash.replace('#', '');
      if (hashView && hashView !== this.currentView) {
        this.switchView(hashView, false);
      }
    });

    const initialHash = window.location.hash.replace('#', '');
    if (initialHash && (initialHash === 'favorites' || this.tools.some(t => t.id === initialHash))) {
      this.switchView(initialHash, false);
    }

    if (window.lucide) window.lucide.createIcons();
  },

  loadPreferences() {
    // Theme
    const savedTheme = localStorage.getItem('omnitools_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Favorites
    const savedFavs = localStorage.getItem('omnitools_favorites');
    if (savedFavs) {
      try {
        this.favorites = new Set(JSON.parse(savedFavs));
      } catch (e) {
        this.favorites = new Set();
      }
    }
    this.updateFavoritesCounter();
  },

  saveFavorites() {
    localStorage.setItem('omnitools_favorites', JSON.stringify(Array.from(this.favorites)));
    this.updateFavoritesCounter();
  },

  updateFavoritesCounter() {
    const counter = document.getElementById('favoritesCount');
    if (counter) counter.textContent = this.favorites.size;
  },

  /* ==========================================================================
     Dashboard Cards & Category Filters
     ========================================================================== */
  renderDashboardCards(filter = 'all') {
    const grid = document.getElementById('toolsGrid');
    if (!grid) return;

    grid.innerHTML = '';

    const filteredTools = filter === 'all' 
      ? this.tools 
      : this.tools.filter(t => t.category === filter);

    filteredTools.forEach(tool => {
      const card = document.createElement('div');
      card.className = 'tool-card';
      card.dataset.view = tool.id;

      const isFav = this.favorites.has(tool.id);

      card.innerHTML = `
        <div class="card-top">
          <div class="card-icon ${tool.category}-cat">
            <i data-lucide="${tool.icon}"></i>
          </div>
          <button class="card-fav-btn ${isFav ? 'is-fav' : ''}" data-tool="${tool.id}" title="Toggle Favorite">
            <i data-lucide="star"></i>
          </button>
        </div>
        <h3>${tool.title}</h3>
        <p>${tool.desc}</p>
        <div class="card-footer-action">
          <span>Open Tool</span>
          <i data-lucide="arrow-right"></i>
        </div>
      `;

      // Click card to open tool
      card.addEventListener('click', (e) => {
        if (!e.target.closest('.card-fav-btn')) {
          this.switchView(tool.id);
        }
      });

      // Favorite toggle
      const favBtn = card.querySelector('.card-fav-btn');
      favBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleFavorite(tool.id, favBtn);
      });

      grid.appendChild(card);
    });

    if (window.lucide) window.lucide.createIcons();
  },

  renderFavoritesView() {
    const grid = document.getElementById('favoritesGrid');
    if (!grid) return;

    const favTools = this.tools.filter(t => this.favorites.has(t.id));

    if (favTools.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <i data-lucide="star-off"></i>
          <h3>No favorite tools yet</h3>
          <p>Click the star icon on any tool card in the dashboard to pin it here for rapid access.</p>
        </div>
      `;
    } else {
      grid.innerHTML = '';
      favTools.forEach(tool => {
        const card = document.createElement('div');
        card.className = 'tool-card';
        card.innerHTML = `
          <div class="card-top">
            <div class="card-icon ${tool.category}-cat">
              <i data-lucide="${tool.icon}"></i>
            </div>
            <button class="card-fav-btn is-fav" data-tool="${tool.id}">
              <i data-lucide="star"></i>
            </button>
          </div>
          <h3>${tool.title}</h3>
          <p>${tool.desc}</p>
          <div class="card-footer-action">
            <span>Open Tool</span>
            <i data-lucide="arrow-right"></i>
          </div>
        `;

        card.addEventListener('click', (e) => {
          if (!e.target.closest('.card-fav-btn')) {
            this.switchView(tool.id);
          }
        });

        card.querySelector('.card-fav-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleFavorite(tool.id);
          this.renderFavoritesView();
        });

        grid.appendChild(card);
      });
    }

    if (window.lucide) window.lucide.createIcons();
  },

  toggleFavorite(toolId, btnEl) {
    if (this.favorites.has(toolId)) {
      this.favorites.delete(toolId);
      if (btnEl) btnEl.classList.remove('is-fav');
      Utils.showToast('Removed from favorites', 'info');
    } else {
      this.favorites.add(toolId);
      if (btnEl) btnEl.classList.add('is-fav');
      Utils.showToast('Added to favorites! ⭐', 'success');
    }
    this.saveFavorites();

    // Sync in-tool header favorite button if open
    const toolFavBtn = document.querySelector(`.favorite-toggle-btn[data-tool="${toolId}"]`);
    if (toolFavBtn) {
      if (this.favorites.has(toolId)) toolFavBtn.classList.add('is-fav');
      else toolFavBtn.classList.remove('is-fav');
    }
  },

  /* ==========================================================================
     Navigation & View Switching
     ========================================================================== */
  setupNavigation() {
    // Sidebar nav items
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        this.switchView(view);

        // Close sidebar on mobile
        document.getElementById('sidebar').classList.remove('open');
      });
    });

    // Category filter buttons on dashboard
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderDashboardCards(btn.dataset.filter);
      });
    });

    // Tool header favorite buttons
    document.querySelectorAll('.favorite-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const toolId = btn.dataset.tool;
        this.toggleFavorite(toolId, btn);
      });
    });
  },

  switchView(viewId, updateHash = true) {
    this.currentView = viewId;

    if (updateHash) {
      if (viewId === 'dashboard') {
        history.replaceState(null, null, ' ');
      } else {
        window.location.hash = viewId;
      }
    }

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.dataset.view === viewId) item.classList.add('active');
      else item.classList.remove('active');
    });

    // Hide all views, show target
    document.querySelectorAll('.tool-view').forEach(view => {
      view.classList.remove('active');
    });

    const targetView = document.getElementById(`view-${viewId}`);
    if (targetView) {
      targetView.classList.add('active');
      // Scroll to top of content
      document.querySelector('.content-scrollable').scrollTop = 0;
    }

    // Update Header Breadcrumbs & Dynamic SEO Document Title
    const catTag = document.querySelector('#currentViewBreadcrumb .category-tag');
    const heading = document.querySelector('#currentViewBreadcrumb .view-heading');

    if (viewId === 'dashboard') {
      catTag.textContent = 'OVERVIEW';
      heading.textContent = 'All Utilities Dashboard';
      document.title = 'OmniTools — 100% Free & Private Online Utility Suite';
    } else if (viewId === 'favorites') {
      catTag.textContent = 'OVERVIEW';
      heading.textContent = 'Your Starred Tools';
      document.title = 'Starred Favorite Tools — OmniTools';
      this.renderFavoritesView();
    } else {
      const tool = this.tools.find(t => t.id === viewId);
      if (tool) {
        catTag.textContent = tool.categoryLabel;
        heading.textContent = tool.title;
        document.title = `${tool.title} — 100% Free & Private | OmniTools`;

        // Sync header favorite button
        const headerFav = targetView.querySelector('.favorite-toggle-btn');
        if (headerFav) {
          if (this.favorites.has(tool.id)) headerFav.classList.add('is-fav');
          else headerFav.classList.remove('is-fav');
        }

        // View lifecycle hooks
        if (viewId === 'qr-generator' && window.QrStudio) {
          setTimeout(() => QrStudio.renderQrCode(), 20);
        }
      }
    }
  },

  /* ==========================================================================
     Command Palette (Ctrl + K / Cmd + K)
     ========================================================================== */
  setupCommandPalette() {
    const modal = document.getElementById('commandPaletteModal');
    const searchInput = document.getElementById('paletteSearchInput');
    const resultsList = document.getElementById('paletteResultsList');
    const openBtns = [document.getElementById('openCommandPaletteBtn'), document.getElementById('headerSearchBtn')];

    const openPalette = () => {
      modal.classList.remove('hidden');
      searchInput.value = '';
      this.renderPaletteResults('');
      setTimeout(() => searchInput.focus(), 50);
    };

    const closePalette = () => {
      modal.classList.add('hidden');
    };

    openBtns.forEach(btn => {
      if (btn) btn.addEventListener('click', openPalette);
    });

    // Global Keybinding
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (modal.classList.contains('hidden')) openPalette();
        else closePalette();
      }
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        closePalette();
      }
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closePalette();
    });

    searchInput.addEventListener('input', (e) => {
      this.renderPaletteResults(e.target.value.trim().toLowerCase());
    });
  },

  renderPaletteResults(query) {
    const list = document.getElementById('paletteResultsList');
    list.innerHTML = '';

    const matches = this.tools.filter(t => {
      if (!query) return true;
      return t.title.toLowerCase().includes(query) || 
             t.desc.toLowerCase().includes(query) ||
             t.category.toLowerCase().includes(query);
    });

    if (matches.length === 0) {
      list.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 0.9rem;">
          No matching tools found for "${query}".
        </div>
      `;
      return;
    }

    matches.forEach(tool => {
      const item = document.createElement('div');
      item.className = 'palette-result-item';
      item.innerHTML = `
        <i data-lucide="${tool.icon}"></i>
        <div style="flex: 1;">
          <div style="font-weight: 600; color: var(--text-primary);">${tool.title}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${tool.categoryLabel}</div>
        </div>
        <span class="shortcut-tag">Jump ↵</span>
      `;

      item.addEventListener('click', () => {
        document.getElementById('commandPaletteModal').classList.add('hidden');
        this.switchView(tool.id);
      });

      list.appendChild(item);
    });

    if (window.lucide) window.lucide.createIcons();
  },

  /* ==========================================================================
     Theme & Mobile Menu
     ========================================================================== */
  setupThemeToggle() {
    const toggleBtn = document.getElementById('themeToggleBtn');
    if (!toggleBtn) return;

    toggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('omnitools_theme', next);
      Utils.showToast(`Switched to ${next.toUpperCase()} theme`, 'info');
    });
  },

  setupMobileMenu() {
    const openBtn = document.getElementById('mobileMenuBtn');
    const closeBtn = document.getElementById('closeSidebarBtn');
    const sidebar = document.getElementById('sidebar');

    if (openBtn && closeBtn && sidebar) {
      openBtn.addEventListener('click', () => sidebar.classList.add('open'));
      closeBtn.addEventListener('click', () => sidebar.classList.remove('open'));
    }
  }
};

// Auto boot on DOM load
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

window.App = App;
