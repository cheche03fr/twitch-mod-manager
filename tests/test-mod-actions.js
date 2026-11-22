// Vérifie le texte des actions de modération Twitch et l'historique par chaîne
const assert = require('assert');
const { describeModAction, formatRelativeTime, addModAction, MOD_ACTIONS_MAX } = require('../src/renderer/modActions');
const { hasModActionsScopes } = require('../src/eventSubClient');
const { SCOPES } = require('../src/config');

const base = { broadcaster_user_id: '42', moderator_user_login: 'rimfiire', moderator_user_name: 'Rimfiire' };
const at = '2026-11-22T12:00:00Z';
const entry = (event) => ({ receivedAt: at, event: { ...base, ...event } });

assert.deepStrictEqual(
  describeModAction(entry({ action: 'raid', raid: { user_login: 'yt_azox_v2', viewer_count: 16 } })),
  { icon: '🪂', target: 'yt_azox_v2', text: 'Raid lancé par Rimfiire avec 16 viewer·euse·s' }
);
assert.deepStrictEqual(
  describeModAction(entry({ action: 'vip', vip: { user_login: 'didine03fr' } })),
  { icon: '💎', target: 'didine03fr', text: 'Ajouté comme VIP par Rimfiire' }
);
assert.strictEqual(
  describeModAction(entry({ action: 'timeout', timeout: { user_login: 'x', reason: 'spam', expires_at: '2026-11-22T12:10:00Z' } })).text,
  'Exclu 10 min par Rimfiire · Motif : spam'
);
assert.strictEqual(
  describeModAction(entry({ action: 'shared_chat_ban', shared_chat_ban: { user_login: 'x', reason: null } })).text,
  'Banni par Rimfiire (chat partagé)'
);
assert.deepStrictEqual(describeModAction(entry({ action: 'clear' })), { icon: '🧹', target: null, text: 'Chat vidé par Rimfiire' });
assert.strictEqual(describeModAction(entry({ action: 'slow', slow: { wait_time_seconds: 30 } })).text, 'Mode lent (30 s) activé par Rimfiire');
assert.strictEqual(describeModAction(entry({ action: 'inconnue' })).text, 'inconnue par Rimfiire', 'action inconnue : affichée telle quelle');

const now = new Date(2026, 10, 22, 15, 0);
assert.strictEqual(formatRelativeTime(new Date(2026, 10, 22, 14, 59, 40).toISOString(), now), "à l'instant");
assert.strictEqual(formatRelativeTime(new Date(2026, 10, 22, 14, 55).toISOString(), now), 'il y a 5 min');
assert.strictEqual(formatRelativeTime(new Date(2026, 10, 22, 12, 0).toISOString(), now), 'il y a 3 h');
assert.strictEqual(formatRelativeTime(new Date(2026, 10, 21, 23, 0).toISOString(), now), 'hier');
assert.strictEqual(formatRelativeTime(new Date(2026, 10, 20, 9, 0).toISOString(), now), 'avant-hier');
assert.strictEqual(formatRelativeTime(new Date(2026, 10, 19, 9, 0).toISOString(), now), 'il y a 3 jours');

// Historique : la plus récente en tête, limité par chaîne, sans modifier l'original
const empty = {};
const one = addModAction(empty, entry({ action: 'clear' }));
assert.deepStrictEqual(empty, {}, 'historique d\'origine inchangé');
assert.strictEqual(one['42'].length, 1);
let many = one;
for (let i = 0; i < MOD_ACTIONS_MAX + 5; i++) many = addModAction(many, entry({ action: 'vip', vip: { user_login: `u${i}` } }));
assert.strictEqual(many['42'].length, MOD_ACTIONS_MAX);
assert.strictEqual(many['42'][0].event.vip.user_login, `u${MOD_ACTIONS_MAX + 4}`);

// La connexion demande bien tous les droits exigés par channel.moderate v2
assert.ok(hasModActionsScopes(SCOPES.split(' ')), 'scopes de config suffisants');
assert.ok(!hasModActionsScopes(['moderator:read:vips']), 'scopes incomplets détectés');

console.log('✅ Actions de modération OK');
