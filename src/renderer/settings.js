// Paramètres de l'application (actualisation auto, thème), enregistrés dans localStorage
const SETTINGS_KEY = 'twitch_mod_manager_settings';
const REFRESH_CHOICES = [0, 30, 120]; // secondes, 0 = désactivée
const THEMES = ['dark', 'light'];
const DEFAULT_SETTINGS = Object.freeze({ refreshSeconds: 30, theme: 'dark' });

/** Valide un JSON enregistré : toute valeur inconnue revient à la valeur par défaut. */
function parseSettings(raw) {
  let saved = {};
  try {
    saved = JSON.parse(raw) || {};
  } catch {
    saved = {};
  }
  return {
    refreshSeconds: REFRESH_CHOICES.includes(saved.refreshSeconds) ? saved.refreshSeconds : DEFAULT_SETTINGS.refreshSeconds,
    theme: THEMES.includes(saved.theme) ? saved.theme : DEFAULT_SETTINGS.theme
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
