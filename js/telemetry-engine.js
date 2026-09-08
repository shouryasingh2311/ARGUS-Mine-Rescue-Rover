/**
 * @file telemetry-engine.js
 * @description Event-driven sensor data ingestion engine.
 * Why: Subscribes strictly to live telemetry streams via SSE without synthesizing mock or wandering numbers,
 * guaranteeing the HUD stays in a true idle state until genuine sensor packets arrive.
 */

import { CONFIG } from './config.js';
import { soundEngine } from './audio-fx.js';

export class TelemetryEngine {
  constructor() {
    this.isConnected = false;
    this.isIdle = true;
    this.eventSource = null;
    this.listeners = new Map();

    // Active sensor telemetry state (null indicates idle/standby)
    this.data = { ...CONFIG.EMPTY_TELEMETRY };
  }

  /**
   * Registers an event callback.
   * @param {string} event - 'update' | 'idle' | 'connectionChange' | 'anomaly'
   * @param {Function} callback
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Dispatches events to subscribers.
   * @param {string} event
   * @param {any} payload
   */
  emit(event, payload) {
    const list = this.listeners.get(event) || [];
    for (const fn of list) {
      try {
        fn(payload);
      } catch (err) {
        console.error(`TelemetryEngine listener error [${event}]:`, err);
      }
    }
  }

  /**
   * Initializes connection to the SSE telemetry stream.
   */
  init() {
    this.connect();
  }

  /**
   * Connects to the local relay SSE endpoint or directly to ESP32.
   */
  connect() {
    if (this.eventSource) {
      this.eventSource.close();
    }

    // Try primary relay endpoint first, falling back to direct ESP32 endpoint if requested
    const endpoint = this._useDirectESP32 ? CONFIG.ESP32_DIRECT_ENDPOINT : CONFIG.SSE_ENDPOINT;

    try {
      this.eventSource = new EventSource(endpoint);

      this.eventSource.onopen = () => {
        this.isConnected = true;
        this.emit('connectionChange', { isConnected: true });
      };

      this.eventSource.onmessage = (e) => {
        try {
          const packet = JSON.parse(e.data);
          if (packet.type === 'detections') {
            this.emit('detections', packet.data);
            return;
          }

          // Support both wrapped { status: 'active', data: {...} } and direct flat ESP32 packets
          const sensorData = packet.data || (packet.temp !== undefined || packet.pitch !== undefined || packet.co2_ppm !== undefined || packet.co_ppm !== undefined || packet.dist_front !== undefined ? packet : null);

          if (packet.status === 'idle' || !sensorData) {
            this.setIdle();
          } else {
            this.applyIncomingData(sensorData);
          }
        } catch {
          // Ignore malformed chunk
        }
      };

      this.eventSource.onerror = () => {
        this.isConnected = false;
        this.emit('connectionChange', { isConnected: false });
        this.setIdle();

        // If local relay was unreachable, toggle to direct ESP32 endpoint
        if (!this._useDirectESP32) {
          this._useDirectESP32 = true;
          setTimeout(() => this.connect(), 2000);
        } else {
          this._useDirectESP32 = false;
          setTimeout(() => this.connect(), 3000);
        }
      };
    } catch {
      this.isConnected = false;
      this.setIdle();
    }
  }

  /**
   * Puts telemetry engine into true IDLE / STANDBY state.
   */
  setIdle() {
    this.isIdle = true;
    this.data = { ...CONFIG.EMPTY_TELEMETRY };
    this.emit('idle', { isIdle: true });
  }

  /**
   * Updates state with genuine incoming sensor data.
   * @param {object} incoming
   */
  applyIncomingData(incoming) {
    const prevSOS = this.data.sos_anomaly;
    const prevWater = this.data.water_detected;
    const prevCO = this.data.co_ppm;

    this.isIdle = false;
    this.data = {
      ...this.data,
      ...incoming,
    };

    // Trigger audible alarm strictly on hazard transition
    if (this.data.sos_anomaly === 1 && prevSOS !== 1) {
      soundEngine.playAlarm();
      this.emit('anomaly', { type: 'sos', message: 'SOS RHYTHMIC KNOCK DETECTED' });
    }
    if (this.data.water_detected === 1 && prevWater !== 1) {
      soundEngine.playAlarm();
      this.emit('anomaly', { type: 'water', message: 'WATER INGRESS DETECTED' });
    }
    if (this.data.co_ppm > CONFIG.THRESHOLDS.CO_WARNING_PPM && (prevCO === null || prevCO <= CONFIG.THRESHOLDS.CO_WARNING_PPM)) {
      soundEngine.playAlarm();
      this.emit('anomaly', { type: 'gas', message: 'HAZARDOUS CO CONCENTRATION DETECTED' });
    }

    this.emit('update', this.data);
  }
}

export const telemetry = new TelemetryEngine();
