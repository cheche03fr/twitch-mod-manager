const fs = require('fs');
const path = require('path');

/**
 * Convertit un fichier PNG en fichier ICO Windows standard
 * avec compression PNG (supporté nativement par Windows Vista à 11)
 */
function createIcoFromPng(pngPath, icoPath) {
  if (!fs.existsSync(pngPath)) {
    throw new Error(`Fichier source introuvable : ${pngPath}`);
  }

  const pngBuffer = fs.readFileSync(pngPath);

  // En-tête ICO (6 octets)
  // 0-1: Réservé (0)
  // 2-3: Type (1 pour ICO)
  // 4-5: Nombre d'images (1)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  // Entrée du répertoire d'icônes (16 octets)
  // 0: Largeur (0 pour 256px)
  // 1: Hauteur (0 pour 256px)
  // 2: Nombre de couleurs (0 pour >256)
  // 3: Réservé (0)
  // 4-5: Plans de couleur (1)
  // 6-7: Bits par pixel (32)
  // 8-11: Taille de l'image en octets
  // 12-15: Décalage de l'image (offset = 6 + 16 = 22)
  const dirEntry = Buffer.alloc(16);
  dirEntry.writeUInt8(0, 0); // 256 px
  dirEntry.writeUInt8(0, 1); // 256 px
  dirEntry.writeUInt8(0, 2); // couleurs
  dirEntry.writeUInt8(0, 3); // réservé
  dirEntry.writeUInt16LE(1, 4); // plans
  dirEntry.writeUInt16LE(32, 6); // bpp
  dirEntry.writeUInt32LE(pngBuffer.length, 8); // taille données
  dirEntry.writeUInt32LE(22, 12); // offset

  const icoBuffer = Buffer.concat([header, dirEntry, pngBuffer]);
  fs.writeFileSync(icoPath, icoBuffer);
  console.log(`✅ Icône ICO générée avec succès : ${icoPath}`);
}

const inputPng = path.join(__dirname, '..', 'assets', 'hammer.png');
const outputIco = path.join(__dirname, '..', 'assets', 'icon.ico');
const outputPng = path.join(__dirname, '..', 'assets', 'icon.png');

if (fs.existsSync(inputPng)) {
  fs.copyFileSync(inputPng, outputPng);
  createIcoFromPng(outputPng, outputIco);
} else {
  console.log('Fichier hammer.png non encore présent, en attente de génération.');
}
