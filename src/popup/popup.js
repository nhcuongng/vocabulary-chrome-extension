import {
  buildAttributionText,
  buildPermissionDisclosureSummary,
} from '../application/complianceDisclosureCatalog.js';
import { createAutoPopupSettingsPanel } from '../application/autoPopupSettingsPanel.js';
import { createChromeStorageSettingsAdapter } from '../infrastructure/adapters/chromeStorageSettingsAdapter.js';

function renderStatus(targetElement, enabled) {
  if (!targetElement) {
    return;
  }

  targetElement.textContent = enabled
    ? 'Auto-popup đang bật: bôi đen từ để tra cứu ngay.'
    : 'Auto-popup đang tắt: bạn có thể bật lại bất cứ lúc nào.';
}

async function bootstrapPopupRuntime({
  chromeApi = globalThis.chrome,
  documentObj = globalThis.document,
} = {}) {
  const toggleElement = documentObj.getElementById('auto-popup-toggle');
  const statusElement = documentObj.getElementById('auto-popup-status');
  const attributionElement = documentObj.getElementById('attribution');
  const disclosureElement = documentObj.getElementById('disclosure');

  if (!toggleElement) {
    throw new Error('missing #auto-popup-toggle');
  }

  if (attributionElement) {
    attributionElement.textContent = buildAttributionText();
  }
  if (disclosureElement) {
    disclosureElement.textContent = buildPermissionDisclosureSummary();
  }

  const settingsStore = createChromeStorageSettingsAdapter({
    storageArea: chromeApi?.storage?.local,
    storageChangeEvent: chromeApi?.storage?.onChanged,
  });

  let autoPopupEnabled = true;

  const autoPopupController = {
    async start() {
      const settings = await settingsStore.load();
      autoPopupEnabled = Boolean(settings?.autoPopupEnabled);
    },
    stop() {},
    isAutoPopupEnabled() {
      return autoPopupEnabled;
    },
    async setAutoPopupEnabled(enabled) {
      autoPopupEnabled = Boolean(enabled);
      await settingsStore.update({ autoPopupEnabled });
    },
    subscribe(listener) {
      return settingsStore.subscribe((nextSettings) => {
        autoPopupEnabled = Boolean(nextSettings?.autoPopupEnabled);
        listener({ autoPopupEnabled });
      });
    },
  };

  if (chromeApi?.tabs?.query && chromeApi?.scripting?.executeScript) {
    try {
      const [activeTab] = await chromeApi.tabs.query({ active: true, currentWindow: true });
      if (activeTab?.id) {
        await chromeApi.scripting.executeScript({
          target: { tabId: activeTab.id },
          files: ['src/content/runtimeContentScript.js'],
        });
      }
    } catch {
      // Best-effort runtime bootstrap: popup vẫn hoạt động dù inject thất bại.
    }
  }

  const panel = createAutoPopupSettingsPanel({
    toggleElement,
    autoPopupController,
  });

  await panel.init();
  renderStatus(statusElement, autoPopupController.isAutoPopupEnabled());

  const unsubscribe = autoPopupController.subscribe((nextState) => {
    renderStatus(statusElement, nextState?.autoPopupEnabled);
  });

  const destroy = () => {
    unsubscribe?.();
    panel.destroy();
    settingsStore.destroy?.();
  };

  globalThis.addEventListener('unload', destroy, { once: true });

  return {
    destroy,
  };
}

if (globalThis.document?.getElementById) {
  bootstrapPopupRuntime().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('[vocabulary-extension] popup runtime bootstrap failed:', message);
  });
}

export { bootstrapPopupRuntime };
