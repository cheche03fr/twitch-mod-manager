const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const { app, shell, safeStorage } = require('electron');
const { CLIENT_ID, REDIRECT_URI, SCOPES } = require('./config');
const localServer = require('./localServer');
const { sealSession, openSession } = require('./sessionSeal');

// Une fois compilée, l'app est dans app.asar (lecture seule) : on stocke la session dans %APPDATA%
const DATA_DIR = app.isPackaged
  ? path.join(app.getPath('userData'), 'data')
  : path.join(__dirname, '..', 'data');
const SESSION_FILE = path.join(DATA_DIR, 'session.json');

// Session déchiffrée une fois au démarrage (loadSession), puis gardée en mémoire : le déchiffrement est asynchrone
let currentSession = null;

class AuthManager {
  static async loadSession() {
    currentSession = null;
    try {
      if (fs.existsSync(SESSION_FILE)) {
        const { data, needsReseal } = await openSession(fs.readFileSync(SESSION_FILE, 'utf-8'), safeStorage);
        currentSession = data;
        if (needsReseal) await AuthManager.saveSession(data);
      }
    } catch (err) {
      console.error('Erreur lecture session:', err.message);
    }
  }

  static async saveSession(data) {
    currentSession = data;
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SESSION_FILE, await sealSession(data, safeStorage), 'utf-8');
  }

  static getSession() {
    return currentSession;
  }

  static logout() {
    currentSession = null;
    try {
      if (fs.existsSync(SESSION_FILE)) {
        fs.unlinkSync(SESSION_FILE);
      }
      return { success: true };
    } catch (err) {
      console.error('Erreur déconnexion:', err);
      return { success: false, error: err.message };
    }
  }

  static async startOAuthFlow() {
    // state aléatoire : seul le retour de Twitch le connaît, un autre site ne peut pas injecter son jeton
    const state = crypto.randomBytes(16).toString('hex');
    const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=${encodeURIComponent(SCOPES)}&force_verify=true&state=${state}`;
    const tokenPromise = localServer.waitForToken(state);
    shell.openExternal(authUrl);
    return await tokenPromise;
  }
}

module.exports = AuthManager;
