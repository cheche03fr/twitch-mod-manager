const { app, BrowserWindow, WebContentsView, ipcMain, shell, session, dialog } = require('electron');
const path = require('path');
const AuthManager = require('./authManager');
const TwitchService = require('./twitchService');
const localServer = require('./localServer');
const { PORT } = require('./config');
const { EventSubClient, hasModActionsScopes } = require('./eventSubClient');
const { fetchTwitchModLog } = require('./twitchModLog');

let mainWindow = null;
let appUrl = null; // adresse du serveur local, null s'il n'a pas démarré

const APP_WEB_PREFERENCES = {
  preload: path.join(__dirname, 'preload.js'),
  contextIsolation: true,
  nodeIntegration: false,
  webviewTag: true
};

// Onglets de chaînes : chaque onglet est une page de l'app posée dans la fenêtre principale,
// qui reste chargée (stream, chat) quand on passe à un autre onglet
const channelTabs = new Map(); // identifiant de chaîne -> WebContentsView
let activeTabId = null;
let tabBounds = null; // zone sous la barre d'onglets, mesurée par la page

// Les actions de modération vont à toutes les pages : chacune garde celles de sa chaîne
function sendToAllPages(channel, data) {
  [mainWindow, ...channelTabs.values()].forEach(owner => {
    if (owner && !owner.webContents.isDestroyed()) owner.webContents.send(channel, data);
  });
}

const modActionsClient = new EventSubClient({
  onAction: (data) => sendToAllPages('twitch:mod-action', data),
  onError: (broadcasterId, message) => {
    console.error(`EventSub ${broadcasterId} :`, message);
    sendToAllPages('twitch:mod-actions-error', { broadcasterId, message });
  }
});

function loadAppPage(webContents, query = '') {
  if (appUrl) return webContents.loadURL(`${appUrl}/${query}`);
  return webContents.loadFile(path.join(__dirname, 'renderer', 'index.html'), { search: query });
}

// Affiche l'onglet demandé (null : la liste des chaînes) ; le son des onglets cachés est coupé
function showChannelTab(broadcasterId) {
  activeTabId = channelTabs.has(broadcasterId) ? broadcasterId : null;
  channelTabs.forEach((view, id) => {
    const isActive = id === activeTabId;
    view.setVisible(isActive);
    view.webContents.setAudioMuted(!isActive);
    if (isActive) {
      if (tabBounds) view.setBounds(tabBounds);
      view.webContents.focus();
    }
  });
}

function openChannelTab(broadcasterId) {
  const existing = channelTabs.get(broadcasterId);
  if (existing) {
    existing.webContents.send('tabs:refocused'); // recharge l'historique, comme un nouveau clic sur Gérer
  } else {
    const view = new WebContentsView({ webPreferences: APP_WEB_PREFERENCES });
    view.setBackgroundColor('#0e0e10');
    view.webContents.on('will-navigate', (e, url) => {
      if (!isAppUrl(url)) e.preventDefault();
    });
    mainWindow.contentView.addChildView(view);
    channelTabs.set(broadcasterId, view);
    loadAppPage(view.webContents, `?channel=${broadcasterId}`);
  }
  showChannelTab(broadcasterId);
}

function closeChannelTab(broadcasterId) {
  const view = channelTabs.get(broadcasterId);
  if (!view) return;
  channelTabs.delete(broadcasterId);
  mainWindow?.contentView.removeChildView(view);
  view.webContents.close();
  if (activeTabId === broadcasterId) showChannelTab(null);
}

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
    webPreferences: APP_WEB_PREFERENCES
  });

  mainWindow.setMenuBarVisibility(false);

  // Supprimer les en-têtes qui empêchent l'intégration des iframes (Twitch Player & Chat),
  // uniquement pour les iframes Twitch : les autres réponses gardent leurs protections
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    if (details.resourceType !== 'subFrame' || !isTwitchUrl(details.url)) {
      callback({});
      return;
    }
    const responseHeaders = Object.assign({}, details.responseHeaders);
    delete responseHeaders['x-frame-options'];
    delete responseHeaders['X-Frame-Options'];
    delete responseHeaders['content-security-policy'];
    delete responseHeaders['Content-Security-Policy'];
    callback({ responseHeaders });
  });

  // Démarrer le serveur local pour avoir l'origine http://localhost:3000
  // (permettant aux embeds Twitch player & chat de fonctionner sans erreur de domaine)
  appUrl = await localServer.start();
  if (appUrl) {
    mainWindow.loadURL(appUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  }

  mainWindow.on('closed', () => {
    channelTabs.forEach(view => view.webContents.close());
    channelTabs.clear();
    activeTabId = null;
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

  // La fenêtre principale (qui a accès à electronAPI) ne doit jamais quitter l'app
  if (contents.getType() === 'window') {
    contents.on('will-navigate', (e, url) => {
      if (!isAppUrl(url)) e.preventDefault();
    });
  }

  // La webview (Mod View Twitch) n'a jamais de preload ni d'accès Node
  contents.on('will-attach-webview', (e, webPreferences, params) => {
    delete webPreferences.preload;
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    if (params.src && params.src !== 'about:blank' && !isTwitchUrl(params.src)) e.preventDefault();
  });
});

function isAppUrl(url) {
  return url.startsWith(`http://localhost:${PORT}/`) || url.startsWith('file://');
}

function isTwitchUrl(url) {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' && (hostname === 'twitch.tv' || hostname.endsWith('.twitch.tv'));
  } catch {
    return false;
  }
}

// Verrou d'instance unique pour éviter les conflits de processus et de cache
const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = mainWindow || BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(async () => {
    setupIpcHandlers();
    await createWindow();
    // La recherche de mise à jour est lancée par la page (app:check-updates), qui connaît le choix bêta

    app.on('activate', async () => {
      if (BrowserWindow.getAllWindows().length === 0) await createWindow();
    });
  });
}

/**
 * Mise à jour depuis les Releases de cheche03fr/twitch-mod-manager :
 * téléchargement en fond, puis une fenêtre demande si on installe.
 * beta = true : les pré-versions (tags v1.2.3-beta.1) sont aussi proposées.
 */
let autoUpdater = null;
let promptedVersion = null;

/**
 * manual = true (bouton des Paramètres) : la fenêtre d'installation est reproposée même après « Plus tard ».
 * Renvoie { updateAvailable, version } ; lève une erreur si GitHub est injoignable.
 */
async function checkForUpdates(beta, manual) {
  if (!autoUpdater) {
    autoUpdater = require('electron-updater').autoUpdater;
    autoUpdater.autoInstallOnAppQuit = false; // n'installe jamais sans accord
    autoUpdater.on('update-downloaded', promptInstall);
    autoUpdater.on('error', err => console.error('Mise à jour impossible:', err.message));
  }
  if (manual) promptedVersion = null;
  autoUpdater.allowPrerelease = beta;
  const result = await autoUpdater.checkForUpdates();
  return { updateAvailable: Boolean(result?.isUpdateAvailable), version: result?.updateInfo?.version || null };
}

async function promptInstall(info) {
  if (promptedVersion === info.version) return; // déjà proposée (nouvelle recherche après changement du choix bêta)
  promptedVersion = info.version;
  const { response } = await dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Mise à jour disponible',
    message: `La version ${info.version} de Twitch Mod Manager est disponible.`,
    detail: `Version actuelle : ${app.getVersion()}\n\nVoulez-vous l'installer maintenant ? L'application va redémarrer.`,
    buttons: ['Installer maintenant', 'Plus tard'],
    defaultId: 0,
    cancelId: 1
  });
  if (response === 0) autoUpdater.quitAndInstall();
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
// Pseudo (avec ou sans @) ou identifiant numérique -> identifiant Twitch, null si introuvable
async function resolveTargetUserId(token, targetUser) {
  const value = String(targetUser || '').trim().replace(/^@/, '');
  if (!value) return null;
  if (/^\d+$/.test(value)) return value;
  const user = await TwitchService.getUserByLogin(token, value);
  return user ? user.id : null;
}

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
    modActionsClient.stop();
    return AuthManager.logout();
  });

  // Actions de modération en direct sur les chaînes modérées
  ipcMain.handle('twitch:start-mod-actions', async (event, broadcasterIds) => {
    const sessionData = AuthManager.getSession();
    if (!sessionData || !sessionData.token || !sessionData.userId) {
      return { success: false, error: 'Non authentifié' };
    }
    if (!Array.isArray(broadcasterIds) || !broadcasterIds.every(id => /^\d+$/.test(String(id)))) {
      return { success: false, error: 'Identifiants de chaînes invalides' };
    }

    try {
      const validation = await TwitchService.validateToken(sessionData.token);
      if (!hasModActionsScopes(validation.scopes || [])) {
        return { success: false, needsReconnect: true };
      }
      modActionsClient.start(sessionData.token, sessionData.userId, broadcasterIds.map(String));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Historique passé des actions de modération (comme la Mod View de twitch.tv)
  ipcMain.handle('twitch:load-mod-log', async (event, broadcasterId) => {
    if (!/^\d+$/.test(String(broadcasterId))) {
      return { success: false, error: 'Identifiant de chaîne invalide' };
    }
    try {
      return await fetchTwitchModLog(session, broadcasterId);
    } catch (err) {
      console.error('Historique Twitch indisponible :', err.message);
      return { success: false, error: err.message };
    }
  });

  // 4. Charger les chaînes modérées
  ipcMain.handle('twitch:load-channels', async () => {
    const sessionData = AuthManager.getSession();
    if (!sessionData || !sessionData.token || !sessionData.userId) {
      return { success: false, error: 'Non authentifié' };
    }

    try {
      const moderated = await TwitchService.getModeratedChannels(sessionData.token, sessionData.userId);
      // Sa propre chaîne en premier (Twitch ne la compte pas parmi les chaînes modérées)
      const ownChannel = {
        broadcaster_id: sessionData.userId,
        broadcaster_login: sessionData.login,
        broadcaster_name: sessionData.login
      };
      const rawChannels = [ownChannel, ...moderated.filter(c => c.broadcaster_id !== sessionData.userId)];
      const enrichedChannels = (await TwitchService.enrichChannelsData(sessionData.token, rawChannels))
        .map(c => ({ ...c, isOwn: c.id === sessionData.userId }));

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
      const targetUserId = await resolveTargetUserId(sessionData.token, targetUser);
      if (!targetUserId) {
        return { success: false, error: `Utilisateur "${targetUser}" introuvable sur Twitch.` };
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

  // 8 bis. Levée d'un ban ou d'un timeout
  ipcMain.handle('twitch:unban-user', async (event, broadcasterId, targetUser) => {
    const sessionData = AuthManager.getSession();
    if (!sessionData || !sessionData.token || !sessionData.userId) {
      return { success: false, error: 'Non authentifié' };
    }
    if (!/^\d+$/.test(String(broadcasterId))) {
      return { success: false, error: 'Identifiant de chaîne invalide' };
    }

    try {
      const targetUserId = await resolveTargetUserId(sessionData.token, targetUser);
      if (!targetUserId) {
        return { success: false, error: `Utilisateur "${targetUser}" introuvable sur Twitch.` };
      }
      await TwitchService.unbanUser(sessionData.token, broadcasterId, sessionData.userId, targetUserId);
      return { success: true };
    } catch (err) {
      // 400 : la personne n'est ni bannie ni exclue sur cette chaîne
      if (/\(400\)/.test(err.message)) return { success: false, error: 'Cette personne n\'est ni bannie ni exclue sur cette chaîne.' };
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
  // Recherche de mise à jour, voie bêta ou normale (rien en développement)
  ipcMain.handle('app:check-updates', async (event, beta, manual) => {
    if (!app.isPackaged) return { success: false, error: 'version de développement' };
    try {
      const result = await checkForUpdates(beta === true, manual === true);
      return { success: true, ...result };
    } catch (err) {
      console.error('Mise à jour impossible:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Infos de l'application (pied de page)
  ipcMain.handle('app:get-info', async () => {
    let buildDate = null;
    if (app.isPackaged) {
      try {
        buildDate = require('./build-info.json').buildDate; // créé par "npm run dist"
      } catch (e) {
        console.error('build-info.json introuvable:', e.message);
      }
    }
    return { version: app.getVersion(), buildDate, isPackaged: app.isPackaged };
  });

  // Onglets de chaînes, pilotés uniquement par la page de la fenêtre principale
  const fromMainPage = (event) => mainWindow && event.sender === mainWindow.webContents;
  const isChannelId = (id) => /^\d+$/.test(String(id));

  ipcMain.handle('tabs:open', async (event, broadcasterId) => {
    if (!fromMainPage(event) || !isChannelId(broadcasterId)) return { success: false, error: 'Onglet invalide' };
    openChannelTab(String(broadcasterId));
    return { success: true };
  });

  ipcMain.handle('tabs:select', async (event, broadcasterId) => {
    if (!fromMainPage(event) || (broadcasterId !== null && !isChannelId(broadcasterId))) return { success: false, error: 'Onglet invalide' };
    showChannelTab(broadcasterId === null ? null : String(broadcasterId));
    return { success: true };
  });

  ipcMain.handle('tabs:close', async (event, broadcasterId) => {
    if (!fromMainPage(event) || !isChannelId(broadcasterId)) return { success: false, error: 'Onglet invalide' };
    closeChannelTab(String(broadcasterId));
    return { success: true };
  });

  ipcMain.handle('tabs:set-bounds', async (event, bounds) => {
    const keys = ['x', 'y', 'width', 'height'];
    if (!fromMainPage(event) || !bounds || !keys.every(k => Number.isFinite(bounds[k]) && bounds[k] >= 0)) {
      return { success: false, error: 'Zone invalide' };
    }
    tabBounds = Object.fromEntries(keys.map(k => [k, Math.round(bounds[k])]));
    if (activeTabId) channelTabs.get(activeTabId)?.setBounds(tabBounds);
    return { success: true };
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
