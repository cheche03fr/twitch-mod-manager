const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Authentification et session
  login: () => ipcRenderer.invoke('auth:login'),
  logout: () => ipcRenderer.invoke('auth:logout'),
  checkSession: () => ipcRenderer.invoke('auth:check-session'),

  // Données des chaînes
  loadChannels: () => ipcRenderer.invoke('twitch:load-channels'),
  openExternal: (url) => ipcRenderer.invoke('util:open-external', url),
  getAppInfo: () => ipcRenderer.invoke('app:get-info'),
  checkForUpdates: (beta, manual = false) => ipcRenderer.invoke('app:check-updates', beta, manual),

  // Modération spécifique
  getModerationRights: (broadcasterId) => ipcRenderer.invoke('twitch:get-moderation-rights', broadcasterId),
  getChatSettings: (broadcasterId) => ipcRenderer.invoke('twitch:get-chat-settings', broadcasterId),
  updateChatSettings: (broadcasterId, settings) => ipcRenderer.invoke('twitch:update-chat-settings', broadcasterId, settings),
  getChatters: (broadcasterId) => ipcRenderer.invoke('twitch:get-chatters', broadcasterId),
  banUser: (broadcasterId, data) => ipcRenderer.invoke('twitch:ban-user', broadcasterId, data),
  clearChat: (broadcasterId) => ipcRenderer.invoke('twitch:clear-chat', broadcasterId),
  toggleShieldMode: (broadcasterId, isActive) => ipcRenderer.invoke('twitch:toggle-shield-mode', broadcasterId, isActive),
  resolveUser: (login) => ipcRenderer.invoke('twitch:resolve-user', login),

  // Actions de modération Twitch en direct
  startModActions: (broadcasterIds) => ipcRenderer.invoke('twitch:start-mod-actions', broadcasterIds),
  loadModLog: (broadcasterId) => ipcRenderer.invoke('twitch:load-mod-log', broadcasterId),
  onModAction: (callback) => ipcRenderer.on('twitch:mod-action', (_e, data) => callback(data)),
  onModActionsError: (callback) => ipcRenderer.on('twitch:mod-actions-error', (_e, data) => callback(data)),

  // Rôle Éditeur de chaîne
  checkEditorRights: (broadcasterId) => ipcRenderer.invoke('twitch:check-editor-rights', broadcasterId),
  getChannelInfo: (broadcasterId) => ipcRenderer.invoke('twitch:get-channel-info', broadcasterId),
  modifyChannelInfo: (broadcasterId, data) => ipcRenderer.invoke('twitch:modify-channel-info', broadcasterId, data),
  searchCategories: (query) => ipcRenderer.invoke('twitch:search-categories', query),
  startCommercial: (broadcasterId, length) => ipcRenderer.invoke('twitch:start-commercial', broadcasterId, length),
  createStreamMarker: (broadcasterId, description) => ipcRenderer.invoke('twitch:create-stream-marker', broadcasterId, description),
  // Predictions
  getPredictions: (broadcasterId) => ipcRenderer.invoke('twitch:get-predictions', broadcasterId),
  createPrediction: (broadcasterId, data) => ipcRenderer.invoke('twitch:create-prediction', broadcasterId, data),
  updatePrediction: (broadcasterId, predictionId, status, winningOutcomeId) => ipcRenderer.invoke('twitch:update-prediction', broadcasterId, predictionId, status, winningOutcomeId)
});
