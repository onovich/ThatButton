import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}

const host = args.get('--host') || '127.0.0.1';
const port = Number(args.get('--port') || 5173);
const root = resolve(args.get('--root') || '.');

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.ico', 'image/x-icon']
]);

function resolveRequestPath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const cleanPath = decoded === '/' ? '/index.html' : decoded;
  const filePath = resolve(root, `.${cleanPath}`);
  const rootWithSeparator = root.endsWith(sep) ? root : `${root}${sep}`;

  if (filePath !== root && !filePath.startsWith(rootWithSeparator)) {
    return null;
  }

  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    return resolve(filePath, 'index.html');
  }

  return filePath;
}

const server = createServer((request, response) => {
  const filePath = resolveRequestPath(request.url || '/');

  if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  response.writeHead(200, {
    'Content-Type': mimeTypes.get(extname(filePath).toLowerCase()) || 'application/octet-stream'
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Serving ${root}`);
  console.log(`Local URL: http://${host}:${port}/`);
});
