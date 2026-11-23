// Chiffrement du fichier de session (jeton Twitch) avec safeStorage d'Electron : DPAPI sous Windows,
// lié au compte de l'utilisateur. storage est l'objet safeStorage (remplaçable dans les tests).

/**
 * Session -> texte du fichier, chiffré quand le système le permet.
 */
function sealSession(data, storage) {
  const json = JSON.stringify(data);
  if (!storage.isEncryptionAvailable()) return json; // shortcut: reste en clair si le système ne fournit pas le chiffrement
  return JSON.stringify({ encrypted: storage.encryptString(json).toString('base64') });
}

/**
 * Texte du fichier -> { data, needsReseal } ; needsReseal : ancien fichier en clair, à réécrire chiffré.
 */
function openSession(text, storage) {
  const parsed = JSON.parse(text);
  if (typeof parsed?.encrypted === 'string') {
    return { data: JSON.parse(storage.decryptString(Buffer.from(parsed.encrypted, 'base64'))), needsReseal: false };
  }
  return { data: parsed, needsReseal: storage.isEncryptionAvailable() };
}

module.exports = { sealSession, openSession };
