const assert = require('assert');
const TwitchService = require('../src/twitchService');

console.log('🧪 Démarrage des tests unitaires...');

// Test 1: chunkArray
const empty = TwitchService.chunkArray([], 100);
assert.deepStrictEqual(empty, [], 'chunkArray([]) doit renvoyer []');

const single = TwitchService.chunkArray([1, 2, 3], 2);
assert.deepStrictEqual(single, [[1, 2], [3]], 'chunkArray([1, 2, 3], 2) doit découper en [[1, 2], [3]]');

const exact = TwitchService.chunkArray([1, 2, 3, 4], 2);
assert.deepStrictEqual(exact, [[1, 2], [3, 4]], 'chunkArray([1, 2, 3, 4], 2) doit découper en 2 tableaux exacts');

// Test 2: enrichChannelsData avec tableau vide
TwitchService.enrichChannelsData('fake-token', []).then(res => {
  assert.deepStrictEqual(res, [], 'enrichChannelsData avec liste vide doit renvoyer []');
  console.log('✅ Tous les tests logiques ont réussi avec succès !');
}).catch(err => {
  console.error('❌ Échec du test :', err);
  process.exit(1);
});
