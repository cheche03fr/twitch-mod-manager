const { app, BrowserWindow, WebContentsView, ipcMain, shell, session } = require('electron');
const path = require('path');
const AuthManager = require('./authManager');
const TwitchService = require('./twitchService');
const localServer = require('./localServer');
const { PORT } = require('./config');
const { EventSubClient } = require('./eventSubClient');
const { registerTwitchIpc, isChannelId } = require('./ipcTwitch');
const updater = require('./updater');

let mainWindow = null;
let appUrl = null; // adresse du serveur local, null s'il n'a pas démarré

// Les pages Twitch (chat, Vue Twitch officielle) voient un Chrome ordinaire, à sa vraie version : sans « Electron/… »
// ni le nom de l'app, que le contrôle anti-robots de Twitch peut refuser
app.userAgentFallback = app.userAgentFallback.replace(/ (Electron|twitch-mod-manager)\/\S+/g, '');

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
  onWhisper: (data) => sendToAllPages('twitch:whisper', data),
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

  // La webview (Vue Twitch officielle) reste sur twitch.tv : un lien extérieur s'ouvre dans le navigateur
  if (contents.getType() === 'webview') {
    contents.on('will-navigate', (e, url) => {
      if (isTwitchUrl(url) || url === 'about:blank') return;
      e.preventDefault();
      if (url.startsWith('https://') || url.startsWith('http://')) shell.openExternal(url);
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

// Electron accorde par défaut toutes les permissions demandées (caméra, micro, notifications…) :
// seules celles utiles au lecteur et au chat Twitch sont accordées
const ALLOWED_PERMISSIONS = new Set(['fullscreen', 'clipboard-sanitized-write']);
function restrictPermissions(electronSession) {
  electronSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(ALLOWED_PERMISSIONS.has(permission));
  });
}

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
    updater.setup({ mainWindowGetter: () => mainWindow });
    // Mise à jour automatique téléchargée mais pas installée : écran « Mise à jour en cours », puis redémarrage
    if (await updater.installPendingUpdateAtStartup()) return;
    restrictPermissions(session.defaultSession);
    restrictPermissions(session.fromPartition('persist:twitch_mod'));
    await AuthManager.loadSession(); // avant la page : elle vérifie la session dès son chargement
    setupIpcHandlers();
    await createWindow();
    updater.closeStartupSplash();
    // La recherche de mise à jour est lancée par la page (app:check-updates), qui connaît les choix bêta et automatique

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
// Jeton -> compte affiché par la page (lève une erreur si le jeton n'est plus valide)
async function loadAppUser(token) {
  const validation = await TwitchService.validateToken(token);
  const user = await TwitchService.getUserInfo(token, validation.user_id);
  return {
    validation,
    user: {
      id: validation.user_id,
      login: validation.login,
      displayName: user?.display_name || validation.login,
      profileImageUrl: user?.profile_image_url || '',
      scopes: validation.scopes || []
    }
  };
}

function setupIpcHandlers() {
  // Vérification de la session enregistrée
  ipcMain.handle('auth:check-session', async () => {
    const sessionData = AuthManager.getSession();
    if (!sessionData?.token) return { authenticated: false };
    try {
      const { user } = await loadAppUser(sessionData.token);
      return { authenticated: true, user };
    } catch (err) {
      console.warn('Session expirée ou invalide:', err.message);
      AuthManager.logout();
      return { authenticated: false, error: err.message };
    }
  });

  // Connexion Twitch (OAuth dans le navigateur)
  ipcMain.handle('auth:login', async () => {
    try {
      const token = await AuthManager.startOAuthFlow();
      const { validation, user } = await loadAppUser(token);
      await AuthManager.saveSession({ token, userId: validation.user_id, login: validation.login });
      return { success: true, user };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Déconnexion
  ipcMain.handle('auth:logout', async () => {
    modActionsClient.stop();
    return AuthManager.logout();
  });

  // Tout ce qui touche à Twitch (canaux twitch:*) : voir ipcTwitch.js
  registerTwitchIpc({ modActionsClient });

  // Onglets, mise à jour : pilotés uniquement par la page de la fenêtre principale
  const fromMainPage = (event) => mainWindow && event.sender === mainWindow.webContents;

  // Icône de mise à jour de l'en-tête (mode automatique, mise à jour déjà téléchargée)
  ipcMain.handle('app:install-update', async (event) => {
    if (!fromMainPage(event)) return { success: false };
    return { success: updater.installNow() };
  });

  // Recherche de mise à jour, voie bêta ou normale (rien en développement)
  ipcMain.handle('app:check-updates', async (event, beta, manual, auto) => {
    if (!app.isPackaged) return { success: false, error: 'version de développement' };
    try {
      const result = await updater.checkForUpdates(beta === true, manual === true, auto === true);
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

  // Onglets de chaînes

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
