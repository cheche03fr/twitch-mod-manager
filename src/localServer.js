const http = require('http');
const fs = require('fs');
const path = require('path');
const { PORT, CLIENT_ID, REDIRECT_URI, SCOPES } = require('./config');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json'
};

const RENDERER_DIR = path.join(__dirname, 'renderer');
const ASSETS_DIR = path.join(__dirname, '..', 'assets');

/** Chemin d'URL -> fichier servi, null s'il sortirait de renderer/ ou assets/ (« .. », chemin encodé…). */
function staticFilePath(pathname) {
  const [root, rest] = pathname.startsWith('/assets/')
    ? [ASSETS_DIR, pathname.slice('/assets/'.length)]
    : [RENDERER_DIR, pathname === '/' ? 'index.html' : pathname.slice(1)];
  const filePath = path.resolve(root, rest);
  return filePath.startsWith(root + path.sep) ? filePath : null;
}

class LocalServer {
  constructor() {
    this.server = null;
    this.tokenResolve = null;
    this.tokenReject = null;
    this.expectedState = null;
  }

  start(port = PORT) { // port modifiable pour les tests
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        const reqUrl = new URL(req.url, `http://localhost:${PORT}`);

        // 1. Route OAuth Callback
        if (reqUrl.pathname === '/callback') {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <!DOCTYPE html>
            <html lang="fr">
            <head>
              <meta charset="UTF-8">
              <title>Connexion Twitch Réussie</title>
              <style>
                body {
                  background-color: #0e0e10;
                  color: #efeff1;
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  margin: 0;
                  text-align: center;
                }
                .card {
                  background: #18181b;
                  border: 1px solid #303036;
                  border-radius: 12px;
                  padding: 32px 40px;
                  box-shadow: 0 10px 25px rgba(0,0,0,0.5);
                  max-width: 420px;
                }
                h1 { color: #9146ff; font-size: 22px; margin-bottom: 12px; }
                p { font-size: 15px; color: #adadb8; line-height: 1.5; }
              </style>
            </head>
            <body>
              <div class="card">
                <h1>Authentification réussie !</h1>
                <p id="msg">Transmission du jeton à l'application...</p>
              </div>
              <script>
                const hash = window.location.hash.substring(1);
                if (hash) {
                  const params = new URLSearchParams(hash);
                  const token = params.get('access_token');
                  const state = params.get('state') || '';
                  if (token) {
                    fetch('/save-token?access_token=' + encodeURIComponent(token) + '&state=' + encodeURIComponent(state))
                      .then(r => {
                        if (!r.ok) throw new Error('jeton refusé, relancez la connexion depuis l\\'application');
                        document.getElementById('msg').innerText = 'Connecté ! Vous pouvez fermer cet onglet.';
                        setTimeout(() => window.close(), 1500);
                      })
                      .catch(err => {
                        document.getElementById('msg').innerText = 'Erreur : ' + err;
                      });
                  }
                }
              </script>
            </body>
            </html>
          `);
          return;
        }

        // 2. Route Réception du jeton
        if (reqUrl.pathname === '/save-token') {
          const token = reqUrl.searchParams.get('access_token');
          const state = reqUrl.searchParams.get('state');
          if (!token || !this.tokenResolve || !this.expectedState || state !== this.expectedState) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'refused' }));
            return;
          }
          this.tokenResolve(token);
          this.tokenResolve = null;
          this.tokenReject = null;
          this.expectedState = null;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok' }));
          return;
        }

        // 3. Fichiers Statiques (Renderer & Assets)
        const filePath = staticFilePath(reqUrl.pathname);

        if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath).toLowerCase();
          const contentType = MIME_TYPES[ext] || 'application/octet-stream';
          res.writeHead(200, { 'Content-Type': contentType });
          fs.createReadStream(filePath).pipe(res);
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found');
        }
      });

      this.server.listen(port, '127.0.0.1', () => {
        console.log(`Serveur local actif sur http://localhost:${port}`);
        resolve(`http://localhost:${port}`);
      });

      this.server.on('error', (err) => {
        console.warn(`Erreur serveur local sur le port ${port}: ${err.message}`);
        resolve(null);
      });
    });
  }

  waitForToken(expectedState, timeoutMs = 180000) {
    return new Promise((resolve, reject) => {
      this.tokenResolve = resolve;
      this.tokenReject = reject;
      this.expectedState = expectedState;

      setTimeout(() => {
        if (this.tokenReject && this.tokenReject === reject) {
          this.tokenReject(new Error('Délai d\'authentification dépassé (3 minutes).'));
          this.tokenResolve = null;
          this.tokenReject = null;
          this.expectedState = null;
        }
      }, timeoutMs);
    });
  }

  stop() {
    if (this.server) {
      try {
        this.server.close();
      } catch (e) {}
    }
  }
}

module.exports = new LocalServer();
module.exports.staticFilePath = staticFilePath;
