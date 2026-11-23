// Panneau Chuchotements : conversations (historique par l'API interne de Twitch), envoi et réception en direct
// Script de page classique : partage state, dom et les fonctions de renderer.js.

const whispers = { started: false, threads: [], open: null }; // open : { threadId, other, messages }
const wEl = (id) => document.getElementById(id);

// Identifiant de conversation de Twitch : les deux comptes, du plus petit au plus grand
const whisperThreadKey = (a, b) => [String(a), String(b)].sort((x, y) => Number(x) - Number(y)).join('_');

function setupWhispersPanel() {
  if (!wEl('widget-whispers')) return;
  wEl('btn-whispers-refresh').addEventListener('click', () => (whispers.open ? openWhisperThread(whispers.open.other) : loadWhisperThreads()));
  wEl('btn-whispers-back').addEventListener('click', showWhisperList);
  wEl('whispers-new').addEventListener('submit', (e) => {
    e.preventDefault();
    openWhisperWith(wEl('whispers-new-target').value.trim().replace(/^@/, ''));
  });
  wEl('whispers-send').addEventListener('submit', (e) => {
    e.preventDefault();
    sendWhisperMessage();
  });
  window.electronAPI.onWhisper(onWhisperReceived);
}

/** À l'ouverture d'une chaîne : réception en direct (une fois) et liste des conversations. */
async function loadWhispersPanel() {
  if (!whispers.started) {
    whispers.started = true;
    const res = await window.electronAPI.startWhispers();
    if (res.needsReconnect) {
      showWhisperNotice('🔑 Déconnecte-toi puis reconnecte-toi pour envoyer et recevoir des chuchotements en direct.');
    }
  }
  loadWhisperThreads();
}

function showWhisperNotice(text) {
  wEl('whispers-notice').textContent = text;
  wEl('whispers-notice').classList.toggle('hidden', !text);
}

async function loadWhisperThreads() {
  const list = wEl('whispers-threads');
  if (!whispers.threads.length) list.replaceChildren(Object.assign(document.createElement('li'), { className: 'pred-empty', textContent: 'Chargement des conversations…' }));
  try {
    const res = await window.electronAPI.getWhisperThreads();
    if (!res.success) throw new Error(res.error || 'Erreur Twitch');
    whispers.threads = res.threads;
    renderWhisperThreads();
  } catch (err) {
    list.replaceChildren(Object.assign(document.createElement('li'), { className: 'pred-empty', textContent: '⚠️ ' + err.message }));
  }
}

function renderWhisperThreads() {
  const selfId = String(state.currentUser?.id || '');
  const items = whispers.threads.map(thread => {
    const li = document.createElement('li');
    li.className = 'whispers-thread';
    li.tabIndex = 0;
    li.setAttribute('role', 'button');
    const img = Object.assign(document.createElement('img'), { className: 'whispers-avatar', src: thread.other?.avatar || '', alt: '' });
    const text = document.createElement('div');
    text.className = 'whispers-thread-text';
    const name = Object.assign(document.createElement('div'), { className: 'whispers-thread-name', textContent: thread.other?.displayName || '?' });
    const last = thread.lastMessage;
    const preview = Object.assign(document.createElement('div'), {
      className: 'whispers-thread-preview',
      textContent: last ? `${last.fromId === selfId ? 'Toi : ' : ''}${last.text} · ${formatRelativeTime(last.sentAt)}` : 'Aucun message'
    });
    text.append(name, preview);
    li.append(img, text);
    if (thread.unread > 0) li.appendChild(Object.assign(document.createElement('span'), { className: 'whispers-badge', textContent: String(thread.unread) }));
    const open = () => openWhisperThread(thread.other);
    li.addEventListener('click', open);
    li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    return li;
  });
  wEl('whispers-threads').replaceChildren(...(items.length ? items
    : [Object.assign(document.createElement('li'), { className: 'pred-empty', textContent: 'Aucune conversation. Écris à quelqu\'un avec le champ ci-dessus.' })]));
  const unread = whispers.threads.reduce((sum, t) => sum + (t.unread || 0), 0);
  wEl('whispers-unread').textContent = String(unread);
  wEl('whispers-unread').classList.toggle('hidden', unread === 0);
}

function showWhisperList() {
  whispers.open = null;
  wEl('whispers-thread-view').classList.add('hidden');
  wEl('whispers-list-view').classList.remove('hidden');
  renderWhisperThreads();
}

/** Clic sur un pseudo de Communauté : il devient le destinataire proposé (comme la cible des Actions Rapides). */
function targetWhisperUser(login) {
  if (!wEl('widget-whispers')) return;
  if (whispers.open) showWhisperList();
  wEl('whispers-new-target').value = login;
}

/** Nouvelle conversation à partir d'un pseudo. */
async function openWhisperWith(login) {
  if (!login) return;
  try {
    const res = await window.electronAPI.resolveUser(login);
    if (!res.success || !res.user) throw new Error(`Utilisateur « ${login} » introuvable sur Twitch.`);
    wEl('whispers-new-target').value = '';
    openWhisperThread({ id: res.user.id, login: res.user.login, displayName: res.user.display_name, avatar: res.user.profile_image_url });
  } catch (err) {
    showWhisperNotice('⚠️ ' + err.message);
  }
}

async function openWhisperThread(other) {
  const threadId = whisperThreadKey(state.currentUser?.id, other.id);
  whispers.open = { threadId, other, messages: [] };
  wEl('whispers-list-view').classList.add('hidden');
  wEl('whispers-thread-view').classList.remove('hidden');
  wEl('whispers-thread-avatar').src = other.avatar || '';
  wEl('whispers-thread-name').textContent = other.displayName || other.login;
  setFeedback(wEl('whispers-feedback'), '');
  renderWhisperMessages('Chargement des messages…');
  const thread = whispers.threads.find(t => t.threadId === threadId);
  if (thread) thread.unread = 0;
  try {
    const res = await window.electronAPI.getWhisperThread(threadId);
    if (!res.success) throw new Error(res.error || 'Erreur Twitch');
    if (whispers.open?.threadId !== threadId) return; // une autre conversation a été ouverte entre-temps
    whispers.open.messages = res.messages;
    renderWhisperMessages();
  } catch (err) {
    renderWhisperMessages('⚠️ ' + err.message);
  }
  wEl('whispers-input').focus();
}

function renderWhisperMessages(emptyText = 'Aucun message pour l\'instant.') {
  const box = wEl('whispers-messages');
  const selfId = String(state.currentUser?.id || '');
  const messages = whispers.open?.messages || [];
  box.replaceChildren(...(messages.length ? messages.map(m => {
    const bubble = document.createElement('div');
    bubble.className = `whispers-message${m.fromId === selfId ? ' mine' : ''}`;
    bubble.append(
      Object.assign(document.createElement('div'), { className: 'whispers-message-text', textContent: m.text }),
      Object.assign(document.createElement('div'), {
        className: 'whispers-message-time',
        textContent: new Date(m.sentAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
      })
    );
    return bubble;
  }) : [Object.assign(document.createElement('div'), { className: 'pred-empty', textContent: emptyText })]));
  box.scrollTop = box.scrollHeight;
}

// Ajoute un message à une conversation de la liste (créée si besoin) et la remonte en tête
function upsertThread(threadId, other, message, unreadDelta) {
  const existing = whispers.threads.find(t => t.threadId === threadId);
  const thread = existing || { threadId, other, unread: 0 };
  thread.lastMessage = message;
  thread.unread = (thread.unread || 0) + unreadDelta;
  whispers.threads = [thread, ...whispers.threads.filter(t => t !== thread)];
}

async function sendWhisperMessage() {
  const open = whispers.open;
  const input = wEl('whispers-input');
  const text = input.value.trim();
  if (!open || !text) return;
  input.disabled = true;
  setFeedback(wEl('whispers-feedback'), 'Envoi…');
  try {
    const res = await window.electronAPI.sendWhisper(open.other.login || open.other.id, text);
    if (!res.success) throw new Error(res.error || 'Envoi impossible');
    const message = { id: `local-${Date.now()}`, fromId: String(state.currentUser.id), text, sentAt: new Date().toISOString() };
    open.messages = [...open.messages, message];
    upsertThread(open.threadId, open.other, message, 0);
    input.value = '';
    setFeedback(wEl('whispers-feedback'), '');
    renderWhisperMessages();
  } catch (err) {
    setFeedback(wEl('whispers-feedback'), '❌ ' + err.message, 'error');
  } finally {
    input.disabled = false;
    input.focus();
  }
}

/** Chuchotement reçu en direct (EventSub). */
function onWhisperReceived(w) {
  const threadId = whisperThreadKey(w.fromId, w.toId);
  const message = { id: w.id, fromId: w.fromId, text: w.text, sentAt: w.sentAt };
  const isOpen = whispers.open?.threadId === threadId;
  const known = whispers.threads.find(t => t.threadId === threadId)?.other;
  upsertThread(threadId, known || { id: w.fromId, login: w.fromLogin, displayName: w.fromName, avatar: '' }, message, isOpen ? 0 : 1);
  if (isOpen) {
    whispers.open.messages = [...whispers.open.messages, message];
    renderWhisperMessages();
  } else {
    renderWhisperThreads();
  }
}
