// Historique des chuchotements, lu comme le site twitch.tv (API GraphQL interne : l'API officielle ne permet
// que d'envoyer et de recevoir en direct). Session de l'onglet « Vue Twitch officielle ».
// shortcut: empreintes persistées relevées en novembre 2026, elles cassent si Twitch les change ; les relever alors
// en ouvrant ses chuchotements dans la Vue Twitch officielle. Seuls les 20 derniers messages d'une conversation sont lus.
const { runTwitchGql } = require('./twitchModLog');

const THREADS_HASH = 'b9535d107dc5b016645d2ef895c295e8001df6ff89ca26231599e0d11b2a5927';
const THREAD_HASH = 'c11d356f7e2d8a2b7da3f90c11487414b7fb188649bafe331e93937a5da2310d';

/** Identifiant de conversation de Twitch : les deux identifiants de compte, du plus petit au plus grand. */
function whisperThreadId(userA, userB) {
  return [String(userA), String(userB)].sort((a, b) => Number(a) - Number(b)).join('_');
}

const toPerson = (p) => (p ? {
  id: String(p.id),
  login: p.login || '',
  displayName: p.displayName || p.login || '',
  avatar: p.profileImageURL || ''
} : null);

const otherParticipant = (participants, selfId) =>
  toPerson((participants || []).find(p => String(p?.id) !== String(selfId)) || participants?.[0]);

const toMessage = (node) => ({
  id: node.id,
  fromId: String(node.from?.id || ''),
  text: node.content?.content || '',
  sentAt: node.sentAt
});

const visibleMessages = (edges) => (edges || [])
  .map(e => e?.node)
  .filter(n => n && !n.deletedAt && typeof n.sentAt === 'string')
  .map(toMessage);

/** Liste des conversations (plus récente en premier) : { threadId, other, lastMessage, unread }. */
function parseWhisperThreads(json, selfId) {
  const result = [].concat(json)[0];
  const edges = result?.data?.currentUser?.whisperThreads?.edges;
  if (!Array.isArray(edges)) throw new Error('Réponse Twitch inattendue');
  return edges
    .map(e => e?.node)
    .filter(Boolean)
    .map(node => ({
      threadId: String(node.id),
      other: otherParticipant(node.participants, selfId),
      lastMessage: visibleMessages(node.messages?.edges)[0] || null,
      unread: Number(node.unreadMessagesCount) || 0
    }))
    .sort((a, b) => Date.parse(b.lastMessage?.sentAt || 0) - Date.parse(a.lastMessage?.sentAt || 0));
}

/** Une conversation : { threadId, other, messages } avec les messages du plus ancien au plus récent. */
function parseWhisperThread(json, selfId) {
  const thread = [].concat(json)[0]?.data?.whisperThread;
  if (thread === null) return { threadId: null, other: null, messages: [] }; // aucune conversation encore
  if (!thread) throw new Error('Réponse Twitch inattendue');
  return {
    threadId: String(thread.id),
    other: otherParticipant(thread.participants, selfId),
    messages: visibleMessages(thread.messages?.edges).sort((a, b) => Date.parse(a.sentAt) - Date.parse(b.sentAt))
  };
}

async function fetchWhisperThreads(electronSession, selfId) {
  const res = await runTwitchGql(electronSession, [{ operationName: 'Whispers_Whispers_UserWhisperThreads', variables: {}, hash: THREADS_HASH }]);
  return res.success ? { success: true, threads: parseWhisperThreads(res.json, selfId) } : res;
}

async function fetchWhisperThread(electronSession, threadId, selfId) {
  const res = await runTwitchGql(electronSession, [{ operationName: 'Whispers_Thread_WhisperThread', variables: { id: threadId }, hash: THREAD_HASH }]);
  return res.success ? { success: true, ...parseWhisperThread(res.json, selfId) } : res;
}

module.exports = { whisperThreadId, parseWhisperThreads, parseWhisperThread, fetchWhisperThreads, fetchWhisperThread };
