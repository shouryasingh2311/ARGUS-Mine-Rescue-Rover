/**
 * @file config.js
 * @description Operational safety thresholds, palette tokens, and telemetry parameters for RESCUE ROVER C2 - ALPHA-1.
 * Why: Centralizes sensor threshold boundaries and theme colors without ghost or simulated attributes.
 */

export const CONFIG = {
  // Network Endpoints
  // Connects to local server SSE relay by default (which relays ESP32 or mobile controller packets)
  SSE_ENDPOINT: '/events',
  ESP32_DIRECT_ENDPOINT: 'http://192.168.4.1/events',
  RECONNECT_INTERVAL_MS: 3000,

  // UI Palette Constants
  THEME: {
    bgSlate: '#0A0B0E',
    panelBg: '#12151B',
    panelBorder: '#1C222D',
    panelBorderHover: '#2A3547',
    amber: '#FF9800',
    amberGlow: 'rgba(255, 152, 0, 0.25)',
    emergencyRed: '#F44336',
    redGlow: 'rgba(244, 67, 54, 0.3)',
    cyan: '#00E5FF',
    cyanGlow: 'rgba(0, 229, 255, 0.25)',
    neonGreen: '#00E676',
    greenGlow: 'rgba(0, 230, 118, 0.3)',
    textDim: '#707E94',
    textLight: '#E1E7EF',
  },

  // Operational Safety Thresholds (Real Sensors Only)
  THRESHOLDS: {
    CO_WARNING_PPM: 35.0,        // Active warning when CO > 35ppm
    CO_CRITICAL_PPM: 70.0,
    CH4_WARNING_PCT: 1.0,
    O2_MIN_SAFE_PCT: 19.5,
    O2_MAX_SAFE_PCT: 23.5,
    TREMOR_WARNING_G: 0.30,      // Flashes TREMOR WARNING when > 0.3G
    OBSTACLE_WARN_DIST: 1.5,     // Front distance warning threshold in meters
  },

  // Real Sensor Fields Template
  EMPTY_TELEMETRY: {
    dist_front: null,
    ir_obstacle: null,
    co2_ppm: null,
    pitch: null,
    roll: null,
    tremor: null,
    temp: null,
    humidity: null,
    co_ppm: null,
    ch4_pct: null,
    o2_pct: null,
    water_detected: null,
    sos_anomaly: null,
  },
};
