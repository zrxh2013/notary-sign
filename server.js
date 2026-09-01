const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8000;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.map':  'application/json; charset=utf-8',
};

const ALLOWED = new Set(['index.html','styles.css','app.js','favicon.ico']);

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';

  // 简单安全：白名单 + 禁止路径穿越
  const basename = path.basename(urlPath);
  if (!ALLOWED.has(basename) && !fs.existsSync(path.join(ROOT, urlPath.replace(/^\//,'')))) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('404 Not Found: ' + urlPath);
  }
  if (urlPath.includes('..')) {
    res.writeHead(403); return res.end('Forbidden');
  }

  const filePath = path.join(ROOT, urlPath.replace(/^\//, ''));
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500); return res.end('Server error');
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': data.length,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    });
    if (req.method === 'HEAD') return res.end();
    res.end(data);
  });
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`[ERR] Port ${PORT} is already in use, please free it first.`);
    process.exit(1);
  }
  console.error(e);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[OK] 信签云静态服务已启动，监听 0.0.0.0:${PORT}`);
  console.log(`[OK] 服务根目录: ${ROOT}`);
  console.log(`[OK] 白名单文件: ${Array.from(ALLOWED).join(', ')}`);
  console.log(`[OK] 访问入口: http://localhost:${PORT}/index.html`);
});
