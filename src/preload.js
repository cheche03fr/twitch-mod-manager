const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Authentification et session
  login: () => ipcRenderer.invoke('auth:login'),
  logout: () => ipcRenderer.invoke('auth:logout'),
  checkSession: () => ipcRenderer.invoke('auth:check-session'),

  // Données des chaînes
  loadChannels: () => ipcRenderer.invoke('twitch:load-channels'),
  openExternal: (url) => ipcRenderer.invoke('util:open-external', url),

  // Onglets de chaînes
  openTab: (broadcasterId) => ipcRenderer.invoke('tabs:open', broadcasterId),
  selectTab: (broadcasterId) => ipcRenderer.invoke('tabs:select', broadcasterId),
  closeTab: (broadcasterId) => ipcRenderer.invoke('tabs:close', broadcasterId),
  setTabBounds: (bounds) => ipcRenderer.invoke('tabs:set-bounds', bounds),
  onTabRefocused: (callback) => ipcRenderer.on('tabs:refocused', () => callback()),

  getAppInfo: () => ipcRenderer.invoke('app:get-info'),
  checkForUpdates: (beta, manual = false, auto = false) => ipcRenderer.invoke('app:check-updates', beta, manual, auto),
  installUpdate: () => ipcRenderer.invoke('app:install-update'),
  onUpdateReady: (callback) => ipcRenderer.on('app:update-ready', (_e, data) => callback(data)),

  // Modération spécifique
  getModerationRights: (broadcasterId) => ipcRenderer.invoke('twitch:get-moderation-rights', broadcasterId),
  getChatSettings: (broadcasterId) => ipcRenderer.invoke('twitch:get-chat-settings', broadcasterId),
  updateChatSettings: (broadcasterId, settings) => ipcRenderer.invoke('twitch:update-chat-settings', broadcasterId, settings),
  getChatters: (broadcasterId) => ipcRenderer.invoke('twitch:get-chatters', broadcasterId),
  banUser: (broadcasterId, data) => ipcRenderer.invoke('twitch:ban-user', broadcasterId, data),
  unbanUser: (broadcasterId, targetUser) => ipcRenderer.invoke('twitch:unban-user', broadcasterId, targetUser),
  clearChat: (broadcasterId) => ipcRenderer.invoke('twitch:clear-chat', broadcasterId),
  toggleShieldMode: (broadcasterId, isActive) => ipcRenderer.invoke('twitch:toggle-shield-mode', broadcasterId, isActive),
  resolveUser: (login) => ipcRenderer.invoke('twitch:resolve-user', login),

  // Actions de modération Twitch en direct
  startModActions: (broadcasterIds) => ipcRenderer.invoke('twitch:start-mod-actions', broadcasterIds),
  loadModLog: (broadcasterId) => ipcRenderer.invoke('twitch:load-mod-log', broadcasterId),
  onModAction: (callback) => ipcRenderer.on('twitch:mod-action', (_e, data) => callback(data)),
  onModActionsError: (callback) => ipcRenderer.on('twitch:mod-actions-error', (_e, data) => callback(data)),

  // Chuchotements
  startWhispers: () => ipcRenderer.invoke('twitch:start-whispers'),
  getWhisperThreads: () => ipcRenderer.invoke('twitch:whisper-threads'),
  getWhisperThread: (threadId) => ipcRenderer.invoke('twitch:whisper-thread', threadId),
  sendWhisper: (targetUser, message) => ipcRenderer.invoke('twitch:send-whisper', targetUser, message),
  onWhisper: (callback) => ipcRenderer.on('twitch:whisper', (_e, data) => callback(data)),

  // Points de chaîne
  getRedemptions: (broadcasterId) => ipcRenderer.invoke('twitch:get-redemptions', broadcasterId),
  updateRedemptions: (broadcasterId, redemptionIds, status) => ipcRenderer.invoke('twitch:update-redemptions', broadcasterId, redemptionIds, status),

  // Rôle Éditeur de chaîne
  checkEditorRights: (broadcasterId) => ipcRenderer.invoke('twitch:check-editor-rights', broadcasterId),
  getChannelInfo: (broadcasterId) => ipcRenderer.invoke('twitch:get-channel-info', broadcasterId),
  modifyChannelInfo: (broadcasterId, data) => ipcRenderer.invoke('twitch:modify-channel-info', broadcasterId, data),
  searchCategories: (query) => ipcRenderer.invoke('twitch:search-categories', query),
  startCommercial: (broadcasterId, length) => ipcRenderer.invoke('twitch:start-commercial', broadcasterId, length),
  getAdCooldown: (login) => ipcRenderer.invoke('twitch:get-ad-cooldown', login),
  createStreamMarker: (broadcasterId, description) => ipcRenderer.invoke('twitch:create-stream-marker', broadcasterId, description),
  // Predictions
  getPredictions: (broadcasterId) => ipcRenderer.invoke('twitch:get-predictions', broadcasterId),
  createPrediction: (broadcasterId, data) => ipcRenderer.invoke('twitch:create-prediction', broadcasterId, data),
  updatePrediction: (broadcasterId, predictionId, status, winningOutcomeId) => ipcRenderer.invoke('twitch:update-prediction', broadcasterId, predictionId, status, winningOutcomeId)
});
