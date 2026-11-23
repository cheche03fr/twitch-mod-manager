// Vérifie que /save-token refuse un jeton sans le bon "state" (anti injection de compte)
const assert = require('assert');
const localServer = require('../src/localServer');

(async () => {
  const base = await localServer.start(3999); // pas 3000 : l'app peut tourner en même temps
  assert.ok(base, 'le port 3999 doit être libre');

  const pending = localServer.waitForToken('bon-state', 5000);

  let res = await fetch(`${base}/save-token?access_token=pirate`);
  assert.strictEqual(res.status, 403, 'sans state : refusé');
  res = await fetch(`${base}/save-token?access_token=pirate&state=mauvais`);
  assert.strictEqual(res.status, 403, 'mauvais state : refusé');

  res = await fetch(`${base}/save-token?access_token=vrai&state=bon-state`);
  assert.strictEqual(res.status, 200, 'bon state : accepté');
  assert.strictEqual(await pending, 'vrai');

  res = await fetch(`${base}/save-token?access_token=pirate&state=bon-state`);
  assert.strictEqual(res.status, 403, 'state déjà utilisé : refusé');

  // Fichiers statiques : rien en dehors de renderer/ et assets/
  const path = require('path');
  const { staticFilePath } = localServer;
  assert.strictEqual(staticFilePath('/'), path.join(__dirname, '..', 'src', 'renderer', 'index.html'));
  assert.strictEqual(staticFilePath('/styles.css'), path.join(__dirname, '..', 'src', 'renderer', 'styles.css'));
  assert.strictEqual(staticFilePath('/assets/icon.png'), path.join(__dirname, '..', 'assets', 'icon.png'));
  for (const evil of ['/../main.js', '/assets/../src/main.js', '/..\\..\\package.json', '/assets/', '/C:/Windows/win.ini']) {
    const p = staticFilePath(evil);
    assert.ok(p === null || p.startsWith(path.join(__dirname, '..', 'src', 'renderer') + path.sep), `refusé : ${evil}`);
  }
  for (const evil of ['/..%2F..%2Fpackage.json', '/%2e%2e/main.js']) {
    res = await fetch(base + evil);
    assert.strictEqual(res.status, 404, `404 : ${evil}`);
  }
  res = await fetch(`${base}/styles.css`);
  assert.strictEqual(res.status, 200, 'fichier normal servi');

  localServer.stop();
  console.log('✅ Contrôle du state OAuth OK');
  console.log('✅ Fichiers statiques limités à renderer/ et assets/ OK');

  // Fichier de session : jeton chiffré, ancien fichier en clair relu puis à réécrire chiffré
  const { sealSession, openSession } = require('../src/sessionSeal');
  const fakeStorage = (available, shouldReEncrypt = false) => ({
    isAsyncEncryptionAvailable: async () => available,
    encryptStringAsync: async (s) => Buffer.from([...s].reverse().join(''), 'utf8'),
    decryptStringAsync: async (b) => ({ result: [...b.toString('utf8')].reverse().join(''), shouldReEncrypt })
  });
  const session = { token: 'secret-jeton', userId: '42', login: 'cheche03fr' };
  const sealed = await sealSession(session, fakeStorage(true));
  assert.ok(!sealed.includes('secret-jeton'), 'le jeton n\'apparaît pas en clair');
  assert.deepStrictEqual(await openSession(sealed, fakeStorage(true)), { data: session, needsReseal: false });
  assert.deepStrictEqual(await openSession(sealed, fakeStorage(true, true)), { data: session, needsReseal: true }, 'clé à renouveler');
  assert.deepStrictEqual(await openSession(JSON.stringify(session), fakeStorage(true)), { data: session, needsReseal: true }, 'ancien fichier en clair');
  assert.deepStrictEqual(await openSession(await sealSession(session, fakeStorage(false)), fakeStorage(false)), { data: session, needsReseal: false }, 'sans chiffrement disponible');
  console.log('✅ Chiffrement de la session OK');
})().catch(err => {
  console.error('❌ Échec du test state OAuth :', err);
  localServer.stop();
  process.exit(1);
});
