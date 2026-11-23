// Historique des actions de modération, lu comme la Mod View de twitch.tv (API GraphQL interne, non documentée).
// shortcut: requête « persistée » de Twitch, elle casse si Twitch change son empreinte ; la relever alors dans la Mod View.
const GQL_URL = 'https://gql.twitch.tv/gql';
const TWITCH_WEB_CLIENT_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko'; // identifiant public du site twitch.tv
const MOD_ACTIONS_LIST_HASH = 'f09041ba19fdd3d0ceb6e9b9163d5d903eddd625e1b156e8af6deb207ed3e77e';
const MOD_VIEW_PARTITION = 'persist:twitch_mod';

const ICONS = {
  RAID: '🪂',
  VIP: '💎',
  SWORD: '🗡️',
  SHARED_CHAT: '🤝',
  PERMISSION_ADDED: '💬',
  PERMISSION_REMOVED: '💬',
  BAN: '🔨',
  BANNED: '🔨',
  UNBAN: '✅',
  TIMEOUT: '⏱️',
  DELETE: '🗑️',
  WARNING: '⚠️'
};

function fragmentsToText(localized) {
  return (localized?.localizedStringFragments || [])
    .map(f => f?.token?.text ?? f?.token?.displayName ?? f?.token?.login ?? '')
    .join('')
    .trim();
}

// Le titre est un pseudo seul (raid, VIP, ban…) : c'est la personne visée
function titleUser(title) {
  const fragments = title?.localizedStringFragments || [];
  return fragments.length === 1 && fragments[0]?.token?.login ? fragments[0].token.login : null;
}

/**
 * Réponse GraphQL ModActionsList -> [{ receivedAt, twitch: { icon, target, text } }], du plus récent au plus ancien.
 */
function parseModActionLogs(json) {
  const result = Array.isArray(json) ? json[0] : json;
  if (result?.errors?.length) throw new Error(result.errors[0].message || 'Erreur Twitch');
  const edges = result?.data?.channel?.moderationActionLogs?.edges;
  if (!Array.isArray(edges)) throw new Error('Réponse Twitch inattendue');

  return edges
    .map(edge => edge?.node)
    .filter(node => node && typeof node.createdAt === 'string')
    .map(node => {
      const target = titleUser(node.title);
      const title = fragmentsToText(node.title);
      const content = fragmentsToText(node.content);
      return {
        receivedAt: node.createdAt,
        twitch: {
          icon: ICONS[node.icon] || '🛡️',
          target,
          text: target ? content : [title, content].filter(Boolean).join(' : ')
        }
      };
    });
}

/**
 * Envoie des requêtes persistées [{ operationName, variables, hash }] avec la session twitch.tv de la Vue Twitch officielle
 * (le jeton ne quitte pas le processus principal). Renvoie { needsWebLogin: true } sans session, sinon { json }.
 */
async function postTwitchGql(electronSession, operations) {
  const [cookie] = await electronSession.fromPartition(MOD_VIEW_PARTITION)
    .cookies.get({ name: 'auth-token', domain: 'twitch.tv' });
  if (!cookie?.value) return { needsWebLogin: true };

  const response = await fetch(GQL_URL, {
    method: 'POST',
    headers: {
      'Client-Id': TWITCH_WEB_CLIENT_ID,
      Authorization: `OAuth ${cookie.value}`,
      'Accept-Language': 'fr-FR'
    },
    body: JSON.stringify(operations.map(({ operationName, variables, hash }) => ({
      operationName,
      variables,
      extensions: { persistedQuery: { version: 1, sha256Hash: hash } }
    })))
  });
  if (response.status === 401) return { needsWebLogin: true };
  if (!response.ok) throw new Error(`Twitch a répondu ${response.status}`);
  return { json: await response.json() };
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

/**
 * Envoie des opérations et lit la réponse : { success: true, json }, { success: false, needsWebLogin: true }
 * sans session twitch.tv, ou { success: false, code, error } si Twitch refuse (error = « refusal : code »).
 */
async function runTwitchGql(electronSession, operations, refusal = 'Twitch a refusé') {
  const { needsWebLogin, json } = await postTwitchGql(electronSession, operations);
  if (needsWebLogin) return { success: false, needsWebLogin: true };
  const code = gqlError(json);
  return code ? { success: false, code, error: `${refusal} : ${code}` } : { success: true, json };
}

/**
 * Charge l'historique des actions de modération d'une chaîne.
 */
async function fetchTwitchModLog(electronSession, broadcasterId) {
  const { needsWebLogin, json } = await postTwitchGql(electronSession, [{
    operationName: 'ModActionsList',
    variables: { channelID: String(broadcasterId) },
    hash: MOD_ACTIONS_LIST_HASH
  }]);
  if (needsWebLogin) return { success: false, needsWebLogin: true };
  return { success: true, entries: parseModActionLogs(json) };
}

module.exports = { parseModActionLogs, fetchTwitchModLog, postTwitchGql, runTwitchGql, gqlError };
