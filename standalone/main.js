const { app, BrowserWindow, WebContentsView, session, ipcMain, shell, dialog, Menu, MenuItem, clipboard, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');

// Set Application User Model ID for Windows Taskbar & Start Menu grouping
if (process.platform === 'win32') {
  app.setAppUserModelId('HellFire.Browser');
}

// ─────────────────────────────────────────────────────────────
// MULTI-WINDOW & INCOGNITO ARCHITECTURE
// ─────────────────────────────────────────────────────────────
const windows = new Map(); // win.id => winState
let primaryWindow = null;
let customSession = null;
let blockedTrackersCount = 0;

function getActiveWindowState() {
  const focused = BrowserWindow.getFocusedWindow();
  if (focused && windows.has(focused.id)) return windows.get(focused.id);
  if (primaryWindow && !primaryWindow.isDestroyed() && windows.has(primaryWindow.id)) return windows.get(primaryWindow.id);
  return windows.values().next().value || null;
}

function getWindowState(target) {
  if (!target) return getActiveWindowState();
  if (target.win && target.tabs) return target;
  if (typeof target === 'number' && windows.has(target)) return windows.get(target);
  if (target.id && windows.has(target.id)) return windows.get(target.id);
  if (target.sender) {
    const win = BrowserWindow.fromWebContents(target.sender);
    if (win && windows.has(win.id)) return windows.get(win.id);
    for (const ws of windows.values()) {
      if (ws.tabs.some(t => t.view && t.view.webContents && t.view.webContents.id === target.sender.id)) {
        return ws;
      }
    }
  }
  return getActiveWindowState();
}

function isAuthorizedChromeSender(event) {
  if (!event || !event.sender) return true;
  const ws = getWindowState(event);
  if (!ws || !ws.win || ws.win.isDestroyed()) return false;
  return event.sender.id === ws.win.webContents.id;
}

// Backward compatibility accessors for global references
Object.defineProperty(global, 'mainWindow', {
  get() { return getActiveWindowState()?.win || primaryWindow || null; },
  set(val) { primaryWindow = val; },
  configurable: true
});

const DATA_DIR = path.join(__dirname, 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const BOOKMARKS_FILE = path.join(DATA_DIR, 'bookmarks.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const VAULT_FILE = path.join(DATA_DIR, 'vault.enc');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ─────────────────────────────────────────────────────────────
// DATA PERSISTENCE HELPERS
// ─────────────────────────────────────────────────────────────
function loadJSON(filePath, defaultVal) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error(`Error loading JSON from ${filePath}:`, e.message);
  }
  return defaultVal;
}

function saveJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error(`Error saving JSON to ${filePath}:`, e.message);
  }
}

let settings = loadJSON(SETTINGS_FILE, {
  searchEngine: 'duckduckgo',
  searchEngines: {
    duckduckgo: 'https://duckduckgo.com/?q=%s',
    brave: 'https://search.brave.com/search?q=%s',
    startpage: 'https://www.startpage.com/sp/search?query=%s',
    searx: 'https://searx.be/search?q=%s'
  },
  dohProvider: 'quad9',
  dohProviders: {
    quad9: 'https://dns.quad9.net/dns-query',
    cloudflare: 'https://cloudflare-dns.com/dns-query',
    mullvad: 'https://dns.mullvad.net/dns-query'
  },
  trackerShield: 'strict',
  shieldEnabled: true,
  disabledShieldDomains: [],
  showBookmarksBar: true
});

if (settings.shieldEnabled === undefined) settings.shieldEnabled = true;
if (!Array.isArray(settings.disabledShieldDomains)) settings.disabledShieldDomains = [];

let bookmarks = loadJSON(BOOKMARKS_FILE, [
  { id: 'bm-1', url: 'https://duckduckgo.com', title: 'DuckDuckGo', favicon: 'https://duckduckgo.com/favicon.ico', timestamp: Date.now() },
  { id: 'bm-2', url: 'https://github.com', title: 'GitHub', favicon: 'https://github.githubassets.com/favicons/favicon.svg', timestamp: Date.now() },
  { id: 'bm-3', url: 'https://21st.dev', title: '21st.dev', favicon: 'https://21st.dev/favicon.ico', timestamp: Date.now() },
  { id: 'bm-4', url: 'https://privacyguides.org', title: 'Privacy Guides', favicon: 'https://privacyguides.org/assets/img/favicons/favicon.ico', timestamp: Date.now() }
]);

let history = loadJSON(HISTORY_FILE, []);

// ─────────────────────────────────────────────────────────────
// HISTORY MANAGEMENT (Incognito Guarded)
// ─────────────────────────────────────────────────────────────
function addHistoryEntry(pageUrl, title, favicon, isIncognito = false) {
  // ZERO history recorded in Incognito Mode
  if (isIncognito) return;

  if (!pageUrl || pageUrl.includes('newtab.html') || pageUrl.startsWith('file://') || pageUrl.startsWith('about:')) {
    return;
  }

  // Deduplicate if visited within the last 5 minutes
  const now = Date.now();
  const existingIdx = history.findIndex(h => h.url === pageUrl);
  if (existingIdx !== -1) {
    const existing = history[existingIdx];
    existing.timestamp = now;
    existing.visitCount = (existing.visitCount || 1) + 1;
    if (title && title !== 'Hell Fire' && title !== 'Private-Fox' && title !== 'New Tab' && title !== 'Incognito') existing.title = title;
    if (favicon) existing.favicon = favicon;
    history.splice(existingIdx, 1);
    history.unshift(existing);
  } else {
    history.unshift({
      id: 'h_' + now + '_' + Math.random().toString(36).substr(2, 6),
      url: pageUrl,
      title: (title && title !== 'New Tab' && title !== 'Incognito') ? title : pageUrl,
      favicon: favicon || '',
      timestamp: now,
      visitCount: 1
    });
  }

  // Cap at 1500 entries
  if (history.length > 1500) {
    history = history.slice(0, 1500);
  }

  saveJSON(HISTORY_FILE, history);
  for (const ws of windows.values()) {
    if (ws.win && !ws.win.isDestroyed()) {
      ws.win.webContents.send('history:updated', { count: history.length });
    }
  }
}

// ─────────────────────────────────────────────────────────────
// PRIVACY & TRACKING FILTERS
// ─────────────────────────────────────────────────────────────
const COSMETIC_AD_BLOCK_CSS = `
  .adsbygoogle,
  [id^="google_ads_"],
  [id*="ScriptRoot"],
  [class*="ad-container"],
  [class*="ad_container"],
  [class*="sponsored-post"],
  [class*="ad-banner"],
  .taboola,
  .outbrain,
  iframe[src*="doubleclick"],
  iframe[src*="googlesyndication"],
  div[data-ad-unit],
  div[data-ad-slot],
  .ad-placeholder {
    display: none !important;
    visibility: hidden !important;
    height: 0 !important;
    max-height: 0 !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }
`;

const BLOCKED_URL_PATTERNS = [
  '*://*.google-analytics.com/*',
  '*://*.googletagmanager.com/*',
  '*://*.doubleclick.net/*',
  '*://*.adservice.google.com/*',
  '*://*.googleadservices.com/*',
  '*://*.googlesyndication.com/*',
  '*://*.facebook.com/tr/*',
  '*://*.connect.facebook.net/*',
  '*://*.scorecardresearch.com/*',
  '*://*.adnxs.com/*',
  '*://*.hotjar.com/*',
  '*://*.criteo.com/*',
  '*://*.criteo.net/*',
  '*://*.amazon-adsystem.com/*',
  '*://*.taboola.com/*',
  '*://*.outbrain.com/*',
  '*://*.rubiconproject.com/*',
  '*://*.pubmatic.com/*',
  '*://*.openx.net/*',
  '*://*.serving-sys.com/*',
  '*://*.adroll.com/*',
  '*://*.quantserve.com/*',
  '*://*.clarity.ms/*',
  '*://*.segment.io/*',
  '*://*.segment.com/*',
  '*://*.mixpanel.com/*',
  '*://*.optimizely.com/*',
  '*://*.mouseflow.com/*',
  '*://*.crazyegg.com/*',
  '*://*.chartbeat.com/*',
  '*://*.chartbeat.net/*',
  '*://*.newrelic.com/*',
  '*://*.nr-data.net/*',
  '*://*.branch.io/*',
  '*://*.appsflyer.com/*',
  '*://*.inspectlet.com/*',
  '*://*.telemetry.mozilla.org/*',
  '*://telemetry.mozilla.org/*',
  // Aggressive Ad, Pop-up & Miner Networks
  '*://*.popads.net/*',
  '*://*.popcash.net/*',
  '*://*.propellerads.com/*',
  '*://*.infolinks.com/*',
  '*://*.buysellads.com/*',
  '*://*.carbonads.net/*',
  '*://*.smartadserver.com/*',
  '*://*.casalemedia.com/*',
  '*://*.advertising.com/*',
  '*://*.adthrive.com/*',
  '*://*.mediavine.com/*',
  '*://*.coin-hive.com/*',
  '*://*.coinhive.com/*',
  '*://*.crypto-loot.com/*',
  '*://*.analytics.tiktok.com/*',
  '*://*.analytics.twitter.com/*',
  '*://*.an.yandex.ru/*',
  '*://*.mc.yandex.ru/*',
  '*://*.cpro.baidu.com/*',
  '*://*.telemetry.microsoft.com/*',
  '*://*.vortex.data.microsoft.com/*',
  // CNAME Cloaked Tracker Canonical Endpoints (Helium-Inspired)
  '*://*.adobedc.net/*',
  '*://*.demdex.net/*',
  '*://*.omtrdc.net/*',
  '*://*.eulerian.net/*',
  '*://*.tagcommander.com/*',
  '*://*.at-o.net/*',
  '*://*.keywee.co/*',
  '*://*.wizaly.com/*',
  '*://*.affise.com/*',
  '*://*.wt-eu02.net/*',
  '*://*.kueezrtb.com/*',
  '*://*.sc-static.net/*',
  '*://*.snapchat.com/tr/*'
];

function getDomainFromUrl(urlStr) {
  if (!urlStr) return '';
  try {
    if (urlStr.startsWith('about:') || urlStr.startsWith('file:')) return 'internal';
    const parsed = new URL(urlStr);
    return parsed.hostname.toLowerCase();
  } catch (e) {
    return '';
  }
}

function isShieldEnabledForDomain(domain) {
  if (settings.shieldEnabled === false) return false;
  if (!domain || domain === 'internal') return settings.shieldEnabled !== false;
  const disabled = settings.disabledShieldDomains || [];
  return !disabled.includes(domain);
}

function isShieldEnabledForTab(tab) {
  if (settings.shieldEnabled === false) return false;
  if (!tab || !tab.url) return settings.shieldEnabled !== false;
  const domain = getDomainFromUrl(tab.url);
  return isShieldEnabledForDomain(domain);
}

function getShieldStatusForTab(winState, tab) {
  const ws = getWindowState(winState);
  const totalBlocked = ws ? ws.blockedTrackersCount : blockedTrackersCount;
  if (!tab) {
    return {
      tabId: 0,
      domain: '',
      enabled: settings.shieldEnabled !== false,
      tabBlockedCount: 0,
      totalBlockedCount: totalBlocked,
      shieldLevel: settings.trackerShield || 'strict'
    };
  }
  const domain = getDomainFromUrl(tab.url);
  return {
    tabId: tab.id,
    domain: domain,
    enabled: isShieldEnabledForTab(tab),
    tabBlockedCount: tab.blockedTrackersCount || 0,
    totalBlockedCount: totalBlocked,
    shieldLevel: settings.trackerShield || 'strict'
  };
}

function broadcastShieldStatusForTab(winState, tab) {
  const ws = getWindowState(winState);
  if (!ws || !ws.win || ws.win.isDestroyed()) return;
  const status = getShieldStatusForTab(ws, tab);
  ws.win.webContents.send('shield:tab-status', status);
}

function getNewTabUrl(isIncognito = false) {
  const engine = settings?.searchEngine || 'brave';
  const fileUrl = url.pathToFileURL(path.join(__dirname, 'ui', 'newtab.html')).href;
  const incognitoParam = isIncognito ? '&incognito=true' : '';
  const doh = encodeURIComponent(settings?.dohProvider || 'cloudflare');
  const blocked = blockedTrackersCount;
  return `${fileUrl}?engine=${encodeURIComponent(engine)}&blocked=${blocked}&doh=${doh}${incognitoParam}`;
}

const BANG_MAP = {
  '!g': 'https://www.google.com/search?q=%s',
  '!google': 'https://www.google.com/search?q=%s',
  '!b': 'https://www.bing.com/search?q=%s',
  '!bing': 'https://www.bing.com/search?q=%s',
  '!br': 'https://search.brave.com/search?q=%s',
  '!brave': 'https://search.brave.com/search?q=%s',
  '!d': 'https://duckduckgo.com/?q=%s',
  '!ddg': 'https://duckduckgo.com/?q=%s',
  '!sp': 'https://www.startpage.com/sp/search?query=%s',
  '!startpage': 'https://www.startpage.com/sp/search?query=%s',
  '!e': 'https://www.ecosia.org/search?q=%s',
  '!ecosia': 'https://www.ecosia.org/search?q=%s',
  '!y': 'https://search.yahoo.com/search?p=%s',
  '!yahoo': 'https://search.yahoo.com/search?p=%s',
  '!q': 'https://www.qwant.com/?q=%s',
  '!qwant': 'https://www.qwant.com/?q=%s',
  '!k': 'https://kagi.com/search?q=%s',
  '!kagi': 'https://kagi.com/search?q=%s',
  '!searx': 'https://searx.be/search?q=%s',
  '!w': 'https://en.wikipedia.org/wiki/Special:Search?search=%s',
  '!wiki': 'https://en.wikipedia.org/wiki/Special:Search?search=%s',
  '!yt': 'https://www.youtube.com/results?search_query=%s',
  '!gh': 'https://github.com/search?q=%s',
  '!r': 'https://www.reddit.com/search/?q=%s'
};

function normalizeUrl(input, isIncognito = false) {
  if (input === null || input === undefined) return getNewTabUrl(isIncognito);
  if (typeof input !== 'string') {
    if (typeof input === 'number' || typeof input === 'boolean') {
      input = String(input);
    } else {
      return getNewTabUrl(isIncognito);
    }
  }
  const trimmed = input.trim();
  if (trimmed === 'about:hellfire' || trimmed === 'about:privatefox' || trimmed === 'about:newtab' || trimmed === 'about:blank' || trimmed === 'about:incognito') {
    return getNewTabUrl(isIncognito || trimmed === 'about:incognito');
  }

  // Prevent local file traversal or rogue URI schemes
  if (trimmed.startsWith('file://')) {
    const allowedNewTabBase = url.pathToFileURL(path.join(__dirname, 'ui', 'newtab.html')).href;
    if (trimmed.startsWith(allowedNewTabBase)) {
      return trimmed;
    }
    console.warn('[Security] Blocked unauthorized local file navigation:', trimmed);
    return getNewTabUrl(isIncognito);
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Reject dangerous pseudo protocols
  if (/^(javascript|vbscript|data|chrome|edge):/i.test(trimmed)) {
    console.warn('[Security] Blocked dangerous protocol:', trimmed);
    return getNewTabUrl(isIncognito);
  }

  // Check bang shortcut e.g. "!g test" or "!b weather"
  const parts = trimmed.split(' ');
  const firstWord = parts[0].toLowerCase();
  if (BANG_MAP[firstWord] && parts.length > 1) {
    const q = parts.slice(1).join(' ');
    return BANG_MAP[firstWord].replace('%s', encodeURIComponent(q));
  }

  // Check if domain-like (e.g. google.com, localhost:3000)
  if (trimmed.includes('.') && !trimmed.includes(' ') && !trimmed.startsWith('?')) {
    return `https://${trimmed}`;
  }
  // Use configured search engine
  const engine = settings.searchEngine || 'brave';
  const tmpl = settings.searchEngines?.[engine] || 'https://search.brave.com/search?q=%s';
  return tmpl.replace('%s', encodeURIComponent(trimmed));
}

function getSearchUrlForQuery(query, engineName) {
  const q = encodeURIComponent(query);
  switch (engineName) {
    case 'google': return `https://www.google.com/search?q=${q}`;
    case 'bing': return `https://www.bing.com/search?q=${q}`;
    case 'duckduckgo': return `https://duckduckgo.com/?q=${q}`;
    case 'startpage': return `https://www.startpage.com/sp/search?query=${q}`;
    case 'wikipedia': return `https://en.wikipedia.org/wiki/Special:Search?search=${q}`;
    case 'brave':
    default:
      return `https://search.brave.com/search?q=${q}`;
  }
}

function updateActiveViewBounds(winState) {
  const ws = getWindowState(winState);
  if (!ws || !ws.win || ws.win.isDestroyed() || !ws.activeTabId) return;
  const tab = ws.tabs.find(t => t.id === ws.activeTabId);
  if (!tab || !tab.view) return;

  const [w, h] = ws.win.getContentSize();
  const baseH = ws.isBookmarksBarVisible ? 138 : 110;
  const chromeH = baseH; // Never displace tab.view; dropdowns/menus float cleanly over active view
  const panelW = ws.isPanelOpen ? 380 : 0;
  const availW = Math.max(200, w - panelW);
  const availH = Math.max(0, h - chromeH);

  // Split-View Tiling (Zen-Inspired 50/50 dual pane)
  const splitTab = (ws.splitTabId && ws.splitTabId !== ws.activeTabId)
    ? ws.tabs.find(t => t.id === ws.splitTabId)
    : null;

  if (splitTab && splitTab.view) {
    const halfW = Math.floor(availW / 2);
    if (!ws.win.contentView.children.includes(splitTab.view)) {
      ws.win.contentView.addChildView(splitTab.view);
    }
    tab.view.setBounds({ x: 0, y: chromeH, width: halfW, height: availH });
    splitTab.view.setBounds({ x: halfW, y: chromeH, width: availW - halfW, height: availH });
  } else {
    if (ws.splitTabId) {
      const prevSplit = ws.tabs.find(t => t.id === ws.splitTabId);
      if (prevSplit && prevSplit.view && ws.win.contentView.children.includes(prevSplit.view)) {
        try { ws.win.contentView.removeChildView(prevSplit.view); } catch (e) {}
      }
      ws.splitTabId = null;
    }
    tab.view.setBounds({
      x: 0,
      y: chromeH,
      width: availW,
      height: availH
    });
  }

  // Link Glance Ephemeral Overlay (Zen-Inspired centered modal preview)
  if (ws.glanceView) {
    const gw = Math.min(1080, Math.floor(w * 0.84));
    const gh = Math.min(760, Math.floor(h * 0.82));
    const gx = Math.floor((w - gw) / 2);
    const gy = Math.floor((h - gh) / 2) + 20;
    ws.glanceView.setBounds({ x: gx, y: gy, width: gw, height: gh });
  }
}

function checkAndSendBookmarkStatus(winState, targetUrl) {
  const ws = getWindowState(winState);
  if (!ws || !ws.win || ws.win.isDestroyed()) return;
  const isBm = bookmarks.some(b => b.url === targetUrl);
  ws.win.webContents.send('bookmark:status', { url: targetUrl, isBookmarked: isBm });
}

function broadcastTabUpdate(winState, tab) {
  const ws = getWindowState(winState);
  if (!ws || !ws.win || ws.win.isDestroyed()) return;
  ws.win.webContents.send('tab:updated', {
    id: tab.id,
    url: tab.url,
    title: tab.title,
    favicon: tab.favicon,
    isLoading: tab.isLoading,
    canGoBack: tab.canGoBack,
    canGoForward: tab.canGoForward,
    isActive: tab.id === ws.activeTabId,
    isPlayingAudio: !!tab.isPlayingAudio,
    isMuted: !!tab.isMuted,
    isPinned: !!tab.isPinned
  });

  if (tab.id === ws.activeTabId) {
    ws.win.webContents.send('nav:state', {
      url: tab.url,
      title: tab.title,
      canGoBack: tab.canGoBack,
      canGoForward: tab.canGoForward,
      isLoading: tab.isLoading
    });
    checkAndSendBookmarkStatus(ws, tab.url);
  }
}

function broadcastFullTabList(winState) {
  const ws = getWindowState(winState);
  if (!ws || !ws.win || ws.win.isDestroyed()) return;
  const tabDataList = ws.tabs.map(t => ({
    id: t.id,
    url: t.url,
    title: t.title,
    favicon: t.favicon,
    isLoading: t.isLoading,
    isActive: t.id === ws.activeTabId,
    isPlayingAudio: !!t.isPlayingAudio,
    isMuted: !!t.isMuted,
    isPinned: !!t.isPinned
  }));
  ws.win.webContents.send('tab:list', tabDataList);
}

function broadcastPrivacyStats(winState) {
  const ws = getWindowState(winState);
  if (!ws || !ws.win || ws.win.isDestroyed()) return;
  const dohName = settings.dohProvider === 'cloudflare' ? 'Cloudflare 1.1.1.1' :
                  settings.dohProvider === 'mullvad' ? 'Mullvad (Encrypted)' : 'Quad9 (Encrypted)';
  ws.win.webContents.send('privacy:stats', {
    blockedTrackers: ws.blockedTrackersCount || blockedTrackersCount,
    doh: dohName,
    dohProvider: settings.dohProvider || 'cloudflare',
    isolated: true
  });
}

function isCrossSite(urlStr, initiatorStr) {
  if (!initiatorStr) return false;
  try {
    const targetHost = new URL(urlStr).hostname.toLowerCase();
    const initHost = new URL(initiatorStr).hostname.toLowerCase();
    if (targetHost === initHost) return false;
    if (targetHost.endsWith('.' + initHost) || initHost.endsWith('.' + targetHost)) return false;
    return true;
  } catch (e) {
    return false;
  }
}

function setupPrivacyFilters(sess) {
  sess.webRequest.onBeforeRequest({ urls: BLOCKED_URL_PATTERNS }, (details, callback) => {
    let tab = null;
    let winState = null;
    for (const ws of windows.values()) {
      const found = ws.tabs.find(t => t.view && t.view.webContents && t.view.webContents.id === details.webContentsId);
      if (found) {
        tab = found;
        winState = ws;
        break;
      }
    }

    const isEnabled = tab ? isShieldEnabledForTab(tab) : (settings.shieldEnabled !== false);
    if (!isEnabled) {
      return callback({ cancel: false });
    }

    if (tab) {
      tab.blockedTrackersCount = (tab.blockedTrackersCount || 0) + 1;
      if (winState && tab.id === winState.activeTabId) {
        broadcastShieldStatusForTab(winState, tab);
      }
    }
    blockedTrackersCount++;
    if (winState) {
      winState.blockedTrackersCount = (winState.blockedTrackersCount || 0) + 1;
      broadcastPrivacyStats(winState);

      // Real-time update for any active newtab page in this window
      for (const t of winState.tabs) {
        if (t.view && t.view.webContents && t.url && t.url.includes('newtab.html')) {
          t.view.webContents.executeJavaScript(
            `if (window.__updateTelemetry) window.__updateTelemetry(${blockedTrackersCount}, "${settings.dohProvider || 'cloudflare'}");`
          ).catch(() => {});
        }
      }
    }
    callback({ cancel: true });
  });

  sess.webRequest.onBeforeSendHeaders((details, callback) => {
    let tab = null;
    for (const ws of windows.values()) {
      const found = ws.tabs.find(t => t.view && t.view.webContents && t.view.webContents.id === details.webContentsId);
      if (found) { tab = found; break; }
    }
    const isEnabled = tab ? isShieldEnabledForTab(tab) : (settings.shieldEnabled !== false);

    if (isEnabled) {
      delete details.requestHeaders['X-Client-Data'];
      if (settings.trackerShield === 'strict' && details.initiator) {
        if (isCrossSite(details.url, details.initiator)) {
          delete details.requestHeaders['Referer'];
        }
      }
      if (settings.blockThirdPartyCookies && details.initiator) {
        if (isCrossSite(details.url, details.initiator)) {
          delete details.requestHeaders['Cookie'];
          delete details.requestHeaders['cookie'];
        }
      }
    }
    callback({ requestHeaders: details.requestHeaders });
  });

  sess.webRequest.onHeadersReceived((details, callback) => {
    let tab = null;
    for (const ws of windows.values()) {
      const found = ws.tabs.find(t => t.view && t.view.webContents && t.view.webContents.id === details.webContentsId);
      if (found) { tab = found; break; }
    }
    const isEnabled = tab ? isShieldEnabledForTab(tab) : (settings.shieldEnabled !== false);

    const responseHeaders = { ...details.responseHeaders };
    if (isEnabled) {
      if (settings.blockThirdPartyCookies && details.initiator) {
        if (isCrossSite(details.url, details.initiator)) {
          delete responseHeaders['Set-Cookie'];
          delete responseHeaders['set-cookie'];
        }
      }
    }
    callback({ responseHeaders });
  });
}

function handleDownload(item, winState) {
  const rawFileName = item.getFilename();
  // Sanitize filename to prevent path traversal attacks (e.g., ../../evil.exe)
  const sanitizedName = path.basename(rawFileName).replace(/[/\\?%*:|"<>]/g, '_');
  const safeBaseName = sanitizedName.trim() || 'download';

  const downloadsDir = app.getPath('downloads');
  const targetPath = path.join(downloadsDir, safeBaseName);

  // Strict defense: Ensure save path stays within downloads directory
  if (!targetPath.startsWith(downloadsDir)) {
    console.error('[Security] Blocked path traversal attempt in download filename:', rawFileName);
    item.cancel();
    return;
  }

  try {
    item.setSavePath(targetPath);
  } catch (err) {
    console.warn('[Download] Could not set custom save path:', err.message);
  }

  const fileName = safeBaseName;
  const totalBytes = item.getTotalBytes();
  const ws = getWindowState(winState);
  const targetWin = ws?.win || primaryWindow;

  item.on('updated', (evt, state) => {
    if (state === 'progressing' && targetWin && !targetWin.isDestroyed()) {
      targetWin.webContents.send('download:progress', {
        fileName,
        received: item.getReceivedBytes(),
        total: totalBytes,
        percent: totalBytes > 0 ? Math.round((item.getReceivedBytes() / totalBytes) * 100) : 0
      });
    }
  });

  item.once('done', (evt, state) => {
    if (targetWin && !targetWin.isDestroyed()) {
      targetWin.webContents.send('download:completed', {
        fileName,
        state,
        savePath: item.getSavePath()
      });
    }
  });
}

function createTab(winState, initialUrl) {
  const ws = getWindowState(winState);
  if (!ws) return null;
  const tabId = ++ws.tabCounter;
  const urlToLoad = normalizeUrl(initialUrl, ws.isIncognito);

  const view = new WebContentsView({
    webPreferences: {
      session: ws.session,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true
    }
  });

  const tab = {
    id: tabId,
    url: urlToLoad,
    title: ws.isIncognito ? 'Incognito' : 'New Tab',
    favicon: '',
    isLoading: true,
    canGoBack: false,
    canGoForward: false,
    blockedTrackersCount: 0,
    isPlayingAudio: false,
    isMuted: false,
    isPinned: false,
    view: view,
    windowId: ws.id
  };

  ws.tabs.push(tab);

  const wc = view.webContents;

  wc.on('media-started-playing', () => {
    tab.isPlayingAudio = true;
    tab.isMuted = wc.isAudioMuted();
    broadcastTabUpdate(ws, tab);
    if (ws.win && !ws.win.isDestroyed()) {
      ws.win.webContents.send('tab:audio-state', {
        id: tab.id,
        isPlayingAudio: true,
        isMuted: tab.isMuted
      });
    }
  });

  wc.on('media-paused', () => {
    tab.isPlayingAudio = false;
    tab.isMuted = wc.isAudioMuted();
    broadcastTabUpdate(ws, tab);
    if (ws.win && !ws.win.isDestroyed()) {
      ws.win.webContents.send('tab:audio-state', {
        id: tab.id,
        isPlayingAudio: false,
        isMuted: tab.isMuted
      });
    }
  });

  // Web Content Native Right-Click Context Menu
  wc.on('context-menu', (event, params) => {
    const menuTemplate = [];

    // Link context
    if (params.linkURL) {
      menuTemplate.push({
        label: 'Open Link in New Tab',
        click: () => createTab(ws, params.linkURL)
      });
      menuTemplate.push({
        label: 'Open Link in New Window',
        click: () => createBrowserWindow({ isIncognito: false, initialUrl: params.linkURL })
      });
      menuTemplate.push({
        label: 'Open Link in New Incognito Window',
        click: () => createBrowserWindow({ isIncognito: true, initialUrl: params.linkURL })
      });
      menuTemplate.push({
        label: 'Copy Link Address',
        click: () => clipboard.writeText(params.linkURL)
      });
      menuTemplate.push({ type: 'separator' });
    }

    // Media / Image context
    if (params.mediaType === 'image') {
      menuTemplate.push({
        label: 'Open Image in New Tab',
        click: () => createTab(ws, params.srcURL)
      });
      menuTemplate.push({
        label: 'Copy Image Address',
        click: () => clipboard.writeText(params.srcURL)
      });
      menuTemplate.push({
        label: 'Save Image As...',
        click: async () => {
          try {
            const rawName = path.basename(params.srcURL.split('?')[0]) || 'image.png';
            const { filePath, canceled } = await dialog.showSaveDialog(ws.win, {
              title: 'Save Image',
              defaultPath: rawName
            });
            if (!canceled && filePath) {
              wc.downloadURL(params.srcURL);
            }
          } catch (e) {}
        }
      });
      menuTemplate.push({ type: 'separator' });
    }

    // Text selection context
    if (params.selectionText && params.selectionText.trim().length > 0) {
      const selectedText = params.selectionText.trim();
      const truncated = selectedText.length > 25 ? selectedText.substring(0, 22) + '...' : selectedText;
      const engine = settings?.searchEngine || 'brave';
      const engineName = engine.charAt(0).toUpperCase() + engine.slice(1);

      menuTemplate.push({
        label: `Search ${engineName} for "${truncated}"`,
        click: () => {
          const queryUrl = getSearchUrlForQuery(selectedText, engine);
          createTab(ws, queryUrl);
        }
      });
      menuTemplate.push({ label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' });
      menuTemplate.push({ type: 'separator' });
    } else if (params.isEditable) {
      menuTemplate.push({ label: 'Undo', role: 'undo' });
      menuTemplate.push({ label: 'Redo', role: 'redo' });
      menuTemplate.push({ type: 'separator' });
      menuTemplate.push({ label: 'Cut', role: 'cut' });
      menuTemplate.push({ label: 'Copy', role: 'copy' });
      menuTemplate.push({ label: 'Paste', role: 'paste' });
      menuTemplate.push({ label: 'Select All', role: 'selectAll' });
      menuTemplate.push({ type: 'separator' });
    }

    menuTemplate.push({
      label: 'Back',
      accelerator: 'Alt+Left',
      enabled: wc.canGoBack(),
      click: () => { if (wc.canGoBack()) wc.goBack(); }
    });
    menuTemplate.push({
      label: 'Forward',
      accelerator: 'Alt+Right',
      enabled: wc.canGoForward(),
      click: () => { if (wc.canGoForward()) wc.goForward(); }
    });
    menuTemplate.push({
      label: 'Reload',
      accelerator: 'CmdOrCtrl+R',
      click: () => wc.reload()
    });
    menuTemplate.push({ type: 'separator' });

    menuTemplate.push({
      label: 'Print...',
      accelerator: 'CmdOrCtrl+P',
      click: () => wc.print()
    });
    menuTemplate.push({
      label: 'Inspect Element',
      accelerator: 'CmdOrCtrl+Shift+I',
      click: () => {
        wc.inspectElement(params.x, params.y);
        if (!wc.isDevToolsOpened()) {
          wc.openDevTools({ mode: 'detach' });
        }
      }
    });

    const menu = Menu.buildFromTemplate(menuTemplate);
    menu.popup({ window: ws.win });
  });

  wc.on('did-start-loading', () => {
    tab.isLoading = true;
    tab.blockedTrackersCount = 0;
    broadcastTabUpdate(ws, tab);
    if (tab.id === ws.activeTabId) {
      broadcastShieldStatusForTab(ws, tab);
    }
  });

  wc.on('dom-ready', () => {
    tab.isLoading = false;
    broadcastTabUpdate(ws, tab);

    const currentUrl = wc.getURL();
    if (currentUrl && !currentUrl.includes('newtab.html') && !currentUrl.startsWith('about:')) {
      if (isShieldEnabledForTab(tab)) {
        wc.insertCSS(COSMETIC_AD_BLOCK_CSS).catch(() => {});
      }
      wc.executeJavaScript(`
        (() => {
          if (window.__hellfire_form_guard) return;
          window.__hellfire_form_guard = true;

          document.addEventListener('submit', (e) => {
            try {
              const form = e.target;
              if (!form || !form.elements) return;

              // Check for password inputs
              const passInput = form.querySelector('input[type="password"]');
              if (passInput && passInput.value) {
                const userInput = form.querySelector('input[type="email"], input[type="text"][autocomplete*="user"], input[name*="user"], input[name*="login"], input[name*="email"]') ||
                                  form.querySelector('input[type="text"]');
                const user = userInput ? userInput.value : '';
                const pass = passInput.value;
                if (pass) {
                  console.log('__HELLFIRE_SAVE_PASS__:' + JSON.stringify({
                    site: window.location.hostname,
                    user: user,
                    pass: pass
                  }));
                }
              }

              // Check for address inputs
              const nameInput = form.querySelector('input[autocomplete*="name"], input[name*="name"]');
              const streetInput = form.querySelector('input[autocomplete*="address-line1"], input[name*="address"], input[name*="street"]');
              const cityInput = form.querySelector('input[autocomplete*="address-level2"], input[name*="city"]');
              const stateInput = form.querySelector('input[autocomplete*="address-level1"], input[name*="state"]');
              const zipInput = form.querySelector('input[autocomplete*="postal-code"], input[name*="zip"], input[name*="postal"]');
              const countryInput = form.querySelector('input[autocomplete*="country-name"], input[name*="country"]');
              const phoneInput = form.querySelector('input[type="tel"], input[name*="phone"], input[autocomplete*="tel"]');

              if (streetInput && streetInput.value && (cityInput || zipInput)) {
                console.log('__HELLFIRE_SAVE_ADDR__:' + JSON.stringify({
                  name: nameInput ? nameInput.value : '',
                  street: streetInput.value,
                  city: cityInput ? cityInput.value : '',
                  state: stateInput ? stateInput.value : '',
                  zip: zipInput ? zipInput.value : '',
                  country: countryInput ? countryInput.value : 'United States',
                  phone: phoneInput ? phoneInput.value : ''
                }));
              }
            } catch (err) {}
          }, true);
        })()
      `).catch(() => {});
    }
  });

  wc.on('console-message', (...args) => {
    const event = args[0];
    const msg = (event && typeof event === 'object' && typeof event.message === 'string')
      ? event.message
      : (typeof args[2] === 'string' ? args[2] : (typeof args[1] === 'string' ? args[1] : (typeof event === 'string' ? event : '')));
    if (typeof msg === 'string') {
      if (msg.startsWith('__HELLFIRE_SAVE_PASS__:')) {
        try {
          const data = JSON.parse(msg.substring('__HELLFIRE_SAVE_PASS__:'.length));
          // Strict Security Check: Ensure claimed site matches actual tab origin to prevent domain spoofing
          const tabUrl = wc.getURL();
          let actualHostname = '';
          try { actualHostname = new URL(tabUrl).hostname.toLowerCase(); } catch (e) {}
          if (!actualHostname || data.site.toLowerCase() !== actualHostname) {
            console.warn('[Security] Dropped spoofed password prompt from origin:', actualHostname, 'claiming:', data.site);
            return;
          }
          if (ws.win && !ws.win.isDestroyed()) {
            ws.win.webContents.send('prompt:save-password', data);
          }
        } catch (e) {}
      } else if (msg.startsWith('__HELLFIRE_SAVE_ADDR__:')) {
        try {
          const data = JSON.parse(msg.substring('__HELLFIRE_SAVE_ADDR__:'.length));
          if (ws.win && !ws.win.isDestroyed()) {
            ws.win.webContents.send('prompt:save-address', data);
          }
        } catch (e) {}
      }
    }
  });

  wc.on('did-stop-loading', () => {
    tab.isLoading = false;
    tab.canGoBack = wc.navigationHistory ? wc.navigationHistory.canGoBack() : wc.canGoBack();
    tab.canGoForward = wc.navigationHistory ? wc.navigationHistory.canGoForward() : wc.canGoForward();
    tab.url = wc.getURL();
    broadcastTabUpdate(ws, tab);
  });

  wc.on('did-fail-load', (event, errorCode) => {
    if (errorCode === -3) return;
    tab.isLoading = false;
    broadcastTabUpdate(ws, tab);
  });

  wc.on('page-title-updated', (event, title) => {
    tab.title = title || (ws.isIncognito ? 'Hell Fire (Incognito)' : 'Hell Fire');
    broadcastTabUpdate(ws, tab);
    if (tab.url && !tab.url.includes('newtab.html')) {
      addHistoryEntry(tab.url, tab.title, tab.favicon, ws.isIncognito);
    }
  });

  wc.on('page-favicon-updated', (event, favicons) => {
    if (favicons && favicons.length > 0) {
      tab.favicon = favicons[0];
      broadcastTabUpdate(ws, tab);
      if (tab.url && !tab.url.includes('newtab.html')) {
        addHistoryEntry(tab.url, tab.title, tab.favicon, ws.isIncognito);
      }
    }
  });

  wc.on('did-navigate', (event, navigatedUrl) => {
    tab.url = navigatedUrl;
    tab.canGoBack = wc.navigationHistory ? wc.navigationHistory.canGoBack() : wc.canGoBack();
    tab.canGoForward = wc.navigationHistory ? wc.navigationHistory.canGoForward() : wc.canGoForward();
    broadcastTabUpdate(ws, tab);
    if (tab.id === ws.activeTabId) {
      broadcastShieldStatusForTab(ws, tab);
    }
    addHistoryEntry(navigatedUrl, tab.title, tab.favicon, ws.isIncognito);
  });

  wc.on('did-navigate-in-page', (event, navigatedUrl) => {
    tab.url = navigatedUrl;
    broadcastTabUpdate(ws, tab);
  });

  wc.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsed = new URL(navigationUrl);
      if (parsed.protocol === 'file:') {
        const allowedNewTab = url.pathToFileURL(path.join(__dirname, 'ui', 'newtab.html')).href;
        if (!navigationUrl.startsWith(allowedNewTab)) {
          console.warn('[Security] Prevented local file navigation:', navigationUrl);
          event.preventDefault();
          return;
        }
      } else if (!['http:', 'https:'].includes(parsed.protocol)) {
        console.warn('[Security] Prevented non-web protocol navigation:', parsed.protocol);
        event.preventDefault();
        return;
      }
    } catch (e) {
      event.preventDefault();
    }
  });

  wc.setWindowOpenHandler(({ url: targetUrl }) => {
    try {
      const parsed = new URL(targetUrl);
      if (['http:', 'https:'].includes(parsed.protocol)) {
        createTab(ws, targetUrl);
      } else {
        console.warn('[Security] Blocked window.open with unsafe protocol:', parsed.protocol);
      }
    } catch (e) {}
    return { action: 'deny' };
  });

  wc.on('found-in-page', (event, result) => {
    if (ws.win && !ws.win.isDestroyed()) {
      ws.win.webContents.send('find:result', result);
    }
  });

  if (ws.win && !ws.win.isDestroyed()) {
    ws.win.webContents.send('tab:created', {
      id: tab.id,
      url: tab.url,
      title: tab.title,
      isActive: false
    });
  }

  switchTab(ws, tabId);
  wc.loadURL(urlToLoad).catch(() => {});

  return tab;
}

function switchTab(winState, tabId) {
  const ws = getWindowState(winState);
  if (!ws || !ws.win || ws.win.isDestroyed()) return;

  const targetTab = ws.tabs.find(t => t.id === tabId);
  if (!targetTab) return;

  if (ws.splitTabId === tabId) {
    ws.splitTabId = null;
    if (!ws.win.isDestroyed()) {
      ws.win.webContents.send('tab:split-state', {
        isSplit: false,
        activeTabId: tabId,
        splitTabId: null
      });
    }
  }

  if (ws.activeTabId && ws.activeTabId !== tabId) {
    const prevTab = ws.tabs.find(t => t.id === ws.activeTabId);
    if (prevTab && prevTab.view && prevTab.id !== ws.splitTabId) {
      try {
        ws.win.contentView.removeChildView(prevTab.view);
        if (prevTab.view.webContents && !prevTab.view.webContents.isDestroyed()) {
          prevTab.view.webContents.executeJavaScript(`
            window.dispatchEvent(new CustomEvent('hellfire:view-visibility', { detail: { visible: false, reason: 'tab-switch' } }));
          `).catch(() => {});
        }
      } catch (e) {}
    }
  }

  ws.activeTabId = tabId;

  try {
    if (!ws.win.contentView.children.includes(targetTab.view)) {
      ws.win.contentView.addChildView(targetTab.view);
    }
    if (targetTab.view && targetTab.view.webContents && !targetTab.view.webContents.isDestroyed()) {
      targetTab.view.webContents.executeJavaScript(`
        window.dispatchEvent(new CustomEvent('hellfire:view-visibility', { detail: { visible: true, reason: 'tab-switch' } }));
      `).catch(() => {});
    }
  } catch (e) {}

  updateActiveViewBounds(ws);

  if (!ws.win.isDestroyed()) {
    ws.win.webContents.send('tab:switched', { activeTabId: tabId });
    broadcastTabUpdate(ws, targetTab);
    broadcastShieldStatusForTab(ws, targetTab);
  }
}

function closeTab(winState, tabId) {
  const ws = getWindowState(winState);
  if (!ws || !ws.win || ws.win.isDestroyed()) return;

  const index = ws.tabs.findIndex(t => t.id === tabId);
  if (index === -1) return;

  const closingTab = ws.tabs[index];
  ws.tabs.splice(index, 1);

  if (closingTab.view) {
    try {
      ws.win.contentView.removeChildView(closingTab.view);
      closingTab.view.webContents.close();
      closingTab.view = null;
    } catch (e) {}
  }

  if (ws.splitTabId === tabId) {
    ws.splitTabId = null;
    if (!ws.win.isDestroyed()) {
      ws.win.webContents.send('tab:split-state', { isSplit: false, splitTabId: null });
    }
  }

  if (!ws.win.isDestroyed()) {
    ws.win.webContents.send('tab:closed', { id: tabId });
  }

  if (ws.tabs.length === 0) {
    createTab(ws);
  } else if (ws.activeTabId === tabId) {
    const nextTab = ws.tabs[Math.max(0, index - 1)];
    switchTab(ws, nextTab.id);
  }
}

function togglePinTab(winState, tabId) {
  const ws = getWindowState(winState);
  if (!ws) return { success: false };
  const tab = ws.tabs.find(t => t.id === tabId);
  if (!tab) return { success: false };
  tab.isPinned = !tab.isPinned;
  ws.tabs.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });
  broadcastFullTabList(ws);
  return { success: true, isPinned: tab.isPinned };
}

function toggleMuteTab(winState, tabId) {
  const ws = getWindowState(winState);
  if (!ws) return { success: false };
  const tab = ws.tabs.find(t => t.id === tabId);
  if (!tab || !tab.view || tab.view.webContents.isDestroyed()) return { success: false };
  const newMuted = !tab.view.webContents.isAudioMuted();
  tab.view.webContents.setAudioMuted(newMuted);
  tab.isMuted = newMuted;
  broadcastTabUpdate(ws, tab);
  if (ws.win && !ws.win.isDestroyed()) {
    ws.win.webContents.send('tab:audio-state', {
      id: tab.id,
      isPlayingAudio: !!tab.isPlayingAudio,
      isMuted: newMuted
    });
  }
  return { success: true, isMuted: newMuted };
}

function duplicateTab(winState, tabId) {
  const ws = getWindowState(winState);
  if (!ws) return { success: false };
  const tab = ws.tabs.find(t => t.id === tabId);
  if (!tab) return { success: false };
  createTab(ws, tab.url);
  return { success: true };
}

function closeOtherTabs(winState, tabId) {
  const ws = getWindowState(winState);
  if (!ws) return { success: false };
  const toClose = ws.tabs.filter(t => t.id !== tabId && !t.isPinned);
  toClose.forEach(t => closeTab(ws, t.id));
  return { success: true };
}

function closeTabsToRight(winState, tabId) {
  const ws = getWindowState(winState);
  if (!ws) return { success: false };
  const idx = ws.tabs.findIndex(t => t.id === tabId);
  if (idx === -1) return { success: false };
  const toClose = ws.tabs.slice(idx + 1).filter(t => !t.isPinned);
  toClose.forEach(t => closeTab(ws, t.id));
  return { success: true };
}

function reorderTabs(winState, orderedTabIds) {
  const ws = getWindowState(winState);
  if (!ws || !Array.isArray(orderedTabIds)) return { success: false };

  const tabMap = new Map();
  ws.tabs.forEach(t => tabMap.set(String(t.id), t));

  const newTabs = [];
  orderedTabIds.forEach(id => {
    const key = String(id);
    if (tabMap.has(key)) {
      newTabs.push(tabMap.get(key));
      tabMap.delete(key);
    }
  });

  // Preserve any remaining tabs in original order
  for (const remainingTab of tabMap.values()) {
    newTabs.push(remainingTab);
  }

  ws.tabs = newTabs;
  return { success: true, count: ws.tabs.length };
}

// ─────────────────────────────────────────────────────────────
// BROWSER WINDOW FACTORY (Normal & Incognito)
// ─────────────────────────────────────────────────────────────
function createBrowserWindow({ isIncognito = false, initialUrl = null } = {}) {
  let sess;
  const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';

  if (isIncognito) {
    // Isolated in-memory partition (no 'persist:' prefix - wiped upon window close)
    sess = session.fromPartition('incognito_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6));
    sess.setUserAgent(USER_AGENT);
    if (typeof sess.setWebRTCIPHandlingPolicy === 'function') {
      sess.setWebRTCIPHandlingPolicy('default_public_interface_only');
    }
    setupPrivacyFilters(sess);
    sess.setPermissionRequestHandler((webContents, permission, callback) => {
      if (['geolocation', 'notifications', 'midi', 'openExternal', 'pointerLock', 'media', 'camera', 'microphone', 'display-capture', 'window-management'].includes(permission)) {
        return callback(false);
      }
      callback(false); // Zero-trust default deny for untrusted web origins
    });
    sess.setPermissionCheckHandler((webContents, permission) => {
      return false; // Deny permission queries
    });
  } else {
    if (!customSession) {
      customSession = session.fromPartition('persist:hellfire');
      customSession.setUserAgent(USER_AGENT);
      if (typeof customSession.setWebRTCIPHandlingPolicy === 'function') {
        customSession.setWebRTCIPHandlingPolicy('default_public_interface_only');
      }
      setupPrivacyFilters(customSession);
      customSession.setPermissionRequestHandler((webContents, permission, callback) => {
        if (['geolocation', 'notifications', 'midi', 'openExternal', 'pointerLock', 'media', 'camera', 'microphone', 'display-capture', 'window-management'].includes(permission)) {
          return callback(false);
        }
        callback(false); // Zero-trust default deny for untrusted web origins
      });
      customSession.setPermissionCheckHandler((webContents, permission) => {
        return false;
      });
      customSession.on('will-download', (event, item, webContents) => {
        handleDownload(item, null);
      });
    }
    sess = customSession;
  }

  const appIconIco = path.join(__dirname, 'ui', 'assets', 'app.ico');
  const appIconPng = path.join(__dirname, 'ui', 'assets', 'logo.png');
  const appIconPath = (process.platform === 'win32' && fs.existsSync(appIconIco)) ? appIconIco : appIconPng;

  const win = new BrowserWindow({
    title: isIncognito ? 'Hell Fire (Incognito)' : 'Hell Fire',
    icon: appIconPath,
    width: 1366,
    height: 860,
    minWidth: 840,
    minHeight: 560,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: isIncognito ? '#060911' : '#090d16',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  const winState = {
    id: win.id,
    win: win,
    isIncognito: Boolean(isIncognito),
    session: sess,
    tabs: [],
    activeTabId: null,
    splitTabId: null,
    glanceView: null,
    tabCounter: 0,
    blockedTrackersCount: 0,
    isPanelOpen: false,
    isBookmarksBarVisible: settings.showBookmarksBar !== false,
    extraDropdownHeight: 0
  };

  windows.set(win.id, winState);
  if (!isIncognito && !primaryWindow) {
    primaryWindow = win;
  }

  if (isIncognito) {
    sess.on('will-download', (event, item, webContents) => {
      handleDownload(item, winState);
    });
  }

  win.loadFile(path.join(__dirname, 'ui', 'index.html'));

  // Restrict browser chrome navigation strictly to internal UI
  win.webContents.on('will-navigate', (event, targetUrl) => {
    try {
      const allowedIndex = url.pathToFileURL(path.join(__dirname, 'ui', 'index.html')).href;
      if (!targetUrl.startsWith(allowedIndex)) {
        console.warn('[Security] Blocked unauthorized navigation of chrome window:', targetUrl);
        event.preventDefault();
      }
    } catch (e) {
      event.preventDefault();
    }
  });

  // Block unauthorized popups from chrome window
  win.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  win.on('resize', () => {
    updateActiveViewBounds(winState);
  });

  win.on('maximize', () => {
    if (!win.isDestroyed()) {
      win.webContents.send('window:state', { isMaximized: true });
    }
  });

  win.on('unmaximize', () => {
    if (!win.isDestroyed()) {
      win.webContents.send('window:state', { isMaximized: false });
    }
  });

  win.on('minimize', () => {
    for (const t of winState.tabs) {
      if (t.view && t.view.webContents && !t.view.webContents.isDestroyed()) {
        t.view.webContents.executeJavaScript(`
          window.dispatchEvent(new CustomEvent('hellfire:view-visibility', { detail: { visible: false, reason: 'minimize' } }));
        `).catch(() => {});
      }
    }
  });

  win.on('restore', () => {
    const activeTab = winState.tabs.find(t => t.id === winState.activeTabId);
    if (activeTab && activeTab.view && activeTab.view.webContents && !activeTab.view.webContents.isDestroyed()) {
      activeTab.view.webContents.executeJavaScript(`
        window.dispatchEvent(new CustomEvent('hellfire:view-visibility', { detail: { visible: true, reason: 'restore' } }));
      `).catch(() => {});
    }
  });

  win.on('hide', () => {
    for (const t of winState.tabs) {
      if (t.view && t.view.webContents && !t.view.webContents.isDestroyed()) {
        t.view.webContents.executeJavaScript(`
          window.dispatchEvent(new CustomEvent('hellfire:view-visibility', { detail: { visible: false, reason: 'hide' } }));
        `).catch(() => {});
      }
    }
  });

  win.on('show', () => {
    const activeTab = winState.tabs.find(t => t.id === winState.activeTabId);
    if (activeTab && activeTab.view && activeTab.view.webContents && !activeTab.view.webContents.isDestroyed()) {
      activeTab.view.webContents.executeJavaScript(`
        window.dispatchEvent(new CustomEvent('hellfire:view-visibility', { detail: { visible: true, reason: 'show' } }));
      `).catch(() => {});
    }
  });

  win.webContents.on('did-finish-load', () => {
    if (winState.tabs.length === 0) {
      createTab(winState, initialUrl || getNewTabUrl(isIncognito));
    }
    broadcastPrivacyStats(winState);
  });

  win.on('closed', async () => {
    if (winState.glanceView) {
      try {
        if (win.contentView && !win.isDestroyed()) {
          win.contentView.removeChildView(winState.glanceView);
        }
        if (winState.glanceView.webContents && !winState.glanceView.webContents.isDestroyed()) {
          winState.glanceView.webContents.close();
        }
      } catch (e) {}
      winState.glanceView = null;
    }

    for (const t of winState.tabs) {
      if (t.view && t.view.webContents && !t.view.webContents.isDestroyed()) {
        try {
          win.contentView.removeChildView(t.view);
          t.view.webContents.close();
        } catch (e) {}
      }
    }
    winState.tabs = [];

    // Permanent memory wipe for incognito partition
    if (isIncognito && sess) {
      try {
        await sess.clearStorageData();
        await sess.clearCache();
      } catch (e) {}
    }

    windows.delete(win.id);
    if (primaryWindow === win) {
      const other = Array.from(windows.values()).find(ws => !ws.isIncognito);
      primaryWindow = other ? other.win : (windows.values().next().value?.win || null);
    }

    if (windows.size === 0 && process.platform !== 'darwin') {
      app.quit();
    }
  });

  return winState;
}

function createWindow() {
  return createBrowserWindow({ isIncognito: false });
}

// ─────────────────────────────────────────────────────────────
// IPC HANDLERS
// ─────────────────────────────────────────────────────────────
ipcMain.handle('tab:create', (event, targetUrl) => {
  const ws = getWindowState(event);
  const tab = createTab(ws, targetUrl);
  return { id: tab ? tab.id : null };
});

ipcMain.handle('tab:switch', (event, tabId) => {
  const ws = getWindowState(event);
  switchTab(ws, tabId);
  return { success: true };
});

ipcMain.handle('tab:close', (event, tabId) => {
  const ws = getWindowState(event);
  closeTab(ws, tabId);
  return { success: true };
});

ipcMain.handle('tab:reorder', (event, orderedTabIds) => {
  return reorderTabs(event, orderedTabIds);
});

ipcMain.handle('tab:navigate', (event, input) => {
  const ws = getWindowState(event);
  if (!ws || !ws.activeTabId) return;
  const tab = ws.tabs.find(t => t.id === ws.activeTabId);
  if (!tab || !tab.view || !tab.view.webContents || tab.view.webContents.isDestroyed()) return;
  try {
    const targetUrl = normalizeUrl(input, ws.isIncognito);
    tab.view.webContents.loadURL(targetUrl).catch(() => {});
  } catch (e) {}
});

ipcMain.handle('tab:back', (event) => {
  const ws = getWindowState(event);
  if (!ws || !ws.activeTabId) return;
  const tab = ws.tabs.find(t => t.id === ws.activeTabId);
  if (tab && tab.view) {
    const wc = tab.view.webContents;
    const canBack = wc.navigationHistory ? wc.navigationHistory.canGoBack() : wc.canGoBack();
    if (canBack) {
      if (wc.navigationHistory) wc.navigationHistory.goBack();
      else wc.goBack();
    }
  }
});

ipcMain.handle('tab:forward', (event) => {
  const ws = getWindowState(event);
  if (!ws || !ws.activeTabId) return;
  const tab = ws.tabs.find(t => t.id === ws.activeTabId);
  if (tab && tab.view) {
    const wc = tab.view.webContents;
    const canFwd = wc.navigationHistory ? wc.navigationHistory.canGoForward() : wc.canGoForward();
    if (canFwd) {
      if (wc.navigationHistory) wc.navigationHistory.goForward();
      else wc.goForward();
    }
  }
});

ipcMain.handle('tab:reload', (event) => {
  const ws = getWindowState(event);
  if (!ws || !ws.activeTabId) return;
  const tab = ws.tabs.find(t => t.id === ws.activeTabId);
  if (tab && tab.view) {
    tab.view.webContents.reload();
  }
});

ipcMain.on('window:minimize', (event) => {
  const ws = getWindowState(event);
  if (ws && ws.win && !ws.win.isDestroyed()) ws.win.minimize();
});

ipcMain.on('window:maximize', (event) => {
  const ws = getWindowState(event);
  if (ws && ws.win && !ws.win.isDestroyed()) {
    if (ws.win.isMaximized()) ws.win.unmaximize();
    else ws.win.maximize();
  }
});

ipcMain.on('window:close', (event) => {
  const ws = getWindowState(event);
  if (ws && ws.win && !ws.win.isDestroyed()) ws.win.close();
});

ipcMain.handle('panel:set-state', (event, isOpen) => {
  const ws = getWindowState(event);
  if (ws) {
    ws.isPanelOpen = Boolean(isOpen);
    updateActiveViewBounds(ws);
    return { success: true, isPanelOpen: ws.isPanelOpen };
  }
  return { success: false };
});

ipcMain.handle('chrome:set-dropdown-offset', (event, offset) => {
  const ws = getWindowState(event);
  if (ws) {
    ws.extraDropdownHeight = 0; // View offset is strictly 0 to preserve web background canvas
    return { success: true, extraDropdownHeight: 0 };
  }
  return { success: false };
});

function showAppMenu(ws, coords) {
  if (!ws || !ws.win || ws.win.isDestroyed()) return;
  const activeTab = ws.tabs.find(t => t.id === ws.activeTabId);
  const zoomFactor = (activeTab && activeTab.view && activeTab.view.webContents && !activeTab.view.webContents.isDestroyed())
    ? activeTab.view.webContents.getZoomFactor()
    : 1.0;
  const zoomPct = Math.round(zoomFactor * 100);

  const template = [
    {
      label: 'New Tab',
      accelerator: 'CmdOrCtrl+T',
      click: () => createTab(ws)
    },
    {
      label: 'New Window',
      accelerator: 'CmdOrCtrl+N',
      click: () => createBrowserWindow()
    },
    {
      label: 'New Incognito Window',
      accelerator: 'CmdOrCtrl+Shift+N',
      click: () => createBrowserWindow(true)
    },
    { type: 'separator' },
    {
      label: 'History',
      submenu: [
        {
          label: 'Show All History',
          accelerator: 'CmdOrCtrl+H',
          click: () => {
            if (ws.win && !ws.win.isDestroyed()) ws.win.webContents.send('menu:open-history');
          }
        },
        {
          label: 'Clear Browsing Data...',
          accelerator: 'CmdOrCtrl+Shift+Delete',
          click: () => {
            if (ws.win && !ws.win.isDestroyed()) ws.win.webContents.send('menu:clear-data');
          }
        }
      ]
    },
    {
      label: 'Bookmarks',
      submenu: [
        {
          label: 'Bookmark Current Tab',
          accelerator: 'CmdOrCtrl+D',
          click: () => {
            if (ws.win && !ws.win.isDestroyed()) ws.win.webContents.send('menu:bookmark-tab');
          }
        },
        {
          label: 'Show Bookmarks Bar',
          accelerator: 'CmdOrCtrl+Shift+B',
          type: 'checkbox',
          checked: ws.isBookmarksBarVisible,
          click: (item) => {
            ws.isBookmarksBarVisible = item.checked;
            settings.showBookmarksBar = item.checked;
            saveJSON(SETTINGS_FILE, settings);
            updateActiveViewBounds(ws);
            if (ws.win && !ws.win.isDestroyed()) {
              ws.win.webContents.send('settings:changed', settings);
            }
          }
        },
        {
          label: 'Manage Bookmarks',
          click: () => {
            if (ws.win && !ws.win.isDestroyed()) ws.win.webContents.send('menu:open-bookmarks');
          }
        }
      ]
    },
    {
      label: 'Downloads',
      accelerator: 'CmdOrCtrl+J',
      click: () => {
        if (ws.win && !ws.win.isDestroyed()) ws.win.webContents.send('menu:open-downloads');
      }
    },
    {
      label: 'Passwords & Vault',
      click: () => {
        if (ws.win && !ws.win.isDestroyed()) ws.win.webContents.send('menu:open-passwords');
      }
    },
    {
      label: 'Extensions and Themes',
      accelerator: 'CmdOrCtrl+Shift+F',
      click: () => {
        if (ws.win && !ws.win.isDestroyed()) ws.win.webContents.send('menu:open-extensions');
      }
    },
    { type: 'separator' },
    {
      label: 'Print...',
      accelerator: 'CmdOrCtrl+P',
      click: () => {
        if (activeTab && activeTab.view && activeTab.view.webContents && !activeTab.view.webContents.isDestroyed()) {
          activeTab.view.webContents.print();
        }
      }
    },
    {
      label: 'Save Page As...',
      accelerator: 'CmdOrCtrl+S',
      click: () => {
        if (activeTab && activeTab.view && activeTab.view.webContents && !activeTab.view.webContents.isDestroyed()) {
          activeTab.view.webContents.savePage('page.html', 'HTMLComplete').catch(() => {});
        }
      }
    },
    {
      label: 'Find in Page...',
      accelerator: 'CmdOrCtrl+F',
      click: () => {
        if (ws.win && !ws.win.isDestroyed()) ws.win.webContents.send('menu:find-in-page');
      }
    },
    {
      label: 'Split View (Dual Pane)',
      accelerator: 'CmdOrCtrl+Alt+S',
      type: 'checkbox',
      checked: Boolean(ws.splitTabId),
      click: () => toggleSplitView(ws)
    },
    { type: 'separator' },
    {
      label: `Zoom (${zoomPct}%)`,
      submenu: [
        {
          label: 'Zoom In (+)',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => {
            if (activeTab && activeTab.view && activeTab.view.webContents && !activeTab.view.webContents.isDestroyed()) {
              const current = activeTab.view.webContents.getZoomFactor();
              activeTab.view.webContents.setZoomFactor(Math.min(3.0, current + 0.1));
            }
          }
        },
        {
          label: 'Zoom Out (-)',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            if (activeTab && activeTab.view && activeTab.view.webContents && !activeTab.view.webContents.isDestroyed()) {
              const current = activeTab.view.webContents.getZoomFactor();
              activeTab.view.webContents.setZoomFactor(Math.max(0.3, current - 0.1));
            }
          }
        },
        {
          label: 'Reset Zoom (100%)',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            if (activeTab && activeTab.view && activeTab.view.webContents && !activeTab.view.webContents.isDestroyed()) {
              activeTab.view.webContents.setZoomFactor(1.0);
            }
          }
        },
        {
          label: 'Toggle Full Screen',
          accelerator: 'F11',
          click: () => {
            if (ws.win && !ws.win.isDestroyed()) {
              ws.win.setFullScreen(!ws.win.isFullScreen());
            }
          }
        }
      ]
    },
    {
      label: 'Privacy Shield (Block Trackers)',
      type: 'checkbox',
      checked: true,
      click: () => {
        if (ws.win && !ws.win.isDestroyed()) ws.win.webContents.send('menu:toggle-shield');
      }
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        if (ws.win && !ws.win.isDestroyed()) ws.win.webContents.send('menu:open-settings');
      }
    },
    {
      label: 'Help and About',
      submenu: [
        {
          label: 'About Hell Fire',
          click: () => {
            if (ws.win && !ws.win.isDestroyed()) ws.win.webContents.send('menu:about');
          }
        },
        {
          label: 'Official GitHub Repository',
          click: () => shell.openExternal('https://github.com/asutosh01/hellfire')
        },
        {
          label: 'Privacy Architecture',
          click: () => createTab(ws, 'about:newtab')
        }
      ]
    },
    { type: 'separator' },
    {
      label: 'Exit Hell Fire',
      accelerator: 'Alt+F4',
      click: () => app.quit()
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  const popupOptions = { window: ws.win };
  if (coords && typeof coords.x === 'number' && typeof coords.y === 'number') {
    popupOptions.x = Math.round(coords.x);
    popupOptions.y = Math.round(coords.y);
  }
  menu.popup({
    ...popupOptions,
    callback: () => {
      if (ws.win && !ws.win.isDestroyed()) {
        ws.win.webContents.send('menu:closed');
      }
    }
  });
}

ipcMain.handle('menu:open-app-menu', (event, coords) => {
  const ws = getWindowState(event);
  if (!ws) return { success: false };
  showAppMenu(ws, coords);
  return { success: true };
});

ipcMain.handle('bookmarks-bar:set-state', (event, visible) => {
  const ws = getWindowState(event);
  if (ws) {
    ws.isBookmarksBarVisible = Boolean(visible);
    settings.showBookmarksBar = ws.isBookmarksBarVisible;
    saveJSON(SETTINGS_FILE, settings);
    updateActiveViewBounds(ws);
    return { success: true, isBookmarksBarVisible: ws.isBookmarksBarVisible };
  }
  return { success: false };
});

// History IPC
ipcMain.handle('history:get', (event, limit = 100) => {
  return history.slice(0, limit);
});

ipcMain.handle('history:search', (event, query) => {
  if (!query) return history.slice(0, 50);
  const q = query.toLowerCase();
  return history.filter(h => (h.title && h.title.toLowerCase().includes(q)) || (h.url && h.url.toLowerCase().includes(q))).slice(0, 50);
});

ipcMain.handle('history:remove', (event, id) => {
  history = history.filter(h => h.id !== id);
  saveJSON(HISTORY_FILE, history);
  return { success: true };
});

ipcMain.handle('history:clear', () => {
  history = [];
  saveJSON(HISTORY_FILE, history);
  for (const ws of windows.values()) {
    if (ws.win && !ws.win.isDestroyed()) {
      ws.win.webContents.send('history:updated', { count: 0 });
    }
  }
  return { success: true };
});

// Bookmarks IPC
ipcMain.handle('bookmarks:get', () => {
  return bookmarks;
});

ipcMain.handle('bookmarks:is-bookmarked', (event, targetUrl) => {
  return bookmarks.some(b => b.url === targetUrl);
});

ipcMain.handle('bookmarks:toggle', (event, item) => {
  const existingIdx = bookmarks.findIndex(b => b.url === item.url);
  let isBookmarked = false;
  if (existingIdx !== -1) {
    bookmarks.splice(existingIdx, 1);
    isBookmarked = false;
  } else {
    bookmarks.unshift({
      id: 'bm_' + Date.now(),
      url: item.url,
      title: item.title || item.url,
      favicon: item.favicon || '',
      timestamp: Date.now()
    });
    isBookmarked = true;
  }
  saveJSON(BOOKMARKS_FILE, bookmarks);
  for (const ws of windows.values()) {
    if (ws.win && !ws.win.isDestroyed()) {
      ws.win.webContents.send('bookmarks:updated', bookmarks);
      ws.win.webContents.send('bookmark:status', { url: item.url, isBookmarked });
    }
  }
  return { success: true, isBookmarked };
});

ipcMain.handle('bookmarks:remove', (event, targetUrl) => {
  bookmarks = bookmarks.filter(b => b.url !== targetUrl);
  saveJSON(BOOKMARKS_FILE, bookmarks);
  for (const ws of windows.values()) {
    if (ws.win && !ws.win.isDestroyed()) {
      ws.win.webContents.send('bookmarks:updated', bookmarks);
      if (ws.activeTabId) {
        const activeTab = ws.tabs.find(t => t.id === ws.activeTabId);
        if (activeTab && activeTab.url === targetUrl) {
          ws.win.webContents.send('bookmark:status', { url: targetUrl, isBookmarked: false });
        }
      }
    }
  }
  return { success: true };
});

function applyDnsResolver(st) {
  try {
    const providerKey = st?.dohProvider || 'cloudflare';
    const endpoint = st?.dohProviders?.[providerKey] || 'https://cloudflare-dns.com/dns-query';
    app.configureHostResolver({
      enableBuiltInResolver: true,
      secureDnsMode: 'secure',
      secureDnsServers: [endpoint]
    });
    console.log(`[DoH] Active secure DNS resolver applied: ${providerKey} (${endpoint})`);
  } catch (err) {
    console.warn('[DoH] Configuration warning:', err.message);
  }
}

// Settings IPC
ipcMain.handle('settings:get', () => {
  return settings;
});

// ─────────────────────────────────────────────────────────────
// HARDWARE-ENCRYPTED CREDENTIAL VAULT (Windows DPAPI safeStorage)
// ─────────────────────────────────────────────────────────────
ipcMain.handle('vault:save', async (event, data) => {
  if (!isAuthorizedChromeSender(event)) return { success: false, error: 'Unauthorized sender' };
  try {
    const raw = JSON.stringify(data || []);
    let canEncrypt = false;
    try {
      if (safeStorage) {
        if (typeof safeStorage.isAsyncEncryptionAvailable === 'function') {
          canEncrypt = await safeStorage.isAsyncEncryptionAvailable();
        } else if (typeof safeStorage.isEncryptionAvailable === 'function') {
          canEncrypt = safeStorage.isEncryptionAvailable();
        }
      }
    } catch (e) {
      canEncrypt = false;
    }

    if (canEncrypt) {
      let encrypted;
      if (typeof safeStorage.encryptStringAsync === 'function') {
        encrypted = await safeStorage.encryptStringAsync(raw);
      } else if (typeof safeStorage.encryptString === 'function') {
        encrypted = safeStorage.encryptString(raw);
      }
      if (encrypted) {
        fs.writeFileSync(VAULT_FILE, encrypted);
        return { success: true, encrypted: true };
      }
    }

    const b64 = Buffer.from(raw).toString('base64');
    fs.writeFileSync(VAULT_FILE, b64, 'utf-8');
    return { success: true, encrypted: false };
  } catch (err) {
    console.error('Error saving encrypted vault:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('vault:get', async (event) => {
  if (event && !isAuthorizedChromeSender(event)) return null;
  try {
    if (!fs.existsSync(VAULT_FILE)) return null;
    const buf = fs.readFileSync(VAULT_FILE);
    if (!buf || buf.length === 0) return [];

    let canEncrypt = false;
    try {
      if (safeStorage) {
        if (typeof safeStorage.isAsyncEncryptionAvailable === 'function') {
          canEncrypt = await safeStorage.isAsyncEncryptionAvailable();
        } else if (typeof safeStorage.isEncryptionAvailable === 'function') {
          canEncrypt = safeStorage.isEncryptionAvailable();
        }
      }
    } catch (e) {
      canEncrypt = false;
    }

    if (canEncrypt) {
      try {
        let decrypted;
        if (typeof safeStorage.decryptStringAsync === 'function') {
          decrypted = await safeStorage.decryptStringAsync(buf);
        } else if (typeof safeStorage.decryptString === 'function') {
          decrypted = safeStorage.decryptString(buf);
        }
        if (decrypted) return JSON.parse(decrypted);
      } catch (decErr) {
        try {
          const str = buf.toString('utf-8');
          const unb64 = Buffer.from(str, 'base64').toString('utf-8');
          return JSON.parse(unb64);
        } catch (e) {
          console.warn('[Vault] Corrupted cipher payload, resetting gracefully');
          return [];
        }
      }
    } else {
      try {
        const str = buf.toString('utf-8');
        const unb64 = Buffer.from(str, 'base64').toString('utf-8');
        return JSON.parse(unb64);
      } catch (e) {
        console.warn('[Vault] Corrupted base64 payload, resetting gracefully');
        return [];
      }
    }
  } catch (err) {
    console.error('Error reading encrypted vault:', err);
    return [];
  }
});

ipcMain.handle('settings:save', (event, newSettings) => {
  if (!isAuthorizedChromeSender(event)) return { success: false };
  settings = { ...settings, ...newSettings };
  saveJSON(SETTINGS_FILE, settings);
  applyDnsResolver(settings);
  for (const ws of windows.values()) {
    ws.isBookmarksBarVisible = settings.showBookmarksBar !== false;
    broadcastPrivacyStats(ws);
    updateActiveViewBounds(ws);
  }
  return { success: true, settings };
});

ipcMain.handle('settings:clear-data', async (event, options = {}) => {
  if (options.history) {
    history = [];
    saveJSON(HISTORY_FILE, history);
  }
  if (customSession) {
    if (options.cache) {
      await customSession.clearCache();
    }
    if (options.cookies || options.storage) {
      await customSession.clearStorageData({
        storages: options.cookies ? ['cookies', 'localstorage', 'indexdb', 'indexeddb', 'serviceworkers'] : ['cachestorage']
      });
    }
  }
  return { success: true };
});

ipcMain.handle('settings:export-backup', async (event) => {
  const ws = getWindowState(event);
  const backup = {
    app: 'Hell Fire',
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    settings,
    bookmarks,
    history
  };

  const { filePath } = await dialog.showSaveDialog(ws?.win || null, {
    title: 'Export Hell Fire Profile Backup',
    defaultPath: `hellfire-backup-${Date.now()}.json`,
    filters: [{ name: 'JSON Backup', extensions: ['json'] }]
  });

  if (filePath) {
    fs.writeFileSync(filePath, JSON.stringify(backup, null, 2), 'utf-8');
    return { success: true, filePath };
  }
  return { success: false, cancelled: true };
});

ipcMain.handle('settings:import-backup', async (event) => {
  const ws = getWindowState(event);
  const { filePaths } = await dialog.showOpenDialog(ws?.win || null, {
    title: 'Import Hell Fire Profile Backup',
    filters: [{ name: 'JSON Backup', extensions: ['json'] }],
    properties: ['openFile']
  });

  if (filePaths && filePaths.length > 0) {
    try {
      const raw = fs.readFileSync(filePaths[0], 'utf-8');
      const backup = JSON.parse(raw);
      if (backup.bookmarks && Array.isArray(backup.bookmarks)) {
        bookmarks = backup.bookmarks;
        saveJSON(BOOKMARKS_FILE, bookmarks);
      }
      if (backup.history && Array.isArray(backup.history)) {
        history = backup.history;
        saveJSON(HISTORY_FILE, history);
      }
      if (backup.settings) {
        settings = { ...settings, ...backup.settings };
        saveJSON(SETTINGS_FILE, settings);
        applyDnsResolver(settings);
      }
      for (const winS of windows.values()) {
        winS.isBookmarksBarVisible = settings.showBookmarksBar !== false;
        if (winS.win && !winS.win.isDestroyed()) {
          winS.win.webContents.send('bookmarks:updated', bookmarks);
          winS.win.webContents.send('history:updated', { count: history.length });
          winS.win.webContents.send('settings:loaded', settings);
          broadcastPrivacyStats(winS);
          updateActiveViewBounds(winS);
        }
      }
      return { success: true, countBookmarks: bookmarks.length, countHistory: history.length };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  return { success: false, cancelled: true };
});

ipcMain.handle('downloads:open-folder', () => {
  shell.openPath(app.getPath('downloads'));
  return { success: true };
});

let currentZoomFactor = 1.0;

ipcMain.handle('tab:zoom-in', (event) => {
  const ws = getWindowState(event);
  if (!ws) return 100;
  const activeTab = ws.tabs.find(t => t.id === ws.activeTabId);
  if (activeTab && activeTab.view && !activeTab.view.webContents.isDestroyed()) {
    currentZoomFactor = Math.min(Math.round((currentZoomFactor + 0.1) * 10) / 10, 3.0);
    activeTab.view.webContents.setZoomFactor(currentZoomFactor);
    return Math.round(currentZoomFactor * 100);
  }
  return 100;
});

ipcMain.handle('tab:zoom-out', (event) => {
  const ws = getWindowState(event);
  if (!ws) return 100;
  const activeTab = ws.tabs.find(t => t.id === ws.activeTabId);
  if (activeTab && activeTab.view && !activeTab.view.webContents.isDestroyed()) {
    currentZoomFactor = Math.max(Math.round((currentZoomFactor - 0.1) * 10) / 10, 0.3);
    activeTab.view.webContents.setZoomFactor(currentZoomFactor);
    return Math.round(currentZoomFactor * 100);
  }
  return 100;
});

ipcMain.handle('tab:zoom-reset', (event) => {
  const ws = getWindowState(event);
  if (!ws) return 100;
  const activeTab = ws.tabs.find(t => t.id === ws.activeTabId);
  if (activeTab && activeTab.view && !activeTab.view.webContents.isDestroyed()) {
    currentZoomFactor = 1.0;
    activeTab.view.webContents.setZoomFactor(1.0);
    return 100;
  }
  return 100;
});

ipcMain.handle('tab:get-zoom', () => {
  return Math.round(currentZoomFactor * 100);
});

ipcMain.handle('window:toggle-fullscreen', (event) => {
  const ws = getWindowState(event);
  if (ws && ws.win && !ws.win.isDestroyed()) {
    const isFS = ws.win.isFullScreen();
    ws.win.setFullScreen(!isFS);
    return !isFS;
  }
  return false;
});

ipcMain.handle('window:new-window', () => {
  createBrowserWindow({ isIncognito: false });
  return { success: true };
});

ipcMain.handle('window:new-incognito-window', () => {
  createBrowserWindow({ isIncognito: true });
  return { success: true };
});

ipcMain.handle('tab:print', (event) => {
  const ws = getWindowState(event);
  if (!ws) return { success: false };
  const activeTab = ws.tabs.find(t => t.id === ws.activeTabId);
  if (activeTab && activeTab.view && !activeTab.view.webContents.isDestroyed()) {
    activeTab.view.webContents.print();
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('tab:save-page', async (event) => {
  const ws = getWindowState(event);
  if (!ws) return { success: false };
  const activeTab = ws.tabs.find(t => t.id === ws.activeTabId);
  if (activeTab && activeTab.view && !activeTab.view.webContents.isDestroyed()) {
    try {
      const { filePath, canceled } = await dialog.showSaveDialog(ws.win, {
        title: 'Save Page As',
        defaultPath: (activeTab.title || 'webpage').replace(/[/\\?%*:|"<>]/g, '_') + '.html',
        filters: [{ name: 'HTML Files', extensions: ['html', 'htm'] }]
      });
      if (!canceled && filePath) {
        await activeTab.view.webContents.savePage(filePath, 'HTMLComplete');
        return { success: true, filePath };
      }
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
  return { success: false };
});

ipcMain.handle('window:devtools', (event) => {
  const ws = getWindowState(event);
  if (!ws) return { success: false };
  const activeTab = ws.tabs.find(t => t.id === ws.activeTabId);
  if (activeTab && activeTab.view && !activeTab.view.webContents.isDestroyed()) {
    activeTab.view.webContents.toggleDevTools();
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('app:exit', () => {
  app.quit();
});

ipcMain.handle('modal:set-open', (event, isOpen) => {
  const ws = getWindowState(event);
  if (!ws || !ws.win || ws.win.isDestroyed()) return { success: false };
  ws.isModalOpen = Boolean(isOpen);
  const activeTab = ws.tabs.find(t => t.id === ws.activeTabId);
  if (!activeTab || !activeTab.view) return { success: false };
  try {
    if (ws.isModalOpen) {
      ws.win.contentView.removeChildView(activeTab.view);
    } else {
      ws.win.contentView.addChildView(activeTab.view);
      updateActiveViewBounds(ws);
    }
    return { success: true, isModalOpen: ws.isModalOpen };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('app:get-task-manager-data', async (event) => {
  const ws = getWindowState(event);
  const metrics = (typeof app.getAppMetrics === 'function') ? app.getAppMetrics() : [];
  const tabsData = (ws?.tabs || []).map(t => {
    let pid = null;
    try {
      if (t.view && !t.view.webContents.isDestroyed()) {
        pid = t.view.webContents.getOSProcessId();
      }
    } catch (e) {}
    return {
      id: t.id,
      title: t.title || 'New Tab',
      url: t.url || '',
      isPinned: Boolean(t.isPinned),
      pid
    };
  });
  return {
    metrics,
    tabs: tabsData,
    mainPid: process.pid,
    memory: (typeof process.memoryUsage === 'function') ? process.memoryUsage() : null
  };
});

ipcMain.handle('app:kill-task', async (event, { tabId, pid } = {}) => {
  const ws = getWindowState(event);
  if (tabId && ws) {
    closeTab(ws, tabId);
    return { success: true };
  }
  if (pid && pid !== process.pid) {
    try {
      process.kill(pid);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
  return { success: false };
});

ipcMain.handle('tab:find-in-page', (event, text, forward = true) => {
  const ws = getWindowState(event);
  if (!ws) return { success: false };
  const activeTab = ws.tabs.find(t => t.id === ws.activeTabId);
  if (activeTab && activeTab.view && !activeTab.view.webContents.isDestroyed()) {
    if (!text) {
      activeTab.view.webContents.stopFindInPage('clearSelection');
      return { matches: 0 };
    }
    const reqId = activeTab.view.webContents.findInPage(text, { forward, findNext: true });
    return { success: true, reqId };
  }
  return { success: false };
});

ipcMain.handle('tab:stop-find', (event, action = 'clearSelection') => {
  const ws = getWindowState(event);
  if (!ws) return { success: false };
  const activeTab = ws.tabs.find(t => t.id === ws.activeTabId);
  if (activeTab && activeTab.view && !activeTab.view.webContents.isDestroyed()) {
    activeTab.view.webContents.stopFindInPage(action);
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('tab:toggle-mute', (event, tabId) => {
  return toggleMuteTab(event, tabId);
});

ipcMain.handle('tab:toggle-pin', (event, tabId) => {
  return togglePinTab(event, tabId);
});

ipcMain.handle('tab:duplicate', (event, tabId) => {
  return duplicateTab(event, tabId);
});

ipcMain.handle('tab:close-others', (event, tabId) => {
  return closeOtherTabs(event, tabId);
});

ipcMain.handle('tab:close-to-right', (event, tabId) => {
  return closeTabsToRight(event, tabId);
});

ipcMain.handle('tab:context-menu', (event, tabId) => {
  const ws = getWindowState(event);
  if (!ws) return;
  const targetTab = ws.tabs.find(t => t.id === tabId);
  if (!targetTab) return;

  const isMuted = targetTab.view && !targetTab.view.webContents.isDestroyed() ? targetTab.view.webContents.isAudioMuted() : false;
  const isPinned = !!targetTab.isPinned;

  const menuTemplate = [
    {
      label: isPinned ? 'Unpin Tab' : 'Pin Tab',
      click: () => togglePinTab(ws, tabId)
    },
    {
      label: isMuted ? 'Unmute Tab' : 'Mute Tab',
      enabled: !!targetTab.isPlayingAudio || isMuted,
      click: () => toggleMuteTab(ws, tabId)
    },
    {
      label: 'Duplicate Tab',
      click: () => duplicateTab(ws, tabId)
    },
    {
      label: ws.splitTabId === tabId ? 'Close Split View' : 'Split View with this Tab',
      enabled: ws.tabs.length > 1 && tabId !== ws.activeTabId,
      click: () => {
        if (ws.splitTabId === tabId) {
          if (targetTab.view && ws.win.contentView) {
            try { ws.win.contentView.removeChildView(targetTab.view); } catch (e) {}
          }
          ws.splitTabId = null;
        } else {
          ws.splitTabId = tabId;
        }
        updateActiveViewBounds(ws);
        if (ws.win && !ws.win.isDestroyed()) {
          ws.win.webContents.send('tab:split-state', {
            isSplit: Boolean(ws.splitTabId),
            activeTabId: ws.activeTabId,
            splitTabId: ws.splitTabId
          });
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Reload Tab',
      accelerator: 'CmdOrCtrl+R',
      click: () => {
        if (targetTab.view && !targetTab.view.webContents.isDestroyed()) {
          targetTab.view.webContents.reload();
        }
      }
    },
    {
      label: 'Close Tab',
      accelerator: 'CmdOrCtrl+W',
      enabled: !isPinned,
      click: () => closeTab(ws, tabId)
    },
    {
      label: 'Close Other Tabs',
      enabled: ws.tabs.length > 1,
      click: () => closeOtherTabs(ws, tabId)
    },
    {
      label: 'Close Tabs to the Right',
      enabled: ws.tabs.findIndex(t => t.id === tabId) < ws.tabs.length - 1,
      click: () => closeTabsToRight(ws, tabId)
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  menu.popup({ window: ws.win });
});

ipcMain.handle('shield:get-status', (event, tabId) => {
  const ws = getWindowState(event);
  if (!ws) return {};
  const targetId = tabId || ws.activeTabId;
  const tab = ws.tabs.find(t => t.id === targetId);
  return getShieldStatusForTab(ws, tab);
});

ipcMain.handle('shield:toggle', (event, { domain, enabled, reload, global } = {}) => {
  const ws = getWindowState(event);
  if (global !== undefined) {
    settings.shieldEnabled = !!global;
  }
  if (domain && domain !== 'internal') {
    if (!Array.isArray(settings.disabledShieldDomains)) {
      settings.disabledShieldDomains = [];
    }
    const idx = settings.disabledShieldDomains.indexOf(domain);
    if (enabled) {
      if (idx !== -1) settings.disabledShieldDomains.splice(idx, 1);
    } else {
      if (idx === -1) settings.disabledShieldDomains.push(domain);
    }
  }
  saveJSON(SETTINGS_FILE, settings);

  if (ws) {
    const activeTab = ws.tabs.find(t => t.id === ws.activeTabId);
    if (activeTab) {
      broadcastShieldStatusForTab(ws, activeTab);
      if (reload && activeTab.view && activeTab.view.webContents && !activeTab.view.webContents.isDestroyed()) {
        activeTab.view.webContents.reload();
      }
    }
    return getShieldStatusForTab(ws, activeTab);
  }
  return {};
});

ipcMain.handle('tab:split-toggle', (event, targetTabId) => {
  const ws = getWindowState(event);
  if (!ws) return { success: false, isSplit: false };

  let targetId = targetTabId;
  if (!targetId) {
    const candidate = ws.tabs.find(t => t.id !== ws.activeTabId);
    if (candidate) targetId = candidate.id;
  }

  if (ws.splitTabId === targetId || (!targetId && ws.splitTabId)) {
    if (ws.splitTabId) {
      const splitTab = ws.tabs.find(t => t.id === ws.splitTabId);
      if (splitTab && splitTab.view && ws.win.contentView) {
        try { ws.win.contentView.removeChildView(splitTab.view); } catch (e) {}
      }
      ws.splitTabId = null;
    }
  } else if (targetId && targetId !== ws.activeTabId) {
    ws.splitTabId = targetId;
  }

  updateActiveViewBounds(ws);
  if (ws.win && !ws.win.isDestroyed()) {
    ws.win.webContents.send('tab:split-state', {
      isSplit: Boolean(ws.splitTabId),
      activeTabId: ws.activeTabId,
      splitTabId: ws.splitTabId
    });
  }
  return {
    success: true,
    isSplit: Boolean(ws.splitTabId),
    splitTabId: ws.splitTabId
  };
});

ipcMain.handle('tab:split-close', (event) => {
  const ws = getWindowState(event);
  if (!ws) return { success: false, isSplit: false };
  if (ws.splitTabId) {
    const splitTab = ws.tabs.find(t => t.id === ws.splitTabId);
    if (splitTab && splitTab.view && ws.win.contentView) {
      try { ws.win.contentView.removeChildView(splitTab.view); } catch (e) {}
    }
    ws.splitTabId = null;
    updateActiveViewBounds(ws);
    if (ws.win && !ws.win.isDestroyed()) {
      ws.win.webContents.send('tab:split-state', {
        isSplit: false,
        activeTabId: ws.activeTabId,
        splitTabId: null
      });
    }
  }
  return { success: true, isSplit: false, splitTabId: null };
});

ipcMain.handle('tab:split-state', (event) => {
  const ws = getWindowState(event);
  if (!ws) return { isSplit: false, splitTabId: null };
  return {
    isSplit: Boolean(ws.splitTabId),
    activeTabId: ws.activeTabId,
    splitTabId: ws.splitTabId
  };
});

ipcMain.handle('glance:open', (event, targetUrl) => {
  const ws = getWindowState(event);
  if (!ws || !targetUrl) return { success: false };

  if (ws.glanceView) {
    try {
      if (ws.win.contentView) ws.win.contentView.removeChildView(ws.glanceView);
      if (ws.glanceView.webContents && !ws.glanceView.webContents.isDestroyed()) {
        ws.glanceView.webContents.close();
      }
    } catch (e) {}
    ws.glanceView = null;
  }

  const glanceView = new WebContentsView({
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  ws.glanceView = glanceView;
  ws.win.contentView.addChildView(glanceView);
  updateActiveViewBounds(ws);

  let formattedUrl = String(targetUrl).trim();
  try {
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }
    new URL(formattedUrl);
  } catch (e) {
    formattedUrl = 'https://' + formattedUrl;
  }

  glanceView.webContents.loadURL(formattedUrl).catch(() => {});

  if (ws.win && !ws.win.isDestroyed()) {
    ws.win.webContents.send('glance:state', {
      isOpen: true,
      url: formattedUrl
    });
  }

  return { success: true, isOpen: true, url: formattedUrl };
});

ipcMain.handle('glance:close', (event) => {
  const ws = getWindowState(event);
  if (!ws) return { success: false, isOpen: false };
  if (ws.glanceView) {
    try {
      if (ws.win.contentView) ws.win.contentView.removeChildView(ws.glanceView);
      if (ws.glanceView.webContents && !ws.glanceView.webContents.isDestroyed()) {
        ws.glanceView.webContents.close();
      }
    } catch (e) {}
    ws.glanceView = null;
    updateActiveViewBounds(ws);
    if (ws.win && !ws.win.isDestroyed()) {
      ws.win.webContents.send('glance:state', { isOpen: false, url: null });
    }
  }
  return { success: true, isOpen: false };
});

ipcMain.handle('app:get-initial-state', (event) => {
  const ws = getWindowState(event);
  if (!ws) return {};
  const activeTab = ws.tabs.find(t => t.id === ws.activeTabId);
  return {
    isIncognito: Boolean(ws.isIncognito),
    tabs: ws.tabs.map(t => ({
      id: t.id,
      url: t.url,
      title: t.title,
      favicon: t.favicon,
      isLoading: t.isLoading,
      isActive: t.id === ws.activeTabId,
      isPlayingAudio: !!t.isPlayingAudio,
      isMuted: !!t.isMuted,
      isPinned: !!t.isPinned
    })),
    activeTabId: ws.activeTabId,
    isSplit: Boolean(ws.splitTabId),
    splitTabId: ws.splitTabId,
    isGlanceOpen: Boolean(ws.glanceView),
    blockedTrackers: ws.blockedTrackersCount || blockedTrackersCount,
    shieldStatus: getShieldStatusForTab(ws, activeTab),
    settings,
    bookmarks,
    isBookmarksBarVisible: ws.isBookmarksBarVisible
  };
});

// WebRTC Privacy Hardening: prevent local LAN IP leaks
app.commandLine.appendSwitch('force-webrtc-ip-handling-policy', 'default_public_interface_only');

// Single-Instance Lock: prevents duplicate background processes & cache lockouts
const gotTheSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotTheSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    const ws = getActiveWindowState();
    const win = ws?.win || primaryWindow;
    if (win && !win.isDestroyed()) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  // App Startup
  app.whenReady().then(() => {
    applyDnsResolver(settings);
    createBrowserWindow({ isIncognito: false });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
