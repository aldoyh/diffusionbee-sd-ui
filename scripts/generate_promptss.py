#!/usr/bin/env python3
"""
High-quality image generator for custom prompts from Promptss.json.
Uses the best available SD models to generate cinematic images.

Usage:
    python3 scripts/generate_promptss.py                          # generate all 5 prompts
    python3 scripts/generate_promptss.py --prompt-id master_9      # single prompt
    python3 scripts/generate_promptss.py --list-models             # show available models
    python3 scripts/generate_promptss.py --use-model deliberate    # use specific model
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
import time

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from PIL import Image
from scripts.lib.backend_client import BackendSession
from scripts.lib.image_checks import validate_image
from scripts.lib.paths import IMAGES_DIR

# ============================================================
# Model registry — maps short keys to resolved tdict paths
# ============================================================
AVAILABLE_MODELS = {
    "default": os.path.expanduser(
        "~/.diffusionbee/downloaded_assets/Default_SD1.5_sd-v1-5_fp16.tdict"
    ),
    "deliberate": os.path.expanduser(
        "~/.diffusionbee/imported_models/Deliberate_v2.tdict"
    ),
    "cyber": os.path.expanduser(
        "~/.diffusionbee/imported_models/"
        "CyberRealistic__v3.1_CyberRealistic__v3.1.safetensors.tdict"
    ),
    "dream": os.path.expanduser(
        "~/.diffusionbee/imported_models/"
        "DreamShaper_6_baked_vae_DreamShaper.safetensors.tdict"
    ),
}

MODEL_META = {
    "default": {
        "name": "Stable Diffusion 1.5 (Default)",
        "style": "General purpose, good base quality",
    },
    "deliberate": {
        "name": "Deliberate v2",
        "style": "Photorealistic, versatile, high quality",
    },
    "cyber": {
        "name": "CyberRealistic v3.1",
        "style": "Photorealistic portraits, skin texture",
    },
    "dream": {
        "name": "DreamShaper 6",
        "style": "Artistic, vivid colors, stylized realism",
    },
}

# Default generation parameters for best quality
DEFAULT_WIDTH = 768
DEFAULT_HEIGHT = 768
DEFAULT_STEPS = 50
DEFAULT_GUIDANCE = 7.0
DEFAULT_SCHEDULER = "ddim"


def list_available_models() -> list[tuple[str, str, bool]]:
    """Return list of (key, name, is_ready) for all registered models."""
    results = []
    for key, path in AVAILABLE_MODELS.items():
        ready = os.path.exists(path)
        meta = MODEL_META.get(key, {})
        name = meta.get("name", key)
        file_size = ""
        if ready:
            size_mb = os.path.getsize(path) / (1024 * 1024)
            file_size = f" ({size_mb:.0f} MB)"
        results.append((key, name, ready, path, file_size))
    return results


def find_best_available_model() -> tuple[str, str]:
    """Pick the best model that is actually on disk."""
    # Preference order: deliberate > cyber > dream > default
    for preferred in ["deliberate", "cyber", "dream", "default"]:
        path = AVAILABLE_MODELS.get(preferred, "")
        if path and os.path.exists(path):
            return preferred, path
    return "", ""


def clean_prompt_for_filename(prompt: str, max_len: int = 40) -> str:
    """Turn a prompt into a safe, readable filename fragment."""
    # Take first meaningful words
    clean = "".join(c if c.isalnum() or c in " _-" else " " for c in prompt)
    clean = " ".join(clean.split())
    words = clean.split()
    # Pick distinctive words
    key_words = []
    skip_words = {"a", "an", "the", "with", "in", "of", "on", "at", "and", "or", "for", "to", "is", "by"}
    for w in words:
        if w.lower() not in skip_words:
            key_words.append(w)
        if len("_".join(key_words)) > max_len:
            break
    if not key_words:
        key_words = words[:5]
    return "_".join(key_words[:8]).lower()


def generate_prompts(
    prompts_data: list[dict],
    model_key: str,
    model_path: str,
    width: int,
    height: int,
    steps: int,
    guidance: float,
    scheduler: str,
    output_dir: str,
    skip_existing: bool = True,
) -> list[dict]:
    """Generate images for each prompt in prompts_data using the backend."""
    os.makedirs(output_dir, exist_ok=True)
    results = []
    model_name = MODEL_META.get(model_key, {}).get("name", model_key)

    print(f"\n{'=' * 72}")
    print(f"  Model: {model_name}")
    print(f"  Size:  {width}×{height} × {steps} steps")
    print(f"  Guidance: {guidance} | Scheduler: {scheduler}")
    print(f"  Output: {output_dir}")
    print(f"{'=' * 72}")

    with BackendSession(ready_timeout=300) as session:
        for i, entry in enumerate(prompts_data, start=1):
            prompt_id = entry.get("prompt_id", f"prompt_{i}")
            description = entry.get("description", "")
            score = entry.get("score", 0)
            seed = entry.get("seed", hash(prompt_id) % 1000000 + 1000)
            elements = entry.get("elements", [])

            # Build a clean filename
            safe_name = clean_prompt_for_filename(description)
            filename = f"promptss_{prompt_id}_{safe_name}.png"
            filepath = os.path.join(output_dir, filename)

            if skip_existing and os.path.exists(filepath):
                size_kb = os.path.getsize(filepath) // 1024
                print(f"  [{i}/{len(prompts_data)}] {prompt_id} — SKIP (exists, {size_kb} KB)")
                ok, detail = validate_image(filepath)
                results.append({
                    "prompt_id": prompt_id,
                    "score": score,
                    "filepath": filepath,
                    "status": "skipped" if ok else "existing_file_invalid",
                    "size_kb": size_kb,
                    "detail": detail,
                })
                continue

            # Extract just the description portion for the prompt
            # (remove parenthetical weights which are for Stable Diffusion weighting)
            clean_prompt = description.strip()

            print(f"\n  [{i}/{len(prompts_data)}] {prompt_id} (score: {score})")
            print(f"  Prompt: {clean_prompt[:100]}...")
            print(f"  Seed:   {seed}")
            start = time.time()

            image_path = session.generate(
                prompt=clean_prompt,
                model_path=model_path,
                seed=seed,
                num_steps=steps,
                width=width,
                height=height,
            )
            elapsed = time.time() - start

            if not image_path or not os.path.exists(image_path):
                print(f"  ✗ Failed — no image returned ({elapsed:.0f}s)")
                results.append({
                    "prompt_id": prompt_id,
                    "score": score,
                    "filepath": None,
                    "status": "failed",
                    "error": "No image returned from backend",
                })
                continue

            # Copy to output directory
            shutil.copy2(image_path, filepath)
            size_kb = os.path.getsize(filepath) // 1024

            # Validate
            ok, detail = validate_image(filepath)
            dims = ""
            try:
                with Image.open(filepath) as img:
                    w, h = img.size
                    dims = f" {w}×{h}"
            except Exception:
                pass

            if ok:
                print(f"  ✓ Generated in {elapsed:.0f}s — {filename}{dims} ({size_kb} KB)")
            else:
                print(f"  ⚠ Generated but validation: {detail}")

            results.append({
                "prompt_id": prompt_id,
                "score": score,
                "filepath": filepath,
                "filename": filename,
                "status": "success" if ok else "invalid",
                "size_kb": size_kb,
                "dimensions": dims.strip(),
                "elapsed_seconds": round(elapsed, 1),
            })

    return results


def print_summary(results: list[dict], output_dir: str):
    """Print a nicely formatted summary of generation results."""
    successes = [r for r in results if r["status"] == "success"]
    skipped = [r for r in results if r["status"] == "skipped"]
    failures = [r for r in results if r["status"] not in ("success", "skipped")]

    print(f"\n{'=' * 72}")
    print(f"  RESULTS SUMMARY")
    print(f"{'=' * 72}")
    print(f"  Total:   {len(results)}")
    print(f"  Success: {len(successes)}")
    print(f"  Skipped: {len(skipped)}")
    print(f"  Failed:  {len(failures)}")

    if successes:
        print(f"\n  {'─' * 70}")
        print(f"  Generated images:")
        print(f"  {'─' * 70}")
        for r in successes:
            dims = r.get("dimensions", "?")
            size = r.get("size_kb", "?")
            elapsed = r.get("elapsed_seconds", "?")
            print(f"  ✓ {r['prompt_id']:30s}  {dims:12s}  {size:>5} KB  {elapsed:>4}s")

    if failures:
        print(f"\n  {'─' * 70}")
        print(f"  Failures:")
        print(f"  {'─' * 70}")
        for r in failures:
            error = r.get("error", "unknown")
            print(f"  ✗ {r['prompt_id']:30s}  {error}")

    print(f"\n  Output directory: {output_dir}")
    print(f"{'=' * 72}")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate images from Promptss.json with best settings"
    )
    parser.add_argument(
        "--prompt-id",
        type=str,
        default="",
        help="Generate only a single prompt by prompt_id (e.g., 'master_9_revised')",
    )
    parser.add_argument(
        "--list-models",
        action="store_true",
        help="List available models and exit",
    )
    parser.add_argument(
        "--use-model",
        type=str,
        default="auto",
        choices=["auto", "default", "deliberate", "cyber", "dream"],
        help="Which model to use (auto = best available)",
    )
    parser.add_argument(
        "--width",
        type=int,
        default=DEFAULT_WIDTH,
        help=f"Image width (default: {DEFAULT_WIDTH})",
    )
    parser.add_argument(
        "--height",
        type=int,
        default=DEFAULT_HEIGHT,
        help=f"Image height (default: {DEFAULT_HEIGHT})",
    )
    parser.add_argument(
        "--steps",
        type=int,
        default=DEFAULT_STEPS,
        help=f"Number of inference steps (default: {DEFAULT_STEPS})",
    )
    parser.add_argument(
        "--guidance",
        type=float,
        default=DEFAULT_GUIDANCE,
        help=f"Guidance scale (default: {DEFAULT_GUIDANCE})",
    )
    parser.add_argument(
        "--scheduler",
        type=str,
        default=DEFAULT_SCHEDULER,
        choices=["ddim", "karras", "k_euler", "k_euler_ancestral", "pndm", "lms"],
        help=f"Scheduler (default: {DEFAULT_SCHEDULER})",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="",
        help="Output directory (default: ~/.diffusionbee/images/promptss)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Regenerate images that already exist",
    )
    parser.add_argument(
        "--prompts-file",
        type=str,
        default=os.path.expanduser(
            "~/Projects/commonScripts/php-commands/Promptss.json"
        ),
        help="Path to Promptss.json file",
    )

    args = parser.parse_args()

    # ── List models mode ──
    if args.list_models:
        print(f"\n{'=' * 72}")
        print(f"  Available Models")
        print(f"{'=' * 72}")
        for key, name, ready, path, size in list_available_models():
            status = "✓ READY" if ready else "✗ NOT FOUND"
            meta = MODEL_META.get(key, {})
            style = meta.get("style", "")
            print(f"  {status}  {key:15s}  {name}{size}")
            if path:
                print(f"          {path}")
            if style:
                print(f"          Style: {style}")
            print()
        return 0

    # ── Load prompts ──
    prompts_path = args.prompts_file
    if not os.path.exists(prompts_path):
        print(f"ERROR: Prompts file not found at {prompts_path}")
        return 1

    # Handle non-UTF-8 characters (e.g. Windows-1252 em dash 0x97)
    raw_bytes = open(prompts_path, "rb").read()
    try:
        text = raw_bytes.decode("utf-8")
    except UnicodeDecodeError:
        text = raw_bytes.decode("windows-1252", errors="replace")
    all_prompts = json.loads(text)

    if not isinstance(all_prompts, list) or len(all_prompts) == 0:
        print(f"ERROR: No prompts found in {prompts_path}")
        return 1

    print(f"\nLoaded {len(all_prompts)} prompts from {prompts_path}")

    # Filter by prompt_id if specified
    if args.prompt_id:
        filtered = [p for p in all_prompts if args.prompt_id in p.get("prompt_id", "")]
        if not filtered:
            print(f"ERROR: No prompt matches '{args.prompt_id}'")
            available = [p.get("prompt_id", "?") for p in all_prompts]
            print(f"  Available IDs: {', '.join(available)}")
            return 1
        all_prompts = filtered
        print(f"Filtered to 1 prompt: {all_prompts[0]['prompt_id']}")

    # ── Select model ──
    if args.use_model == "auto":
        model_key, model_path = find_best_available_model()
        if not model_path:
            print("ERROR: No models available on disk!")
            print("  Available model paths checked:")
            for key, path in AVAILABLE_MODELS.items():
                exists = os.path.exists(path)
                print(f"    {key:15s}  {'✓' if exists else '✗'}  {path}")
            return 1
        print(f"Auto-selected model: {model_key} -> {MODEL_META[model_key]['name']}")
    else:
        model_key = args.use_model
        model_path = AVAILABLE_MODELS.get(model_key, "")
        if not model_path or not os.path.exists(model_path):
            print(f"ERROR: Model '{model_key}' not available at {model_path}")
            return 1

    # ── Output directory ──
    output_dir = args.output_dir or os.path.join(IMAGES_DIR, "promptss")
    skip_existing = not args.force

    # Sort prompts by score (highest first)
    all_prompts.sort(key=lambda p: p.get("score", 0), reverse=True)

    # ── Generate ──
    results = generate_prompts(
        prompts_data=all_prompts,
        model_key=model_key,
        model_path=model_path,
        width=args.width,
        height=args.height,
        steps=args.steps,
        guidance=args.guidance,
        scheduler=args.scheduler,
        output_dir=output_dir,
        skip_existing=skip_existing,
    )

    # ── Summary ──
    print_summary(results, output_dir)

    # Determine exit code
    failures = [r for r in results if r["status"] not in ("success", "skipped")]
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
