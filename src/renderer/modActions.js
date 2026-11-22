// Historique des actions de modération Twitch (événements EventSub channel.moderate v2)
const MOD_ACTIONS_KEY = 'twitch_mod_manager_mod_actions';
const MOD_ACTIONS_MAX = 100;

const CHAT_MODES = {
  emoteonly: 'Mode émotes uniquement activé',
  emoteonlyoff: 'Mode émotes uniquement désactivé',
  followersoff: 'Mode followers désactivé',
  subscribers: 'Mode abonnés activé',
  subscribersoff: 'Mode abonnés désactivé',
  uniquechat: 'Mode messages uniques activé',
  uniquechatoff: 'Mode messages uniques désactivé',
  slowoff: 'Mode lent désactivé'
};

const USER_ACTIONS = {
  vip: ['💎', 'Ajouté comme VIP'],
  unvip: ['💎', 'Retiré des VIP'],
  mod: ['🗡️', 'Nommé modérateur'],
  unmod: ['🗡️', 'Retiré des modérateurs'],
  unban: ['✅', 'Débanni'],
  untimeout: ['✅', 'Exclusion levée'],
  unraid: ['🪂', 'Raid annulé']
};

function formatActionDuration(seconds) {
  if (seconds < 60) return `${seconds} s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} h`;
  return `${Math.round(seconds / 86400)} j`;
}

/**
 * Transforme un événement channel.moderate en { icon, target, text } (le texte contient « par <modérateur> »).
 */
function describeModAction(entry) {
  if (entry.twitch) return entry.twitch; // historique Twitch : déjà rédigé par Twitch
  const e = entry.event;
  const by = ` par ${e.moderator_user_name || e.moderator_user_login || 'Twitch'}`;
  const shared = e.action.startsWith('shared_chat_');
  const action = shared ? e.action.slice('shared_chat_'.length) : e.action;
  const data = e[e.action] || {};
  const suffix = shared ? ' (chat partagé)' : '';
  const reason = data.reason ? ` · Motif : ${data.reason}` : '';
  const target = data.user_login || null;

  if (USER_ACTIONS[action]) {
    const [icon, label] = USER_ACTIONS[action];
    return { icon, target, text: `${label}${by}${suffix}` };
  }
  if (CHAT_MODES[action]) return { icon: '💬', target: null, text: `${CHAT_MODES[action]}${by}` };

  switch (action) {
    case 'raid':
      return { icon: '🪂', target, text: `Raid lancé${by} avec ${data.viewer_count} viewer·euse·s` };
    case 'ban':
      return { icon: '🔨', target, text: `Banni${by}${suffix}${reason}` };
    case 'timeout': {
      const seconds = Math.max(1, Math.round((Date.parse(data.expires_at) - Date.parse(entry.receivedAt)) / 1000));
      return { icon: '⏱️', target, text: `Exclu ${formatActionDuration(seconds)}${by}${suffix}${reason}` };
    }
    case 'delete':
      return { icon: '🗑️', target, text: `Message supprimé${by}${suffix} : « ${data.message_body || ''} »` };
    case 'warn':
      return { icon: '⚠️', target, text: `Averti${by}${reason}` };
    case 'clear':
      return { icon: '🧹', target: null, text: `Chat vidé${by}` };
    case 'slow':
      return { icon: '💬', target: null, text: `Mode lent (${data.wait_time_seconds} s) activé${by}` };
    case 'followers':
      return { icon: '💬', target: null, text: `Mode followers (${data.follow_duration_minutes} min) activé${by}` };
    case 'approve_unban_request':
    case 'deny_unban_request': {
      const req = e.unban_request || {};
      const verdict = action === 'approve_unban_request' ? 'acceptée' : 'refusée';
      return { icon: '📨', target: req.user_login || null, text: `Demande de débannissement ${verdict}${by}` };
    }
    case 'add_blocked_term':
    case 'add_permitted_term':
    case 'remove_blocked_term':
    case 'remove_permitted_term': {
      const terms = (e.automod_terms?.terms || []).join(', ');
      const verb = action.startsWith('add') ? 'ajouté' : 'retiré';
      const kind = action.endsWith('blocked_term') ? 'Terme bloqué' : 'Terme autorisé';
      return { icon: '🚫', target: null, text: `${kind} ${verb}${by} : ${terms}` };
    }
    default:
      return { icon: '🛡️', target, text: `${e.action}${by}` };
  }
}

/** « à l'instant », « il y a 5 min », « il y a 2 h », « hier », « avant-hier », « il y a 3 jours » */
function formatRelativeTime(iso, now = new Date()) {
  const date = new Date(iso);
  const minutes = Math.floor((now - date) / 60000);
  const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
  if (days === 0) {
    if (minutes < 1) return "à l'instant";
    if (minutes < 60) return `il y a ${minutes} min`;
    return `il y a ${Math.floor(minutes / 60)} h`;
  }
  if (days === 1) return 'hier';
  if (days === 2) return 'avant-hier';
  return `il y a ${days} jours`;
}

/** Nouvel historique avec l'action ajoutée en tête (100 par chaîne au maximum) */
function addModAction(store, entry) {
  const id = entry.event.broadcaster_user_id;
  const list = [entry, ...(store[id] || [])].slice(0, MOD_ACTIONS_MAX);
  return { ...store, [id]: list };
}

function loadModActions() {
  try {
    const parsed = JSON.parse(localStorage.getItem(MOD_ACTIONS_KEY));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Historique Twitch (s'il est chargé) + actions reçues en direct depuis, sans doublon, du plus récent au plus ancien
 */
function mergeModActions(twitchEntries, liveEntries) {
  if (!Array.isArray(twitchEntries)) return liveEntries || [];
  const newest = twitchEntries[0]?.receivedAt ? Date.parse(twitchEntries[0].receivedAt) : 0;
  const newer = (liveEntries || []).filter(e => Date.parse(e.receivedAt) > newest);
  return [...newer, ...twitchEntries];
}

function saveModActions(store) {
  localStorage.setItem(MOD_ACTIONS_KEY, JSON.stringify(store));
}

if (typeof module !== 'undefined') {
  module.exports = { describeModAction, formatRelativeTime, addModAction, mergeModActions, MOD_ACTIONS_MAX };
}
