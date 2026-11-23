const { CLIENT_ID } = require('./config');

const HELIX_URL = 'https://api.twitch.tv/helix';

/**
 * Statut éditeur d'après GET /streams/markers (vérifié sur de vraies chaînes) :
 * 200 = éditeur, 401/403 = pas éditeur, 404 = chaîne sans VOD, Twitch répond avant de vérifier les droits.
 */
function editorStatusFromMarkersResponse(status) {
  if (status === 200) return 'yes';
  if (status === 401 || status === 403) return 'no';
  return 'unknown';
}

const authHeaders = (token) => ({ 'Client-Id': CLIENT_ID, Authorization: `Bearer ${token}` });

/** Adresse Helix ; une valeur tableau répète le paramètre (user_id=1&user_id=2). */
function helixUrl(path, query = {}) {
  const url = new URL(HELIX_URL + path);
  Object.entries(query).forEach(([key, value]) => {
    [].concat(value).forEach(v => { if (v !== undefined && v !== null) url.searchParams.append(key, String(v)); });
  });
  return url.toString();
}

/**
 * Appel à l'API Helix : en-têtes communs, corps JSON, réponse JSON (null si vide).
 * En cas d'échec : Error « <label> (<code>): <détail> » ; main.js reconnaît le code entre parenthèses.
 */
async function helix(token, path, { method = 'GET', query, body, label }) {
  const response = await fetch(helixUrl(path, query), {
    method,
    headers: body ? { ...authHeaders(token), 'Content-Type': 'application/json' } : authHeaders(token),
    body: body ? JSON.stringify(body) : undefined
  });
  if (!response.ok) {
    throw new Error(`${label} (${response.status}): ${await response.text()}`);
  }
  return response.status === 204 ? null : response.json();
}

/** Premier élément de data, ou null. */
const first = (json) => json?.data?.[0] || null;

/**
 * Service pour interagir avec l'API Twitch Helix
 */
class TwitchService {
  /** Vérifie la validité du jeton d'accès Twitch et renvoie ses données (login, user_id, scopes). */
  static async validateToken(token) {
    const response = await fetch('https://id.twitch.tv/oauth2/validate', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      throw new Error(`Token invalide ou expiré (Code ${response.status})`);
    }
    return response.json();
  }

  static async getUserInfo(token, userId) {
    return first(await helix(token, '/users', { query: { id: userId }, label: 'Impossible de récupérer les infos utilisateur' }));
  }

  /** Utilisateur par son pseudo (avec ou sans @), null s'il n'existe pas. */
  static async getUserByLogin(token, login) {
    const cleanLogin = login.replace(/^@/, '').trim().toLowerCase();
    return first(await helix(token, '/users', { query: { login: cleanLogin }, label: 'Utilisateur introuvable' }));
  }

  /** Toutes les chaînes modérées (pagination complète). */
  static async getModeratedChannels(token, userId) {
    let allChannels = [];
    let cursor = null;
    do {
      const result = await helix(token, '/moderation/channels', {
        query: { user_id: userId, first: 100, after: cursor },
        label: 'Erreur récupération chaînes modérées'
      });
      if (Array.isArray(result.data)) allChannels = allChannels.concat(result.data);
      cursor = result.pagination?.cursor || null;
    } while (cursor);
    return allChannels;
  }

  /** Découpe un tableau en sous-tableaux de taille maximale donnée. */
  static chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /** Liste Helix indexée par une clé ; une erreur n'empêche pas d'afficher les chaînes (carte incomplète). */
  static async fetchMap(token, path, query, key, label) {
    const map = new Map();
    try {
      const json = await helix(token, path, { query, label });
      for (const item of json.data || []) map.set(item[key], item);
    } catch (err) {
      console.error(`${label}:`, err.message);
    }
    return map;
  }

  /** Statut en direct et profil de chaque chaîne (par paquets de 100). */
  static async enrichChannelsData(token, channels) {
    if (!channels || channels.length === 0) return [];

    const streamsMap = new Map();
    const usersMap = new Map();
    for (const ids of this.chunkArray(channels.map(c => c.broadcaster_id), 100)) {
      const [streams, users] = await Promise.all([
        this.fetchMap(token, '/streams', { user_id: ids }, 'user_id', 'Erreur récupération streams'),
        this.fetchMap(token, '/users', { id: ids }, 'id', 'Erreur récupération profils')
      ]);
      streams.forEach((v, k) => streamsMap.set(k, v));
      users.forEach((v, k) => usersMap.set(k, v));
    }

    return channels.map(channel => {
      const stream = streamsMap.get(channel.broadcaster_id);
      const user = usersMap.get(channel.broadcaster_id);
      return {
        id: channel.broadcaster_id,
        login: channel.broadcaster_login,
        name: user?.display_name || channel.broadcaster_name,
        profileImageUrl: user?.profile_image_url || '',
        description: user?.description || '',
        isLive: Boolean(stream),
        title: stream?.title || '',
        gameName: stream?.game_name || '',
        viewerCount: stream?.viewer_count || 0,
        startedAt: stream?.started_at || null,
        thumbnailUrl: stream?.thumbnail_url || ''
      };
    });
  }

  // ==========================================
  // OUTILS DE MODÉRATION HELIX
  // ==========================================

  /** Droits réels sur la chaîne, testés appel par appel. */
  static async checkModerationRights(token, broadcasterId, moderatorId) {
    const rights = {
      canManageChatSettings: false,
      canReadChatters: false,
      canManageBans: false,
      canManageShieldMode: false,
      chatSettings: null,
      shieldMode: null,
      scopes: []
    };

    try {
      rights.scopes = (await this.validateToken(token)).scopes || [];
    } catch (e) {
      console.warn('Erreur validation scopes:', e.message);
    }

    const [chatSettings, chatters, shieldMode] = await Promise.allSettled([
      this.getChatSettings(token, broadcasterId, moderatorId),
      this.getChatters(token, broadcasterId, moderatorId, 1),
      this.getShieldMode(token, broadcasterId, moderatorId)
    ]);
    rights.canManageChatSettings = chatSettings.status === 'fulfilled';
    rights.chatSettings = chatSettings.value ?? null;
    rights.canReadChatters = chatters.status === 'fulfilled';
    rights.canManageShieldMode = shieldMode.status === 'fulfilled';
    rights.shieldMode = shieldMode.value ?? null;
    rights.canManageBans = rights.scopes.includes('moderator:manage:banned_users');
    return rights;
  }

  static async getChatSettings(token, broadcasterId, moderatorId) {
    return first(await helix(token, '/chat/settings', {
      query: { broadcaster_id: broadcasterId, moderator_id: moderatorId },
      label: 'Impossible de lire les paramètres du chat'
    }));
  }

  /** @param {object} settings ex: { slow_mode: true, slow_mode_wait_time: 10, subscriber_mode: true } */
  static async updateChatSettings(token, broadcasterId, moderatorId, settings) {
    return first(await helix(token, '/chat/settings', {
      method: 'PATCH',
      query: { broadcaster_id: broadcasterId, moderator_id: moderatorId },
      body: settings,
      label: 'Erreur modification chat'
    }));
  }

  static async getChatters(token, broadcasterId, moderatorId, limit = 100) {
    const json = await helix(token, '/chat/chatters', {
      query: { broadcaster_id: broadcasterId, moderator_id: moderatorId, first: limit },
      label: 'Erreur récupération spectateurs'
    });
    return { total: json.total || 0, chatters: json.data || [] };
  }

  /** Ban (duration absente ou 0) ou timeout de duration secondes. */
  static async banOrTimeoutUser(token, broadcasterId, moderatorId, { targetUserId, duration, reason }) {
    const banData = { user_id: targetUserId, reason: reason || 'Modération via Twitch Mod Manager' };
    if (duration && Number(duration) > 0) banData.duration = Number(duration);
    return first(await helix(token, '/moderation/bans', {
      method: 'POST',
      query: { broadcaster_id: broadcasterId, moderator_id: moderatorId },
      body: { data: banData },
      label: 'Erreur bannissement/timeout'
    }));
  }

  static async unbanUser(token, broadcasterId, moderatorId, targetUserId) {
    await helix(token, '/moderation/bans', {
      method: 'DELETE',
      query: { broadcaster_id: broadcasterId, moderator_id: moderatorId, user_id: targetUserId },
      label: 'Erreur débannissement'
    });
    return true;
  }

  /** Supprime tous les messages du chat (Purge). */
  static async clearChat(token, broadcasterId, moderatorId) {
    await helix(token, '/moderation/chat', {
      method: 'DELETE',
      query: { broadcaster_id: broadcasterId, moderator_id: moderatorId },
      label: 'Erreur suppression des messages'
    });
    return true;
  }

  static async getShieldMode(token, broadcasterId, moderatorId) {
    return first(await helix(token, '/moderation/shield_mode', {
      query: { broadcaster_id: broadcasterId, moderator_id: moderatorId },
      label: 'Erreur mode bouclier'
    }));
  }

  static async updateShieldMode(token, broadcasterId, moderatorId, isActive) {
    return first(await helix(token, '/moderation/shield_mode', {
      method: 'PUT',
      query: { broadcaster_id: broadcasterId, moderator_id: moderatorId },
      body: { is_active: Boolean(isActive) },
      label: 'Erreur activation mode bouclier'
    }));
  }

  // ==========================================
  // OUTILS DU RÔLE ÉDITEUR (CHANNEL EDITION)
  // ==========================================

  /** Titre, jeu, tags et langue de la chaîne. */
  static async getChannelInfo(token, broadcasterId) {
    return first(await helix(token, '/channels', {
      query: { broadcaster_id: broadcasterId },
      label: 'Impossible de récupérer les infos de la chaîne'
    }));
  }

  /** Modifie le stream (réservé au propriétaire par l'API officielle). */
  static async modifyChannelInfo(token, broadcasterId, { title, game_id, broadcaster_language, tags }) {
    const body = {};
    if (title !== undefined) body.title = title;
    if (game_id !== undefined) body.game_id = game_id;
    if (broadcaster_language !== undefined) body.broadcaster_language = broadcaster_language;
    if (Array.isArray(tags)) body.tags = tags;
    await helix(token, '/channels', {
      method: 'PATCH',
      query: { broadcaster_id: broadcasterId },
      body,
      label: 'Erreur modification de la chaîne'
    });
    return true;
  }

  /** Jeux et catégories du catalogue Twitch ; [] si la recherche échoue. */
  static async searchCategories(token, query) {
    if (!query || query.trim().length === 0) return [];
    try {
      const json = await helix(token, '/search/categories', { query: { query, first: 12 }, label: 'Recherche de catégories' });
      return json.data || [];
    } catch {
      return [];
    }
  }

  static async startCommercial(token, broadcasterId, length) {
    return first(await helix(token, '/channels/commercial', {
      method: 'POST',
      body: { broadcaster_id: broadcasterId, length: Number(length) || 30 },
      label: 'Erreur lancement pub'
    }));
  }

  static async createStreamMarker(token, broadcasterId, description) {
    return first(await helix(token, '/streams/markers', {
      method: 'POST',
      body: { user_id: broadcasterId, description: description || 'Marqueur créé via Twitch Mod Manager' },
      label: 'Erreur création marqueur'
    }));
  }

  /** Statut éditeur : { isEditor, editorStatus: 'yes' | 'no' | 'unknown', channelInfo }. */
  static async checkEditorRights(token, broadcasterId, userId) {
    const result = { isEditor: false, editorStatus: 'no', channelInfo: null };

    try {
      result.channelInfo = await this.getChannelInfo(token, broadcasterId);
    } catch (e) {
      console.warn('Infos de chaîne indisponibles:', e.message);
    }

    // Le diffuseur est toujours éditeur de sa propre chaîne
    if (String(broadcasterId) === String(userId)) {
      return { ...result, isEditor: true, editorStatus: 'yes' };
    }

    result.editorStatus = editorStatusFromMarkersResponse(await this.probeStreamMarkers(token, broadcasterId));
    // Non vérifiable (aucune VOD) : traité comme non éditeur
    result.isEditor = result.editorStatus === 'yes';
    return result;
  }

  /**
   * La liste des éditeurs n'est lisible que par le diffuseur : on lit à la place les marqueurs
   * (réservés au diffuseur et à ses éditeurs). Renvoie le code HTTP, ou null si Twitch est injoignable.
   */
  static async probeStreamMarkers(token, broadcasterId) {
    try {
      const response = await fetch(helixUrl('/streams/markers', { user_id: broadcasterId, first: 1 }), { headers: authHeaders(token) });
      return response.status;
    } catch (err) {
      console.warn('Vérification éditeur impossible:', err.message);
      return null;
    }
  }

  static async getPredictions(token, broadcasterId) {
    const json = await helix(token, '/predictions', {
      query: { broadcaster_id: broadcasterId, first: 20 },
      label: 'Erreur predictions'
    });
    return json.data || [];
  }

  static async createPrediction(token, broadcasterId, { title, outcomes, prediction_window }) {
    return first(await helix(token, '/predictions', {
      method: 'POST',
      body: {
        broadcaster_id: broadcasterId,
        title,
        outcomes: outcomes.map(t => ({ title: t })),
        prediction_window: prediction_window || 300
      },
      label: 'Erreur creation prediction'
    }));
  }

  /**
   * Chuchotement (le compte doit avoir un numéro de téléphone vérifié ; 40 destinataires différents par jour).
   * 204 même si Twitch le supprime en silence pour non-respect de ses règles.
   */
  static async sendWhisper(token, fromUserId, toUserId, message) {
    await helix(token, '/whispers', {
      method: 'POST',
      query: { from_user_id: fromUserId, to_user_id: toUserId },
      body: { message },
      label: 'Erreur chuchotement'
    });
    return true;
  }

  /** status : LOCKED / RESOLVED (avec winningOutcomeId) / CANCELED. */
  static async updatePrediction(token, broadcasterId, predictionId, status, winningOutcomeId = null) {
    const body = { broadcaster_id: broadcasterId, id: predictionId, status };
    if (winningOutcomeId) body.winning_outcome_id = winningOutcomeId;
    return first(await helix(token, '/predictions', { method: 'PATCH', body, label: 'Erreur mise a jour prediction' }));
  }
}

module.exports = TwitchService;
module.exports.editorStatusFromMarkersResponse = editorStatusFromMarkersResponse;
module.exports.helixUrl = helixUrl;
module.exports.helix = helix;
