const { app, BrowserWindow, ipcMain, shell, session } = require('electron');
const path = require('path');
const AuthManager = require('./authManager');
const TwitchService = require('./twitchService');
const localServer = require('./localServer');

let mainWindow = null;

async function createWindow() {
  const iconPath = process.platform === 'win32'
    ? path.join(__dirname, '..', 'assets', 'icon.ico')
    : path.join(__dirname, '..', 'assets', 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1320,
    height: 870,
    minWidth: 950,
    minHeight: 650,
    backgroundColor: '#0e0e10',
    title: 'Twitch Mod Manager',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
    }
  });

  mainWindow.setMenuBarVisibility(false);

  // Supprimer les en-têtes qui empêchent l'intégration des iframes (Twitch Player & Chat)
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = Object.assign({}, details.responseHeaders);
    delete responseHeaders['x-frame-options'];
    delete responseHeaders['X-Frame-Options'];
    delete responseHeaders['content-security-policy'];
    delete responseHeaders['Content-Security-Policy'];
    callback({ responseHeaders });
  });

  // Démarrer le serveur local pour avoir l'origine http://localhost:3000
  // (permettant aux embeds Twitch player & chat de fonctionner sans erreur de domaine)
  const localUrl = await localServer.start();
  if (localUrl) {
    mainWindow.loadURL(localUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Empêcher les ouvertures de liens non désirées dans la fenêtre Electron
app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
});

// Verrou d'instance unique pour éviter les conflits de processus et de cache
const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    setupIpcHandlers();
    await createWindow();

    app.on('activate', async () => {
      if (BrowserWindow.getAllWindows().length === 0) await createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  localServer.stop();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * Configuration de la communication IPC sécurisée
 */
function setupIpcHandlers() {
  // 1. Vérification de la session
  ipcMain.handle('auth:check-session', async () => {
    const sessionData = AuthManager.getSession();
    if (!sessionData || !sessionData.token) {
      return { authenticated: false };
    }

    try {
      const validation = await TwitchService.validateToken(sessionData.token);
      const user = await TwitchService.getUserInfo(sessionData.token, validation.user_id);
      return {
        authenticated: true,
        user: {
          id: validation.user_id,
          login: validation.login,
          displayName: user?.display_name || validation.login,
          profileImageUrl: user?.profile_image_url || '',
          scopes: validation.scopes || []
        }
      };
    } catch (err) {
      console.warn('Session expirée ou invalide:', err.message);
      AuthManager.logout();
      return { authenticated: false, error: err.message };
    }
  });

  // 2. Connexion Twitch
  ipcMain.handle('auth:login', async () => {
    try {
      const token = await AuthManager.startOAuthFlow();
      const validation = await TwitchService.validateToken(token);
      const user = await TwitchService.getUserInfo(token, validation.user_id);

      AuthManager.saveSession({
        token,
        userId: validation.user_id,
        login: validation.login
      });

      return {
        success: true,
        user: {
          id: validation.user_id,
          login: validation.login,
          displayName: user?.display_name || validation.login,
          profileImageUrl: user?.profile_image_url || '',
          scopes: validation.scopes || []
        }
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // 3. Déconnexion
  ipcMain.handle('auth:logout', async () => {
    return AuthManager.logout();
  });

  // 4. Charger les chaînes modérées
  ipcMain.handle('twitch:load-channels', async () => {
    const sessionData = AuthManager.getSession();
    if (!sessionData || !sessionData.token || !sessionData.userId) {
      return { success: false, error: 'Non authentifié' };
    }

    try {
      const rawChannels = await TwitchService.getModeratedChannels(sessionData.token, sessionData.userId);
      const enrichedChannels = await TwitchService.enrichChannelsData(sessionData.token, rawChannels);

      return {
        success: true,
        total: enrichedChannels.length,
        channels: enrichedChannels
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // 5. Droits de modération
  ipcMain.handle('twitch:get-moderation-rights', async (event, broadcasterId) => {
    const sessionData = AuthManager.getSession();
    if (!sessionData || !sessionData.token || !sessionData.userId) {
      return { success: false, error: 'Non authentifié' };
    }

    try {
      const rights = await TwitchService.checkModerationRights(sessionData.token, broadcasterId, sessionData.userId);
      return { success: true, rights };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // 6. Paramètres du chat
  ipcMain.handle('twitch:get-chat-settings', async (event, broadcasterId) => {
    const sessionData = AuthManager.getSession();
    if (!sessionData || !sessionData.token || !sessionData.userId) {
      return { success: false, error: 'Non authentifié' };
    }

    try {
      const settings = await TwitchService.getChatSettings(sessionData.token, broadcasterId, sessionData.userId);
      return { success: true, settings };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('twitch:update-chat-settings', async (event, broadcasterId, settings) => {
    const sessionData = AuthManager.getSession();
    if (!sessionData || !sessionData.token || !sessionData.userId) {
      return { success: false, error: 'Non authentifié' };
    }

    try {
      const updated = await TwitchService.updateChatSettings(sessionData.token, broadcasterId, sessionData.userId, settings);
      return { success: true, settings: updated };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // 7. Spectateurs dans le chat
  ipcMain.handle('twitch:get-chatters', async (event, broadcasterId) => {
    const sessionData = AuthManager.getSession();
    if (!sessionData || !sessionData.token || !sessionData.userId) {
      return { success: false, error: 'Non authentifié' };
    }

    try {
      const data = await TwitchService.getChatters(sessionData.token, broadcasterId, sessionData.userId);
      return { success: true, total: data.total, chatters: data.chatters };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // 8. Sanctions (Ban / Timeout)
  ipcMain.handle('twitch:ban-user', async (event, broadcasterId, { targetUser, duration, reason }) => {
    const sessionData = AuthManager.getSession();
    if (!sessionData || !sessionData.token || !sessionData.userId) {
      return { success: false, error: 'Non authentifié' };
    }

    try {
      let targetUserId = targetUser;
      if (!/^\d+$/.test(targetUser)) {
        const user = await TwitchService.getUserByLogin(sessionData.token, targetUser);
        if (!user) {
          return { success: false, error: `Utilisateur "${targetUser}" introuvable sur Twitch.` };
        }
        targetUserId = user.id;
      }

      const result = await TwitchService.banOrTimeoutUser(sessionData.token, broadcasterId, sessionData.userId, {
        targetUserId,
        duration,
        reason
      });

      return { success: true, result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // 9. Purge du chat
  ipcMain.handle('twitch:clear-chat', async (event, broadcasterId) => {
    const sessionData = AuthManager.getSession();
    if (!sessionData || !sessionData.token || !sessionData.userId) {
      return { success: false, error: 'Non authentifié' };
    }

    try {
      await TwitchService.clearChat(sessionData.token, broadcasterId, sessionData.userId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // 10. Mode bouclier
  ipcMain.handle('twitch:toggle-shield-mode', async (event, broadcasterId, isActive) => {
    const sessionData = AuthManager.getSession();
    if (!sessionData || !sessionData.token || !sessionData.userId) {
      return { success: false, error: 'Non authentifié' };
    }

    try {
      const result = await TwitchService.updateShieldMode(sessionData.token, broadcasterId, sessionData.userId, isActive);
      return { success: true, result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // 11. Résoudre utilisateur
  ipcMain.handle('twitch:resolve-user', async (event, login) => {
    const sessionData = AuthManager.getSession();
    if (!sessionData || !sessionData.token) {
      return { success: false, error: 'Non authentifié' };
    }

    try {
      const user = await TwitchService.getUserByLogin(sessionData.token, login);
      return { success: true, user };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ==========================================
  // IPC RÔLE ÉDITEUR DE CHAÎNE
  // ==========================================

  // Vérifier le statut éditeur
  ipcMain.handle('twitch:check-editor-rights', async (event, broadcasterId) => {
    const sessionData = AuthManager.getSession();
    if (!sessionData || !sessionData.token || !sessionData.userId) {
      return { success: false, error: 'Non authentifié' };
    }

    try {
      const result = await TwitchService.checkEditorRights(sessionData.token, broadcasterId, sessionData.userId);
      return { success: true, ...result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Récupérer les informations actuelles de la chaîne
  ipcMain.handle('twitch:get-channel-info', async (event, broadcasterId) => {
    const sessionData = AuthManager.getSession();
    if (!sessionData || !sessionData.token) {
      return { success: false, error: 'Non authentifié' };
    }

    try {
      const info = await TwitchService.getChannelInfo(sessionData.token, broadcasterId);
      return { success: true, info };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Modifier les informations du stream (titre, jeu, tags, langue)
  ipcMain.handle('twitch:modify-channel-info', async (event, broadcasterId, data) => {
    const sessionData = AuthManager.getSession();
    if (!sessionData || !sessionData.token) {
      return { success: false, error: 'Non authentifié' };
    }

    try {
      await TwitchService.modifyChannelInfo(sessionData.token, broadcasterId, data);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Recherche de catégories / jeux dans le catalogue Twitch
  ipcMain.handle('twitch:search-categories', async (event, query) => {
    const sessionData = AuthManager.getSession();
    if (!sessionData || !sessionData.token) {
      return { success: false, error: 'Non authentifié' };
    }

    try {
      const games = await TwitchService.searchCategories(sessionData.token, query);
      return { success: true, games };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Déclencher une coupure publicitaire
  ipcMain.handle('twitch:start-commercial', async (event, broadcasterId, length) => {
    const sessionData = AuthManager.getSession();
    if (!sessionData || !sessionData.token) {
      return { success: false, error: 'Non authentifié' };
    }

    try {
      const res = await TwitchService.startCommercial(sessionData.token, broadcasterId, length);
      return { success: true, result: res };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Créer un marqueur de stream
  ipcMain.handle('twitch:create-stream-marker', async (event, broadcasterId, description) => {
    const sessionData = AuthManager.getSession();
    if (!sessionData || !sessionData.token) {
      return { success: false, error: 'Non authentifié' };
    }

    try {
      const res = await TwitchService.createStreamMarker(sessionData.token, broadcasterId, description);
      return { success: true, marker: res };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });


  // Predictions
  ipcMain.handle('twitch:get-predictions', async (event, broadcasterId) => {
    const sessionData = AuthManager.getSession();
    if (!sessionData || !sessionData.token) return { success: false, error: 'Non authentifie' };
    try {
      const data = await TwitchService.getPredictions(sessionData.token, broadcasterId);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('twitch:create-prediction', async (event, broadcasterId, predData) => {
    const sessionData = AuthManager.getSession();
    if (!sessionData || !sessionData.token) return { success: false, error: 'Non authentifie' };
    try {
      const data = await TwitchService.createPrediction(sessionData.token, broadcasterId, predData);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('twitch:update-prediction', async (event, broadcasterId, predictionId, status, winningOutcomeId) => {
    const sessionData = AuthManager.getSession();
    if (!sessionData || !sessionData.token) return { success: false, error: 'Non authentifie' };
    try {
      const data = await TwitchService.updatePrediction(sessionData.token, broadcasterId, predictionId, status, winningOutcomeId);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  // Ouvrir un lien externe
  ipcMain.handle('util:open-external', async (event, url) => {
    if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
      await shell.openExternal(url);
      return { success: true };
    }
    return { success: false, error: 'URL invalide' };
  });
}
