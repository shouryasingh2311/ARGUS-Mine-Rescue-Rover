/**
 * @file controller.js
 * @description Mobile Manual Override Remote Controller for RESCUE ROVER C2 - ALPHA-1.
 * Why: Allows an operator on a mobile device to manually manipulate telemetry readings in real-time,
 * immediately broadcasting them to the main cockpit HUD via the server SSE bridge.
 */

class MobileRoverController {
  constructor() {
    this.state = {
      co_ppm: 2.0,
      ch4_pct: 0.4,
      o2_pct: 20.9,
      co2_ppm: 450,
      pitch: 0.0,
      roll: 0.0,
      tremor: 0.02,
      dist_front: 12.0,
      temp: 24.5,
      humidity: 45,
      water_detected: 0,
      sos_anomaly: 0,
      ir_obstacle: 0,
    };

    this.debounceTimer = null;
  }

  /**
   * Initializes the controller UI and event listeners.
   */
  async init() {
    this.bindSliders();
    this.bindToggles();
    this.bindPresets();
    await this.fetchCurrentTelemetry();
  }

  /**
   * Fetches current state from server if available.
   */
  async fetchCurrentTelemetry() {
    try {
      const res = await fetch('/api/telemetry');
      const json = await res.json();
      if (json.status === 'active' && json.data) {
        this.state = { ...this.state, ...json.data };
        this.syncUIToState();
      }
    } catch {
      // Offline fallback
    }
  }

  /**
   * Binds all range sliders.
   */
  bindSliders() {
    const bindSlider = (id, badgeId, key, suffix = '', precision = 1) => {
      const slider = document.getElementById(id);
      const badge = document.getElementById(badgeId);
      if (!slider || !badge) return;

      slider.addEventListener('input', () => {
        const val = parseFloat(slider.value);
        this.state[key] = val;
        badge.textContent = `${val.toFixed(precision)} ${suffix}`.trim();
        this.sendTelemetry();
      });
    };

    bindSlider('slider-co', 'badge-co', 'co_ppm', 'ppm', 1);
    bindSlider('slider-ch4', 'badge-ch4', 'ch4_pct', '%', 2);
    bindSlider('slider-o2', 'badge-o2', 'o2_pct', '%', 1);
    bindSlider('slider-co2', 'badge-co2', 'co2_ppm', 'ppm', 0);
    bindSlider('slider-pitch', 'badge-pitch', 'pitch', '°', 1);
    bindSlider('slider-roll', 'badge-roll', 'roll', '°', 1);
    bindSlider('slider-tremor', 'badge-tremor', 'tremor', 'G', 2);
    bindSlider('slider-dist', 'badge-dist', 'dist_front', 'm', 1);
    bindSlider('slider-temp', 'badge-temp', 'temp', '°C', 1);
    bindSlider('slider-humidity', 'badge-humidity', 'humidity', '%', 0);
  }

  /**
   * Binds hazard toggle buttons.
   */
  bindToggles() {
    // SOS Knock Toggle
    const btnSOS = document.getElementById('toggle-sos');
    const labelSOS = document.getElementById('label-sos-state');
    if (btnSOS && labelSOS) {
      btnSOS.addEventListener('click', () => {
        this.state.sos_anomaly = this.state.sos_anomaly === 1 ? 0 : 1;
        this.updateSOSUI();
        this.sendTelemetry();
      });
    }

    // Water Ingress Toggle
    const btnWater = document.getElementById('toggle-water');
    const labelWater = document.getElementById('label-water-state');
    if (btnWater && labelWater) {
      btnWater.addEventListener('click', () => {
        this.state.water_detected = this.state.water_detected === 1 ? 0 : 1;
        this.updateWaterUI();
        this.sendTelemetry();
      });
    }
  }

  updateSOSUI() {
    const btn = document.getElementById('toggle-sos');
    const label = document.getElementById('label-sos-state');
    if (!btn || !label) return;

    if (this.state.sos_anomaly === 1) {
      btn.className = 'p-3 rounded bg-red-950/70 border border-red-500 text-left active:scale-95 transition-all flex flex-col justify-between min-h-[70px] shadow-[0_0_15px_rgba(244,67,54,0.4)]';
      label.className = 'font-mono text-sm font-bold text-red-300 animate-pulse';
      label.textContent = 'SOS KNOCK: ACTIVE!';
    } else {
      btn.className = 'p-3 rounded bg-[#131A24] border border-[#232F42] text-left active:scale-95 transition-all flex flex-col justify-between min-h-[70px]';
      label.className = 'font-mono text-sm font-bold text-gray-300';
      label.textContent = 'SOS KNOCK: OFF';
    }
  }

  updateWaterUI() {
    const btn = document.getElementById('toggle-water');
    const label = document.getElementById('label-water-state');
    if (!btn || !label) return;

    if (this.state.water_detected === 1) {
      btn.className = 'p-3 rounded bg-blue-950/70 border border-blue-500 text-left active:scale-95 transition-all flex flex-col justify-between min-h-[70px] shadow-[0_0_15px_rgba(0,229,255,0.4)]';
      label.className = 'font-mono text-sm font-bold text-blue-300 animate-pulse';
      label.textContent = 'WATER: INGRESS!';
    } else {
      btn.className = 'p-3 rounded bg-[#131A24] border border-[#232F42] text-left active:scale-95 transition-all flex flex-col justify-between min-h-[70px]';
      label.className = 'font-mono text-sm font-bold text-gray-300';
      label.textContent = 'WATER: DRY';
    }
  }

  /**
   * Binds demo presets and idle reset.
   */
  bindPresets() {
    // 1. Nominal Safe
    const btnNominal = document.getElementById('btn-preset-nominal');
    if (btnNominal) {
      btnNominal.addEventListener('click', () => {
        this.state = {
          ...this.state,
          co_ppm: 2.0,
          ch4_pct: 0.2,
          o2_pct: 20.9,
          co2_ppm: 420,
          pitch: 0.0,
          roll: 0.0,
          tremor: 0.02,
          dist_front: 14.5,
          temp: 24.0,
          humidity: 45,
          water_detected: 0,
          sos_anomaly: 0,
        };
        this.syncUIToState();
        this.sendTelemetry();
      });
    }

    // 2. Gas Leak Spike
    const btnGas = document.getElementById('btn-preset-gas');
    if (btnGas) {
      btnGas.addEventListener('click', () => {
        this.state.co_ppm = 78.0;
        this.state.ch4_pct = 2.4;
        this.syncUIToState();
        this.sendTelemetry();
      });
    }

    // 3. Structural Collapse / SOS
    const btnCollapse = document.getElementById('btn-preset-collapse');
    if (btnCollapse) {
      btnCollapse.addEventListener('click', () => {
        this.state.tremor = 0.52;
        this.state.sos_anomaly = 1;
        this.syncUIToState();
        this.sendTelemetry();
      });
    }

    // 4. Water Ingress
    const btnWater = document.getElementById('btn-preset-water');
    if (btnWater) {
      btnWater.addEventListener('click', () => {
        this.state.water_detected = 1;
        this.syncUIToState();
        this.sendTelemetry();
      });
    }

    // 5. Reset to Standby Idle
    const btnReset = document.getElementById('btn-reset-standby');
    if (btnReset) {
      btnReset.addEventListener('click', async () => {
        try {
          await fetch('/api/reset', { method: 'POST' });
          const status = document.getElementById('sync-status');
          if (status) status.textContent = 'DASHBOARD RESET TO STANDBY';
        } catch {
          // Ignore
        }
      });
    }
  }

  /**
   * Synchronizes HTML range inputs and text badges with current this.state.
   */
  syncUIToState() {
    const sync = (id, badgeId, key, suffix, precision) => {
      const slider = document.getElementById(id);
      const badge = document.getElementById(badgeId);
      if (slider && badge && this.state[key] != null) {
        slider.value = this.state[key];
        badge.textContent = `${Number(this.state[key]).toFixed(precision)} ${suffix}`.trim();
      }
    };

    sync('slider-co', 'badge-co', 'co_ppm', 'ppm', 1);
    sync('slider-ch4', 'badge-ch4', 'ch4_pct', '%', 2);
    sync('slider-o2', 'badge-o2', 'o2_pct', '%', 1);
    sync('slider-co2', 'badge-co2', 'co2_ppm', 'ppm', 0);
    sync('slider-pitch', 'badge-pitch', 'pitch', '°', 1);
    sync('slider-roll', 'badge-roll', 'roll', '°', 1);
    sync('slider-tremor', 'badge-tremor', 'tremor', 'G', 2);
    sync('slider-dist', 'badge-dist', 'dist_front', 'm', 1);
    sync('slider-temp', 'badge-temp', 'temp', '°C', 1);
    sync('slider-humidity', 'badge-humidity', 'humidity', '%', 0);

    this.updateSOSUI();
    this.updateWaterUI();
  }

  /**
   * Debounced network dispatch to /api/telemetry.
   */
  sendTelemetry() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(async () => {
      try {
        const res = await fetch('/api/telemetry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.state),
        });
        const status = document.getElementById('sync-status');
        if (res.ok && status) {
          status.textContent = 'TELEMETRY BROADCASTED LIVE';
          status.className = 'text-emerald-400';
        }
      } catch (err) {
        const status = document.getElementById('sync-status');
        if (status) {
          status.textContent = 'NETWORK RETRYING...';
          status.className = 'text-amber-400';
        }
      }
    }, 40);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const controller = new MobileRoverController();
  controller.init();
});
