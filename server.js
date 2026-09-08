/**
 * @file server.js
 * @description Tactical telemetry server and relay bridge.
 * Why: Serves static HUD assets, broadcasts real-time telemetry to dashboards via SSE,
 * and accepts live sensor packets from ESP32 or the dedicated mobile override controller.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// Connected SSE clients set
const sseClients = new Set();

// Current active telemetry state (null indicates idle/standby)
let currentTelemetry = null;
let currentDetections = null;

/**
 * Broadcasts a telemetry payload to all active SSE subscribers.
 * @param {object|null} data
 */
function broadcastTelemetry(data) {
  const payload = JSON.stringify(data ? { status: 'active', data } : { status: 'idle' });
  for (const client of sseClients) {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}

/**
 * Broadcasts YOLO vision tracking detections to all active SSE subscribers.
 * @param {object|null} detections
 */
function broadcastDetections(detections) {
  const payload = JSON.stringify({ type: 'detections', data: detections });
  for (const client of sseClients) {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}

const server = http.createServer((req, res) => {
  // 1. SSE Endpoint: Dashboard connects here to receive live telemetry stream
  if (req.url === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write('\n');

    // Send initial status immediately upon connection
    const initialPayload = JSON.stringify(currentTelemetry ? { status: 'active', data: currentTelemetry } : { status: 'idle' });
    res.write(`data: ${initialPayload}\n\n`);

    if (currentDetections) {
      res.write(`data: ${JSON.stringify({ type: 'detections', data: currentDetections })}\n\n`);
    }

    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // 2. Vision Detection Endpoint from MINE_RESCUE_PRO.py
  if (req.url === '/api/detections' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        currentDetections = JSON.parse(body);
        broadcastDetections(currentDetections);
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  if (req.url === '/api/detections' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify(currentDetections || { worker_count: 0, closest_distance: null, detections: [] }));
    return;
  }

  // 3. API Endpoint: Mobile Controller or ESP32 posts sensor telemetry
  if (req.url === '/api/telemetry' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        currentTelemetry = parsed;
        broadcastTelemetry(currentTelemetry);
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 4. API Endpoint: Fetch current telemetry state
  if (req.url === '/api/telemetry' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify(currentTelemetry ? { status: 'active', data: currentTelemetry } : { status: 'idle' }));
    return;
  }

  // 4. API Endpoint: Reset to IDLE
  if (req.url === '/api/reset' && req.method === 'POST') {
    currentTelemetry = null;
    broadcastTelemetry(null);
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify({ success: true, status: 'idle' }));
    return;
  }

  // Handle CORS preflight options
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // 5. Static File Server
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  filePath = filePath.split('?')[0];

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Tactical Mission Control Server running on port ${PORT}`);
  console.log(`- Main HUD: http://127.0.0.1:${PORT}/`);
  console.log(`- Mobile Override: http://127.0.0.1:${PORT}/controller.html`);
});

// ─── Automatic ESP32 Live Telemetry Bridge ───────────────────────────────────
const ESP32_URL = 'http://192.168.4.1/events';
let isConnectingToESP32 = false;

function connectToESP32() {
  if (isConnectingToESP32) return;
  isConnectingToESP32 = true;

  console.log(`[*] Connecting to ESP32 telemetry stream at ${ESP32_URL}...`);
  const req = http.get(ESP32_URL, (res) => {
    isConnectingToESP32 = false;
    if (res.statusCode !== 200) {
      console.log(`[!] ESP32 returned status ${res.statusCode}. Reconnecting in 3s...`);
      setTimeout(connectToESP32, 3000);
      return;
    }

    console.log('[+] Connected to ESP32 live telemetry stream!');
    let buffer = '';

    res.on('data', (chunk) => {
      buffer += chunk.toString('utf-8');
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete trailing fragment

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data:')) {
          const jsonStr = trimmed.slice(5).trim();
          try {
            const parsed = JSON.parse(jsonStr);
            currentTelemetry = parsed;
            broadcastTelemetry(currentTelemetry);
          } catch (e) {
            // Partial or malformed packet, ignore
          }
        }
      }
    });

    res.on('end', () => {
      console.log('[!] ESP32 stream ended. Reconnecting in 2s...');
      setTimeout(connectToESP32, 2000);
    });

    res.on('error', () => {
      setTimeout(connectToESP32, 3000);
    });
  });

  req.on('error', (err) => {
    isConnectingToESP32 = false;
    // Silently retry every 3s if ESP32 Wi-Fi is temporarily out of range
    setTimeout(connectToESP32, 3000);
  });

  req.setTimeout(8000, () => {
    isConnectingToESP32 = false;
    req.destroy();
  });
}

// Auto-boot ESP32 connection
connectToESP32();
