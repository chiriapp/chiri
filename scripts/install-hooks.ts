import { execFileSync } from 'node:child_process';
import { copyFileSync, lstatSync, mkdirSync, symlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const hookSource = resolve(repoRoot, 'scripts/hooks/pre-commit');
const gitHooksPath = execFileSync('git', ['rev-parse', '--git-path', 'hooks'], {
  cwd: repoRoot,
  encoding: 'utf8',
}).trim();
const hooksDirectory = resolve(repoRoot, gitHooksPath);
const hookDestination = resolve(hooksDirectory, 'pre-commit');

mkdirSync(hooksDirectory, { recursive: true });

console.log('🪝 Installing Git hooks…');

let hookAlreadyExists = true;
try {
  lstatSync(hookDestination);
} catch (error) {
  if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') {
    throw error;
  }
  hookAlreadyExists = false;
}

if (hookAlreadyExists) {
  console.log('  ✓ pre-commit already exists, skipping.');
} else {
  if (process.platform === 'win32') {
    // windows symlink creation requires dev mode or uac
    copyFileSync(hookSource, hookDestination);
  } else {
    symlinkSync(hookSource, hookDestination);
  }

  console.log('  ✓ Installed pre-commit');
}

console.log('Done.');
