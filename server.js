/**
 * HTTPS dev server for mobile testing.
 *
 * Usage:
 *   1. Install mkcert: https://github.com/FiloSottile/mkcert
 *   2. Run: mkcert -install
 *   3. Run: mkcert <your-local-ip> localhost 127.0.0.1
 *      e.g.: mkcert 192.168.1.42 localhost 127.0.0.1
 *      This creates: 192.168.1.42+2.pem and 192.168.1.42+2-key.pem
 *   4. npm run dev:mobile
 *
 * If certs aren't found, falls back to plain HTTP on 0.0.0.0 (camera/mic
 * won't work on mobile over HTTP, but the app will still load for visual testing).
 */

const { createServer: createHttpsServer } = require('https');
const { createServer: createHttpServer } = require('http');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);
const hostname = '0.0.0.0';

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Look for mkcert-generated certs in the project root.
// If multiple exist (e.g. after an IP change), picks the newest pair.
function findCerts() {
  const files = fs.readdirSync('.').filter(f => f.endsWith('.pem'));
  const keys = files.filter(f => f.endsWith('-key.pem'));
  const certs = files.filter(f => !f.endsWith('-key.pem'));
  if (!keys.length || !certs.length) return null;

  // Sort by mtime descending — newest first
  const newest = (arr) =>
    arr.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];

  return { cert: newest(certs), key: newest(keys) };
}

app.prepare().then(() => {
  const certs = findCerts();

  if (certs) {
    const httpsOptions = {
      key: fs.readFileSync(certs.key),
      cert: fs.readFileSync(certs.cert),
    };

    createHttpsServer(httpsOptions, (req, res) => {
      handle(req, res, parse(req.url, true));
    }).listen(port, hostname, () => {
      // Find the active Wi-Fi IP from network interfaces
      const { networkInterfaces } = require('os');
      const nets = networkInterfaces();
      const wifiIps = [];
      for (const iface of Object.values(nets)) {
        for (const addr of iface) {
          if (addr.family === 'IPv4' && !addr.internal && addr.address.startsWith('10.') ||
              addr.family === 'IPv4' && !addr.internal && addr.address.startsWith('192.168.') ||
              addr.family === 'IPv4' && !addr.internal && addr.address.startsWith('198.168.')) {
            wifiIps.push(addr.address);
          }
        }
      }
      console.log(`\n> Ready on https://localhost:${port}`);
      wifiIps.forEach(ip => console.log(`> Mobile: https://${ip}:${port}`));
      console.log('');
    });
  } else {
    console.warn('\n⚠️  No mkcert certs found — running plain HTTP.');
    console.warn('   Camera/mic require HTTPS on mobile.');
    console.warn('   See server.js for setup instructions.\n');

    createHttpServer((req, res) => {
      handle(req, res, parse(req.url, true));
    }).listen(port, hostname, () => {
      console.log(`\n> Ready on http://localhost:${port} (plain HTTP — no mobile mic/camera)\n`);
    });
  }
});
