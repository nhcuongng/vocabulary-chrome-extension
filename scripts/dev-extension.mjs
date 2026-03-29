
import { watch } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

let activeBuild = false;
let rebuildTimer = null;
let pendingBuild = false;

async function runBuild() {
  if (activeBuild) {
    pendingBuild = true;
    return;
  }
  pendingBuild = false;
  activeBuild = true;
  try {
    const { build } = await import('./build-extension.mjs');
    await build();
  } catch (error) {
    console.error('❌ Build failed:', error instanceof Error ? error.message : String(error));
  } finally {
    activeBuild = false;
    if (pendingBuild) {
      runBuild();
    }
  }
}

function scheduleBuild() {
  if (rebuildTimer) {
    clearTimeout(rebuildTimer);
  }
  rebuildTimer = setTimeout(() => {
    rebuildTimer = null;
    runBuild();
  }, 150);
}

const watchTargets = [
  path.join(projectRoot, 'src'),
  path.join(projectRoot, 'manifest.json'),
  path.join(projectRoot, 'package.json'),
];

async function startWatchingTarget(target) {
  const targetStat = await stat(target);
  const recursive = targetStat.isDirectory();
  watch(target, { recursive }, () => {
    scheduleBuild();
  });
}

for (const target of watchTargets) {
  await startWatchingTarget(target);
}

console.log('👀 Watching src/, manifest.json, package.json ...');
console.log('ℹ️ Press Ctrl+C to stop.');

runBuild();
