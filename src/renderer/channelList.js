// Connexion Twitch et liste des chaînes modérées (cartes, filtres, tri, actions de modération en direct)
// Script de page classique : partage state, dom et les fonctions de renderer.js.


/**
 * Vérifie si une session valide est déjà sauvegardée
 */
async function checkExistingSession() {
  // Sans « Connexion automatique », la page de connexion s'affiche ; la session enregistrée sert au clic sur « Se connecter »
  if (!isTabView && !state.settings.autoLogin) {
    showAuthScreen();
    return;
  }
  try {
    const res = await window.electronAPI.checkSession();
    if (res.authenticated && res.user) {
      onUserAuthenticated(res.user);
    } else {
      showAuthScreen();
    }
  } catch (err) {
    console.error('Erreur vérification session:', err);
    showAuthScreen();
  }
}

/**
 * Authentification Twitch
 */
async function handleLogin() {
  dom.btnLogin.disabled = true;
  dom.authStatus.innerText = 'Connexion…';
  dom.authStatus.style.color = '#bf94ff';

  try {
    // Session déjà enregistrée et valide : connexion directe, sans repasser par le navigateur
    const saved = await window.electronAPI.checkSession();
    if (saved.authenticated && saved.user) {
      dom.authStatus.innerText = '';
      onUserAuthenticated(saved.user);
      return;
    }
    dom.authStatus.innerText = 'Ouverture de Twitch dans votre navigateur...';
    const result = await window.electronAPI.login();
    if (result.success && result.user) {
      dom.authStatus.innerText = '';
      onUserAuthenticated(result.user);
    } else {
      dom.authStatus.innerText = `Erreur : ${result.error || 'Connexion annulée'}`;
      dom.authStatus.style.color = '#ff6b6b';
      dom.btnLogin.disabled = false;
    }
  } catch (err) {
    dom.authStatus.innerText = `Erreur : ${err.message}`;
    dom.authStatus.style.color = '#ff6b6b';
    dom.btnLogin.disabled = false;
  }
}

/**
 * Déconnexion
 */
async function handleLogout() {
  stopAutoRefresh();
  closeModerationScreen();
  closeAllChannelTabs();
  await window.electronAPI.logout();
  state.currentUser = null;
  state.channels = [];
  showAuthScreen();
}

/**
 * Utilisateur connecté
 */
function onUserAuthenticated(user) {
  state.currentUser = user;
  dom.userName.innerText = user.displayName || user.login;
  if (user.profileImageUrl) {
    dom.userAvatar.src = user.profileImageUrl;
    dom.userAvatar.style.display = 'block';
  } else {
    dom.userAvatar.style.display = 'none';
  }

  dom.authScreen.classList.add('hidden');
  dom.dashboardScreen.classList.remove('hidden');
  dom.modScreen.classList.add('hidden');
  dom.userProfile.classList.remove('hidden');

  fetchChannels();
  startAutoRefresh();
}

function showAuthScreen() {
  document.documentElement.classList.remove('auto-login');
  dom.authScreen.classList.remove('hidden');
  dom.dashboardScreen.classList.add('hidden');
  dom.modScreen.classList.add('hidden');
  dom.userProfile.classList.add('hidden');
  dom.btnLogin.disabled = false;
  dom.authStatus.innerText = '';
}

/**
 * Récupère les chaînes modérées
 */
async function fetchChannels() {
  if (state.isRefreshing) return;
  state.isRefreshing = true;

  dom.btnRefresh.classList.add('spinning');
  if (state.channels.length === 0) {
    dom.loadingSpinner.classList.remove('hidden');
    dom.channelsGrid.classList.add('hidden');
    dom.emptyState.classList.add('hidden');
  }

  try {
    const res = await window.electronAPI.loadChannels();
    if (res.success && Array.isArray(res.channels)) {
      state.channels = res.channels;
      updateCounters();
      renderChannels();
      startModActions();
      if (!isTabView) {
        // Rôle de modérateur perdu : la chaîne n'est plus dans la liste, son onglet se ferme
        channelTabs.ids
          .filter(id => !state.channels.some(c => String(c.id) === id))
          .forEach(closeChannelTab);
        renderChannelTabs(); // statut en direct des onglets
      }
      if (pendingChannelId) {
        const channel = state.channels.find(c => String(c.id) === pendingChannelId);
        pendingChannelId = null;
        if (channel) openModerationScreen(channel);
      }

      const now = new Date();
      const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      dom.lastUpdateText.innerText = `Dernière actualisation : ${timeStr}`;
    }
  } catch (err) {
    console.error('Erreur chargement chaînes:', err);
  } finally {
    state.isRefreshing = false;
    dom.btnRefresh.classList.remove('spinning');
    dom.loadingSpinner.classList.add('hidden');
    dom.channelsGrid.classList.remove('hidden');
  }
}

/**
 * Suit les actions de modération de toutes les chaînes modérées (sans effet sur celles déjà suivies)
 */
async function startModActions() {
  try {
    const res = await window.electronAPI.startModActions(state.channels.map(c => String(c.id)));
    if (res.needsReconnect) {
      state.modActionsNotice = '🔑 Déconnecte-toi puis reconnecte-toi pour autoriser l\'historique des actions de modération.';
    } else if (!res.success) {
      state.modActionsNotice = `⚠️ Suivi des actions indisponible : ${res.error}`;
    } else {
      state.modActionsNotice = '';
    }
  } catch (err) {
    state.modActionsNotice = `⚠️ Suivi des actions indisponible : ${err.message}`;
  }
  renderModActions();
}

/**
 * Recharge l'historique passé des actions depuis Twitch (à chaque ouverture de l'écran de modération)
 */
async function loadTwitchModLog(channel) {
  let notice = '';
  try {
    const res = await window.electronAPI.loadModLog(String(channel.id));
    if (res.success) {
      state.twitchModLog = { ...state.twitchModLog, [channel.id]: res.entries };
    } else if (res.needsWebLogin) {
      notice = '🔑 Connecte-toi une fois dans l\'onglet « Vue Twitch officielle » pour charger l\'historique passé.';
    } else {
      notice = `⚠️ Historique Twitch indisponible : ${res.error}`;
    }
  } catch (err) {
    notice = `⚠️ Historique Twitch indisponible : ${err.message}`;
  }
  if (state.currentChannel?.id !== channel.id) return; // une autre chaîne a été ouverte entre-temps
  state.modLogNotice = notice;
  renderModActions();
}

function updateCounters() {
  const total = state.channels.length;
  const liveCount = state.channels.filter(c => c.isLive).length;
  const offlineCount = total - liveCount;

  dom.countAll.innerText = total;
  dom.countLive.innerText = liveCount;
  dom.countOffline.innerText = offlineCount;
}

function renderChannels() {
  let list = [...state.channels];

  if (state.activeFilter === 'live') {
    list = list.filter(c => c.isLive);
  } else if (state.activeFilter === 'offline') {
    list = list.filter(c => !c.isLive);
  }

  if (state.searchTerm) {
    list = list.filter(c => {
      return (
        c.name.toLowerCase().includes(state.searchTerm) ||
        c.login.toLowerCase().includes(state.searchTerm) ||
        c.gameName.toLowerCase().includes(state.searchTerm) ||
        c.title.toLowerCase().includes(state.searchTerm)
      );
    });
  }

  list.sort((a, b) => {
    if (Boolean(a.isOwn) !== Boolean(b.isOwn)) return a.isOwn ? -1 : 1; // sa propre chaîne toujours en premier
    switch (state.sortBy) {
      case 'live-first':
        if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
        return b.viewerCount - a.viewerCount;
      case 'viewers-desc':
        return b.viewerCount - a.viewerCount;
      case 'name-asc':
        return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
      case 'name-desc':
        return b.name.localeCompare(a.name, 'fr', { sensitivity: 'base' });
      default:
        return 0;
    }
  });

  dom.channelsGrid.innerHTML = '';

  if (list.length === 0) {
    dom.emptyState.classList.remove('hidden');
  } else {
    dom.emptyState.classList.add('hidden');
    list.forEach(channel => {
      const card = createChannelCard(channel);
      dom.channelsGrid.appendChild(card);
    });
  }
}

function createChannelCard(channel) {
  const card = document.createElement('div');
  card.className = `channel-card ${channel.isLive ? 'is-live' : 'is-offline'}`;

  card.addEventListener('click', (e) => {
    if (!e.target.closest('button')) {
      openChannelTab(channel);
    }
  });

  const defaultAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="%239146ff"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>';
  const avatarUrl = channel.profileImageUrl || defaultAvatar;

  let viewersDisplay = '';
  if (channel.isLive) {
    const v = channel.viewerCount || 0;
    viewersDisplay = v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toLocaleString('fr-FR');
  }

  const cardTop = document.createElement('div');
  cardTop.className = 'card-top';

  cardTop.innerHTML = `
    <div class="avatar-wrapper">
      <img class="channel-avatar" src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(channel.name)}" loading="lazy">
      ${channel.isLive ? '<span class="live-indicator">LIVE</span>' : ''}
    </div>
    <div class="channel-names">
      <div class="channel-title-row">
        <span class="channel-name" title="${escapeHtml(channel.name)}">${escapeHtml(channel.name)}</span>
        <span class="status-tag ${channel.isLive ? 'live' : 'offline'}">
          ${channel.isLive ? '🔴 EN DIRECT' : 'Hors ligne'}
        </span>
      </div>
      <div class="channel-login">@${escapeHtml(channel.login)}${channel.isOwn ? ' <span class="own-channel-tag">Ma chaîne</span>' : ''}</div>
    </div>
  `;

  card.appendChild(cardTop);

  if (channel.isLive) {
    const streamDetails = document.createElement('div');
    streamDetails.className = 'card-stream-details';

    streamDetails.innerHTML = `
      <div class="stream-title" title="${escapeHtml(channel.title)}">
        ${escapeHtml(channel.title || 'Sans titre')}
      </div>
      <div class="stream-meta">
        <span class="stream-game" title="${escapeHtml(channel.gameName)}">
          🎮 ${escapeHtml(channel.gameName || 'Discussion')}
        </span>
        <span class="stream-viewers" title="${channel.viewerCount} spectateurs">
          👁️ ${viewersDisplay}
        </span>
      </div>
    `;
    card.appendChild(streamDetails);
  }

  const cardActions = document.createElement('div');
  cardActions.className = 'card-actions';

  const btnMod = document.createElement('button');
  btnMod.className = 'btn-action-mod';
  btnMod.innerHTML = `
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
    </svg>
    Gérer
  `;
  btnMod.addEventListener('click', (e) => {
    e.stopPropagation();
    openChannelTab(channel);
  });

  const btnStream = document.createElement('button');
  btnStream.className = 'btn-action-stream';
  btnStream.innerHTML = `
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M8 5v14l11-7z"/>
    </svg>
    Stream
  `;
  btnStream.addEventListener('click', (e) => {
    e.stopPropagation();
    window.electronAPI.openExternal(`https://www.twitch.tv/${channel.login}`);
  });

  const btnChat = document.createElement('button');
  btnChat.className = 'btn-action-chat';
  btnChat.title = 'Ouvrir le chat dans une fenêtre détachée';
  btnChat.innerHTML = `
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
    Chat
  `;
  btnChat.addEventListener('click', (e) => {
    e.stopPropagation();
    window.electronAPI.openExternal(`https://www.twitch.tv/popout/${channel.login}/chat`);
  });

  cardActions.appendChild(btnMod);
  cardActions.appendChild(btnStream);
  cardActions.appendChild(btnChat);

  card.appendChild(cardActions);
  return card;
}
