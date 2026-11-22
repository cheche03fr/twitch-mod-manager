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

  localServer.stop();
  console.log('✅ Contrôle du state OAuth OK');
})().catch(err => {
  console.error('❌ Échec du test state OAuth :', err);
  localServer.stop();
  process.exit(1);
});
