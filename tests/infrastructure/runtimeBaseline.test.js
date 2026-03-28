import assert from 'node:assert/strict';
import test from 'node:test';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditManifestPermissions } from '../../src/application/complianceDisclosureCatalog.js';
import { LOOKUP_MESSAGE_TYPE } from '../../src/shared/lookupContract.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

async function readJson(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath);
  const content = await readFile(absolutePath, 'utf8');
  return JSON.parse(content);
}

test('runtime baseline: manifest MV3 + permission disclosure alignment tối thiểu', async () => {
  const manifest = await readJson('manifest.json');

  assert.equal(manifest.manifest_version, 3);
  assert.equal(typeof manifest.background?.service_worker, 'string');
  assert.equal(typeof manifest.action?.default_popup, 'string');

  assert.ok(Array.isArray(manifest.permissions));
  assert.ok(manifest.permissions.includes('activeTab'));
  assert.ok(manifest.permissions.includes('scripting'));
  assert.ok(manifest.permissions.includes('storage'));

  assert.ok(Array.isArray(manifest.host_permissions));
  assert.ok(manifest.host_permissions.includes('https://www.vocabulary.com/*'));
  assert.ok(Array.isArray(manifest.content_scripts));
  assert.equal(manifest.content_scripts.length, 0);

  const alignment = auditManifestPermissions({
    permissions: manifest.permissions,
    hostPermissions: manifest.host_permissions,
  });

  assert.equal(alignment.isAligned, true);
  assert.deepEqual(alignment.unexpectedPermissions, []);
  assert.deepEqual(alignment.missingDisclosureItems, []);
});

test('runtime baseline: manifest runtime entries trỏ đến file tồn tại', async () => {
  const manifest = await readJson('manifest.json');

  const declaredPaths = [
    manifest.background?.service_worker,
    manifest.action?.default_popup,
    'src/content/runtimeContentScript.js',
  ].filter(Boolean);

  assert.ok(declaredPaths.length > 0);

  await Promise.all(
    declaredPaths.map(async (relativeFilePath) => {
      await access(path.join(projectRoot, relativeFilePath));
    }),
  );
});

test('runtime baseline: package scripts có dev/build + giữ test', async () => {
  const packageJson = await readJson('package.json');

  assert.equal(typeof packageJson.scripts?.test, 'string');
  assert.equal(typeof packageJson.scripts?.dev, 'string');
  assert.equal(typeof packageJson.scripts?.build, 'string');
  assert.equal(typeof packageJson.scripts?.['audit:permissions'], 'string');
  assert.equal(typeof packageJson.scripts?.['quality:gate'], 'string');
});

test('runtime baseline: runtime shell modules export bootstrap function', async () => {
  const backgroundRuntimeModule = await import('../../src/background/runtimeServiceWorker.js');
  const contentRuntimeModule = await import('../../src/content/runtimeContentScript.js');
  const popupRuntimeModule = await import('../../src/popup/popup.js');

  assert.equal(typeof backgroundRuntimeModule.bootstrapServiceWorkerRuntime, 'function');
  assert.equal(typeof contentRuntimeModule.bootstrapContentRuntime, 'function');
  assert.equal(typeof popupRuntimeModule.bootstrapPopupRuntime, 'function');
});

test('runtime baseline: service worker listener chỉ mở async channel cho lookup message', async () => {
  let registeredListener = null;

  const chromeApi = {
    runtime: {
      onMessage: {
        addListener(listener) {
          registeredListener = listener;
        },
        removeListener() {},
      },
    },
  };

  const { bootstrapServiceWorkerRuntime } = await import('../../src/background/runtimeServiceWorker.js');

  bootstrapServiceWorkerRuntime({
    chromeApi,
    messageHandler: async () => ({ status: 'success', data: { ok: true } }),
  });

  assert.equal(typeof registeredListener, 'function');

  const nonLookupResult = registeredListener({ type: 'NOOP' }, {}, () => {});
  assert.equal(nonLookupResult, false);

  const lookupResult = registeredListener({ type: LOOKUP_MESSAGE_TYPE }, {}, () => {});
  assert.equal(lookupResult, true);
});
