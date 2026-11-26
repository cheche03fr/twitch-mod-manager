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
  twitchModLog: {}, // historique lu sur Twitch à chaque « Gérer » : { [broadcasterId]: [{ receivedAt, twitch }] }
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
  panelDrag: null
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
  twitchChatWebview: document.getElementById('twitch-chat-webview'),
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
  rightPillShield: document.getElementById('right-pill-shield'),
  rightPillEditor: document.getElementById('right-pill-editor')
};

// Initialisation au chargement de la page
// Page d'un onglet de chaîne (ouverte par « Gérer ») : ?channel=<identifiant>
let pendingChannelId = new URLSearchParams(window.location.search).get('channel');
const isTabView = pendingChannelId !== null;
if (isTabView) document.documentElement.classList.add('in-tab');

document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  setupChannelTabs();
  setupGridCustomization();
  setupPredictionsWidget();
  setupWhispersPanel();
  setupChannelPointsPanel();
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
      // « Débannir » est un choix comme les durées : Appliquer lève alors le ban
      state.selectedSanctionDuration = btn.dataset.duration === 'unban' ? 'unban' : Number(btn.dataset.duration);
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
    if (!channel || !confirm(`Vider la liste des actions de ${channel.name} ? L'historique Twitch sera rechargé au prochain clic sur Gérer.`)) return;
    const { [channel.id]: _removed, ...rest } = state.modActions;
    const { [channel.id]: _removedLog, ...restLog } = state.twitchModLog;
    state.modActions = rest;
    state.twitchModLog = restLog;
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
 * Affiche les actions de modération Twitch de la chaîne ouverte (les plus récentes en haut)
 */
function renderModActions() {
  const channel = state.currentChannel;
  const all = channel ? mergeModActions(state.twitchModLog[channel.id], state.modActions[channel.id]) : [];
  const query = dom.logSearchInput.value.toLowerCase().trim();
  const rows = all
    .map(entry => ({ entry, ...describeModAction(entry) }))
    .filter(row => !query || `${row.target || ''} ${row.text}`.toLowerCase().includes(query));

  dom.modActionsCount.textContent = `${all.length} action${all.length > 1 ? 's' : ''}`;
  dom.modActionsList.replaceChildren();

  [state.modLogNotice, state.modActionsNotice].filter(Boolean).forEach(notice => {
    dom.modActionsList.append(Object.assign(document.createElement('p'), {
      className: 'card-hint', textContent: notice
    }));
  });
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


function formatDuration(sec) {
  if (sec === 1) return '1 seconde';
  if (sec === 60) return '1 minute';
  if (sec === 600) return '10 minutes';
  if (sec === 3600) return '1 heure';
  if (sec === 86400) return '24 heures';
  return `${sec}s`;
}

/** Message sous une action : type 'success' (vert), 'error' (rouge) ou absent (neutre). */
function setFeedback(el, text, type = '') {
  el.textContent = text;
  el.className = type ? `action-feedback ${type}` : 'action-feedback';
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
