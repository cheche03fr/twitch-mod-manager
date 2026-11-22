// Vérifie le placement libre des panneaux dans la grille
const assert = require('assert');
const { rowSpanFor, isFreeSpot, findFreeSpot, resolveCollisions } = require('../src/renderer/gridLayout');

const a = { id: 'a', col: 1, row: 1, w: 6, h: 10 };
const b = { id: 'b', col: 7, row: 1, w: 6, h: 10 };

// Hauteur en pixels -> lignes, écart compris
assert.strictEqual(rowSpanFor(86), 10);
assert.strictEqual(rowSpanFor(0), 2);

// Place libre : dans la grille et sans chevauchement
assert.ok(isFreeSpot({ id: 'c', col: 1, row: 11, w: 12, h: 5 }, [a, b]));
assert.ok(!isFreeSpot({ id: 'c', col: 4, row: 5, w: 4, h: 5 }, [a, b]));
assert.ok(!isFreeSpot({ id: 'c', col: 10, row: 20, w: 4, h: 5 }, [a, b]), 'dépasse la 12e colonne');
assert.ok(isFreeSpot({ ...a, col: 1, row: 1 }, [a, b]), 'un panneau ne se gêne pas lui-même');

// Première place libre : à droite si possible, sinon en dessous
assert.deepStrictEqual(findFreeSpot({ id: 'c', w: 4, h: 3 }, [a]), { id: 'c', w: 4, h: 3, col: 7, row: 1 });
assert.deepStrictEqual(findFreeSpot({ id: 'c', w: 4, h: 3 }, [a, b]), { id: 'c', w: 4, h: 3, col: 1, row: 11 });

// Un panneau qui grandit repousse celui du dessous, sans bouger lui-même
const grown = { ...a, h: 20 };
const below = { id: 'd', col: 1, row: 11, w: 6, h: 5 };
const resolved = resolveCollisions([below, grown, b], 'a');
assert.deepStrictEqual(resolved.find(r => r.id === 'a'), grown);
assert.strictEqual(resolved.find(r => r.id === 'd').row, 21);
assert.strictEqual(resolved.find(r => r.id === 'b').row, 1, 'le voisin de droite ne bouge pas');

// Un panneau élargi trop à droite est ramené dans la grille
assert.strictEqual(resolveCollisions([{ ...b, w: 8 }]).at(0).col, 5);

// Pas de mutation des entrées
assert.strictEqual(below.row, 11);

console.log('✅ Placement libre de la grille OK');
