// Échanges entre la page et le processus principal pour tout ce qui touche à Twitch (canaux « twitch:* »).
// handleTwitch fait pour chacun : session requise, identifiant de chaîne vérifié, erreurs → { success: false, error }.
const { ipcMain, session } = require('electron');
const AuthManager = require('./authManager');
const TwitchService = require('./twitchService');
const { hasModActionsScopes } = require('./eventSubClient');
const { fetchTwitchModLog } = require('./twitchModLog');
const { updateChannelViaWeb, startAdViaWeb, fetchAdCooldown } = require('./twitchChannelEdit');
const { getPredictionsViaWeb, createPredictionViaWeb, updatePredictionViaWeb } = require('./twitchPredictions');

const isChannelId = (id) => /^\d+$/.test(String(id));
const isOtherChannel = (sessionData, broadcasterId) => String(broadcasterId) !== String(sessionData.userId);

// Résultat d'une API interne (session de la Vue Twitch officielle) : message clair si cette session manque
const webResult = (res, action) => (res.needsWebLogin
  ? { success: false, error: `Connecte-toi une fois à Twitch dans l'onglet « Vue Twitch officielle » pour ${action}.` }
  : res);

/**
 * Enregistre un canal IPC Twitch. handler(sessionData, ...args) ; channelArg = true : args[0] est un identifiant de chaîne.
 */
function handleTwitch(channel, handler, { channelArg = true } = {}) {
  ipcMain.handle(channel, async (event, ...args) => {
    const sessionData = AuthManager.getSession();
    if (!sessionData?.token || !sessionData?.userId) return { success: false, error: 'Non authentifié' };
    if (channelArg && !isChannelId(args[0])) return { success: false, error: 'Identifiant de chaîne invalide' };
    try {
      return await handler(sessionData, ...args);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

// Pseudo (avec ou sans @) ou identifiant numérique -> identifiant Twitch, null si introuvable
async function resolveTargetUserId(token, targetUser) {
  const value = String(targetUser || '').trim().replace(/^@/, '');
  if (!value) return null;
  if (/^\d+$/.test(value)) return value;
  const user = await TwitchService.getUserByLogin(token, value);
  return user ? user.id : null;
}

// Sanction ou levée de sanction d'un pseudo : résout le pseudo puis appelle action(targetUserId)
async function withTargetUser(sessionData, targetUser, action) {
  const targetUserId = await resolveTargetUserId(sessionData.token, targetUser);
  if (!targetUserId) return { success: false, error: `Utilisateur "${targetUser}" introuvable sur Twitch.` };
  return action(targetUserId);
}

function registerChannelHandlers(modActionsClient) {
  handleTwitch('twitch:load-channels', async ({ token, userId, login }) => {
    const moderated = await TwitchService.getModeratedChannels(token, userId);
    // Sa propre chaîne en plus (Twitch ne la compte pas parmi les chaînes modérées)
    const ownChannel = { broadcaster_id: userId, broadcaster_login: login, broadcaster_name: login };
    const rawChannels = [ownChannel, ...moderated.filter(c => c.broadcaster_id !== userId)];
    const channels = (await TwitchService.enrichChannelsData(token, rawChannels)).map(c => ({ ...c, isOwn: c.id === userId }));
    return { success: true, total: channels.length, channels };
  }, { channelArg: false });

  // Actions de modération en direct sur les chaînes modérées
  handleTwitch('twitch:start-mod-actions', async ({ token, userId }, broadcasterIds) => {
    if (!Array.isArray(broadcasterIds) || !broadcasterIds.every(isChannelId)) {
      return { success: false, error: 'Identifiants de chaînes invalides' };
    }
    const validation = await TwitchService.validateToken(token);
    if (!hasModActionsScopes(validation.scopes || [])) return { success: false, needsReconnect: true };
    modActionsClient.start(token, userId, broadcasterIds.map(String));
    return { success: true };
  }, { channelArg: false });

  // Historique passé des actions de modération (comme la Mod View de twitch.tv)
  handleTwitch('twitch:load-mod-log', async (_s, broadcasterId) => fetchTwitchModLog(session, broadcasterId));

  handleTwitch('twitch:get-moderation-rights', async ({ token, userId }, broadcasterId) =>
    ({ success: true, rights: await TwitchService.checkModerationRights(token, broadcasterId, userId) }));

  handleTwitch('twitch:resolve-user', async ({ token }, login) =>
    ({ success: true, user: await TwitchService.getUserByLogin(token, String(login || '')) }), { channelArg: false });
}

function registerModerationHandlers() {
  handleTwitch('twitch:get-chat-settings', async ({ token, userId }, broadcasterId) =>
    ({ success: true, settings: await TwitchService.getChatSettings(token, broadcasterId, userId) }));

  handleTwitch('twitch:update-chat-settings', async ({ token, userId }, broadcasterId, settings) =>
    ({ success: true, settings: await TwitchService.updateChatSettings(token, broadcasterId, userId, settings) }));

  handleTwitch('twitch:get-chatters', async ({ token, userId }, broadcasterId) => {
    const { total, chatters } = await TwitchService.getChatters(token, broadcasterId, userId);
    return { success: true, total, chatters };
  });

  handleTwitch('twitch:ban-user', async (sessionData, broadcasterId, { targetUser, duration, reason } = {}) =>
    withTargetUser(sessionData, targetUser, async (targetUserId) => ({
      success: true,
      result: await TwitchService.banOrTimeoutUser(sessionData.token, broadcasterId, sessionData.userId, { targetUserId, duration, reason })
    })));

  handleTwitch('twitch:unban-user', async (sessionData, broadcasterId, targetUser) => {
    try {
      return await withTargetUser(sessionData, targetUser, async (targetUserId) => {
        await TwitchService.unbanUser(sessionData.token, broadcasterId, sessionData.userId, targetUserId);
        return { success: true };
      });
    } catch (err) {
      // 400 : la personne n'est ni bannie ni exclue sur cette chaîne
      if (/\(400\)/.test(err.message)) return { success: false, error: 'Cette personne n\'est ni bannie ni exclue sur cette chaîne.' };
      throw err;
    }
  });

  handleTwitch('twitch:clear-chat', async ({ token, userId }, broadcasterId) => {
    await TwitchService.clearChat(token, broadcasterId, userId);
    return { success: true };
  });

  handleTwitch('twitch:toggle-shield-mode', async ({ token, userId }, broadcasterId, isActive) =>
    ({ success: true, result: await TwitchService.updateShieldMode(token, broadcasterId, userId, isActive) }));
}

// Rôle éditeur. Sur la chaîne d'un autre, l'API officielle refuse les éditeurs : session de la Vue Twitch officielle
function registerEditorHandlers() {
  handleTwitch('twitch:check-editor-rights', async ({ token, userId }, broadcasterId) =>
    ({ success: true, ...(await TwitchService.checkEditorRights(token, broadcasterId, userId)) }));

  handleTwitch('twitch:get-channel-info', async ({ token }, broadcasterId) =>
    ({ success: true, info: await TwitchService.getChannelInfo(token, broadcasterId) }));

  handleTwitch('twitch:modify-channel-info', async (sessionData, broadcasterId, data) => {
    if (!isOtherChannel(sessionData, broadcasterId)) {
      await TwitchService.modifyChannelInfo(sessionData.token, broadcasterId, data);
      return { success: true };
    }
    const info = await TwitchService.getChannelInfo(sessionData.token, broadcasterId);
    const result = await updateChannelViaWeb(session, {
      broadcasterId,
      title: String(data?.title ?? info?.title ?? ''),
      gameId: String(data?.game_id ?? info?.game_id ?? ''),
      gameName: String(data?.game_name ?? info?.game_name ?? ''),
      language: info?.broadcaster_language || 'fr',
      tags: Array.isArray(data?.tags) ? data.tags.map(String) : (info?.tags || [])
    });
    return webResult(result, 'modifier la chaîne d\'un autre streamer');
  });

  handleTwitch('twitch:search-categories', async ({ token }, query) =>
    ({ success: true, games: await TwitchService.searchCategories(token, String(query || '')) }), { channelArg: false });

  handleTwitch('twitch:start-commercial', async (sessionData, broadcasterId, length) => {
    if (isOtherChannel(sessionData, broadcasterId)) {
      return webResult(await startAdViaWeb(session, broadcasterId, length), 'lancer une pub sur la chaîne d\'un autre streamer');
    }
    return { success: true, result: await TwitchService.startCommercial(sessionData.token, broadcasterId, length) };
  });

  // Délai avant la prochaine pub possible (session de la Vue Twitch officielle)
  handleTwitch('twitch:get-ad-cooldown', async (_s, login) => {
    if (!/^[a-zA-Z0-9_]{1,25}$/.test(String(login))) return { success: false, error: 'Pseudo de chaîne invalide' };
    return fetchAdCooldown(session, String(login).toLowerCase());
  }, { channelArg: false });

  handleTwitch('twitch:create-stream-marker', async ({ token }, broadcasterId, description) =>
    ({ success: true, marker: await TwitchService.createStreamMarker(token, broadcasterId, description) }));
}

// Prédictions : API officielle sur sa propre chaîne, session de la Vue Twitch officielle sur celle d'un autre
function registerPredictionHandlers() {
  const action = 'gérer les prédictions de cette chaîne';
  const fromWeb = (res) => {
    const out = webResult(res, action);
    return out.success ? { success: true, data: out.data } : { success: false, error: out.error };
  };

  handleTwitch('twitch:get-predictions', async (sessionData, broadcasterId) => {
    if (isOtherChannel(sessionData, broadcasterId)) {
      const user = await TwitchService.getUserInfo(sessionData.token, broadcasterId);
      if (!user?.login) return { success: false, error: 'Chaîne introuvable' };
      return fromWeb(await getPredictionsViaWeb(session, user.login));
    }
    return { success: true, data: await TwitchService.getPredictions(sessionData.token, broadcasterId) };
  });

  handleTwitch('twitch:create-prediction', async (sessionData, broadcasterId, predData) => {
    if (isOtherChannel(sessionData, broadcasterId)) return fromWeb(await createPredictionViaWeb(session, broadcasterId, predData || {}));
    return { success: true, data: await TwitchService.createPrediction(sessionData.token, broadcasterId, predData) };
  });

  handleTwitch('twitch:update-prediction', async (sessionData, broadcasterId, predictionId, status, winningOutcomeId) => {
    if (isOtherChannel(sessionData, broadcasterId)) {
      return fromWeb(await updatePredictionViaWeb(session, predictionId, status, winningOutcomeId));
    }
    return { success: true, data: await TwitchService.updatePrediction(sessionData.token, broadcasterId, predictionId, status, winningOutcomeId) };
  });
}

function registerTwitchIpc({ modActionsClient }) {
  registerChannelHandlers(modActionsClient);
  registerModerationHandlers();
  registerEditorHandlers();
  registerPredictionHandlers();
}

module.exports = { registerTwitchIpc, isChannelId };
