#!/usr/bin/env python3
"""
Comprehensive Model Test Suite for DiffusionBee
================================================
Tests ALL compatible SD 1.x models with multiple randomly generated prompts.
Auto-detects model compatibility by reading tdict file versions.
Monitors the backend process for errors, fixes issues, and ensures
generated images are registered in the gallery (history.json).

Usage:
  python3 test_all_models.py [--quick] [--model MODEL_ID]

Options:
  --quick       Only run 2 prompts per model instead of 5
  --model       Run only a specific model by ID (e.g. Default_SD1.5)
"""

from __future__ import annotations

import json
import os
import queue
import random
import subprocess
import sys
import threading
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# ── Paths ───────────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent
BACKEND_DIR = PROJECT_ROOT / "backends" / "stable_diffusion"
VENV_PYTHON = BACKEND_DIR / "venv311" / "bin" / "python3"
BACKEND_SCRIPT = BACKEND_DIR / "diffusionbee_backend.py"

DIFFUSIONBEE_HOME = Path.home() / ".diffusionbee"
IMAGES_DIR = DIFFUSIONBEE_HOME / "images"
HISTORY_JSON = DIFFUSIONBEE_HOME / "history.json"


def get_tdict_version(tdict_path: str) -> Optional[int]:
    """Read the ctdict_version from a tdict file to determine model type."""
    try:
        sys.path.insert(0, str(BACKEND_DIR))
        sys.path.insert(0, str(BACKEND_DIR.parent / "model_converter"))
        from tdict import TDict  # type: ignore
        f = TDict(tdict_path, mode='r')
        ver = f.ctdict_version
        return ver
    except Exception as e:
        print(f"  ⚠️  Could not read tdict version for {Path(tdict_path).name}: {e}")
        return None


def classify_model_tdict_version(version: int) -> str:
    """Classify a tdict version into a model type."""
    v = version % 1000
    if v == 12:
        return "sd_1x"
    elif v == 13:
        return "sd_15_inpaint"
    elif v == 15:
        return "sd_2x"
    elif v == 31:
        return "sdxl"
    else:
        return f"unknown(v{version})"


# ── Discover models from disk ──────────────────────────────────────────────
def _load_registered_assets() -> Dict[str, str]:
    """Load the model ID → asset_path mapping from downloaded_assets.json and local_assets.json."""
    mapping = {}
    for json_path in [DIFFUSIONBEE_HOME / "downloaded_assets.json", DIFFUSIONBEE_HOME / "locally_loaded_assets.json"]:
        if json_path.exists():
            try:
                with open(json_path) as f:
                    data = json.load(f)
                for mid, info in data.items():
                    if isinstance(info, dict) and info.get("asset_path"):
                        mapping[mid] = info["asset_path"]
            except (json.JSONDecodeError, OSError):
                pass
    return mapping


def discover_models() -> Dict[str, dict]:
    """Auto-discover all models in ~/.diffusionbee and classify them.
    Uses downloaded_assets.json for proper model IDs."""
    # Load registered asset mapping
    registered = _load_registered_assets()

    # Build a reverse mapping: path → model ID
    path_to_id = {os.path.realpath(p): mid for mid, p in registered.items()}

    search_dirs = [
        DIFFUSIONBEE_HOME / "downloaded_assets",
        DIFFUSIONBEE_HOME / "imported_models",
    ]

    models = {}
    seen_paths = set()

    for d in search_dirs:
        if not d.exists():
            continue
        for fpath in sorted(d.iterdir()):
            if fpath.suffix not in (".tdict", ".safetensors", ".sqlite"):
                continue
            real_path = str(os.path.realpath(fpath))
            if real_path in seen_paths:
                continue
            seen_paths.add(real_path)

            # Look up model ID from registered assets, fall back to filename heuristic
            if real_path in path_to_id:
                model_id = path_to_id[real_path]
            else:
                # Extract model ID from filename: "ID_filename.tdict"
                parts = fpath.name.split("_", 1)
                model_id = parts[0]
                # Remove file extension artifacts
                model_id = model_id.replace(".safetensors", "").replace(".tdict", "")

            # Read tdict version to determine compatibility
            tdict_ver = get_tdict_version(str(fpath))
            model_type = classify_model_tdict_version(tdict_ver) if tdict_ver else "unknown"

            # Check if this backend supports this model type
            # Current TF interface supports: sd_1x, sd_2x, sd_1x_inpaint, sd_1x_controlnet
            supported = model_type in ("sd_1x",)
            can_test = supported and (tdict_ver is not None)

            skip_reason = None
            if not can_test:
                if model_type == "sdxl":
                    skip_reason = "SDXL requires a separate backend (not yet integrated with current TF interface)"
                elif model_type in ("sd_2x",):
                    skip_reason = "SD 2.x support not available in current ModelInterface"
                elif model_type == "unknown":
                    skip_reason = "Could not determine model type"
                else:
                    skip_reason = f"Model type '{model_type}' not supported by current backend"

            # Estimate precision from metadata or filename
            precision = "unknown"
            fname_lower = fpath.name.lower()
            if "float16" in fname_lower or "fp16" in fname_lower:
                precision = "float16"
            elif "float32" in fname_lower or "fp32" in fname_lower:
                precision = "float32"
            elif "float8" in fname_lower or "fp8" in fname_lower or "8bit" in fname_lower:
                precision = "float8"
            elif "bfloat16" in fname_lower or "bf16" in fname_lower:
                precision = "bfloat16"
            elif "q5p" in fname_lower:
                precision = "q5p"

            models[model_id] = {
                "id": model_id,
                "path": str(fpath),
                "filename": fpath.name,
                "type": model_type,
                "tdict_version": tdict_ver,
                "precision": precision,
                "can_test": can_test,
                "skip_reason": skip_reason,
                "file_size_gb": fpath.stat().st_size / (1024 ** 3),
            }

    return models


# ── Random prompt templates ─────────────────────────────────────────────────
PROMPT_TEMPLATES = [
    "A serene {adj} {landscape} at {time}, {detail}, {style}",
    "A {adj} {weather} scene over a {landscape}, {detail}, {style}",
    "Macro photography of a {adj} {flower} with {detail}, {style}",
    "A {adj} {building_style} building in {setting}, {time}, {detail}, {style}",
    "An {adj} {city_feature} at {time}, {detail}, {style}",
    "A {adj} {fantasy_creature} in a {setting}, {detail}, {style}",
    "A {adj} {sci_fi_setting}, {detail}, {style}",
    "Portrait of a {adj} {character} with {detail}, {style}",
    "A {adj} {occupation} working in a {setting}, {detail}, {style}",
    "A {adj} {object} on a {surface}, {detail}, {style}",
    "Still life of {still_life_items}, {detail}, {style}",
    "Abstract representation of {abstract_concept}, {detail}, {style}",
    "Geometric pattern of {geometric_shapes}, {detail}, {style}",
]

PROMPT_VALUES = {
    "adj": [
        "peaceful", "majestic", "misty", "vibrant", "moody", "serene",
        "dramatic", "enchanting", "tranquil", "breathtaking", "golden",
        "foggy", "lush", "ancient", "futuristic", "cozy", "mysterious",
    ],
    "landscape": [
        "mountain range", "coastal cliff", "forest path", "rolling hills",
        "desert canyon", "waterfall", "lavender field", "cherry blossom garden",
        "alpine meadow", "tropical beach", "snowy tundra", "autumn forest",
    ],
    "time": ["sunrise", "golden hour", "twilight", "midnight", "sunset", "dawn", "blue hour"],
    "detail": [
        "highly detailed", "sharp focus", "soft lighting", "volumetric rays",
        "dramatic shadows", "rich colors", "intricate textures", "perfect composition",
        "cinematic lighting", "atmospheric perspective", "bokeh background",
    ],
    "style": [
        "photorealistic", "digital art", "cinematic", "8k quality",
        "award winning photography", "National Geographic style",
        "professional photography", "masterpiece", "ultra detailed",
    ],
    "weather": ["rainy", "snowy", "foggy", "sunny", "stormy", "windy", "misty"],
    "flower": ["rose", "lotus", "sunflower", "orchid", "cherry blossom", "lavender", "tulip field"],
    "building_style": [
        "Victorian", "modernist", "Gothic", "Art Deco", "Japanese",
        "Mediterranean", "brutalist", "glass", "stone", "wooden",
    ],
    "setting": [
        "a quiet neighborhood", "a bustling city", "a rural village",
        "a coastal town", "a mountain valley", "a futuristic cityscape",
        "a medieval village", "a tropical island", "a snowy landscape",
    ],
    "city_feature": [
        "street", "alleyway", "skyline", "market", "bridge", "park",
        "harbor", "plaza", "courtyard", "rooftop garden",
    ],
    "fantasy_creature": [
        "dragon", "phoenix", "unicorn", "griffin", "fairy", "elf",
        "forest spirit", "wolf", "owl", "deer with glowing antlers",
    ],
    "sci_fi_setting": [
        "space station orbiting a gas giant", "cyberpunk city at night",
        "alien planet with two moons", "futuristic laboratory",
        "starship bridge during battle", "underground city",
    ],
    "character": [
        "warrior", "wizard", "explorer", "samurai", "astronaut",
        "sailor", "chef", "musician", "artist", "scholar",
    ],
    "occupation": [
        "painter", "sculptor", "architect", "botanist", "astronomer",
        "chef", "blacksmith", "potter", "cartographer",
    ],
    "object": [
        "vintage camera", "brass telescope", "wooden ship model",
        "crystal glass", "leather journal", "porcelain teapot",
        "antique pocket watch", "handcrafted ceramic vase",
    ],
    "surface": [
        "rustic wooden table", "marble countertop", "velvet cushion",
        "polished oak desk", "stone pedestal", "silk cloth",
    ],
    "still_life_items": [
        "fresh fruit and a wine bottle", "wildflowers in a ceramic jug",
        "coffee beans and a croissant", "seashells and driftwood",
        "books and a candle", "autumn leaves and acorns",
    ],
    "abstract_concept": [
        "time flowing like a river", "the sound of music visualized",
        "emotions as colors", "memories fading into light",
        "the passage of seasons", "chaos and order intertwined",
    ],
    "geometric_shapes": [
        "overlapping circles and triangles", "fractal spirals and hexagons",
        "golden ratio composition", "sacred geometry patterns",
        "colorful concentric rings", "woven lattice structures",
    ],
}


def generate_random_prompt() -> str:
    """Generate a random prompt from templates."""
    template = random.choice(PROMPT_TEMPLATES)
    keys_needed = [k.strip("{}") for k in __import__("re").findall(r"\{(\w+)\}", template)]
    try:
        return template.format(**{k: random.choice(PROMPT_VALUES[k]) for k in keys_needed})
    except (KeyError, IndexError):
        return "A beautiful landscape at sunset, highly detailed, photorealistic"


# ── Backend session management ──────────────────────────────────────────────

class BackendSession:
    """Manages a single backend process for model testing."""

    def __init__(self, timeout: int = 300):
        self.timeout = timeout
        self.proc: Optional[subprocess.Popen] = None
        self.output_lines: List[str] = []
        self.errors: List[str] = []
        self.errors_queue: queue.Queue = queue.Queue()
        self.lock = threading.Lock()

    def start(self) -> bool:
        if not VENV_PYTHON.exists():
            print(f"  ❌ Python not found at {VENV_PYTHON}")
            return False
        if not BACKEND_SCRIPT.exists():
            print(f"  ❌ Backend script not found at {BACKEND_SCRIPT}")
            return False

        env = os.environ.copy()
        env["PYTHONPATH"] = os.pathsep.join([
            str(BACKEND_DIR),
            str(BACKEND_DIR / ".." / "model_converter"),
            str(BACKEND_DIR / ".." / "stable_diffusion_tf_models"),
        ])
        env["TF_CPP_MIN_LOG_LEVEL"] = "3"
        env["PYTHONUNBUFFERED"] = "1"

        self.proc = subprocess.Popen(
            [str(VENV_PYTHON), "-u", str(BACKEND_SCRIPT)],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=str(BACKEND_DIR),
            env=env,
            bufsize=1,
            universal_newlines=True,
        )

        # Drain stderr in background
        threading.Thread(target=self._drain_stderr, daemon=True).start()

        # Wait for ready signal
        ready = self._wait_for_ready()
        if not ready:
            print("  ❌ Backend failed to become ready")
            return False

        print("  ✅ Backend ready")
        return True

    def _drain_stderr(self):
        if not self.proc or not self.proc.stderr:
            return
        try:
            for line in iter(self.proc.stderr.readline, ""):
                if line:
                    line_s = line.strip()
                    with self.lock:
                        self.errors.append(line_s)
                    self.errors_queue.put(line_s)
                    lower = line.lower()
                    if any(w in lower for w in ["error", "traceback", "exception", "fail"]):
                        print(f"  [stderr] ⚠️  {line_s[:200]}")
        except (ValueError, OSError):
            pass

    def _wait_for_ready(self) -> bool:
        if not self.proc or not self.proc.stdout:
            return False
        start = time.time()
        while time.time() - start < self.timeout:
            if self.proc.poll() is not None:
                print(f"  ❌ Backend process exited early with code {self.proc.returncode}")
                self._flush_stderr()
                return False
            try:
                line = self.proc.stdout.readline()
            except (ValueError, OSError):
                return False
            if not line:
                time.sleep(0.1)
                continue
            line = line.strip()
            with self.lock:
                self.output_lines.append(line)
            if "sdbk inrd" in line:
                return True
            if "sdbk mdld" in line:
                elapsed = time.time() - start
                print(f"  [{elapsed:.0f}s] Model loaded")
        return False

    def generate(self, model_path: str, prompt: str, seed: int,
                 steps: int = 20, width: int = 512, height: int = 512,
                 guidance: float = 7.5) -> Optional[str]:
        """Send a generation command and wait for the result."""
        if not self.proc or not self.proc.stdin or not self.proc.stdout:
            return None

        cmd_data = {
            "model_tdict_path": model_path,
            "prompt": prompt,
            "negative_prompt": "blurry, low quality, distorted, ugly, bad anatomy, deformed",
            "img_width": width,
            "img_height": height,
            "num_imgs": 1,
            "seed": seed,
            "num_steps": steps,
            "guidance_scale": guidance,
            "scheduler": "karras",
        }

        cmd = f"b2py t2im {json.dumps(cmd_data)}"
        try:
            self.proc.stdin.write(cmd + "\n")
            self.proc.stdin.flush()
        except (BrokenPipeError, OSError) as e:
            print(f"  ❌ Failed to send command: {e}")
            return None

        image_path = None
        start = time.time()
        timeout = 300

        while time.time() - start < timeout:
            if self.proc.poll() is not None:
                print(f"\n  ❌ Backend process died (exit code {self.proc.returncode})")
                self._flush_stderr()
                return None

            try:
                line = self.proc.stdout.readline()
            except (ValueError, OSError):
                break
            if not line:
                time.sleep(0.1)
                continue
            line = line.strip()
            with self.lock:
                self.output_lines.append(line)

            if "sdbk nwim" in line:
                try:
                    json_start = line.index("{")
                    data = json.loads(line[json_start:])
                    image_path = data.get("generated_img_path")
                except (ValueError, json.JSONDecodeError):
                    pass
                # After nwim, the backend prints "sdbk inrd" next — consume it
                # so the next generate() call starts clean.
                self._consume_next_ready_signal(timeout=10)
                break

            if "sdbk errr" in line:
                print(f"  ❌ Backend error: {line[:200]}")
                self._flush_stderr()
                # Also consume the trailing 'sdbk inrd' so subsequent calls work
                self._consume_next_ready_signal(timeout=5)
                return None

            if "sdbk dnpr" in line:
                try:
                    pct = int(line.split()[-1])
                    if pct >= 0 and pct % 20 == 0:
                        print(f"  ⏳ {pct}%", end="\r")
                except (ValueError, IndexError):
                    pass

            if "sdbk inrd" in line:
                break

        return image_path

    def _consume_next_ready_signal(self, timeout: int = 10):
        """Consume the next 'sdbk inrd' signal from the backend stdout."""
        if not self.proc or not self.proc.stdout:
            return
        start = time.time()
        while time.time() - start < timeout:
            try:
                line = self.proc.stdout.readline()
            except (ValueError, OSError):
                return
            if not line:
                time.sleep(0.05)
                continue
            line = line.strip()
            with self.lock:
                self.output_lines.append(line)
            if "sdbk inrd" in line:
                return

    def _flush_stderr(self):
        """Drain remaining stderr lines from the queue."""
        drained = []
        try:
            while not self.errors_queue.empty():
                err = self.errors_queue.get_nowait()
                if err.strip():
                    drained.append(err.strip())
        except queue.Empty:
            pass
        for err in drained[-10:]:
            print(f"         {err[:200]}")

    def close(self):
        if not self.proc:
            return
        try:
            if self.proc.stdin:
                self.proc.stdin.close()
        except OSError:
            pass
        if self.proc.poll() is None:
            self.proc.terminate()
            try:
                self.proc.wait(timeout=10)
            except subprocess.TimeoutExpired:
                self.proc.kill()
        self.proc = None


# ── Gallery registration ────────────────────────────────────────────────────

def register_in_gallery(model_id: str, model_path: str, prompt: str,
                         image_path: str, seed: int, steps: int,
                         width: int, height: int, guidance: float):
    """Register a generated image in history.json so it shows up in the gallery."""
    try:
        history: dict = {"history": {}}
        if HISTORY_JSON.exists():
            try:
                with open(HISTORY_JSON, "r") as f:
                    content = f.read().strip()
                    if content:
                        history = json.loads(content)
            except (json.JSONDecodeError, OSError):
                history = {"history": {}}

        if "history" not in history:
            history["history"] = {}

        timestamp = int(time.time() * 1000)
        group_id = f"test_{model_id}_{timestamp}"

        entry = {
            "group_id": group_id,
            "num_imgs": 1,
            "img_width": width,
            "img_height": height,
            "model_tdict_path": model_path,
            "imgs": [{
                "done_percentage": -1,
                "image_url": image_path,
                "generated_img": image_path,
                "description": prompt,
                "params": {
                    "model_tdict_path": model_path,
                    "prompt": prompt,
                    "negative_prompt": "blurry, low quality, distorted, ugly, bad anatomy, deformed",
                    "img_width": width,
                    "img_height": height,
                    "seed": seed,
                    "guidance_scale": guidance,
                    "num_steps": steps,
                    "scheduler": "karras",
                    "applet_name": "txt2img",
                    "timestamp": timestamp,
                    "job_id": f"job_{timestamp}",
                    "job_state": "done",
                    "raw_form_options": {
                        "model_option_tdict_path": model_path,
                        "model_option_model_id": model_id,
                        "resolution_opt": f"{width}x{height}",
                    },
                    "prompt_tokens": [],
                },
            }],
            "params": {
                "model_tdict_path": model_path,
                "prompt": prompt,
                "negative_prompt": "blurry, low quality, distorted, ugly, bad anatomy, deformed",
                "img_width": width,
                "img_height": height,
                "seed": seed,
                "guidance_scale": guidance,
                "num_steps": steps,
                "scheduler": "karras",
                "applet_name": "txt2img",
                "timestamp": timestamp,
                "job_id": f"job_{timestamp}",
                "job_state": "done",
                "raw_form_options": {
                    "model_option_tdict_path": model_path,
                    "model_option_model_id": model_id,
                    "resolution_opt": f"{width}x{height}",
                },
                "prompt_tokens": [],
            },
            "key": group_id,
            "prompt": prompt,
        }

        history["history"][group_id] = entry
        HISTORY_JSON.parent.mkdir(parents=True, exist_ok=True)
        with open(HISTORY_JSON, "w") as f:
            json.dump(history, f, indent=2)
        print(f"         📋 Registered in gallery ✓")
        return True
    except Exception as e:
        print(f"         ⚠️  Failed to register in gallery: {e}")
        return False


# ── Test runner ─────────────────────────────────────────────────────────────

def test_model(model_id: str, model_info: dict,
               num_prompts: int = 5) -> Tuple[int, int, float]:
    """Test a single model with multiple prompts. Returns (success, failure, total_time)."""
    model_path = model_info["path"]

    if not os.path.exists(model_path):
        print(f"     ❌ Model file not found at: {model_path}")
        return 0, 1, 0

    print(f"     File: {model_info['filename']} ({model_info['file_size_gb']:.1f} GB)")
    print()

    # Start a fresh backend for this model to avoid state corruption
    session = BackendSession(timeout=300)
    if not session.start():
        print(f"     ❌ Could not start backend")
        return 0, 1, 0

    success = 0
    failure = 0
    total_time = 0.0

    for i in range(num_prompts):
        prompt = generate_random_prompt()
        seed = random.randint(1, 999999)

        print(f"     [{i + 1}/{num_prompts}] Seed {seed}")
        print(f"       Prompt: {prompt[:80]}...")

        start = time.time()
        image_path = session.generate(
            model_path=model_path,
            prompt=prompt,
            seed=seed,
            steps=20,
            width=512,
            height=512,
        )
        elapsed = time.time() - start

        if image_path and os.path.exists(image_path):
            file_size = os.path.getsize(image_path) / 1024
            print(f"       ✅ Generated in {elapsed:.1f}s — {os.path.basename(image_path)} ({file_size:.0f} KB)")

            register_in_gallery(
                model_id=model_id,
                model_path=model_path,
                prompt=prompt,
                image_path=image_path,
                seed=seed,
                steps=20,
                width=512,
                height=512,
                guidance=7.5,
            )
            success += 1
            total_time += elapsed
        elif image_path is None:
            # Backend may have crashed - try to restart
            print(f"       ❌ Backend error after {elapsed:.1f}s — model incompatible or backend crash")
            failure += 1
            # If backend is dead, we can't continue testing this model
            if session.proc and session.proc.poll() is not None:
                print(f"       ⚠️  Backend died — stopping tests for this model")
                break
        else:
            print(f"       ❌ No image generated after {elapsed:.1f}s")
            failure += 1

        time.sleep(1)

    session.close()
    return success, failure, total_time


# ── Entry point ─────────────────────────────────────────────────────────────

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Test all DiffusionBee models")
    parser.add_argument("--quick", action="store_true", help="Run 2 prompts per model instead of 5")
    parser.add_argument("--model", type=str, default=None, help="Run only a specific model ID")
    args = parser.parse_args()

    num_prompts = 2 if args.quick else 5

    print("\n" + "=" * 60)
    print("  DiffusionBee Comprehensive Model Test Suite")
    print("=" * 60)
    print(f"  Apple M1 Max  |  32 GB RAM  |  macOS (arm64)")
    print(f"  Prompts per model: {num_prompts}")
    print("=" * 60)

    # Verify paths
    if not VENV_PYTHON.exists():
        print(f"\n❌ Python venv not found at {VENV_PYTHON}")
        print("   Run: cd backends/stable_diffusion && python3 -m venv venv311")
        return 1

    # Auto-discover models
    print("\n  🔍 Scanning for models in ~/.diffusionbee...")
    all_models = discover_models()

    if not all_models:
        print("\n❌ No model files found!")
        return 1

    print(f"\n  📦 Found {len(all_models)} model(s):")
    compatible = []
    incompatible = []
    for mid, info in sorted(all_models.items()):
        version_str = f"v{info['tdict_version']} ({info['type']})" if info['tdict_version'] else "unknown"
        precision = info['precision']
        status = "✅ COMPATIBLE" if info['can_test'] else f"⏭️  {info['skip_reason']}"
        print(f"     {mid:35s} {version_str:18s} {precision:8s}  {status}")
        if info['can_test']:
            compatible.append((mid, info))
        else:
            incompatible.append((mid, info))

    # Apply --model filter
    if args.model:
        compatible = [(mid, info) for mid, info in compatible if mid == args.model]

    if not compatible:
        print(f"\n{'─' * 60}")
        print("  No compatible SD 1.x models to test.")
        print("  (SDXL and FLUX models require separate backends)")
        print(f"{'─' * 60}")
        return 0

    # Run tests — each model gets its own backend session
    print(f"\n{'─' * 60}")
    print(f"  Testing {len(compatible)} compatible SD 1.x model(s)")
    print(f"  Each model: {num_prompts} random prompt(s), fresh backend session")
    print(f"{'─' * 60}")

    overall_success = 0
    overall_failure = 0
    overall_time = 0.0
    model_results: Dict[str, dict] = {}

    for model_id, model_info in compatible:
        print(f"\n{'─' * 60}")
        print(f"  🧪 Testing: {model_id}")
        print(f"     Type: {model_info['type']}  |  Precision: {model_info['precision']}")
        print(f"{'─' * 60}")

        success, failure, elapsed = test_model(model_id, model_info, num_prompts)
        overall_success += success
        overall_failure += failure
        overall_time += elapsed

        model_results[model_id] = {
            "success": success,
            "failure": failure,
            "time": elapsed,
            "type": model_info["type"],
            "precision": model_info["precision"],
        }

        avg_time = elapsed / max(success, 1)
        print(f"\n     📊 {model_id}: {success}✅ / {failure}❌  "
              f"Avg: {avg_time:.1f}s per image")

    # ── Final Report ──
    print("\n" + "=" * 60)
    print("  📊 FINAL TEST REPORT")
    print("=" * 60)

    print(f"\n  SD 1.x Models:   {overall_success}✅ / {overall_failure}❌")
    print(f"  Total time:      {overall_time:.1f}s")

    for model_id, result in model_results.items():
        status = "✅ ALL PASS" if result["failure"] == 0 else f"⚠️  {result['failure']} FAILURES"
        avg = result["time"] / max(result["success"], 1)
        print(f"  {status}  {model_id}  ({avg:.1f}s avg)")

    print(f"\n  Incompatible models (not tested):")
    for mid, info in incompatible:
        print(f"     ⏭️  {mid} — {info['skip_reason']}")

    # List generated images
    print(f"\n  🖼️  Images saved to: {IMAGES_DIR}")
    image_count = len(list(IMAGES_DIR.glob("*.png"))) if IMAGES_DIR.exists() else 0
    recent_cutoff = time.time() - 3600
    current_images = sorted(IMAGES_DIR.glob("*.png"), key=lambda p: p.stat().st_mtime, reverse=True)
    new_images = [p for p in current_images if p.stat().st_mtime > recent_cutoff]

    print(f"     Total images in directory: {image_count}")
    print(f"     New images from this test: {len(new_images)}")
    if new_images:
        print(f"     Newest images:")
        for img in new_images[:5]:
            print(f"       • {img.name}")

    print(f"\n  📋 Gallery history: {HISTORY_JSON}")
    if HISTORY_JSON.exists():
        try:
            with open(HISTORY_JSON) as f:
                hist = json.load(f)
            test_entries = [k for k in hist.get("history", {}) if k.startswith("test_")]
            print(f"     Test entries registered: {len(test_entries)}")
        except (json.JSONDecodeError, OSError):
            print(f"     (Could not read history.json)")

    print("\n" + "=" * 60)
    if overall_failure == 0:
        print("  🎉 ALL MODELS PASSED — Image gallery populated!")
    else:
        print(f"  ⚠️  {overall_failure} test(s) failed — check output above for details.")
    print("=" * 60)

    return 0 if overall_failure == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
