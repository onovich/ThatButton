import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
copyFileSync(resolve(root, 'index.html'), resolve(dist, 'index.html'));
writeFileSync(resolve(dist, '.nojekyll'), '');

console.log(`Built static site at ${dist}`);
