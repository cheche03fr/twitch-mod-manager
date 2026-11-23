// Grille de l'écran de modération : menu des panneaux, déplacement à la souris, tailles, placement et sauvegarde
// Script de page classique : partage state, dom et les fonctions de renderer.js.


/**
 * Configure la personnalisation de la grille : Drag & Drop, Redimensionnement, Masquage
 */
function setupGridCustomization() {
  // Menu des panneaux
  dom.btnWidgetsMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    dom.widgetsDropdown.classList.toggle('hidden');
  });

  // Checkboxes du menu panneaux
  const checkboxes = dom.widgetsDropdown.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      const widgetId = cb.dataset.widget;
      const widgetEl = document.getElementById(widgetId);
      if (widgetEl) {
        widgetEl.style.display = cb.checked ? 'flex' : 'none';
        saveGridLayout();
      }
    });
  });

  // Bouton Réinitialiser la grille
  dom.btnResetLayout.addEventListener('click', () => {
    if (confirm('Voulez-vous réinitialiser l\'emplacement et la taille par défaut de tous les panneaux ?')) {
      localStorage.removeItem('twitch_mod_manager_grid_layout');
      location.reload();
    }
  });

  // Configuration de chaque widget dans la grille
  const widgets = dom.modCustomGrid.querySelectorAll('.grid-widget');
  widgets.forEach(widget => {
    // Boutons de taille de colonnes
    const sizeBtns = widget.querySelectorAll('.btn-widget-size');
    sizeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const newSize = btn.dataset.size;
        // Supprimer toutes les anciennes classes de col-span
        widget.classList.remove('col-span-3', 'col-span-4', 'col-span-5', 'col-span-6', 'col-span-7', 'col-span-8', 'col-span-12');
        widget.classList.add(newSize);
        layoutGrid(widget.id); // le style en ligne fixe la largeur : le ResizeObserver ne verrait rien
        saveGridLayout();
      });
    });

    // Bouton Réduire / Déplier
    const collapseBtn = widget.querySelector('.btn-widget-collapse');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', () => {
        widget.classList.toggle('collapsed');
        collapseBtn.innerText = widget.classList.contains('collapsed') ? '＋' : '−';
        saveGridLayout();
      });
    }

    // Bouton Fermer le panneau
    const closeBtn = widget.querySelector('.btn-widget-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        widget.style.display = 'none';
        const cb = dom.widgetsDropdown.querySelector(`input[data-widget="${widget.id}"]`);
        if (cb) cb.checked = false;
        saveGridLayout();
      });
    }

    // ==========================================
    // Déplacement à la souris (pas de glisser-déposer natif : il bloque la molette)
    // ==========================================
    // Le panneau se prend par son en-tête (hors boutons) et suit la souris, molette comprise
    const header = widget.querySelector('.widget-header');
    header.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || isNarrowGrid() || e.target.closest('button, input, a, select')) return;
      const rect = widget.getBoundingClientRect();
      const grid = dom.modCustomGrid.getBoundingClientRect();
      header.setPointerCapture(e.pointerId); // les iframes (stream, chat) n'avalent plus la souris
      state.panelDrag = {
        widget, started: false,
        startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY,
        grab: { x: e.clientX - rect.left, y: e.clientY - rect.top },
        natural: { x: rect.left - grid.left, y: rect.top - grid.top }
      };
    });
  });

  // Emplacement visé : contour violet s'il est libre, rouge sinon
  const dropGhost = Object.assign(document.createElement('div'), { className: 'grid-drop-ghost' });
  const DRAG_THRESHOLD_PX = 5;

  const updateDrag = () => {
    const drag = state.panelDrag;
    const grid = dom.modCustomGrid.getBoundingClientRect();
    const left = drag.x - drag.grab.x - grid.left;
    const top = drag.y - drag.grab.y - grid.top;
    drag.widget.style.transform = `translate(${left - drag.natural.x}px, ${top - drag.natural.y}px)`;

    const target = dropRectAt(drag.widget, left, top);
    const free = isFreeSpot(target, currentGridRects().filter(r => r.id !== target.id));
    state.dropTarget = free ? target : null;
    dropGhost.classList.toggle('blocked', !free);
    dropGhost.style.gridColumn = `${target.col} / span ${target.w}`;
    dropGhost.style.gridRow = `${target.row} / span ${target.h}`;
    if (!dropGhost.isConnected) dom.modCustomGrid.append(dropGhost);
  };

  const endDrag = (drop) => {
    const drag = state.panelDrag;
    state.panelDrag = null;
    if (!drag?.started) return;
    const target = state.dropTarget;
    state.dropTarget = null;
    drag.widget.style.transform = '';
    drag.widget.classList.remove('is-dragging');
    dom.modCustomGrid.classList.remove('is-reordering');
    document.body.classList.remove('is-panel-dragging');
    dropGhost.remove();
    if (drop && target) {
      state.gridPos = { ...state.gridPos, [target.id]: { col: target.col, row: target.row } };
      layoutGrid(target.id);
    }
  };

  document.addEventListener('pointermove', (e) => {
    const drag = state.panelDrag;
    if (!drag) return;
    drag.x = e.clientX;
    drag.y = e.clientY;
    if (!drag.started) {
      if (Math.hypot(drag.x - drag.startX, drag.y - drag.startY) < DRAG_THRESHOLD_PX) return;
      drag.started = true;
      drag.widget.classList.add('is-dragging');
      dom.modCustomGrid.classList.add('is-reordering');
      document.body.classList.add('is-panel-dragging');
    }
    updateDrag();
  });
  document.addEventListener('pointerup', () => endDrag(true));
  document.addEventListener('pointercancel', () => endDrag(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.panelDrag?.started) endDrag(false);
  });

  // Molette pendant un déplacement : la page défile et le panneau suit la souris
  document.addEventListener('wheel', (e) => {
    if (!state.panelDrag?.started) return;
    e.preventDefault(); // sinon la molette ferait défiler le contenu du panneau tenu
    scrollParentOf(dom.modCustomGrid).scrollBy({ top: e.deltaY });
  }, { passive: false });
  document.addEventListener('scroll', () => {
    if (state.panelDrag?.started) updateDrag();
  }, true);

  // Hauteur, largeur ou affichage d'un panneau changé : on recalcule les places
  const observer = new ResizeObserver((entries) => layoutGrid(entries[0]?.target.id));
  widgets.forEach(w => observer.observe(w));
  window.addEventListener('resize', () => layoutGrid());

  // Restaurer l'agencement enregistré
  restoreGridLayout();
}

// Premier ancêtre qui défile verticalement (sinon la page)
function scrollParentOf(el) {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (/(auto|scroll)/.test(overflowY) && node.scrollHeight > node.clientHeight) return node;
  }
  return document.scrollingElement;
}

function isNarrowGrid() {
  return window.matchMedia('(max-width: 1100px)').matches;
}

function widgetColSpan(widget) {
  const cls = [...widget.classList].find(c => c.startsWith('col-span-'));
  return cls ? Number(cls.slice('col-span-'.length)) : 6;
}

// Panneaux affichés, avec leur place enregistrée (col/row absents si jamais placés)
function currentGridRects() {
  return [...dom.modCustomGrid.querySelectorAll('.grid-widget')]
    .filter(w => w.offsetHeight > 0)
    .map(w => ({
      id: w.id,
      w: widgetColSpan(w),
      h: rowSpanFor(w.offsetHeight),
      ...state.gridPos?.[w.id]
    }));
}

// Case de la grille sous le coin haut-gauche du panneau tenu (left/top en px depuis le coin de la grille)
function dropRectAt(widget, left, top) {
  const colWidth = (dom.modCustomGrid.clientWidth - (GRID_COLS - 1) * GRID_GAP_PX) / GRID_COLS;
  const w = widgetColSpan(widget);
  return {
    id: widget.id,
    w,
    h: rowSpanFor(widget.offsetHeight),
    col: clampCol(Math.round(left / (colWidth + GRID_GAP_PX)) + 1, w),
    row: Math.max(1, Math.round(top / GRID_ROW_PX) + 1)
  };
}

/**
 * Place chaque panneau affiché à sa case ; fixedId garde sa place et repousse les autres vers le bas
 */
function layoutGrid(fixedId) {
  if (isNarrowGrid()) return;
  const rects = currentGridRects();
  if (rects.length === 0) return;
  const placed = resolveCollisions(rects.filter(r => r.col && r.row), fixedId);
  rects.filter(r => !(r.col && r.row)).forEach(r => placed.push(findFreeSpot(r, placed)));

  const gridPos = { ...state.gridPos };
  placed.forEach(r => {
    const widget = document.getElementById(r.id);
    widget.style.gridColumn = `${r.col} / span ${r.w}`;
    widget.style.gridRow = `${r.row} / span ${r.h}`;
    gridPos[r.id] = { col: r.col, row: r.row };
  });
  state.gridPos = gridPos;
  saveGridLayout();
}

/**
 * Enregistre la disposition actuelle (ordre, taille, affichage) dans localStorage
 */
function saveGridLayout() {
  const widgets = dom.modCustomGrid.querySelectorAll('.grid-widget');
  const layout = [];

  widgets.forEach(widget => {
    // Extraire la classe de col-span
    let colSpan = 'col-span-6';
    for (const cls of widget.classList) {
      if (cls.startsWith('col-span-')) colSpan = cls;
    }

    layout.push({
      id: widget.id,
      colSpan: colSpan,
      visible: widget.style.display !== 'none',
      collapsed: widget.classList.contains('collapsed'),
      height: widget.style.height || '',
      ...state.gridPos?.[widget.id]
    });
  });

  localStorage.setItem('twitch_mod_manager_grid_layout', JSON.stringify(layout));
}

/**
 * Restaure la disposition enregistrée par l'utilisateur
 */
function restoreGridLayout() {
  try {
    const saved = localStorage.getItem('twitch_mod_manager_grid_layout');
    if (!saved) return;

    const layout = JSON.parse(saved);
    if (!Array.isArray(layout)) return;

    layout.forEach(item => {
      const widget = document.getElementById(item.id);
      if (!widget) return;

      // Place libre enregistrée (absente des anciennes versions : placement automatique)
      if (Number.isInteger(item.col) && Number.isInteger(item.row) && item.col >= 1 && item.row >= 1) {
        state.gridPos = { ...state.gridPos, [item.id]: { col: item.col, row: item.row } };
      }

      // Réordonner dans le DOM
      dom.modCustomGrid.appendChild(widget);

      // Restaurer la largeur
      if (item.colSpan) {
        widget.classList.remove('col-span-3', 'col-span-4', 'col-span-5', 'col-span-6', 'col-span-7', 'col-span-8', 'col-span-12');
        widget.classList.add(item.colSpan);
      }

      // Restaurer la visibilité
      if (item.visible === false) {
        widget.style.display = 'none';
        const cb = dom.widgetsDropdown.querySelector(`input[data-widget="${item.id}"]`);
        if (cb) cb.checked = false;
      }

      // Restaurer l'état replié
      if (item.collapsed) {
        widget.classList.add('collapsed');
        const collapseBtn = widget.querySelector('.btn-widget-collapse');
        if (collapseBtn) collapseBtn.innerText = '＋';
      }

      // Restaurer la hauteur personnalisée
      if (item.height) {
        widget.style.height = item.height;
      }
    });
  } catch (err) {
    console.error('Erreur restauration layout:', err);
  }
}
