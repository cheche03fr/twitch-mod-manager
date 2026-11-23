// Vérifie la lecture des paramètres enregistrés (valeurs inconnues → valeurs par défaut)
const assert = require('assert');
const { parseSettings, DEFAULT_SETTINGS } = require('../src/renderer/settings');

assert.deepStrictEqual(parseSettings(null), DEFAULT_SETTINGS, 'rien d\'enregistré : défauts');
assert.deepStrictEqual(parseSettings('pas du json'), DEFAULT_SETTINGS, 'JSON cassé : défauts');
assert.deepStrictEqual(
  parseSettings('{"autoRefresh":false,"refreshSeconds":75,"theme":"light","betaUpdates":true,"autoUpdates":true,"autoLogin":true}'),
  { autoRefresh: false, refreshSeconds: 75, theme: 'light', betaUpdates: true, autoUpdates: true, autoLogin: true }
);
assert.deepStrictEqual(
  parseSettings('{"refreshSeconds":120,"theme":"dark"}'),
  { autoRefresh: true, refreshSeconds: 120, theme: 'dark', betaUpdates: false, autoUpdates: false, autoLogin: false },
  'réglage v1.0.8 (120 s) conservé ; bêta, mises à jour et connexion automatiques désactivées par défaut'
);
assert.deepStrictEqual(
  parseSettings('{"refreshSeconds":0,"theme":"dark"}'),
  { autoRefresh: false, refreshSeconds: 30, theme: 'dark', betaUpdates: false, autoUpdates: false, autoLogin: false },
  'réglage v1.0.8 « désactivée » (0) → case décochée'
);
assert.strictEqual(parseSettings('{"betaUpdates":"oui"}').betaUpdates, false, 'valeur bêta invalide : non');
assert.strictEqual(parseSettings('{"autoUpdates":1}').autoUpdates, false, 'valeur mises à jour automatiques invalide : non');
assert.strictEqual(parseSettings('{"autoLogin":"oui"}').autoLogin, false, 'valeur connexion automatique invalide : non');

// Mise à jour automatique au démarrage : installer seulement une version téléchargée et pas encore installée
const { startupAction } = require('../src/updater');
assert.strictEqual(startupAction({ version: '1.0.23' }, '1.0.22', true), 'install', 'mise à jour en attente');
assert.strictEqual(startupAction({ version: '1.0.23' }, '1.0.23', true), 'clear', 'déjà installée');
assert.strictEqual(startupAction(null, '1.0.22', true), 'none', 'rien en attente');
assert.strictEqual(startupAction({ version: '1.0.23' }, '1.0.22', false), 'none', 'jamais en développement');
assert.deepStrictEqual(parseSettings('{"refreshSeconds":40,"theme":"rose"}'), DEFAULT_SETTINGS, 'hors pas de 15 / thème inconnu : défauts');
assert.deepStrictEqual(parseSettings('{"refreshSeconds":135}'), DEFAULT_SETTINGS, 'au-delà de 120 s : défaut');

console.log('✅ Lecture des paramètres OK');
