const { CLIENT_ID } = require('./config');

/**
 * Statut éditeur d'après GET /streams/markers (vérifié sur de vraies chaînes) :
 * 200 = éditeur, 401/403 = pas éditeur, 404 = chaîne sans VOD, Twitch répond avant de vérifier les droits.
 */
function editorStatusFromMarkersResponse(status) {
  if (status === 200) return 'yes';
  if (status === 401 || status === 403) return 'no';
  return 'unknown';
}

/**
 * Service pour interagir avec l'API Twitch Helix
 */
class TwitchService {
  /**
   * Vérifie la validité du jeton d'accès Twitch
   * @param {string} token 
   * @returns {Promise<object>} Données de validation
   */
  static async validateToken(token) {
    const response = await fetch('https://id.twitch.tv/oauth2/validate', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Token invalide ou expiré (Code ${response.status})`);
    }

    return await response.json();
  }

  /**
   * Récupère les informations d'un utilisateur par son ID
   * @param {string} token 
   * @param {string} userId 
   * @returns {Promise<object>}
   */
  static async getUserInfo(token, userId) {
    const response = await fetch(`https://api.twitch.tv/helix/users?id=${userId}`, {
      headers: {
        'Client-Id': CLIENT_ID,
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Impossible de récupérer les infos utilisateur (${response.status})`);
    }

    const data = await response.json();
    return data.data?.[0] || null;
  }

  /**
   * Récupère les informations d'un utilisateur par son login (pseudo)
   * @param {string} token 
   * @param {string} login 
   * @returns {Promise<object>}
   */
  static async getUserByLogin(token, login) {
    const cleanLogin = login.replace(/^@/, '').trim().toLowerCase();
    const response = await fetch(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(cleanLogin)}`, {
      headers: {
        'Client-Id': CLIENT_ID,
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Utilisateur introuvable (${response.status})`);
    }

    const data = await response.json();
    return data.data?.[0] || null;
  }

  /**
   * Récupère la liste intégrale de toutes les chaînes modérées (avec pagination)
   * @param {string} token 
   * @param {string} userId 
   * @returns {Promise<Array>}
   */
  static async getModeratedChannels(token, userId) {
    let allChannels = [];
    let cursor = null;

    do {
      let url = `https://api.twitch.tv/helix/moderation/channels?user_id=${userId}&first=100`;
      if (cursor) {
        url += `&after=${cursor}`;
      }

      const response = await fetch(url, {
        headers: {
          'Client-Id': CLIENT_ID,
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Erreur récupération chaînes modérées (${response.status}): ${errorBody}`);
      }

      const result = await response.json();
      if (Array.isArray(result.data)) {
        allChannels = allChannels.concat(result.data);
      }

      cursor = result.pagination?.cursor || null;
    } while (cursor);

    return allChannels;
  }

  /**
   * Découpe un tableau en sous-tableaux de taille maximale donnée
   */
  static chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Récupère les flux en direct et les profils pour une liste de chaînes
   * @param {string} token 
   * @param {Array} channels 
   * @returns {Promise<Array>} Liste enrichie des chaînes
   */
  static async enrichChannelsData(token, channels) {
    if (!channels || channels.length === 0) {
      return [];
    }

    const broadcasterIds = channels.map(c => c.broadcaster_id);
    const idChunks = this.chunkArray(broadcasterIds, 100);

    const streamsMap = new Map();
    const usersMap = new Map();

    for (const chunk of idChunks) {
      const queryParams = chunk.map(id => `user_id=${id}`).join('&');
      const usersParams = chunk.map(id => `id=${id}`).join('&');

      // 1. Récupérer le statut des streams (En direct)
      try {
        const streamRes = await fetch(`https://api.twitch.tv/helix/streams?${queryParams}`, {
          headers: {
            'Client-Id': CLIENT_ID,
            'Authorization': `Bearer ${token}`
          }
        });
        if (streamRes.ok) {
          const streamData = await streamRes.json();
          for (const s of streamData.data || []) {
            streamsMap.set(s.user_id, s);
          }
        }
      } catch (err) {
        console.error('Erreur récupération streams:', err);
      }

      // 2. Récupérer les photos de profil et informations diffuseurs
      try {
        const userRes = await fetch(`https://api.twitch.tv/helix/users?${usersParams}`, {
          headers: {
            'Client-Id': CLIENT_ID,
            'Authorization': `Bearer ${token}`
          }
        });
        if (userRes.ok) {
          const userData = await userRes.json();
          for (const u of userData.data || []) {
            usersMap.set(u.id, u);
          }
        }
      } catch (err) {
        console.error('Erreur récupération profils:', err);
      }
    }

    // Fusion des informations
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

  /**
   * Vérifie et teste les droits de modération réels sur la chaîne
   * @param {string} token 
   * @param {string} broadcasterId 
   * @param {string} moderatorId 
   * @returns {Promise<object>}
   */
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

    // 1. Récupération des scopes du token
    try {
      const validation = await this.validateToken(token);
      rights.scopes = validation.scopes || [];
    } catch (e) {
      console.warn('Erreur validation scopes:', e.message);
    }

    // 2. Test des paramètres de chat
    try {
      const chatSettings = await this.getChatSettings(token, broadcasterId, moderatorId);
      rights.canManageChatSettings = true;
      rights.chatSettings = chatSettings;
    } catch (err) {
      rights.canManageChatSettings = false;
    }

    // 3. Test de lecture des chatters
    try {
      await this.getChatters(token, broadcasterId, moderatorId, 1);
      rights.canReadChatters = true;
    } catch (err) {
      rights.canReadChatters = false;
    }

    // 4. Test du mode bouclier
    try {
      const shield = await this.getShieldMode(token, broadcasterId, moderatorId);
      rights.canManageShieldMode = true;
      rights.shieldMode = shield;
    } catch (err) {
      rights.canManageShieldMode = false;
    }

    // 5. Droits de bannissement / timeout (selon les scopes autorisés)
    rights.canManageBans = rights.scopes.includes('moderator:manage:banned_users');

    return rights;
  }

  /**
   * Récupère les paramètres actuels du chat (ralenti, abonnés, émoticônes, etc.)
   */
  static async getChatSettings(token, broadcasterId, moderatorId) {
    const url = `https://api.twitch.tv/helix/chat/settings?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}`;
    const response = await fetch(url, {
      headers: {
        'Client-Id': CLIENT_ID,
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Impossible de lire les paramètres du chat (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.data?.[0] || null;
  }

  /**
   * Met à jour les paramètres du chat
   * @param {object} settings ex: { slow_mode: true, slow_mode_wait_time: 10, subscriber_mode: true }
   */
  static async updateChatSettings(token, broadcasterId, moderatorId, settings) {
    const url = `https://api.twitch.tv/helix/chat/settings?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Client-Id': CLIENT_ID,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settings)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur modification chat (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.data?.[0] || null;
  }

  /**
   * Récupère la liste des utilisateurs présents dans le chat
   */
  static async getChatters(token, broadcasterId, moderatorId, limit = 100) {
    const url = `https://api.twitch.tv/helix/chat/chatters?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}&first=${limit}`;
    const response = await fetch(url, {
      headers: {
        'Client-Id': CLIENT_ID,
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur récupération spectateurs (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return {
      total: data.total || 0,
      chatters: data.data || []
    };
  }

  /**
   * Bannit ou exclut temporairement (timeout) un utilisateur
   * @param {object} param0 { targetUserId, duration, reason }
   */
  static async banOrTimeoutUser(token, broadcasterId, moderatorId, { targetUserId, duration, reason }) {
    const url = `https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}`;

    const banData = {
      user_id: targetUserId,
      reason: reason || 'Modération via Twitch Mod Manager'
    };

    if (duration && Number(duration) > 0) {
      banData.duration = Number(duration);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Client-Id': CLIENT_ID,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data: banData })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur bannissement/timeout (${response.status}): ${errorText}`);
    }

    const res = await response.json();
    return res.data?.[0] || null;
  }

  /**
   * Révoque le bannissement / timeout d'un utilisateur
   */
  static async unbanUser(token, broadcasterId, moderatorId, targetUserId) {
    const url = `https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}&user_id=${targetUserId}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Client-Id': CLIENT_ID,
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur débannissement (${response.status}): ${errorText}`);
    }

    return true;
  }

  /**
   * Supprime l'intégralité des messages du chat (Purge)
   */
  static async clearChat(token, broadcasterId, moderatorId) {
    const url = `https://api.twitch.tv/helix/moderation/chat?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Client-Id': CLIENT_ID,
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur suppression des messages (${response.status}): ${errorText}`);
    }

    return true;
  }

  /**
   * Récupère le statut du mode bouclier
   */
  static async getShieldMode(token, broadcasterId, moderatorId) {
    const url = `https://api.twitch.tv/helix/moderation/shield_mode?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}`;
    const response = await fetch(url, {
      headers: {
        'Client-Id': CLIENT_ID,
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur mode bouclier (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.data?.[0] || null;
  }

  /**
   * Active ou désactive le mode bouclier d'urgence
   */
  static async updateShieldMode(token, broadcasterId, moderatorId, isActive) {
    const url = `https://api.twitch.tv/helix/moderation/shield_mode?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Client-Id': CLIENT_ID,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ is_active: Boolean(isActive) })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur activation mode bouclier (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.data?.[0] || null;
  }

  // ==========================================
  // OUTILS DU RÔLE ÉDITEUR (CHANNEL EDITION)
  // ==========================================

  /**
   * Récupère les métadonnées actuelles de la chaîne (titre, jeu, tags, langue)
   */
  static async getChannelInfo(token, broadcasterId) {
    const url = `https://api.twitch.tv/helix/channels?broadcaster_id=${broadcasterId}`;
    const response = await fetch(url, {
      headers: {
        'Client-Id': CLIENT_ID,
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Impossible de récupérer les infos de la chaîne (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.data?.[0] || null;
  }

  /**
   * Modifie les informations du stream (rôle Éditeur requis)
   */
  static async modifyChannelInfo(token, broadcasterId, { title, game_id, broadcaster_language, tags }) {
    const url = `https://api.twitch.tv/helix/channels?broadcaster_id=${broadcasterId}`;
    const body = {};

    if (title !== undefined) body.title = title;
    if (game_id !== undefined) body.game_id = game_id;
    if (broadcaster_language !== undefined) body.broadcaster_language = broadcaster_language;
    if (Array.isArray(tags)) body.tags = tags;

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Client-Id': CLIENT_ID,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur modification de la chaîne (${response.status}): ${errorText}`);
    }

    return true;
  }

  /**
   * Recherche des jeux et catégories dans le catalogue Twitch
   */
  static async searchCategories(token, query) {
    if (!query || query.trim().length === 0) return [];
    const url = `https://api.twitch.tv/helix/search/categories?query=${encodeURIComponent(query)}&first=12`;
    const response = await fetch(url, {
      headers: {
        'Client-Id': CLIENT_ID,
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.data || [];
  }

  /**
   * Lance une coupure publicitaire (Pub / Commercial)
   */
  static async startCommercial(token, broadcasterId, length) {
    const url = 'https://api.twitch.tv/helix/channels/commercial';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Client-Id': CLIENT_ID,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        broadcaster_id: broadcasterId,
        length: Number(length) || 30
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur lancement pub (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.data?.[0] || null;
  }

  /**
   * Crée un marqueur de stream pendant le live
   */
  static async createStreamMarker(token, broadcasterId, description) {
    const url = 'https://api.twitch.tv/helix/streams/markers';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Client-Id': CLIENT_ID,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: broadcasterId,
        description: description || 'Marqueur créé via Twitch Mod Manager'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur création marqueur (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.data?.[0] || null;
  }

  /**
   * Vérifie si l'utilisateur a le statut d'Éditeur sur la chaîne
   */
  static async checkEditorRights(token, broadcasterId, userId) {
    const result = {
      isEditor: false,
      editorStatus: 'no', // 'yes' | 'no' | 'unknown'
      channelInfo: null
    };

    try {
      result.channelInfo = await this.getChannelInfo(token, broadcasterId);
    } catch (e) {
      console.warn('Infos de chaîne indisponibles:', e.message);
    }

    // Le diffuseur est toujours éditeur de sa propre chaîne
    if (String(broadcasterId) === String(userId)) {
      result.isEditor = true;
      result.editorStatus = 'yes';
      return result;
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
      const response = await fetch(`https://api.twitch.tv/helix/streams/markers?user_id=${broadcasterId}&first=1`, {
        headers: {
          'Client-Id': CLIENT_ID,
          'Authorization': `Bearer ${token}`
        }
      });
      return response.status;
    } catch (err) {
      console.warn('Vérification éditeur impossible:', err.message);
      return null;
    }
  }

  /**
   * Recupere les predictions d'une chaine
   */
  static async getPredictions(token, broadcasterId) {
    const url = `https://api.twitch.tv/helix/predictions?broadcaster_id=${broadcasterId}&first=20`;
    const response = await fetch(url, {
      headers: {
        'Client-Id': CLIENT_ID,
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur predictions (${response.status}): ${errorText}`);
    }
    const data = await response.json();
    return data.data || [];
  }

  /**
   * Cree une nouvelle prediction
   */
  static async createPrediction(token, broadcasterId, { title, outcomes, prediction_window }) {
    const response = await fetch('https://api.twitch.tv/helix/predictions', {
      method: 'POST',
      headers: {
        'Client-Id': CLIENT_ID,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        broadcaster_id: broadcasterId,
        title,
        outcomes: outcomes.map(t => ({ title: t })),
        prediction_window: prediction_window || 300
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur creation prediction (${response.status}): ${errorText}`);
    }
    const data = await response.json();
    return data.data?.[0] || null;
  }

  /**
   * Met a jour une prediction (LOCKED / RESOLVED / CANCELED)
   */
  static async updatePrediction(token, broadcasterId, predictionId, status, winningOutcomeId = null) {
    const body = { broadcaster_id: broadcasterId, id: predictionId, status };
    if (winningOutcomeId) body.winning_outcome_id = winningOutcomeId;

    const response = await fetch('https://api.twitch.tv/helix/predictions', {
      method: 'PATCH',
      headers: {
        'Client-Id': CLIENT_ID,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur mise a jour prediction (${response.status}): ${errorText}`);
    }
    const data = await response.json();
    return data.data?.[0] || null;
  }
}

module.exports = TwitchService;
module.exports.editorStatusFromMarkersResponse = editorStatusFromMarkersResponse;
