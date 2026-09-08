/**
 * @file hud-camera.js
 * @description Tactical Camera Feed, Procedural FLIR Synthetic Crawler fallback, and YOLO Bounding Box Tracker.
 * Features: Live webcam streamer, procedural night-vision ruins crawler, military reticles, and open YOLO detection bridge.
 */

import { CONFIG } from './config.js';
import { soundEngine } from './audio-fx.js';

export class HUDCamera {
  constructor(videoElementId, overlayCanvasId, synthCanvasId) {
    this.videoEl = document.getElementById(videoElementId);
    this.mjpegEl = document.getElementById('mjpeg-stream');
    this.canvas = document.getElementById(overlayCanvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.synthCanvas = document.getElementById(synthCanvasId);
    this.synthCtx = this.synthCanvas ? this.synthCanvas.getContext('2d') : null;

    this.isSyntheticMode = false;
    this.isPythonStreamActive = false;
    this.webcamStream = null;
    this.animFrameId = null;

    // External YOLO detection injection buffer
    this.externalDetections = [];
    this.lastDetectionTime = 0;

    // Procedural crawler generator variables
    this.synthTime = 0;
    this.dustParticles = [];
    this.initDustParticles();

    // Expose open bridge hook on window
    window.roverHUD = window.roverHUD || {};
    window.roverHUD.injectDetections = (boxes) => {
      this.updateDetections({ detections: boxes, worker_count: boxes.length });
    };
  }

  /**
   * Initializes dust particles for the synthetic crawler camera.
   */
  initDustParticles() {
    for (let i = 0; i < 35; i++) {
      this.dustParticles.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 2 + 1,
        speedY: Math.random() * 0.003 + 0.001,
        speedX: (Math.random() - 0.5) * 0.002,
        alpha: Math.random() * 0.7 + 0.2,
      });
    }
  }

  /**
   * Boots the camera pipeline. Prioritizes Python RTX GPU stream; falls back to browser webcam or procedural FLIR.
   */
  async init() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Check immediately for Python MINE_RESCUE_PRO.py video & detection stream
    const hasPythonStream = await this.checkPythonStream();

    // Only attempt browser getUserMedia if Python GPU stream is NOT active
    if (!hasPythonStream) {
      await this.startBrowserWebcam();
    }

    // Bind interactive manual feed adjustment sliders (Zoom / Brightness / Reset)
    this.initFeedControls();

    // Continuously check stream health
    setInterval(() => this.checkPythonStream(), 1500);

    this.startLoop();
  }

  /**
   * Binds interactive manual feed adjustment sliders (Scale / Lum / 1.0x Reset).
   */
  initFeedControls() {
    const sliderZoom = document.getElementById('cam-slider-zoom');
    const labelZoom = document.getElementById('cam-val-zoom');
    const sliderBright = document.getElementById('cam-slider-bright');
    const labelBright = document.getElementById('cam-val-bright');
    const btnReset = document.getElementById('btn-cam-reset');

    let currentZoom = 1.0;
    let currentBright = 100;

    const applyFeedTransform = () => {
      const transformStyle = `scale(${currentZoom})`;
      const filterStyle = `brightness(${currentBright}%)`;
      if (this.mjpegEl) {
        this.mjpegEl.style.transform = transformStyle;
        this.mjpegEl.style.filter = filterStyle;
      }
      if (this.videoEl) {
        this.videoEl.style.transform = transformStyle;
        this.videoEl.style.filter = filterStyle;
      }
    };

    if (sliderZoom && labelZoom) {
      sliderZoom.addEventListener('input', (e) => {
        currentZoom = parseFloat(e.target.value);
        labelZoom.textContent = `${currentZoom.toFixed(2)}x`;
        applyFeedTransform();
      });
    }

    if (sliderBright && labelBright) {
      sliderBright.addEventListener('input', (e) => {
        currentBright = parseInt(e.target.value);
        labelBright.textContent = `${currentBright}%`;
        applyFeedTransform();
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        currentZoom = 1.0;
        currentBright = 100;
        if (sliderZoom) sliderZoom.value = '1.0';
        if (labelZoom) labelZoom.textContent = '1.0x';
        if (sliderBright) sliderBright.value = '100';
        if (labelBright) labelBright.textContent = '100%';
        applyFeedTransform();
      });
    }
  }

  /**
   * Starts local browser webcam capture if Python stream is offline.
   */
  async startBrowserWebcam() {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        this.webcamStream = stream;
        if (this.videoEl) {
          this.videoEl.srcObject = stream;
          await this.videoEl.play();
          this.videoEl.style.display = 'block';
        }
        this.isSyntheticMode = false;
      } else {
        this.enableSyntheticFallback();
      }
    } catch {
      this.enableSyntheticFallback();
    }
  }

  /**
   * Stops local browser webcam capture to free the camera device for Python.
   */
  stopBrowserWebcam() {
    if (this.webcamStream) {
      this.webcamStream.getTracks().forEach(track => track.stop());
      this.webcamStream = null;
    }
    if (this.videoEl) {
      this.videoEl.srcObject = null;
      this.videoEl.style.display = 'none';
    }
  }

  /**
   * Activates procedural FLIR night-vision simulation.
   */
  enableSyntheticFallback() {
    this.isSyntheticMode = true;
    if (this.videoEl) {
      this.videoEl.style.display = 'none';
    }
    if (this.synthCanvas) {
      this.synthCanvas.style.display = 'block';
    }
    const modeBadge = document.getElementById('camera-mode-badge');
    if (modeBadge) {
      modeBadge.textContent = 'MODE: FLIR SYNTHETIC';
      modeBadge.className = 'text-xs font-mono text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/60';
    }
  }

  /**
   * Toggles between Real Webcam and Synthetic FLIR Crawler Feed.
   */
  async toggleCameraMode() {
    soundEngine.playClick();
    if (this.isSyntheticMode) {
      // Switch to real webcam
      if (!this.webcamStream) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          this.webcamStream = stream;
          if (this.videoEl) {
            this.videoEl.srcObject = stream;
            await this.videoEl.play();
          }
        } catch {
          alert('Webcam access was denied or no camera device found. Keeping FLIR Simulation.');
          return;
        }
      }
      this.isSyntheticMode = false;
      if (this.videoEl) this.videoEl.style.display = 'block';
      if (this.synthCanvas) this.synthCanvas.style.display = 'none';
      const modeBadge = document.getElementById('camera-mode-badge');
      if (modeBadge) {
        modeBadge.textContent = 'MODE: REAL WEBCAM';
        modeBadge.className = 'text-xs font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/60';
      }
    } else {
      this.enableSyntheticFallback();
    }
  }

  /**
   * Scales overlay canvas resolution to match pixel density.
   */
  resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;

    if (this.synthCanvas) {
      this.synthCanvas.width = rect.width * dpr;
      this.synthCanvas.height = rect.height * dpr;
      this.synthCanvas.style.width = `${rect.width}px`;
      this.synthCanvas.style.height = `${rect.height}px`;
    }
  }

  /**
   * Updates telemetry stats used in the HUD camera overlay.
   */
  updateTelemetry(telemetry) {
    this.telemetrySnapshot = {
      battery_pct: telemetry.battery_pct,
      internal_temp: telemetry.internal_temp,
      speed_kmh: telemetry.speed_kmh,
      heading_deg: telemetry.heading_deg,
    };
  }

  /**
   * Main render loop (throttled to 30 FPS to eliminate browser thread lag).
   */
  startLoop() {
    let lastRender = 0;
    const loop = (timestamp) => {
      if (timestamp - lastRender >= 33) {
        lastRender = timestamp;
        this.render();
      }
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  /**
   * Master frame renderer.
   */
  render() {
    if (!this.ctx || !this.canvas) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (w === 0 || h === 0) return;

    // 1. If in Synthetic Mode, render procedural FLIR night-vision terrain crawler
    if (this.isSyntheticMode && this.synthCtx && this.synthCanvas) {
      this.renderProceduralFLIR();
    }

    // When Python stream is active, boxes & HUD are baked into frames by GPU engine.
    // Avoid clearing canvas every frame to keep browser main thread completely idle.
    if (this.isPythonStreamActive) {
      if (!this._overlayCleared) {
        this.ctx.clearRect(0, 0, w, h);
        this._overlayCleared = true;
      }
      return;
    }

    this._overlayCleared = false;
    this.ctx.clearRect(0, 0, w, h);
    this.renderYOLOTracking(w, h);
  }

  /**
   * Procedural FLIR thermal / night-vision ruins simulation.
   */
  renderProceduralFLIR() {
    const ctx = this.synthCtx;
    const w = this.synthCanvas.width;
    const h = this.synthCanvas.height;
    this.synthTime += 0.02;

    // Dark subterranean gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#04070a');
    bgGrad.addColorStop(0.5, '#08121a');
    bgGrad.addColorStop(1, '#0e242b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Rover spotlight cone
    const spotX = w * 0.5 + Math.sin(this.synthTime * 0.4) * (w * 0.05);
    const spotY = h * 0.55;
    const spotGrad = ctx.createRadialGradient(spotX, spotY, 20, spotX, spotY, w * 0.6);
    spotGrad.addColorStop(0, 'rgba(0, 229, 255, 0.18)');
    spotGrad.addColorStop(0.4, 'rgba(0, 160, 180, 0.08)');
    spotGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = spotGrad;
    ctx.fillRect(0, 0, w, h);

    // Procedural terrain rubble floor (perspective grid lines)
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.12)';
    ctx.lineWidth = 1;
    const horizon = h * 0.45;

    // Rolling forward crawl motion offset
    const crawlOffset = (this.synthTime * 60) % 40;

    // Horizontal floor grid lines
    for (let y = horizon; y < h; y += 22) {
      const actualY = y + crawlOffset * ((y - horizon) / h);
      if (actualY <= h) {
        ctx.beginPath();
        ctx.moveTo(0, actualY);
        ctx.lineTo(w, actualY);
        ctx.stroke();
      }
    }

    // Perspective depth rays converging to vanishing point
    const vpX = w * 0.5;
    for (let x = -w * 0.4; x <= w * 1.4; x += w * 0.12) {
      ctx.beginPath();
      ctx.moveTo(vpX, horizon);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Thermal signature silhouette of trapped survivor in distance
    const heatX = w * 0.62 + Math.sin(this.synthTime * 0.3) * 12;
    const heatY = h * 0.46;
    const survivorHeat = ctx.createRadialGradient(heatX, heatY, 5, heatX, heatY, 35);
    survivorHeat.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
    survivorHeat.addColorStop(0.3, 'rgba(255, 152, 0, 0.7)');
    survivorHeat.addColorStop(0.7, 'rgba(244, 67, 54, 0.3)');
    survivorHeat.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = survivorHeat;
    ctx.beginPath();
    ctx.arc(heatX, heatY, 35, 0, Math.PI * 2);
    ctx.fill();

    // Floating subterranean dust & rubble particles
    for (const p of this.dustParticles) {
      p.y += p.speedY;
      p.x += p.speedX;
      if (p.y > 1) p.y = 0;
      if (p.x < 0) p.x = 1;
      if (p.x > 1) p.x = 0;

      ctx.fillStyle = `rgba(0, 229, 255, ${p.alpha * 0.4})`;
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Renders the tactical HUD crosshair, azimuth ticks, and reticle.
   */
  renderTacticalCrosshair(w, h) {
    const ctx = this.ctx;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const dpr = window.devicePixelRatio || 1;

    ctx.save();
    ctx.strokeStyle = CONFIG.THEME.amber;
    ctx.lineWidth = 1.5 * dpr;

    // Center crosshair with center gap
    const gap = 16 * dpr;
    const len = 34 * dpr;

    // Horizontal bars
    ctx.beginPath();
    ctx.moveTo(cx - gap - len, cy);
    ctx.lineTo(cx - gap, cy);
    ctx.moveTo(cx + gap, cy);
    ctx.lineTo(cx + gap + len, cy);

    // Vertical bars
    ctx.moveTo(cx, cy - gap - len);
    ctx.lineTo(cx, cy - gap);
    ctx.moveTo(cx, cy + gap);
    ctx.lineTo(cx, cy + gap + len);
    ctx.stroke();

    // Center circular reticle ticks
    ctx.strokeStyle = 'rgba(255, 152, 0, 0.35)';
    ctx.beginPath();
    ctx.arc(cx, cy, gap * 1.8, 0, Math.PI * 2);
    ctx.stroke();

    // 4 Outer Corner framing brackets
    const pad = 24 * dpr;
    const brLen = 22 * dpr;
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.5)';
    ctx.lineWidth = 2 * dpr;

    // Top-Left
    ctx.beginPath();
    ctx.moveTo(pad, pad + brLen);
    ctx.lineTo(pad, pad);
    ctx.lineTo(pad + brLen, pad);
    // Top-Right
    ctx.moveTo(w - pad - brLen, pad);
    ctx.lineTo(w - pad, pad);
    ctx.lineTo(w - pad, pad + brLen);
    // Bottom-Left
    ctx.moveTo(pad, h - pad - brLen);
    ctx.lineTo(pad, h - pad);
    ctx.lineTo(pad + brLen, h - pad);
    // Bottom-Right
    ctx.moveTo(w - pad - brLen, h - pad);
    ctx.lineTo(w - pad, h - pad);
    ctx.lineTo(w - pad, h - pad - brLen);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Alias for military reticle backwards compatibility.
   */
  renderMilitaryReticle(w, h) {
    this.renderTacticalCrosshair(w, h);
  }

  /**
   * Updates detection array from live Python vision pipeline.
   * @param {object} payload
   */
  updateDetections(payload) {
    if (!payload || !payload.detections) return;
    this.externalDetections = payload.detections;
    this.lastDetectionTime = Date.now();

    const countBadge = document.getElementById('worker-count-badge');
    if (countBadge) {
      if (payload.worker_count > 0) {
        countBadge.textContent = `${payload.worker_count} WORKER${payload.worker_count > 1 ? 'S' : ''}`;
        countBadge.classList.remove('hidden');
        if (payload.closest_distance && payload.closest_distance < 1.5) {
          countBadge.className = 'text-[10px] font-mono text-red-400 bg-red-950/40 px-1.5 py-0.5 rounded border border-red-500 font-bold animate-pulse';
        } else {
          countBadge.className = 'text-[10px] font-mono text-amber-400 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/60 font-bold';
        }
      } else {
        countBadge.classList.add('hidden');
      }
    }
  }

  /**
   * Checks if Python MJPEG video streamer (MINE_RESCUE_PRO.py) is running on port 8081.
   * @returns {Promise<boolean>}
   */
  async checkPythonStream() {
    try {
      const res = await fetch('http://127.0.0.1:8081/api/status', { mode: 'cors' });
      if (res.ok) {
        if (!this.isPythonStreamActive) {
          this.isPythonStreamActive = true;
          // Release any browser webcam lock so Python has exclusive hardware access
          this.stopBrowserWebcam();

          if (this.mjpegEl) {
            this.mjpegEl.src = 'http://127.0.0.1:8081/video_feed';
            this.mjpegEl.classList.remove('hidden');
          }
          if (this.videoEl) this.videoEl.style.display = 'none';
          if (this.synthCanvas) this.synthCanvas.style.display = 'none';

        }
        const data = await res.json();
        this.updateDetections(data);
        return true;
      }
    } catch {
      if (this.isPythonStreamActive) {
        this.isPythonStreamActive = false;
        if (this.mjpegEl) {
          this.mjpegEl.src = '';
          this.mjpegEl.classList.add('hidden');
        }
        this.startBrowserWebcam();
      }
      return false;
    }
    return false;
  }

  /**
   * Renders real-time YOLO Bounding Box brackets, track IDs, and optical distance tags.
   */
  renderYOLOTracking(w, h) {
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;

    // Fade out stale detections if no new packets received for > 1.2s
    if (Date.now() - this.lastDetectionTime > 1200) {
      this.externalDetections = [];
    }

    if (!this.externalDetections || this.externalDetections.length === 0) {
      return;
    }

    ctx.save();
    for (const target of this.externalDetections) {
      const bx = (target.norm_x != null ? target.norm_x : target.x) * w;
      const by = (target.norm_y != null ? target.norm_y : target.y) * h;
      const bw = (target.norm_w != null ? target.norm_w : target.w) * w;
      const bh = (target.norm_h != null ? target.norm_h : target.h) * h;
      const dist = target.dist_m || target.dist;
      const isClose = typeof dist === 'number' && dist < 1.5;
      const color = isClose ? CONFIG.THEME.emergencyRed : CONFIG.THEME.amber;
      const corner = Math.min(18 * dpr, bw * 0.25);

      // Corner brackets
      ctx.strokeStyle = color;
      ctx.lineWidth = 2 * dpr;

      // TL
      ctx.beginPath();
      ctx.moveTo(bx, by + corner);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx + corner, by);
      // TR
      ctx.moveTo(bx + bw - corner, by);
      ctx.lineTo(bx + bw, by);
      ctx.lineTo(bx + bw, by + corner);
      // BL
      ctx.moveTo(bx, by + bh - corner);
      ctx.lineTo(bx, by + bh);
      ctx.lineTo(bx + corner, by + bh);
      // BR
      ctx.moveTo(bx + bw - corner, by + bh);
      ctx.lineTo(bx + bw, by + bh);
      ctx.lineTo(bx + bw, by + bh - corner);
      ctx.stroke();

      // Transparent box tint
      ctx.fillStyle = isClose ? 'rgba(244, 67, 54, 0.08)' : 'rgba(255, 152, 0, 0.06)';
      ctx.fillRect(bx, by, bw, bh);

      // Header Tag Badge
      const labelText = `[ID:#${target.id}] ${target.label} ${target.conf}%`;
      ctx.font = `${Math.floor(10 * dpr)}px 'JetBrains Mono', monospace`;
      const textMetrics = ctx.measureText(labelText);
      const tagH = 18 * dpr;
      const tagW = textMetrics.width + 12 * dpr;

      ctx.fillStyle = '#0B0E14';
      ctx.fillRect(bx, by - tagH, tagW, tagH);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1 * dpr;
      ctx.strokeRect(bx, by - tagH, tagW, tagH);

      ctx.fillStyle = color;
      ctx.fillText(labelText, bx + 6 * dpr, by - 5 * dpr);

      // Distance tag in bottom corner
      if (dist != null) {
        ctx.fillStyle = isClose ? '#F44336' : '#00E5FF';
        ctx.font = `bold ${Math.floor(9 * dpr)}px 'JetBrains Mono', monospace`;
        ctx.fillText(`DIST: ${dist}m`, bx + 4 * dpr, by + bh - 6 * dpr);
      }
    }
    ctx.restore();
  }
}
