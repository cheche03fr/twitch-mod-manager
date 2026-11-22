// Titre, catégorie, tags et pubs de la chaîne d'un autre streamer dont on est éditeur, comme le fait twitch.tv
// (API GraphQL interne : l'API officielle réserve ces actions au propriétaire de la chaîne).
// shortcut: empreintes persistées relevées en novembre 2026, elles cassent si Twitch les change ; les relever alors
// en modifiant les infos du stream dans la Vue Twitch officielle.
const crypto = require('crypto');
const { postTwitchGql } = require('./twitchModLog');

const BROADCAST_SETTINGS_HASH = '856e69184d9d3aa37529d1cec489a164807eff0c6264b20832d06b669ee80ea5';
const FREEFORM_TAGS_HASH = '8aaac5a848941ff6a26bacb44b6b251909c77b84f39ce6eced8f4c694036fc08';
const START_AD_HASH = '677ab2009f31a90623440c7a2614029412eef0e246ce8c88113b1014e469432b';
const AD_LENGTHS = [30, 60, 90, 120, 150, 180];

function buildChannelEditOperations({ broadcasterId, title, gameId, gameName, language, tags }) {
  const id = String(broadcasterId);
  return [
    {
      operationName: 'EditBroadcastContext_BroadcastSettingsMutation',
      variables: { input: { broadcasterLanguage: language, game: gameName, categoryID: gameId, status: title, userID: id } },
      hash: BROADCAST_SETTINGS_HASH
    },
    {
      operationName: 'EditBroadcastContext_FreeformTagsMutation',
      variables: { input: { contentID: id, contentType: 'CHANNEL', freeformTagNames: tags } },
      hash: FREEFORM_TAGS_HASH
    }
  ];
}

// Première erreur d'une réponse GraphQL (erreur globale ou champ « error » d'une mutation), null si tout a réussi
function gqlError(json) {
  for (const result of [].concat(json)) {
    if (result?.errors?.length) return result.errors[0].message || 'erreur inconnue';
    for (const value of Object.values(result?.data || {})) {
      if (value?.error) return value.error.code || value.error.message || 'erreur inconnue';
    }
  }
  return null;
}

async function updateChannelViaWeb(electronSession, fields) {
  const { needsWebLogin, json } = await postTwitchGql(electronSession, buildChannelEditOperations(fields));
  if (needsWebLogin) return { success: false, needsWebLogin: true };
  const error = gqlError(json);
  return error ? { success: false, error: `Twitch a refusé la modification : ${error}` } : { success: true };
}

// Comme la tuile « Lancer une pub » du Gestionnaire de stream (commercialID : identifiant aléatoire de la demande)
function buildStartAdOperation(broadcasterId, lengthSeconds, commercialID) {
  const length = Number(lengthSeconds);
  if (!AD_LENGTHS.includes(length)) throw new Error(`Durée de pub invalide : ${lengthSeconds}`);
  return {
    operationName: 'StartAd',
    variables: { input: { channelID: String(broadcasterId), lengthSeconds: length, trigger: 'QUICK_ACTION', commercialID } },
    hash: START_AD_HASH
  };
}

async function startAdViaWeb(electronSession, broadcasterId, lengthSeconds) {
  const commercialID = crypto.randomUUID().replace(/-/g, '');
  const { needsWebLogin, json } = await postTwitchGql(electronSession, [buildStartAdOperation(broadcasterId, lengthSeconds, commercialID)]);
  if (needsWebLogin) return { success: false, needsWebLogin: true };
  const error = gqlError(json);
  if (error === 'RATE_LIMITED') return { success: false, error: 'Une pub a été lancée il y a peu : Twitch impose un délai avant la suivante, réessaie dans quelques minutes.' };
  return error ? { success: false, error: `Twitch a refusé la pub : ${error}` } : { success: true };
}

// Délai entre deux pubs, comme la tuile du Gestionnaire de stream (lecture seule)
const AD_FREQUENCY_HASH = 'cc669fd46457b011c7df5b1c90b33cbead616f16d883a97f4f14788a06ba53f7';

/**
 * Réponse AdFrequencyQuery -> heure ISO jusqu'à laquelle les pubs sont bloquées, null si on peut en lancer une.
 */
function parseAdCooldown(json, now = Date.now()) {
  const props = [].concat(json)[0]?.data?.user?.adProperties;
  const last = Date.parse(props?.lastTriggeredAt);
  const frequency = Number(props?.frequency);
  if (!Number.isFinite(last) || !Number.isFinite(frequency) || frequency <= 0) return null;
  const endsAt = last + frequency * 1000;
  return endsAt > now ? new Date(endsAt).toISOString() : null;
}

async function fetchAdCooldown(electronSession, login) {
  const { needsWebLogin, json } = await postTwitchGql(electronSession, [{
    operationName: 'AdFrequencyQuery', variables: { login }, hash: AD_FREQUENCY_HASH
  }]);
  if (needsWebLogin) return { success: false, needsWebLogin: true };
  const error = gqlError(json);
  if (error) return { success: false, error };
  return { success: true, cooldownEndsAt: parseAdCooldown(json) };
}

module.exports = {
  buildChannelEditOperations, buildStartAdOperation, gqlError, parseAdCooldown,
  updateChannelViaWeb, startAdViaWeb, fetchAdCooldown
};
