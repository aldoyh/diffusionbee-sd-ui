#!/usr/bin/env python3
"""
Generate welcome grid images for DiffusionBee homepage.
Uses CyberRealistic v3.1 for photoreal prompts and DreamShaper 6 for stylized art.
Outputs 768x768 PNGs and syncs into electron_app asset folders.
"""
import json
import os
import shutil
import subprocess
import sys
import threading
import time

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backends", "stable_diffusion")
VENV_PYTHON = os.path.join(BACKEND_DIR, "venv311", "bin", "python3")
BACKEND_SCRIPT = os.path.join(BACKEND_DIR, "diffusionbee_backend.py")

MODELS = {
    "cyber": os.path.expanduser(
        "~/.diffusionbee/imported_models/"
        "CyberRealistic__v3.1_CyberRealistic__v3.1.safetensors.tdict"
    ),
    "dream": os.path.expanduser(
        "~/.diffusionbee/imported_models/"
        "DreamShaper_6_baked_vae_DreamShaper.safetensors.tdict"
    ),
}

IMAGES_DIR = os.path.expanduser("~/.diffusionbee/images")
PUBLIC_WELCOME = os.path.join(PROJECT_ROOT, "electron_app", "public", "welcome")
ASSETS_WELCOME = os.path.join(PROJECT_ROOT, "electron_app", "src", "assets", "welcome")

os.makedirs(IMAGES_DIR, exist_ok=True)
os.makedirs(PUBLIC_WELCOME, exist_ok=True)
os.makedirs(ASSETS_WELCOME, exist_ok=True)

# (full prompt, seed, output filename, model key, steps)
WELCOME_SAMPLES = [
    (
        "Anime key visual of a Tokyo alley at sunset, cherry petals in the wind, cel shading, "
        "vibrant sky gradient, detailed background, Makoto Shinkai atmosphere, masterpiece",
        1101,
        "welcome_anime_tokyo_alley.png",
        "dream",
        40,
    ),
    (
        "Contemporary glass pavilion in a snowy birch forest, warm interior glow against blue twilight, "
        "architectural photography, clean lines, Hasselblad medium format, serene winter scene, 8k",
        1202,
        "welcome_glass_pavilion.png",
        "cyber",
        45,
    ),
    (
        "Oil painting still life: copper kettle, sliced citrus on a linen tablecloth, Rembrandt-style "
        "chiaroscuro, visible brushstrokes, rich impasto highlights, classical composition",
        1303,
        "welcome_oil_still_life.png",
        "dream",
        40,
    ),
    (
        "Street food stall at night, sizzling wok, neon menu signs in Chinese characters, steam and "
        "chili oil, vibrant night market atmosphere, editorial food photography, warm tones, 8k",
        1404,
        "welcome_street_food.png",
        "cyber",
        45,
    ),
    (
        "Isometric pixel art of a cozy ramen shop in the rain, tiny neon sign, steam from bowls, "
        "retro game aesthetic, charming details, 16-bit style, crisp pixels",
        1505,
        "welcome_pixel_ramen.png",
        "dream",
        40,
    ),
    (
        "Underwater kelp forest with sun rays piercing the surface, sea turtle gliding through, "
        "crystal clear water, serene marine scene, national geographic underwater photography, 8k",
        1606,
        "welcome_underwater_kelp.png",
        "cyber",
        45,
    ),
]


def sync_assets(filenames):
    synced = []
    for name in filenames:
        src = os.path.join(IMAGES_DIR, name)
        if not os.path.exists(src):
            continue
        for dest_dir in (PUBLIC_WELCOME, ASSETS_WELCOME):
            shutil.copy2(src, os.path.join(dest_dir, name))
        synced.append(name)
    return synced


def wait_for_ready(proc, timeout=240):
    start = time.time()
    while time.time() - start < timeout:
        line = proc.stdout.readline()
        if not line:
            continue
        line = line.strip()
        if "sdbk inrd" in line:
            return True
    return False


def send_and_wait(proc, prompt_text, seed, model_path, num_steps):
    cmd_data = {
        "prompt": prompt_text,
        "img_width": 768,
        "img_height": 768,
        "num_imgs": 1,
        "seed": seed,
        "num_steps": num_steps,
        "guidance_scale": 7.0,
        "scheduler": "ddim",
        "model_tdict_path": model_path,
    }
    proc.stdin.write(f"b2py t2im {json.dumps(cmd_data)}\n")
    proc.stdin.flush()

    image_path = None
    while True:
        line = proc.stdout.readline()
        if not line:
            break
        line = line.strip()
        if "sdbk nwim" in line:
            try:
                image_path = json.loads(line[line.index("{"):]).get("generated_img_path")
            except (ValueError, json.JSONDecodeError):
                pass
        if "sdbk inrd" in line:
            break
        if "sdbk errr" in line:
            print(f"    Error: {line}")
            break
    return image_path


def main():
    print("=" * 70)
    print("  DiffusionBee Welcome Sample Generator")
    print("  CyberRealistic v3.1 + DreamShaper 6 · 768×768")
    print("=" * 70)

    if not os.path.exists(VENV_PYTHON):
        print(f"ERROR: Python not found at {VENV_PYTHON}")
        return False
    if not os.path.exists(BACKEND_SCRIPT):
        print(f"ERROR: Backend not found at {BACKEND_SCRIPT}")
        return False

    for key, path in MODELS.items():
        if not os.path.exists(path):
            print(f"ERROR: Model '{key}' not found at {path}")
            return False

    env = os.environ.copy()
    env["PYTHONPATH"] = os.pathsep.join([
        BACKEND_DIR,
        os.path.join(BACKEND_DIR, "..", "model_converter"),
        os.path.join(BACKEND_DIR, "..", "stable_diffusion_tf_models"),
    ])
    env["TF_CPP_MIN_LOG_LEVEL"] = "3"

    proc = subprocess.Popen(
        [VENV_PYTHON, "-u", BACKEND_SCRIPT],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=BACKEND_DIR,
        env=env,
        bufsize=1,
        universal_newlines=True,
    )

    def read_stderr():
        for line in iter(proc.stderr.readline, ""):
            if line and "warning" not in line.lower():
                print(f"  [stderr] {line.strip()}")

    threading.Thread(target=read_stderr, daemon=True).start()

    print("Waiting for backend...")
    if not wait_for_ready(proc):
        print("Backend failed to become ready")
        proc.terminate()
        return False

    saved = []
    for i, (prompt, seed, filename, model_key, steps) in enumerate(WELCOME_SAMPLES):
        model_path = MODELS[model_key]
        print(f"\n[{i + 1}/{len(WELCOME_SAMPLES)}] {filename} ({model_key}, {steps} steps)")
        print(f"  Prompt: {prompt[:72]}...")
        start = time.time()
        raw_path = send_and_wait(proc, prompt, seed, model_path, steps)
        if not raw_path or not os.path.exists(raw_path):
            print(f"  Failed ({time.time() - start:.0f}s)")
            continue

        dest = os.path.join(IMAGES_DIR, filename)
        shutil.copy2(raw_path, dest)
        size_kb = os.path.getsize(dest) // 1024
        print(f"  Saved {dest} ({size_kb} KB, {time.time() - start:.0f}s)")
        saved.append(filename)

    try:
        proc.stdin.close()
    except OSError:
        pass
    proc.terminate()

    synced = sync_assets(saved)
    print(f"\nDone: {len(saved)}/{len(WELCOME_SAMPLES)} generated, {len(synced)} synced to app assets")
    for name in synced:
        print(f"  ✓ {name}")
    return len(synced) > 0


if __name__ == "__main__":
    sys.exit(0 if main() else 1)