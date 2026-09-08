/**
 * @file fake_telemetry.js
 * @description Standalone fake telemetry generator for PPT screenshot mode.
 * Why: Pumps realistic, smoothly-wandering mine-rescue sensor data into the
 * server at POST /api/telemetry so the dashboard lights up without an ESP32.
 *
 * Usage:  node fake_telemetry.js
 *         (Run AFTER starting server.js on port 8080)
 *
 * The simulator cycles through 3 scenarios automatically:
 *   1. NORMAL  – Safe baseline readings (~20s)
 *   2. WARNING – Elevated CO, low O2, tremor spike (~15s)
 *   3. SOS     – SOS knock detected + water ingress alarm (~12s)
 * Then it loops back to NORMAL so you can screenshot each state.
 */

const http = require('http');

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns a smoothly-wandering value clamped between min and max.
 * @param {number} current - Current value
 * @param {number} target  - Target center to drift toward
 * @param {number} jitter  - Max random step per tick
 * @param {number} min     - Floor clamp
 * @param {number} max     - Ceiling clamp
 * @returns {number}
 */
function drift(current, target, jitter, min, max) {
  const pull = (target - current) * 0.08;       // Slow spring toward target
  const noise = (Math.random() - 0.5) * jitter; // Random micro-step
  return Math.min(max, Math.max(min, current + pull + noise));
}

/**
 * POSTs a JSON payload to the local server's telemetry endpoint.
 * @param {object} payload
 */
function sendTelemetry(payload) {
  const body = JSON.stringify(payload);
  const options = {
    hostname: '127.0.0.1',
    port: 8080,
    path: '/api/telemetry',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
  };

  const req = http.request(options, (res) => {
    // Drain the response to prevent memory leak
    res.resume();
  });

  req.on('error', (err) => {
    console.error('[!] Could not reach server – is server.js running on port 8080?', err.message);
  });

  req.write(body);
  req.end();
}

// ─── Scenario Definitions ──────────────────────────────────────────────────────

const SCENARIOS = [
  {
    name: 'NORMAL – Safe Baseline',
    durationMs: 20_000,
    targets: {
      temp: 28.5,
      humidity: 62,
      o2_pct: 20.8,
      co_ppm: 8.0,
      co2_ppm: 420,
      ch4_pct: 0.3,
      pitch: 2.5,
      roll: -1.2,
      tremor: 0.05,
      dist_front: 4.8,
      water_detected: 0,
      sos_anomaly: 0,
      ir_obstacle: 0,
    },
  },
  {
    name: 'WARNING – Elevated Hazards',
    durationMs: 15_000,
    targets: {
      temp: 38.2,
      humidity: 78,
      o2_pct: 18.9,
      co_ppm: 52.0,
      co2_ppm: 1800,
      ch4_pct: 1.4,
      pitch: -8.3,
      roll: 5.7,
      tremor: 0.42,
      dist_front: 1.2,
      water_detected: 0,
      sos_anomaly: 0,
      ir_obstacle: 1,
    },
  },
  {
    name: 'SOS – Survivor Detected + Water Ingress',
    durationMs: 12_000,
    targets: {
      temp: 34.6,
      humidity: 91,
      o2_pct: 19.1,
      co_ppm: 28.0,
      co2_ppm: 950,
      ch4_pct: 0.8,
      pitch: -3.1,
      roll: 2.4,
      tremor: 0.18,
      dist_front: 2.1,
      water_detected: 1,
      sos_anomaly: 1,
      ir_obstacle: 0,
    },
  },
];

// ─── Simulator State ───────────────────────────────────────────────────────────

let scenarioIndex = 0;
let scenarioStartTime = Date.now();

/** Live sensor state that smoothly transitions between scenarios. */
const state = {
  temp: 25.0,
  humidity: 55,
  o2_pct: 20.9,
  co_ppm: 5.0,
  co2_ppm: 400,
  ch4_pct: 0.2,
  pitch: 0,
  roll: 0,
  tremor: 0.02,
  dist_front: 5.0,
  water_detected: 0,
  sos_anomaly: 0,
  ir_obstacle: 0,
};

// ─── Main Loop ─────────────────────────────────────────────────────────────────

const TICK_MS = 500; // 2 updates/s – fast enough for fluid gauges

function tick() {
  const scenario = SCENARIOS[scenarioIndex];
  const elapsed = Date.now() - scenarioStartTime;

  // Advance to next scenario when time expires
  if (elapsed >= scenario.durationMs) {
    scenarioIndex = (scenarioIndex + 1) % SCENARIOS.length;
    scenarioStartTime = Date.now();
    const next = SCENARIOS[scenarioIndex];
    console.log(`\n▸ Scenario: ${next.name}  (${(next.durationMs / 1000).toFixed(0)}s)`);
  }

  const t = scenario.targets;

  // Smoothly drift continuous values toward scenario targets
  state.temp       = drift(state.temp, t.temp, 0.6, 15, 60);
  state.humidity   = drift(state.humidity, t.humidity, 2, 20, 99);
  state.o2_pct     = drift(state.o2_pct, t.o2_pct, 0.15, 12, 23.5);
  state.co_ppm     = drift(state.co_ppm, t.co_ppm, 3.0, 0, 150);
  state.co2_ppm    = drift(state.co2_ppm, t.co2_ppm, 40, 300, 5000);
  state.ch4_pct    = drift(state.ch4_pct, t.ch4_pct, 0.08, 0, 5);
  state.pitch      = drift(state.pitch, t.pitch, 1.2, -45, 45);
  state.roll       = drift(state.roll, t.roll, 1.0, -45, 45);
  state.tremor     = drift(state.tremor, t.tremor, 0.04, 0, 2);
  state.dist_front = drift(state.dist_front, t.dist_front, 0.5, 0.1, 20);

  // Binary signals snap immediately
  state.water_detected = t.water_detected;
  state.sos_anomaly    = t.sos_anomaly;
  state.ir_obstacle    = t.ir_obstacle;

  // Round for clean display
  const payload = {
    temp:           +state.temp.toFixed(1),
    humidity:       +state.humidity.toFixed(0),
    o2_pct:         +state.o2_pct.toFixed(1),
    co_ppm:         +state.co_ppm.toFixed(1),
    co2_ppm:        +state.co2_ppm.toFixed(0),
    ch4_pct:        +state.ch4_pct.toFixed(2),
    pitch:          +state.pitch.toFixed(1),
    roll:           +state.roll.toFixed(1),
    tremor:         +state.tremor.toFixed(2),
    dist_front:     +state.dist_front.toFixed(1),
    water_detected: state.water_detected,
    sos_anomaly:    state.sos_anomaly,
    ir_obstacle:    state.ir_obstacle,
  };

  sendTelemetry(payload);

  // Compact one-line log for terminal
  process.stdout.write(
    `\r  TEMP:${payload.temp}°C  O₂:${payload.o2_pct}%  CO:${payload.co_ppm}ppm  CH₄:${payload.ch4_pct}%  PITCH:${payload.pitch}°  DIST:${payload.dist_front}m  SOS:${payload.sos_anomaly}  WATER:${payload.water_detected}  `
  );
}

// ─── Boot ──────────────────────────────────────────────────────────────────────

console.log('');
console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║  RESCUE ROVER C2 – FAKE TELEMETRY SIMULATOR (PPT MODE)      ║');
console.log('║  Feeding fake sensor data → http://127.0.0.1:8080           ║');
console.log('║  Press Ctrl+C to stop                                       ║');
console.log('╚═══════════════════════════════════════════════════════════════╝');
console.log('');
console.log(`▸ Scenario: ${SCENARIOS[0].name}  (${(SCENARIOS[0].durationMs / 1000).toFixed(0)}s)`);

setInterval(tick, TICK_MS);
