#!/usr/bin/env python3
"""Batch-generate images from a JSON prompt file using the local DiffusionBee backend.

Accepted JSON shapes:
  - a list of prompt strings: ["a cat", "a dog"]
  - a list of objects; prompt text is read from the first non-empty of
    "prompt" | "description" | "text". Optional per-item overrides:
    "negative_prompt", "width"/"img_width", "height"/"img_height",
    "steps"/"num_steps", "guidance_scale", "seed". Unknown keys are ignored.
  - an object with a "prompts" (or "items"/"data") list in either shape above.

Every request is sent with allow_nsfw=true. Packaged backends ship the OpenNSFW
output classifier and gate its image-blackout branch on SDRun.allow_nsfw; source
backends ignore the unknown key (get_sd_run_from_dict filters to SDRun fields).
Local generation is uncensored by design — content is the user's responsibility.

Usage:
  python3 scripts/generate_from_json.py PROMPTS.json [--out DIR] [--limit N]
      [--model PATH] [--steps N] [--width W] [--height H] [--seed S]
      [--negative PROMPT] [--upscale] [--source-backend] [--dry-run]

Quality recipe (photoreal, SD1.5-class models): pick a good checkpoint
(e.g. Deliberate v2), 30+ steps, generate at 512x512, then --upscale to
2048x2048 with the bundled Real-ESRGAN (same binary the app's Upscale
button uses). Base SD1.5 at 10 steps is a plumbing test, not a quality bar.
"""
import argparse
import json
import os
import random
import shutil
import subprocess
import sys
import time

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PACKAGED_BIN = os.path.join(REPO_ROOT, "electron_app", ".packaged-backend", "diffusionbee_backend")
REALESRGAN_BIN = os.path.join(REPO_ROOT, "electron_app", ".packaged-backend", "realesrgan_ncnn_macos")
REALESRGAN_MODELS = os.path.join(os.path.dirname(REALESRGAN_BIN), "models")
SOURCE_BACKEND_DIR = os.path.join(REPO_ROOT, "backends", "stable_diffusion")
SOURCE_VENV_PY = os.path.join(SOURCE_BACKEND_DIR, "venv311", "bin", "python3")
DEFAULT_MODEL = os.path.expanduser("~/.diffusionbee/downloaded_assets/Default_SD1.5_sd-v1-5_fp16.tdict")

PROMPT_KEYS = ("prompt", "description", "text")


def load_prompts(path):
    with open(path) as f:
        data = json.load(f)
    if isinstance(data, dict):
        for k in ("prompts", "items", "data"):
            if isinstance(data.get(k), list):
                data = data[k]
                break
    if not isinstance(data, list):
        raise SystemExit("Unsupported JSON shape: expected a list or an object with a 'prompts' list")
    items = []
    for i, entry in enumerate(data):
        if isinstance(entry, str):
            items.append({"prompt": entry})
        elif isinstance(entry, dict):
            text = next((e for e in (entry.get(k) for k in PROMPT_KEYS)
                         if isinstance(e, str) and e.strip()), None)
            if text is None:
                print(f"  [skip] entry {i}: no prompt text in keys {PROMPT_KEYS}")
                continue
            item = dict(entry)
            item["prompt"] = text
            items.append(item)
        else:
            print(f"  [skip] entry {i}: unsupported type {type(entry).__name__}")
    return items


def start_backend(use_source, startup_timeout):
    if use_source:
        cmd = [SOURCE_VENV_PY, os.path.join(SOURCE_BACKEND_DIR, "diffusionbee_backend.py")]
        cwd = SOURCE_BACKEND_DIR
    else:
        cmd = [PACKAGED_BIN]
        cwd = os.path.dirname(PACKAGED_BIN)
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT, cwd=cwd, text=True, bufsize=1)
    start = time.time()
    while time.time() - start < startup_timeout:
        if proc.poll() is not None:
            raise SystemExit(f"Backend exited during startup (rc={proc.returncode})")
        line = proc.stdout.readline()
        if line and "sdbk inrd" in line:
            return proc
    proc.kill()
    raise SystemExit(f"Backend did not become ready in {startup_timeout}s")


def generate_one(proc, params, timeout=420):
    proc.stdin.write("b2py t2im " + json.dumps(params) + "\n")
    proc.stdin.flush()
    start = time.time()
    while time.time() - start < timeout:
        if proc.poll() is not None:
            return None, f"backend exited rc={proc.returncode}"
        line = proc.stdout.readline()
        if not line:
            continue
        if '"generated_img_path"' in line:
            try:
                payload = json.loads(line.split("sdbk nwim", 1)[1].strip())
                return payload.get("generated_img_path"), None
            except Exception as e:
                return None, f"could not parse nwim line: {e}"
        if "sdbk" in line and "eror" in line:
            return None, line.strip()
    return None, f"timeout after {timeout}s"


def upscale_image(src_path, dest_path, timeout=300):
    """4x upscale via the bundled Real-ESRGAN NCNN binary — the same invocation
    the app's Upscale button uses (native_functions.js run_realesrgan)."""
    if not os.path.exists(REALESRGAN_BIN):
        return None, f"upscaler not found at {REALESRGAN_BIN}"
    try:
        proc = subprocess.run(
            [REALESRGAN_BIN, "-m", REALESRGAN_MODELS, "-i", src_path, "-o", dest_path],
            capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        return None, f"upscale timed out after {timeout}s"
    if os.path.exists(dest_path):
        return dest_path, None
    tail = (proc.stderr or proc.stdout or "").strip().splitlines()
    return None, "upscaler produced no output" + (f": {tail[-1]}" if tail else "")


def label_for(item, i):
    return str(item.get("prompt_id") or item.get("id") or f"prompt_{i + 1}")


def main():
    ap = argparse.ArgumentParser(
        description="Batch-generate images from a JSON prompt file (any category; allow_nsfw is always sent).")
    ap.add_argument("json_path")
    ap.add_argument("--out", default=None,
                    help="output dir (default: generated_from_json/<file-stem>/ next to the JSON file)")
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--steps", type=int, default=30)
    ap.add_argument("--width", type=int, default=512)
    ap.add_argument("--height", type=int, default=512)
    ap.add_argument("--seed", type=int, default=None,
                    help="base seed; per-item 'seed' in the JSON wins; default random")
    ap.add_argument("--guidance", type=float, default=7.5,
                    help="guidance scale (CFG); per-item 'guidance_scale' wins. Juggernaut realism: 5-6.5")
    ap.add_argument("--scheduler", default="__default_for_model__",
                    choices=["__default_for_model__", "karras", "ddim", "lmsd", "pndm",
                             "k_euler_ancestral", "k_euler"],
                    help="sampler; per-item 'scheduler' wins")
    ap.add_argument("--negative", default=("blurry, low quality, distorted, deformed, disfigured, "
                                           "bad anatomy, extra limbs, mutated hands, poorly drawn face, "
                                           "watermark, text, jpeg artifacts"))
    ap.add_argument("--upscale", action="store_true",
                    help="4x-upscale every image with the bundled Real-ESRGAN (512x512 -> 2048x2048); "
                         "writes an additional *_x4.png next to each base image")
    ap.add_argument("--source-backend", action="store_true",
                    help="use the repo's Python source backend instead of the packaged binary")
    ap.add_argument("--startup-timeout", type=int, default=180,
                    help="seconds to wait for the backend to become ready (default 180)")
    ap.add_argument("--dry-run", action="store_true",
                    help="parse the file and print the plan without generating")
    args = ap.parse_args()

    items = load_prompts(args.json_path)
    if args.limit:
        items = items[: args.limit]
    if not items:
        raise SystemExit("No prompts to generate.")

    out_dir = args.out or os.path.join(
        os.path.dirname(os.path.abspath(args.json_path)),
        "generated_from_json",
        os.path.splitext(os.path.basename(args.json_path))[0])
    os.makedirs(out_dir, exist_ok=True)

    print(f"{len(items)} prompt(s) -> {out_dir}", flush=True)
    for i, it in enumerate(items):
        preview = it["prompt"].replace("\n", " ")
        print(f"  [{i + 1}/{len(items)}] {label_for(it, i)}: {preview[:90]}"
              + ("..." if len(preview) > 90 else ""), flush=True)
    if args.dry_run:
        print("Dry run — nothing generated.")
        return

    if not args.source_backend and not os.path.exists(PACKAGED_BIN):
        raise SystemExit(f"Packaged backend not found at {PACKAGED_BIN}\n"
                         "Run: npm run prepare:backend  (or pass --source-backend)")
    if not os.path.exists(args.model):
        raise SystemExit(f"Model not found: {args.model}")

    proc = start_backend(args.source_backend, args.startup_timeout)
    print("Backend ready. Generating...", flush=True)
    ok, failed = 0, []
    for i, it in enumerate(items):
        label = label_for(it, i)
        seed = it.get("seed", args.seed)
        params = {
            "model_tdict_path": args.model,
            "prompt": it["prompt"],
            "negative_prompt": it.get("negative_prompt", args.negative),
            "img_width": int(it.get("width", it.get("img_width", args.width))),
            "img_height": int(it.get("height", it.get("img_height", args.height))),
            "num_steps": int(it.get("steps", it.get("num_steps", args.steps))),
            "guidance_scale": float(it.get("guidance_scale", args.guidance)),
            "scheduler": it.get("scheduler", args.scheduler),
            "seed": int(seed) if seed is not None else random.randint(0, 2**31 - 1),
            "num_imgs": 1,
            "allow_nsfw": True,
        }
        t0 = time.time()
        try:
            path, err = generate_one(proc, params)
        except (BrokenPipeError, IOError) as e:
            path, err = None, f"pipe error: {e}"
        if err or not path or not os.path.exists(path or ""):
            failed.append((label, err or "no image returned"))
            print(f"  [{i + 1}/{len(items)}] {label} FAILED: {err}")
            continue
        dest = os.path.join(out_dir, f"{i + 1:03d}_{label}.png")
        shutil.copy2(path, dest)
        ok += 1
        print(f"  [{i + 1}/{len(items)}] {label} done in {time.time() - t0:.0f}s -> {dest}", flush=True)
        if args.upscale:
            up_dest = os.path.join(out_dir, f"{i + 1:03d}_{label}_x4.png")
            up_path, up_err = upscale_image(dest, up_dest)
            if up_err:
                print(f"      upscale FAILED: {up_err}", flush=True)
            else:
                print(f"      upscaled 4x -> {up_path}", flush=True)

    try:
        proc.kill()
    except Exception:
        pass
    print(f"\nDone: {ok} succeeded, {len(failed)} failed. Output: {out_dir}")
    if failed:
        for label, err in failed:
            print(f"  FAILED {label}: {err}")
        sys.exit(2)


if __name__ == "__main__":
    main()
