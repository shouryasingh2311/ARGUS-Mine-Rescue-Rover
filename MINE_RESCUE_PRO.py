#!/usr/bin/env python3
"""
MINE_RESCUE_PRO.py
==================
High-Performance Search & Rescue Tactical Vision Engine.
Optimized for NVIDIA GeForce RTX 4050 Laptop GPU (CUDA).

Features:
  - NVIDIA RTX 4050 GPU Acceleration (FP16, ~5ms inference)
  - Threaded Asynchronous Camera Reader (Zero-latency DirectShow capture)
  - Multi-Threaded HTTP Server (ThreadingHTTPServer for concurrent MJPEG + status)
  - Human Body & Worker Detection (YOLO best.pt on GPU)
  - Human Face Tracking (Haar Cascade Frontal + Profile)
  - Safety Gear Color Segmentation (Helmets: Yellow/Orange/White, Vests: Neon/Orange/Reflective)
  - Monocular Pinhole Distance Estimation (Calibrated metric distance)
  - Real-Time Tactical HUD Overlay & C2 Telemetry Push
"""

import sys
import os
import time
import json
import socket
import threading
import queue
import urllib.request
import numpy as np
import cv2
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler


# ─── Windows High Performance & Anti-Throttling Hook ──────────────────────────
if sys.platform == 'win32':
    try:
        import ctypes
        from ctypes import wintypes

        kernel32 = ctypes.windll.kernel32
        h_proc = kernel32.GetCurrentProcess()

        # 1. Set High Priority Class (0x00000080) to prevent background scheduling deprioritization
        kernel32.SetPriorityClass(h_proc, 0x00000080)

        # 2. Disable Windows 11 EcoQoS (Power Throttling)
        class PROCESS_POWER_THROTTLING_STATE(ctypes.Structure):
            _fields_ = [
                ("Version", wintypes.DWORD),
                ("ControlMask", wintypes.DWORD),
                ("StateMask", wintypes.DWORD),
            ]

        throttle = PROCESS_POWER_THROTTLING_STATE()
        throttle.Version = 1
        throttle.ControlMask = 0x1 | 0x4  # EXECUTION_SPEED | IGNORE_TIMER_RESOLUTION
        throttle.StateMask = 0            # 0 turns off throttling
        try:
            kernel32.SetProcessInformation(h_proc, 36, ctypes.byref(throttle), ctypes.sizeof(throttle))
        except Exception:
            pass

        # 3. Request 1ms high-precision multimedia timer
        try:
            ctypes.windll.winmm.timeBeginPeriod(1)
        except Exception:
            pass

        # 4. Prevent background execution throttling
        try:
            kernel32.SetThreadExecutionState(0x80000001)
        except Exception:
            pass
            
        print("[+] Windows High Priority & EcoQoS Power-Throttling Bypass Engaged.")
    except Exception as e:
        print(f"[!] Warning configuring Windows performance profile: {e}")


# ─── Custom JSON Encoder for NumPy Types ───────────────────────────────────────
class NumpySafeEncoder(json.JSONEncoder):
    """Encodes NumPy primitive types and ndarrays into standard JSON."""
    def default(self, obj):
        if isinstance(obj, (np.integer,)):
            return int(obj)
        if isinstance(obj, (np.floating,)):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super().default(obj)


# ─── Global Configuration ──────────────────────────────────────────────────────
CAMERA_INDEX = 0
HTTP_STREAM_PORT = 8081
HUD_TELEMETRY_ENDPOINT = 'http://127.0.0.1:8080/api/detections'
CONFIDENCE_THRESHOLD = 0.35

# Monocular Pinhole Camera Distance Parameters
AVERAGE_HUMAN_HEIGHT_M = 1.70
AVERAGE_FACE_HEIGHT_M = 0.22
CALIBRATED_FOCAL_LENGTH_PX = 720.0  # Normalized for 720p height

# Global Shared Buffers & Threading Controls
frame_lock = threading.Lock()
frame_condition = threading.Condition()
frame_seq = 0
latest_jpeg_bytes = None
latest_telemetry_payload = {
    "worker_count": 0,
    "gear_count": 0,
    "closest_distance": None,
    "detections": [],
    "fps": 0.0,
    "gpu": "NVIDIA GeForce RTX 4050"
}
is_running = True

# Track ID State for Persistent Annotations
_next_track_id = 1
_tracked_centroids = {}  # (cx, cy) -> id


# ─── GPU YOLO Model Setup ──────────────────────────────────────────────────────
HAS_GPU = False
HAS_YOLO = False
model = None

try:
    import torch
    if torch.cuda.is_available():
        HAS_GPU = True
        gpu_name = torch.cuda.get_device_name(0)
        print(f"[+] CUDA Enabled: {gpu_name} (Device 0)")
    else:
        print("[!] CUDA not available, falling back to CPU")
except ImportError:
    print("[!] PyTorch not found")

try:
    from ultralytics import YOLO
    MODEL_PATH = 'best.pt'
    if os.path.exists(MODEL_PATH):
        model = YOLO(MODEL_PATH)
        if HAS_GPU:
            model.to('cuda')
            # Warm up CUDA context & FP16 engine to eliminate cold-start bottleneck
            dummy = np.zeros((480, 640, 3), dtype=np.uint8)
            for _ in range(3):
                model.predict(dummy, device=0, half=True, verbose=False)
            print("[+] YOLO best.pt loaded and warmed up on NVIDIA RTX 4050 GPU (FP16)")
        else:
            print("[+] YOLO best.pt loaded on CPU")
        HAS_YOLO = True
    else:
        print(f"[!] {MODEL_PATH} not found, relying on cascade and color tracking")
except Exception as e:
    print(f"[!] Error loading YOLO model: {e}")


# ─── OpenCV Cascade Setup for Face Detection ──────────────────────────────────
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
profile_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_profileface.xml')
upperbody_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_upperbody.xml')
print("[+] Haar cascades loaded: Frontal Face, Profile Face, Upper Body")


# ─── Safety Gear Color Ranges (HSV) ───────────────────────────────────────────
SAFETY_GEAR_COLORS = {
    'HELMET_YELLOW': {
        'label': 'HELMET',
        'color_bgr': (0, 255, 255),       # Yellow BGR
        'color_hex': '#FFFF00',
        'ranges': [
            (np.array([18, 80, 100]), np.array([35, 255, 255])),
        ],
        'min_area': 500,
        'aspect_ratio': (0.5, 2.2),
    },
    'HELMET_ORANGE': {
        'label': 'HELMET',
        'color_bgr': (0, 140, 255),       # Safety Orange BGR
        'color_hex': '#FF8C00',
        'ranges': [
            (np.array([8, 110, 120]), np.array([22, 255, 255])),
        ],
        'min_area': 500,
        'aspect_ratio': (0.5, 2.2),
    },
    'HELMET_WHITE': {
        'label': 'HELMET',
        'color_bgr': (250, 250, 250),     # White BGR
        'color_hex': '#FFFFFF',
        'ranges': [
            (np.array([0, 0, 200]), np.array([180, 35, 255])),
        ],
        'min_area': 1200,
        'aspect_ratio': (0.7, 1.4),
    },
    'VEST_HIVIS_YELLOW': {
        'label': 'HI-VIS VEST',
        'color_bgr': (0, 255, 200),       # Neon Yellow-Green BGR
        'color_hex': '#C8FF00',
        'ranges': [
            (np.array([25, 80, 80]), np.array([45, 255, 255])),
        ],
        'min_area': 1500,
        'aspect_ratio': (0.3, 1.8),
    },
    'VEST_SAFETY_ORANGE': {
        'label': 'HI-VIS VEST',
        'color_bgr': (0, 100, 255),       # Safety Orange BGR
        'color_hex': '#FF6400',
        'ranges': [
            (np.array([4, 120, 120]), np.array([18, 255, 255])),
        ],
        'min_area': 1500,
        'aspect_ratio': (0.3, 1.8),
    },
    'REFLECTIVE_STRIP': {
        'label': 'REFLECTIVE',
        'color_bgr': (210, 210, 210),     # Silver Reflective BGR
        'color_hex': '#C0C0C0',
        'ranges': [
            (np.array([0, 0, 215]), np.array([180, 30, 255])),
        ],
        'min_area': 250,
        'aspect_ratio': (1.8, 20.0),
    },
}


# ─── Threaded Camera Reader ───────────────────────────────────────────────────
class ThreadedCamera:
    """
    Asynchronous frame grabber running on a dedicated background thread.
    Configured with DirectShow, FOURCC MJPG, and 30 FPS for high-throughput video acquisition.
    """
    def __init__(self, src=0):
        # Open with DirectShow backend for immediate access on Windows
        self.cap = cv2.VideoCapture(src, cv2.CAP_DSHOW)
        self.cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*'MJPG'))
        self.cap.set(cv2.CAP_PROP_FPS, 30)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Discard old queued frames

        self.ret, self.frame = self.cap.read()
        self.lock = threading.Lock()
        self.stopped = False
        self.frame_id = 0

        if not self.cap.isOpened():
            print(f"[!] Warning: Could not open camera {src} via DirectShow. Retrying default backend...")
            self.cap = cv2.VideoCapture(src)
            self.ret, self.frame = self.cap.read()

        threading.Thread(target=self._reader_loop, daemon=True).start()

    def _reader_loop(self):
        while not self.stopped:
            ret, frame = self.cap.read()
            if ret and frame is not None:
                with self.lock:
                    self.ret = ret
                    self.frame = frame
                    self.frame_id += 1
            else:
                time.sleep(0.005)

    def read(self):
        with self.lock:
            if self.frame is not None:
                return self.ret, self.frame.copy(), self.frame_id
            return False, None, 0

    def release(self):
        self.stopped = True
        time.sleep(0.1)
        self.cap.release()


# ─── Image Processing & Low-Light Enhancement ──────────────────────────────────
def enhance_low_light(frame: np.ndarray) -> np.ndarray:
    """
    Ultra-fast adaptive low-light enhancement.
    Checks luminance on a 64x36 thumbnail (~0.03ms).
    If ambient light is sufficient, returns original frame directly (0ms overhead).
    If dim, applies fast YCrCb CLAHE (~4ms vs 18.5ms LAB).
    """
    thumb = cv2.resize(frame, (64, 36), interpolation=cv2.INTER_NEAREST)
    mean_lum = float(np.mean(thumb))
    if mean_lum >= 80.0:
        return frame

    ycrcb = cv2.cvtColor(frame, cv2.COLOR_BGR2YCrCb)
    y, cr, cb = cv2.split(ycrcb)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    y = clahe.apply(y)
    return cv2.cvtColor(cv2.merge((y, cr, cb)), cv2.COLOR_YCrCb2BGR)


# ─── Pinhole Distance Estimation ───────────────────────────────────────────────
def estimate_body_distance(box_h_px: float, frame_h_px: float) -> float:
    """Estimates distance to person from body bounding box height."""
    if box_h_px <= 2.0:
        return 20.0
    eff_focal = CALIBRATED_FOCAL_LENGTH_PX * (frame_h_px / 720.0)
    dist = (AVERAGE_HUMAN_HEIGHT_M * eff_focal) / box_h_px
    return round(float(np.clip(dist, 0.4, 25.0)), 1)


def estimate_face_distance(face_h_px: float, frame_h_px: float) -> float:
    """Estimates distance to person from face bounding box height."""
    if face_h_px <= 2.0:
        return 15.0
    eff_focal = CALIBRATED_FOCAL_LENGTH_PX * (frame_h_px / 720.0)
    dist = (AVERAGE_FACE_HEIGHT_M * eff_focal) / face_h_px
    return round(float(np.clip(dist, 0.3, 15.0)), 1)


# ─── Multi-Target Centroid Tracking ────────────────────────────────────────────
def assign_track_id(cx: int, cy: int, max_distance: int = 90) -> int:
    """Assigns persistent tracking ID based on nearest centroid matching."""
    global _next_track_id, _tracked_centroids

    best_id = None
    min_d = max_distance

    for (tx, ty), tid in list(_tracked_centroids.items()):
        d = ((cx - tx) ** 2 + (cy - ty) ** 2) ** 0.5
        if d < min_d:
            min_d = d
            best_id = tid

    if best_id is not None:
        _tracked_centroids = {k: v for k, v in _tracked_centroids.items() if v != best_id}
        _tracked_centroids[(cx, cy)] = best_id
        return best_id
    else:
        tid = _next_track_id
        _next_track_id += 1
        _tracked_centroids[(cx, cy)] = tid
        return tid


# ─── Asynchronous Facial Detection Worker ─────────────────────────────────────
_face_input_queue = queue.Queue(maxsize=1)
_latest_faces_lock = threading.Lock()
_latest_faces = []


def _face_worker_loop():
    """
    Dedicated background worker for facial recognition.
    Runs asynchronously so the primary camera stream and YOLO GPU pipeline
    never stall, even during intensive omni-directional cascade searches.
    """
    global _latest_faces
    while is_running:
        try:
            gray_small = _face_input_queue.get(timeout=0.1)
        except queue.Empty:
            continue

        sh, sw = gray_small.shape[:2]
        dets = []

        # 1. Frontal face detection (scaleFactor=1.22, minSize=22x22 -> ~3-5ms on 320x180)
        frontal = face_cascade.detectMultiScale(gray_small, scaleFactor=1.22, minNeighbors=3, minSize=(22, 22))
        for (x, y, fw, fh) in frontal:
            dets.append((int(x * 4), int(y * 4), int(fw * 4), int(fh * 4), 'FACE'))

        if len(dets) == 0:
            # 2. Profile face detection fallback
            profiles = profile_cascade.detectMultiScale(gray_small, scaleFactor=1.22, minNeighbors=3, minSize=(22, 22))
            for (x, y, fw, fh) in profiles:
                dets.append((int(x * 4), int(y * 4), int(fw * 4), int(fh * 4), 'FACE'))

        if len(dets) == 0:
            # 3. 90 deg CCW face detection (for tilted or lying-down postures)
            rot_ccw = cv2.rotate(gray_small, cv2.ROTATE_90_COUNTERCLOCKWISE)
            faces_ccw = face_cascade.detectMultiScale(rot_ccw, scaleFactor=1.22, minNeighbors=3, minSize=(22, 22))
            for (rx, ry, rw, rh) in faces_ccw:
                orig_x = sw - (ry + rh)
                orig_y = rx
                orig_w = rh
                orig_h = rw
                dets.append((int(orig_x * 4), int(orig_y * 4), int(orig_w * 4), int(orig_h * 4), 'FACE'))

        if len(dets) == 0:
            # 4. 90 deg CW face detection (for opposite tilt)
            rot_cw = cv2.rotate(gray_small, cv2.ROTATE_90_CLOCKWISE)
            faces_cw = face_cascade.detectMultiScale(rot_cw, scaleFactor=1.22, minNeighbors=3, minSize=(22, 22))
            for (rx, ry, rw, rh) in faces_cw:
                orig_x = ry
                orig_y = sh - (rx + rw)
                orig_w = rh
                orig_h = rw
                dets.append((int(orig_x * 4), int(orig_y * 4), int(orig_w * 4), int(orig_h * 4), 'FACE'))

        with _latest_faces_lock:
            _latest_faces = dets

        _face_input_queue.task_done()


threading.Thread(target=_face_worker_loop, daemon=True).start()



def _has_overlap(x, y, w, h, existing, iou_thresh=0.35):
    for (ex, ey, ew, eh, _) in existing:
        ix1, iy1 = max(x, ex), max(y, ey)
        ix2, iy2 = min(x + w, ex + ew), min(y + h, ey + eh)
        if ix2 > ix1 and iy2 > iy1:
            inter = (ix2 - ix1) * (iy2 - iy1)
            union = (w * h) + (ew * eh) - inter
            if union > 0 and (inter / union) > iou_thresh:
                return True
    return False


# ─── Safety Gear Color Segmentation (Helmets & Vests) ─────────────────────────
def detect_safety_gear_colors(frame: np.ndarray, enhanced: np.ndarray):
    """
    Identifies high-visibility helmets and safety vests using HSV color segmentation.
    Downscaled by 0.5 for fast processing (~3ms).
    """
    h, w = enhanced.shape[:2]
    small = cv2.resize(enhanced, (w // 2, h // 2))
    hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV)
    gear_detections = []

    for gear_id, config in SAFETY_GEAR_COLORS.items():
        mask = np.zeros(hsv.shape[:2], dtype=np.uint8)
        for (lower, upper) in config['ranges']:
            part_mask = cv2.inRange(hsv, lower, upper)
            mask = cv2.bitwise_or(mask, part_mask)

        # Fast morphological clean
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)

        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        min_area = config['min_area'] / 4.0  # scaled area for half resolution
        min_ar, max_ar = config['aspect_ratio']

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < min_area:
                continue
            x, y, cw, ch = cv2.boundingRect(cnt)
            ar = cw / float(max(ch, 1))
            if min_ar <= ar <= max_ar:
                gear_detections.append({
                    'bbox': [int(x * 2), int(y * 2), int((x + cw) * 2), int((y + ch) * 2)],
                    'label': config['label'],
                    'gear_id': gear_id,
                    'color_bgr': config['color_bgr'],
                    'color_hex': config['color_hex'],
                    'area': float(area * 4)
                })

    return gear_detections


# ─── Tactical Military Reticle & HUD Overlay Renderer ─────────────────────────
def draw_tactical_hud(frame: np.ndarray, detections: list, fps: float) -> np.ndarray:
    """
    Renders military tactical brackets, labels, distance tags, and crosshair reticles.
    """
    h, w = frame.shape[:2]
    canvas = frame.copy()

    # 1. Top tactical banner strip
    cv2.rectangle(canvas, (0, 0), (w, 28), (10, 14, 20), -1)
    cv2.line(canvas, (0, 28), (w, 28), (28, 34, 45), 1)

    workers = sum(1 for d in detections if d['type'] in ('WORKER', 'FACE', 'BODY'))
    gear = sum(1 for d in detections if d['type'] in ('HELMET', 'HI-VIS VEST', 'REFLECTIVE'))

    status_str = f"TARGETS: {workers} | GEAR: {gear} | FPS: {fps:.1f}"
    cv2.putText(canvas, status_str, (12, 19), cv2.FONT_HERSHEY_SIMPLEX, 0.44, (0, 229, 255), 1, cv2.LINE_AA)

    # 2. Bounding Boxes & Tactical Corner Brackets
    for det in detections:
        x1, y1, x2, y2 = det['bbox']
        tid = det.get('id', 0)
        label = det['type']
        dist = det.get('dist_m')
        color = det.get('draw_color', (0, 152, 255))

        # Close proximity hazard alert
        if dist is not None and dist < 1.5:
            color = (54, 67, 244)  # Tactical Red

        # Corner bracket geometry
        bw = x2 - x1
        bh = y2 - y1
        corner_len = min(18, max(6, int(bw * 0.22)))
        thick = 2

        # Top-Left
        cv2.line(canvas, (x1, y1), (x1 + corner_len, y1), color, thick)
        cv2.line(canvas, (x1, y1), (x1, y1 + corner_len), color, thick)
        # Top-Right
        cv2.line(canvas, (x2, y1), (x2 - corner_len, y1), color, thick)
        cv2.line(canvas, (x2, y1), (x2, y1 + corner_len), color, thick)
        # Bottom-Left
        cv2.line(canvas, (x1, y2), (x1 + corner_len, y2), color, thick)
        cv2.line(canvas, (x1, y2), (x1, y2 - corner_len), color, thick)
        # Bottom-Right
        cv2.line(canvas, (x2, y2), (x2 - corner_len, y2), color, thick)
        cv2.line(canvas, (x2, y2), (x2, y2 - corner_len), color, thick)

        # Soft box tint fill via fast in-place ROI slice (avoids 1280x720 canvas clone)
        cy1, cy2 = max(0, y1), min(h, y2)
        cx1, cx2 = max(0, x1), min(w, x2)
        if cy2 > cy1 and cx2 > cx1:
            sub = canvas[cy1:cy2, cx1:cx2]
            tint = np.full_like(sub, color, dtype=np.uint8)
            cv2.addWeighted(sub, 0.92, tint, 0.08, 0, dst=sub)

        # Tactical Header Tag
        tag = f"[#{tid}] {label}"
        if dist is not None:
            tag += f" | {dist}m"

        (tw, th), _ = cv2.getTextSize(tag, cv2.FONT_HERSHEY_SIMPLEX, 0.38, 1)
        tag_y = max(y1, th + 8)
        cv2.rectangle(canvas, (x1, tag_y - th - 6), (x1 + tw + 8, tag_y), (10, 14, 20), -1)
        cv2.rectangle(canvas, (x1, tag_y - th - 6), (x1 + tw + 8, tag_y), color, 1)
        cv2.putText(canvas, tag, (x1 + 4, tag_y - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.38, color, 1, cv2.LINE_AA)

    return canvas


# ─── Multi-Threaded MJPEG Video & Telemetry Server ────────────────────────────
class TacticalStreamHandler(BaseHTTPRequestHandler):
    """Handles HTTP MJPEG video feed and JSON status telemetry concurrently."""
    def do_GET(self):
        global latest_jpeg_bytes, latest_telemetry_payload
        if self.path == '/video_feed':
            # Enable TCP_NODELAY to disable Nagle's buffering and push frames immediately
            try:
                self.connection.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
            except Exception:
                pass

            self.send_response(200)
            self.send_header('Content-Type', 'multipart/x-mixed-replace; boundary=frame')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'no-cache, private')
            self.end_headers()

            last_sent_seq = -1
            while is_running:
                seq = frame_seq
                if seq > last_sent_seq and latest_jpeg_bytes is not None:
                    last_sent_seq = seq
                    frame_bytes = latest_jpeg_bytes
                    try:
                        hdr = b'--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ' + str(len(frame_bytes)).encode('ascii') + b'\r\n\r\n'
                        self.wfile.write(hdr + frame_bytes + b'\r\n')
                        self.wfile.flush()
                    except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError, socket.error):
                        break
                else:
                    time.sleep(0.003)

        elif self.path == '/api/status':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            with frame_lock:
                json_data = json.dumps(latest_telemetry_payload, cls=NumpySafeEncoder)
            try:
                self.wfile.write(json_data.encode('utf-8'))
            except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError, socket.error):
                pass
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        # Silence verbose HTTP server access logs
        return


def run_http_server(port=HTTP_STREAM_PORT):
    """Boots multi-threaded HTTP server so video streaming never blocks status queries."""
    server = ThreadingHTTPServer(('0.0.0.0', port), TacticalStreamHandler)
    server.daemon_threads = True
    threading.Thread(target=server.serve_forever, daemon=True).start()
    print(f"[+] Multi-threaded MJPEG Server live at http://127.0.0.1:{port}/video_feed")


# ─── Push Telemetry to Rover C2 Dashboard ──────────────────────────────────────
_telemetry_queue = queue.Queue(maxsize=1)


def _telemetry_worker():
    """Background worker daemon to push C2 telemetry without thread spawn overhead."""
    while is_running:
        try:
            payload = _telemetry_queue.get(timeout=0.25)
            push_c2_telemetry(payload)
            _telemetry_queue.task_done()
        except queue.Empty:
            continue
        except Exception:
            pass


threading.Thread(target=_telemetry_worker, daemon=True).start()


def push_c2_telemetry(payload):
    """Pushes live detection counts and hazard alerts to the Node.js C2 relay."""
    try:
        req = urllib.request.Request(
            HUD_TELEMETRY_ENDPOINT,
            data=json.dumps(payload, cls=NumpySafeEncoder).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=0.25):
            pass
    except Exception:
        pass


# ─── Master Vision Engine Loop ────────────────────────────────────────────────
def main():
    global latest_jpeg_bytes, latest_telemetry_payload, is_running, frame_seq

    print("=" * 68)
    print("  RESCUE ROVER C2 // TACTICAL VISION ENGINE v3.0 [RTX 4050 ACCELERATED]")
    print("  Workers (YOLO) | Faces (Haar) | Helmets & Vests (Color) | Distance")
    print("=" * 68)

    # 1. Start HTTP Server
    run_http_server(HTTP_STREAM_PORT)

    # 2. Start Threaded Camera Reader
    print(f"[*] Initializing camera {CAMERA_INDEX} via DirectShow...")
    cam = ThreadedCamera(src=CAMERA_INDEX)
    time.sleep(0.5)

    print("[+] Vision Engine active and tracking. Press Ctrl+C to terminate.")

    prev_time = time.time()
    last_telemetry_push = 0.0
    last_processed_fid = -1
    frame_idx = 0
    cached_faces = []
    cached_gear = []
    fps_smooth = 20.0

    try:
        while is_running:
            ok, frame, fid = cam.read()
            if not ok or frame is None or fid == last_processed_fid:
                time.sleep(0.002)
                continue
            last_processed_fid = fid
            frame_idx += 1

            frame_h, frame_w = frame.shape[:2]

            # 1. Low-light CLAHE enhancement
            t_start = time.perf_counter()
            enhanced = enhance_low_light(frame)
            t_clahe = (time.perf_counter() - t_start) * 1000

            all_detections = []
            closest_dist = None

            # 2. Worker Body Detection via YOLO on RTX 4050 GPU (every frame)
            t_yolo_0 = time.perf_counter()
            if HAS_YOLO and model is not None:
                try:
                    # Run on CUDA with FP16 half precision and 640 standard tensor
                    results = model.predict(
                        source=enhanced,
                        device=0 if HAS_GPU else 'cpu',
                        half=HAS_GPU,
                        imgsz=640,
                        conf=CONFIDENCE_THRESHOLD,
                        verbose=False
                    )
                    if results and len(results) > 0 and results[0].boxes is not None:
                        boxes = results[0].boxes
                        for i in range(len(boxes)):
                            b = boxes[i]
                            xyxy = b.xyxy[0].cpu().numpy().astype(int)
                            conf = int(b.conf[0].item() * 100)
                            box_h = int(xyxy[3] - xyxy[1])
                            dist = estimate_body_distance(box_h, frame_h)

                            cx = int((xyxy[0] + xyxy[2]) // 2)
                            cy = int((xyxy[1] + xyxy[3]) // 2)
                            tid = assign_track_id(cx, cy)

                            if closest_dist is None or dist < closest_dist:
                                closest_dist = dist

                            all_detections.append({
                                'id': int(tid),
                                'type': 'WORKER',
                                'conf': int(conf),
                                'dist_m': float(dist),
                                'bbox': [int(xyxy[0]), int(xyxy[1]), int(xyxy[2]), int(xyxy[3])],
                                'draw_color': (0, 152, 255),  # Tactical Amber
                                'norm_x': float(xyxy[0] / frame_w),
                                'norm_y': float(xyxy[1] / frame_h),
                                'norm_w': float((xyxy[2] - xyxy[0]) / frame_w),
                                'norm_h': float(box_h / frame_h),
                            })
                except Exception as e:
                    pass
            t_yolo = (time.perf_counter() - t_yolo_0) * 1000

            # 3. Asynchronous Human Face Detection (dispatched non-blocking to worker thread)
            t_face_0 = time.perf_counter()
            thumb = cv2.resize(enhanced, (frame_w // 4, frame_h // 4), interpolation=cv2.INTER_NEAREST)
            thumb_gray = cv2.cvtColor(thumb, cv2.COLOR_BGR2GRAY)
            thumb_gray = cv2.equalizeHist(thumb_gray)
            try:
                if _face_input_queue.empty():
                    _face_input_queue.put_nowait(thumb_gray)
            except queue.Full:
                pass

            with _latest_faces_lock:
                faces = list(_latest_faces)

            for (fx, fy, fw, fh, ftype) in faces:
                # Deduplicate if face is already inside a detected worker body
                overlaps_worker = False
                for d in all_detections:
                    if d['type'] == 'WORKER':
                        dx1, dy1, dx2, dy2 = d['bbox']
                        if fx >= dx1 - 10 and fy >= dy1 - 10 and (fx + fw) <= dx2 + 10 and (fy + fh) <= dy2 + 10:
                            overlaps_worker = True
                            break
                if overlaps_worker:
                    continue

                cx = int(fx + fw // 2)
                cy = int(fy + fh // 2)
                tid = assign_track_id(cx, cy)

                if ftype == 'FACE':
                    dist = estimate_face_distance(fh, frame_h)
                    draw_col = (0, 229, 255)  # Cyan for Face
                else:
                    dist = estimate_body_distance(fh, frame_h)
                    draw_col = (0, 200, 200)

                if closest_dist is None or dist < closest_dist:
                    closest_dist = dist

                all_detections.append({
                    'id': int(tid),
                    'type': ftype,
                    'conf': 88,
                    'dist_m': float(dist),
                    'bbox': [int(fx), int(fy), int(fx + fw), int(fy + fh)],
                    'draw_color': draw_col,
                    'norm_x': float(fx / frame_w),
                    'norm_y': float(fy / frame_h),
                    'norm_w': float(fw / frame_w),
                    'norm_h': float(fh / frame_h),
                })
            t_face = (time.perf_counter() - t_face_0) * 1000

            # 4. Safety Gear Color Tracking (Helmets & Hi-Vis Vests, strict alternating frame cadence)
            t_gear_0 = time.perf_counter()
            if frame_idx % 2 == 0 or frame_idx < 5:
                cached_gear = detect_safety_gear_colors(frame, enhanced)
            gear_items = cached_gear

            for g in gear_items:
                gx1, gy1, gx2, gy2 = g['bbox']
                cx = int((gx1 + gx2) // 2)
                cy = int((gy1 + gy2) // 2)
                tid = assign_track_id(cx, cy, max_distance=60)

                all_detections.append({
                    'id': int(tid),
                    'type': g['label'],
                    'gear_id': g['gear_id'],
                    'conf': 80,
                    'dist_m': None,
                    'bbox': [int(gx1), int(gy1), int(gx2), int(gy2)],
                    'draw_color': tuple(int(c) for c in g['color_bgr']),
                    'norm_x': float(gx1 / frame_w),
                    'norm_y': float(gy1 / frame_h),
                    'norm_w': float((gx2 - gx1) / frame_w),
                    'norm_h': float((gy2 - gy1) / frame_h),
                })
            t_gear = (time.perf_counter() - t_gear_0) * 1000

            # 5. Measure Loop FPS with exponential moving average
            curr_time = time.time()
            dt = max(0.001, (curr_time - prev_time))
            instant_fps = 1.0 / dt
            prev_time = curr_time
            fps_smooth = 0.85 * fps_smooth + 0.15 * instant_fps
            fps = fps_smooth

            # 6. Draw Full Tactical Overlay
            t_hud_0 = time.perf_counter()
            rendered_frame = draw_tactical_hud(enhanced, all_detections, fps)
            t_hud = (time.perf_counter() - t_hud_0) * 1000

            # 7. Encode to JPEG with optimized quality for fast decoding
            t_enc_0 = time.perf_counter()
            ret, buf = cv2.imencode('.jpg', rendered_frame, [cv2.IMWRITE_JPEG_QUALITY, 68])
            t_enc = (time.perf_counter() - t_enc_0) * 1000

            if frame_idx % 20 == 0:
                print(f"[*] Latencies (ms): YOLO={t_yolo:.1f} Face={t_face:.1f} Gear={t_gear:.1f} HUD={t_hud:.1f} Enc={t_enc:.1f} | dt={dt*1000:.1f}ms => FPS={fps:.1f}")
            if ret:
                worker_count = sum(1 for d in all_detections if d['type'] in ('WORKER', 'FACE', 'BODY'))
                gear_count = sum(1 for d in all_detections if d['type'] in ('HELMET', 'HI-VIS VEST', 'REFLECTIVE'))

                latest_jpeg_bytes = buf.tobytes()
                frame_seq += 1

                with frame_lock:
                    latest_telemetry_payload = {
                        "worker_count": int(worker_count),
                        "gear_count": int(gear_count),
                        "closest_distance": closest_dist,
                        "detections": all_detections,
                        "fps": round(float(fps), 1),
                        "gpu": "NVIDIA GeForce RTX 4050" if HAS_GPU else "CPU"
                    }

            # 8. Push Telemetry to C2 Dashboard at 10Hz via non-blocking queue
            if curr_time - last_telemetry_push >= 0.10:
                try:
                    if not _telemetry_queue.empty():
                        try:
                            _telemetry_queue.get_nowait()
                        except queue.Empty:
                            pass
                    _telemetry_queue.put_nowait(latest_telemetry_payload)
                except queue.Full:
                    pass
                last_telemetry_push = curr_time

    except KeyboardInterrupt:
        print("\n[!] Stopping Vision Engine...")
    finally:
        is_running = False
        cam.release()
        print("[+] Camera released. Vision Engine stopped gracefully.")


if __name__ == '__main__':
    main()
