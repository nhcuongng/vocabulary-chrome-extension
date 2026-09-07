/**
 * Tab Customize Modal Module
 * Handles the customization dialog for tabs (drag-and-drop reordering, visibility toggle, reset, save).
 */

export function openTabCustomizeModal({
  popupContainer,
  allTabsMaster,
  activeHiddenTabs,
  allTabsRaw,
  settingsAdapter,
  h,
  renderMainTabs,
  onClose,
  closeSVG,
  dragDotsSVG,
  eyeSVG,
  eyeOffSVG,
}) {
  let draftOrder = [...allTabsMaster];
  let draftHidden = [...activeHiddenTabs];
  let draggedItemIdx = null;
  let modalEl = null;

  function closeCustomizeModal() {
    if (modalEl && modalEl.parentNode) {
      modalEl.parentNode.removeChild(modalEl);
      modalEl = null;
      onClose?.();
    }
  }

  const backdrop = h('div', {
    className: 'vocab-tabs-modal-backdrop',
    onClick: (e) => {
      e?.stopPropagation?.();
      closeCustomizeModal();
    },
  });

  const modal = h('div', {
    className: 'vocab-tabs-modal',
    role: 'dialog',
    ariaLabel: 'Customize tabs',
    onClick: (e) => {
      e?.stopPropagation?.();
    },
  });

  const header = h(
    'div',
    { className: 'vocab-tabs-modal-header' },
    h('span', { className: 'vocab-tabs-modal-title' }, 'Customize Tabs'),
    h(
      'button',
      {
        type: 'button',
        className: 'vocab-tabs-modal-close-btn',
        title: 'Close',
        ariaLabel: 'Close',
        innerHTML: closeSVG,
        onClick: (e) => {
          e?.stopPropagation?.();
          closeCustomizeModal();
        },
      }
    )
  );

  const listContainer = h('div', { className: 'vocab-tabs-modal-list' });

  function renderModalList() {
    listContainer.replaceChildren();

    draftOrder.forEach((tabInfo, idx) => {
      const isHidden = draftHidden.some(
        (hidden) =>
          tabInfo.label.toLowerCase().includes(hidden.toLowerCase()) ||
          hidden.toLowerCase().includes(tabInfo.label.toLowerCase())
      );

      const itemRow = h('div', {
        className: `vocab-tabs-modal-item${isHidden ? ' hidden-tab' : ''}`,
        draggable: 'true',
      });

      // Drag and Drop handlers
      itemRow.addEventListener('dragstart', (e) => {
        draggedItemIdx = idx;
        itemRow.classList.add('dragging');
        e.dataTransfer?.setData('text/plain', String(idx));
      });

      itemRow.addEventListener('dragend', () => {
        itemRow.classList.remove('dragging');
        listContainer
          .querySelectorAll('.vocab-tabs-modal-item')
          .forEach((row) => row.classList.remove('drag-over'));
        draggedItemIdx = null;
      });

      itemRow.addEventListener('dragover', (e) => {
        e.preventDefault();
        itemRow.classList.add('drag-over');
      });

      itemRow.addEventListener('dragleave', () => {
        itemRow.classList.remove('drag-over');
      });

      itemRow.addEventListener('drop', (e) => {
        e.preventDefault();
        itemRow.classList.remove('drag-over');
        const fromIdx =
          draggedItemIdx !== null
            ? draggedItemIdx
            : Number(e.dataTransfer?.getData('text/plain'));
        const toIdx = idx;
        if (fromIdx !== null && !isNaN(fromIdx) && fromIdx !== toIdx) {
          const moved = draftOrder.splice(fromIdx, 1)[0];
          draftOrder.splice(toIdx, 0, moved);
          renderModalList();
        }
      });

      const leftSide = h(
        'div',
        { className: 'vocab-tabs-modal-item-left' },
        h('span', {
          className: 'vocab-tabs-modal-drag-handle',
          innerHTML: dragDotsSVG,
          title: 'Drag to reorder',
        }),
        h('span', { className: 'vocab-tabs-modal-item-label' }, tabInfo.label)
      );

      const eyeBtn = h(
        'button',
        {
          type: 'button',
          className: `vocab-tabs-modal-eye-btn${isHidden ? ' tab-hidden' : ''}`,
          title: isHidden ? `Show ${tabInfo.label}` : `Hide ${tabInfo.label}`,
          ariaLabel: isHidden ? `Show ${tabInfo.label}` : `Hide ${tabInfo.label}`,
          innerHTML: isHidden ? eyeOffSVG : eyeSVG,
          onClick: (e) => {
            e?.stopPropagation?.();
            if (isHidden) {
              draftHidden = draftHidden.filter(
                (hVal) =>
                  !tabInfo.label.toLowerCase().includes(hVal.toLowerCase()) &&
                  !hVal.toLowerCase().includes(tabInfo.label.toLowerCase())
              );
            } else {
              const visibleCount = draftOrder.filter(
                (t) =>
                  !draftHidden.some(
                    (hVal) =>
                      t.label.toLowerCase().includes(hVal.toLowerCase()) ||
                      hVal.toLowerCase().includes(t.label.toLowerCase())
                  )
              ).length;
              if (visibleCount <= 1) {
                return; // Always keep at least 1 tab visible
              }
              draftHidden.push(tabInfo.label);
            }
            renderModalList();
          },
        }
      );

      itemRow.appendChild(leftSide);
      itemRow.appendChild(eyeBtn);
      listContainer.appendChild(itemRow);
    });
  }

  renderModalList();

  const footer = h(
    'div',
    { className: 'vocab-tabs-modal-footer' },
    h(
      'button',
      {
        type: 'button',
        className: 'vocab-tabs-modal-reset-btn',
        title: 'Reset to default tab order and visibility',
        onClick: (e) => {
          e?.stopPropagation?.();
          if (settingsAdapter?.update) {
            settingsAdapter
              .update({ tabOrderPreference: [], hiddenTabsPreference: [] })
              .catch(() => {});
          }
          renderMainTabs({ updatedOrder: [...allTabsRaw], updatedHidden: [] });
          closeCustomizeModal();
        },
      },
      'Reset to default'
    ),
    h(
      'div',
      { className: 'vocab-tabs-modal-actions' },
      h(
        'button',
        {
          type: 'button',
          className: 'vocab-tabs-modal-save-btn',
          title: 'Save tab preferences',
          onClick: (e) => {
            e?.stopPropagation?.();
            const newOrder = draftOrder.map((t) => t.label);
            if (settingsAdapter?.update) {
              settingsAdapter
                .update({
                  tabOrderPreference: newOrder,
                  hiddenTabsPreference: draftHidden,
                })
                .catch(() => {});
            }
            renderMainTabs({
              updatedOrder: [...draftOrder],
              updatedHidden: [...draftHidden],
            });
            closeCustomizeModal();
          },
        },
        'Save'
      )
    )
  );

  modal.appendChild(header);
  modal.appendChild(listContainer);
  modal.appendChild(footer);
  backdrop.appendChild(modal);

  modalEl = backdrop;
  popupContainer.appendChild(backdrop);

  return {
    close: closeCustomizeModal,
  };
}
