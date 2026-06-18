#!/usr/bin/env python3
"""
High-quality batch image generator for DiffusionBee welcome page.
Generates 6 images at 768x768 with 50 steps, then upscales 4x via RealESRGAN.
"""
import subprocess
import sys
import os
import json
import time

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backends", "stable_diffusion")
VENV_PYTHON = os.path.join(BACKEND_DIR, "venv311", "bin", "python3")
BACKEND_SCRIPT = os.path.join(BACKEND_DIR, "diffusionbee_backend.py")

MODEL_PATH = os.path.expanduser(
    "~/.diffusionbee/imported_models/"
    "DreamShaper_6_baked_vae_DreamShaper.safetensors.tdict"
)

REALESRGAN_BIN = "/Applications/DiffusionBee.app/Contents/Resources/core/realesrgan_ncnn_macos"
REALESRGAN_MODELS = "/Applications/DiffusionBee.app/Contents/Resources/core/models/"

IMAGES_DIR = os.path.expanduser("~/.diffusionbee/images")
os.makedirs(IMAGES_DIR, exist_ok=True)

SAMPLE_PROMPTS = [
    # High-quality diverse prompts optimized for DreamShaper 6 (SD 1.5, photorealism focus)
    ("a serene zen garden in full bloom with pink cherry blossoms, koi fish swimming in a clear pond, traditional stone lantern, morning mist, soft sun rays, highly detailed, photorealistic, 8k, award-winning photography", 101),
    ("a cyberpunk cityscape at night with neon signs reflecting on wet asphalt, flying cars between towering skyscrapers, holographic billboards, heavy rain, moody cinematic atmosphere, blade runner aesthetic, ultra detailed, volumetric lighting", 202),
    ("a magical cottagecore cottage surrounded by wildflowers and lavender bushes, butterflies, soft golden hour sunlight streaming through trees, warm cozy atmosphere, fairy tale aesthetic, highly detailed, photorealistic, 8k", 303),
    ("a majestic dragon with iridescent purple and gold scales perched on a mountain peak, wings spread wide against a dramatic sunset sky, epic fantasy landscape, god rays through clouds, cinematic lighting, masterpiece, ultra detailed", 404),
    ("a cozy vintage coffee shop interior during rain, warm amber Edison bulbs, steam rising from ceramic mugs, rain-streaked windows, bookshelves, hygge atmosphere, soft bokeh, photorealistic, cinematic, 8k", 505),
    ("a retrofuturistic space station with art deco influences orbiting a ringed gas giant, starships docking, neon accent lighting, deep space aurora, 1970s sci-fi book cover style, dramatic lighting, highly detailed", 606),
]


def run_realesrgan(input_path, output_path):
    """Run RealESRGAN 4x upscaling on the given image."""
    cmd = [REALESRGAN_BIN, "-m", REALESRGAN_MODELS, "-i", input_path, "-o", output_path]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    stdout, stderr = proc.communicate(timeout=120)
    if proc.returncode != 0:
        print(f"    ⚠️  RealESRGAN exit code {proc.returncode}: {stderr.decode()[:200]}")
        return False
    if os.path.exists(output_path):
        return True
    return False


def send_and_wait(proc, prompt_text, seed):
    """Send a generation command and wait for the result."""
    cmd_data = {
        "prompt": prompt_text,
        "img_width": 768,
        "img_height": 768,
        "num_imgs": 1,
        "seed": seed,
        "num_steps": 50,
        "guidance_scale": 7.0,
        "model_tdict_path": MODEL_PATH,
    }
    cmd = f"b2py t2im {json.dumps(cmd_data)}"
    proc.stdin.write(cmd + "\n")
    proc.stdin.flush()

    image_path = None
    while True:
        line = proc.stdout.readline()
        if not line:
            break
        line = line.strip()
        if not line:
            continue
        if "sdbk nwim" in line:
            try:
                idx = line.index("{")
                data = json.loads(line[idx:])
                image_path = data.get("generated_img_path")
            except (ValueError, json.JSONDecodeError):
                pass
        if "sdbk inrd" in line:
            break
        if "sdbk errr" in line:
            print(f"    Error: {line}")
            break
    return image_path


def wait_for_ready(proc, timeout=180):
    """Wait for backend to signal it's ready."""
    start = time.time()
    while time.time() - start < timeout:
        line = proc.stdout.readline()
        if not line:
            continue
        line = line.strip()
        if not line:
            continue
        if "sdbk mdld" in line:
            print(f"  [{time.time()-start:.0f}s] Model loaded")
        if "sdbk inrd" in line:
            print(f"  [{time.time()-start:.0f}s] Backend ready")
            return True
    return False


def main():
    print("=" * 70)
    print("  DiffusionBee High-Quality Sample Image Generator")
    print(f"  768×768 × 50 steps → 4× RealESRGAN upscale → 3072×3072")
    print("=" * 70)

    if not os.path.exists(VENV_PYTHON):
        print(f"ERROR: Python not found at {VENV_PYTHON}")
        return False
    if not os.path.exists(BACKEND_SCRIPT):
        print(f"ERROR: Backend script not found at {BACKEND_SCRIPT}")
        return False
    if not os.path.exists(REALESRGAN_BIN):
        print(f"ERROR: RealESRGAN not found at {REALESRGAN_BIN}")
        return False

    env = os.environ.copy()
    env["PYTHONPATH"] = os.pathsep.join([
        BACKEND_DIR,
        os.path.join(BACKEND_DIR, "..", "model_converter"),
        os.path.join(BACKEND_DIR, "..", "stable_diffusion_tf_models"),
    ])
    env["TF_CPP_MIN_LOG_LEVEL"] = "3"

    print("\nStarting backend...")
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

    import threading
    def read_stderr():
        for line in iter(proc.stderr.readline, ''):
            if line:
                line = line.strip()
                if "warning" not in line.lower() and "divide" not in line.lower():
                    print(f"  [stderr] {line}")
    threading.Thread(target=read_stderr, daemon=True).start()

    print("Waiting for backend (model loading may take a minute)...")
    if not wait_for_ready(proc):
        print("❌ Backend failed to become ready")
        proc.terminate()
        return False

    generated = []
    upscaled = []

    for i, (prompt, seed) in enumerate(SAMPLE_PROMPTS):
        print(f"\n{'─' * 70}")
        print(f"[{i+1}/{len(SAMPLE_PROMPTS)}] Seed {seed}: {prompt[:70]}...")
        print(f"{'─' * 70}")

        # Step 1: Generate at 768x768 with 50 steps
        print(f"  ▶ Generating at 768×768, 50 steps...")
        start = time.time()
        raw_path = send_and_wait(proc, prompt, seed)
        elapsed = time.time() - start
        if not raw_path or not os.path.exists(raw_path):
            print(f"    ❌ Generation failed ({elapsed:.0f}s)")
            continue
        raw_size = os.path.getsize(raw_path) // 1024
        print(f"    ✅ Generated in {elapsed:.0f}s — {os.path.basename(raw_path)} ({raw_size} KB)")

        # Step 2: Upscale 4x with RealESRGAN
        upscaled_filename = f"hq_{os.path.basename(raw_path)}"
        upscaled_path = os.path.join(IMAGES_DIR, upscaled_filename)
        print(f"  ▶ Upscaling 4× with RealESRGAN → 3072×3072...")
        upscale_start = time.time()
        success = run_realesrgan(raw_path, upscaled_path)
        upscale_elapsed = time.time() - upscale_start

        if success:
            hq_size = os.path.getsize(upscaled_path) // 1024
            print(f"    ✅ Upscaled in {upscale_elapsed:.0f}s — {upscaled_filename} ({hq_size} KB)")
            upscaled.append(upscaled_filename)
        else:
            print(f"    ⚠️  Upscaling failed, falling back to original")
            upscaled.append(os.path.basename(raw_path))

        # Small pause
        time.sleep(0.5)

    print(f"\n{'=' * 70}")
    print(f"✅ Generation complete! {len(upscaled)}/{len(SAMPLE_PROMPTS)} images ready")
    print()
    for img in upscaled:
        path = os.path.join(IMAGES_DIR, img)
        if os.path.exists(path):
            h, w = 0, 0
            try:
                from PIL import Image
                im = Image.open(path)
                w, h = im.size
            except:
                pass
            size = os.path.getsize(path) // 1024
            dims = f"{w}×{h}" if w and h else "?"
            print(f"  ✓ {img}  ({size} KB, {dims})")
    print(f"\nLocation: {IMAGES_DIR}")
    print(f"{'=' * 70}")

    try:
        proc.stdin.close()
    except:
        pass
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except:
        proc.kill()

    return len(upscaled) > 0


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
