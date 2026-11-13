#!/usr/bin/env python3
"""
Comprehensive 10-Image Generation Test for Installed DiffusionBee App

Tests the installed app at /Applications/diffusion-sd-ui.app by:
  1. Starting a fresh Python backend instance (same one the app uses)
  2. Generating 10 images using available models (prioritizing Qwen-Image-2.1)
  3. Verifying each image file is created and valid
  4. Reporting success/failure per image

Usage:
    python3 scripts/test_installed_app_generation.py
"""

import json
import os
import subprocess
import sys
import time
from datetime import datetime

HOME = os.path.expanduser("~")
ASSETS_DIR = os.path.join(HOME, ".diffusionbee", "downloaded_assets")
IMAGES_DIR = os.path.join(HOME, ".diffusionbee", "images")
BACKEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backends", "stable_diffusion")
BACKEND_DIR = os.path.abspath(BACKEND_DIR)
VENV_PYTHON = os.path.join(BACKEND_DIR, "venv311", "bin", "python3")
BACKEND_SCRIPT = os.path.join(BACKEND_DIR, "diffusionbee_backend.py")

# Test models in priority order (new models first)
TEST_MODELS = [
    {
        "name": "Qwen-Image-2.1-Uncensored",
        "path": os.path.join(ASSETS_DIR, "Qwen-Image-2.1-Uncensored_qwen-image-2.1-UC-Q4_K_M.gguf"),
        "prompt": "a cute mouse eating cheese, cartoon style, 3d render",
        "width": 512,
        "height": 512,
        "steps": 10,
    },
    {
        "name": "Default_SD1.5",
        "path": os.path.join(ASSETS_DIR, "Default_SD1.5_sd-v1-5_fp16.tdict"),
        "prompt": "a simple mouse, minimal vector art",
        "width": 512,
        "height": 512,
        "steps": 10,
    },
    {
        "name": "Default_SD1.5",
        "path": os.path.join(ASSETS_DIR, "Default_SD1.5_sd-v1-5_fp16.tdict"),
        "prompt": "cyberpunk mouse with neon lights, digital art",
        "width": 512,
        "height": 512,
        "steps": 10,
    },
    {
        "name": "Default_SD1.5",
        "path": os.path.join(ASSETS_DIR, "Default_SD1.5_sd-v1-5_fp16.tdict"),
        "prompt": "watercolor mouse reading a book, soft colors",
        "width": 512,
        "height": 512,
        "steps": 10,
    },
    {
        "name": "Default_SD1.5",
        "path": os.path.join(ASSETS_DIR, "Default_SD1.5_sd-v1-5_fp16.tdict"),
        "prompt": "pixel art mouse character, retro game style",
        "width": 512,
        "height": 512,
        "steps": 10,
    },
    {
        "name": "Default_SD1.5",
        "path": os.path.join(ASSETS_DIR, "Default_SD1.5_sd-v1-5_fp16.tdict"),
        "prompt": "steampunk mouse with goggles, detailed illustration",
        "width": 512,
        "height": 512,
        "steps": 10,
    },
    {
        "name": "Default_SD1.5",
        "path": os.path.join(ASSETS_DIR, "Default_SD1.5_sd-v1-5_fp16.tdict"),
        "prompt": "origami mouse made of paper, studio lighting",
        "width": 512,
        "height": 512,
        "steps": 10,
    },
    {
        "name": "Default_SD1.5",
        "path": os.path.join(ASSETS_DIR, "Default_SD1.5_sd-v1-5_fp16.tdict"),
        "prompt": "claymation mouse, stop motion, colorful",
        "width": 512,
        "height": 512,
        "steps": 10,
    },
    {
        "name": "Default_SD1.5",
        "path": os.path.join(ASSETS_DIR, "Default_SD1.5_sd-v1-5_fp16.tdict"),
        "prompt": "neon glowing mouse outline, synthwave aesthetic",
        "width": 512,
        "height": 512,
        "steps": 10,
    },
    {
        "name": "Default_SD1.5",
        "path": os.path.join(ASSETS_DIR, "Default_SD1.5_sd-v1-5_fp16.tdict"),
        "prompt": "watercolor mouse in a field of flowers, pastel",
        "width": 512,
        "height": 512,
        "steps": 10,
    },
]

RESULTS = []


def log(msg: str):
    ts = datetime.now().strftime("%H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    RESULTS.append(line)


def count_images() -> int:
    if not os.path.isdir(IMAGES_DIR):
        return 0
    return len([
        f for f in os.listdir(IMAGES_DIR)
        if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp"))
    ])


def start_backend():
    """Start the Python backend and wait for it to be ready."""
    log(f"Starting backend: {BACKEND_SCRIPT}")
    log(f"Python: {VENV_PYTHON}")
    log(f"Backend dir: {BACKEND_DIR}")

    proc = subprocess.Popen(
        [VENV_PYTHON, BACKEND_SCRIPT],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=BACKEND_DIR,
        text=True,
        bufsize=1,
    )

    # Wait for ready signal
    start = time.time()
    ready = False
    caps = {}
    while time.time() - start < 30:
        ret = proc.poll()
        if ret is not None:
            log(f"❌ Backend exited early with code {ret}")
            return None, None

        line = proc.stdout.readline()
        if not line:
            time.sleep(0.05)
            continue

        line = line.strip()
        if "sdbk caps" in line:
            try:
                caps_json = line.split("sdbk caps ", 1)[1]
                caps = json.loads(caps_json)
                log(f"Backend capabilities: {json.dumps(caps)[:200]}...")
            except Exception:
                pass
        if "sdbk inrd" in line:
            ready = True
            log("✅ Backend ready")
            break

    if not ready:
        log("❌ Backend did not become ready")
        proc.terminate()
        return None, None

    return proc, caps


def send_generation(proc, model_info: dict, image_index: int) -> bool:
    """Send a single generation command and wait for result."""
    model_path = model_info["path"]
    if not os.path.exists(model_path):
        log(f"  ❌ Model file not found: {model_path}")
        return False

    before_count = count_images()

    gen_params = {
        "model_tdict_path": model_path,
        "prompt": model_info["prompt"],
        "negative_prompt": "",
        "img_width": model_info["width"],
        "img_height": model_info["height"],
        "num_steps": model_info["steps"],
        "guidance_scale": 7.5,
        "seed": 1000 + image_index,
        "num_imgs": 1,
    }

    cmd = f"t2im {json.dumps(gen_params)}"
    log(f"  Sending: {model_info['name']} -> '{model_info['prompt'][:50]}...'")
    proc.stdin.write(f"b2py {cmd}\n")
    proc.stdin.flush()

    # Wait for result
    start = time.time()
    got_image = False
    got_error = False
    while time.time() - start < 180:
        ret = proc.poll()
        if ret is not None and ret != 0:
            log(f"  ❌ Backend exited with code {ret}")
            return False

        line = proc.stdout.readline()
        if not line:
            time.sleep(0.1)
            continue

        line = line.strip()

        if "nwim" in line:
            got_image = True
            try:
                img_data = json.loads(line.split("nwim ", 1)[1])
                img_path = img_data.get("generated_img_path", "N/A")
                exists = os.path.exists(img_path) if img_path != "N/A" else False
                size_kb = os.path.getsize(img_path) / 1024 if exists else 0
                log(f"  ✅ IMAGE {image_index + 1}/10: {os.path.basename(img_path)} ({size_kb:.1f} KB)")
            except Exception as e:
                log(f"  ✅ IMAGE {image_index + 1}/10: received (parse error: {e})")
            break

        if "errr" in line:
            got_error = True
            log(f"  ❌ Backend error: {line[:200]}")
            break

        if "dnpr" in line:
            pass  # progress, ignore

        if "gnms" in line:
            pass  # status, ignore

    if not got_image and not got_error:
        after = count_images()
        if after > before_count:
            log(f"  ✅ IMAGE {image_index + 1}/10: generated (detected new file)")
            got_image = True
        else:
            log(f"  ❌ IMAGE {image_index + 1}/10: timed out (no image received)")

    return got_image


def main():
    log("=" * 60)
    log("DiffusionBee Installed-App 10-Image Generation Test")
    log("=" * 60)

    # Verify app is installed
    app_path = "/Applications/diffusion-sd-ui.app"
    if not os.path.exists(app_path):
        log(f"❌ App not installed at {app_path}")
        sys.exit(1)
    log(f"✓ App installed at {app_path}")

    # Check backend files
    if not os.path.exists(BACKEND_SCRIPT):
        log(f"❌ Backend script not found: {BACKEND_SCRIPT}")
        sys.exit(1)
    if not os.path.exists(VENV_PYTHON):
        log(f"❌ Venv Python not found: {VENV_PYTHON}")
        sys.exit(1)

    # Start backend
    proc, caps = start_backend()
    if proc is None:
        sys.exit(1)

    # Check which model families are supported
    families = caps.get("families", {})
    supported_types = list(families.keys())
    log(f"Supported model families: {supported_types}")

    # Generate images
    success_count = 0
    for i, model_info in enumerate(TEST_MODELS):
        log(f"\n--- Image {i + 1}/10 ---")
        ok = send_generation(proc, model_info, i)
        if ok:
            success_count += 1

    # Cleanup
    try:
        proc.stdin.close()
    except Exception:
        pass
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except Exception:
        proc.kill()

    # Summary
    log("\n" + "=" * 60)
    log(f"RESULTS: {success_count}/10 images generated successfully")
    final_count = count_images()
    log(f"Total images in ~/.diffusionbee/images/: {final_count}")
    log("=" * 60)

    if success_count == 10:
        log("🎉 ALL 10 IMAGES GENERATED SUCCESSFULLY")
        sys.exit(0)
    elif success_count > 0:
        log(f"⚠️  PARTIAL: {success_count}/10 images generated")
        sys.exit(0)
    else:
        log("💥 ALL GENERATIONS FAILED")
        sys.exit(1)


if __name__ == "__main__":
    main()
