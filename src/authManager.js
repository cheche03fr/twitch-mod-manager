const fs = require('fs');
const path = require('path');
const { app, shell } = require('electron');
const { CLIENT_ID, REDIRECT_URI, SCOPES } = require('./config');
const localServer = require('./localServer');

// Une fois compilée, l'app est dans app.asar (lecture seule) : on stocke la session dans %APPDATA%
const DATA_DIR = app.isPackaged
  ? path.join(app.getPath('userData'), 'data')
  : path.join(__dirname, '..', 'data');
const SESSION_FILE = path.join(DATA_DIR, 'session.json');

class AuthManager {
  static saveSession(data) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }

  static getSession() {
    try {
      if (fs.existsSync(SESSION_FILE)) {
        const content = fs.readFileSync(SESSION_FILE, 'utf-8');
        return JSON.parse(content);
      }
    } catch (err) {
      console.error('Erreur lecture session:', err);
    }
    return null;
  }

  static logout() {
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
    const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=${encodeURIComponent(SCOPES)}&force_verify=true`;
    shell.openExternal(authUrl);
    return await localServer.waitForToken();
  }
}

module.exports = AuthManager;
