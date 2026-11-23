// Écran de modération d'une chaîne : en-tête, droits, sanctions, paramètres du chat, bouclier, spectateurs
// Script de page classique : partage state, dom et les fonctions de renderer.js.


// ========================================================
// LOGIQUE DE L'ESPACE MODÉRATEUR PERSONNALISABLE
// ========================================================

/**
 * Ouvre l'écran de modération personnalisable
 */
async function openModerationScreen(channel) {
  state.currentChannel = channel;
  document.title = `${channel.name} — Twitch Mod Manager`; // pour s'y retrouver entre plusieurs fenêtres

  dom.dashboardScreen.classList.add('hidden');
  dom.modScreen.classList.remove('hidden');

  switchModTab('integrated');

  // Mise à jour de l'en-tête du streamer
  dom.modStreamerName.innerText = channel.name;
  dom.modStreamerLogin.innerText = `@${channel.login}`;
  dom.modStreamerAvatar.src = channel.profileImageUrl || '';

  if (channel.isLive) {
    dom.modStreamerStatus.className = 'status-tag live';
    dom.modStreamerStatus.innerText = '🔴 EN DIRECT';
    dom.modLiveIndicator.classList.remove('hidden');
    dom.modStreamerGame.innerText = `🎮 ${channel.gameName || 'Discussion'}`;
    dom.modStreamerGame.style.display = 'inline';
    dom.modStreamerViewers.innerText = `👁️ ${channel.viewerCount.toLocaleString('fr-FR')} spectateurs`;
    dom.modStreamerViewers.style.display = 'inline';

    dom.statStreamStatus.innerText = '🔴 EN DIRECT';
    dom.statStreamStatus.style.color = '#ff5757';
    dom.statStreamViewers.innerText = channel.viewerCount.toLocaleString('fr-FR');
    dom.statStreamGame.innerText = channel.gameName || 'Discussion';

    startUptimeCounter(channel.startedAt);
  } else {
    dom.modStreamerStatus.className = 'status-tag offline';
    dom.modStreamerStatus.innerText = 'Hors ligne';
    dom.modLiveIndicator.classList.add('hidden');
    dom.modStreamerGame.style.display = 'none';
    dom.modStreamerViewers.style.display = 'none';

    dom.statStreamStatus.innerText = 'Hors ligne';
    dom.statStreamStatus.style.color = 'var(--text-muted)';
    dom.statStreamViewers.innerText = '0';
    dom.statStreamGame.innerText = channel.gameName || 'Aucun';
    dom.statStreamUptime.innerText = '00:00:00';
    stopUptimeCounter();
  }

  // Chargement des iframes avec parent=localhost
  const originHost = window.location.hostname || 'localhost';
  dom.twitchStreamIframe.src = `https://player.twitch.tv/?channel=${channel.login}&parent=${originHost}&autoplay=true&muted=false`;
  dom.twitchChatIframe.src = `https://www.twitch.tv/embed/${channel.login}/chat?parent=${originHost}${state.settings.theme === 'dark' ? '&darkpopout' : ''}`;

  // Réinitialiser les logs et formulaires
  dom.banUserInput.value = '';
  dom.banReasonInput.value = '';
  setFeedback(dom.banFeedback, '');

  dom.logSearchInput.value = '';
  renderModActions();
  loadTwitchModLog(channel);

  // Tout ce qui demande un droit reste masqué tant que le droit n'est pas confirmé
  ALL_RIGHTS.forEach(right => showRight(right, false));

  // Chargement des droits et infos
  loadChannelRights(channel);
  loadEditorStatusAndInfo(channel);
  // Chargement widgets additionnels
  loadPredictions(channel.id);
  setTimeout(setupPredictionsWidget, 300);
}

/**
 * Ferme l'écran de modération
 */
function closeModerationScreen() {
  state.currentChannel = null;
  document.title = 'Twitch Mod Manager';
  state.currentRights = null;
  state.isEditor = false;
  applyAdCooldown(null);
  stopUptimeCounter();

  dom.twitchStreamIframe.src = '';
  dom.twitchChatIframe.src = '';
  if (dom.twitchModWebview) {
    dom.twitchModWebview.setAttribute('src', 'about:blank');
  }

  dom.modScreen.classList.add('hidden');
  dom.dashboardScreen.classList.remove('hidden');
}

/**
 * Minuteur d'uptime
 */
function startUptimeCounter(startedAtStr) {
  stopUptimeCounter();
  if (!startedAtStr) return;

  const startTime = new Date(startedAtStr).getTime();

  function update() {
    const diff = Math.floor((Date.now() - startTime) / 1000);
    if (diff < 0) return;

    const h = Math.floor(diff / 3600).toString().padStart(2, '0');
    const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(diff % 60).toString().padStart(2, '0');
    dom.statStreamUptime.innerText = `${h}:${m}:${s}`;
  }

  update();
  state.uptimeInterval = setInterval(update, 1000);
}

function stopUptimeCounter() {
  if (state.uptimeInterval) {
    clearInterval(state.uptimeInterval);
    state.uptimeInterval = null;
  }
}

/**
 * Droits de modération
 */
async function loadChannelRights(channel) {
  try {
    const res = await window.electronAPI.getModerationRights(channel.id);
    if (res.success && res.rights) {
      const rights = res.rights;
      state.currentRights = rights;

      updateRightPill(dom.rightPillBans, rights.canManageBans, '🔨 Exclusions');
      adaptBanForm(rights.canManageBans);

      updateRightPill(dom.rightPillChat, rights.canManageChatSettings, '💬 Chat');
      adaptChatControls(rights.canManageChatSettings, rights.chatSettings);

      updateRightPill(dom.rightPillChatters, rights.canReadChatters, '👥 Chatters');
      if (rights.canReadChatters) {
        fetchChatters(channel.id);
      } else {
        dom.chattersList.innerHTML = '<p class="card-hint">Droit chatters non disponible.</p>';
      }

      updateRightPill(dom.rightPillShield, rights.canManageShieldMode, '🛡️ Bouclier');
      adaptShieldButton(rights.canManageShieldMode, rights.shieldMode);

      showRight('bans', rights.canManageBans);
      showRight('chat', rights.canManageChatSettings);
      showRight('chatters', rights.canReadChatters);
      showRight('shield', rights.canManageShieldMode);
    }
  } catch (err) {
    console.error('Erreur droits:', err);
  }
}

const ALL_RIGHTS = ['bans', 'chat', 'shield', 'chatters', 'editor', 'predictions'];

/**
 * Affiche ou masque tous les éléments marqués data-right="<right>".
 * Le panneau Actions rapides disparaît s'il ne lui reste aucune action autorisée.
 */
function showRight(right, allowed) {
  document.querySelectorAll(`[data-right="${right}"]`)
    .forEach(el => el.classList.toggle('no-right', !allowed));
  const quickMod = document.getElementById('widget-quick-mod');
  const quickModAllowed = Boolean(quickMod.querySelector('[data-right]:not(.no-right)'));
  quickMod.classList.toggle('no-right', !quickModAllowed);
  dom.widgetsDropdown.querySelector('[data-widget="widget-quick-mod"]')
    .closest('label').classList.toggle('no-right', !quickModAllowed);
}

function updateRightPill(pill, isAllowed, label) {
  pill.className = `right-pill ${isAllowed ? 'active' : 'inactive'}`;
  pill.textContent = `${label} : ${isAllowed ? '✅' : '❌'}`;
}

function adaptBanForm(canBan) {
  dom.banUserInput.disabled = !canBan;
  dom.banReasonInput.disabled = !canBan;
  dom.btnApplySanction.disabled = !canBan;
  dom.durationPresets.forEach(btn => btn.disabled = !canBan);
}

/**
 * Lève le ban ou l'exclusion du pseudo saisi
 */
async function unbanTarget() {
  if (!state.currentChannel) return;
  const targetUser = dom.banUserInput.value.trim().replace(/^@/, '');
  if (!targetUser) {
    setFeedback(dom.banFeedback, 'Veuillez saisir un pseudo.', 'error');
    dom.banUserInput.focus();
    return;
  }

  dom.btnApplySanction.disabled = true;
  setFeedback(dom.banFeedback, 'Débannissement...');
  try {
    const res = await window.electronAPI.unbanUser(state.currentChannel.id, targetUser);
    if (res.success) {
      setFeedback(dom.banFeedback, `✅ @${targetUser} débanni.`, 'success');
      dom.banUserInput.value = '';
    } else {
      setFeedback(dom.banFeedback, `❌ ${res.error || 'Erreur débannissement'}`, 'error');
    }
  } catch (err) {
    setFeedback(dom.banFeedback, `Erreur : ${err.message}`, 'error');
  } finally {
    dom.btnApplySanction.disabled = false;
  }
}

function adaptChatControls(canManage, settings) {
  const toggles = [dom.toggleSlowMode, dom.toggleSubMode, dom.toggleEmoteMode, dom.toggleFollowerMode, dom.btnClearChat];
  toggles.forEach(t => t.disabled = !canManage);

  if (canManage && settings) {
    dom.toggleSlowMode.checked = Boolean(settings.slow_mode);
    dom.toggleSubMode.checked = Boolean(settings.subscriber_mode);
    dom.toggleEmoteMode.checked = Boolean(settings.emote_mode);
    dom.toggleFollowerMode.checked = Boolean(settings.follower_mode);
  }
}

function adaptShieldButton(canShield, shieldMode) {
  dom.btnToggleShield.disabled = !canShield;

  if (canShield && shieldMode) {
    const isActive = Boolean(shieldMode.is_active);
    dom.btnToggleShield.dataset.active = isActive ? 'true' : 'false';
    dom.btnToggleShield.innerText = isActive ? '🛡️ DÉSACTIVER Bouclier' : '🛡️ ACTIVER Bouclier';
  }
}

/**
 * Applique un bannissement / timeout
 */
async function applySanction() {
  if (!state.currentChannel) return;
  if (state.selectedSanctionDuration === 'unban') return unbanTarget();

  const targetUser = dom.banUserInput.value.trim();
  if (!targetUser) {
    setFeedback(dom.banFeedback, 'Veuillez saisir un pseudo.', 'error');
    dom.banUserInput.focus();
    return;
  }

  const duration = state.selectedSanctionDuration;
  const reason = dom.banReasonInput.value.trim() || 'Modération via Twitch Mod Manager';

  dom.btnApplySanction.disabled = true;
  dom.banFeedback.innerText = 'Application...';

  try {
    const res = await window.electronAPI.banUser(state.currentChannel.id, {
      targetUser,
      duration,
      reason
    });

    if (res.success) {
      const typeStr = duration === 0 ? 'Ban permanent' : `Timeout (${formatDuration(duration)})`;
      setFeedback(dom.banFeedback, `✅ ${typeStr} sur @${targetUser} effectué.`, 'success');
      dom.banUserInput.value = '';
    } else {
      setFeedback(dom.banFeedback, `❌ ${res.error || 'Erreur sanction'}`, 'error');
    }
  } catch (err) {
    setFeedback(dom.banFeedback, `Erreur : ${err.message}`, 'error');
  } finally {
    dom.btnApplySanction.disabled = false;
  }
}

/**
 * Paramètres chat
 */
async function updateChatSetting(settingObj) {
  if (!state.currentChannel) return;

  try {
    const res = await window.electronAPI.updateChatSettings(state.currentChannel.id, settingObj);
    if (!res.success) {
      alert(`Erreur : ${res.error}`);
      loadChannelRights(state.currentChannel);
    }
  } catch (err) {
    console.error('Erreur mise à jour chat:', err);
  }
}

/**
 * Purge du chat
 */
async function handleClearChat() {
  if (!state.currentChannel) return;
  if (!confirm(`Purger tous les messages du chat de ${state.currentChannel.name} ?`)) return;

  try {
    const res = await window.electronAPI.clearChat(state.currentChannel.id);
    if (res.success) {
      alert('✅ Chat purgé.');
    } else {
      alert(`❌ Erreur : ${res.error}`);
    }
  } catch (err) {
    alert(`Erreur : ${err.message}`);
  }
}

/**
 * Mode Bouclier
 */
async function handleToggleShield() {
  if (!state.currentChannel) return;

  const isCurrentlyActive = dom.btnToggleShield.dataset.active === 'true';
  const newStatus = !isCurrentlyActive;

  try {
    const res = await window.electronAPI.toggleShieldMode(state.currentChannel.id, newStatus);
    if (res.success) {
      dom.btnToggleShield.dataset.active = newStatus ? 'true' : 'false';
      dom.btnToggleShield.innerText = newStatus ? '🛡️ DÉSACTIVER Bouclier' : '🛡️ ACTIVER Bouclier';
    } else {
      alert(`Erreur Mode Bouclier : ${res.error}`);
    }
  } catch (err) {
    alert(`Erreur : ${err.message}`);
  }
}

/**
 * Chatters
 */
async function fetchChatters(broadcasterId) {
  dom.btnRefreshChatters.classList.add('spinning');
  try {
    const res = await window.electronAPI.getChatters(broadcasterId);
    if (res.success && Array.isArray(res.chatters)) {
      state.chatters = res.chatters;
      dom.chattersCount.innerText = res.total.toLocaleString('fr-FR');
      renderChattersList(res.chatters);
    }
  } catch (err) {
    console.error('Erreur chatters:', err);
  } finally {
    dom.btnRefreshChatters.classList.remove('spinning');
  }
}

function renderChattersList(chatters) {
  dom.chattersList.innerHTML = '';
  if (!chatters || chatters.length === 0) {
    dom.chattersList.innerHTML = '<span class="card-hint">Aucun chatter détecté.</span>';
    return;
  }

  chatters.forEach(chatter => {
    const item = document.createElement('div');
    item.className = 'chatter-item';
    item.title = `Cliquer pour cibler @${chatter.user_login}`;
    item.innerHTML = `
      <span>@${escapeHtml(chatter.user_name || chatter.user_login)}</span>
      <span style="font-size:10px; color:var(--twitch-purple-light);">⚡ Cibler</span>
    `;

    item.addEventListener('click', () => {
      dom.banUserInput.value = chatter.user_login;
      dom.banUserInput.focus();
      setFeedback(dom.banFeedback, `Cible : @${chatter.user_login}`);
    });

    dom.chattersList.appendChild(item);
  });
}

function filterChattersList(query) {
  if (!query) {
    renderChattersList(state.chatters);
    return;
  }
  const filtered = state.chatters.filter(c => {
    return (c.user_login && c.user_login.toLowerCase().includes(query)) ||
           (c.user_name && c.user_name.toLowerCase().includes(query));
  });
  renderChattersList(filtered);
}
