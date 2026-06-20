import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildManifestDisclosureAuditReport } from '../src/application/complianceDisclosureCatalog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(projectRoot, 'manifest.json');

async function loadManifest() {
  const raw = await readFile(manifestPath, 'utf8');
  return JSON.parse(raw);
}

function printReport(report) {
}

async function run() {
  const manifest = await loadManifest();
  const report = buildManifestDisclosureAuditReport({
    permissions: manifest.permissions,
    hostPermissions: manifest.host_permissions,
  });

  printReport(report);

  if (!report.isAligned) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error('❌ Permission audit failed:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
