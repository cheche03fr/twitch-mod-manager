// Onglets de chaînes de la fenêtre principale
// Script de page classique : partage state, dom et les fonctions de renderer.js.


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
