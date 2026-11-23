// Rôle éditeur : titre, catégorie, tags, pubs (et délai entre deux pubs)
// Script de page classique : partage state, dom et les fonctions de renderer.js.


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
      setFeedback(dom.editorSaveFeedback, 'Infos synchronisées.', 'success');
    }
  } catch (err) {
    setFeedback(dom.editorSaveFeedback, `Erreur : ${err.message}`, 'error');
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
      setFeedback(dom.editorSaveFeedback, '✅ Infos mises à jour sur Twitch !', 'success');

      dom.modStreamerGame.innerText = `🎮 ${state.selectedGameName || 'Discussion'}`;
      dom.statStreamGame.innerText = state.selectedGameName || 'Discussion';

    } else {
      setFeedback(dom.editorSaveFeedback, `❌ ${res.error || 'Erreur éditeur'}`, 'error');
    }
  } catch (err) {
    setFeedback(dom.editorSaveFeedback, `Erreur : ${err.message}`, 'error');
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
      setFeedback(dom.commercialFeedback, `✅ Pub de ${length}s lancée !`, 'success');
    } else {
      setFeedback(dom.commercialFeedback, `❌ ${res.error || 'Erreur pub'}`, 'error');
    }
    setTimeout(() => refreshAdCooldown(channel), 2000); // Twitch met un instant à enregistrer la pub

  } catch (err) {
    setFeedback(dom.commercialFeedback, `Erreur : ${err.message}`, 'error');
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
