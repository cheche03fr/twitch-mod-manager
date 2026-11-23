// Panneau Prédictions
// Script de page classique : partage state, dom et les fonctions de renderer.js.


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

  if (!title) { if (fb) setFeedback(fb, 'Saisis une question.', 'error'); return; }
  if (outcomes.length < 2) { if (fb) setFeedback(fb, 'Il faut au moins 2 choix.', 'error'); return; }

  if (fb) setFeedback(fb, 'Création en cours…');
  try {
    const res = await window.electronAPI.createPrediction(broadcasterId, { title, outcomes, prediction_window: duration });
    if (!res.success) throw new Error(res.error || 'Échec de la création');
    if (fb) setFeedback(fb, '✅ Prédiction lancée !', 'success');
    const modal = document.getElementById('prediction-modal');
    if (modal) modal.style.display = 'none';
    setTimeout(() => loadPredictions(broadcasterId), 1200);
  } catch (err) {
    if (fb) setFeedback(fb, 'Erreur : ' + err.message, 'error');
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
