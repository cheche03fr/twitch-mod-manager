// Prédictions sur la chaîne d'un autre streamer (modérateur ou éditeur), comme la Mod View de twitch.tv
// (API GraphQL interne : l'API officielle réserve les prédictions au propriétaire de la chaîne).
// shortcut: empreintes persistées relevées en novembre 2026, elles cassent si Twitch les change ; les relever alors
// en gérant une prédiction dans la Vue Twitch officielle.
const { runTwitchGql } = require('./twitchModLog');

const HASHES = {
  ChannelPointsPredictionContext: 'd364abb25d0ad06fc973de923fb10a7631c6cfb4ef7d24cd3e9811593db09ccd',
  createPredictionEvent: '92268878ac4abe722bcdcba85a4e43acdd7a99d86b05851759e1d8f385cc32ea',
  LockPrediction: '1f2b1eb44af35f055308e78ffbe81c2f958408f9b32d076a759a84ab213285d4',
  ResolvePrediction: '10c803ec11bb8c2957d66bc6a47349dc3c5f51d694585b5ebc37ba656da413c1',
  DeletePrediction: '35d375614e426624456ee7be4a2e0fbc0a410c0a91c21f6044cb3cd5c38c4e4d'
};
const UUID = /^[0-9a-f-]{36}$/i;

const operation = (operationName, variables) => ({ operationName, variables, hash: HASHES[operationName] });

// Prédiction GraphQL -> même forme que l'API officielle (lue par le panneau Prédictions)
function toHelixPrediction(node, status) {
  return {
    id: node.id,
    title: node.title,
    status: status || node.status,
    created_at: node.createdAt,
    locked_at: node.lockedAt || null,
    ended_at: node.endedAt || null,
    prediction_window: node.predictionWindowSeconds,
    winning_outcome_id: node.winningOutcome?.id || null,
    outcomes: (node.outcomes || []).map(o => ({
      id: o.id, title: o.title, color: o.color, channel_points: o.totalPoints || 0, users: o.totalUsers || 0
    }))
  };
}

function parsePredictionContext(json) {
  const result = [].concat(json)[0];
  if (result?.errors?.length) throw new Error(result.errors[0].message || 'Erreur Twitch');
  const channel = result?.data?.community?.channel;
  if (!channel) throw new Error('Réponse Twitch inattendue');
  return [
    ...(channel.activePredictionEvents || []).map(n => toHelixPrediction(n, 'ACTIVE')),
    ...(channel.lockedPredictionEvents || []).map(n => toHelixPrediction(n, 'LOCKED')),
    ...(channel.resolvedPredictionEvents?.edges || []).map(e => e?.node).filter(Boolean).map(n => toHelixPrediction(n))
  ];
}

function buildCreatePredictionOperation(channelId, { title, outcomes, prediction_window }) {
  const titles = (outcomes || []).map(t => String(t).trim()).filter(Boolean);
  if (!String(title || '').trim() || titles.length < 2 || titles.length > 10) throw new Error('Question et 2 à 10 choix requis');
  const window = Number(prediction_window) || 300;
  if (window < 30 || window > 1800) throw new Error('Durée de prédiction invalide (30 s à 30 min)');
  // Comme twitch.tv : bleu / rose pour deux choix, tout en bleu au-delà
  const colorOf = (i) => (titles.length === 2 && i === 1 ? 'PINK' : 'BLUE');
  return operation('createPredictionEvent', {
    input: {
      title: String(title).trim(),
      channelID: String(channelId),
      outcomes: titles.map((t, i) => ({ title: t, color: colorOf(i) })),
      predictionWindowSeconds: window
    }
  });
}

function buildUpdatePredictionOperation(predictionId, status, winningOutcomeId) {
  if (!UUID.test(String(predictionId))) throw new Error('Identifiant de prédiction invalide');
  if (status === 'LOCKED') return operation('LockPrediction', { input: { id: predictionId } });
  if (status === 'CANCELED') return operation('DeletePrediction', { input: { id: predictionId } });
  if (status === 'RESOLVED') {
    if (!UUID.test(String(winningOutcomeId))) throw new Error('Choix gagnant invalide');
    return operation('ResolvePrediction', { input: { eventID: predictionId, outcomeID: winningOutcomeId } });
  }
  throw new Error(`Action de prédiction inconnue : ${status}`);
}

async function sendPredictionOperation(electronSession, op) {
  const res = await runTwitchGql(electronSession, [op]);
  if (res.code === 'EVENT_NOT_ACTIVE') {
    return { success: false, error: 'La prédiction n\'est plus ouverte aux votes : le temps est écoulé et Twitch l\'a déjà verrouillée. Choisis maintenant le gagnant.' };
  }
  return res;
}

async function getPredictionsViaWeb(electronSession, login) {
  const res = await sendPredictionOperation(electronSession, operation('ChannelPointsPredictionContext', { count: 10, channelLogin: login }));
  return res.success ? { success: true, data: parsePredictionContext(res.json) } : res;
}

const createPredictionViaWeb = (electronSession, channelId, predData) =>
  sendPredictionOperation(electronSession, buildCreatePredictionOperation(channelId, predData));

const updatePredictionViaWeb = (electronSession, predictionId, status, winningOutcomeId) =>
  sendPredictionOperation(electronSession, buildUpdatePredictionOperation(predictionId, status, winningOutcomeId));

module.exports = {
  parsePredictionContext, buildCreatePredictionOperation, buildUpdatePredictionOperation,
  getPredictionsViaWeb, createPredictionViaWeb, updatePredictionViaWeb
};
