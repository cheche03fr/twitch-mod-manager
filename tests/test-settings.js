// Vérifie la lecture des paramètres enregistrés (valeurs inconnues → valeurs par défaut)
const assert = require('assert');
const { parseSettings, DEFAULT_SETTINGS } = require('../src/renderer/settings');

assert.deepStrictEqual(parseSettings(null), DEFAULT_SETTINGS, 'rien d\'enregistré : défauts');
assert.deepStrictEqual(parseSettings('pas du json'), DEFAULT_SETTINGS, 'JSON cassé : défauts');
assert.deepStrictEqual(parseSettings('{"refreshSeconds":120,"theme":"light"}'), { refreshSeconds: 120, theme: 'light' });
assert.deepStrictEqual(parseSettings('{"refreshSeconds":0,"theme":"dark"}'), { refreshSeconds: 0, theme: 'dark' }, '0 = désactivée');
assert.deepStrictEqual(parseSettings('{"refreshSeconds":5,"theme":"rose"}'), DEFAULT_SETTINGS, 'valeurs inconnues : défauts');

console.log('✅ Lecture des paramètres OK');
