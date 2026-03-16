/**
 * 消费基因扫描 - 本地运行脚本 (Node.js版本)
 * 解决浏览器直接打开HTML文件的CORS跨域问题
 *
 * 使用方法：
 *     node run.js
 *
 * 然后在浏览器打开：http://localhost:8080
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 8080;
const rootDir = __dirname;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // 添加CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  let filePath = path.join(rootDir, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // 文件不存在，返回index.html（用于SPA路由）
        fs.readFile(path.join(rootDir, 'index.html'), (err, content) => {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content, 'utf-8');
        });
      } else {
        res.writeHead(500);
        res.end('Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('🎉 服务器已启动！');
  console.log('='.repeat(50));
  console.log('\n📍 请在浏览器打开：');
  console.log(`   http://localhost:${PORT}`);
  console.log('\n🛑 按 Ctrl+C 停止服务器\n');

  // 自动打开浏览器
  const start = (process.platform === 'darwin' ? 'open' :
                 process.platform === 'win32' ? 'start' : 'xdg-open');
  exec(`${start} http://localhost:${PORT}`);
});

process.on('SIGINT', () => {
  console.log('\n\n👋 服务器已停止');
  server.close();
  process.exit(0);
});
