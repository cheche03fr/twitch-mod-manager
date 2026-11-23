// Panneau Points de chaîne : file des demandes de récompenses (valider / refuser) et historique en direct
// Script de page classique : partage state, dom et les fonctions de renderer.js.
// shortcut: le direct est une relecture de la file toutes les 15 s ; les récompenses qui ne passent pas par la file
// (validées automatiquement) n'y apparaissent pas. Passer à EventSub/PubSub si Twitch l'ouvre aux modérateurs.

const CP_POLL_MS = 15000;
const CP_HISTORY_MAX = 50;
const cp = { channelId: null, queue: [], seen: new Set(), history: [], timer: null, busy: false };
const cpEl = (id) => document.getElementById(id);

function setupChannelPointsPanel() {
  if (!cpEl('widget-channel-points')) return;
  cpEl('btn-cp-refresh').addEventListener('click', () => refreshRedemptions());
}

/** À l'ouverture d'une chaîne : file des demandes, puis relecture régulière pour le direct. */
function loadChannelPointsPanel(channelId) {
  if (!cpEl('widget-channel-points')) return;
  stopChannelPointsPanel();
  cp.channelId = String(channelId);
  cp.queue = [];
  cp.seen = new Set();
  cp.history = [];
  renderRedemptionHistory();
  setFeedback(cpEl('cp-feedback'), '');
  cpEl('cp-queue').replaceChildren(cpEmpty('Chargement des demandes…'));
  refreshRedemptions(true);
  cp.timer = setInterval(() => refreshRedemptions(), CP_POLL_MS);
}

function stopChannelPointsPanel() {
  clearInterval(cp.timer);
  cp.timer = null;
  cp.channelId = null;
}

const cpEmpty = (text) => Object.assign(document.createElement('li'), { className: 'pred-empty', textContent: text });

async function refreshRedemptions(initial = false) {
  const channelId = cp.channelId;
  if (!channelId || cp.busy) return;
  try {
    const res = await window.electronAPI.getRedemptions(channelId);
    if (cp.channelId !== channelId) return; // chaîne changée entre-temps
    if (!res.success) throw new Error(res.error || 'Erreur Twitch');
    // Nouvelles demandes depuis la dernière lecture -> historique (pas celles déjà en file à l'ouverture)
    res.redemptions.filter(r => !cp.seen.has(r.id)).forEach(r => {
      cp.seen.add(r.id);
      if (!initial) addRedemptionHistory('🎁', `${r.userName} a échangé « ${r.rewardTitle} »`, r.input, r.redeemedAt);
    });
    cp.queue = res.redemptions;
    renderRedemptionQueue(res.hasMore);
  } catch (err) {
    if (initial || !cp.queue.length) cpEl('cp-queue').replaceChildren(cpEmpty('⚠️ ' + err.message));
  }
}

function renderRedemptionQueue(hasMore) {
  const items = cp.queue.map(r => {
    const li = document.createElement('li');
    li.className = 'cp-item';
    const text = document.createElement('div');
    text.className = 'cp-item-text';
    text.append(
      Object.assign(document.createElement('div'), { className: 'cp-item-reward', textContent: r.rewardTitle }),
      Object.assign(document.createElement('div'), { className: 'cp-item-meta', textContent: `${r.userName} · ${formatRelativeTime(r.redeemedAt)}` })
    );
    if (r.input) text.appendChild(Object.assign(document.createElement('div'), { className: 'cp-item-input', textContent: r.input }));
    const actions = document.createElement('div');
    actions.className = 'cp-item-actions';
    const button = (className, label, title, status) => {
      const btn = Object.assign(document.createElement('button'), { type: 'button', className, textContent: label, title });
      btn.setAttribute('aria-label', `${title} : ${r.rewardTitle} de ${r.userName}`);
      btn.addEventListener('click', () => updateRedemption(r, status));
      return btn;
    };
    actions.append(
      button('cp-btn cp-btn-ok', '✓', 'Valider', 'FULFILLED'),
      button('cp-btn cp-btn-refuse', '↩', 'Refuser et rembourser', 'CANCELED')
    );
    li.append(text, actions);
    return li;
  });
  if (hasMore) items.push(cpEmpty('… d\'autres demandes attendent : traite celles-ci pour voir la suite.'));
  cpEl('cp-queue').replaceChildren(...(items.length ? items : [cpEmpty('Aucune demande en attente.')]));
  const count = cp.queue.length;
  cpEl('cp-count').textContent = hasMore ? `${count}+` : String(count);
  cpEl('cp-count').classList.toggle('hidden', count === 0);
}

async function updateRedemption(redemption, status) {
  const channelId = cp.channelId;
  if (!channelId || cp.busy) return;
  cp.busy = true;
  setFeedback(cpEl('cp-feedback'), status === 'FULFILLED' ? 'Validation…' : 'Remboursement…');
  try {
    const res = await window.electronAPI.updateRedemptions(channelId, [redemption.id], status);
    if (!res.success) throw new Error(res.error || 'Action refusée');
    cp.queue = cp.queue.filter(r => r.id !== redemption.id);
    renderRedemptionQueue(false);
    const verb = status === 'FULFILLED' ? 'validée' : 'refusée, points rendus';
    addRedemptionHistory(status === 'FULFILLED' ? '✅' : '↩️', `« ${redemption.rewardTitle} » de ${redemption.userName} ${verb}`, null, new Date().toISOString());
    setFeedback(cpEl('cp-feedback'), '');
  } catch (err) {
    setFeedback(cpEl('cp-feedback'), '❌ ' + err.message, 'error');
  } finally {
    cp.busy = false;
  }
}

function addRedemptionHistory(icon, text, input, at) {
  cp.history = [{ icon, text, input, at }, ...cp.history].slice(0, CP_HISTORY_MAX);
  renderRedemptionHistory();
}

function renderRedemptionHistory() {
  const items = cp.history.map(h => {
    const li = document.createElement('li');
    li.className = 'mod-action-item cp-history-item';
    const body = document.createElement('div');
    body.className = 'cp-item-text';
    body.append(
      Object.assign(document.createElement('div'), { className: 'cp-history-text', textContent: h.text }),
      Object.assign(document.createElement('div'), { className: 'cp-item-meta', textContent: new Date(h.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) })
    );
    if (h.input) body.appendChild(Object.assign(document.createElement('div'), { className: 'cp-item-input', textContent: h.input }));
    li.append(Object.assign(document.createElement('span'), { className: 'mod-action-icon', textContent: h.icon }), body);
    return li;
  });
  cpEl('cp-history').replaceChildren(...(items.length ? items : [cpEmpty('Les nouveaux échanges de points s\'afficheront ici.')]));
}
