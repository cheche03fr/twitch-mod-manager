// Vérifie la lecture des paramètres enregistrés (valeurs inconnues → valeurs par défaut)
const assert = require('assert');
const { parseSettings, DEFAULT_SETTINGS } = require('../src/renderer/settings');

assert.deepStrictEqual(parseSettings(null), DEFAULT_SETTINGS, 'rien d\'enregistré : défauts');
assert.deepStrictEqual(parseSettings('pas du json'), DEFAULT_SETTINGS, 'JSON cassé : défauts');
assert.deepStrictEqual(
  parseSettings('{"autoRefresh":false,"refreshSeconds":75,"theme":"light"}'),
  { autoRefresh: false, refreshSeconds: 75, theme: 'light' }
);
assert.deepStrictEqual(
  parseSettings('{"refreshSeconds":120,"theme":"dark"}'),
  { autoRefresh: true, refreshSeconds: 120, theme: 'dark' },
  'réglage v1.0.8 (120 s) conservé'
);
assert.deepStrictEqual(
  parseSettings('{"refreshSeconds":0,"theme":"dark"}'),
  { autoRefresh: false, refreshSeconds: 30, theme: 'dark' },
  'réglage v1.0.8 « désactivée » (0) → case décochée'
);
assert.deepStrictEqual(parseSettings('{"refreshSeconds":40,"theme":"rose"}'), DEFAULT_SETTINGS, 'hors pas de 15 / thème inconnu : défauts');
assert.deepStrictEqual(parseSettings('{"refreshSeconds":135}'), DEFAULT_SETTINGS, 'au-delà de 120 s : défaut');

console.log('✅ Lecture des paramètres OK');
