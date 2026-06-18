#!/usr/bin/env python3
"""Test script to verify the Python backend can actually generate images."""
import subprocess
import json
import os
import time
import sys

BACKEND_DIR = os.path.expanduser("~/Projects/GitHub-apps/diffusionbee-sd-ui/backends/stable_diffusion")
VENV_PYTHON = os.path.join(BACKEND_DIR, "venv311", "bin", "python3")
BACKEND_SCRIPT = os.path.join(BACKEND_DIR, "diffusionbee_backend.py")

# Find a model
HOME = os.path.expanduser("~")
MODEL_PATH = os.path.join(HOME, ".diffusionbee/downloaded_assets/Default_SD1.5_sd-v1-5_fp16.tdict")

print(f"Backend: {BACKEND_SCRIPT}")
print(f"Python: {VENV_PYTHON}")
print(f"Model: {MODEL_PATH}")
print(f"Model exists: {os.path.exists(MODEL_PATH)}")
print()

# Start the backend with stdin
proc = subprocess.Popen(
    [VENV_PYTHON, BACKEND_SCRIPT],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    cwd=BACKEND_DIR,
    text=True,
    bufsize=1,
)

# Wait for backend to be ready
start = time.time()
ready = False
output_lines = []
while time.time() - start < 30:
    ret = proc.poll()
    if ret is not None:
        print(f"Process exited early with code {ret}")
        break
    # Read available output
    line = proc.stdout.readline()
    if line:
        output_lines.append(line.strip())
        print(f"[BACKEND] {line.strip()}")
        if "sdbk inrd" in line:
            ready = True
            print("\n✅ Backend ready!")
            break

if not ready:
    print("\n❌ Backend did not become ready in 30 seconds")
    print("Output received:")
    for l in output_lines[-20:]:
        print(f"  {l}")
    sys.exit(1)

# Send a generation command
print("\n--- Sending generation command ---")
gen_params = {
    "model_tdict_path": MODEL_PATH,
    "prompt": "A cute cat sitting on a windowsill, digital art, high quality",
    "negative_prompt": "blurry, low quality, distorted",
    "img_width": 512,
    "img_height": 512,
    "num_steps": 10,
    "guidance_scale": 7.5,
    "seed": 42,
    "num_imgs": 1,
}

cmd = f"t2im {json.dumps(gen_params)}"
proc.stdin.write(f"b2py {cmd}\n")
proc.stdin.flush()
print("Sent generation command, waiting for response...")

# Wait for image output or error
start = time.time()
got_image = False
got_error = False
while time.time() - start < 120:  # 2 min timeout
    ret = proc.poll()
    if ret is not None and ret != 0:
        print(f"\n❌ Process exited with code {ret}")
        break
        
    line = proc.stdout.readline()
    if not line:
        time.sleep(0.1)
        continue
    
    line = line.strip()
    output_lines.append(line)
    
    if "nwim" in line:
        print(f"\n✅ GOT IMAGE! {line}")
        got_image = True
        # Parse the image data
        try:
            img_data = json.loads(line.split("nwim ")[1])
            print(f"   Image path: {img_data.get('generated_img_path', 'N/A')}")
            if os.path.exists(img_data.get('generated_img_path', '')):
                print(f"   File exists: YES")
        except:
            pass
        break
    
    if "errr" in line:
        print(f"\n❌ ERROR: {line}")
        got_error = True
        break
        
    if "dnpr" in line:
        progress = line.split("dnpr ")[1] if "dnpr " in line else ""
        print(f"  Progress: {progress}%")

    if "gnms" in line:
        msg = line.split("gnms ")[1] if "gnms " in line else ""
        print(f"  Status: {msg}")

if not got_image and not got_error:
    print("\n❌ Timed out waiting for image generation")
    print("\nLast 30 output lines:")
    for l in output_lines[-30:]:
        print(f"  {l}")

# Clean up
proc.stdin.close()
proc.terminate()
proc.wait(timeout=5)

if got_image:
    print("\n🎉 GENERATION WORKS!")
    sys.exit(0)
else:
    print("\n💥 GENERATION FAILED")
    sys.exit(1)
