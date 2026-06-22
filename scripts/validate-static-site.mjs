import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = resolve(root, 'index.html');
const mainModulePath = resolve(root, 'src/main.js');
const failures = [];

if (!existsSync(indexPath)) {
  failures.push('Missing root index.html.');
} else {
  const html = readFileSync(indexPath, 'utf8');

  for (const required of [
    '<meta charset="UTF-8">',
    '<div id="game-container">',
    'id="btn-grid"',
    'id="start-screen"',
    'id="game-over-screen"'
  ]) {
    if (!html.includes(required)) {
      failures.push(`index.html is missing required marker: ${required}`);
    }
  }

  if (html.includes('\uFFFD')) {
    failures.push('index.html contains replacement characters, which usually means a broken text encoding.');
  }

  const moduleEntry = '<script type="module" src="./src/main.js"></script>';
  if (!html.includes(moduleEntry)) {
    failures.push(`index.html is missing module entry: ${moduleEntry}`);
  }

  if (!existsSync(mainModulePath)) {
    failures.push('Missing src/main.js module entry.');
  }

  const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  inlineScripts.forEach((match, index) => {
    try {
      new Function(match[1]);
    } catch (error) {
      failures.push(`Inline script ${index + 1} has a syntax error: ${error.message}`);
    }
  });
}

if (failures.length > 0) {
  console.error('Static site validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Static site validation passed.');
