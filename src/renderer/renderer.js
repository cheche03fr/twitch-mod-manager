// État global de l'application
const state = {
  currentUser: null,
  channels: [],
  activeFilter: 'all', // 'all' | 'live' | 'offline'
  searchTerm: '',
  sortBy: 'live-first', // 'live-first' | 'viewers-desc' | 'name-asc' | 'name-desc'
  autoRefreshTimer: null,
  isRefreshing: false,
  settings: loadSettings(), // settings.js
  modActions: loadModActions(), // modActions.js : { [broadcasterId]: [{ receivedAt, event }] }
  modActionsNotice: '',

  // Espace modération active
  currentChannel: null,
  currentRights: null,
  selectedSanctionDuration: 1, // par défaut 1 seconde (purge)
  chatters: [],

  // Rôle Éditeur
  isEditor: false,
  channelInfo: null,
  selectedGameId: '',
  selectedGameName: '',
  currentTags: [],
  categorySearchTimeout: null,

  // Uptime timer
  uptimeInterval: null,

  // Drag and drop
  draggedWidgetId: null
};

// Références du DOM
const dom = {
  // Vues principales
  authScreen: document.getElementById('auth-screen'),
  dashboardScreen: document.getElementById('dashboard-screen'),
  modScreen: document.getElementById('mod-screen'),

  // Header principal
  userProfile: document.getElementById('user-profile'),
  userAvatar: document.getElementById('user-avatar'),
  userName: document.getElementById('user-name'),
  btnRefresh: document.getElementById('btn-refresh'),
  btnLogout: document.getElementById('btn-logout'),

  // Authentification
  btnLogin: document.getElementById('btn-login'),
  authStatus: document.getElementById('auth-status'),

  // Dashboard chaînes
  filterTabs: document.querySelectorAll('.filter-tab'),
  countAll: document.getElementById('count-all'),
  countLive: document.getElementById('count-live'),
  countOffline: document.getElementById('count-offline'),
  searchInput: document.getElementById('search-input'),
  searchClear: document.getElementById('search-clear'),
  sortSelect: document.getElementById('sort-select'),
  lastUpdateText: document.getElementById('last-update-text'),
  btnSettings: document.getElementById('btn-settings'),
  settingsDialog: document.getElementById('settings-dialog'),
  settingRefresh: document.getElementById('setting-refresh'),
  settingRefreshEnabled: document.getElementById('setting-refresh-enabled'),
  settingRefreshValue: document.getElementById('setting-refresh-value'),
  loadingSpinner: document.getElementById('loading-spinner'),
  channelsGrid: document.getElementById('channels-grid'),
  emptyState: document.getElementById('empty-state'),
  emptyTitle: document.getElementById('empty-title'),
  emptyDesc: document.getElementById('empty-desc'),

  // Navigation Modérateur
  btnBackToChannels: document.getElementById('btn-back-to-channels'),
  modStreamerAvatar: document.getElementById('mod-streamer-avatar'),
  modLiveIndicator: document.getElementById('mod-live-indicator'),
  modStreamerName: document.getElementById('mod-streamer-name'),
  modStreamerStatus: document.getElementById('mod-streamer-status'),
  modStreamerLogin: document.getElementById('mod-streamer-login'),
  modStreamerGame: document.getElementById('mod-streamer-game'),
  modStreamerViewers: document.getElementById('mod-streamer-viewers'),
  btnOpenBrowserMod: document.getElementById('btn-open-browser-mod'),

  // Contrôles de la Grille
  btnWidgetsMenu: document.getElementById('btn-widgets-menu'),
  widgetsDropdown: document.getElementById('widgets-dropdown'),
  btnResetLayout: document.getElementById('btn-reset-layout'),
  modCustomGrid: document.getElementById('mod-custom-grid'),

  // Onglets de vue
  tabModIntegrated: document.getElementById('tab-mod-integrated'),
  tabModWebview: document.getElementById('tab-mod-webview'),
  viewModIntegrated: document.getElementById('view-mod-integrated'),
  viewModWebview: document.getElementById('view-mod-webview'),

  // Médias
  twitchStreamIframe: document.getElementById('twitch-stream-iframe'),
  twitchChatIframe: document.getElementById('twitch-chat-iframe'),
  twitchModWebview: document.getElementById('twitch-mod-webview'),

  // Actions de Modérateur (Log)
  modActionsList: document.getElementById('mod-actions-list'),
  modActionsCount: document.getElementById('mod-actions-count'),
  logSearchInput: document.getElementById('log-search-input'),
  btnClearActionsLog: document.getElementById('btn-clear-actions-log'),

  // AutoMod
  automodQueueList: document.getElementById('automod-queue-list'),

  // Actions Rapides
  banUserInput: document.getElementById('ban-user-input'),
  durationPresets: document.querySelectorAll('.preset-btn'),
  banReasonInput: document.getElementById('ban-reason-input'),
  btnApplySanction: document.getElementById('btn-apply-sanction'),
  banFeedback: document.getElementById('ban-feedback'),
  toggleSlowMode: document.getElementById('toggle-slow-mode'),
  toggleSubMode: document.getElementById('toggle-sub-mode'),
  toggleEmoteMode: document.getElementById('toggle-emote-mode'),
  toggleFollowerMode: document.getElementById('toggle-follower-mode'),
  btnClearChat: document.getElementById('btn-clear-chat'),
  btnToggleShield: document.getElementById('btn-toggle-shield'),

  // Chatters
  chattersCount: document.getElementById('chatters-count'),
  btnRefreshChatters: document.getElementById('btn-refresh-chatters'),
  chattersSearch: document.getElementById('chatters-search'),
  chattersList: document.getElementById('chatters-list'),

  // Édition
  editorRoleBadge: document.getElementById('editor-role-badge'),
  btnRefreshChannelInfo: document.getElementById('btn-refresh-channel-info'),
  editStreamTitle: document.getElementById('edit-stream-title'),
  titleCharCount: document.getElementById('title-char-count'),
  selectedGameImage: document.getElementById('selected-game-image'),
  selectedGameName: document.getElementById('selected-game-name'),
  selectedGameId: document.getElementById('selected-game-id'),
  editCategorySearch: document.getElementById('edit-category-search'),
  categoryResultsDropdown: document.getElementById('category-results-dropdown'),
  tagsContainer: document.getElementById('tags-container'),
  newTagInput: document.getElementById('new-tag-input'),
  btnAddTag: document.getElementById('btn-add-tag'),
  btnSaveChannelInfo: document.getElementById('btn-save-channel-info'),
  editorSaveFeedback: document.getElementById('editor-save-feedback'),
  btnOpenStreamManager: document.getElementById('btn-open-stream-manager'),
  commercialButtons: document.querySelectorAll('.btn-commercial'),
  commercialFeedback: document.getElementById('commercial-feedback'),

  // Statistiques
  statStreamStatus: document.getElementById('stat-stream-status'),
  statStreamViewers: document.getElementById('stat-stream-viewers'),
  statStreamGame: document.getElementById('stat-stream-game'),
  statStreamUptime: document.getElementById('stat-stream-uptime'),
  modRightsSummary: document.getElementById('mod-rights-summary'),
  rightPillBans: document.getElementById('right-pill-bans'),
  rightPillChat: document.getElementById('right-pill-chat'),
  rightPillChatters: document.getElementById('right-pill-chatters'),
  rightPillShield: document.getElementById('right-pill-shield')
};

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  setupGridCustomization();
  setupPredictionsWidget();
  setupFooter();
  setupSettings();
  await checkExistingSession();
});

/**
 * Pied de page : version et date de la version
 */
async function setupFooter() {
  try {
    const { version, buildDate } = await window.electronAPI.getAppInfo();
    document.getElementById('footer-version').textContent = 'v' + version;
    document.getElementById('footer-date').textContent = buildDate
      ? new Date(buildDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
      : 'version de développement';
  } catch (err) {
    console.error('setupFooter:', err);
  }
}

/**
 * Configure tous les écouteurs d'événements
 */
function setupEventListeners() {
  // Connexion & Déconnexion
  dom.btnLogin.addEventListener('click', handleLogin);
  dom.btnLogout.addEventListener('click', handleLogout);

  // Rafraîchir la liste des chaînes
  dom.btnRefresh.addEventListener('click', () => {
    fetchChannels();
  });

  // Filtres
  dom.filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      dom.filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.activeFilter = tab.dataset.filter;
      renderChannels();
    });
  });

  // Recherche
  dom.searchInput.addEventListener('input', (e) => {
    state.searchTerm = e.target.value.trim().toLowerCase();
    dom.searchClear.classList.toggle('hidden', state.searchTerm === '');
    renderChannels();
  });

  dom.searchClear.addEventListener('click', () => {
    dom.searchInput.value = '';
    state.searchTerm = '';
    dom.searchClear.classList.add('hidden');
    dom.searchInput.focus();
    renderChannels();
  });

  dom.sortSelect.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    renderChannels();
  });

  // Navigation Modérateur
  dom.btnBackToChannels.addEventListener('click', closeModerationScreen);

  dom.btnOpenBrowserMod.addEventListener('click', () => {
    if (state.currentChannel) {
      window.electronAPI.openExternal(`https://www.twitch.tv/moderator/${state.currentChannel.login}`);
    }
  });

  // Onglets Grille vs Vue Officielle
  dom.tabModIntegrated.addEventListener('click', () => {
    switchModTab('integrated');
  });

  dom.tabModWebview.addEventListener('click', () => {
    switchModTab('webview');
  });

  if (dom.twitchModWebview) {
    dom.twitchModWebview.addEventListener('dom-ready', () => {
      try {
        dom.twitchModWebview.insertCSS(`
          html, body, #root, [data-a-target="mod-view-layout"], .mod-view {
            height: 100% !important;
            min-height: 100% !important;
            max-height: 100% !important;
          }
        `);
      } catch (e) {}
    });
  }

  // Presets de sanction
  dom.durationPresets.forEach(btn => {
    btn.addEventListener('click', () => {
      dom.durationPresets.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedSanctionDuration = Number(btn.dataset.duration);
    });
  });

  dom.btnApplySanction.addEventListener('click', applySanction);

  // Contrôles du chat
  dom.toggleSlowMode.addEventListener('change', (e) => updateChatSetting({ slow_mode: e.target.checked, slow_mode_wait_time: 3 }));
  dom.toggleSubMode.addEventListener('change', (e) => updateChatSetting({ subscriber_mode: e.target.checked }));
  dom.toggleEmoteMode.addEventListener('change', (e) => updateChatSetting({ emote_mode: e.target.checked }));
  dom.toggleFollowerMode.addEventListener('change', (e) => updateChatSetting({ follower_mode: e.target.checked }));

  dom.btnClearChat.addEventListener('click', handleClearChat);
  dom.btnToggleShield.addEventListener('click', handleToggleShield);

  // Chatters
  dom.btnRefreshChatters.addEventListener('click', () => {
    if (state.currentChannel) fetchChatters(state.currentChannel.id);
  });

  dom.chattersSearch.addEventListener('input', (e) => {
    filterChattersList(e.target.value.toLowerCase().trim());
  });

  // Historique des actions
  dom.btnClearActionsLog.addEventListener('click', () => {
    const channel = state.currentChannel;
    if (!channel || !confirm(`Effacer l'historique des actions de ${channel.name} ? Il ne pourra pas être récupéré.`)) return;
    const { [channel.id]: _removed, ...rest } = state.modActions;
    state.modActions = rest;
    saveModActions(state.modActions);
    renderModActions();
  });

  dom.logSearchInput.addEventListener('input', renderModActions);

  window.electronAPI.onModAction((entry) => {
    if (!entry?.event?.broadcaster_user_id || !entry.event.action) return;
    state.modActions = addModAction(state.modActions, entry);
    saveModActions(state.modActions);
    if (state.currentChannel && String(state.currentChannel.id) === entry.event.broadcaster_user_id) {
      renderModActions();
    }
  });

  window.electronAPI.onModActionsError(({ message }) => {
    state.modActionsNotice = `⚠️ Suivi des actions indisponible : ${message}`;
    renderModActions();
  });

  // Les dates relatives (« il y a 5 min ») restent justes
  setInterval(() => { if (state.currentChannel) renderModActions(); }, 60000);

  // Édition
  dom.btnOpenStreamManager.addEventListener('click', () => {
    if (state.currentChannel) {
      window.electronAPI.openExternal(`https://dashboard.twitch.tv/u/${state.currentChannel.login}/stream-manager`);
    }
  });

  dom.btnRefreshChannelInfo.addEventListener('click', () => {
    if (state.currentChannel) loadEditorChannelInfo(state.currentChannel.id);
  });

  dom.editStreamTitle.addEventListener('input', (e) => {
    dom.titleCharCount.innerText = `${e.target.value.length} / 140`;
  });

  dom.editCategorySearch.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    if (state.categorySearchTimeout) clearTimeout(state.categorySearchTimeout);

    if (query.length < 2) {
      dom.categoryResultsDropdown.classList.add('hidden');
      return;
    }

    state.categorySearchTimeout = setTimeout(async () => {
      try {
        const res = await window.electronAPI.searchCategories(query);
        if (res.success && Array.isArray(res.games)) {
          renderCategoryDropdown(res.games);
        }
      } catch (err) {
        console.error('Erreur recherche catégories:', err);
      }
    }, 250);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#category-selected-box') && !e.target.closest('#edit-category-search') && !e.target.closest('#category-results-dropdown')) {
      dom.categoryResultsDropdown.classList.add('hidden');
    }
    if (!e.target.closest('#btn-widgets-menu') && !e.target.closest('#widgets-dropdown')) {
      dom.widgetsDropdown.classList.add('hidden');
    }
  });

  dom.btnAddTag.addEventListener('click', handleAddTag);
  dom.newTagInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  });

  dom.btnSaveChannelInfo.addEventListener('click', handleSaveChannelInfo);

  dom.commercialButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const length = Number(btn.dataset.duration) || 30;
      handleTriggerCommercial(length);
    });
  });
}

/**
 * Configure la personnalisation de la grille : Drag & Drop, Redimensionnement, Masquage
 */
function setupGridCustomization() {
  // Menu des panneaux
  dom.btnWidgetsMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    dom.widgetsDropdown.classList.toggle('hidden');
  });

  // Checkboxes du menu panneaux
  const checkboxes = dom.widgetsDropdown.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      const widgetId = cb.dataset.widget;
      const widgetEl = document.getElementById(widgetId);
      if (widgetEl) {
        widgetEl.style.display = cb.checked ? 'flex' : 'none';
        saveGridLayout();
      }
    });
  });

  // Bouton Réinitialiser la grille
  dom.btnResetLayout.addEventListener('click', () => {
    if (confirm('Voulez-vous réinitialiser l\'emplacement et la taille par défaut de tous les panneaux ?')) {
      localStorage.removeItem('twitch_mod_manager_grid_layout');
      location.reload();
    }
  });

  // Configuration de chaque widget dans la grille
  const widgets = dom.modCustomGrid.querySelectorAll('.grid-widget');
  widgets.forEach(widget => {
    // Boutons de taille de colonnes
    const sizeBtns = widget.querySelectorAll('.btn-widget-size');
    sizeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const newSize = btn.dataset.size;
        // Supprimer toutes les anciennes classes de col-span
        widget.classList.remove('col-span-3', 'col-span-4', 'col-span-5', 'col-span-6', 'col-span-7', 'col-span-8', 'col-span-12');
        widget.classList.add(newSize);
        saveGridLayout();
      });
    });

    // Bouton Réduire / Déplier
    const collapseBtn = widget.querySelector('.btn-widget-collapse');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', () => {
        widget.classList.toggle('collapsed');
        collapseBtn.innerText = widget.classList.contains('collapsed') ? '＋' : '−';
        saveGridLayout();
      });
    }

    // Bouton Fermer le panneau
    const closeBtn = widget.querySelector('.btn-widget-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        widget.style.display = 'none';
        const cb = dom.widgetsDropdown.querySelector(`input[data-widget="${widget.id}"]`);
        if (cb) cb.checked = false;
        saveGridLayout();
      });
    }

    // ==========================================
    // Glisser-Déposer (Drag & Drop natif HTML5)
    // ==========================================
    widget.addEventListener('dragstart', (e) => {
      state.draggedWidgetId = widget.id;
      widget.classList.add('is-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', widget.id);
    });

    widget.addEventListener('dragend', () => {
      state.draggedWidgetId = null;
      widgets.forEach(w => {
        w.classList.remove('is-dragging', 'drag-over');
      });
      saveGridLayout();
    });

    widget.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (state.draggedWidgetId && state.draggedWidgetId !== widget.id) {
        widget.classList.add('drag-over');
      }
    });

    widget.addEventListener('dragleave', () => {
      widget.classList.remove('drag-over');
    });

    widget.addEventListener('drop', (e) => {
      e.preventDefault();
      widget.classList.remove('drag-over');

      const draggedId = state.draggedWidgetId;
      if (!draggedId || draggedId === widget.id) return;

      const draggedEl = document.getElementById(draggedId);
      if (!draggedEl) return;

      // Déterminer s'il faut insérer avant ou après
      const rect = widget.getBoundingClientRect();
      const midPoint = rect.top + rect.height / 2;
      if (e.clientY < midPoint) {
        dom.modCustomGrid.insertBefore(draggedEl, widget);
      } else {
        dom.modCustomGrid.insertBefore(draggedEl, widget.nextSibling);
      }

      saveGridLayout();
    });
  });

  // Restaurer l'agencement enregistré
  restoreGridLayout();
}

/**
 * Enregistre la disposition actuelle (ordre, taille, affichage) dans localStorage
 */
function saveGridLayout() {
  const widgets = dom.modCustomGrid.querySelectorAll('.grid-widget');
  const layout = [];

  widgets.forEach(widget => {
    // Extraire la classe de col-span
    let colSpan = 'col-span-6';
    for (const cls of widget.classList) {
      if (cls.startsWith('col-span-')) colSpan = cls;
    }

    layout.push({
      id: widget.id,
      colSpan: colSpan,
      visible: widget.style.display !== 'none',
      collapsed: widget.classList.contains('collapsed'),
      height: widget.style.height || ''
    });
  });

  localStorage.setItem('twitch_mod_manager_grid_layout', JSON.stringify(layout));
}

/**
 * Restaure la disposition enregistrée par l'utilisateur
 */
function restoreGridLayout() {
  try {
    const saved = localStorage.getItem('twitch_mod_manager_grid_layout');
    if (!saved) return;

    const layout = JSON.parse(saved);
    if (!Array.isArray(layout)) return;

    layout.forEach(item => {
      const widget = document.getElementById(item.id);
      if (!widget) return;

      // Réordonner dans le DOM
      dom.modCustomGrid.appendChild(widget);

      // Restaurer la largeur
      if (item.colSpan) {
        widget.classList.remove('col-span-3', 'col-span-4', 'col-span-5', 'col-span-6', 'col-span-7', 'col-span-8', 'col-span-12');
        widget.classList.add(item.colSpan);
      }

      // Restaurer la visibilité
      if (item.visible === false) {
        widget.style.display = 'none';
        const cb = dom.widgetsDropdown.querySelector(`input[data-widget="${item.id}"]`);
        if (cb) cb.checked = false;
      }

      // Restaurer l'état replié
      if (item.collapsed) {
        widget.classList.add('collapsed');
        const collapseBtn = widget.querySelector('.btn-widget-collapse');
        if (collapseBtn) collapseBtn.innerText = '＋';
      }

      // Restaurer la hauteur personnalisée
      if (item.height) {
        widget.style.height = item.height;
      }
    });
  } catch (err) {
    console.error('Erreur restauration layout:', err);
  }
}

/**
 * Affiche les actions de modération Twitch de la chaîne ouverte (les plus récentes en haut)
 */
function renderModActions() {
  const channel = state.currentChannel;
  const all = channel ? (state.modActions[channel.id] || []) : [];
  const query = dom.logSearchInput.value.toLowerCase().trim();
  const rows = all
    .map(entry => ({ entry, ...describeModAction(entry) }))
    .filter(row => !query || `${row.target || ''} ${row.text}`.toLowerCase().includes(query));

  dom.modActionsCount.textContent = `${all.length} action${all.length > 1 ? 's' : ''}`;
  dom.modActionsList.replaceChildren();

  if (state.modActionsNotice) {
    dom.modActionsList.append(Object.assign(document.createElement('p'), {
      className: 'card-hint', textContent: state.modActionsNotice
    }));
  }
  if (rows.length === 0) {
    dom.modActionsList.append(Object.assign(document.createElement('p'), {
      className: 'card-hint',
      textContent: all.length ? 'Aucune action ne correspond au filtre.'
        : 'Aucune action pour le moment. Les actions de modération (raids, VIP, bans…) apparaissent ici dès que l\'application est ouverte.'
    }));
    return;
  }

  rows.forEach(row => {
    const item = document.createElement('div');
    item.className = 'mod-action-item';
    const icon = Object.assign(document.createElement('span'), { className: 'mod-action-icon', textContent: row.icon });
    const body = document.createElement('div');
    body.className = 'mod-action-body';
    if (row.target) {
      const link = Object.assign(document.createElement('a'), {
        className: 'mod-action-target', textContent: row.target, href: '#'
      });
      link.addEventListener('click', (e) => {
        e.preventDefault();
        window.electronAPI.openExternal(`https://www.twitch.tv/${encodeURIComponent(row.target)}`);
      });
      body.append(link);
    }
    body.append(Object.assign(document.createElement('div'), {
      className: 'mod-action-text',
      textContent: `${row.text} • ${formatRelativeTime(row.entry.receivedAt)}`
    }));
    item.append(icon, body);
    dom.modActionsList.append(item);
  });
}

/**
 * Bascule entre la Grille Modérateur et la Vue Twitch Officielle
 */
function switchModTab(tabName) {
  dom.tabModIntegrated.classList.toggle('active', tabName === 'integrated');
  dom.tabModWebview.classList.toggle('active', tabName === 'webview');

  dom.viewModIntegrated.classList.toggle('hidden', tabName !== 'integrated');
  dom.viewModWebview.classList.toggle('hidden', tabName !== 'webview');

  if (tabName === 'webview') {
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 50);

    if (state.currentChannel && dom.twitchModWebview) {
      const targetUrl = `https://www.twitch.tv/moderator/${state.currentChannel.login}`;
      if (dom.twitchModWebview.getAttribute('src') !== targetUrl) {
        dom.twitchModWebview.setAttribute('src', targetUrl);
      }
    }
  }
}

/**
 * Vérifie si une session valide est déjà sauvegardée
 */
async function checkExistingSession() {
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
  dom.authStatus.innerText = 'Ouverture de Twitch dans votre navigateur...';
  dom.authStatus.style.color = '#bf94ff';

  try {
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
      openModerationScreen(channel);
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
      <img class="channel-avatar" src="${avatarUrl}" alt="${channel.name}" loading="lazy">
      ${channel.isLive ? '<span class="live-indicator">LIVE</span>' : ''}
    </div>
    <div class="channel-names">
      <div class="channel-title-row">
        <span class="channel-name" title="${channel.name}">${escapeHtml(channel.name)}</span>
        <span class="status-tag ${channel.isLive ? 'live' : 'offline'}">
          ${channel.isLive ? '🔴 EN DIRECT' : 'Hors ligne'}
        </span>
      </div>
      <div class="channel-login">@${escapeHtml(channel.login)}</div>
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
    openModerationScreen(channel);
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

// ========================================================
// LOGIQUE DE L'ESPACE MODÉRATEUR PERSONNALISABLE
// ========================================================

/**
 * Ouvre l'écran de modération personnalisable
 */
async function openModerationScreen(channel) {
  state.currentChannel = channel;

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
  dom.banFeedback.innerText = '';
  dom.banFeedback.className = 'action-feedback';

  dom.logSearchInput.value = '';
  renderModActions();

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
  state.currentRights = null;
  state.isEditor = false;
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
  pill.innerHTML = `${label} : ${isAllowed ? '✅' : '⚠️'}`;
}

function adaptBanForm(canBan) {
  dom.banUserInput.disabled = !canBan;
  dom.banReasonInput.disabled = !canBan;
  dom.btnApplySanction.disabled = !canBan;
  dom.durationPresets.forEach(btn => btn.disabled = !canBan);
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

  const targetUser = dom.banUserInput.value.trim();
  if (!targetUser) {
    dom.banFeedback.innerText = 'Veuillez saisir un pseudo.';
    dom.banFeedback.className = 'action-feedback error';
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
      dom.banFeedback.innerText = `✅ ${typeStr} sur @${targetUser} effectué.`;
      dom.banFeedback.className = 'action-feedback success';
      dom.banUserInput.value = '';
    } else {
      dom.banFeedback.innerText = `❌ ${res.error || 'Erreur sanction'}`;
      dom.banFeedback.className = 'action-feedback error';
    }
  } catch (err) {
    dom.banFeedback.innerText = `Erreur : ${err.message}`;
    dom.banFeedback.className = 'action-feedback error';
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
      dom.banFeedback.innerText = `Cible : @${chatter.user_login}`;
      dom.banFeedback.className = 'action-feedback';
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

// ==========================================
// RÔLE ÉDITEUR DE CHAÎNE
// ==========================================

async function loadEditorStatusAndInfo(channel) {
  try {
    const res = await window.electronAPI.checkEditorRights(channel.id);
    state.isEditor = Boolean(res.isEditor);
    showRight('editor', state.isEditor);

    if (state.isEditor) {
      dom.editorRoleBadge.className = 'editor-badge active';
      dom.editorRoleBadge.innerText = 'Éditeur ✅';
      dom.btnSaveChannelInfo.disabled = false;
      dom.commercialButtons.forEach(b => b.disabled = false);
    } else {
      dom.editorRoleBadge.className = 'editor-badge inactive';
      dom.editorRoleBadge.innerText = 'Non éditeur';
      dom.btnSaveChannelInfo.disabled = true;
      dom.commercialButtons.forEach(b => b.disabled = true);
    }

    if (res.channelInfo) {
      applyChannelInfoToForm(res.channelInfo);
    }
  } catch (err) {
    console.error('Erreur statut éditeur:', err);
  }
}

async function loadEditorChannelInfo(broadcasterId) {
  dom.btnRefreshChannelInfo.classList.add('spinning');
  try {
    const res = await window.electronAPI.getChannelInfo(broadcasterId);
    if (res.success && res.info) {
      applyChannelInfoToForm(res.info);
      dom.editorSaveFeedback.innerText = 'Infos synchronisées.';
      dom.editorSaveFeedback.className = 'action-feedback success';
    }
  } catch (err) {
    dom.editorSaveFeedback.innerText = `Erreur : ${err.message}`;
    dom.editorSaveFeedback.className = 'action-feedback error';
  } finally {
    dom.btnRefreshChannelInfo.classList.remove('spinning');
  }
}

function applyChannelInfoToForm(info) {
  state.channelInfo = info;
  dom.editStreamTitle.value = info.title || '';
  dom.titleCharCount.innerText = `${(info.title || '').length} / 140`;

  state.selectedGameId = info.game_id || '';
  state.selectedGameName = info.game_name || '';

  dom.selectedGameName.innerText = info.game_name || 'Aucune catégorie';
  dom.selectedGameId.innerText = info.game_id ? `ID: ${info.game_id}` : '';

  state.currentTags = Array.isArray(info.tags) ? [...info.tags] : [];
  renderTags();
}

function renderCategoryDropdown(games) {
  dom.categoryResultsDropdown.innerHTML = '';
  if (!games || games.length === 0) {
    dom.categoryResultsDropdown.classList.add('hidden');
    return;
  }

  games.forEach(game => {
    const option = document.createElement('div');
    option.className = 'category-option';
    const boxArt = game.box_art_url
      ? game.box_art_url.replace('{width}', '52').replace('{height}', '72')
      : '';

    option.innerHTML = `
      ${boxArt ? `<img src="${boxArt}" alt="${game.name}">` : ''}
      <span>${escapeHtml(game.name)}</span>
    `;

    option.addEventListener('click', () => {
      state.selectedGameId = game.id;
      state.selectedGameName = game.name;
      dom.selectedGameName.innerText = game.name;
      dom.selectedGameId.innerText = `ID: ${game.id}`;
      if (boxArt) {
        dom.selectedGameImage.src = boxArt;
        dom.selectedGameImage.classList.remove('hidden');
      }
      dom.editCategorySearch.value = '';
      dom.categoryResultsDropdown.classList.add('hidden');
    });

    dom.categoryResultsDropdown.appendChild(option);
  });

  dom.categoryResultsDropdown.classList.remove('hidden');
}

function renderTags() {
  dom.tagsContainer.innerHTML = '';
  if (state.currentTags.length === 0) {
    dom.tagsContainer.innerHTML = '<span class="card-hint">Aucun tag défini</span>';
    return;
  }

  state.currentTags.forEach((tag, idx) => {
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.innerHTML = `
      <span>${escapeHtml(tag)}</span>
      <span class="tag-remove" title="Supprimer">×</span>
    `;

    chip.querySelector('.tag-remove').addEventListener('click', () => {
      state.currentTags.splice(idx, 1);
      renderTags();
    });

    dom.tagsContainer.appendChild(chip);
  });
}

function handleAddTag() {
  const newTag = dom.newTagInput.value.trim().replace(/^#/, '');
  if (!newTag) return;

  if (state.currentTags.length >= 10) {
    alert('Maximum 10 tags autorisés par Twitch.');
    return;
  }

  if (!state.currentTags.includes(newTag)) {
    state.currentTags.push(newTag);
    renderTags();
  }
  dom.newTagInput.value = '';
  dom.newTagInput.focus();
}

async function handleSaveChannelInfo() {
  if (!state.currentChannel) return;

  const title = dom.editStreamTitle.value.trim();
  const game_id = state.selectedGameId;
  const tags = state.currentTags;

  dom.btnSaveChannelInfo.disabled = true;
  dom.editorSaveFeedback.innerText = 'Sauvegarde...';

  try {
    const res = await window.electronAPI.modifyChannelInfo(state.currentChannel.id, {
      title,
      game_id,
      tags
    });

    if (res.success) {
      dom.editorSaveFeedback.innerText = '✅ Infos mises à jour sur Twitch !';
      dom.editorSaveFeedback.className = 'action-feedback success';

      dom.modStreamerGame.innerText = `🎮 ${state.selectedGameName || 'Discussion'}`;
      dom.statStreamGame.innerText = state.selectedGameName || 'Discussion';

    } else {
      dom.editorSaveFeedback.innerText = `❌ ${res.error || 'Erreur éditeur'}`;
      dom.editorSaveFeedback.className = 'action-feedback error';
    }
  } catch (err) {
    dom.editorSaveFeedback.innerText = `Erreur : ${err.message}`;
    dom.editorSaveFeedback.className = 'action-feedback error';
  } finally {
    dom.btnSaveChannelInfo.disabled = false;
  }
}

async function handleTriggerCommercial(length) {
  if (!state.currentChannel) return;

  dom.commercialFeedback.innerText = `Lancement pub (${length}s)...`;

  try {
    const res = await window.electronAPI.startCommercial(state.currentChannel.id, length);
    if (res.success) {
      dom.commercialFeedback.innerText = `✅ Pub de ${length}s lancée !`;
      dom.commercialFeedback.className = 'action-feedback success';
    } else {
      dom.commercialFeedback.innerText = `❌ ${res.error || 'Erreur pub'}`;
      dom.commercialFeedback.className = 'action-feedback error';
    }
  } catch (err) {
    dom.commercialFeedback.innerText = `Erreur : ${err.message}`;
    dom.commercialFeedback.className = 'action-feedback error';
  }
}

function formatDuration(sec) {
  if (sec === 1) return '1 seconde';
  if (sec === 60) return '1 minute';
  if (sec === 600) return '10 minutes';
  if (sec === 3600) return '1 heure';
  if (sec === 86400) return '24 heures';
  return `${sec}s`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function startAutoRefresh() {
  stopAutoRefresh();
  if (!state.settings.autoRefresh) return; // désactivée dans les paramètres
  state.autoRefreshTimer = setInterval(() => {
    if (!state.currentChannel) {
      fetchChannels();
    }
  }, state.settings.refreshSeconds * 1000);
}

/**
 * Fenêtre Paramètres : intervalle d'actualisation et thème, appliqués et enregistrés tout de suite
 */
function setupSettings() {
  const updateSettings = (changes) => {
    state.settings = { ...state.settings, ...changes };
    saveSettings(state.settings);
  };

  const showRefreshControls = () => {
    dom.settingRefreshEnabled.checked = state.settings.autoRefresh;
    dom.settingRefresh.value = String(state.settings.refreshSeconds);
    dom.settingRefresh.disabled = !state.settings.autoRefresh;
    dom.settingRefreshValue.textContent = `${state.settings.refreshSeconds} s`;
  };
  const applyRefresh = (changes) => {
    updateSettings(changes);
    showRefreshControls();
    if (state.currentUser) startAutoRefresh();
  };

  dom.btnSettings.addEventListener('click', () => {
    showRefreshControls();
    dom.settingsDialog.querySelector(`input[name="setting-theme"][value="${state.settings.theme}"]`).checked = true;
    dom.settingsDialog.showModal();
  });

  dom.settingRefreshEnabled.addEventListener('change', (e) => applyRefresh({ autoRefresh: e.target.checked }));
  // Pendant le glissement : affichage seulement ; au relâchement : enregistrement
  dom.settingRefresh.addEventListener('input', (e) => {
    dom.settingRefreshValue.textContent = `${e.target.value} s`;
  });
  dom.settingRefresh.addEventListener('change', (e) => applyRefresh({ refreshSeconds: Number(e.target.value) }));

  dom.settingsDialog.querySelectorAll('input[name="setting-theme"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      updateSettings({ theme: e.target.value });
      applyTheme(state.settings.theme);
    });
  });
}

function stopAutoRefresh() {
  if (state.autoRefreshTimer) {
    clearInterval(state.autoRefreshTimer);
    state.autoRefreshTimer = null;
  }
}

// ========================================================
// WIDGET PREDICTIONS - Gestion des predictions Twitch
// ========================================================

let _predictionsState = {
  current: null,
  broadcasterId: null
};

async function loadPredictions(broadcasterId) {
  _predictionsState.broadcasterId = broadcasterId;
  const statusEl = document.getElementById('predictions-status');
  const activeEl = document.getElementById('predictions-active');
  const historyList = document.getElementById('predictions-history-list');
  if (!statusEl) return;

  if (activeEl) activeEl.style.display = 'none';
  statusEl.style.display = 'block';

  // L'API Twitch n'autorise les predictions que sur la chaine du compte connecte (pas pour les mods/editeurs)
  const isOwnChannel = String(broadcasterId) === String(state.currentUser?.id);
  showRight('predictions', isOwnChannel);
  if (!isOwnChannel) return;

  statusEl.textContent = 'Chargement des predictions...';

  try {
    const res = await window.electronAPI.getPredictions(broadcasterId);
    if (!res.success) throw new Error(res.error || 'Erreur API');
    const predictions = res.data || [];

    const active = predictions.filter(p => p.status === 'ACTIVE' || p.status === 'LOCKED');
    const history = predictions.filter(p => p.status !== 'ACTIVE' && p.status !== 'LOCKED');

    statusEl.style.display = active.length ? 'none' : 'block';
    statusEl.textContent = active.length ? '' : 'Aucune prediction active.';

    if (active.length && activeEl) {
      activeEl.style.display = 'block';
      _predictionsState.current = active[0];
      renderActivePrediction(active[0]);
    }

    if (historyList) {
      historyList.innerHTML = '';
      history.slice(0, 10).forEach(p => {
        const li = document.createElement('li');
        li.style.cssText = 'padding:6px 0;border-bottom:1px solid var(--border);font-size:12px;';
        const winner = p.winning_outcome_id ? p.outcomes.find(o => o.id === p.winning_outcome_id) : null;
        li.innerHTML =
          '<span style="font-weight:600;">' + escapeHtml(p.title) + '</span>' +
          (winner ? ' <span style="color:#9acd32;">&#8594; ' + escapeHtml(winner.title) + '</span>' : '') +
          '<br><span style="color:var(--text-muted);">' +
          new Date(p.created_at).toLocaleString('fr-FR') + ' &bull; ' + renderStatusLabel(p.status) +
          '</span>';
        historyList.appendChild(li);
      });
      if (history.length === 0) {
        historyList.innerHTML = '<li style="color:var(--text-muted);font-size:12px;padding:4px 0;">Aucun historique.</li>';
      }
    }
  } catch (err) {
    statusEl.style.display = 'block';
    statusEl.textContent = /Missing scope/i.test(err.message)
      ? 'Permission manquante : deconnecte-toi puis reconnecte-toi pour autoriser les predictions.'
      : 'Erreur : ' + err.message;
    console.error('loadPredictions:', err);
  }
}

function renderActivePrediction(p) {
  const titleEl = document.getElementById('pred-title');
  const metaEl = document.getElementById('pred-meta');
  const outcomesEl = document.getElementById('pred-outcomes');
  const actionsRow = document.getElementById('pred-actions-row');
  if (!titleEl) return;

  titleEl.textContent = p.title;

  const endsAt = p.locked_at
    ? new Date(p.locked_at)
    : new Date(new Date(p.created_at).getTime() + p.prediction_window * 1000);
  const remaining = Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
  metaEl.innerHTML = renderStatusLabel(p.status) + ' &bull; ' +
    (remaining > 0 ? remaining + 's restantes' : 'Terminee');

  const totalPoints = p.outcomes.reduce((sum, o) => sum + (o.channel_points || 0), 0);
  outcomesEl.innerHTML = '';
  p.outcomes.forEach((o, i) => {
    const pct = totalPoints ? Math.round((o.channel_points || 0) / totalPoints * 100) : 0;
    const bar = document.createElement('div');
    bar.style.cssText = 'margin-bottom:6px;';
    bar.innerHTML =
      '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px;">' +
      '<span>' + escapeHtml(o.title) + '</span>' +
      '<span>' + (o.users || 0) + ' votants &bull; ' + pct + '%</span>' +
      '</div>' +
      '<div style="background:var(--bg-primary);border-radius:4px;height:6px;">' +
      '<div style="background:' + (i === 0 ? '#9146ff' : '#00aaff') + ';width:' + pct + '%;height:6px;border-radius:4px;transition:width 0.3s;"></div>' +
      '</div>';
    outcomesEl.appendChild(bar);
  });

  actionsRow.innerHTML = '';
  if (p.status === 'ACTIVE') {
    const btnLock = document.createElement('button');
    btnLock.className = 'btn-secondary btn-sm';
    btnLock.textContent = 'Verrouiller';
    btnLock.onclick = () => predictionAction(p.id, 'LOCKED', null);
    actionsRow.appendChild(btnLock);

    const btnCancel = document.createElement('button');
    btnCancel.className = 'btn-secondary btn-sm';
    btnCancel.style.color = '#ff6b6b';
    btnCancel.textContent = 'Annuler';
    btnCancel.onclick = () => predictionAction(p.id, 'CANCELED', null);
    actionsRow.appendChild(btnCancel);
  }

  if (p.status === 'LOCKED') {
    p.outcomes.forEach(o => {
      const btn = document.createElement('button');
      btn.className = 'btn-primary btn-sm';
      btn.textContent = 'Gagnant : ' + o.title;
      btn.onclick = () => predictionAction(p.id, 'RESOLVED', o.id);
      actionsRow.appendChild(btn);
    });
    const btnCancel = document.createElement('button');
    btnCancel.className = 'btn-secondary btn-sm';
    btnCancel.style.color = '#ff6b6b';
    btnCancel.textContent = 'Annuler';
    btnCancel.onclick = () => predictionAction(p.id, 'CANCELED', null);
    actionsRow.appendChild(btnCancel);
  }
}

async function predictionAction(predictionId, status, winningOutcomeId) {
  const broadcasterId = _predictionsState.broadcasterId;
  if (!broadcasterId) return;
  try {
    const res = await window.electronAPI.updatePrediction(broadcasterId, predictionId, status, winningOutcomeId);
    if (!res.success) throw new Error(res.error || 'Echec mise a jour');
    setTimeout(() => loadPredictions(broadcasterId), 1200);
  } catch (err) {
    console.error('predictionAction:', err);
    alert('Erreur : ' + err.message);
  }
}

async function createPredictionFromForm() {
  const broadcasterId = _predictionsState.broadcasterId;
  if (!broadcasterId) return;
  const title = (document.getElementById('pred-new-title') || {}).value?.trim();
  const duration = parseInt((document.getElementById('pred-duration') || {}).value || '300', 10);
  const inputs = document.querySelectorAll('.pred-outcome-input');
  const outcomes = Array.from(inputs).map(i => i.value.trim()).filter(Boolean);
  const fb = document.getElementById('prediction-create-feedback');

  if (!title) { if(fb){fb.textContent='Entrez une question.';fb.className='action-feedback error';} return; }
  if (outcomes.length < 2) { if(fb){fb.textContent='Au moins 2 choix requis.';fb.className='action-feedback error';} return; }

  if (fb) { fb.textContent = 'Creation en cours...'; fb.className = 'action-feedback'; }
  try {
    const res = await window.electronAPI.createPrediction(broadcasterId, { title, outcomes, prediction_window: duration });
    if (!res.success) throw new Error(res.error || 'Echec creation');
    if (fb) { fb.textContent = 'Prediction creee !'; fb.className = 'action-feedback success'; }
    const modal = document.getElementById('prediction-modal');
    if (modal) modal.style.display = 'none';
    setTimeout(() => loadPredictions(broadcasterId), 1200);
  } catch (err) {
    if (fb) { fb.textContent = 'Erreur : ' + err.message; fb.className = 'action-feedback error'; }
  }
}

function renderStatusLabel(status) {
  const labels = {
    ACTIVE: '<span style="color:#9acd32;font-weight:600;">ACTIVE</span>',
    LOCKED: '<span style="color:#ffa500;font-weight:600;">VERROUILLEE</span>',
    RESOLVED: '<span style="color:#888;">RESOLUE</span>',
    CANCELED: '<span style="color:#ff6b6b;">ANNULEE</span>'
  };
  return labels[status] || status;
}

function setupPredictionsWidget() {
  const btnNew = document.getElementById('btn-new-prediction');
  const btnRefresh = document.getElementById('btn-refresh-predictions');
  const btnCreate = document.getElementById('btn-create-prediction');
  const btnCancelModal = document.getElementById('btn-cancel-prediction');
  const modal = document.getElementById('prediction-modal');

  if (btnNew) {
    btnNew.onclick = () => {
      if (modal) modal.style.display = modal.style.display === 'none' ? 'block' : 'none';
    };
  }
  if (btnRefresh) {
    btnRefresh.onclick = () => {
      if (_predictionsState.broadcasterId) loadPredictions(_predictionsState.broadcasterId);
    };
  }
  if (btnCreate) btnCreate.onclick = createPredictionFromForm;
  if (btnCancelModal) {
    btnCancelModal.onclick = () => { if (modal) modal.style.display = 'none'; };
  }
}