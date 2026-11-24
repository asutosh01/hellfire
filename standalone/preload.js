const { contextBridge, ipcRenderer } = require('electron');

const ALLOWED_CHANNELS = [
  'tab:created',
  'tab:updated',
  'tab:closed',
  'tab:switched',
  'tab:list',
  'tab:audio-state',
  'nav:state',
  'privacy:stats',
  'window:state',
  'bookmark:status',
  'download:progress',
  'download:completed',
  'history:updated',
  'bookmarks:updated',
  'find:result',
  'shield:tab-status',
  'prompt:save-password',
  'prompt:save-address',
  'tab:split-state',
  'glance:state'
];

const api = {
  // Tab Management & Ergonomics
  createTab: (url) => ipcRenderer.invoke('tab:create', url),
  switchTab: (tabId) => ipcRenderer.invoke('tab:switch', tabId),
  closeTab: (tabId) => ipcRenderer.invoke('tab:close', tabId),
  toggleMuteTab: (tabId) => ipcRenderer.invoke('tab:toggle-mute', tabId),
  togglePinTab: (tabId) => ipcRenderer.invoke('tab:toggle-pin', tabId),
  duplicateTab: (tabId) => ipcRenderer.invoke('tab:duplicate', tabId),
  closeOtherTabs: (tabId) => ipcRenderer.invoke('tab:close-others', tabId),
  closeTabsToRight: (tabId) => ipcRenderer.invoke('tab:close-to-right', tabId),
  openTabContextMenu: (tabId) => ipcRenderer.invoke('tab:context-menu', tabId),
  
  // Split View Tiling (Zen-Inspired)
  toggleSplitView: (tabId) => ipcRenderer.invoke('tab:split-toggle', tabId),
  closeSplitView: () => ipcRenderer.invoke('tab:split-close'),
  getSplitState: () => ipcRenderer.invoke('tab:split-state'),

  // Link Glance (Zen-Inspired Ephemeral Preview)
  openGlance: (url) => ipcRenderer.invoke('glance:open', url),
  closeGlance: () => ipcRenderer.invoke('glance:close'),
  
  // Navigation
  navigate: (url) => ipcRenderer.invoke('tab:navigate', url),
  goBack: () => ipcRenderer.invoke('tab:back'),
  goForward: () => ipcRenderer.invoke('tab:forward'),
  reload: () => ipcRenderer.invoke('tab:reload'),

  // Window Controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),

  // Layout & Panel Synchronization
  setPanelState: (isOpen) => ipcRenderer.invoke('panel:set-state', isOpen),
  setModalOpen: (isOpen) => ipcRenderer.invoke('modal:set-open', isOpen),
  setBookmarksBarVisible: (visible) => ipcRenderer.invoke('bookmarks-bar:set-state', visible),
  setDropdownOffset: (offset) => ipcRenderer.invoke('chrome:set-dropdown-offset', offset),

  // History Management
  getHistory: (limit) => ipcRenderer.invoke('history:get', limit),
  searchHistory: (query) => ipcRenderer.invoke('history:search', query),
  removeHistoryItem: (id) => ipcRenderer.invoke('history:remove', id),
  clearHistory: () => ipcRenderer.invoke('history:clear'),

  // Bookmarks Management
  getBookmarks: () => ipcRenderer.invoke('bookmarks:get'),
  isBookmarked: (url) => ipcRenderer.invoke('bookmarks:is-bookmarked', url),
  toggleBookmark: (item) => ipcRenderer.invoke('bookmarks:toggle', item),
  removeBookmark: (url) => ipcRenderer.invoke('bookmarks:remove', url),

  // Settings Management
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  clearBrowsingData: (options) => ipcRenderer.invoke('settings:clear-data', options),
  exportProfileBackup: () => ipcRenderer.invoke('settings:export-backup'),
  importProfileBackup: (jsonContent) => ipcRenderer.invoke('settings:import-backup', jsonContent),

  // Encrypted Credential Vault (Windows DPAPI)
  saveVault: (data) => ipcRenderer.invoke('vault:save', data),
  getVault: () => ipcRenderer.invoke('vault:get'),

  // Downloads & System
  openDownloadsFolder: () => ipcRenderer.invoke('downloads:open-folder'),

  // Application Menu & Window Commands
  zoomIn: () => ipcRenderer.invoke('tab:zoom-in'),
  zoomOut: () => ipcRenderer.invoke('tab:zoom-out'),
  zoomReset: () => ipcRenderer.invoke('tab:zoom-reset'),
  getZoom: () => ipcRenderer.invoke('tab:get-zoom'),
  toggleFullScreen: () => ipcRenderer.invoke('window:toggle-fullscreen'),
  newWindow: () => ipcRenderer.invoke('window:new-window'),
  newIncognitoWindow: () => ipcRenderer.invoke('window:new-incognito-window'),
  printPage: () => ipcRenderer.invoke('tab:print'),
  savePageAs: () => ipcRenderer.invoke('tab:save-page'),
  toggleDevTools: () => ipcRenderer.invoke('window:devtools'),
  exitApp: () => ipcRenderer.invoke('app:exit'),
  getTaskManagerData: () => ipcRenderer.invoke('app:get-task-manager-data'),
  killTask: (params) => ipcRenderer.invoke('app:kill-task', params),
  findInPage: (text, forward) => ipcRenderer.invoke('tab:find-in-page', text, forward),
  stopFind: (action) => ipcRenderer.invoke('tab:stop-find', action),

  // Initial State Query
  getInitialState: () => ipcRenderer.invoke('app:get-initial-state'),

  // Shield & Tracker Blocker Controls
  getShieldStatus: (tabId) => ipcRenderer.invoke('shield:get-status', tabId),
  toggleShield: (params) => ipcRenderer.invoke('shield:toggle', params),

  // Safe Event Subscription
  on: (channel, listener) => {
    if (ALLOWED_CHANNELS.includes(channel)) {
      const subscription = (event, ...args) => listener(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    }
  }
};

contextBridge.exposeInMainWorld('privateFox', api);
contextBridge.exposeInMainWorld('hellFire', api);
