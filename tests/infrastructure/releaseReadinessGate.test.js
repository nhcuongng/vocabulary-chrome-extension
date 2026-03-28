import assert from 'node:assert/strict';
import test from 'node:test';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

test('release readiness gate: script file tồn tại', async () => {
  const scriptPath = path.join(projectRoot, 'scripts', 'release-quality-gate.mjs');
  await access(scriptPath);
});

test('release readiness gate: checklist template chứa các marker compliance bắt buộc', async () => {
  const checklistPath = path.join(projectRoot, 'docs', 'transparency-release-checklist.md');
  const content = await readFile(checklistPath, 'utf8');

  assert.match(content, /activeTab/i);
  assert.match(content, /scripting/i);
  assert.match(content, /storage/i);
  assert.match(content, /host:https:\/\/www\.vocabulary\.com\/\*/i);
  assert.match(content, /npm run audit:permissions/i);
  assert.match(content, /npm run quality:gate/i);
});
