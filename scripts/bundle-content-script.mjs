// Bundle content script for Chrome extension (MV3) using esbuild
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

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

console.log('✅ Bundled content script:', outfile);
