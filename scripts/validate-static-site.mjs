import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = resolve(root, 'index.html');
const mainModulePath = resolve(root, 'src/main.js');
const includeDist = process.argv.includes('--include-dist');
const failures = [];
const runtimeExtensions = new Set(['.html', '.js', '.css', '.json', '.webmanifest', '.svg']);
const forbiddenRuntimeResourcePatterns = [
  /\bhttps?:\/\//i,
  /\/\/cdn\./i,
  /\/\/fonts\./i,
  /cdn\.tailwindcss\.com/i,
  /fonts\.googleapis\.com/i,
  /fonts\.gstatic\.com/i
];

function toProjectPath(path) {
  return relative(root, path).replaceAll('\\', '/');
}

function collectRuntimeFiles(path, files = []) {
  if (!existsSync(path)) {
    return files;
  }

  const entries = readdirSync(path, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = resolve(path, entry.name);
    if (entry.isDirectory()) {
      collectRuntimeFiles(entryPath, files);
      continue;
    }

    if (entry.isFile() && runtimeExtensions.has(extname(entry.name).toLowerCase())) {
      files.push(entryPath);
    }
  }

  return files;
}

function getRuntimeFiles() {
  const files = [indexPath, ...collectRuntimeFiles(resolve(root, 'src'))];

  for (const optionalRootFile of ['manifest.webmanifest', 'site.webmanifest']) {
    const optionalPath = resolve(root, optionalRootFile);
    if (existsSync(optionalPath)) {
      files.push(optionalPath);
    }
  }

  if (includeDist) {
    const distPath = resolve(root, 'dist');
    if (!existsSync(distPath)) {
      failures.push('Missing dist/ for distribution validation. Run npm run build first.');
    } else {
      files.push(...collectRuntimeFiles(distPath));
    }
  }

  return files;
}

function validateNoRuntimeExternalResources() {
  for (const runtimeFile of getRuntimeFiles()) {
    if (!existsSync(runtimeFile)) {
      continue;
    }

    const source = readFileSync(runtimeFile, 'utf8');
    for (const pattern of forbiddenRuntimeResourcePatterns) {
      if (pattern.test(source)) {
        failures.push(`Runtime external resource marker found in ${toProjectPath(runtimeFile)}: ${pattern}`);
      }
    }
  }
}

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

  for (const forbiddenResource of [
    'https://cdn.tailwindcss.com',
    'cdn.tailwindcss.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com'
  ]) {
    if (html.includes(forbiddenResource)) {
      failures.push(`index.html still references a runtime external resource: ${forbiddenResource}`);
    }
  }

  for (const localResourceMarker of [
    'Local utility subset replacing previous Tailwind CDN usage.',
    'font-family: system-ui',
    'font-family: ui-monospace'
  ]) {
    if (!html.includes(localResourceMarker)) {
      failures.push(`index.html is missing local distribution marker: ${localResourceMarker}`);
    }
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

validateNoRuntimeExternalResources();

if (failures.length > 0) {
  console.error('Static site validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Static site validation passed.');
