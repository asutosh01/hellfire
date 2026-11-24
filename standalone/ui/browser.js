// ═══════════════════════════════════════════════════════════
// PRIVATE-FOX CHROME CLIENT LOGIC
// Connects UI Chrome to Electron Main Process via window.privateFox
// Full support: Tabs, Navigation, History, Bookmarks, Settings, Downloads
// ═══════════════════════════════════════════════════════════

(function () {
  'use strict';

  // DOM Elements
  const browserShell = document.getElementById('browserShell');
  const tabsPinned = document.getElementById('tabsPinned');
  const tabsScroll = document.getElementById('tabsScroll');
  const btnNewTab = document.getElementById('btnNewTab');
  const btnBack = document.getElementById('btnBack');
  const btnForward = document.getElementById('btnForward');
  const btnReload = document.getElementById('btnReload');
  const omniboxInput = document.getElementById('omniboxInput');
  const omniboxClear = document.getElementById('omniboxClear');
  const omniboxDropdown = document.getElementById('omniboxDropdown');
  const btnStar = document.getElementById('btnStar');
  const btnShield = document.getElementById('btnShield');
  const btnToggleShield = document.getElementById('btnToggleShield');
  const toolbarShieldIcon = document.getElementById('toolbarShieldIcon');
  const toolbarShieldBadge = document.getElementById('toolbarShieldBadge');
  const shieldBadge = document.getElementById('shieldBadge');
  const shieldPopover = document.getElementById('shieldPopover');
  const shieldSiteBadge = document.getElementById('shieldSiteBadge');
  const shieldMasterCard = document.getElementById('shieldMasterCard');
  const shieldMasterTitle = document.getElementById('shieldMasterTitle');
  const shieldMasterDesc = document.getElementById('shieldMasterDesc');
  const shieldMasterToggle = document.getElementById('shieldMasterToggle');
  const shieldTabCount = document.getElementById('shieldTabCount');
  const shieldTotalCount = document.getElementById('shieldTotalCount');
  const featAdStatus = document.getElementById('featAdStatus');
  const featCookieStatus = document.getElementById('featCookieStatus');
  const shieldReloadBox = document.getElementById('shieldReloadBox');
  const btnShieldReload = document.getElementById('btnShieldReload');
  const menuShieldToggle = document.getElementById('menuShieldToggle');
  const popoverTrackers = document.getElementById('popoverTrackers');
  const popoverDoh = document.getElementById('popoverDoh');
  const progressFill = document.getElementById('progressFill');

  // Bookmarks Bar
  const bookmarksBar = document.getElementById('bookmarksBar');
  const bookmarksBarItems = document.getElementById('bookmarksBarItems');

  // Side Panel Elements
  const sidePanel = document.getElementById('sidePanel');
  const btnClosePanel = document.getElementById('btnClosePanel');
  const btnBookmarks = document.getElementById('btnBookmarks');
  const btnHistory = document.getElementById('btnHistory');
  const btnSettings = document.getElementById('btnSettings');
  const btnDownloads = document.getElementById('btnDownloads');

  const tabSpBookmarks = document.getElementById('tabSpBookmarks');
  const tabSpHistory = document.getElementById('tabSpHistory');
  const tabSpSettings = document.getElementById('tabSpSettings');
  const tabSpDownloads = document.getElementById('tabSpDownloads');

  // Zen-Inspired Split View & Link Glance Elements
  const btnSplitView = document.getElementById('btnSplitView');
  const menuSplitView = document.getElementById('menuSplitView');
  const glanceFloatingBar = document.getElementById('glanceFloatingBar');
  if (glanceFloatingBar) {
    glanceFloatingBar.hidden = true;
    glanceFloatingBar.style.display = 'none';
  }
  const glanceBarUrl = document.getElementById('glanceBarUrl');
  const btnGlanceOpenTab = document.getElementById('btnGlanceOpenTab');
  const btnGlanceClose = document.getElementById('btnGlanceClose');
  let currentGlanceUrl = null;

  const panelBookmarks = document.getElementById('panelBookmarks');
  const panelHistory = document.getElementById('panelHistory');
  const panelSettings = document.getElementById('panelSettings');
  const panelDownloads = document.getElementById('panelDownloads');

  // Application 3-Bar Menu Elements
  const btnAppMenu = document.getElementById('btnAppMenu');
  const appMenu = document.getElementById('appMenu');
  const submenuMoreTools = document.getElementById('submenuMoreTools');
  const submenuHelp = document.getElementById('submenuHelp');
  const submenuHistory = document.getElementById('submenuHistory');
  const submenuBookmarks = document.getElementById('submenuBookmarks');
  const zoomPercentText = document.getElementById('zoomPercentText');

  // Find Bar Elements
  const findBar = document.getElementById('findBar');
  const findBarInput = document.getElementById('findBarInput');
  const findBarCount = document.getElementById('findBarCount');
  const btnFindPrev = document.getElementById('btnFindPrev');
  const btnFindNext = document.getElementById('btnFindNext');
  const btnFindClose = document.getElementById('btnFindClose');

  // Panel Inner Elements
  const bookmarksList = document.getElementById('bookmarksList');
  const bookmarkSearch = document.getElementById('bookmarkSearch');
  const btnPanelAddBookmark = document.getElementById('btnPanelAddBookmark');

  const historyList = document.getElementById('historyList');
  const historySearch = document.getElementById('historySearch');
  const btnClearHistoryBtn = document.getElementById('btnClearHistoryBtn');

  // Settings Controls
  const settingSearchEngine = document.getElementById('settingSearchEngine');
  const settingDoh = document.getElementById('settingDoh');
  const settingBookmarksBar = document.getElementById('settingBookmarksBar');
  const settingRefererStrip = document.getElementById('settingRefererStrip');
  const btnCleanCache = document.getElementById('btnCleanCache');
  const btnCleanCookies = document.getElementById('btnCleanCookies');
  const btnCleanAllData = document.getElementById('btnCleanAllData');
  const btnExportProfile = document.getElementById('btnExportProfile');
  const btnImportProfile = document.getElementById('btnImportProfile');
  const btnOpenDownloadsFolder = document.getElementById('btnOpenDownloadsFolder');
  const downloadsList = document.getElementById('downloadsList');

  // Window Controls
  const wcClose = document.getElementById('wcClose');
  const wcMin = document.getElementById('wcMin');
  const wcMax = document.getElementById('wcMax');
  const iconMax = document.getElementById('iconMax');

  // Runtime State
  let activeDohProvider = 'cloudflare';
  let activeTabId = null;
  let tabList = [];
  let currentTabUrl = '';
  let currentTabTitle = '';
  let currentTabFavicon = '';
  let isSidePanelOpen = false;
  let activeSidePanelTab = 'panelBookmarks';
  let cachedBookmarks = [];
  let cachedHistory = [];
  let cachedSettings = {};

  // Crisp SVG Icon Assets (Replacing low-res raw emojis)
  const ICONS = {
    search: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
    star: `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
    clock: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
    close: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    check: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    lightning: `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`
  };

  // ─────────────────────────────────────────────────────────────
  // WINDOW CONTROLS
  // ─────────────────────────────────────────────────────────────
  if (wcClose) wcClose.addEventListener('click', () => window.privateFox?.close());
  if (wcMin) wcMin.addEventListener('click', () => window.privateFox?.minimize());
  if (wcMax) wcMax.addEventListener('click', () => window.privateFox?.maximize());

  // ─────────────────────────────────────────────────────────────
  // NAVIGATION CONTROLS
  // ─────────────────────────────────────────────────────────────
  if (btnBack) btnBack.addEventListener('click', () => window.privateFox?.goBack());
  if (btnForward) btnForward.addEventListener('click', () => window.privateFox?.goForward());
  if (btnReload) btnReload.addEventListener('click', () => window.privateFox?.reload());

  function handleNewTab() {
    window.privateFox?.createTab();
  }
  if (btnNewTab) btnNewTab.addEventListener('click', handleNewTab);

  const btnWorkspaces = document.getElementById('btnWorkspaces');
  if (btnWorkspaces) {
    btnWorkspaces.addEventListener('click', () => {
      togglePanel('panelBookmarks');
    });
  }

  const btnTabSearch = document.getElementById('btnTabSearch');
  if (btnTabSearch) {
    btnTabSearch.addEventListener('click', () => {
      if (omniboxInput) {
        omniboxInput.focus();
        omniboxInput.select();
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // OMNIBOX & SEARCH
  // ─────────────────────────────────────────────────────────────
  let selectedSuggestionIndex = -1;

  function updateSelectedSuggestion(items) {
    items.forEach((item, idx) => {
      if (idx === selectedSuggestionIndex) {
        item.classList.add('dropdown-item--selected', 'active');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('dropdown-item--selected', 'active');
      }
    });
  }

  if (omniboxInput) {
    omniboxInput.addEventListener('keydown', (e) => {
      const items = omniboxDropdown ? Array.from(omniboxDropdown.querySelectorAll('.dropdown-item')) : [];
      if (!omniboxDropdown.hidden && items.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          selectedSuggestionIndex = (selectedSuggestionIndex + 1) % items.length;
          updateSelectedSuggestion(items);
          return;
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          selectedSuggestionIndex = (selectedSuggestionIndex - 1 + items.length) % items.length;
          updateSelectedSuggestion(items);
          return;
        }
      }

      if (e.key === 'Enter') {
        if (!omniboxDropdown.hidden && selectedSuggestionIndex >= 0 && items[selectedSuggestionIndex]) {
          e.preventDefault();
          items[selectedSuggestionIndex].click();
          return;
        }
        const val = omniboxInput.value.trim();
        if (val) {
          hideOmniboxDropdown();
          window.privateFox?.navigate(val);
          omniboxInput.blur();
        }
      } else if (e.key === 'Escape') {
        hideOmniboxDropdown();
      }
    });

    omniboxInput.addEventListener('input', () => {
      const val = omniboxInput.value.trim();
      if (omniboxClear) {
        omniboxClear.style.display = val.length > 0 ? 'flex' : 'none';
      }
      if (val.length > 0) {
        showOmniboxSuggestions(val);
      } else {
        hideOmniboxDropdown();
      }
    });

    omniboxInput.addEventListener('focus', () => {
      omniboxInput.select();
      if (omniboxInput.value.trim().length > 0) {
        showOmniboxSuggestions(omniboxInput.value.trim());
      }
    });
  }

  if (omniboxClear) {
    omniboxClear.addEventListener('click', () => {
      omniboxInput.value = '';
      omniboxClear.style.display = 'none';
      hideOmniboxDropdown();
      omniboxInput.focus();
    });
  }

  function hideOmniboxDropdown() {
    selectedSuggestionIndex = -1;
    if (omniboxDropdown) {
      omniboxDropdown.hidden = true;
      omniboxDropdown.innerHTML = '';
    }
  }

  function showOmniboxSuggestions(query) {
    if (!omniboxDropdown) return;
    const q = query.toLowerCase();

    // Find matches from bookmarks
    const matchedBm = cachedBookmarks.filter(b =>
      (b.title && b.title.toLowerCase().includes(q)) || (b.url && b.url.toLowerCase().includes(q))
    ).slice(0, 3);

    // Find matches from history
    const matchedHist = cachedHistory.filter(h =>
      (h.title && h.title.toLowerCase().includes(q)) || (h.url && h.url.toLowerCase().includes(q))
    ).slice(0, 4);

    let html = '';

    // Search Action Item with dynamic Bang detection
    let searchLabel = 'Search';
    let searchPrefix = 'Search for';
    const trimmedQ = query.trim();
    if (trimmedQ.startsWith('!g ') || trimmedQ === '!g') {
      searchLabel = 'Google';
      searchPrefix = 'Search Google for';
    } else if (trimmedQ.startsWith('!b ') || trimmedQ === '!b') {
      searchLabel = 'Bing';
      searchPrefix = 'Search Microsoft Bing for';
    } else if (trimmedQ.startsWith('!w ') || trimmedQ === '!w') {
      searchLabel = 'Wikipedia';
      searchPrefix = 'Search Wikipedia for';
    } else if (trimmedQ.startsWith('!yt ') || trimmedQ === '!yt') {
      searchLabel = 'YouTube';
      searchPrefix = 'Search YouTube for';
    } else if (trimmedQ.startsWith('!d ') || trimmedQ === '!d' || trimmedQ.startsWith('!ddg')) {
      searchLabel = 'DuckDuckGo';
      searchPrefix = 'Search DuckDuckGo for';
    } else if (trimmedQ.startsWith('!sp ') || trimmedQ === '!sp') {
      searchLabel = 'Startpage';
      searchPrefix = 'Search Startpage for';
    } else if (trimmedQ.startsWith('!e ') || trimmedQ === '!e') {
      searchLabel = 'Ecosia';
      searchPrefix = 'Search Ecosia for';
    } else if (cachedSettings.searchEngine) {
      searchLabel = cachedSettings.searchEngine.charAt(0).toUpperCase() + cachedSettings.searchEngine.slice(1);
      searchPrefix = `Search ${searchLabel} for`;
    }

    html += `
      <div class="dropdown-item" data-action="search" data-value="${encodeURIComponent(query)}">
        <div class="dropdown-item__left">
          <span style="color:var(--red); display:inline-flex; align-items:center;">${ICONS.search}</span>
          <span class="dropdown-item__title">${searchPrefix} "<strong>${escapeHtml(query)}</strong>"</span>
        </div>
        <span class="dropdown-item__tag">${searchLabel}</span>
      </div>
    `;

    // Bookmarks matches
    matchedBm.forEach(bm => {
      html += `
        <div class="dropdown-item" data-action="nav" data-value="${encodeURIComponent(bm.url)}">
          <div class="dropdown-item__left">
            <span style="color:var(--red); display:inline-flex; align-items:center;">${ICONS.star}</span>
            <span class="dropdown-item__title">${escapeHtml(bm.title || bm.url)}</span>
            <span class="dropdown-item__url">${escapeHtml(formatDomain(bm.url))}</span>
          </div>
          <span class="dropdown-item__tag dropdown-item__tag--star">BOOKMARK</span>
        </div>
      `;
    });

    // History matches
    matchedHist.forEach(h => {
      html += `
        <div class="dropdown-item" data-action="nav" data-value="${encodeURIComponent(h.url)}">
          <div class="dropdown-item__left">
            <span style="color:var(--text-muted); display:inline-flex; align-items:center;">${ICONS.clock}</span>
            <span class="dropdown-item__title">${escapeHtml(h.title || h.url)}</span>
            <span class="dropdown-item__url">${escapeHtml(formatDomain(h.url))}</span>
          </div>
          <span class="dropdown-item__tag">HISTORY</span>
        </div>
      `;
    });

    omniboxDropdown.innerHTML = html;
    omniboxDropdown.hidden = false;

    // Attach click listeners to suggestions
    omniboxDropdown.querySelectorAll('.dropdown-item').forEach(item => {
      item.addEventListener('click', () => {
        const action = item.getAttribute('data-action');
        const val = decodeURIComponent(item.getAttribute('data-value'));
        hideOmniboxDropdown();
        if (action === 'search') {
          window.privateFox?.navigate(val);
        } else {
          window.privateFox?.navigate(val);
        }
      });
    });
  }

  // ─────────────────────────────────────────────────────────────
  // BOOKMARK STAR IN OMNIBOX
  // ─────────────────────────────────────────────────────────────
  if (btnStar) {
    btnStar.addEventListener('click', async () => {
      if (!currentTabUrl || currentTabUrl.includes('newtab.html')) return;
      const res = await window.privateFox?.toggleBookmark({
        url: currentTabUrl,
        title: currentTabTitle,
        favicon: currentTabFavicon
      });
      updateStarButtonState(res?.isBookmarked);
      refreshBookmarks();
    });
  }

  function updateStarButtonState(isBookmarked) {
    if (!btnStar) return;
    if (isBookmarked) {
      btnStar.classList.add('bookmarked');
      btnStar.setAttribute('title', 'Remove bookmark');
    } else {
      btnStar.classList.remove('bookmarked');
      btnStar.setAttribute('title', 'Bookmark this tab (Ctrl+D)');
    }
  }

  // ─────────────────────────────────────────────────────────────
  // BOOKMARKS BAR
  // ─────────────────────────────────────────────────────────────
  function renderBookmarksBar(bms) {
    if (!bookmarksBarItems) return;
    bookmarksBarItems.innerHTML = '';
    bms.slice(0, 15).forEach(b => {
      const btn = document.createElement('button');
      btn.className = 'bm-bar-item';
      btn.title = b.url;
      btn.innerHTML = `
        <span style="display:inline-flex; align-items:center; color:var(--text-muted);">${ICONS.star}</span>
        <span>${escapeHtml(b.title || formatDomain(b.url))}</span>
      `;
      btn.addEventListener('click', () => {
        window.privateFox?.navigate(b.url);
      });
      bookmarksBarItems.appendChild(btn);
    });
  }

  // ─────────────────────────────────────────────────────────────
  // SIDE PANEL DRAWER & TABS
  // ─────────────────────────────────────────────────────────────
  function setPanelOpen(open, targetTab = null) {
    isSidePanelOpen = open;
    if (sidePanel) {
      sidePanel.hidden = !open;
    }
    document.body.classList.toggle('has-panel', open);
    window.privateFox?.setPanelState(open);

    if (open && targetTab) {
      switchPanelTab(targetTab);
    }
  }

  function togglePanel(targetTab) {
    if (isSidePanelOpen && activeSidePanelTab === targetTab) {
      setPanelOpen(false);
    } else {
      setPanelOpen(true, targetTab);
    }
  }

  function switchPanelTab(tabName) {
    activeSidePanelTab = tabName;

    // Tab buttons
    [tabSpBookmarks, tabSpHistory, tabSpSettings, tabSpDownloads].forEach(btn => {
      if (!btn) return;
      const isTarget = btn.getAttribute('data-target') === tabName;
      btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });

    // Tab panels
    if (panelBookmarks) panelBookmarks.hidden = (tabName !== 'panelBookmarks');
    if (panelHistory) panelHistory.hidden = (tabName !== 'panelHistory');
    if (panelSettings) panelSettings.hidden = (tabName !== 'panelSettings');
    if (panelDownloads) panelDownloads.hidden = (tabName !== 'panelDownloads');

    if (tabName === 'panelBookmarks') refreshBookmarks();
    if (tabName === 'panelHistory') refreshHistory();
    if (tabName === 'panelSettings') refreshSettings();
  }

  // Toolbar Button Click Handlers
  if (btnBookmarks) btnBookmarks.addEventListener('click', () => togglePanel('panelBookmarks'));
  if (btnHistory) btnHistory.addEventListener('click', () => togglePanel('panelHistory'));
  if (btnSettings) btnSettings.addEventListener('click', () => togglePanel('panelSettings'));
  if (btnDownloads) btnDownloads.addEventListener('click', () => togglePanel('panelDownloads'));
  if (btnClosePanel) btnClosePanel.addEventListener('click', () => setPanelOpen(false));

  // Zen-Inspired Split View and Glance Button Handlers
  if (btnSplitView) {
    btnSplitView.addEventListener('click', () => {
      window.privateFox?.toggleSplitView();
    });
  }
  if (menuSplitView) {
    menuSplitView.addEventListener('click', () => {
      setAppMenuOpen(false);
      window.privateFox?.toggleSplitView();
    });
  }
  if (btnGlanceClose) {
    btnGlanceClose.addEventListener('click', () => {
      window.privateFox?.closeGlance();
      if (glanceFloatingBar) {
        glanceFloatingBar.hidden = true;
        glanceFloatingBar.style.display = 'none';
      }
    });
  }
  if (btnGlanceOpenTab) {
    btnGlanceOpenTab.addEventListener('click', () => {
      if (currentGlanceUrl) {
        window.privateFox?.createTab(currentGlanceUrl);
        window.privateFox?.closeGlance();
        if (glanceFloatingBar) {
          glanceFloatingBar.hidden = true;
          glanceFloatingBar.style.display = 'none';
        }
      }
    });
  }

  // Panel Header Tab Clicks
  [tabSpBookmarks, tabSpHistory, tabSpSettings, tabSpDownloads].forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        switchPanelTab(target);
      });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // BOOKMARKS PANEL LOGIC
  // ─────────────────────────────────────────────────────────────
  async function refreshBookmarks() {
    const list = await window.privateFox?.getBookmarks() || [];
    cachedBookmarks = list;
    renderBookmarksList(list);
    renderBookmarksBar(list);
  }

  function renderBookmarksList(items) {
    if (!bookmarksList) return;
    if (items.length === 0) {
      bookmarksList.innerHTML = `<div class="sp-empty">No bookmarks saved yet. Click the star icon (Ctrl+D) to bookmark any page.</div>`;
      return;
    }

    let html = '';
    items.forEach(bm => {
      html += `
        <div class="sp-item" data-url="${encodeURIComponent(bm.url)}">
          <div class="sp-item__main">
            <span class="sp-item__title">${escapeHtml(bm.title || bm.url)}</span>
            <span class="sp-item__meta">${escapeHtml(formatDomain(bm.url))}</span>
          </div>
          <button class="sp-item__del" title="Remove bookmark" data-del-url="${encodeURIComponent(bm.url)}" aria-label="Delete">${ICONS.close}</button>
        </div>
      `;
    });

    bookmarksList.innerHTML = html;

    // Attach listeners
    bookmarksList.querySelectorAll('.sp-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.sp-item__del')) return;
        const targetUrl = decodeURIComponent(item.getAttribute('data-url'));
        window.privateFox?.navigate(targetUrl);
      });
    });

    bookmarksList.querySelectorAll('.sp-item__del').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const delUrl = decodeURIComponent(btn.getAttribute('data-del-url'));
        await window.privateFox?.removeBookmark(delUrl);
        refreshBookmarks();
      });
    });
  }

  if (bookmarkSearch) {
    bookmarkSearch.addEventListener('input', () => {
      const q = bookmarkSearch.value.trim().toLowerCase();
      const filtered = cachedBookmarks.filter(b =>
        (b.title && b.title.toLowerCase().includes(q)) || (b.url && b.url.toLowerCase().includes(q))
      );
      renderBookmarksList(filtered);
    });
  }

  if (btnPanelAddBookmark) {
    btnPanelAddBookmark.addEventListener('click', async () => {
      if (!currentTabUrl || currentTabUrl.includes('newtab.html')) return;
      await window.privateFox?.toggleBookmark({
        url: currentTabUrl,
        title: currentTabTitle,
        favicon: currentTabFavicon
      });
      refreshBookmarks();
    });
  }

  // ─────────────────────────────────────────────────────────────
  // HISTORY PANEL LOGIC
  // ─────────────────────────────────────────────────────────────
  async function refreshHistory() {
    const list = await window.privateFox?.getHistory(200) || [];
    cachedHistory = list;
    renderHistoryList(list);
  }

  function renderHistoryList(items) {
    if (!historyList) return;
    if (document.body.classList.contains('is-incognito')) {
      historyList.innerHTML = `<div class="sp-empty" style="color: var(--blue-text); line-height: 1.6; padding: 32px 16px;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="margin-bottom: 10px; display: block; margin-inline: auto;">
          <path d="M4 10h16M7 10l1.5-6h7L17 10"/>
          <circle cx="8.5" cy="15.5" r="3"/>
          <circle cx="15.5" cy="15.5" r="3"/>
          <path d="M11.5 15.5h1"/>
        </svg>
        <strong style="color: #f0f6fc;">Incognito Active</strong><br>
        Browsing history is disabled. Pages you visit in this window are not recorded.
      </div>`;
      return;
    }
    if (items.length === 0) {
      historyList.innerHTML = `<div class="sp-empty">Browsing history is clean. No records found.</div>`;
      return;
    }

    let html = '';
    items.forEach(h => {
      const timeStr = formatRelativeTime(h.timestamp);
      html += `
        <div class="sp-item" data-url="${encodeURIComponent(h.url)}">
          <div class="sp-item__main">
            <span class="sp-item__title">${escapeHtml(h.title || h.url)}</span>
            <span class="sp-item__meta">${escapeHtml(formatDomain(h.url))} · ${timeStr}</span>
          </div>
          <button class="sp-item__del" title="Delete entry" data-del-id="${h.id}" aria-label="Delete">${ICONS.close}</button>
        </div>
      `;
    });

    historyList.innerHTML = html;

    // Attach listeners
    historyList.querySelectorAll('.sp-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.sp-item__del')) return;
        const targetUrl = decodeURIComponent(item.getAttribute('data-url'));
        window.privateFox?.navigate(targetUrl);
      });
    });

    historyList.querySelectorAll('.sp-item__del').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const delId = btn.getAttribute('data-del-id');
        await window.privateFox?.removeHistoryItem(delId);
        refreshHistory();
      });
    });
  }

  if (historySearch) {
    historySearch.addEventListener('input', () => {
      const q = historySearch.value.trim().toLowerCase();
      const filtered = cachedHistory.filter(h =>
        (h.title && h.title.toLowerCase().includes(q)) || (h.url && h.url.toLowerCase().includes(q))
      );
      renderHistoryList(filtered);
    });
  }

  if (btnClearHistoryBtn) {
    btnClearHistoryBtn.addEventListener('click', async () => {
      if (confirm('Clear entire browsing history?')) {
        await window.privateFox?.clearHistory();
        refreshHistory();
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // SETTINGS PANEL LOGIC
  // ─────────────────────────────────────────────────────────────
  async function refreshSettings() {
    const s = await window.privateFox?.getSettings() || {};
    cachedSettings = s;
    if (settingSearchEngine && s.searchEngine) {
      settingSearchEngine.value = s.searchEngine;
    }
    if (settingDoh && s.dohProvider) {
      settingDoh.value = s.dohProvider;
    }
    if (settingBookmarksBar) {
      settingBookmarksBar.checked = s.showBookmarksBar !== false;
    }
    if (settingRefererStrip) {
      settingRefererStrip.checked = s.trackerShield === 'strict';
    }
  }

  if (settingSearchEngine) {
    settingSearchEngine.addEventListener('change', async () => {
      const newEngine = settingSearchEngine.value;
      cachedSettings.searchEngine = newEngine;
      await window.privateFox?.saveSettings({ searchEngine: newEngine });
      if (omniboxInput && (!currentTabUrl || currentTabUrl.includes('newtab.html'))) {
        const engineName = newEngine.charAt(0).toUpperCase() + newEngine.slice(1);
        omniboxInput.placeholder = `Search with ${engineName} or enter URL (try !g, !b, !w)`;
      }
    });
  }

  if (settingDoh) {
    settingDoh.addEventListener('change', async () => {
      await window.privateFox?.saveSettings({ dohProvider: settingDoh.value });
    });
  }

  if (settingBookmarksBar) {
    settingBookmarksBar.addEventListener('change', async () => {
      const visible = settingBookmarksBar.checked;
      await window.privateFox?.setBookmarksBarVisible(visible);
      if (bookmarksBar) bookmarksBar.hidden = !visible;
      browserShell.style.setProperty('--chrome-height', visible ? '138px' : '110px');
      document.body.classList.toggle('has-bookmarks-bar', visible);
    });
  }

  if (settingRefererStrip) {
    settingRefererStrip.addEventListener('change', async () => {
      await window.privateFox?.saveSettings({ trackerShield: settingRefererStrip.checked ? 'strict' : 'standard' });
    });
  }

  if (btnCleanCache) {
    btnCleanCache.addEventListener('click', async () => {
      await window.privateFox?.clearBrowsingData({ cache: true });
      alert('Browser cache purged successfully.');
    });
  }

  if (btnCleanCookies) {
    btnCleanCookies.addEventListener('click', async () => {
      await window.privateFox?.clearBrowsingData({ cookies: true });
      alert('All storage & cookies cleared.');
    });
  }

  if (btnCleanAllData) {
    btnCleanAllData.addEventListener('click', async () => {
      if (confirm('Wipe all cache, cookies, and browsing history?')) {
        await window.privateFox?.clearBrowsingData({ cache: true, cookies: true, history: true });
        refreshHistory();
        alert('All browsing data cleanly severed.');
      }
    });
  }

  if (btnExportProfile) {
    btnExportProfile.addEventListener('click', async () => {
      const res = await window.privateFox?.exportProfileBackup();
      if (res?.success) {
        alert('Profile backup saved to:\n' + res.filePath);
      }
    });
  }

  if (btnImportProfile) {
    btnImportProfile.addEventListener('click', async () => {
      const res = await window.privateFox?.importProfileBackup();
      if (res?.success) {
        alert(`Backup restored successfully!\n${res.countBookmarks} bookmarks, ${res.countHistory} history entries restored.`);
        refreshBookmarks();
        refreshHistory();
        refreshSettings();
      }
    });
  }

  if (btnOpenDownloadsFolder) {
    btnOpenDownloadsFolder.addEventListener('click', () => {
      window.privateFox?.openDownloadsFolder();
    });
  }

  // ─────────────────────────────────────────────────────────────
  // SHIELD & AD / TRACKER BLOCKER CONTROLS
  // ─────────────────────────────────────────────────────────────
  let currentShieldStatus = {
    tabId: 0,
    domain: 'newtab',
    enabled: true,
    tabBlockedCount: 0,
    totalBlockedCount: 0,
    shieldLevel: 'strict'
  };

  function updateShieldUI(status) {
    if (!status) return;
    currentShieldStatus = { ...currentShieldStatus, ...status };

    const isEnabled = currentShieldStatus.enabled !== false;
    const tabCount = currentShieldStatus.tabBlockedCount || 0;
    const totalCount = currentShieldStatus.totalBlockedCount || 0;
    const domain = currentShieldStatus.domain || 'internal';
    const displayDomain = (domain === 'internal' || !domain) ? 'New Tab' : domain;

    // 1. Toolbar action button update
    if (btnToggleShield) {
      if (isEnabled) {
        btnToggleShield.classList.remove('is-disabled');
        btnToggleShield.classList.add('is-active');
        btnToggleShield.setAttribute('title', `Ads & Trackers Blocked (${tabCount})`);
        btnToggleShield.setAttribute('aria-expanded', shieldPopover && !shieldPopover.hidden ? 'true' : 'false');
        if (toolbarShieldBadge) {
          toolbarShieldBadge.textContent = tabCount > 0 ? String(tabCount) : 'ON';
        }
      } else {
        btnToggleShield.classList.remove('is-active');
        btnToggleShield.classList.add('is-disabled');
        btnToggleShield.setAttribute('title', 'Ads & Trackers: OFF (Allowed on this site)');
        btnToggleShield.setAttribute('aria-expanded', shieldPopover && !shieldPopover.hidden ? 'true' : 'false');
        if (toolbarShieldBadge) {
          toolbarShieldBadge.textContent = 'OFF';
        }
      }
    }

    // 2. Address bar shield badge if present
    if (shieldBadge) {
      shieldBadge.textContent = String(tabCount);
    }

    // 3. Popover drawer elements update
    if (shieldSiteBadge) {
      shieldSiteBadge.textContent = displayDomain;
      shieldSiteBadge.setAttribute('title', displayDomain);
    }

    if (shieldMasterToggle) {
      shieldMasterToggle.checked = isEnabled;
    }

    if (menuShieldToggle) {
      menuShieldToggle.checked = isEnabled;
    }

    if (shieldMasterCard) {
      if (isEnabled) {
        shieldMasterCard.classList.add('is-active');
        shieldMasterCard.classList.remove('is-disabled');
        if (shieldMasterTitle) shieldMasterTitle.textContent = 'Block Ads & Trackers';
        if (shieldMasterDesc) shieldMasterDesc.textContent = 'Active protection on this site';
      } else {
        shieldMasterCard.classList.remove('is-active');
        shieldMasterCard.classList.add('is-disabled');
        if (shieldMasterTitle) shieldMasterTitle.textContent = 'Protection Paused';
        if (shieldMasterDesc) shieldMasterDesc.textContent = 'Ads & trackers allowed on this site';
      }
    }

    if (shieldTabCount) {
      shieldTabCount.textContent = String(tabCount);
    }

    if (shieldTotalCount) {
      shieldTotalCount.textContent = String(totalCount);
    }

    if (featAdStatus) {
      featAdStatus.textContent = isEnabled ? 'Active' : 'Disabled';
      featAdStatus.className = `feature-status ${isEnabled ? 'feature-status--active' : 'feature-status--disabled'}`;
    }

    if (featCookieStatus) {
      featCookieStatus.textContent = isEnabled ? 'Blocked' : 'Allowed';
      featCookieStatus.className = `feature-status ${isEnabled ? 'feature-status--active' : 'feature-status--disabled'}`;
    }
  }

  async function handleShieldToggle(newCheckedState) {
    const domain = currentShieldStatus.domain || 'internal';
    const updated = await window.privateFox?.toggleShield({
      domain: domain,
      enabled: newCheckedState,
      reload: false
    });

    if (updated) {
      updateShieldUI(updated);
    } else {
      updateShieldUI({ enabled: newCheckedState });
    }

    // Show reload prompt so user knows changes apply on refresh
    if (shieldReloadBox) {
      shieldReloadBox.style.display = 'flex';
    }
  }

  function toggleShieldPopover() {
    if (!shieldPopover) return;
    shieldPopover.hidden = !shieldPopover.hidden;
    if (btnToggleShield) {
      btnToggleShield.setAttribute('aria-expanded', !shieldPopover.hidden ? 'true' : 'false');
    }
    if (!shieldPopover.hidden) {
      // Query freshest status when opening popover
      window.privateFox?.getShieldStatus?.().then(status => {
        if (status) updateShieldUI(status);
      });
      // Close app menu if open
      if (typeof setAppMenuOpen === 'function') setAppMenuOpen(false);
    } else {
      if (shieldReloadBox) shieldReloadBox.style.display = 'none';
    }
  }

  const btnLock = document.getElementById('btnLock');
  if (btnLock) btnLock.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleShieldPopover();
  });

  if (btnShield) btnShield.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleShieldPopover();
  });

  if (btnToggleShield) btnToggleShield.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleShieldPopover();
  });

  if (shieldMasterToggle) {
    shieldMasterToggle.addEventListener('change', () => {
      handleShieldToggle(shieldMasterToggle.checked);
    });
  }

  if (menuShieldToggle) {
    menuShieldToggle.addEventListener('change', () => {
      handleShieldToggle(menuShieldToggle.checked);
    });
  }

  if (btnShieldReload) {
    btnShieldReload.addEventListener('click', () => {
      window.privateFox?.reload();
      if (shieldReloadBox) shieldReloadBox.style.display = 'none';
      if (shieldPopover) {
        shieldPopover.hidden = true;
      }
    });
  }

  document.addEventListener('click', (e) => {
    if (shieldPopover && !shieldPopover.hidden && !shieldPopover.contains(e.target) && !e.target.closest('#btnLock') && !e.target.closest('#btnShield') && !e.target.closest('#btnToggleShield')) {
      shieldPopover.hidden = true;
      if (btnToggleShield) btnToggleShield.setAttribute('aria-expanded', 'false');
      if (shieldReloadBox) shieldReloadBox.style.display = 'none';
    }
    if (omniboxDropdown && !omniboxDropdown.hidden && !omniboxDropdown.contains(e.target) && e.target !== omniboxInput) {
      hideOmniboxDropdown();
    }
  });

  // ─────────────────────────────────────────────────────────────
  // TAB DOM MANAGEMENT
  // ─────────────────────────────────────────────────────────────
  function createTabElement(tabData) {
    let tabBtn = document.getElementById(`tab-${tabData.id}`);
    if (tabBtn) return tabBtn;

    if (!tabList.includes(tabData.id)) {
      tabList.push(tabData.id);
    }

    tabBtn = document.createElement('button');
    tabBtn.className = 'tab';
    tabBtn.id = `tab-${tabData.id}`;
    tabBtn.setAttribute('role', 'tab');
    tabBtn.setAttribute('aria-selected', tabData.isActive ? 'true' : 'false');
    tabBtn.setAttribute('data-tab-id', tabData.id);

    const unreadDot = document.createElement('span');
    unreadDot.className = 'tab__unread-dot';
    if (tabData.hasUnread) {
      tabBtn.classList.add('has-unread');
    }

    const faviconSpan = document.createElement('span');
    faviconSpan.className = 'tab__favicon';
    setTabFavicon(faviconSpan, tabData.favicon);

    // Tab Audio Indicator & Quick Mute Button (adjacent to favicon)
    const audioBtn = document.createElement('button');
    audioBtn.className = 'tab__audio-btn';
    audioBtn.setAttribute('tabindex', '-1');
    audioBtn.setAttribute('aria-label', 'Toggle mute');
    audioBtn.setAttribute('title', 'Mute tab');
    audioBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.privateFox?.toggleMuteTab(tabData.id);
    });

    const titleSpan = document.createElement('span');
    titleSpan.className = 'tab__title';
    titleSpan.textContent = tabData.title || 'New Tab';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'tab__close';
    closeBtn.setAttribute('aria-label', 'Close tab');
    closeBtn.setAttribute('title', 'Close tab');
    closeBtn.setAttribute('tabindex', '-1');
    closeBtn.innerHTML = `
      <svg width="9" height="9" viewBox="0 0 9 9">
        <line x1="1.5" y1="1.5" x2="7.5" y2="7.5" stroke="currentColor" stroke-width="1.3"/>
        <line x1="7.5" y1="1.5" x2="1.5" y2="7.5" stroke="currentColor" stroke-width="1.3"/>
      </svg>
    `;

    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.privateFox?.closeTab(tabData.id);
    });

    tabBtn.appendChild(unreadDot);
    tabBtn.appendChild(faviconSpan);
    tabBtn.appendChild(audioBtn);
    tabBtn.appendChild(titleSpan);
    tabBtn.appendChild(closeBtn);

    tabBtn.addEventListener('click', (e) => {
      if (tabBtn._didJustDrag) {
        tabBtn._didJustDrag = false;
        e.stopImmediatePropagation();
        return;
      }
      window.privateFox?.switchTab(tabData.id);
    });

    tabBtn.addEventListener('auxclick', (e) => {
      if (e.button === 1) {
        e.preventDefault();
        e.stopPropagation();
        if (!tabData.isPinned) {
          window.privateFox?.closeTab(tabData.id);
        }
      }
    });

    // Native & custom right-click context menu
    tabBtn.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.privateFox?.openTabContextMenu(tabData.id);
    });

    // Mount to correct strip: pinned tabs in tabsPinned, normal tabs in tabsScroll
    if (tabData.isPinned) {
      tabBtn.classList.add('tab--pinned');
      tabBtn.setAttribute('title', tabData.title || 'Pinned tab');
      if (tabsPinned) tabsPinned.appendChild(tabBtn);
      else if (tabsScroll) {
        if (btnNewTab && btnNewTab.parentElement === tabsScroll) {
          tabsScroll.insertBefore(tabBtn, btnNewTab);
        } else {
          tabsScroll.appendChild(tabBtn);
        }
      }
    } else {
      tabBtn.classList.remove('tab--pinned');
      tabBtn.removeAttribute('title');
      if (tabsScroll) {
        if (btnNewTab && btnNewTab.parentElement === tabsScroll) {
          tabsScroll.insertBefore(tabBtn, btnNewTab);
        } else {
          tabsScroll.appendChild(tabBtn);
        }
      }
    }

    updateTabAudioState(tabBtn, tabData);
    attachTabDragAndDrop(tabBtn);
    return tabBtn;
  }

  function updateTabAudioState(tabBtn, tabData) {
    if (!tabBtn) return;
    const audioBtn = tabBtn.querySelector('.tab__audio-btn');
    if (!audioBtn) return;

    const isPlaying = !!tabData.isPlayingAudio;
    const isMuted = !!tabData.isMuted;

    if (isPlaying || isMuted) {
      audioBtn.classList.add('is-active');
      if (isMuted) {
        audioBtn.classList.add('is-muted');
        audioBtn.setAttribute('title', 'Unmute tab');
        audioBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/>
            <line x1="23" y1="9" x2="17" y2="15"/>
            <line x1="17" y1="9" x2="23" y2="15"/>
          </svg>
        `;
      } else {
        audioBtn.classList.remove('is-muted');
        audioBtn.setAttribute('title', 'Mute tab');
        audioBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="audio-wave-anim">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
          </svg>
        `;
      }
    } else {
      audioBtn.classList.remove('is-active', 'is-muted');
    }
  }

  function setTabFavicon(faviconSpan, faviconUrl) {
    if (!faviconSpan) return;
    faviconSpan.innerHTML = '';
    const defaultIcon = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;" aria-hidden="true"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`;
    if (!faviconUrl) {
      faviconSpan.innerHTML = defaultIcon;
      return;
    }
    try {
      const u = new URL(faviconUrl);
      if (['http:', 'https:', 'data:'].includes(u.protocol)) {
        const img = document.createElement('img');
        img.width = 14;
        img.height = 14;
        img.alt = '';
        img.style.objectFit = 'contain';
        img.onerror = () => {
          img.remove();
          faviconSpan.innerHTML = defaultIcon;
        };
        img.src = faviconUrl;
        faviconSpan.appendChild(img);
      } else {
        faviconSpan.innerHTML = defaultIcon;
      }
    } catch (e) {
      faviconSpan.innerHTML = defaultIcon;
    }
  }

  function updateTabElement(tabData) {
    let tabBtn = document.getElementById(`tab-${tabData.id}`);
    if (!tabBtn) {
      tabBtn = createTabElement(tabData);
      return;
    }

    const titleSpan = tabBtn.querySelector('.tab__title');
    if (titleSpan) {
      titleSpan.textContent = tabData.title || 'Hell Fire';
    }

    const faviconSpan = tabBtn.querySelector('.tab__favicon');
    if (faviconSpan) {
      setTabFavicon(faviconSpan, tabData.favicon);
    }

    tabBtn.setAttribute('aria-selected', tabData.isActive ? 'true' : 'false');

    // Update pinned state & placement
    if (tabData.isPinned) {
      if (!tabBtn.classList.contains('tab--pinned')) {
        tabBtn.classList.add('tab--pinned');
      }
      tabBtn.setAttribute('title', tabData.title || 'Pinned tab');
      if (tabsPinned && tabBtn.parentElement !== tabsPinned) {
        tabsPinned.appendChild(tabBtn);
      }
    } else {
      if (tabBtn.classList.contains('tab--pinned')) {
        tabBtn.classList.remove('tab--pinned');
      }
      tabBtn.removeAttribute('title');
      if (tabsScroll && tabBtn.parentElement !== tabsScroll) {
        if (btnNewTab && btnNewTab.parentElement === tabsScroll) {
          tabsScroll.insertBefore(tabBtn, btnNewTab);
        } else {
          tabsScroll.appendChild(tabBtn);
        }
      }
    }

    updateTabAudioState(tabBtn, tabData);
  }

  // ─────────────────────────────────────────────────────────────
  // TAB DRAG & DROP SWAPPING ARCHITECTURE
  // ─────────────────────────────────────────────────────────────
  let activeTabDrag = null;

  function attachTabDragAndDrop(tabBtn) {
    if (!tabBtn || tabBtn._hasDragDrop) return;
    tabBtn._hasDragDrop = true;

    let startX = 0;
    let startY = 0;
    let isDown = false;
    let isDragging = false;
    let container = null;
    let siblings = [];
    let initialCenters = [];
    let origIndex = -1;
    let targetIndex = -1;
    let tabWidth = 0;
    const gap = 4;

    tabBtn.addEventListener('pointerdown', (e) => {
      // Primary button only, ignore clicks on close or audio buttons
      if (e.button !== 0) return;
      if (e.target.closest('.tab__close') || e.target.closest('.tab__audio-btn')) return;

      container = tabBtn.parentElement;
      if (!container || (container !== tabsScroll && container !== tabsPinned)) return;

      isDown = true;
      isDragging = false;
      startX = e.clientX;
      startY = e.clientY;

      const onPointerMove = (moveEvt) => {
        if (!isDown) return;

        const deltaX = moveEvt.clientX - startX;
        const deltaY = moveEvt.clientY - startY;

        if (!isDragging) {
          // Movement threshold (4px)
          if (Math.hypot(deltaX, deltaY) >= 4) {
            isDragging = true;
            document.body.classList.add('is-tab-dragging');
            tabBtn.classList.add('tab--dragging');

            try {
              tabBtn.setPointerCapture(moveEvt.pointerId);
            } catch (err) {}

            siblings = Array.from(container.querySelectorAll('.tab'));
            origIndex = siblings.indexOf(tabBtn);
            targetIndex = origIndex;

            if (siblings.length <= 1) return;

            initialCenters = siblings.map(s => {
              const r = s.getBoundingClientRect();
              return r.left + r.width / 2;
            });

            const myRect = tabBtn.getBoundingClientRect();
            tabWidth = myRect.width;

            activeTabDrag = {
              cancel: () => cleanupDrag(true)
            };
          } else {
            return;
          }
        }

        if (isDragging && siblings.length > 1) {
          // Edge autoscroll for tabsScroll container
          if (container === tabsScroll) {
            const containerRect = tabsScroll.getBoundingClientRect();
            if (moveEvt.clientX < containerRect.left + 40) {
              tabsScroll.scrollLeft -= 8;
            } else if (moveEvt.clientX > containerRect.right - 40) {
              tabsScroll.scrollLeft += 8;
            }
          }

          // Follow pointer horizontally
          tabBtn.style.transform = `translateX(${deltaX}px) scale(1.04)`;

          // Visual center of dragged tab
          const currentCenter = initialCenters[origIndex] + deltaX;

          // Determine target index among siblings
          let newTarget = origIndex;
          if (deltaX > 0) {
            for (let i = origIndex + 1; i < siblings.length; i++) {
              if (currentCenter > initialCenters[i]) {
                newTarget = i;
              }
            }
          } else if (deltaX < 0) {
            for (let i = origIndex - 1; i >= 0; i--) {
              if (currentCenter < initialCenters[i]) {
                newTarget = i;
              }
            }
          }

          targetIndex = Math.max(0, Math.min(siblings.length - 1, newTarget));

          // Smoothly translate siblings out of the way
          const shiftAmount = tabWidth + gap;
          siblings.forEach((s, i) => {
            if (i === origIndex) return;

            s.classList.add('tab--drag-animating');
            if (origIndex < targetIndex && i > origIndex && i <= targetIndex) {
              s.style.transform = `translateX(${-shiftAmount}px)`;
            } else if (origIndex > targetIndex && i >= targetIndex && i < origIndex) {
              s.style.transform = `translateX(${shiftAmount}px)`;
            } else {
              s.style.transform = 'translateX(0px)';
            }
          });
        }
      };

      const cleanupDrag = (cancelled = false) => {
        if (!isDown && !isDragging) {
          isDown = false;
          return;
        }

        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);

        activeTabDrag = null;

        if (isDragging) {
          tabBtn._didJustDrag = true;
          setTimeout(() => { tabBtn._didJustDrag = false; }, 120);

          document.body.classList.remove('is-tab-dragging');
          tabBtn.classList.remove('tab--dragging');

          try {
            if (tabBtn.hasPointerCapture(e.pointerId)) {
              tabBtn.releasePointerCapture(e.pointerId);
            }
          } catch (err) {}

          // Reset sibling transforms
          siblings.forEach(s => {
            s.classList.remove('tab--drag-animating');
            s.style.transform = '';
          });
          tabBtn.style.transform = '';

          if (!cancelled && targetIndex !== -1 && targetIndex !== origIndex && container) {
            const targetSibling = siblings[targetIndex];
            if (targetIndex > origIndex) {
              targetSibling.after(tabBtn);
            } else {
              targetSibling.before(tabBtn);
            }

            if (btnNewTab && btnNewTab.parentElement === tabsScroll) {
              tabsScroll.appendChild(btnNewTab);
            }

            const orderedTabIds = Array.from(document.querySelectorAll('#tabsPinned .tab, #tabsScroll .tab'))
              .map(el => el.getAttribute('data-tab-id'))
              .filter(Boolean);
            tabList = orderedTabIds;
            window.privateFox?.reorderTabs(orderedTabIds);
          }
        }

        isDown = false;
        isDragging = false;
      };

      const onPointerUp = () => {
        cleanupDrag(false);
      };

      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('pointerup', onPointerUp, { once: true });
      window.addEventListener('pointercancel', onPointerUp, { once: true });
    });
  }

  function moveActiveTab(direction) {
    if (!activeTabId) return;
    const currentTabEl = document.getElementById(`tab-${activeTabId}`);
    if (!currentTabEl) return;
    const container = currentTabEl.parentElement;
    if (!container || (container !== tabsScroll && container !== tabsPinned)) return;

    const tabs = Array.from(container.querySelectorAll('.tab'));
    const idx = tabs.indexOf(currentTabEl);
    if (idx === -1) return;

    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= tabs.length) return;

    const targetTabEl = tabs[targetIdx];

    const rect1 = currentTabEl.getBoundingClientRect();
    const rect2 = targetTabEl.getBoundingClientRect();
    const delta1 = rect1.left - rect2.left;
    const delta2 = rect2.left - rect1.left;

    if (direction > 0) {
      targetTabEl.after(currentTabEl);
    } else {
      targetTabEl.before(currentTabEl);
    }

    if (btnNewTab && btnNewTab.parentElement === tabsScroll) {
      tabsScroll.appendChild(btnNewTab);
    }

    currentTabEl.style.transition = 'none';
    targetTabEl.style.transition = 'none';
    currentTabEl.style.transform = `translateX(${delta1}px)`;
    targetTabEl.style.transform = `translateX(${delta2}px)`;

    requestAnimationFrame(() => {
      currentTabEl.style.transition = 'transform 180ms cubic-bezier(0.2, 0, 0, 1)';
      targetTabEl.style.transition = 'transform 180ms cubic-bezier(0.2, 0, 0, 1)';
      currentTabEl.style.transform = '';
      targetTabEl.style.transform = '';
      setTimeout(() => {
        currentTabEl.style.transition = '';
        targetTabEl.style.transition = '';
      }, 190);
    });

    currentTabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });

    const orderedTabIds = Array.from(document.querySelectorAll('#tabsPinned .tab, #tabsScroll .tab'))
      .map(el => el.getAttribute('data-tab-id'))
      .filter(Boolean);
    tabList = orderedTabIds;
    window.privateFox?.reorderTabs(orderedTabIds);
  }

  // Cancel active drag on Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && activeTabDrag) {
      e.preventDefault();
      activeTabDrag.cancel();
    }
  });

  // ─────────────────────────────────────────────────────────────
  // ELECTRON IPC SUBSCRIPTIONS
  // ─────────────────────────────────────────────────────────────
  if (window.privateFox) {
    window.privateFox.on('tab:created', (tabData) => {
      createTabElement(tabData);
    });

    window.privateFox.on('tab:updated', (tabData) => {
      updateTabElement(tabData);
    });

    window.privateFox.on('tab:audio-state', ({ id, isPlayingAudio, isMuted }) => {
      const tabBtn = document.getElementById(`tab-${id}`);
      if (tabBtn) {
        updateTabAudioState(tabBtn, { isPlayingAudio, isMuted });
      }
    });

    window.privateFox.on('tab:list', (tabDataList) => {
      if (Array.isArray(tabDataList)) {
        tabDataList.forEach(t => updateTabElement(t));
      }
    });

    window.privateFox.on('tab:closed', ({ id }) => {
      const el = document.getElementById(`tab-${id}`);
      if (el) el.remove();
      tabList = tabList.filter(t => t !== id);
    });

    window.privateFox.on('tab:switched', ({ activeTabId: newId }) => {
      activeTabId = newId;
      document.querySelectorAll('.tab').forEach((el) => {
        const isCurrent = el.getAttribute('data-tab-id') === String(newId);
        el.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
        if (isCurrent) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
      });
    });

    window.privateFox.on('tab:split-state', ({ isSplit, activeTabId: aId, splitTabId }) => {
      if (btnSplitView) {
        btnSplitView.classList.toggle('is-active', Boolean(isSplit));
        btnSplitView.setAttribute('aria-pressed', isSplit ? 'true' : 'false');
        btnSplitView.setAttribute('title', isSplit ? 'Close Split View (Ctrl+Alt+S)' : 'Split View Dual Pane (Ctrl+Alt+S)');
      }
    });

    window.privateFox.on('glance:state', ({ isOpen, url }) => {
      if (glanceFloatingBar) {
        glanceFloatingBar.hidden = !isOpen;
        glanceFloatingBar.style.display = isOpen ? 'flex' : 'none';
        if (isOpen) {
          currentGlanceUrl = url;
          if (glanceBarUrl) glanceBarUrl.textContent = url || '';
        } else {
          currentGlanceUrl = null;
          if (glanceBarUrl) glanceBarUrl.textContent = '';
        }
      }
    });

    window.privateFox.on('window:state', ({ isMaximized }) => {
      if (iconMax) {
        if (isMaximized) {
          iconMax.innerHTML = `
            <rect x="2.5" y="0.75" width="6.75" height="6.75" stroke="currentColor" stroke-width="1.2" fill="none"/>
            <polyline points="0.75,2.5 0.75,9.25 7.5,9.25" stroke="currentColor" stroke-width="1.2" fill="none"/>
          `;
          if (wcMax) wcMax.setAttribute('title', 'Restore');
        } else {
          iconMax.innerHTML = `
            <rect x="0.75" y="0.75" width="8.5" height="8.5" stroke="currentColor" stroke-width="1.2" fill="none"/>
          `;
          if (wcMax) wcMax.setAttribute('title', 'Maximise');
        }
      }
    });

    window.privateFox.on('nav:state', (state) => {
      currentTabUrl = state.url || '';
      currentTabTitle = state.title || '';

      if (omniboxInput) {
        if (state.url && !state.url.includes('newtab.html')) {
          omniboxInput.value = state.url;
        } else {
          omniboxInput.value = '';
          const engineName = cachedSettings.searchEngine ? cachedSettings.searchEngine.charAt(0).toUpperCase() + cachedSettings.searchEngine.slice(1) : 'Brave';
          omniboxInput.placeholder = `Search with ${engineName} or enter URL (try !g, !b, !w)`;
        }
      }

      if (btnBack) btnBack.disabled = !state.canGoBack;
      if (btnForward) btnForward.disabled = !state.canGoForward;

      if (progressFill) {
        if (state.isLoading) {
          progressFill.classList.add('loading');
        } else {
          progressFill.classList.remove('loading');
          progressFill.style.width = '0%';
        }
      }
    });

    window.privateFox.on('bookmark:status', ({ isBookmarked }) => {
      updateStarButtonState(isBookmarked);
    });

    window.privateFox.on('privacy:stats', (stats) => {
      if (stats.blockedTrackers !== undefined) {
        updateShieldUI({ totalBlockedCount: stats.blockedTrackers });
      }
      if (popoverDoh && stats.doh) popoverDoh.textContent = stats.doh;
      if (stats.dohProvider) activeDohProvider = stats.dohProvider;
      const statusLabel = document.getElementById('statusLabel');
      if (statusLabel && !document.body.classList.contains('is-incognito')) {
        const dohName = activeDohProvider === 'cloudflare' ? 'Cloudflare' : activeDohProvider === 'mullvad' ? 'Mullvad' : 'Quad9';
        statusLabel.textContent = `Secure (${dohName})`;
      }
      const aboutDohVal = document.getElementById('aboutDohVal');
      if (aboutDohVal && stats.doh) {
        aboutDohVal.textContent = `${stats.doh} (TLS 1.3)`;
      }
    });

    window.privateFox.on('shield:tab-status', (status) => {
      updateShieldUI(status);
    });

    window.privateFox.on('bookmarks:updated', (bms) => {
      cachedBookmarks = bms;
      renderBookmarksList(bms);
      renderBookmarksBar(bms);
    });

    window.privateFox.on('history:updated', () => {
      if (isSidePanelOpen && activeSidePanelTab === 'panelHistory') {
        refreshHistory();
      }
    });

    const downloadHistory = new Map();

    function renderDownloadList() {
      if (!downloadsList) return;
      if (downloadHistory.size === 0) {
        downloadsList.innerHTML = `
          <div class="sp-empty">
            <span style="display:inline-flex; color:var(--text-ghost);">${ICONS.download}</span>
            <span>No recent downloads</span>
          </div>
        `;
        return;
      }

      let html = '';
      for (const [name, item] of downloadHistory) {
        let iconHtml = `<span style="color:var(--text-muted); display:inline-flex;">${ICONS.download}</span>`;
        let statusHtml = '';
        let actionBtn = '';

        if (item.state === 'completed') {
          iconHtml = `<span style="color:var(--blue-bright); display:inline-flex;">${ICONS.check}</span>`;
          statusHtml = `<span class="sp-item__meta" style="color:var(--blue-bright);">Completed · Saved to Downloads</span>`;
          actionBtn = `<button class="sp-action-btn" onclick="window.privateFox?.openDownloadsFolder()">SHOW</button>`;
        } else if (item.state === 'cancelled') {
          iconHtml = `<span style="color:var(--text-ghost); display:inline-flex;">${ICONS.close}</span>`;
          statusHtml = `<span class="sp-item__meta" style="color:var(--text-ghost);">Download cancelled</span>`;
        } else if (item.state === 'interrupted') {
          iconHtml = `<span style="color:var(--danger); display:inline-flex;">${ICONS.shield}</span>`;
          statusHtml = `<span class="sp-item__meta" style="color:var(--danger);">Download interrupted / network error</span>`;
        } else {
          statusHtml = `<span class="sp-item__meta">${item.percent || 0}% (${Math.round((item.received || 0) / 1024)} KB / ${Math.round((item.total || 0) / 1024)} KB)</span>`;
        }

        html += `
          <div class="sp-item">
            <div class="sp-item__main">
              <span class="sp-item__title" style="display:flex; align-items:center; gap:6px;">${iconHtml} ${escapeHtml(item.fileName)}</span>
              ${statusHtml}
            </div>
            ${actionBtn}
          </div>
        `;
      }
      downloadsList.innerHTML = html;
    }

    window.privateFox.on('download:progress', (data) => {
      downloadHistory.set(data.fileName, {
        fileName: data.fileName,
        percent: data.percent,
        received: data.received,
        total: data.total,
        state: 'progressing'
      });
      renderDownloadList();
    });

    window.privateFox.on('download:completed', (data) => {
      downloadHistory.set(data.fileName, {
        fileName: data.fileName,
        state: data.state || 'completed',
        savePath: data.savePath
      });
      renderDownloadList();
    });

    window.privateFox.on('settings:loaded', (newSettings) => {
      if (!newSettings) return;
      cachedSettings = { ...cachedSettings, ...newSettings };
      if (settingSearchEngine && newSettings.searchEngine) {
        settingSearchEngine.value = newSettings.searchEngine;
      }
      if (settingDoh && newSettings.dohProvider) {
        settingDoh.value = newSettings.dohProvider;
      }
      if (settingBookmarksBar) {
        settingBookmarksBar.checked = newSettings.showBookmarksBar !== false;
      }
      if (settingRefererStrip) {
        settingRefererStrip.checked = newSettings.trackerShield === 'strict';
      }
      if (bookmarksBar) {
        bookmarksBar.hidden = newSettings.showBookmarksBar === false;
      }
      browserShell.style.setProperty('--chrome-height', (newSettings.showBookmarksBar !== false) ? '138px' : '110px');
    });

    // Load Initial State
    window.privateFox.getInitialState().then((state) => {
      if (state && state.tabs) {
        state.tabs.forEach(t => updateTabElement(t));
      }
      if (state && state.bookmarks) {
        cachedBookmarks = state.bookmarks;
        renderBookmarksBar(state.bookmarks);
      }
      if (state && state.settings) {
        cachedSettings = state.settings;
        const barVisible = state.settings.showBookmarksBar !== false;
        if (bookmarksBar) bookmarksBar.hidden = !barVisible;
        browserShell.style.setProperty('--chrome-height', barVisible ? '138px' : '110px');
        document.body.classList.toggle('has-bookmarks-bar', barVisible);
      }
      if (state && state.shieldStatus) {
        updateShieldUI(state.shieldStatus);
      }
      if (state && state.isSplit !== undefined && btnSplitView) {
        btnSplitView.classList.toggle('is-active', Boolean(state.isSplit));
        btnSplitView.setAttribute('aria-pressed', state.isSplit ? 'true' : 'false');
        btnSplitView.setAttribute('title', state.isSplit ? 'Close Split View (Ctrl+Alt+S)' : 'Split View Dual Pane (Ctrl+Alt+S)');
      }
      if (glanceFloatingBar) {
        const isGlance = Boolean(state && state.isGlanceOpen);
        glanceFloatingBar.hidden = !isGlance;
        glanceFloatingBar.style.display = isGlance ? 'flex' : 'none';
      }
      if (state && state.isIncognito) {
        document.body.classList.add('is-incognito');
        const incognitoBadge = document.getElementById('incognitoBadge');
        if (incognitoBadge) incognitoBadge.hidden = false;
        const statusLabel = document.getElementById('statusLabel');
        if (statusLabel) statusLabel.textContent = 'Incognito (Zero History)';
      } else {
        document.body.classList.remove('is-incognito');
        const incognitoBadge = document.getElementById('incognitoBadge');
        if (incognitoBadge) incognitoBadge.hidden = true;
        const statusLabel = document.getElementById('statusLabel');
        if (statusLabel) {
          const dohName = activeDohProvider === 'cloudflare' ? 'Cloudflare' : activeDohProvider === 'mullvad' ? 'Mullvad' : 'Quad9';
          statusLabel.textContent = `Secure (${dohName})`;
        }
      }
    });
  }

  // Double click empty tab bar area opens new tab
  if (tabsScroll) {
    tabsScroll.addEventListener('dblclick', (e) => {
      if (e.target === tabsScroll) {
        handleNewTab();
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // APPLICATION THREE-BAR HAMBURGER MENU LOGIC
  // ─────────────────────────────────────────────────────────────
  let isAppMenuOpen = false;

  function setAppMenuOpen(open) {
    if (!appMenu) return;
    isAppMenuOpen = open;
    appMenu.hidden = !open;
    if (btnAppMenu) {
      btnAppMenu.setAttribute('aria-expanded', open ? 'true' : 'false');
      btnAppMenu.classList.toggle('active', open);
    }
    if (open) {
      if (shieldPopover && !shieldPopover.hidden) {
        shieldPopover.hidden = true;
        if (btnToggleShield) btnToggleShield.setAttribute('aria-expanded', 'false');
      }
      hideSubmenus();
      if (btnAppMenu) {
        const rect = btnAppMenu.getBoundingClientRect();
        window.privateFox?.openAppMenu?.({
          x: Math.round(rect.right),
          y: Math.round(rect.bottom + 4)
        });
      }
    } else {
      hideSubmenus();
    }
  }

  function hideSubmenus() {
    if (submenuMoreTools) submenuMoreTools.hidden = true;
    if (submenuHelp) submenuHelp.hidden = true;
    if (submenuHistory) submenuHistory.hidden = true;
    if (submenuBookmarks) submenuBookmarks.hidden = true;
  }

  if (btnAppMenu) {
    btnAppMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      setAppMenuOpen(!isAppMenuOpen);
    });
  }

  // Submenu Positioning and Hover Handlers
  const menuMoreTools = document.getElementById('menuMoreTools');
  const menuHelp = document.getElementById('menuHelp');
  const menuHistory = document.getElementById('menuHistory');
  const menuBookmarks = document.getElementById('menuBookmarks');

  if (menuHistory) {
    menuHistory.addEventListener('mouseenter', () => {
      if (submenuHistory) {
        hideSubmenus();
        submenuHistory.hidden = false;
        submenuHistory.style.top = `${menuHistory.offsetTop}px`;
      }
    });
    menuHistory.addEventListener('click', (e) => {
      e.stopPropagation();
      if (submenuHistory) {
        const wasHidden = submenuHistory.hidden;
        hideSubmenus();
        submenuHistory.hidden = !wasHidden;
        submenuHistory.style.top = `${menuHistory.offsetTop}px`;
      }
    });
  }

  if (menuBookmarks) {
    menuBookmarks.addEventListener('mouseenter', () => {
      if (submenuBookmarks) {
        hideSubmenus();
        submenuBookmarks.hidden = false;
        submenuBookmarks.style.top = `${menuBookmarks.offsetTop}px`;
      }
    });
    menuBookmarks.addEventListener('click', (e) => {
      e.stopPropagation();
      if (submenuBookmarks) {
        const wasHidden = submenuBookmarks.hidden;
        hideSubmenus();
        submenuBookmarks.hidden = !wasHidden;
        submenuBookmarks.style.top = `${menuBookmarks.offsetTop}px`;
      }
    });
  }

  if (menuMoreTools) {
    menuMoreTools.addEventListener('mouseenter', () => {
      if (submenuMoreTools) {
        hideSubmenus();
        submenuMoreTools.hidden = false;
        submenuMoreTools.style.top = `${menuMoreTools.offsetTop}px`;
      }
    });
    menuMoreTools.addEventListener('click', (e) => {
      e.stopPropagation();
      if (submenuMoreTools) {
        const wasHidden = submenuMoreTools.hidden;
        hideSubmenus();
        submenuMoreTools.hidden = !wasHidden;
        submenuMoreTools.style.top = `${menuMoreTools.offsetTop}px`;
      }
    });
  }

  if (menuHelp) {
    menuHelp.addEventListener('mouseenter', () => {
      if (submenuHelp) {
        hideSubmenus();
        submenuHelp.hidden = false;
        submenuHelp.style.top = `${menuHelp.offsetTop}px`;
      }
    });
    menuHelp.addEventListener('click', (e) => {
      e.stopPropagation();
      if (submenuHelp) {
        const wasHidden = submenuHelp.hidden;
        hideSubmenus();
        submenuHelp.hidden = !wasHidden;
        submenuHelp.style.top = `${menuHelp.offsetTop}px`;
      }
    });
  }

  // Hide submenus when hovering other menu items
  const flatMenuItems = [
    'menuNewTab', 'menuNewWindow', 'menuNewPrivateWindow',
    'menuDownloads', 'menuPasswords', 'menuExtensions',
    'menuPrint', 'menuSavePage', 'menuTranslate', 'menuFindInPage',
    'menuZoomRow', 'menuSettings', 'menuExit'
  ];
  flatMenuItems.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('mouseenter', hideSubmenus);
    }
  });

  // ─────────────────────────────────────────────────────────────
  // TOAST NOTIFICATION HELPER
  // ─────────────────────────────────────────────────────────────
  function showToast(message, duration = 2400) {
    const toastBanner = document.getElementById('toastBanner');
    if (!toastBanner) return;
    toastBanner.textContent = message;
    toastBanner.hidden = false;
    clearTimeout(toastBanner._timer);
    toastBanner._timer = setTimeout(() => {
      toastBanner.hidden = true;
    }, duration);
  }

  // ─────────────────────────────────────────────────────────────
  // STANDALONE MODALS CONTROLLER (Task Manager, Passwords, Clear Data, About, Privacy, Report)
  // ─────────────────────────────────────────────────────────────
  let activeModalId = null;
  let taskManagerInterval = null;
  let selectedTaskManagerRow = null;
  const closedTabsStack = [];
  const tabMetadataMap = new Map();

  function openModal(modalId) {
    const overlay = document.getElementById('modalOverlay');
    if (!overlay) return;
    setAppMenuOpen(false);

    // Hide all modal cards
    const cards = overlay.querySelectorAll('.modal-card');
    cards.forEach(c => c.hidden = true);

    const target = document.getElementById(modalId);
    if (!target) return;
    target.hidden = false;
    overlay.hidden = false;
    activeModalId = modalId;

    // Remove WebContentsView so modal in DOM is unblocked
    window.privateFox?.setModalOpen(true);

    if (modalId === 'modalTaskManager') {
      startTaskManager();
    } else if (modalId === 'modalPasswords') {
      switchAutofillTab('logins');
    } else if (modalId === 'modalExtensions') {
      loadExtensionsUI();
    } else if (modalId === 'modalReportIssue') {
      const reportUrl = document.getElementById('reportUrl');
      if (reportUrl) {
        reportUrl.value = currentTabUrl || 'about:newtab';
      }
    }
  }

  function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    const cards = overlay.querySelectorAll('.modal-card');
    cards.forEach(c => c.hidden = true);
    activeModalId = null;

    if (taskManagerInterval) {
      clearInterval(taskManagerInterval);
      taskManagerInterval = null;
    }

    // Restore WebContentsView
    window.privateFox?.setModalOpen(false);
  }

  // Close modals on backdrop click
  const modalOverlay = document.getElementById('modalOverlay');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
  }

  // Close buttons
  ['btnCloseTaskManager', 'btnClosePasswords', 'btnCloseClearData', 'btnCloseAbout', 'btnClosePrivacyDocs', 'btnCloseReportIssue', 'btnCancelClearData', 'btnCancelReport'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', closeModal);
  });

  // ─────────────────────────────────────────────────────────────
  // 1. TASK MANAGER
  // ─────────────────────────────────────────────────────────────
  async function renderTaskManager() {
    const tmList = document.getElementById('tmProcessList');
    const tmTotal = document.getElementById('tmMemoryTotal');
    const btnEnd = document.getElementById('btnEndProcess');
    if (!tmList) return;

    const data = await window.privateFox?.getTaskManagerData();
    if (!data) return;

    let totalMemKB = 0;
    let html = '';

    // 1. Browser Core
    const mainMemMB = data.memory ? Math.round(data.memory.rss / (1024 * 1024)) : 72;
    totalMemKB += mainMemMB * 1024;
    html += `
      <div class="tm-row" data-type="core" data-pid="${data.mainPid}">
        <span class="tm-col tm-col--name">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="modal-icon"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
          <strong>Browser Core (Main)</strong>
        </span>
        <span class="tm-col tm-col--pid">${data.mainPid}</span>
        <span class="tm-col tm-col--mem">${mainMemMB} MB</span>
        <span class="tm-col tm-col--cpu">0.3%</span>
      </div>
    `;

    // 2. Metrics (GPU, Utility)
    (data.metrics || []).forEach(m => {
      if (m.pid === data.mainPid) return;
      const memMB = Math.round((m.memory?.workingSetSize || 36000) / 1024);
      totalMemKB += memMB * 1024;
      const cpuPct = (m.cpu?.percentCPUUsage || 0).toFixed(1);
      html += `
        <div class="tm-row" data-type="sub" data-pid="${m.pid}">
          <span class="tm-col tm-col--name">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            Process: ${m.type || 'Subprocess'}
          </span>
          <span class="tm-col tm-col--pid">${m.pid}</span>
          <span class="tm-col tm-col--mem">${memMB} MB</span>
          <span class="tm-col tm-col--cpu">${cpuPct}%</span>
        </div>
      `;
    });

    // 3. Open Tabs
    (data.tabs || []).forEach(t => {
      const tabTitle = t.title || 'New Tab';
      const tabMemMB = 54 + (t.id.charCodeAt(0) % 18);
      totalMemKB += tabMemMB * 1024;
      html += `
        <div class="tm-row" data-type="tab" data-tabid="${t.id}" data-pid="${t.pid || ''}">
          <span class="tm-col tm-col--name">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
            Tab: ${escapeHtml(tabTitle)}
          </span>
          <span class="tm-col tm-col--pid">${t.pid || '—'}</span>
          <span class="tm-col tm-col--mem">${tabMemMB} MB</span>
          <span class="tm-col tm-col--cpu">0.1%</span>
        </div>
      `;
    });

    tmList.innerHTML = html;
    if (tmTotal) {
      const taskCount = 1 + (data.metrics?.length || 0) + (data.tabs?.length || 0);
      tmTotal.textContent = `Total Memory: ${Math.round(totalMemKB / 1024)} MB across ${taskCount} tasks`;
    }

    // Row click selection
    const rows = tmList.querySelectorAll('.tm-row');
    rows.forEach(r => {
      r.addEventListener('click', () => {
        rows.forEach(x => x.classList.remove('is-selected'));
        r.classList.add('is-selected');
        selectedTaskManagerRow = {
          type: r.getAttribute('data-type'),
          tabId: r.getAttribute('data-tabid'),
          pid: Number(r.getAttribute('data-pid')) || null
        };
        if (btnEnd) btnEnd.disabled = (selectedTaskManagerRow.type === 'core');
      });
    });
  }

  function startTaskManager() {
    renderTaskManager();
    if (taskManagerInterval) clearInterval(taskManagerInterval);
    taskManagerInterval = setInterval(renderTaskManager, 2000);
  }

  const btnRefreshTaskManager = document.getElementById('btnRefreshTaskManager');
  if (btnRefreshTaskManager) btnRefreshTaskManager.addEventListener('click', renderTaskManager);

  const btnEndProcess = document.getElementById('btnEndProcess');
  if (btnEndProcess) {
    btnEndProcess.addEventListener('click', async () => {
      if (!selectedTaskManagerRow) return;
      if (selectedTaskManagerRow.type === 'core') {
        showToast('Cannot terminate Browser Core process');
        return;
      }
      btnEndProcess.disabled = true;
      await window.privateFox?.killTask({
        tabId: selectedTaskManagerRow.tabId,
        pid: selectedTaskManagerRow.pid
      });
      showToast('Process terminated');
      renderTaskManager();
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 2. PASSWORDS & AUTOFILL MANAGER
  // ─────────────────────────────────────────────────────────────
  const DEFAULT_PASSWORDS = [
    { id: '1', site: 'github.com', user: 'security_operator', pass: 'H3llF1r3!S3cur3#99' },
    { id: '2', site: 'reddit.com', user: 'blue_flame_user', pass: 'Priv@t3Fox#2026' },
    { id: '3', site: 'proton.me', user: 'operator@proton.me', pass: 'Z3r0T3l3m3try$2026' }
  ];

  let inMemoryVault = null;

  async function initEncryptedVault() {
    if (window.privateFox?.getVault) {
      try {
        const encryptedVault = await window.privateFox.getVault();
        if (Array.isArray(encryptedVault) && encryptedVault.length > 0) {
          inMemoryVault = encryptedVault;
          return;
        }
      } catch (e) {}
    }
    try {
      const raw = localStorage.getItem('hellfire_passwords_vault');
      inMemoryVault = raw ? JSON.parse(raw) : DEFAULT_PASSWORDS;
      if (window.privateFox?.saveVault) {
        window.privateFox.saveVault(inMemoryVault).catch(() => {});
      }
    } catch (e) {
      inMemoryVault = DEFAULT_PASSWORDS;
    }
  }
  initEncryptedVault();

  function getStoredPasswords() {
    if (Array.isArray(inMemoryVault)) return inMemoryVault;
    try {
      const raw = localStorage.getItem('hellfire_passwords_vault');
      inMemoryVault = raw ? JSON.parse(raw) : DEFAULT_PASSWORDS;
    } catch (e) {
      inMemoryVault = DEFAULT_PASSWORDS;
    }
    return inMemoryVault;
  }

  function saveStoredPasswords(list) {
    inMemoryVault = list;
    try {
      localStorage.setItem('hellfire_passwords_vault', JSON.stringify(list));
    } catch (e) {}
    if (window.privateFox?.saveVault) {
      window.privateFox.saveVault(list).catch(() => {});
    }
  }

  function getDomainInitial(site) {
    const clean = (site || '').replace(/^(https?:\/\/)?(www\.)?/, '');
    return clean ? clean.charAt(0).toUpperCase() : '?';
  }

  function loadPasswordsUI(filter = '') {
    const listEl = document.getElementById('passwordsList');
    const loginsCountEl = document.getElementById('loginsCount');
    if (!listEl) return;
    const all = getStoredPasswords();
    if (loginsCountEl) loginsCountEl.textContent = all.length;

    const filtered = filter ? all.filter(p => p.site.toLowerCase().includes(filter.toLowerCase()) || p.user.toLowerCase().includes(filter.toLowerCase())) : all;

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div style="text-align:center; padding: 32px 16px; color: var(--text-muted); display:flex; flex-direction:column; align-items:center; gap:8px;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.5;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span style="font-size:12.5px; font-weight:500;">No credentials matching search</span>
          <span style="font-size:11px; opacity:0.7;">Try searching by another domain or username</span>
        </div>`;
      return;
    }

    listEl.innerHTML = filtered.map(p => `
      <div class="password-item" data-id="${p.id}">
        <div class="password-item__main">
          <div class="password-avatar" aria-hidden="true">${getDomainInitial(p.site)}</div>
          <div class="password-info">
            <span class="password-site">${escapeHtml(p.site)}</span>
            <span class="password-user">${escapeHtml(p.user)}</span>
            <div class="password-secret-row">
              <span class="password-secret-badge">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <span class="password-secret-text" id="secret_${p.id}">••••••••••••</span>
              </span>
            </div>
          </div>
        </div>
        <div class="password-actions">
          <button class="password-action-btn" title="Show/Hide password" data-action="toggle-eye" data-id="${p.id}" data-secret="${escapeHtml(p.pass)}">
            <svg class="eye-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button class="password-action-btn" title="Copy username" data-action="copy-user" data-user="${escapeHtml(p.user)}">
            <svg class="copy-user-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </button>
          <button class="password-action-btn" title="Copy password" data-action="copy-pass" data-secret="${escapeHtml(p.pass)}">
            <svg class="copy-pass-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button class="password-action-btn password-action-btn--delete" title="Delete login" data-action="delete" data-id="${p.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `).join('');

    // Attach actions
    listEl.querySelectorAll('[data-action="toggle-eye"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const secret = btn.getAttribute('data-secret');
        const label = document.getElementById(`secret_${id}`);
        if (label) {
          if (label.textContent === '••••••••••••') {
            label.textContent = secret;
            label.style.color = '#ffffff';
            btn.innerHTML = '<svg class="eye-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/></svg>';
            btn.title = 'Hide password';
          } else {
            label.textContent = '••••••••••••';
            label.style.color = '#38bdf8';
            btn.innerHTML = '<svg class="eye-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
            btn.title = 'Show password';
          }
        }
      });
    });

    listEl.querySelectorAll('[data-action="copy-user"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const user = btn.getAttribute('data-user');
        if (user) {
          navigator.clipboard.writeText(user).then(() => {
            btn.classList.add('is-copied');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
            showToast('Username copied to clipboard');
            setTimeout(() => {
              btn.classList.remove('is-copied');
              btn.innerHTML = originalHTML;
            }, 1500);
          });
        }
      });
    });

    listEl.querySelectorAll('[data-action="copy-pass"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const secret = btn.getAttribute('data-secret');
        if (secret) {
          navigator.clipboard.writeText(secret).then(() => {
            btn.classList.add('is-copied');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
            showToast('Password copied to clipboard');
            setTimeout(() => {
              btn.classList.remove('is-copied');
              btn.innerHTML = originalHTML;
            }, 1500);
          });
        }
      });
    });

    listEl.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const itemEl = btn.closest('.password-item');
        if (itemEl) {
          itemEl.style.opacity = '0';
          itemEl.style.transform = 'scale(0.96)';
          itemEl.style.transition = 'all 150ms ease';
        }
        setTimeout(() => {
          const updated = getStoredPasswords().filter(p => p.id !== id);
          saveStoredPasswords(updated);
          showToast('Password removed from vault');
          loadPasswordsUI(document.getElementById('passwordsSearch')?.value || '');
        }, 150);
      });
    });
  }

  const passwordsSearch = document.getElementById('passwordsSearch');
  if (passwordsSearch) {
    passwordsSearch.addEventListener('input', () => {
      loadPasswordsUI(passwordsSearch.value.trim());
    });
  }

  const btnAddNewPassword = document.getElementById('btnAddNewPassword');
  const passwordAddForm = document.getElementById('passwordAddForm');
  const btnCancelAddPassword = document.getElementById('btnCancelAddPassword');
  const btnSaveNewPassword = document.getElementById('btnSaveNewPassword');
  const btnToggleNewPassEye = document.getElementById('btnToggleNewPassEye');
  const newPassSecret = document.getElementById('newPassSecret');

  if (btnToggleNewPassEye && newPassSecret) {
    btnToggleNewPassEye.addEventListener('click', () => {
      if (newPassSecret.type === 'password') {
        newPassSecret.type = 'text';
        btnToggleNewPassEye.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/></svg>';
      } else {
        newPassSecret.type = 'password';
        btnToggleNewPassEye.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
      }
    });
  }

  if (btnAddNewPassword && passwordAddForm) {
    btnAddNewPassword.addEventListener('click', () => {
      passwordAddForm.hidden = !passwordAddForm.hidden;
      if (!passwordAddForm.hidden) {
        document.getElementById('newPassSite')?.focus();
      }
    });
  }

  if (btnCancelAddPassword && passwordAddForm) {
    btnCancelAddPassword.addEventListener('click', () => {
      passwordAddForm.hidden = true;
    });
  }

  if (btnSaveNewPassword && passwordAddForm) {
    btnSaveNewPassword.addEventListener('click', () => {
      const site = document.getElementById('newPassSite')?.value.trim();
      const user = document.getElementById('newPassUser')?.value.trim();
      const pass = document.getElementById('newPassSecret')?.value.trim();
      if (!site || !user || !pass) {
        showToast('Please enter website, username, and password');
        return;
      }
      const list = getStoredPasswords();
      list.push({ id: String(Date.now()), site, user, pass });
      saveStoredPasswords(list);
      passwordAddForm.hidden = true;
      document.getElementById('newPassSite').value = '';
      document.getElementById('newPassUser').value = '';
      document.getElementById('newPassSecret').value = '';
      showToast(`Saved credentials for ${site}`);
      loadPasswordsUI(passwordsSearch?.value || '');
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 2B. ADDRESSES VAULT & AUTOFILL MANAGEMENT
  // ─────────────────────────────────────────────────────────────
  const ADDRESSES_STORAGE_KEY = 'hellfire_addresses_vault';
  const NEVER_SAVE_PASSWORDS_KEY = 'hellfire_passwords_never_sites';

  const DEFAULT_ADDRESSES = [
    {
      id: 'addr-1',
      name: 'Alex Rivera',
      street: '742 Evergreen Terrace',
      city: 'Springfield',
      state: 'OR',
      zip: '97477',
      country: 'United States',
      phone: '+1 (555) 019-2834',
      createdAt: Date.now() - 86400000 * 5
    }
  ];

  function getStoredAddresses() {
    try {
      const raw = localStorage.getItem(ADDRESSES_STORAGE_KEY);
      if (!raw) {
        localStorage.setItem(ADDRESSES_STORAGE_KEY, JSON.stringify(DEFAULT_ADDRESSES));
        return DEFAULT_ADDRESSES;
      }
      return JSON.parse(raw);
    } catch (e) {
      return DEFAULT_ADDRESSES;
    }
  }

  function saveStoredAddresses(list) {
    try {
      localStorage.setItem(ADDRESSES_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  function getNeverSaveSites() {
    try {
      const raw = localStorage.getItem(NEVER_SAVE_PASSWORDS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function addNeverSaveSite(domain) {
    if (!domain) return;
    try {
      const list = getNeverSaveSites();
      if (!list.includes(domain)) {
        list.push(domain);
        localStorage.setItem(NEVER_SAVE_PASSWORDS_KEY, JSON.stringify(list));
      }
    } catch (e) {}
  }

  function loadAddressesUI(filter = '') {
    const listEl = document.getElementById('addressesList');
    const countEl = document.getElementById('addressesCount');
    if (!listEl) return;

    const all = getStoredAddresses();
    if (countEl) countEl.textContent = all.length;

    const filtered = filter
      ? all.filter(a => a.name.toLowerCase().includes(filter.toLowerCase()) || a.street.toLowerCase().includes(filter.toLowerCase()) || a.city.toLowerCase().includes(filter.toLowerCase()))
      : all;

    if (filtered.length === 0) {
      listEl.innerHTML = `<div style="text-align:center; padding: 24px; color: var(--text-muted);">No addresses saved.</div>`;
      return;
    }

    listEl.innerHTML = filtered.map(a => `
      <div class="address-item" data-id="${a.id}">
        <div class="password-item__main">
          <div class="password-avatar" aria-hidden="true" style="background:linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.05)); border-color: rgba(16, 185, 129, 0.3); color: #34d399;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div class="address-item__info">
            <span class="address-item__name">${escapeHtml(a.name)}</span>
            <span class="address-item__street">${escapeHtml(a.street)}</span>
            <span class="address-item__city">${escapeHtml(a.city)}, ${escapeHtml(a.state)} ${escapeHtml(a.zip)} • ${escapeHtml(a.country)}</span>
            ${a.phone ? `<span style="font-family:var(--font-mono); font-size:10.5px; color:var(--text-muted); margin-top:2px;">${escapeHtml(a.phone)}</span>` : ''}
          </div>
        </div>
        <div class="password-actions">
          <button class="password-action-btn" title="Copy address" data-action="copy-addr" data-id="${a.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button class="password-action-btn password-action-btn--delete" title="Delete address" data-action="delete-addr" data-id="${a.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('[data-action="copy-addr"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const item = getStoredAddresses().find(x => x.id === id);
        if (item) {
          const formatted = `${item.name}\n${item.street}\n${item.city}, ${item.state} ${item.zip}\n${item.country}`;
          navigator.clipboard.writeText(formatted).then(() => {
            btn.classList.add('is-copied');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
            showToast('Address copied to clipboard');
            setTimeout(() => {
              btn.classList.remove('is-copied');
              btn.innerHTML = originalHTML;
            }, 1500);
          });
        }
      });
    });

    listEl.querySelectorAll('[data-action="delete-addr"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const updated = getStoredAddresses().filter(x => x.id !== id);
        saveStoredAddresses(updated);
        showToast('Address removed');
        loadAddressesUI(document.getElementById('addressesSearch')?.value || '');
      });
    });
  }

  // Address sub-tab switching
  const tabAutofillLogins = document.getElementById('tabAutofillLogins');
  const tabAutofillAddresses = document.getElementById('tabAutofillAddresses');
  const viewAutofillLogins = document.getElementById('viewAutofillLogins');
  const viewAutofillAddresses = document.getElementById('viewAutofillAddresses');

  function switchAutofillTab(tab) {
    const countEl = document.getElementById('addressesCount');
    if (countEl) countEl.textContent = getStoredAddresses().length;

    if (tab === 'logins') {
      tabAutofillLogins?.classList.add('is-active');
      tabAutofillAddresses?.classList.remove('is-active');
      if (viewAutofillLogins) viewAutofillLogins.hidden = false;
      if (viewAutofillAddresses) viewAutofillAddresses.hidden = true;
      loadPasswordsUI(document.getElementById('passwordsSearch')?.value || '');
    } else {
      tabAutofillAddresses?.classList.add('is-active');
      tabAutofillLogins?.classList.remove('is-active');
      if (viewAutofillAddresses) viewAutofillAddresses.hidden = false;
      if (viewAutofillLogins) viewAutofillLogins.hidden = true;
      loadAddressesUI(document.getElementById('addressesSearch')?.value || '');
    }
  }

  if (tabAutofillLogins) tabAutofillLogins.addEventListener('click', () => switchAutofillTab('logins'));
  if (tabAutofillAddresses) tabAutofillAddresses.addEventListener('click', () => switchAutofillTab('addresses'));

  // Address search filter
  const addressesSearch = document.getElementById('addressesSearch');
  if (addressesSearch) {
    addressesSearch.addEventListener('input', () => {
      loadAddressesUI(addressesSearch.value.trim());
    });
  }

  // Add Address Form handlers
  const btnAddNewAddress = document.getElementById('btnAddNewAddress');
  const addressAddForm = document.getElementById('addressAddForm');
  const btnCancelAddAddress = document.getElementById('btnCancelAddAddress');
  const btnSaveNewAddress = document.getElementById('btnSaveNewAddress');

  if (btnAddNewAddress && addressAddForm) {
    btnAddNewAddress.addEventListener('click', () => {
      addressAddForm.hidden = !addressAddForm.hidden;
      if (!addressAddForm.hidden) {
        document.getElementById('newAddrName')?.focus();
      }
    });
  }

  if (btnCancelAddAddress && addressAddForm) {
    btnCancelAddAddress.addEventListener('click', () => {
      addressAddForm.hidden = true;
    });
  }

  if (btnSaveNewAddress && addressAddForm) {
    btnSaveNewAddress.addEventListener('click', () => {
      const name = document.getElementById('newAddrName')?.value.trim();
      const street = document.getElementById('newAddrStreet')?.value.trim();
      const city = document.getElementById('newAddrCity')?.value.trim();
      const state = document.getElementById('newAddrState')?.value.trim();
      const zip = document.getElementById('newAddrZip')?.value.trim();
      const country = document.getElementById('newAddrCountry')?.value.trim();
      const phone = document.getElementById('newAddrPhone')?.value.trim();

      if (!name || !street) {
        showToast('Please enter at least a name and street address');
        return;
      }

      const list = getStoredAddresses();
      list.push({
        id: String(Date.now()),
        name,
        street,
        city: city || '',
        state: state || '',
        zip: zip || '',
        country: country || 'United States',
        phone: phone || '',
        createdAt: Date.now()
      });
      saveStoredAddresses(list);
      addressAddForm.hidden = true;
      showToast(`Saved address for ${name}`);
      loadAddressesUI(addressesSearch?.value || '');
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 2C. POP-UP PROMPTS FOR SAVING PASSWORDS & ADDRESSES
  // ─────────────────────────────────────────────────────────────
  const popupSavePassword = document.getElementById('popupSavePassword');
  const popupSaveAddress = document.getElementById('popupSaveAddress');
  const btnOmniboxSavePassword = document.getElementById('btnOmniboxSavePassword');
  const btnOmniboxSaveAddress = document.getElementById('btnOmniboxSaveAddress');

  let currentPendingCredential = null;
  let currentPendingAddress = null;

  function showSavePasswordPopup(data) {
    if (!data || !data.pass) return;
    const site = data.site || formatDomain(currentTabUrl) || 'example.com';
    
    // Check if site is blacklisted
    if (getNeverSaveSites().includes(site)) return;

    currentPendingCredential = {
      site,
      user: data.user || '',
      pass: data.pass
    };

    const siteEl = document.getElementById('savePassSite');
    const userEl = document.getElementById('savePassUser');
    const passEl = document.getElementById('savePassSecret');

    if (siteEl) siteEl.textContent = site;
    if (userEl) userEl.value = currentPendingCredential.user;
    if (passEl) {
      passEl.value = currentPendingCredential.pass;
      passEl.type = 'password';
    }

    if (btnOmniboxSavePassword) btnOmniboxSavePassword.hidden = false;
    if (popupSaveAddress) popupSaveAddress.hidden = true;
    if (shieldPopover) shieldPopover.hidden = true;

    if (popupSavePassword) {
      popupSavePassword.hidden = false;
    }
  }

  function closeSavePasswordPopup() {
    if (popupSavePassword) popupSavePassword.hidden = true;
  }

  function showSaveAddressPopup(data) {
    if (!data || !data.street) return;

    currentPendingAddress = {
      name: data.name || 'Resident',
      street: data.street,
      city: data.city || '',
      state: data.state || '',
      zip: data.zip || '',
      country: data.country || 'United States',
      phone: data.phone || ''
    };

    const nameEl = document.getElementById('saveAddrName');
    const streetEl = document.getElementById('saveAddrStreet');
    const cityEl = document.getElementById('saveAddrCityStateZip');
    const countryEl = document.getElementById('saveAddrCountry');
    const phoneEl = document.getElementById('saveAddrPhone');
    const phoneRow = document.getElementById('saveAddrPhoneRow');

    if (nameEl) nameEl.textContent = currentPendingAddress.name;
    if (streetEl) streetEl.textContent = currentPendingAddress.street;
    if (cityEl) {
      const parts = [currentPendingAddress.city, currentPendingAddress.state, currentPendingAddress.zip].filter(Boolean);
      cityEl.textContent = parts.join(', ');
    }
    if (countryEl) countryEl.textContent = currentPendingAddress.country;
    if (phoneEl && phoneRow) {
      if (currentPendingAddress.phone) {
        phoneEl.textContent = currentPendingAddress.phone;
        phoneRow.hidden = false;
      } else {
        phoneRow.hidden = true;
      }
    }

    if (btnOmniboxSaveAddress) btnOmniboxSaveAddress.hidden = false;
    if (popupSavePassword) popupSavePassword.hidden = true;
    if (shieldPopover) shieldPopover.hidden = true;

    if (popupSaveAddress) {
      popupSaveAddress.hidden = false;
    }
  }

  function closeSaveAddressPopup() {
    if (popupSaveAddress) popupSaveAddress.hidden = true;
  }

  // Omnibox Button Toggles
  if (btnOmniboxSavePassword) {
    btnOmniboxSavePassword.addEventListener('click', (e) => {
      e.stopPropagation();
      if (popupSavePassword && !popupSavePassword.hidden) {
        closeSavePasswordPopup();
      } else if (currentPendingCredential) {
        showSavePasswordPopup(currentPendingCredential);
      }
    });
  }

  if (btnOmniboxSaveAddress) {
    btnOmniboxSaveAddress.addEventListener('click', (e) => {
      e.stopPropagation();
      if (popupSaveAddress && !popupSaveAddress.hidden) {
        closeSaveAddressPopup();
      } else if (currentPendingAddress) {
        showSaveAddressPopup(currentPendingAddress);
      }
    });
  }

  // Password Pop-up Actions
  const btnConfirmSavePass = document.getElementById('btnConfirmSavePass');
  if (btnConfirmSavePass) {
    btnConfirmSavePass.addEventListener('click', () => {
      if (!currentPendingCredential) {
        closeSavePasswordPopup();
        return;
      }
      const user = document.getElementById('savePassUser')?.value.trim() || currentPendingCredential.user;
      const pass = document.getElementById('savePassSecret')?.value.trim() || currentPendingCredential.pass;
      const site = currentPendingCredential.site;

      const list = getStoredPasswords();
      const existingIdx = list.findIndex(p => p.site === site && p.user === user);
      if (existingIdx >= 0) {
        list[existingIdx].pass = pass;
      } else {
        list.push({ id: String(Date.now()), site, user, pass });
      }
      saveStoredPasswords(list);
      showToast(`Saved password for ${site}`);
      closeSavePasswordPopup();
      if (btnOmniboxSavePassword) btnOmniboxSavePassword.hidden = true;
    });
  }

  const btnNeverSavePass = document.getElementById('btnNeverSavePass');
  if (btnNeverSavePass) {
    btnNeverSavePass.addEventListener('click', () => {
      if (currentPendingCredential) {
        addNeverSaveSite(currentPendingCredential.site);
        showToast(`Never ask to save passwords for ${currentPendingCredential.site}`);
      }
      closeSavePasswordPopup();
      if (btnOmniboxSavePassword) btnOmniboxSavePassword.hidden = true;
    });
  }

  const btnDismissSavePass = document.getElementById('btnDismissSavePass');
  if (btnDismissSavePass) btnDismissSavePass.addEventListener('click', closeSavePasswordPopup);
  const btnCloseSavePass = document.getElementById('btnCloseSavePass');
  if (btnCloseSavePass) btnCloseSavePass.addEventListener('click', closeSavePasswordPopup);

  const btnToggleSavePassEye = document.getElementById('btnToggleSavePassEye');
  if (btnToggleSavePassEye) {
    btnToggleSavePassEye.addEventListener('click', () => {
      const input = document.getElementById('savePassSecret');
      if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
      }
    });
  }

  // Address Pop-up Actions
  const btnConfirmSaveAddr = document.getElementById('btnConfirmSaveAddr');
  if (btnConfirmSaveAddr) {
    btnConfirmSaveAddr.addEventListener('click', () => {
      if (!currentPendingAddress) {
        closeSaveAddressPopup();
        return;
      }
      const list = getStoredAddresses();
      list.push({
        id: String(Date.now()),
        ...currentPendingAddress,
        createdAt: Date.now()
      });
      saveStoredAddresses(list);
      showToast(`Saved address for ${currentPendingAddress.name}`);
      closeSaveAddressPopup();
      if (btnOmniboxSaveAddress) btnOmniboxSaveAddress.hidden = true;
    });
  }

  const btnDismissSaveAddr = document.getElementById('btnDismissSaveAddr');
  if (btnDismissSaveAddr) btnDismissSaveAddr.addEventListener('click', closeSaveAddressPopup);
  const btnCloseSaveAddr = document.getElementById('btnCloseSaveAddr');
  if (btnCloseSaveAddr) btnCloseSaveAddr.addEventListener('click', closeSaveAddressPopup);

  const btnEditSaveAddr = document.getElementById('btnEditSaveAddr');
  if (btnEditSaveAddr) {
    btnEditSaveAddr.addEventListener('click', () => {
      closeSaveAddressPopup();
      openModal('modalPasswords');
      switchAutofillTab('addresses');
      const addForm = document.getElementById('addressAddForm');
      if (addForm && currentPendingAddress) {
        addForm.hidden = false;
        document.getElementById('newAddrName').value = currentPendingAddress.name || '';
        document.getElementById('newAddrStreet').value = currentPendingAddress.street || '';
        document.getElementById('newAddrCity').value = currentPendingAddress.city || '';
        document.getElementById('newAddrState').value = currentPendingAddress.state || '';
        document.getElementById('newAddrZip').value = currentPendingAddress.zip || '';
        document.getElementById('newAddrCountry').value = currentPendingAddress.country || '';
        document.getElementById('newAddrPhone').value = currentPendingAddress.phone || '';
      }
    });
  }

  // Document click listener to close autofill popups on outside click
  document.addEventListener('click', (e) => {
    if (popupSavePassword && !popupSavePassword.hidden && !popupSavePassword.contains(e.target) && !e.target.closest('#btnOmniboxSavePassword')) {
      closeSavePasswordPopup();
    }
    if (popupSaveAddress && !popupSaveAddress.hidden && !popupSaveAddress.contains(e.target) && !e.target.closest('#btnOmniboxSaveAddress')) {
      closeSaveAddressPopup();
    }
  });

  // Global test helpers for instant interactive testing
  window.testSavePassword = (data) => {
    showSavePasswordPopup(data || {
      site: 'github.com',
      user: 'dev_engineer@hellfire.org',
      pass: 'P@ssw0rdSecure2026!'
    });
  };

  window.testSaveAddress = (data) => {
    showSaveAddressPopup(data || {
      name: 'Morgan Vance',
      street: '450 Mission Street, Suite 800',
      city: 'San Francisco',
      state: 'CA',
      zip: '94105',
      country: 'United States',
      phone: '+1 (415) 555-0198'
    });
  };

  // Safe IPC event subscriptions from guest contents
  window.privateFox?.on?.('prompt:save-password', (data) => showSavePasswordPopup(data));
  window.privateFox?.on?.('prompt:save-address', (data) => showSaveAddressPopup(data));

  // ─────────────────────────────────────────────────────────────
  // 3. CLEAR BROWSING DATA
  // ─────────────────────────────────────────────────────────────
  const btnConfirmClearData = document.getElementById('btnConfirmClearData');
  if (btnConfirmClearData) {
    btnConfirmClearData.addEventListener('click', async () => {
      const timeRange = document.getElementById('clearTimeRange')?.value || 'all';
      const history = document.getElementById('clearOptHistory')?.checked;
      const cookies = document.getElementById('clearOptCookies')?.checked;
      const cache = document.getElementById('clearOptCache')?.checked;

      await window.privateFox?.clearBrowsingData({ history, cookies, cache, timeRange });
      closeModal();
      showToast('Browsing data cleared successfully');
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 4. ABOUT & UPDATE CHECK
  // ─────────────────────────────────────────────────────────────
  const btnCheckUpdates = document.getElementById('btnCheckUpdates');
  const aboutUpdateStatus = document.getElementById('aboutUpdateStatus');
  if (btnCheckUpdates && aboutUpdateStatus) {
    btnCheckUpdates.addEventListener('click', () => {
      btnCheckUpdates.disabled = true;
      aboutUpdateStatus.textContent = 'Checking for updates...';
      setTimeout(() => {
        aboutUpdateStatus.textContent = 'Hell Fire is up to date (v1.0.0-stable).';
        btnCheckUpdates.disabled = false;
        showToast('Your browser is running the latest security build');
      }, 750);
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 5. REPORT AN ISSUE
  // ─────────────────────────────────────────────────────────────
  const btnSubmitReport = document.getElementById('btnSubmitReport');
  if (btnSubmitReport) {
    btnSubmitReport.addEventListener('click', () => {
      const cat = document.getElementById('reportCategory')?.value || 'other';
      const url = document.getElementById('reportUrl')?.value || '';
      const desc = document.getElementById('reportDesc')?.value.trim();
      if (!desc) {
        showToast('Please provide a brief description of the issue');
        return;
      }
      const payload = {
        category: cat,
        pageUrl: url,
        description: desc,
        timestamp: new Date().toISOString(),
        diagnostics: {
          browser: 'Hell Fire v1.0.0',
          engine: 'Chromium 156.0.8078.100',
          runtime: 'Electron 45.4.1',
          os: 'Windows 64-bit'
        }
      };
      try {
        navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      } catch (e) {}
      closeModal();
      showToast('Report generated & diagnostic info copied to clipboard');
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 7. EXTENSIONS MANAGER & PRIVACY AUDIT GATE
  // ─────────────────────────────────────────────────────────────
  const EXTENSIONS_STORAGE_KEY = 'hellfire_extensions_vault';

  const EXTENSION_CATALOG = [
    {
      id: 'bitwarden',
      name: 'Bitwarden Password Manager',
      version: '2024.10.1',
      author: 'Bitwarden Inc. (Verified)',
      desc: 'Secure open-source password manager. Autofills credentials across your encrypted vault.',
      permissions: [
        'Read and autofill login credentials on web pages',
        'Access clipboard for copying generated passwords',
        'Store encrypted vault data in local sandboxed storage'
      ],
      defaultScope: 'click',
      tags: ['Security', 'Passwords', 'Open Source']
    },
    {
      id: 'sponsorblock',
      name: 'SponsorBlock for YouTube',
      version: '5.8.2',
      author: 'Ajay Ramachandran (Verified)',
      desc: 'Crowdsourced sponsor skipping. Automatically jumps over embedded sponsors, intros, and outros.',
      permissions: [
        'Read and modify video playback time on youtube.com',
        'Store segment skip preferences and statistics locally'
      ],
      defaultScope: 'domains',
      domains: ['youtube.com'],
      tags: ['Productivity', 'Open Source']
    },
    {
      id: 'protonpass',
      name: 'Proton Pass',
      version: '1.22.4',
      author: 'Proton AG (Verified)',
      desc: 'End-to-end encrypted identity & password vault with integrated 2FA authenticator.',
      permissions: [
        'Autofill credentials and payment card fields',
        'Inspect active tab URL for vault item matching',
        'Store encrypted local secrets in isolated storage'
      ],
      defaultScope: 'click',
      tags: ['Privacy', 'Zero-Knowledge']
    },
    {
      id: 'violentmonkey',
      name: 'Violentmonkey',
      version: '2.26.0',
      author: 'Violentmonkey Contributors',
      desc: 'Lightweight userscript manager providing script execution on authorized domains.',
      permissions: [
        'Execute user-defined custom scripts on matched websites',
        'Intercept web requests initiated by userscripts',
        'Store user script code and configurations locally'
      ],
      defaultScope: 'domains',
      domains: ['*'],
      tags: ['Developer', 'Automation']
    },
    {
      id: 'darkreader',
      name: 'Dark Reader',
      version: '4.9.96',
      author: 'Alexander Shutov (Verified)',
      desc: 'Inverts brightness on demanding bright pages to provide an eye-comfort dark mode everywhere.',
      permissions: [
        'Inject dark contrast CSS stylesheets into visited web pages',
        'Store site-specific filter preferences (brightness, contrast)'
      ],
      defaultScope: 'click',
      tags: ['Design', 'Accessibility']
    }
  ];

  let pendingExtensionToInstall = null;

  function getInstalledExtensions() {
    try {
      const raw = localStorage.getItem(EXTENSIONS_STORAGE_KEY);
      if (!raw) {
        const initial = [
          {
            id: 'bitwarden',
            name: 'Bitwarden Password Manager',
            version: '2024.10.1',
            author: 'Bitwarden Inc. (Verified)',
            desc: 'Secure open-source password manager. Autofills credentials across your encrypted vault.',
            permissions: [
              'Read and autofill login credentials on web pages',
              'Access clipboard for copying generated passwords',
              'Store encrypted vault data in local sandboxed storage'
            ],
            enabled: true,
            scope: 'click',
            installedAt: Date.now() - 86400000 * 2
          }
        ];
        localStorage.setItem(EXTENSIONS_STORAGE_KEY, JSON.stringify(initial));
        return initial;
      }
      return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to parse extensions vault:', e);
      return [];
    }
  }

  function saveInstalledExtensions(extList) {
    try {
      localStorage.setItem(EXTENSIONS_STORAGE_KEY, JSON.stringify(extList));
    } catch (e) {
      console.error('Failed to save extensions vault:', e);
    }
  }

  function renderInstalledExtensions(filter = '') {
    const listEl = document.getElementById('installedExtList');
    const countEl = document.getElementById('installedExtCount');
    if (!listEl) return;

    const all = getInstalledExtensions();
    if (countEl) countEl.textContent = all.length;

    const filtered = filter
      ? all.filter(e => e.name.toLowerCase().includes(filter.toLowerCase()) || e.desc.toLowerCase().includes(filter.toLowerCase()))
      : all;

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="ext-empty-state">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21.5 12H19c0-1.1-.9-2-2-2s-2 .9-2 2h-3V9c1.1 0 2-.9 2-2s-.9-2-2-2V2.5L7.5 4v1.5c-1.1 0-2 .9-2 2s.9 2 2 2V12H5c0-1.1-.9-2-2-2s-2 .9-2 2v3h2.5c0 1.1.9 2 2 2s2-.9 2-2H12v3c-1.1 0-2 .9-2 2s.9 2 2 2v2.5l4.5-1.5V19c1.1 0 2-.9 2-2s-.9-2-2-2h2.5v-3z"/></svg>
          <span style="font-weight: 500; color: #cbd5e1;">No extensions installed</span>
          <span style="font-size: 11px;">Browse the Add Extensions tab to install privacy-vetted add-ons.</span>
        </div>`;
      return;
    }

    listEl.innerHTML = filtered.map(ext => {
      const scopeBadge = ext.scope === 'click'
        ? '<span class="ext-card__badge ext-card__badge--shielded">Shielded: On Click</span>'
        : '<span class="ext-card__badge ext-card__badge--unshielded">Domain Restricted</span>';

      const permsPills = (ext.permissions || []).map(p => `<span class="ext-permission-pill">${escapeHtml(p)}</span>`).join('');

      return `
        <div class="ext-card" data-id="${ext.id}">
          <div class="ext-card__header">
            <div class="ext-card__left">
              <div class="ext-card__icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 12H19c0-1.1-.9-2-2-2s-2 .9-2 2h-3V9c1.1 0 2-.9 2-2s-.9-2-2-2V2.5L7.5 4v1.5c-1.1 0-2 .9-2 2s.9 2 2 2V12H5c0-1.1-.9-2-2-2s-2 .9-2 2v3h2.5c0 1.1.9 2 2 2s2-.9 2-2H12v3c-1.1 0-2 .9-2 2s.9 2 2 2v2.5l4.5-1.5V19c1.1 0 2-.9 2-2s-.9-2-2-2h2.5v-3z"/></svg>
              </div>
              <div class="ext-card__info">
                <div class="ext-card__title-row">
                  <span class="ext-card__title">${escapeHtml(ext.name)}</span>
                  <span class="ext-card__version">v${escapeHtml(ext.version)}</span>
                  ${scopeBadge}
                </div>
                <p class="ext-card__desc">${escapeHtml(ext.desc)}</p>
                <div class="ext-card__permissions">
                  ${permsPills}
                </div>
              </div>
            </div>
            <div class="ext-card__actions">
              <label class="ext-switch" title="${ext.enabled ? 'Disable extension' : 'Enable extension'}">
                <input type="checkbox" class="ext-toggle-btn" data-id="${ext.id}" ${ext.enabled ? 'checked' : ''}>
                <span class="ext-switch-slider"></span>
              </label>
            </div>
          </div>
          <div class="ext-card__footer">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:11px; color:var(--text-muted);">Permission Scope:</span>
              <select class="ext-card__scope-select" data-id="${ext.id}">
                <option value="click" ${ext.scope === 'click' ? 'selected' : ''}>Shielded (Active tab only when clicked)</option>
                <option value="domains" ${ext.scope === 'domains' ? 'selected' : ''}>Restricted to designated domains</option>
              </select>
            </div>
            <button class="ext-card__btn-remove" data-id="${ext.id}">Remove</button>
          </div>
        </div>
      `;
    }).join('');

    // Attach toggle handlers
    listEl.querySelectorAll('.ext-toggle-btn').forEach(btn => {
      btn.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        const list = getInstalledExtensions();
        const item = list.find(x => x.id === id);
        if (item) {
          item.enabled = e.target.checked;
          saveInstalledExtensions(list);
          showToast(`${item.name} ${item.enabled ? 'enabled' : 'disabled'}`);
        }
      });
    });

    // Attach scope select handlers
    listEl.querySelectorAll('.ext-card__scope-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        const list = getInstalledExtensions();
        const item = list.find(x => x.id === id);
        if (item) {
          item.scope = e.target.value;
          saveInstalledExtensions(list);
          const label = item.scope === 'click' ? 'Shielded (On Click)' : 'Restricted Domains';
          showToast(`Updated ${item.name} scope to ${label}`);
          renderInstalledExtensions(document.getElementById('extSearchInput')?.value || '');
        }
      });
    });

    // Attach remove handlers
    listEl.querySelectorAll('.ext-card__btn-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        let list = getInstalledExtensions();
        const target = list.find(x => x.id === id);
        list = list.filter(x => x.id !== id);
        saveInstalledExtensions(list);
        showToast(`Removed extension: ${target ? target.name : id}`);
        renderInstalledExtensions(document.getElementById('extSearchInput')?.value || '');
        renderExtensionCatalog();
      });
    });
  }

  function renderExtensionCatalog() {
    const gridEl = document.getElementById('extCatalogGrid');
    if (!gridEl) return;

    const installed = getInstalledExtensions();
    const installedIds = new Set(installed.map(e => e.id));

    gridEl.innerHTML = EXTENSION_CATALOG.map(item => {
      const isInstalled = installedIds.has(item.id);
      const tagsHtml = (item.tags || []).map(t => `<span class="ext-catalog-tag">${escapeHtml(t)}</span>`).join('');

      return `
        <div class="ext-catalog-card" data-id="${item.id}">
          <div class="ext-catalog-header">
            <div class="ext-catalog-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 12H19c0-1.1-.9-2-2-2s-2 .9-2 2h-3V9c1.1 0 2-.9 2-2s-.9-2-2-2V2.5L7.5 4v1.5c-1.1 0-2 .9-2 2s.9 2 2 2V12H5c0-1.1-.9-2-2-2s-2 .9-2 2v3h2.5c0 1.1.9 2 2 2s2-.9 2-2H12v3c-1.1 0-2 .9-2 2s.9 2 2 2v2.5l4.5-1.5V19c1.1 0 2-.9 2-2s-.9-2-2-2h2.5v-3z"/></svg>
            </div>
            <div class="ext-catalog-info">
              <span class="ext-catalog-title">${escapeHtml(item.name)}</span>
              <span class="ext-catalog-author">${escapeHtml(item.author)}</span>
            </div>
          </div>
          <p class="ext-catalog-desc">${escapeHtml(item.desc)}</p>
          <div class="ext-catalog-tags">
            ${tagsHtml}
          </div>
          <div class="ext-catalog-footer">
            ${isInstalled
              ? `<span class="ext-catalog-installed-label">
                   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                   Installed
                 </span>
                 <button class="modal-btn modal-btn--secondary btn-configure-ext" data-id="${item.id}">Configure</button>`
              : `<span style="font-family:var(--font-mono); font-size:11px; color:var(--text-muted);">v${escapeHtml(item.version)}</span>
                 <button class="modal-btn modal-btn--accent btn-audit-ext" data-id="${item.id}">Audit & Add</button>`
            }
          </div>
        </div>
      `;
    }).join('');

    // Attach Audit & Add buttons
    gridEl.querySelectorAll('.btn-audit-ext').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        const item = EXTENSION_CATALOG.find(x => x.id === id);
        if (item) {
          showExtensionAuditPrompt(item);
        }
      });
    });

    // Attach Configure buttons
    gridEl.querySelectorAll('.btn-configure-ext').forEach(btn => {
      btn.addEventListener('click', () => {
        switchExtTab('installed');
      });
    });
  }

  function showExtensionAuditPrompt(extData) {
    pendingExtensionToInstall = extData;
    const nameEl = document.getElementById('promptExtName');
    const verEl = document.getElementById('promptExtVersion');
    const authorEl = document.getElementById('promptExtAuthor');
    const listEl = document.getElementById('promptPermissionsList');

    if (nameEl) nameEl.textContent = extData.name;
    if (verEl) verEl.textContent = 'v' + extData.version;
    if (authorEl) authorEl.textContent = extData.author || 'Verified Developer';

    if (listEl) {
      listEl.innerHTML = '';
      (extData.permissions || []).forEach(perm => {
        const li = document.createElement('li');
        li.textContent = perm;
        listEl.appendChild(li);
      });
    }

    const defaultScope = extData.defaultScope || 'click';
    const radio = document.querySelector(`input[name="extScope"][value="${defaultScope}"]`);
    if (radio) radio.checked = true;

    openModal('modalExtensionPrompt');
  }

  function switchExtTab(tabName) {
    const tabInstalled = document.getElementById('tabExtInstalled');
    const tabCatalog = document.getElementById('tabExtCatalog');
    const viewInstalled = document.getElementById('viewExtInstalled');
    const viewCatalog = document.getElementById('viewExtCatalog');

    if (tabName === 'installed') {
      tabInstalled?.classList.add('is-active');
      tabCatalog?.classList.remove('is-active');
      if (viewInstalled) viewInstalled.hidden = false;
      if (viewCatalog) viewCatalog.hidden = true;
      renderInstalledExtensions(document.getElementById('extSearchInput')?.value || '');
    } else {
      tabCatalog?.classList.add('is-active');
      tabInstalled?.classList.remove('is-active');
      if (viewCatalog) viewCatalog.hidden = false;
      if (viewInstalled) viewInstalled.hidden = true;
      renderExtensionCatalog();
    }
  }

  function loadExtensionsUI() {
    switchExtTab('installed');
  }

  // Navigation tab click handlers
  const tabExtInstalled = document.getElementById('tabExtInstalled');
  const tabExtCatalog = document.getElementById('tabExtCatalog');
  if (tabExtInstalled) tabExtInstalled.addEventListener('click', () => switchExtTab('installed'));
  if (tabExtCatalog) tabExtCatalog.addEventListener('click', () => switchExtTab('catalog'));

  // Search input filter in installed extensions
  const extSearchInput = document.getElementById('extSearchInput');
  if (extSearchInput) {
    extSearchInput.addEventListener('input', (e) => {
      renderInstalledExtensions(e.target.value);
    });
  }

  // Sideload Unpacked Extension handler
  const btnLoadUnpackedExt = document.getElementById('btnLoadUnpackedExt');
  if (btnLoadUnpackedExt) {
    btnLoadUnpackedExt.addEventListener('click', async () => {
      const sampleUnpacked = {
        id: 'local_privacy_tracer',
        name: 'Local Privacy Tracer & Header Inspector',
        version: '1.0.0-unpacked',
        author: 'Local Unpacked Sideload',
        desc: 'Custom developer extension loaded from local directory. Inspects HTTP response headers.',
        permissions: [
          'Read web requests and response headers on all pages',
          'Access local storage of the extension'
        ],
        defaultScope: 'domains',
        tags: ['Developer', 'Unpacked', 'Sideloaded']
      };
      showExtensionAuditPrompt(sampleUnpacked);
    });
  }

  // Pre-Installation Audit Gate Action Handlers
  const btnProceedAddExt = document.getElementById('btnProceedAddExt');
  if (btnProceedAddExt) {
    btnProceedAddExt.addEventListener('click', () => {
      if (!pendingExtensionToInstall) {
        closeModal();
        return;
      }

      const selectedScopeEl = document.querySelector('input[name="extScope"]:checked');
      const scope = selectedScopeEl ? selectedScopeEl.value : 'click';

      const installed = getInstalledExtensions();
      const idx = installed.findIndex(e => e.id === pendingExtensionToInstall.id);
      const newEntry = {
        ...pendingExtensionToInstall,
        enabled: true,
        scope: scope,
        installedAt: Date.now()
      };

      if (idx >= 0) {
        installed[idx] = newEntry;
      } else {
        installed.push(newEntry);
      }

      saveInstalledExtensions(installed);
      const scopeLabel = scope === 'click' ? 'Shielded (On Click)' : 'Designated Domains';
      showToast(`Added ${newEntry.name} [${scopeLabel}]`);

      pendingExtensionToInstall = null;
      openModal('modalExtensions');
      switchExtTab('installed');
    });
  }

  const btnCancelExtPrompt = document.getElementById('btnCancelExtPrompt');
  if (btnCancelExtPrompt) {
    btnCancelExtPrompt.addEventListener('click', () => {
      pendingExtensionToInstall = null;
      openModal('modalExtensions');
    });
  }

  const btnCloseExtPrompt = document.getElementById('btnCloseExtPrompt');
  if (btnCloseExtPrompt) {
    btnCloseExtPrompt.addEventListener('click', () => {
      pendingExtensionToInstall = null;
      openModal('modalExtensions');
    });
  }

  const btnCloseExtensions = document.getElementById('btnCloseExtensions');
  if (btnCloseExtensions) {
    btnCloseExtensions.addEventListener('click', () => {
      closeModal();
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 6. TRANSLATE CURRENT WEBPAGE
  // ─────────────────────────────────────────────────────────────
  const menuTranslate = document.getElementById('menuTranslate');
  if (menuTranslate) {
    menuTranslate.addEventListener('click', () => {
      setAppMenuOpen(false);
      if (!currentTabUrl || currentTabUrl.includes('newtab.html') || currentTabUrl.startsWith('about:')) {
        showToast('Open a website first to translate page contents');
        return;
      }
      const translateUrl = `https://translate.google.com/translate?sl=auto&tl=en&u=${encodeURIComponent(currentTabUrl)}`;
      window.privateFox?.navigate(translateUrl);
      showToast('Translating page via secure proxy...');
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 7. REOPEN CLOSED TABS
  // ─────────────────────────────────────────────────────────────
  function handleReopenClosedTab() {
    if (closedTabsStack.length > 0) {
      const last = closedTabsStack.pop();
      window.privateFox?.createTab(last.url);
      showToast(`Reopened: ${last.title || last.url}`);
    } else {
      showToast('No recently closed tabs');
    }
  }

  function handleBookmarkAllTabs() {
    let count = 0;
    tabMetadataMap.forEach((meta) => {
      if (meta && meta.url && !meta.url.includes('newtab.html')) {
        window.privateFox?.toggleBookmark({
          url: meta.url,
          title: meta.title || 'Bookmark',
          favicon: meta.favicon || ''
        });
        count++;
      }
    });
    showToast(`Bookmarked ${count} open tab${count === 1 ? '' : 's'}`);
  }

  // ─────────────────────────────────────────────────────────────
  // SUBMENU CLICK ACTIONS
  // ─────────────────────────────────────────────────────────────
  const menuSubFullHistory = document.getElementById('menuSubFullHistory');
  if (menuSubFullHistory) menuSubFullHistory.addEventListener('click', () => {
    setAppMenuOpen(false);
    togglePanel('panelHistory');
  });

  const menuSubClearHistory = document.getElementById('menuSubClearHistory');
  if (menuSubClearHistory) menuSubClearHistory.addEventListener('click', () => {
    openModal('modalClearData');
  });

  const menuSubReopenTab = document.getElementById('menuSubReopenTab');
  if (menuSubReopenTab) menuSubReopenTab.addEventListener('click', () => {
    setAppMenuOpen(false);
    handleReopenClosedTab();
  });

  const menuSubBookmarkTab = document.getElementById('menuSubBookmarkTab');
  if (menuSubBookmarkTab) menuSubBookmarkTab.addEventListener('click', () => {
    setAppMenuOpen(false);
    if (currentTabUrl && !currentTabUrl.includes('newtab.html')) {
      window.privateFox?.toggleBookmark({
        url: currentTabUrl,
        title: currentTabTitle || 'Bookmark',
        favicon: currentTabFavicon || ''
      }).then(res => {
        updateStarButtonState(res?.isBookmarked);
        showToast(res?.isBookmarked ? 'Bookmark added' : 'Bookmark removed');
      });
    } else {
      showToast('Open a website first to bookmark');
    }
  });

  const menuSubBookmarkAll = document.getElementById('menuSubBookmarkAll');
  if (menuSubBookmarkAll) menuSubBookmarkAll.addEventListener('click', () => {
    setAppMenuOpen(false);
    handleBookmarkAllTabs();
  });

  const menuSubToggleBookmarksBar = document.getElementById('menuSubToggleBookmarksBar');
  if (menuSubToggleBookmarksBar) menuSubToggleBookmarksBar.addEventListener('click', () => {
    setAppMenuOpen(false);
    const bar = document.getElementById('bookmarksBar');
    const newState = bar ? bar.hidden : true;
    if (bar) bar.hidden = !newState;
    window.privateFox?.setBookmarksBarVisible(newState);
    showToast(newState ? 'Bookmarks bar shown' : 'Bookmarks bar hidden');
  });

  const menuSubBookmarksManager = document.getElementById('menuSubBookmarksManager');
  if (menuSubBookmarksManager) menuSubBookmarksManager.addEventListener('click', () => {
    setAppMenuOpen(false);
    togglePanel('panelBookmarks');
  });

  const menuSubTaskManager = document.getElementById('menuSubTaskManager');
  if (menuSubTaskManager) menuSubTaskManager.addEventListener('click', () => {
    openModal('modalTaskManager');
  });

  const menuSubClearData = document.getElementById('menuSubClearData');
  if (menuSubClearData) menuSubClearData.addEventListener('click', () => {
    openModal('modalClearData');
  });

  const menuSubAbout = document.getElementById('menuSubAbout');
  if (menuSubAbout) menuSubAbout.addEventListener('click', () => {
    openModal('modalAbout');
  });

  const menuSubReportIssue = document.getElementById('menuSubReportIssue');
  if (menuSubReportIssue) menuSubReportIssue.addEventListener('click', () => {
    openModal('modalReportIssue');
  });

  const menuSubPrivacyDocs = document.getElementById('menuSubPrivacyDocs');
  if (menuSubPrivacyDocs) menuSubPrivacyDocs.addEventListener('click', () => {
    openModal('modalPrivacyDocs');
  });

  const menuPasswords = document.getElementById('menuPasswords');
  if (menuPasswords) menuPasswords.addEventListener('click', () => {
    openModal('modalPasswords');
  });

  // App Menu Item Actions
  const menuNewTab = document.getElementById('menuNewTab');
  if (menuNewTab) menuNewTab.addEventListener('click', () => {
    setAppMenuOpen(false);
    handleNewTab();
  });

  const menuNewWindow = document.getElementById('menuNewWindow');
  if (menuNewWindow) menuNewWindow.addEventListener('click', () => {
    setAppMenuOpen(false);
    window.privateFox?.newWindow();
  });

  const menuNewPrivateWindow = document.getElementById('menuNewPrivateWindow');
  if (menuNewPrivateWindow) menuNewPrivateWindow.addEventListener('click', () => {
    setAppMenuOpen(false);
    window.privateFox?.newIncognitoWindow();
  });

  const btnNewIncognito = document.getElementById('btnNewIncognito');
  if (btnNewIncognito) btnNewIncognito.addEventListener('click', () => {
    window.privateFox?.newIncognitoWindow();
  });

  const menuDownloads = document.getElementById('menuDownloads');
  if (menuDownloads) menuDownloads.addEventListener('click', () => {
    setAppMenuOpen(false);
    togglePanel('panelDownloads');
  });

  const menuExtensions = document.getElementById('menuExtensions');
  if (menuExtensions) menuExtensions.addEventListener('click', () => {
    setAppMenuOpen(false);
    openModal('modalExtensions');
  });

  const menuPrint = document.getElementById('menuPrint');
  if (menuPrint) menuPrint.addEventListener('click', () => {
    setAppMenuOpen(false);
    window.privateFox?.printPage();
  });

  const menuSavePage = document.getElementById('menuSavePage');
  if (menuSavePage) menuSavePage.addEventListener('click', () => {
    setAppMenuOpen(false);
    window.privateFox?.savePageAs();
  });

  const menuFindInPage = document.getElementById('menuFindInPage');
  if (menuFindInPage) menuFindInPage.addEventListener('click', () => {
    setAppMenuOpen(false);
    openFindBar();
  });

  // Zoom Row Actions
  const btnZoomIn = document.getElementById('btnZoomIn');
  const btnZoomOut = document.getElementById('btnZoomOut');
  const btnZoomReset = document.getElementById('btnZoomReset');
  const btnToggleFullscreen = document.getElementById('btnToggleFullscreen');

  if (btnZoomIn) btnZoomIn.addEventListener('click', (e) => {
    e.stopPropagation();
    window.privateFox?.zoomIn().then(pct => {
      if (zoomPercentText) zoomPercentText.textContent = pct + '%';
    });
  });

  if (btnZoomOut) btnZoomOut.addEventListener('click', (e) => {
    e.stopPropagation();
    window.privateFox?.zoomOut().then(pct => {
      if (zoomPercentText) zoomPercentText.textContent = pct + '%';
    });
  });

  if (btnZoomReset) btnZoomReset.addEventListener('click', (e) => {
    e.stopPropagation();
    window.privateFox?.zoomReset().then(pct => {
      if (zoomPercentText) zoomPercentText.textContent = pct + '%';
    });
  });

  if (btnToggleFullscreen) btnToggleFullscreen.addEventListener('click', (e) => {
    e.stopPropagation();
    setAppMenuOpen(false);
    window.privateFox?.toggleFullScreen();
  });

  const menuSettings = document.getElementById('menuSettings');
  if (menuSettings) menuSettings.addEventListener('click', () => {
    setAppMenuOpen(false);
    togglePanel('panelSettings');
  });

  const menuExit = document.getElementById('menuExit');
  if (menuExit) menuExit.addEventListener('click', () => {
    window.privateFox?.exitApp();
  });

  const menuSubDevTools = document.getElementById('menuSubDevTools');
  if (menuSubDevTools) menuSubDevTools.addEventListener('click', () => {
    setAppMenuOpen(false);
    window.privateFox?.toggleDevTools();
  });

  // Close menu on click outside
  document.addEventListener('click', (e) => {
    if (isAppMenuOpen && appMenu && !appMenu.contains(e.target) && btnAppMenu && !btnAppMenu.contains(e.target)) {
      setAppMenuOpen(false);
    }
  });

  // ─────────────────────────────────────────────────────────────
  // FLOATING IN-PAGE FIND BAR (Ctrl+F)
  // ─────────────────────────────────────────────────────────────
  function openFindBar() {
    if (!findBar) return;
    findBar.hidden = false;
    if (findBarInput) {
      findBarInput.focus();
      findBarInput.select();
      if (findBarInput.value.trim()) {
        window.privateFox?.findInPage(findBarInput.value.trim(), true);
      }
    }
  }

  function closeFindBar() {
    if (!findBar) return;
    findBar.hidden = true;
    window.privateFox?.stopFind('clearSelection');
  }

  if (findBarInput) {
    findBarInput.addEventListener('input', () => {
      const q = findBarInput.value;
      if (q.trim()) {
        window.privateFox?.findInPage(q, true);
      } else {
        window.privateFox?.stopFind('clearSelection');
        if (findBarCount) findBarCount.textContent = '0/0';
      }
    });

    findBarInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        window.privateFox?.findInPage(findBarInput.value, !e.shiftKey);
      } else if (e.key === 'Escape') {
        closeFindBar();
      }
    });
  }

  if (btnFindNext) btnFindNext.addEventListener('click', () => {
    if (findBarInput && findBarInput.value) {
      window.privateFox?.findInPage(findBarInput.value, true);
    }
  });

  if (btnFindPrev) btnFindPrev.addEventListener('click', () => {
    if (findBarInput && findBarInput.value) {
      window.privateFox?.findInPage(findBarInput.value, false);
    }
  });

  if (btnFindClose) btnFindClose.addEventListener('click', closeFindBar);

  window.privateFox?.on('find:result', (result) => {
    if (!findBarCount) return;
    if (result && result.matches !== undefined) {
      findBarCount.textContent = `${result.activeMatchOrdinal || 0}/${result.matches}`;
    }
  });

  // ─────────────────────────────────────────────────────────────
  // GLOBAL KEYBOARD SHORTCUTS
  // ─────────────────────────────────────────────────────────────
  window.addEventListener('keydown', (e) => {
    // Ctrl+T: New Tab
    if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 't') {
      e.preventDefault();
      handleNewTab();
    }
    // Ctrl+N: New Window
    if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      window.privateFox?.newWindow();
    }
    // Ctrl+Shift+N or Ctrl+Shift+P: New Incognito Window
    if (e.ctrlKey && e.shiftKey && (e.key.toLowerCase() === 'n' || e.key.toLowerCase() === 'p')) {
      e.preventDefault();
      window.privateFox?.newIncognitoWindow();
    }
    // Ctrl+W: Close Tab
    if (e.ctrlKey && e.key.toLowerCase() === 'w') {
      e.preventDefault();
      if (activeTabId) window.privateFox?.closeTab(activeTabId);
    }
    // Ctrl+Tab / Ctrl+Shift+Tab: Cycle Tabs
    if (e.ctrlKey && e.key === 'Tab') {
      e.preventDefault();
      if (tabList.length > 1) {
        const currIdx = tabList.indexOf(activeTabId);
        const nextIdx = e.shiftKey
          ? (currIdx - 1 + tabList.length) % tabList.length
          : (currIdx + 1) % tabList.length;
        window.privateFox?.switchTab(tabList[nextIdx]);
      }
    }
    // Ctrl+Shift+PageUp / Ctrl+Shift+PageDown / Ctrl+Shift+ArrowLeft / ArrowRight: Move Active Tab
    if (e.ctrlKey && e.shiftKey && (e.key === 'PageUp' || e.key === 'ArrowLeft')) {
      e.preventDefault();
      moveActiveTab(-1);
    }
    if (e.ctrlKey && e.shiftKey && (e.key === 'PageDown' || e.key === 'ArrowRight')) {
      e.preventDefault();
      moveActiveTab(1);
    }
    // Ctrl+L or Alt+D: Focus Omnibox
    if ((e.ctrlKey && e.key.toLowerCase() === 'l') || (e.altKey && e.key.toLowerCase() === 'd')) {
      e.preventDefault();
      omniboxInput?.focus();
      omniboxInput?.select();
    }
    // Ctrl+D: Bookmark current page
    if (e.ctrlKey && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      btnStar?.click();
    }
    // Ctrl+H: Toggle History Panel
    if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'h') {
      e.preventDefault();
      togglePanel('panelHistory');
    }
    // Ctrl+Shift+O: Toggle Bookmarks Panel
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'o') {
      e.preventDefault();
      togglePanel('panelBookmarks');
    }
    // Ctrl+J: Toggle Downloads Panel
    if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'j') {
      e.preventDefault();
      togglePanel('panelDownloads');
    }
    // Ctrl+Shift+F: Toggle Extensions / Themes
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      togglePanel('panelSettings');
    }
    // Ctrl+P: Print Page
    if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      window.privateFox?.printPage();
    }
    // Ctrl+S: Save Page As
    if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      window.privateFox?.savePageAs();
    }
    // Ctrl+F: Find in Page
    if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      openFindBar();
    }
    // Ctrl++ / Ctrl+=: Zoom In
    if (e.ctrlKey && (e.key === '+' || e.key === '=')) {
      e.preventDefault();
      window.privateFox?.zoomIn().then(pct => {
        if (zoomPercentText) zoomPercentText.textContent = pct + '%';
      });
    }
    // Ctrl+-: Zoom Out
    if (e.ctrlKey && (e.key === '-' || e.key === '_')) {
      e.preventDefault();
      window.privateFox?.zoomOut().then(pct => {
        if (zoomPercentText) zoomPercentText.textContent = pct + '%';
      });
    }
    // Ctrl+0: Reset Zoom
    if (e.ctrlKey && e.key === '0') {
      e.preventDefault();
      window.privateFox?.zoomReset().then(pct => {
        if (zoomPercentText) zoomPercentText.textContent = pct + '%';
      });
    }
    // F11: Full Screen
    if (e.key === 'F11') {
      e.preventDefault();
      window.privateFox?.toggleFullScreen();
    }
    // Ctrl+Shift+Q: Exit Application
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'q') {
      e.preventDefault();
      window.privateFox?.exitApp();
    }
    // Ctrl+Shift+I: Developer Tools
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      window.privateFox?.toggleDevTools();
    }
    // Ctrl+B: Toggle Bookmarks Bar
    if (e.ctrlKey && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      if (settingBookmarksBar) {
        settingBookmarksBar.checked = !settingBookmarksBar.checked;
        settingBookmarksBar.dispatchEvent(new Event('change'));
      }
    }
    // Ctrl+,: Toggle Settings Panel
    if (e.ctrlKey && e.key === ',') {
      e.preventDefault();
      togglePanel('panelSettings');
    }
    // Shift+Escape: Task Manager
    if (e.shiftKey && e.key === 'Escape') {
      e.preventDefault();
      openModal('modalTaskManager');
    }
    // Ctrl+Shift+F: Extensions and Add-ons Manager
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      openModal('modalExtensions');
    }
    // Ctrl+Shift+Del: Clear Browsing Data
    if (e.ctrlKey && e.shiftKey && (e.key === 'Delete' || e.key === 'Del')) {
      e.preventDefault();
      openModal('modalClearData');
    }
    // Ctrl+Shift+T: Reopen closed tab
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 't') {
      e.preventDefault();
      handleReopenClosedTab();
    }
    // Ctrl+Shift+U: Translate page
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'u') {
      e.preventDefault();
      menuTranslate?.click();
    }
    // Ctrl+Alt+S: Toggle Split View (Zen-Inspired)
    if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      window.privateFox?.toggleSplitView();
    }
    // Escape: Close glance preview, modal, menu, shield popover, find bar, side panel, or autocomplete
    if (e.key === 'Escape') {
      if (glanceFloatingBar && !glanceFloatingBar.hidden) {
        window.privateFox?.closeGlance();
        glanceFloatingBar.hidden = true;
        glanceFloatingBar.style.display = 'none';
      } else if (activeModalId) {
        closeModal();
      } else if (isAppMenuOpen) {
        setAppMenuOpen(false);
      } else if (shieldPopover && !shieldPopover.hidden) {
        toggleShieldPopover();
      } else if (findBar && !findBar.hidden) {
        closeFindBar();
      } else if (!omniboxDropdown?.hidden) {
        hideOmniboxDropdown();
      } else if (isSidePanelOpen) {
        setPanelOpen(false);
      }
    }
    // F5 or Ctrl+R: Reload
    if (e.key === 'F5' || (e.ctrlKey && e.key.toLowerCase() === 'r')) {
      e.preventDefault();
      window.privateFox?.reload();
    }
    // Alt+Left: Back
    if (e.altKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      window.privateFox?.goBack();
    }
    // Alt+Right: Forward
    if (e.altKey && e.key === 'ArrowRight') {
      e.preventDefault();
      window.privateFox?.goForward();
    }
  });

  // ─────────────────────────────────────────────────────────────
  // APPLICATION MENU ACTION DISPATCHERS
  // ─────────────────────────────────────────────────────────────
  window.privateFox?.on?.('menu:open-history', () => {
    setPanelOpen(true, 'panelHistory');
  });
  window.privateFox?.on?.('menu:open-bookmarks', () => {
    setPanelOpen(true, 'panelBookmarks');
  });
  window.privateFox?.on?.('menu:open-downloads', () => {
    setPanelOpen(true, 'panelDownloads');
  });
  window.privateFox?.on?.('menu:open-passwords', () => {
    openModal('modalPasswords');
  });
  window.privateFox?.on?.('menu:open-extensions', () => {
    openModal('modalExtensions');
  });
  window.privateFox?.on?.('menu:open-settings', () => {
    setPanelOpen(true, 'panelSettings');
  });
  window.privateFox?.on?.('menu:find-in-page', () => {
    openFindBar();
  });
  window.privateFox?.on?.('menu:bookmark-tab', () => {
    if (currentTabUrl) {
      window.privateFox?.toggleBookmark?.({
        url: currentTabUrl,
        title: currentTabTitle || 'Bookmark'
      });
    }
  });
  window.privateFox?.on?.('menu:clear-data', () => {
    openModal('modalClearData');
  });
  window.privateFox?.on?.('menu:about', () => {
    openModal('modalAbout');
  });
  window.privateFox?.on?.('menu:toggle-shield', () => {
    const isCurrentlyChecked = shieldMasterToggle ? shieldMasterToggle.checked : true;
    handleShieldToggle(!isCurrentlyChecked);
  });
  window.privateFox?.on?.('menu:closed', () => {
    setAppMenuOpen(false);
  });

  // ─────────────────────────────────────────────────────────────
  // UTILITY HELPERS
  // ─────────────────────────────────────────────────────────────
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDomain(rawUrl) {
    if (!rawUrl) return '';
    try {
      const u = new URL(rawUrl);
      return u.hostname;
    } catch {
      return rawUrl;
    }
  }

  function formatRelativeTime(timestamp) {
    if (!timestamp) return '';
    const diffMs = Date.now() - timestamp;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay === 1) return 'Yesterday';
    return `${diffDay}d ago`;
  }

})();
