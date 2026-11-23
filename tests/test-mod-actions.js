// Vérifie le texte des actions de modération Twitch et l'historique par chaîne
const assert = require('assert');
const { describeModAction, formatRelativeTime, addModAction, mergeModActions, MOD_ACTIONS_MAX } = require('../src/renderer/modActions');
const { parseModActionLogs } = require('../src/twitchModLog');
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

// Historique Twitch (réponse ModActionsList de la Mod View)
const user = (login) => ({ token: { displayName: login.toUpperCase(), login, __typename: 'User' } });
const text = (t) => ({ token: { text: t } });
const gql = [{ data: { channel: { moderationActionLogs: { edges: [
  { node: { createdAt: '2026-11-20T23:36:00Z', icon: 'RAID', title: { localizedStringFragments: [user('akasha')] },
    content: { localizedStringFragments: [text('Raid lancé par '), user('rimfiire'), text(' avec 15 viewer·euse·s')] } } },
  { node: { createdAt: '2026-11-19T10:00:00Z', icon: 'PERMISSION_ADDED', title: { localizedStringFragments: [text('Mode lent')] },
    content: { localizedStringFragments: [text('Activé par '), user('cheche03fr')] } } },
  { node: { createdAt: '2026-11-18T10:00:00Z', icon: 'NOUVELLE_ICONE', title: null, content: { localizedStringFragments: [text('Autre')] } } },
  { node: null }
] } } } }];
const history = parseModActionLogs(gql);
assert.deepStrictEqual(history[0], {
  receivedAt: '2026-11-20T23:36:00Z',
  twitch: { icon: '🪂', target: 'akasha', text: 'Raid lancé par RIMFIIRE avec 15 viewer·euse·s' }
});
assert.deepStrictEqual(history[1].twitch, { icon: '💬', target: null, text: 'Mode lent : Activé par CHECHE03FR' });
assert.deepStrictEqual(history[2].twitch, { icon: '🛡️', target: null, text: 'Autre' }, 'icône inconnue : bouclier');
assert.strictEqual(history.length, 3, 'entrée vide ignorée');
assert.deepStrictEqual(describeModAction(history[0]), history[0].twitch);
assert.throws(() => parseModActionLogs([{ errors: [{ message: 'PersistedQueryNotFound' }] }]), /PersistedQueryNotFound/);
assert.throws(() => parseModActionLogs({}), /inattendue/);

// Fusion : actions reçues en direct après l'historique en tête, sans doublon
const live = [
  { receivedAt: '2026-11-21T08:00:00Z', event: { action: 'clear' } },
  { receivedAt: '2026-11-20T23:36:00Z', event: { action: 'raid' } }
];
const merged = mergeModActions(history, live);
assert.strictEqual(merged.length, 4);
assert.strictEqual(merged[0], live[0]);
assert.strictEqual(mergeModActions(undefined, live), live, 'sans historique Twitch : actions en direct seules');
assert.deepStrictEqual(mergeModActions(undefined, undefined), []);

// La connexion demande bien tous les droits exigés par channel.moderate v2
assert.ok(hasModActionsScopes(SCOPES.split(' ')), 'scopes de config suffisants');
assert.ok(!hasModActionsScopes(['moderator:read:vips']), 'scopes incomplets détectés');

// Modification de la chaîne d'un autre streamer par l'API interne de Twitch
const { buildChannelEditOperations, buildStartAdOperation, gqlError, parseAdCooldown } = require('../src/twitchChannelEdit');
// Prédictions sur la chaîne d'un autre streamer
const { parsePredictionContext, buildCreatePredictionOperation, buildUpdatePredictionOperation } = require('../src/twitchPredictions');
const predNode = (id, extra = {}) => ({
  id, title: 'Top 1 ?', createdAt: '2026-11-22T23:47:40Z', lockedAt: null, predictionWindowSeconds: 30,
  outcomes: [{ id: 'o1', title: 'Oui', color: 'BLUE', totalPoints: 100, totalUsers: 2 }, { id: 'o2', title: 'Non', color: 'PINK', totalPoints: 0, totalUsers: 0 }],
  winningOutcome: null, ...extra
});
const preds = parsePredictionContext([{ data: { community: { channel: {
  activePredictionEvents: [predNode('a')],
  lockedPredictionEvents: [predNode('l', { lockedAt: '2026-11-22T23:48:10Z' })],
  resolvedPredictionEvents: { edges: [{ node: predNode('r', { status: 'RESOLVED', winningOutcome: { id: 'o2' } }) }] }
} } } }]);
assert.deepStrictEqual(preds.map(p => [p.id, p.status]), [['a', 'ACTIVE'], ['l', 'LOCKED'], ['r', 'RESOLVED']]);
assert.deepStrictEqual(preds[0].outcomes[0], { id: 'o1', title: 'Oui', color: 'BLUE', channel_points: 100, users: 2 });
assert.strictEqual(preds[2].winning_outcome_id, 'o2');
assert.deepStrictEqual(buildCreatePredictionOperation('143330248', { title: ' Q ', outcomes: ['Oui', 'Non'], prediction_window: 60 }).variables.input, {
  title: 'Q', channelID: '143330248', outcomes: [{ title: 'Oui', color: 'BLUE' }, { title: 'Non', color: 'PINK' }], predictionWindowSeconds: 60
});
assert.throws(() => buildCreatePredictionOperation('1', { title: 'Q', outcomes: ['Seul'] }), /2 à 10 choix/);
const uuid = '4936a35a-658d-45b6-b9c8-bdc50740254d';
assert.strictEqual(buildUpdatePredictionOperation(uuid, 'LOCKED').operationName, 'LockPrediction');
assert.strictEqual(buildUpdatePredictionOperation(uuid, 'CANCELED').operationName, 'DeletePrediction');
assert.deepStrictEqual(buildUpdatePredictionOperation(uuid, 'RESOLVED', uuid).variables.input, { eventID: uuid, outcomeID: uuid });
assert.throws(() => buildUpdatePredictionOperation('pas-un-id', 'LOCKED'), /invalide/);

const adJson =[{ data: { user: { adProperties: { frequency: 480, lastTriggeredAt: '2026-11-22T23:21:53Z' } } } }];
assert.strictEqual(parseAdCooldown(adJson, Date.parse('2026-11-22T23:25:00Z')), '2026-11-22T23:29:53.000Z', 'pubs bloquées');
assert.strictEqual(parseAdCooldown(adJson, Date.parse('2026-11-22T23:30:00Z')), null, 'délai écoulé');
assert.strictEqual(parseAdCooldown([{ data: { user: { adProperties: { frequency: 480, lastTriggeredAt: null } } } }]), null, 'aucune pub passée');
assert.deepStrictEqual(buildStartAdOperation(143330248, '60', 'abc').variables.input, {
  channelID: '143330248', lengthSeconds: 60, trigger: 'QUICK_ACTION', commercialID: 'abc'
});
assert.throws(() => buildStartAdOperation(143330248, 45, 'abc'), /Durée de pub invalide/);
const [settingsOp, tagsOp] = buildChannelEditOperations({
  broadcasterId: 143330248, title: 'Titre', gameId: '1478650472', gameName: 'Jeu', language: 'fr', tags: ['fr', 'fun']
});
assert.deepStrictEqual(settingsOp.variables.input, {
  broadcasterLanguage: 'fr', game: 'Jeu', categoryID: '1478650472', status: 'Titre', userID: '143330248'
});
assert.deepStrictEqual(tagsOp.variables.input, { contentID: '143330248', contentType: 'CHANNEL', freeformTagNames: ['fr', 'fun'] });
assert.strictEqual(gqlError([{ data: { updateBroadcastSettings: { error: null } } }, { data: {} }]), null, 'succès');
assert.strictEqual(gqlError([{ errors: [{ message: 'service error' }] }]), 'service error', 'erreur globale');
assert.strictEqual(gqlError([{ data: { updateFreeformTags: { error: { code: 'TAG_INVALID' } } } }]), 'TAG_INVALID', 'erreur de mutation');

console.log('✅ Actions de modération OK');
