import { cp, mkdir, readFile, rm, stat, writeFile, readdir, lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildManifestDisclosureAuditReport } from '../src/application/complianceDisclosureCatalog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const manifestPath = path.join(projectRoot, 'manifest.json');

async function ensureFileExists(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath);
  await stat(absolutePath);
}

async function validateManifestRuntimeEntries() {
  const raw = await readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(raw);

  if (manifest?.manifest_version !== 3) {
    throw new Error('manifest_version must be 3');
  }

  const requiredPermissionSet = new Set(['activeTab', 'scripting', 'storage']);
  for (const permission of requiredPermissionSet) {
    if (!manifest.permissions?.includes(permission)) {
      throw new Error(`missing permission in manifest: ${permission}`);
    }
  }

  if (!manifest.host_permissions?.includes('https://www.vocabulary.com/*')) {
    throw new Error('missing required host permission: https://www.vocabulary.com/*');
  }

  const auditReport = buildManifestDisclosureAuditReport({
    permissions: manifest.permissions,
    hostPermissions: manifest.host_permissions,
  });

  if (!auditReport.isAligned) {
    const report = [
      auditReport.summary,
      `unexpectedPermissions: ${JSON.stringify(auditReport.unexpectedPermissions)}`,
      `missingDisclosureItems: ${JSON.stringify(auditReport.missingDisclosureItems)}`,
    ].join('\n');
    throw new Error(`permission/disclosure audit failed\n${report}`);
  }

  const runtimeFiles = [
    manifest?.background?.service_worker,
    manifest?.action?.default_popup,
  ].filter(Boolean);

  if (runtimeFiles.length === 0) {
    throw new Error('manifest does not declare any runtime file entries');
  }

  for (const runtimeFile of runtimeFiles) {
    await ensureFileExists(runtimeFile);
  }

  // Content runtime shell is injected via chrome.scripting (activeTab flow).
  await ensureFileExists('src/content/runtimeContentScript.js');

  return manifest;
}

export async function build() {
  const manifest = await validateManifestRuntimeEntries();

  // Xóa dist/ trước khi bundle content script
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

  // Bundle content script sau khi dist/ đã sạch
  const { build } = await import('esbuild');
  const entry = path.join(projectRoot, 'src/content/runtimeContentScript.js');
  const outfile = path.join(projectRoot, 'dist/src/content/runtimeContentScript.js');
  await build({
    entryPoints: [entry],
    bundle: true,
    outfile,
    format: 'iife',
    target: ['chrome58'],
    platform: 'browser',
    sourcemap: true,
    legalComments: 'none',
    logLevel: 'info',
  });

  // Copy all src except content runtimeContentScript.js (will use bundled version)
  async function copyDirFiltered(srcDir, destDir, excludeFiles = []) {
    await mkdir(destDir, { recursive: true });
    const entries = await readdir(srcDir, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(srcDir, entry.name);
      const destPath = path.join(destDir, entry.name);
      if (excludeFiles.includes(path.relative(projectRoot, srcPath))) continue;
      if (entry.isDirectory()) {
        await copyDirFiltered(srcPath, destPath, excludeFiles);
      } else {
        await cp(srcPath, destPath);
      }
    }
  }

  // Exclude src/content/runtimeContentScript.js (will use bundled version)
  await copyDirFiltered(
    path.join(projectRoot, 'src'),
    path.join(distDir, 'src'),
    ['src/content/runtimeContentScript.js']
  );

  // Copy manifest
  await cp(manifestPath, path.join(distDir, 'manifest.json'));

  const metadata = {
    builtAt: new Date().toISOString(),
    name: manifest.name,
    version: manifest.version,
  };

  await writeFile(path.join(distDir, 'build-metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');

  console.log('✅ Build completed: dist/');
  console.log('ℹ️ Load unpacked extension from dist/ in Chrome.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  build().catch((error) => {
    console.error('❌ Build failed:', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
