// Chiffrement du fichier de session (jeton Twitch) avec safeStorage d'Electron : DPAPI sous Windows,
// lié au compte de l'utilisateur. storage est l'objet safeStorage (remplaçable dans les tests).
// API asynchrone : les versions synchrones sont obsolètes depuis Electron 45 et disparaissent en 46.

/**
 * Session -> texte du fichier, chiffré quand le système le permet.
 */
async function sealSession(data, storage) {
  const json = JSON.stringify(data);
  if (!(await storage.isAsyncEncryptionAvailable())) return json; // shortcut: reste en clair si le système ne fournit pas le chiffrement
  return JSON.stringify({ encrypted: (await storage.encryptStringAsync(json)).toString('base64') });
}

/**
 * Texte du fichier -> { data, needsReseal } ; needsReseal : fichier en clair ou clé de chiffrement à renouveler.
 */
async function openSession(text, storage) {
  const parsed = JSON.parse(text);
  if (typeof parsed?.encrypted === 'string') {
    const decrypted = await storage.decryptStringAsync(Buffer.from(parsed.encrypted, 'base64'));
    return { data: JSON.parse(decrypted.result), needsReseal: decrypted.shouldReEncrypt === true };
  }
  return { data: parsed, needsReseal: await storage.isAsyncEncryptionAvailable() };
}

module.exports = { sealSession, openSession };
