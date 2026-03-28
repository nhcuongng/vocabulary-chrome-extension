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
  console.log('🔎 Permission/Disclosure Audit (manifest.json)');
  console.log(`- isAligned: ${report.isAligned}`);
  console.log(`- summary: ${report.summary}`);
  console.log(`- policyPermissions: ${report.policyPermissions.join(', ') || '(none)'}`);
  console.log(`- runtimePermissions: ${report.runtimePermissions.join(', ') || '(none)'}`);

  if (report.unexpectedPermissions.length > 0) {
    console.log(`- unexpectedPermissions: ${report.unexpectedPermissions.join(', ')}`);
  }

  if (report.missingDisclosureItems.length > 0) {
    console.log(`- missingDisclosureItems: ${report.missingDisclosureItems.join(', ')}`);
  }
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
