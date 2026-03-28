import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildManifestDisclosureAuditReport } from '../src/application/complianceDisclosureCatalog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(projectRoot, 'manifest.json');
const checklistPath = path.join(projectRoot, 'docs', 'transparency-release-checklist.md');
const evidenceDir = path.join(projectRoot, 'docs', 'release-evidence');
const evidencePath = path.join(evidenceDir, 'latest-release-readiness.md');

const qualitySteps = [
  { label: 'Unit test suite', command: 'npm', args: ['run', 'test'] },
  { label: 'Permission-disclosure audit', command: 'npm', args: ['run', 'audit:permissions'] },
  { label: 'Extension build', command: 'npm', args: ['run', 'build'] },
];

function runCommand(step) {
  return new Promise((resolve) => {
    const child = spawn(step.command, step.args, {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('close', (code) => {
      resolve({
        ...step,
        code,
        passed: code === 0,
      });
    });

    child.on('error', () => {
      resolve({
        ...step,
        code: 1,
        passed: false,
      });
    });
  });
}

async function loadManifestAuditReport() {
  const raw = await readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(raw);

  return buildManifestDisclosureAuditReport({
    permissions: manifest.permissions,
    hostPermissions: manifest.host_permissions,
  });
}

async function verifyChecklistTemplate() {
  const content = await readFile(checklistPath, 'utf8');
  const requiredSnippets = [
    'activeTab',
    'scripting',
    'storage',
    'host:https://www.vocabulary.com/*',
    'npm run audit:permissions',
  ];

  const missingSnippets = requiredSnippets.filter((snippet) => !content.includes(snippet));

  return {
    isValid: missingSnippets.length === 0,
    missingSnippets,
  };
}

function formatStep(stepResult) {
  return `- [${stepResult.passed ? 'x' : ' '}] ${stepResult.label} (${stepResult.command} ${stepResult.args.join(' ')})`;
}

async function writeEvidence({ stepResults, auditReport, checklistVerification }) {
  const allStepsPassed = stepResults.every((step) => step.passed);
  const isReleaseReady = allStepsPassed && auditReport.isAligned && checklistVerification.isValid;

  const lines = [
    '# Release readiness evidence',
    '',
    `- Generated at: ${new Date().toISOString()}`,
    `- Release ready: ${isReleaseReady}`,
    '',
    '## Quality gate steps',
    ...stepResults.map(formatStep),
    '',
    '## Permission/disclosure audit snapshot',
    `- isAligned: ${auditReport.isAligned}`,
    `- summary: ${auditReport.summary}`,
    `- unexpectedPermissions: ${JSON.stringify(auditReport.unexpectedPermissions)}`,
    `- missingDisclosureItems: ${JSON.stringify(auditReport.missingDisclosureItems)}`,
    '',
    '## Transparency checklist template validation',
    `- isValid: ${checklistVerification.isValid}`,
    `- missingSnippets: ${JSON.stringify(checklistVerification.missingSnippets)}`,
    '',
    '## Linked checklist',
    '- docs/transparency-release-checklist.md',
    '',
  ];

  await mkdir(evidenceDir, { recursive: true });
  await writeFile(evidencePath, `${lines.join('\n')}\n`, 'utf8');

  return { isReleaseReady };
}

async function runQualityGate() {
  const stepResults = [];

  for (const step of qualitySteps) {
    const result = await runCommand(step);
    stepResults.push(result);

    if (!result.passed) {
      break;
    }
  }

  const auditReport = await loadManifestAuditReport();
  const checklistVerification = await verifyChecklistTemplate();
  const { isReleaseReady } = await writeEvidence({
    stepResults,
    auditReport,
    checklistVerification,
  });

  if (!isReleaseReady) {
    console.error('❌ Quality gate failed. See docs/release-evidence/latest-release-readiness.md');
    process.exitCode = 1;
    return;
  }

  console.log('✅ Quality gate passed. Evidence saved to docs/release-evidence/latest-release-readiness.md');
}

runQualityGate().catch((error) => {
  console.error('❌ Quality gate failed with unexpected error:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
