#!/usr/bin/env python3
"""
Test harness for DiffusionBee backend.
Starts the backend as a subprocess with proper stdin/stdout pipes,
sends an image generation command, and verifies the output.
"""
import subprocess
import sys
import os
import json
import time
import threading

# Paths
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backends", "stable_diffusion")
VENV_PYTHON = os.path.join(BACKEND_DIR, "venv311", "bin", "python3")
BACKEND_SCRIPT = os.path.join(BACKEND_DIR, "diffusionbee_backend.py")

# Test prompt for high quality image
# Use DreamShaper 6 (SD 1.5 compatible, high quality)
MODEL_PATH = os.path.expanduser(
    "~/.diffusionbee/imported_models/"
    "DreamShaper_6_baked_vae_DreamShaper.safetensors.tdict"
)

TEST_PROMPT = {
    "prompt": (
        "a majestic phoenix rising from flames, vibrant orange and gold feathers, "
        "epic fantasy art, dramatic lighting, highly detailed, masterpiece"
    ),
    "img_width": 512,
    "img_height": 512,
    "num_imgs": 1,
    "seed": 8675309,
    "num_inference_steps": 20,
    "guidance_scale": 7.5,
    "model_tdict_path": MODEL_PATH,
}

def main():
    print("=" * 60)
    print("DiffusionBee Backend Test Harness")
    print("=" * 60)
    print(f"Python:    {VENV_PYTHON}")
    print(f"Script:    {BACKEND_SCRIPT}")
    print()

    # Verify paths
    if not os.path.exists(VENV_PYTHON):
        print(f"ERROR: Python not found at {VENV_PYTHON}")
        return False
    if not os.path.exists(BACKEND_SCRIPT):
        print(f"ERROR: Backend script not found at {BACKEND_SCRIPT}")
        return False

    # Set up environment with additional paths
    env = os.environ.copy()
    env["PYTHONPATH"] = os.pathsep.join([
        BACKEND_DIR,
        os.path.join(BACKEND_DIR, "..", "model_converter"),
        os.path.join(BACKEND_DIR, "..", "stable_diffusion_tf_models"),
    ])
    env["TF_CPP_MIN_LOG_LEVEL"] = "3"  # Suppress TF warnings

    # Start the backend process
    print("Starting backend...")
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

    output_lines = []
    errors = []

    def read_stderr():
        try:
            for line in iter(proc.stderr.readline, ''):
                if line:
                    errors.append(line.strip())
                    print(f"  [stderr] {line.strip()}")
        except (ValueError, OSError):
            pass

    stderr_thread = threading.Thread(target=read_stderr, daemon=True)
    stderr_thread.start()

    # Wait for backend to be ready (up to 180 seconds for model loading)
    print()
    print("Waiting for backend to load models (this may take a minute)...")
    print()

    backend_ready = False
    start_time = time.time()

    def read_stdout_until_ready():
        nonlocal backend_ready
        try:
            for line in iter(proc.stdout.readline, ''):
                line = line.strip()
                if line:
                    output_lines.append(line)
                    elapsed = time.time() - start_time
                    if "sdbk mlpr" in line:
                        print(f"  [{elapsed:.0f}s] Loading model... {line}")
                    elif "sdbk gnms" in line:
                        print(f"  [{elapsed:.0f}s] Status: {line}")
                    elif "sdbk mdld" in line:
                        print(f"  [{elapsed:.0f}s] ✅ Model loaded!")
                    elif "sdbk inrd" in line:
                        print(f"  [{elapsed:.0f}s] ✅ Backend ready for input!")
                        backend_ready = True
                        break
                    elif "error" in line.lower() or "traceback" in line.lower():
                        print(f"  [{elapsed:.0f}s] ⚠️  {line}")
                    else:
                        print(f"  [{elapsed:.0f}s] {line}")
        except (ValueError, OSError):
            pass

    stdout_thread = threading.Thread(target=read_stdout_until_ready, daemon=True)
    stdout_thread.start()
    stdout_thread.join(timeout=180)

    if not backend_ready:
        print("\n❌ Backend failed to become ready within timeout")
        print(f"Output so far ({len(output_lines)} lines):")
        for l in output_lines[-20:]:
            print(f"  {l}")
        proc.terminate()
        return False

    print()
    print("=" * 60)
    print("SENDING IMAGE GENERATION COMMAND")
    print(f"Prompt: {TEST_PROMPT['prompt']}")
    print(f"Size:   {TEST_PROMPT['img_width']}x{TEST_PROMPT['img_height']}")
    print(f"Steps:  {TEST_PROMPT['num_inference_steps']}")
    print(f"Seed:   {TEST_PROMPT['seed']}")
    print("=" * 60)
    print()

    # Send the image generation command
    cmd = f"b2py t2im {json.dumps(TEST_PROMPT)}"
    proc.stdin.write(cmd + "\n")
    proc.stdin.flush()

    # Monitor output for the generated image
    generated_image_path = None
    generation_start = time.time()
    timeout = 180

    # Read more output while waiting for generation
    def read_output_while_generating():
        nonlocal generated_image_path
        try:
            for line in iter(proc.stdout.readline, ''):
                line = line.strip()
                if not line:
                    continue
                elapsed = time.time() - generation_start
                output_lines.append(line)

                if "sdbk dnpr" in line:
                    # Progress update
                    try:
                        pct = int(line.split()[-1])
                        if pct >= 0:
                            print(f"  [{elapsed:.0f}s] Progress: {pct}%", end="\r")
                    except ValueError:
                        pass
                elif "sdbk nwim" in line:
                    json_start = line.index("{")
                    data = json.loads(line[json_start:])
                    generated_image_path = data.get("generated_img_path")
                    print(f"\n\n  [{elapsed:.0f}s] ✅ IMAGE GENERATED!")
                    print(f"  Path: {generated_image_path}")
                    break
                elif "sdbk errr" in line:
                    print(f"\n\n  [{elapsed:.0f}s] ❌ Backend error: {line}")
                    break
                elif "sdbk inrd" in line:
                    print(f"\n  [{elapsed:.0f}s] Generation complete, backend ready for next input")
                    if generated_image_path is None:
                        # Maybe success was printed already
                        pass
                    break
        except (ValueError, OSError):
            pass

    gen_thread = threading.Thread(target=read_output_while_generating, daemon=True)
    gen_thread.start()
    gen_thread.join(timeout=timeout)

    elapsed = time.time() - generation_start
    print(f"\nTotal generation time: {elapsed:.1f}s")
    print()

    # Close the process
    try:
        proc.stdin.close()
    except:
        pass
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except:
        proc.kill()

    # Verify the output
    if generated_image_path and os.path.exists(generated_image_path):
        file_size = os.path.getsize(generated_image_path)
        print(f"\n{'=' * 60}")
        print(f"✅  SUCCESS! Image generated and confirmed at:")
        print(f"   {generated_image_path}")
        print(f"   Size: {file_size / 1024:.1f} KB ({file_size} bytes)")
        print(f"{'=' * 60}")
        return True
    else:
        print(f"\n{'=' * 60}")
        print(f"❌  No image generated")
        if generated_image_path:
            print(f"   Path claimed: {generated_image_path}")
            print(f"   Exists? {os.path.exists(generated_image_path)}")
        print(f"{'=' * 60}")
        print(f"\nLast 30 lines of output:")
        for l in output_lines[-30:]:
            print(f"  {l}")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
