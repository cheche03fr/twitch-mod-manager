// Actualisation automatique et fenêtre des ⚙️ Paramètres
// Script de page classique : partage state, dom et les fonctions de renderer.js.


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
  const updateIcon = document.querySelector('#btn-install-update .update-icon').cloneNode(true); // même logo que l'en-tête
  updateIcon.setAttribute('width', '18');
  updateIcon.setAttribute('height', '18');
  btnCheckUpdates.prepend(updateIcon);
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
