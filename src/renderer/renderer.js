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
        layoutGrid(widget.id); // le style en ligne fixe la largeur : le ResizeObserver ne verrait rien
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
    // Déplacement à la souris (pas de glisser-déposer natif : il bloque la molette)
    // ==========================================
    // Le panneau se prend par son en-tête (hors boutons) et suit la souris, molette comprise
    const header = widget.querySelector('.widget-header');
    header.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || isNarrowGrid() || e.target.closest('button, input, a, select')) return;
      const rect = widget.getBoundingClientRect();
      const grid = dom.modCustomGrid.getBoundingClientRect();
      header.setPointerCapture(e.pointerId); // les iframes (stream, chat) n'avalent plus la souris
      state.panelDrag = {
        widget, started: false,
        startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY,
        grab: { x: e.clientX - rect.left, y: e.clientY - rect.top },
        natural: { x: rect.left - grid.left, y: rect.top - grid.top }
      };
    });
  });

  // Emplacement visé : contour violet s'il est libre, rouge sinon
  const dropGhost = Object.assign(document.createElement('div'), { className: 'grid-drop-ghost' });
  const DRAG_THRESHOLD_PX = 5;

  const updateDrag = () => {
    const drag = state.panelDrag;
    const grid = dom.modCustomGrid.getBoundingClientRect();
    const left = drag.x - drag.grab.x - grid.left;
    const top = drag.y - drag.grab.y - grid.top;
    drag.widget.style.transform = `translate(${left - drag.natural.x}px, ${top - drag.natural.y}px)`;

    const target = dropRectAt(drag.widget, left, top);
    const free = isFreeSpot(target, currentGridRects().filter(r => r.id !== target.id));
    state.dropTarget = free ? target : null;
    dropGhost.classList.toggle('blocked', !free);
    dropGhost.style.gridColumn = `${target.col} / span ${target.w}`;
    dropGhost.style.gridRow = `${target.row} / span ${target.h}`;
    if (!dropGhost.isConnected) dom.modCustomGrid.append(dropGhost);
  };

  const endDrag = (drop) => {
    const drag = state.panelDrag;
    state.panelDrag = null;
    if (!drag?.started) return;
    const target = state.dropTarget;
    state.dropTarget = null;
    drag.widget.style.transform = '';
    drag.widget.classList.remove('is-dragging');
    dom.modCustomGrid.classList.remove('is-reordering');
    document.body.classList.remove('is-panel-dragging');
    dropGhost.remove();
    if (drop && target) {
      state.gridPos = { ...state.gridPos, [target.id]: { col: target.col, row: target.row } };
      layoutGrid(target.id);
    }
  };

  document.addEventListener('pointermove', (e) => {
    const drag = state.panelDrag;
    if (!drag) return;
    drag.x = e.clientX;
    drag.y = e.clientY;
    if (!drag.started) {
      if (Math.hypot(drag.x - drag.startX, drag.y - drag.startY) < DRAG_THRESHOLD_PX) return;
      drag.started = true;
      drag.widget.classList.add('is-dragging');
      dom.modCustomGrid.classList.add('is-reordering');
      document.body.classList.add('is-panel-dragging');
    }
    updateDrag();
  });
  document.addEventListener('pointerup', () => endDrag(true));
  document.addEventListener('pointercancel', () => endDrag(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.panelDrag?.started) endDrag(false);
  });

  // Molette pendant un déplacement : la page défile et le panneau suit la souris
  document.addEventListener('wheel', (e) => {
    if (!state.panelDrag?.started) return;
    e.preventDefault(); // sinon la molette ferait défiler le contenu du panneau tenu
    scrollParentOf(dom.modCustomGrid).scrollBy({ top: e.deltaY });
  }, { passive: false });
  document.addEventListener('scroll', () => {
    if (state.panelDrag?.started) updateDrag();
  }, true);

  // Hauteur, largeur ou affichage d'un panneau changé : on recalcule les places
  const observer = new ResizeObserver((entries) => layoutGrid(entries[0]?.target.id));
  widgets.forEach(w => observer.observe(w));
  window.addEventListener('resize', () => layoutGrid());

  // Restaurer l'agencement enregistré
  restoreGridLayout();
}

// Premier ancêtre qui défile verticalement (sinon la page)
function scrollParentOf(el) {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (/(auto|scroll)/.test(overflowY) && node.scrollHeight > node.clientHeight) return node;
  }
  return document.scrollingElement;
}

function isNarrowGrid() {
  return window.matchMedia('(max-width: 1100px)').matches;
}

function widgetColSpan(widget) {
  const cls = [...widget.classList].find(c => c.startsWith('col-span-'));
  return cls ? Number(cls.slice('col-span-'.length)) : 6;
}

// Panneaux affichés, avec leur place enregistrée (col/row absents si jamais placés)
function currentGridRects() {
  return [...dom.modCustomGrid.querySelectorAll('.grid-widget')]
    .filter(w => w.offsetHeight > 0)
    .map(w => ({
      id: w.id,
      w: widgetColSpan(w),
      h: rowSpanFor(w.offsetHeight),
      ...state.gridPos?.[w.id]
    }));
}

// Case de la grille sous le coin haut-gauche du panneau tenu (left/top en px depuis le coin de la grille)
function dropRectAt(widget, left, top) {
  const colWidth = (dom.modCustomGrid.clientWidth - (GRID_COLS - 1) * GRID_GAP_PX) / GRID_COLS;
  const w = widgetColSpan(widget);
  return {
    id: widget.id,
    w,
    h: rowSpanFor(widget.offsetHeight),
    col: clampCol(Math.round(left / (colWidth + GRID_GAP_PX)) + 1, w),
    row: Math.max(1, Math.round(top / GRID_ROW_PX) + 1)
  };
}

/**
 * Place chaque panneau affiché à sa case ; fixedId garde sa place et repousse les autres vers le bas
 */
function layoutGrid(fixedId) {
  if (isNarrowGrid()) return;
  const rects = currentGridRects();
  if (rects.length === 0) return;
  const placed = resolveCollisions(rects.filter(r => r.col && r.row), fixedId);
  rects.filter(r => !(r.col && r.row)).forEach(r => placed.push(findFreeSpot(r, placed)));

  const gridPos = { ...state.gridPos };
  placed.forEach(r => {
    const widget = document.getElementById(r.id);
    widget.style.gridColumn = `${r.col} / span ${r.w}`;
    widget.style.gridRow = `${r.row} / span ${r.h}`;
    gridPos[r.id] = { col: r.col, row: r.row };
  });
  state.gridPos = gridPos;
  saveGridLayout();
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
      height: widget.style.height || '',
      ...state.gridPos?.[widget.id]
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

      // Place libre enregistrée (absente des anciennes versions : placement automatique)
      if (Number.isInteger(item.col) && Number.isInteger(item.row) && item.col >= 1 && item.row >= 1) {
        state.gridPos = { ...state.gridPos, [item.id]: { col: item.col, row: item.row } };
      }

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

// ========================================================
// ONGLETS DE CHAÎNES (fenêtre principale)
// ========================================================
// Chaque onglet est une page de l'app posée par Electron dans la zone #tab-host ;
// la page principale ne garde que la liste des onglets et celui qui est affiché.
const channelTabs = { ids: [], activeId: null };

function setupChannelTabs() {
  if (isTabView) {
    window.electronAPI.onTabRefocused(() => {
      if (state.currentChannel) loadTwitchModLog(state.currentChannel);
    });
    return;
  }
  const host = document.getElementById('tab-host');
  const sendBounds = () => {
    if (!channelTabs.activeId) return;
    const r = host.getBoundingClientRect();
    window.electronAPI.setTabBounds({ x: r.left, y: r.top, width: r.width, height: r.height });
  };
  new ResizeObserver(sendBounds).observe(host);
  window.addEventListener('resize', sendBounds);
  channelTabs.sendBounds = sendBounds;
}

function openChannelTab(channel) {
  const id = String(channel.id);
  if (!channelTabs.ids.includes(id)) channelTabs.ids = [...channelTabs.ids, id];
  window.electronAPI.openTab(id);
  selectChannelTab(id);
}

function selectChannelTab(id) {
  if (isTabView) return;
  channelTabs.activeId = id;
  window.electronAPI.selectTab(id);
  dom.dashboardScreen.classList.toggle('hidden', id !== null);
  document.getElementById('tab-host').classList.toggle('hidden', id === null);
  if (id !== null) window.scrollTo(0, 0);
  renderChannelTabs();
  channelTabs.sendBounds?.();
}

function closeChannelTab(id) {
  const index = channelTabs.ids.indexOf(id);
  channelTabs.ids = channelTabs.ids.filter(tabId => tabId !== id);
  window.electronAPI.closeTab(id);
  if (channelTabs.activeId === id) {
    selectChannelTab(channelTabs.ids[Math.min(index, channelTabs.ids.length - 1)] ?? null);
  } else {
    renderChannelTabs();
  }
}

function closeAllChannelTabs() {
  [...channelTabs.ids].forEach(closeChannelTab);
}

function renderChannelTabs() {
  const bar = document.getElementById('channel-tabs');
  bar.classList.toggle('hidden', channelTabs.ids.length === 0);
  bar.replaceChildren();

  const makeTab = (label, id, channel) => {
    const tab = document.createElement('div');
    tab.className = `channel-tab${channelTabs.activeId === id ? ' active' : ''}`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', String(channelTabs.activeId === id));
    tab.tabIndex = 0;
    if (channel?.profileImageUrl) {
      const img = document.createElement('img');
      img.src = channel.profileImageUrl;
      img.alt = '';
      tab.appendChild(img);
    }
    const name = document.createElement('span');
    name.className = 'channel-tab-name';
    name.textContent = label;
    tab.appendChild(name);
    if (channel?.isLive) {
      const dot = document.createElement('span');
      dot.className = 'channel-tab-live';
      dot.title = 'En direct';
      tab.appendChild(dot);
    }
    const select = () => selectChannelTab(id);
    tab.addEventListener('click', select);
    tab.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); } });
    if (id !== null) {
      tab.addEventListener('auxclick', e => { if (e.button === 1) closeChannelTab(id); }); // clic molette
      const close = document.createElement('button');
      close.className = 'channel-tab-close';
      close.title = `Fermer l'onglet ${label}`;
      close.setAttribute('aria-label', close.title);
      close.textContent = '×';
      close.addEventListener('click', e => { e.stopPropagation(); closeChannelTab(id); });
      tab.appendChild(close);
    }
    return tab;
  };

  bar.appendChild(makeTab('📋 Chaînes', null, null));
  channelTabs.ids.forEach(id => {
    const channel = state.channels.find(c => String(c.id) === id);
    bar.appendChild(makeTab(channel?.name || id, id, channel));
  });
}

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
  dom.banFeedback.innerText = '';
  dom.banFeedback.className = 'action-feedback';

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
    dom.banFeedback.innerText = 'Veuillez saisir un pseudo.';
    dom.banFeedback.className = 'action-feedback error';
    dom.banUserInput.focus();
    return;
  }

  dom.btnApplySanction.disabled = true;
  dom.banFeedback.innerText = 'Débannissement...';
  dom.banFeedback.className = 'action-feedback';
  try {
    const res = await window.electronAPI.unbanUser(state.currentChannel.id, targetUser);
    if (res.success) {
      dom.banFeedback.innerText = `✅ @${targetUser} débanni.`;
      dom.banFeedback.className = 'action-feedback success';
      dom.banUserInput.value = '';
    } else {
      dom.banFeedback.innerText = `❌ ${res.error || 'Erreur débannissement'}`;
      dom.banFeedback.className = 'action-feedback error';
    }
  } catch (err) {
    dom.banFeedback.innerText = `Erreur : ${err.message}`;
    dom.banFeedback.className = 'action-feedback error';
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
    updateRightPill(dom.rightPillEditor, state.isEditor, '✏️ Éditeur');

    if (state.isEditor) {
      dom.editorRoleBadge.className = 'editor-badge active';
      dom.editorRoleBadge.innerText = 'Éditeur ✅';
      dom.btnSaveChannelInfo.disabled = false;
      dom.commercialButtons.forEach(b => b.disabled = false);
      refreshAdCooldown(channel);
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
    updateRightPill(dom.rightPillEditor, false, '✏️ Éditeur');
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
      ${boxArt ? `<img src="${escapeHtml(boxArt)}" alt="${escapeHtml(game.name)}">` : ''}
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
      game_name: state.selectedGameName,
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
    const channel = state.currentChannel;
    const res = await window.electronAPI.startCommercial(channel.id, length);
    if (res.success) {
      dom.commercialFeedback.innerText = `✅ Pub de ${length}s lancée !`;
      dom.commercialFeedback.className = 'action-feedback success';
    } else {
      dom.commercialFeedback.innerText = `❌ ${res.error || 'Erreur pub'}`;
      dom.commercialFeedback.className = 'action-feedback error';
    }
    setTimeout(() => refreshAdCooldown(channel), 2000); // Twitch met un instant à enregistrer la pub

  } catch (err) {
    dom.commercialFeedback.innerText = `Erreur : ${err.message}`;
    dom.commercialFeedback.className = 'action-feedback error';
  }
}

// Délai entre deux pubs : boutons grisés et compte à rebours tant que Twitch bloque les pubs
let adCooldownTimer = null;

async function refreshAdCooldown(channel) {
  if (!channel) return;
  try {
    const res = await window.electronAPI.getAdCooldown(channel.login);
    if (state.currentChannel?.id !== channel.id) return; // une autre chaîne a été ouverte entre-temps
    applyAdCooldown(res.success ? res.cooldownEndsAt : null);
  } catch (err) {
    console.error('Délai des pubs indisponible :', err);
  }
}

function applyAdCooldown(endsAtIso) {
  clearInterval(adCooldownTimer);
  adCooldownTimer = null;
  const strip = document.querySelector('.commercial-strip');
  const label = strip.querySelector('.commercial-label');
  const endsAt = Date.parse(endsAtIso);

  const tick = () => {
    const remaining = Math.ceil((endsAt - Date.now()) / 1000);
    if (!(remaining > 0)) {
      clearInterval(adCooldownTimer);
      adCooldownTimer = null;
      strip.classList.remove('is-cooldown');
      label.textContent = 'Lancer une pub :';
      dom.commercialButtons.forEach(b => { b.disabled = !state.isEditor; b.title = ''; });
      return;
    }
    const text = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;
    strip.classList.add('is-cooldown');
    label.textContent = `⏳ Pub possible dans ${text}`;
    dom.commercialButtons.forEach(b => { b.disabled = true; b.title = `Twitch impose un délai entre deux pubs (encore ${text})`; });
  };
  tick();
  if (strip.classList.contains('is-cooldown')) adCooldownTimer = setInterval(tick, 1000);
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
    showRefreshValue(state.settings.refreshSeconds);
  };
  // Valeur affichée et partie violette du curseur
  const showRefreshValue = (seconds) => {
    const { min, max } = dom.settingRefresh;
    dom.settingRefresh.style.setProperty('--pct', `${((seconds - min) / (max - min)) * 100}%`);
    dom.settingRefreshValue.textContent = `${seconds} s`;
  };
  const applyRefresh = (changes) => {
    updateSettings(changes);
    showRefreshControls();
    if (state.currentUser) startAutoRefresh();
  };

  dom.btnSettings.addEventListener('click', () => {
    showRefreshControls();
    dom.settingsDialog.querySelector(`input[name="setting-theme"][value="${state.settings.theme}"]`).checked = true;
    selectChannelTab(null); // un onglet de chaîne s'affiche par-dessus la page : on revient à la liste
    dom.settingsDialog.showModal();
  });

  dom.settingRefreshEnabled.addEventListener('change', (e) => applyRefresh({ autoRefresh: e.target.checked }));
  // Pendant le glissement : affichage seulement ; au relâchement : enregistrement
  dom.settingRefresh.addEventListener('input', (e) => showRefreshValue(Number(e.target.value)));
  dom.settingRefresh.addEventListener('change', (e) => applyRefresh({ refreshSeconds: Number(e.target.value) }));

  dom.settingsDialog.querySelectorAll('input[name="setting-theme"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      updateSettings({ theme: e.target.value });
      applyTheme(state.settings.theme);
    });
  });

  const betaCheckbox = document.getElementById('setting-beta-updates');
  betaCheckbox.checked = state.settings.betaUpdates;
  const checkUpdates = (manual = false) =>
    window.electronAPI.checkForUpdates(state.settings.betaUpdates, manual, state.settings.autoUpdates);
  betaCheckbox.addEventListener('change', (e) => {
    updateSettings({ betaUpdates: e.target.checked });
    checkUpdates();
  });

  const autoLoginCheckbox = document.getElementById('setting-auto-login');
  autoLoginCheckbox.checked = state.settings.autoLogin;
  autoLoginCheckbox.addEventListener('change', (e) => updateSettings({ autoLogin: e.target.checked }));

  const autoUpdatesCheckbox = document.getElementById('setting-auto-updates');
  autoUpdatesCheckbox.checked = state.settings.autoUpdates;
  autoUpdatesCheckbox.addEventListener('change', (e) => {
    updateSettings({ autoUpdates: e.target.checked });
    if (!state.settings.autoUpdates) document.getElementById('btn-install-update').classList.add('hidden');
    checkUpdates();
  });

  // Mode automatique : icône de mise à jour dans l'en-tête dès que la mise à jour est téléchargée
  const btnInstallUpdate = document.getElementById('btn-install-update');
  const setUpdateLabel = (label) => {
    btnInstallUpdate.title = label;
    btnInstallUpdate.setAttribute('aria-label', label);
  };
  window.electronAPI.onUpdateReady(({ version }) => {
    setUpdateLabel(`Installer la mise à jour v${version} : l'application redémarre`);
    btnInstallUpdate.classList.remove('hidden');
  });
  btnInstallUpdate.addEventListener('click', async () => {
    btnInstallUpdate.disabled = true;
    btnInstallUpdate.classList.add('is-installing');
    setUpdateLabel('Installation de la mise à jour…');
    const res = await window.electronAPI.installUpdate();
    if (!res.success) {
      btnInstallUpdate.disabled = false;
      btnInstallUpdate.classList.remove('is-installing');
      setUpdateLabel('Installer la mise à jour téléchargée : l\'application redémarre');
    }
  });

  // Recherche de mise à jour au démarrage, sur la voie choisie (bêta ou normale) ; une seule fois, par la fenêtre principale
  if (!isTabView) checkUpdates();

  const btnCheckUpdates = document.getElementById('btn-check-updates');
  const updateStatus = document.getElementById('update-check-status');
  btnCheckUpdates.addEventListener('click', async () => {
    btnCheckUpdates.disabled = true;
    btnCheckUpdates.classList.add('is-checking'); // le logo tourne pendant la recherche
    updateStatus.textContent = 'Recherche en cours…';
    try {
      const res = await checkUpdates(true);
      if (!res.success) {
        updateStatus.textContent = `Recherche impossible : ${res.error}`;
      } else if (res.updateAvailable) {
        updateStatus.textContent = state.settings.autoUpdates
          ? `Version ${res.version} trouvée : téléchargement en cours, puis icône de mise à jour à côté de ⚙️.`
          : `Version ${res.version} trouvée : téléchargement en cours, l'installation vous sera proposée.`;
      } else {
        updateStatus.textContent = `✅ Vous avez la dernière version (${res.version}).`;
      }
    } catch (err) {
      updateStatus.textContent = `Recherche impossible : ${err.message}`;
    } finally {
      btnCheckUpdates.disabled = false;
      btnCheckUpdates.classList.remove('is-checking');
    }
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
  clearInterval(_predictionsState.countdown);

  // Sur la chaîne d'un autre, le processus principal passe par la session de la Vue Twitch officielle
  showRight('predictions', true);
  statusEl.textContent = 'Chargement des prédictions…';

  try {
    const res = await window.electronAPI.getPredictions(broadcasterId);
    if (!res.success) throw new Error(res.error || 'Erreur API');
    const predictions = res.data || [];

    const active = predictions.filter(p => p.status === 'ACTIVE' || p.status === 'LOCKED');
    const history = predictions.filter(p => p.status !== 'ACTIVE' && p.status !== 'LOCKED');

    statusEl.style.display = active.length ? 'none' : 'block';
    statusEl.textContent = active.length ? '' : '🔮 Aucune prédiction en cours. Lance-en une avec « ＋ Nouvelle ».';

    if (active.length && activeEl) {
      activeEl.style.display = 'block';
      _predictionsState.current = active[0];
      renderActivePrediction(active[0]);
    }

    if (historyList) {
      historyList.replaceChildren(...history.slice(0, 10).map(renderPredictionHistoryItem));
      if (history.length === 0) {
        historyList.replaceChildren(Object.assign(document.createElement('li'), { className: 'pred-empty', textContent: 'Aucune prédiction passée.' }));
      }
    }
  } catch (err) {
    statusEl.style.display = 'block';
    statusEl.textContent = /Missing scope/i.test(err.message)
      ? 'Permission manquante : déconnecte-toi puis reconnecte-toi pour autoriser les prédictions.'
      : '⚠️ ' + err.message;
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
  // Compte à rebours en direct : à la fin du vote, Twitch verrouille tout seul, le panneau se recharge
  clearInterval(_predictionsState.countdown);
  const tick = () => {
    const remaining = Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
    const clock = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;
    metaEl.innerHTML = renderStatusLabel(p.status) + '<span class="pred-countdown">' +
      (p.status === 'ACTIVE' && remaining > 0 ? '⏱ ' + clock + ' restantes' : 'Votes terminés : choisis le gagnant') + '</span>';
    if (p.status === 'ACTIVE' && remaining <= 0) {
      clearInterval(_predictionsState.countdown);
      const broadcasterId = _predictionsState.broadcasterId;
      setTimeout(() => { if (_predictionsState.broadcasterId === broadcasterId) loadPredictions(broadcasterId); }, 2000);
    }
  };
  tick();
  if (p.status === 'ACTIVE') _predictionsState.countdown = setInterval(tick, 1000);

  const totalPoints = p.outcomes.reduce((sum, o) => sum + (o.channel_points || 0), 0);
  outcomesEl.replaceChildren(...p.outcomes.map((o, i) => {
    const pct = totalPoints ? Math.round((o.channel_points || 0) / totalPoints * 100) : 0;
    const row = document.createElement('div');
    row.className = `pred-outcome pred-color-${predictionColor(o, i, p.outcomes.length)}`;
    row.innerHTML =
      '<div class="pred-outcome-head">' +
      '<span class="pred-outcome-title"></span>' +
      '<span class="pred-outcome-stats">' + (o.channel_points || 0).toLocaleString('fr-FR') + ' pts · ' +
      (o.users || 0) + ' votant' + ((o.users || 0) > 1 ? 's' : '') + ' · <strong>' + pct + ' %</strong></span>' +
      '</div>' +
      '<div class="pred-bar"><div class="pred-bar-fill" style="width:' + pct + '%"></div></div>';
    row.querySelector('.pred-outcome-title').textContent = o.title;
    return row;
  }));

  const button = (className, text, onClick) => {
    const btn = Object.assign(document.createElement('button'), { className, textContent: text });
    btn.addEventListener('click', onClick);
    return btn;
  };
  const cancelBtn = () => button('btn-secondary pred-btn-danger', '✖ Annuler (rembourse)', () => predictionAction(p.id, 'CANCELED', null));

  actionsRow.replaceChildren();
  if (p.status === 'ACTIVE') {
    actionsRow.append(button('btn-secondary', '🔒 Verrouiller', () => predictionAction(p.id, 'LOCKED', null)), cancelBtn());
  }
  if (p.status === 'LOCKED') {
    p.outcomes.forEach((o, i) => {
      actionsRow.appendChild(button(`btn-secondary pred-btn-winner pred-color-${predictionColor(o, i, p.outcomes.length)}`,
        '🏆 ' + o.title, () => predictionAction(p.id, 'RESOLVED', o.id)));
    });
    actionsRow.appendChild(cancelBtn());
  }
}

// Couleur Twitch d'un choix : bleu / rose pour deux choix, bleu au-delà
function predictionColor(outcome, index, count) {
  if (outcome.color) return outcome.color.toLowerCase() === 'pink' ? 'pink' : 'blue';
  return count === 2 && index === 1 ? 'pink' : 'blue';
}

function renderPredictionHistoryItem(p) {
  const winner = p.winning_outcome_id ? p.outcomes.find(o => o.id === p.winning_outcome_id) : null;
  const li = document.createElement('li');
  li.className = 'mod-action-item pred-history-item';
  li.innerHTML =
    '<span class="mod-action-icon">' + (p.status === 'CANCELED' ? '✖️' : '🏆') + '</span>' +
    '<div class="pred-history-text">' +
    '<div class="pred-history-title"></div>' +
    '<div class="pred-history-meta">' + renderStatusLabel(p.status) +
    ' <span class="pred-history-winner"></span> · ' + new Date(p.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) +
    '</div></div>';
  li.querySelector('.pred-history-title').textContent = p.title;
  if (winner) {
    const w = li.querySelector('.pred-history-winner');
    w.textContent = '→ ' + winner.title;
    w.classList.add(`pred-color-${predictionColor(winner, p.outcomes.indexOf(winner), p.outcomes.length)}`);
  }
  return li;
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
    loadPredictions(broadcasterId); // l'état a pu changer côté Twitch (verrouillage automatique…)
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

  if (!title) { if(fb){fb.textContent='Saisis une question.';fb.className='action-feedback error';} return; }
  if (outcomes.length < 2) { if(fb){fb.textContent='Il faut au moins 2 choix.';fb.className='action-feedback error';} return; }

  if (fb) { fb.textContent = 'Création en cours…'; fb.className = 'action-feedback'; }
  try {
    const res = await window.electronAPI.createPrediction(broadcasterId, { title, outcomes, prediction_window: duration });
    if (!res.success) throw new Error(res.error || 'Échec de la création');
    if (fb) { fb.textContent = '✅ Prédiction lancée !'; fb.className = 'action-feedback success'; }
    const modal = document.getElementById('prediction-modal');
    if (modal) modal.style.display = 'none';
    setTimeout(() => loadPredictions(broadcasterId), 1200);
  } catch (err) {
    if (fb) { fb.textContent = 'Erreur : ' + err.message; fb.className = 'action-feedback error'; }
  }
}

function renderStatusLabel(status) {
  const labels = { ACTIVE: '● Votes ouverts', LOCKED: '🔒 Verrouillée', RESOLVED: 'Résolue', CANCELED: 'Annulée' };
  const key = labels[status] ? status.toLowerCase() : 'other';
  return '<span class="pred-status pred-status-' + key + '">' + (labels[status] || escapeHtml(String(status))) + '</span>';
}

function setupPredictionsWidget() {
  const btnNew = document.getElementById('btn-new-prediction');
  const btnRefresh = document.getElementById('btn-refresh-predictions');
  const btnCreate = document.getElementById('btn-create-prediction');
  const btnCancelModal = document.getElementById('btn-cancel-prediction');
  const modal = document.getElementById('prediction-modal');

  if (btnNew) {
    btnNew.onclick = () => {
      if (modal) modal.style.display = modal.style.display === 'none' ? 'flex' : 'none';
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