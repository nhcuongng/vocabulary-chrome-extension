import { watch } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

let activeBuild = null;
let rebuildTimer = null;
let pendingBuild = false;

function runBuild() {
  if (activeBuild) {
    pendingBuild = true;
    return;
  }

  pendingBuild = false;

  activeBuild = spawn(process.execPath, [path.join(projectRoot, 'scripts', 'build-extension.mjs')], {
    cwd: projectRoot,
    stdio: 'inherit',
  });

  activeBuild.on('close', () => {
    activeBuild = null;

    if (pendingBuild) {
      runBuild();
    }
  });
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
