// Paramètres de l'application (actualisation auto, thème), enregistrés dans localStorage
const SETTINGS_KEY = 'twitch_mod_manager_settings';
const REFRESH_MIN = 30;
const REFRESH_MAX = 120;
const REFRESH_STEP = 15; // mêmes bornes que le curseur de index.html
const THEMES = ['dark', 'light'];
const DEFAULT_SETTINGS = Object.freeze({ autoRefresh: true, refreshSeconds: 30, theme: 'dark', betaUpdates: false, autoUpdates: false });

function isValidRefresh(seconds) {
  return Number.isInteger(seconds) && seconds >= REFRESH_MIN && seconds <= REFRESH_MAX
    && (seconds - REFRESH_MIN) % REFRESH_STEP === 0;
}

/** Valide un JSON enregistré : toute valeur inconnue revient à la valeur par défaut. */
function parseSettings(raw) {
  let saved = {};
  try {
    saved = JSON.parse(raw) || {};
  } catch {
    saved = {};
  }
  const legacyDisabled = saved.refreshSeconds === 0; // v1.0.8 : 0 voulait dire « désactivée »
  return {
    autoRefresh: typeof saved.autoRefresh === 'boolean' ? saved.autoRefresh : !legacyDisabled,
    refreshSeconds: isValidRefresh(saved.refreshSeconds) ? saved.refreshSeconds : DEFAULT_SETTINGS.refreshSeconds,
    theme: THEMES.includes(saved.theme) ? saved.theme : DEFAULT_SETTINGS.theme,
    betaUpdates: saved.betaUpdates === true,
    autoUpdates: saved.autoUpdates === true
  };
}

function loadSettings() {
  return parseSettings(localStorage.getItem(SETTINGS_KEY));
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

if (typeof module !== 'undefined') {
  module.exports = { parseSettings, DEFAULT_SETTINGS };
} else {
  applyTheme(loadSettings().theme); // avant renderer.js : pas de flash de l'autre thème
}
