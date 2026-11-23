// Mises à jour depuis les Releases de cheche03fr/twitch-mod-manager (electron-updater).
// - Mode normal : téléchargement en fond, puis une fenêtre demande « Installer maintenant / Plus tard ».
// - Mode automatique (case des Paramètres) : téléchargement sans question, bouton « Mettre à jour » dans l'en-tête ;
//   s'il n'est pas utilisé, la mise à jour s'installe au démarrage suivant, derrière un écran « Mise à jour en cours ».
// beta = true : les pré-versions (tags v1.2.3-beta.1) sont aussi proposées.
const fs = require('fs');
const path = require('path');
const { app, dialog, BrowserWindow } = require('electron');

const CHECK_TIMEOUT_MS = 60000; // au démarrage : sans réponse de GitHub, l'app s'ouvre normalement

let autoUpdater = null;
let getMainWindow = () => null;
let autoMode = false;
let readyVersion = null; // version téléchargée, prête à installer (mode automatique)
let promptedVersion = null;
let startupInstalling = false;
let splash = null;

const markerFile = () => path.join(app.getPath('userData'), 'pending-update.json');

function readMarker() {
  try {
    return JSON.parse(fs.readFileSync(markerFile(), 'utf-8'));
  } catch {
    return null;
  }
}

function writeMarker(marker) {
  try {
    fs.writeFileSync(markerFile(), JSON.stringify(marker), 'utf-8');
  } catch (err) {
    console.error('Mise à jour : marqueur non enregistré :', err.message);
  }
}

function removeMarker() {
  try {
    fs.rmSync(markerFile(), { force: true });
  } catch (err) {
    console.error('Mise à jour : marqueur non supprimé :', err.message);
  }
}

/**
 * Au démarrage : 'install' (mise à jour téléchargée en mode automatique, pas encore installée),
 * 'clear' (déjà installée : marqueur à supprimer) ou 'none'.
 */
function startupAction(marker, currentVersion, isPackaged) {
  if (!isPackaged || typeof marker?.version !== 'string') return 'none';
  return marker.version === currentVersion ? 'clear' : 'install';
}

function getUpdater() {
  if (!autoUpdater) {
    autoUpdater = require('electron-updater').autoUpdater;
    autoUpdater.autoInstallOnAppQuit = false; // n'installe jamais sans accord ni sans le mode automatique
    autoUpdater.on('update-downloaded', onDownloaded);
    autoUpdater.on('error', err => console.error('Mise à jour impossible:', err.message));
  }
  return autoUpdater;
}

function onDownloaded(info) {
  if (startupInstalling) return; // géré par installPendingUpdateAtStartup
  if (!autoMode) {
    promptInstall(info);
    return;
  }
  readyVersion = info.version;
  writeMarker({ version: info.version, beta: autoUpdater.allowPrerelease === true });
  getMainWindow()?.webContents.send('app:update-ready', { version: info.version });
}

async function promptInstall(info) {
  if (promptedVersion === info.version) return; // déjà proposée (nouvelle recherche après changement du choix bêta)
  promptedVersion = info.version;
  const { response } = await dialog.showMessageBox(getMainWindow(), {
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

/**
 * Recherche une mise à jour. manual = true (bouton des Paramètres) : la fenêtre d'installation est reproposée
 * même après « Plus tard ». auto = mode automatique coché. Renvoie { updateAvailable, version }.
 */
async function checkForUpdates(beta, manual, auto) {
  const updater = getUpdater();
  autoMode = auto;
  if (!auto) {
    removeMarker(); // mode décoché : plus d'installation au démarrage
    readyVersion = null;
  }
  if (manual) promptedVersion = null;
  if (readyVersion) getMainWindow()?.webContents.send('app:update-ready', { version: readyVersion });
  updater.allowPrerelease = beta;
  const result = await updater.checkForUpdates();
  return { updateAvailable: Boolean(result?.isUpdateAvailable), version: result?.updateInfo?.version || null };
}

const SPLASH_BEFORE_INSTALL_MS = 1500; // le temps de voir l'écran avant que l'installeur ferme l'application

/** Icône de l'en-tête : même écran « Mise à jour en cours » qu'au démarrage, puis installation silencieuse et relance. */
function installNow() {
  if (!readyVersion) return false;
  showSplash(readyVersion);
  getMainWindow()?.hide();
  setTimeout(() => autoUpdater.quitAndInstall(true, true), SPLASH_BEFORE_INSTALL_MS);
  return true;
}

function showSplash(version) {
  splash = new BrowserWindow({
    width: 420,
    height: 240,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    center: true,
    backgroundColor: '#18181b',
    title: 'Mise à jour en cours',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  const safeVersion = String(version).replace(/[^0-9A-Za-z.-]/g, '');
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<style>
  body { margin: 0; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
         background: #18181b; color: #efeff1; font-family: "Segoe UI", sans-serif; border: 1px solid #9146ff; box-sizing: border-box; }
  h1 { margin: 0; font-size: 18px; color: #bf94ff; }
  p { margin: 0; font-size: 13px; color: #adadb8; }
  .logo { width: 44px; height: 44px; padding: 8px; border-radius: 50%; background: rgba(145, 70, 255, 0.12); border: 1px solid rgba(145, 70, 255, 0.35); }
  .cycle { stroke: #9146ff; transform-origin: 12px 12px; animation: spin 1.2s linear infinite; }
  .arrow { stroke: #bf94ff; }
  .arrow path:nth-child(2) { fill: #bf94ff; }
  @keyframes spin { to { transform: rotate(-360deg); } }
  .bar { width: 260px; height: 4px; border-radius: 2px; background: #303036; overflow: hidden; }
  .bar::after { content: ''; display: block; width: 40%; height: 100%; background: #9146ff; animation: slide 1.2s ease-in-out infinite; }
  @keyframes slide { from { transform: translateX(-100%); } to { transform: translateX(250%); } }
</style></head><body>
  <svg class="logo" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <g class="cycle"><path d="M19.4 9.2A8 8 0 0 0 6 6.3"/><path d="M5.4 3.4v3.4h3.4"/><path d="M4.6 14.8A8 8 0 0 0 18 17.7"/><path d="M18.6 20.6v-3.4h-3.4"/></g>
    <g class="arrow"><path d="M12 7.6v3.4"/><path d="M9.4 11.2h5.2L12 14.2z"/><path d="M9.2 16.4h5.6"/></g>
  </svg>
  <h1>Mise à jour en cours</h1>
  <p>Installation de la version ${safeVersion}…</p>
  <div class="bar"></div>
  <p>L'application redémarre toute seule.</p>
</body></html>`;
  splash.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
}

function closeStartupSplash() {
  if (splash && !splash.isDestroyed()) splash.close();
  splash = null;
}

/**
 * Au démarrage, avant la fenêtre principale : installe la mise à jour téléchargée en mode automatique
 * et non installée depuis le bouton. Renvoie true si l'installation est lancée (l'application va se fermer).
 * Sinon l'écran reste affiché : l'appelant le ferme avec closeStartupSplash() une fois sa fenêtre ouverte.
 */
async function installPendingUpdateAtStartup() {
  const marker = readMarker();
  const action = startupAction(marker, app.getVersion(), app.isPackaged);
  if (action === 'clear') removeMarker();
  if (action !== 'install') return false;

  showSplash(marker.version);
  const updater = getUpdater();
  updater.allowPrerelease = marker.beta === true;
  startupInstalling = true;
  const downloaded = await new Promise(resolve => {
    let timer = setTimeout(() => done(false), CHECK_TIMEOUT_MS);
    const onAvailable = () => { clearTimeout(timer); timer = null; }; // téléchargement en cours : on attend sa fin
    const onDownloadedOnce = () => done(true);
    const onFail = () => done(false);
    function done(ok) {
      clearTimeout(timer);
      updater.off('update-available', onAvailable);
      updater.off('update-downloaded', onDownloadedOnce);
      updater.off('update-not-available', onFail);
      updater.off('error', onFail);
      resolve(ok);
    }
    updater.on('update-available', onAvailable);
    updater.on('update-downloaded', onDownloadedOnce);
    updater.on('update-not-available', onFail);
    updater.on('error', onFail);
    updater.checkForUpdates().catch(onFail);
  });
  startupInstalling = false;

  if (downloaded) {
    updater.quitAndInstall(true, true);
    return true;
  }
  removeMarker(); // GitHub injoignable ou version retirée : l'app s'ouvre normalement
  return false;
}

function setup({ mainWindowGetter }) {
  getMainWindow = mainWindowGetter;
}

module.exports = { setup, checkForUpdates, installNow, installPendingUpdateAtStartup, closeStartupSplash, startupAction, showSplash };
