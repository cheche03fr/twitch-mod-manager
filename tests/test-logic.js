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

// Test 2: statut éditeur d'après la réponse de GET /streams/markers
const { editorStatusFromMarkersResponse } = TwitchService;
assert.strictEqual(editorStatusFromMarkersResponse(200), 'yes', 'marqueurs lisibles : éditeur');
assert.strictEqual(editorStatusFromMarkersResponse(403), 'no', 'refus : pas éditeur');
assert.strictEqual(editorStatusFromMarkersResponse(401), 'no', 'non autorisé : pas éditeur');
assert.strictEqual(editorStatusFromMarkersResponse(404), 'unknown', 'aucune VOD : non vérifiable');
assert.strictEqual(editorStatusFromMarkersResponse(null), 'unknown', 'Twitch injoignable : non vérifiable');

// Test 3: adresses Helix (paramètre répété pour un tableau, valeurs nulles ignorées)
const { helixUrl, helix } = TwitchService;
assert.strictEqual(helixUrl('/streams', { user_id: ['1', '2'], after: null }), 'https://api.twitch.tv/helix/streams?user_id=1&user_id=2');
assert.strictEqual(helixUrl('/users', { login: 'a b' }), 'https://api.twitch.tv/helix/users?login=a+b');

// Test 4: appel Helix simulé (en-têtes, corps JSON, format d'erreur « (code) » lu par main.js)
async function testHelix() {
  const calls = [];
  const realFetch = global.fetch;
  global.fetch = async (url, init) => {
    calls.push({ url, init });
    if (url.includes('/fail')) return { ok: false, status: 400, text: async () => 'mauvaise requête' };
    if (init.method === 'DELETE') return { ok: true, status: 204 };
    return { ok: true, status: 200, json: async () => ({ data: [{ id: '42' }] }) };
  };
  try {
    const json = await helix('jeton', '/chat/settings', { method: 'PATCH', query: { broadcaster_id: 1 }, body: { slow_mode: true }, label: 'Chat' });
    assert.deepStrictEqual(json, { data: [{ id: '42' }] });
    assert.strictEqual(calls[0].init.headers.Authorization, 'Bearer jeton');
    assert.strictEqual(calls[0].init.headers['Content-Type'], 'application/json');
    assert.strictEqual(calls[0].init.body, '{"slow_mode":true}');
    assert.strictEqual(await helix('jeton', '/moderation/chat', { method: 'DELETE', label: 'Purge' }), null, '204 : pas de corps');
    await assert.rejects(helix('jeton', '/fail', { label: 'Échec' }), /^Error: Échec \(400\): mauvaise requête$/);
    assert.strictEqual(await TwitchService.unbanUser('jeton', '1', '2', '3'), true);
  } finally {
    global.fetch = realFetch;
  }
}

// Test 5: enrichChannelsData avec tableau vide
testHelix().then(() => TwitchService.enrichChannelsData('fake-token', [])).then(res => {
  assert.deepStrictEqual(res, [], 'enrichChannelsData avec liste vide doit renvoyer []');
  console.log('✅ Tous les tests logiques ont réussi avec succès !');
}).catch(err => {
  console.error('❌ Échec du test :', err);
  process.exit(1);
});
