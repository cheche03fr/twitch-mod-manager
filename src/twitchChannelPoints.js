// Points de chaîne : file des demandes de récompenses, lue et traitée comme la file de twitch.tv
// (API GraphQL interne : l'API officielle ne gère que les récompenses créées par l'app, et seulement pour le streamer).
// shortcut: empreintes persistées relevées en novembre 2026, elles cassent si Twitch les change ; les relever alors
// en ouvrant la file des récompenses dans la Vue Twitch officielle. Seules les 50 plus anciennes demandes sont lues.
const { runTwitchGql } = require('./twitchModLog');

const HASHES = {
  RedemptionsByRewardID_Paginated: '74740dc72455f428e464fad11770a543c3ac1092b89cb39ed7411ff3a69e6d37',
  BulkUpdateRedemptions: 'cba9ec6d62b16450c3b6fad790b6c4bc26ff3efb68731bbbb7ecc24c3b9188ce'
};
const QUEUE_SIZE = 50;
const UUID = /^[0-9a-f-]{36}$/i;
// Valider : FULFILLED ; refuser (points rendus au spectateur) : CANCELED
const REDEMPTION_STATUSES = new Set(['FULFILLED', 'CANCELED']);

/** File d'attente -> { redemptions: [{ id, rewardId, rewardTitle, userId, input, redeemedAt }], hasMore }, plus ancienne en premier. */
function parseRedemptionQueue(json) {
  const queue = [].concat(json)[0]?.data?.user?.channel?.communityPointsRedemptionQueue;
  if (!queue) throw new Error('Réponse Twitch inattendue');
  const redemptions = (queue.edges || [])
    .map(e => e?.node)
    .filter(n => n?.id)
    .map(n => ({
      id: String(n.id),
      rewardId: String(n.reward?.id || ''),
      rewardTitle: n.reward?.title || 'Récompense',
      userId: String(n.user?.id || ''),
      input: n.input || null,
      redeemedAt: n.timestamp
    }));
  return { redemptions, hasMore: Boolean(queue.pageInfo?.hasNextPage) };
}

function buildUpdateRedemptionsOperation(channelId, redemptionIds, status) {
  if (!REDEMPTION_STATUSES.has(status)) throw new Error(`Action inconnue : ${status}`);
  const ids = [].concat(redemptionIds).map(String);
  if (!ids.length || ids.length > QUEUE_SIZE || !ids.every(id => UUID.test(id))) throw new Error('Demandes invalides');
  return {
    operationName: 'BulkUpdateRedemptions',
    hash: HASHES.BulkUpdateRedemptions,
    variables: { input: { channelID: String(channelId), newStatus: status, oldStatus: 'UNFULFILLED', redemptionIDs: ids } }
  };
}

async function fetchRedemptionQueue(electronSession, login) {
  const res = await runTwitchGql(electronSession, [{
    operationName: 'RedemptionsByRewardID_Paginated',
    hash: HASHES.RedemptionsByRewardID_Paginated,
    variables: { channelLogin: login, order: 'OLDEST', count: QUEUE_SIZE }
  }]);
  return res.success ? { success: true, ...parseRedemptionQueue(res.json) } : res;
}

const updateRedemptionsViaWeb = (electronSession, channelId, redemptionIds, status) =>
  runTwitchGql(electronSession, [buildUpdateRedemptionsOperation(channelId, redemptionIds, status)], 'Twitch a refusé l\'action');

module.exports = { parseRedemptionQueue, buildUpdateRedemptionsOperation, fetchRedemptionQueue, updateRedemptionsViaWeb };
