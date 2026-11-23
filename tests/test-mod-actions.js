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

// Chuchotements : historique par l'API interne, événement en direct
const { whisperThreadId, parseWhisperThreads, parseWhisperThread } = require('../src/twitchWhispers');
const { whisperFromEvent, hasWhisperScopes } = require('../src/eventSubClient');
assert.strictEqual(whisperThreadId('155767436', '74015529'), '74015529_155767436', 'identifiant de conversation trié');
const person = (id, login) => ({ id, login, displayName: login.toUpperCase(), profileImageURL: `https://img/${login}` });
const wMsg = (id, from, sentAt, extra = {}) => ({ node: { id, from: { id: from }, content: { content: 'msg ' + id }, sentAt, deletedAt: null, ...extra } });
const threads = parseWhisperThreads([{ data: { currentUser: { whisperThreads: { edges: [
  { node: { id: '1_2', participants: [person('1', 'moi'), person('2', 'ancien')], messages: { edges: [wMsg('a', '2', '2026-11-20T10:00:00Z')] }, unreadMessagesCount: 0 } },
  { node: { id: '1_3', participants: [person('3', 'recent'), person('1', 'moi')], messages: { edges: [wMsg('b', '1', '2026-11-22T10:00:00Z')] }, unreadMessagesCount: 2 } }
] } } } }], '1');
assert.deepStrictEqual(threads.map(t => [t.threadId, t.other.login, t.unread]), [['1_3', 'recent', 2], ['1_2', 'ancien', 0]], 'plus récente en premier, interlocuteur = l\'autre');
const conv = parseWhisperThread([{ data: { whisperThread: { id: '1_2', participants: [person('1', 'moi'), person('2', 'ancien')], messages: { edges: [
  wMsg('c', '1', '2026-11-22T10:05:00Z'), wMsg('d', '2', '2026-11-22T10:00:00Z'), wMsg('e', '2', '2026-11-22T10:06:00Z', { deletedAt: '2026-11-22T10:07:00Z' })
] } } } }], '1');
assert.deepStrictEqual(conv.messages.map(m => m.id), ['d', 'c'], 'ordre chronologique, messages supprimés retirés');
assert.deepStrictEqual(parseWhisperThread([{ data: { whisperThread: null } }], '1').messages, [], 'pas encore de conversation');
assert.deepStrictEqual(whisperFromEvent({ whisper_id: 'w1', from_user_id: 2, from_user_login: 'ancien', from_user_name: 'Ancien', to_user_id: 1, whisper: { text: 'salut' } }, '2026-11-23T10:00:00Z'),
  { id: 'w1', fromId: '2', fromLogin: 'ancien', fromName: 'Ancien', toId: '1', text: 'salut', sentAt: '2026-11-23T10:00:00Z' });
assert.ok(hasWhisperScopes(SCOPES.split(' ')), 'droit des chuchotements demandé à la connexion');

// Points de chaîne : file des demandes (forme relevée sur twitch.tv) et validation / remboursement
const { parseRedemptionQueue, buildUpdateRedemptionsOperation } = require('../src/twitchChannelPoints');
const R1 = '58367a3b-7290-4205-9d45-e1683fafa939';
const queue = parseRedemptionQueue([{ data: { user: { channel: { communityPointsRedemptionQueue: { edges: [
  { node: { id: R1, reward: { id: 'r1', title: 'Hydratation' }, user: { id: 74015529 }, input: null, timestamp: '2026-11-19T14:16:00Z' } },
  { node: { id: 'b2', reward: { id: 'r2', title: 'Une question' }, user: { id: '44' }, input: 'Ça va ?', timestamp: '2026-11-19T16:18:48Z' } },
  { node: null }
], pageInfo: { hasNextPage: true } } } } } }]);
assert.deepStrictEqual(queue.redemptions.map(r => [r.id, r.rewardTitle, r.userId, r.input]),
  [[R1, 'Hydratation', '74015529', null], ['b2', 'Une question', '44', 'Ça va ?']], 'demandes de la file, nœud vide ignoré');
assert.strictEqual(queue.hasMore, true, 'plus de 50 demandes signalées');
assert.throws(() => parseRedemptionQueue([{ data: { user: null } }]), /inattendue/);
assert.deepStrictEqual(buildUpdateRedemptionsOperation(143330248, [R1], 'CANCELED').variables,
  { input: { channelID: '143330248', newStatus: 'CANCELED', oldStatus: 'UNFULFILLED', redemptionIDs: [R1] } });
assert.strictEqual(buildUpdateRedemptionsOperation('1', R1, 'FULFILLED').operationName, 'BulkUpdateRedemptions');
assert.throws(() => buildUpdateRedemptionsOperation('1', [R1], 'UNFULFILLED'), /Action inconnue/, 'seulement valider ou refuser');
assert.throws(() => buildUpdateRedemptionsOperation('1', ['pas-un-id'], 'FULFILLED'), /Demandes invalides/);
assert.throws(() => buildUpdateRedemptionsOperation('1', [], 'FULFILLED'), /Demandes invalides/);

console.log('✅ Actions de modération OK');
