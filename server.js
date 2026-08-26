/* ═══════════════════════════════════════════════════════
   server.js — ArduSim Node.js backend (zero external deps)
   • Serves the frontend (static files) from the project root
   • REST API for the Saved Projects library (SQLite via node:sqlite)
   • API for the bundled Examples library

   Run:  node server.js   (then open http://localhost:3000)
   ═══════════════════════════════════════════════════════ */

'use strict';

const express = require('express');
const app = express();

const http  = require('node:http');
const fs    = require('node:fs');
const path  = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const ROOT      = __dirname;
const DATA_DIR  = path.join(ROOT, 'data');
const DB_FILE   = path.join(DATA_DIR, 'ardusim.db');
const PORT      = Number(process.env.PORT) || 3000;
const HOST      = process.env.HOST || '127.0.0.1';
const MAX_BODY  = 2 * 1024 * 1024; // 2 MB request limit

/* ── SQLite storage ── */
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(DB_FILE);
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id        TEXT PRIMARY KEY,
    version   TEXT NOT NULL DEFAULT '1.1',
    saved_at  TEXT,
    name      TEXT NOT NULL,
    code      TEXT NOT NULL DEFAULT '',
    circuit   TEXT NOT NULL DEFAULT '{}'
  );
`);

const stmtInsert = db.prepare(`
  INSERT INTO projects (id, version, saved_at, name, code, circuit)
  VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    version  = excluded.version,
    saved_at = excluded.saved_at,
    name     = excluded.name,
    code     = excluded.code,
    circuit  = excluded.circuit
`);
const stmtAll    = db.prepare('SELECT * FROM projects ORDER BY saved_at DESC');
const stmtById   = db.prepare('SELECT * FROM projects WHERE id = ?');
const stmtDelete = db.prepare('DELETE FROM projects WHERE id = ?');

function rowToProject(row) {
  if (!row) return null;
  let circuit = {};
  try { circuit = JSON.parse(row.circuit || '{}'); } catch (e) { circuit = {}; }
  return {
    id:       row.id,
    version:  row.version,
    savedAt:  row.saved_at,
    name:     row.name,
    code:     row.code,
    circuit,
  };
}

/* ── Helpers ── */
function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(data));
}

function readJsonBody(req, limit = MAX_BODY) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch (e) { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

function sanitizeProject(body) {
  if (!body || typeof body !== 'object') return null;
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Untitled Project';
  const code = typeof body.code === 'string' ? body.code : '';
  const circuit = body.circuit && typeof body.circuit === 'object'
    ? { components: Array.isArray(body.circuit.components) ? body.circuit.components : [],
        wires:      Array.isArray(body.circuit.wires) ? body.circuit.wires : [] }
    : { components: [], wires: [] };
  const id = typeof body.id === 'string' && body.id.trim() ? body.id.trim() : 'p_' + crypto.randomBytes(8).toString('hex');
  return {
    id,
    version: typeof body.version === 'string' ? body.version : '1.1',
    savedAt: typeof body.savedAt === 'string' ? body.savedAt : new Date().toISOString(),
    name,
    code,
    circuit,
  };
}

function readExamples() {
  const dir = path.join(ROOT, 'Examples');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.toLowerCase().endsWith('.json'))
    .map(f => {
      try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); }
      catch (e) { return null; }
    })
    .filter(Boolean);
}

/* ── Static file serving ── */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.map':  'application/json; charset=utf-8',
};

// Paths that must never be served over HTTP
const BLOCKED = ['/node_modules', '/data', '/.git', '/server.js', '/package.json', '/package-lock.json', '/.env'];

function serveStatic(req, res, urlPath) {
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
  if (BLOCKED.some(b => urlPath === b || urlPath.startsWith(b + '/'))) {
    return sendJson(res, 404, { error: 'Not found' });
  }

  let filePath;
  try {
    filePath = path.normalize(path.join(ROOT, decodeURIComponent(urlPath)));
  } catch (e) {
    return sendJson(res, 400, { error: 'Bad request' });
  }
  if (!filePath.startsWith(ROOT)) return sendJson(res, 403, { error: 'Forbidden' });

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) return sendJson(res, 404, { error: 'Not found' });
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';

    // ETag based on mtime + size for cache validation
    const etag = `"${stat.mtimeMs}-${stat.size}"`;
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch === etag) {
      res.writeHead(304);
      return res.end();
    }

    const noCache = ext === '.html' || ext === '.json';
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': stat.size,
      'Cache-Control': noCache ? 'no-cache' : 'public, max-age=0, must-revalidate',
      'ETag': etag,
      'Last-Modified': stat.mtime.toUTCString(),
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

/* ── Routing ── */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || HOST}`);
  const pathname = url.pathname;
  const method = req.method;

  // API routes (handled before static so they always win)
  if (pathname === '/api/health' && method === 'GET') {
    return sendJson(res, 200, { ok: true, name: 'ardusim', uptime: process.uptime(), time: new Date().toISOString() });
  }

  if (pathname === '/api/projects' && method === 'GET') {
    const projects = stmtAll.all().map(rowToProject);
    return sendJson(res, 200, { projects });
  }

  if (pathname === '/api/projects' && method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const project = sanitizeProject(body);
      if (!project) return sendJson(res, 400, { error: 'Invalid project' });
      stmtInsert.run(project.id, project.version, project.savedAt, project.name, project.code, JSON.stringify(project.circuit));
      return sendJson(res, 200, { project });
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  const projectMatch = pathname.match(/^\/api\/projects\/([^/]+)$/);
  if (projectMatch) {
    const id = decodeURIComponent(projectMatch[1]);
    if (method === 'GET') {
      const p = rowToProject(stmtById.get(id));
      return p ? sendJson(res, 200, { project: p }) : sendJson(res, 404, { error: 'Project not found' });
    }
    if (method === 'DELETE') {
      stmtDelete.run(id);
      return sendJson(res, 200, { ok: true, id });
    }
  }

  if (pathname === '/api/examples' && method === 'GET') {
    return sendJson(res, 200, { examples: readExamples() });
  }

  // Unknown /api route
  if (pathname.startsWith('/api/')) {
    return sendJson(res, 404, { error: 'Unknown API route' });
  }

  // Static files
  return serveStatic(req, res, pathname);
});

server.listen(PORT, HOST, () => {
  console.log(`▶ ArduSim server running at http://${HOST}:${PORT}`);
  console.log(`  DB: ${DB_FILE}`);
});
