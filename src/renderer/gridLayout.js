// Placement libre des panneaux dans la grille de 12 colonnes.
// Un panneau = { id, col, row, w, h } : colonne et ligne de départ (1 = première),
// largeur en colonnes, hauteur en lignes de GRID_ROW_PX pixels.

const GRID_COLS = 12;
const GRID_ROW_PX = 10;
const GRID_GAP_PX = 14;

function rowSpanFor(heightPx) {
  return Math.max(1, Math.ceil((heightPx + GRID_GAP_PX) / GRID_ROW_PX));
}

function rectsOverlap(a, b) {
  return a.col < b.col + b.w && b.col < a.col + a.w &&
         a.row < b.row + b.h && b.row < a.row + a.h;
}

function isFreeSpot(rect, others) {
  return rect.col >= 1 && rect.col + rect.w - 1 <= GRID_COLS && rect.row >= 1 &&
         !others.some(o => o.id !== rect.id && rectsOverlap(rect, o));
}

function clampCol(col, w) {
  return Math.min(Math.max(1, col), GRID_COLS - w + 1);
}

// Première place libre en lisant la grille ligne par ligne, de gauche à droite
function findFreeSpot(rect, others) {
  for (let row = 1; ; row++) {
    for (let col = 1; col <= GRID_COLS - rect.w + 1; col++) {
      const candidate = { ...rect, col, row };
      if (isFreeSpot(candidate, others)) return candidate;
    }
  }
}

// Repousse vers le bas les panneaux qui se chevauchent ; fixedId garde sa place
function resolveCollisions(rects, fixedId) {
  const ordered = [...rects].sort((a, b) =>
    (b.id === fixedId) - (a.id === fixedId) || a.row - b.row || a.col - b.col);
  const placed = [];
  for (const rect of ordered) {
    let current = { ...rect, col: clampCol(rect.col, rect.w) };
    let hit = placed.find(p => rectsOverlap(current, p));
    while (hit) {
      current = { ...current, row: hit.row + hit.h };
      hit = placed.find(p => rectsOverlap(current, p));
    }
    placed.push(current);
  }
  return placed;
}

if (typeof module !== 'undefined') {
  module.exports = { GRID_COLS, GRID_ROW_PX, GRID_GAP_PX, rowSpanFor, rectsOverlap, isFreeSpot, clampCol, findFreeSpot, resolveCollisions };
}
