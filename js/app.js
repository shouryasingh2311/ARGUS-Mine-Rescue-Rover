/**
 * @file app.js
 * @description Single-Screen Tactical Mission Control HUD Controller for RESCUE ROVER C2 - ALPHA-1.
 * Why: Coordinates zero-scroll HUD subsystems, listens to the live SSE telemetry stream, and manages clean standby states.
 */

import { soundEngine } from './audio-fx.js';
import { telemetry } from './telemetry-engine.js';
import { HUDCamera } from './hud-camera.js?v=2.2';
import { HUDHeatmap } from './hud-heatmap.js';
import { HUDGauges } from './hud-gauges.js';

class RoverApp {
  constructor() {
    this.camera = null;
    this.heatmap = null;
    this.gauges = null;
  }

  /**
   * Initializes the application.
   */
  async init() {
    // 1. Initialize Subsystems
    this.camera = new HUDCamera('webcam', 'overlay-camera', 'synth-camera');
    this.heatmap = new HUDHeatmap('canvas-heatmap');
    this.gauges = new HUDGauges();

    // 2. Initialize Canvases
    await this.camera.init();
    this.heatmap.init();
    this.gauges.init();

    // 3. Wire Telemetry Updates & Idle State to HUD
    telemetry.on('idle', () => {
      this.updateStatusBadge(false);
      this.heatmap.setIdle();
      this.gauges.setIdle();
    });

    telemetry.on('update', (data) => {
      this.updateStatusBadge(true);
      this.camera.updateTelemetry(data);
      this.heatmap.updateTelemetry(data);
      this.gauges.updateTelemetry(data);
    });

    telemetry.on('detections', (detectionsData) => {
      if (this.camera) {
        this.camera.updateDetections(detectionsData);
      }
    });

    telemetry.on('connectionChange', ({ isConnected }) => {
      if (!isConnected) {
        this.updateStatusBadge(false);
        this.heatmap.setIdle();
        this.gauges.setIdle();
      }
    });

    // 4. Start Telemetry Engine (subscribes to /events)
    telemetry.init();

    // 5. Bind UI Controls & Event Listeners
    this.bindHeaderControls();
    this.bindKeyboardShortcuts();

    // Expose instance for debugging
    window.roverApp = this;
  }

  /**
   * Synchronizes top status indicator badge.
   * @param {boolean} isActive
   */
  updateStatusBadge(isActive) {
    const dot = document.getElementById('status-dot');
    const text = document.getElementById('status-text');
    const badge = document.getElementById('status-stream-badge');

    if (!dot || !text) return;

    if (isActive) {
      dot.className = 'inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
      text.className = 'text-emerald-400 font-semibold tracking-wide';
      text.textContent = 'STREAM ACTIVE // LIVE';
      if (badge) badge.className = 'flex items-center gap-2 px-3 py-1 rounded bg-[#0A1A12] border border-[#164E33] text-xs font-mono';
    } else {
      dot.className = 'inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse';
      text.className = 'text-amber-400 font-semibold tracking-wide';
      text.textContent = 'IDLE // AWAITING SENSORS';
      if (badge) badge.className = 'flex items-center gap-2 px-3 py-1 rounded bg-[#10141C] border border-[#232D3D] text-xs font-mono';
    }
  }

  /**
   * Binds header camera and audio controls.
   */
  bindHeaderControls() {
    // Camera Mode Toggle
    const btnCamToggle = document.getElementById('btn-cam-toggle');
    if (btnCamToggle) {
      btnCamToggle.addEventListener('click', () => {
        if (this.camera) this.camera.toggleCameraMode();
      });
    }

    // Audio Mute Toggle
    const btnMute = document.getElementById('btn-audio-mute');
    if (btnMute) {
      btnMute.addEventListener('click', () => {
        const isMuted = soundEngine.toggleMute();
        btnMute.innerHTML = isMuted ? `
          <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clip-rule="evenodd"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/></svg>
          <span class="text-[11px] font-mono text-gray-400">AUDIO: OFF</span>
        ` : `
          <svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
          <span class="text-[11px] font-mono text-cyan-400">AUDIO: ON</span>
        `;
        if (!isMuted) soundEngine.playPing();
      });
    }
  }

  /**
   * Keyboard shortcuts.
   */
  bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key.toLowerCase() === 'm') {
        const btnMute = document.getElementById('btn-audio-mute');
        if (btnMute) btnMute.click();
      } else if (e.key.toLowerCase() === 'c') {
        if (this.camera) this.camera.toggleCameraMode();
      }
    });
  }
}

// Instantiate on DOM load
document.addEventListener('DOMContentLoaded', () => {
  const app = new RoverApp();
  app.init();
});
