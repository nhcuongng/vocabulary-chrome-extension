/**
 * Tab Manager Module
 * Manages rendering of tabs, tab buttons, active panel switching, and keyboard navigation.
 */
import { openTabCustomizeModal } from './tabCustomizeModal.js';

export function renderTabsComponent({
  bodyContainer,
  popupContainer,
  settingsAdapter,
  h,
  updatePopupPosition,
  closeSVG,
  gearSVG,
  dragDotsSVG,
  eyeSVG,
  eyeOffSVG,
}) {
  const allTabsRaw = bodyContainer._pendingTabs || [];
  if (allTabsRaw.length === 0) return null;

  // 1. Sort tabs by user's saved tabOrderPreference if available
  const currentSettings = settingsAdapter?.getSnapshot ? settingsAdapter.getSnapshot() : null;
  const tabOrderPref = Array.isArray(currentSettings?.tabOrderPreference) ? currentSettings.tabOrderPreference : [];
  const hiddenTabsPref = Array.isArray(currentSettings?.hiddenTabsPreference) ? currentSettings.hiddenTabsPreference : [];

  let allTabsMaster = [...allTabsRaw];
  if (tabOrderPref.length > 0) {
    allTabsMaster.sort((a, b) => {
      const idxA = tabOrderPref.findIndex(
        (pref) =>
          a.label.toLowerCase().includes(pref.toLowerCase()) ||
          pref.toLowerCase().includes(a.label.toLowerCase())
      );
      const idxB = tabOrderPref.findIndex(
        (pref) =>
          b.label.toLowerCase().includes(pref.toLowerCase()) ||
          pref.toLowerCase().includes(b.label.toLowerCase())
      );
      const posA = idxA === -1 ? 999 : idxA;
      const posB = idxB === -1 ? 999 : idxB;
      return posA - posB;
    });
  }

  let activeHiddenTabs = [...hiddenTabsPref];

  const tabsContainer = h('div', { className: 'vocab-tabs-container' });
  const tabBar = h('div', {
    className: 'vocab-tab-bar',
    role: 'tablist',
    ariaLabel: 'Word details tabs',
  });
  const tabList = h('div', { className: 'vocab-tab-list' });
  const tabPanels = h('div', { className: 'vocab-tab-panels' });

  let activeModal = null;

  function getVisibleTabs() {
    const filtered = allTabsMaster.filter(
      (t) =>
        !activeHiddenTabs.some(
          (hidden) =>
            t.label.toLowerCase().includes(hidden.toLowerCase()) ||
            hidden.toLowerCase().includes(t.label.toLowerCase())
        )
    );
    // Fallback: If all tabs are hidden by error, show at least the first tab
    return filtered.length > 0 ? filtered : [allTabsMaster[0]];
  }

  const tabBtns = [];
  const panelEls = [];

  function switchTab(index) {
    tabBtns.forEach((b, i) => {
      const active = i === index;
      b.className = active ? 'vocab-tab-btn active' : 'vocab-tab-btn';
      b.setAttribute('aria-selected', active ? 'true' : 'false');
      b.tabIndex = active ? 0 : -1;
    });
    panelEls.forEach((p, i) => {
      p.className = i === index ? 'vocab-tab-panel active' : 'vocab-tab-panel';
    });
    const visibleTabs = getVisibleTabs();
    if (visibleTabs[index] && typeof visibleTabs[index].onActive === 'function') {
      visibleTabs[index].onActive(panelEls[index], visibleTabs[index]);
    }
    updatePopupPosition?.();
  }

  function renderMainTabs(updates = {}) {
    if (updates.updatedOrder) {
      allTabsMaster = [...updates.updatedOrder];
    }
    if (updates.updatedHidden) {
      activeHiddenTabs = [...updates.updatedHidden];
    }

    tabList.replaceChildren();
    tabPanels.replaceChildren();
    tabBtns.length = 0;
    panelEls.length = 0;

    const visibleTabs = getVisibleTabs();

    visibleTabs.forEach((tabInfo, idx) => {
      const isActive = idx === 0;
      const badgeEl = tabInfo.badge
        ? h('span', { className: 'vocab-tab-badge' }, tabInfo.badge)
        : null;

      const btn = h(
        'button',
        {
          type: 'button',
          className: isActive ? 'vocab-tab-btn active' : 'vocab-tab-btn',
          role: 'tab',
          ariaSelected: isActive ? 'true' : 'false',
          tabIndex: isActive ? 0 : -1,
          onClick: (e) => {
            e?.stopPropagation?.();
            switchTab(idx);
          },
        },
        tabInfo.label,
        badgeEl
      );

      const panel = h('div', {
        className: isActive ? 'vocab-tab-panel active' : 'vocab-tab-panel',
        role: 'tabpanel',
      });

      if (tabInfo.contentElement) {
        panel.appendChild(tabInfo.contentElement);
      } else if (tabInfo.contentHtml) {
        panel.innerHTML = tabInfo.contentHtml;
      }

      if (isActive && typeof tabInfo.onActive === 'function') {
        tabInfo.onActive(panel, tabInfo);
      }

      tabBtns.push(btn);
      panelEls.push(panel);
      tabList.appendChild(btn);
      tabPanels.appendChild(panel);
    });

    updatePopupPosition?.();
  }

  // Keyboard support for tabs
  tabBar.addEventListener('keydown', (e) => {
    const activeIdx = tabBtns.findIndex((b) => b.classList.contains('active'));
    if (activeIdx === -1) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      const nextIdx = (activeIdx + 1) % tabBtns.length;
      switchTab(nextIdx);
      tabBtns[nextIdx]?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      const prevIdx = (activeIdx - 1 + tabBtns.length) % tabBtns.length;
      switchTab(prevIdx);
      tabBtns[prevIdx]?.focus();
    }
  });

  // Customize settings button on tab bar
  const reorderBtn = h('button', {
    type: 'button',
    className: 'vocab-tab-reorder-btn',
    title: 'Customize tabs',
    ariaLabel: 'Customize tabs',
    innerHTML: gearSVG,
    onClick: (e) => {
      e?.stopPropagation?.();
      if (activeModal) {
        activeModal.close();
        activeModal = null;
        return;
      }
      activeModal = openTabCustomizeModal({
        popupContainer,
        allTabsMaster,
        activeHiddenTabs,
        allTabsRaw,
        settingsAdapter,
        h,
        renderMainTabs,
        onClose: () => {
          activeModal = null;
        },
        closeSVG,
        dragDotsSVG,
        eyeSVG,
        eyeOffSVG,
      });
    },
  });

  renderMainTabs();

  tabBar.appendChild(tabList);
  if (allTabsMaster.length > 1) {
    tabBar.appendChild(reorderBtn);
  }
  tabsContainer.appendChild(tabBar);
  tabsContainer.appendChild(tabPanels);
  bodyContainer.appendChild(tabsContainer);
  bodyContainer._pendingTabs = null;

  return tabsContainer;
}
