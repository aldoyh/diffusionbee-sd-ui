#!/usr/bin/env python3
"""
DiffusionBee HuggingFace Model Installer
========================================

Download and install HuggingFace models into DiffusionBee.

Usage:
  python3 install_hf_model.py --preset flux2-klein-4b
  python3 install_hf_model.py --model-id runwayml/stable-diffusion-v1-5 --filename v1-5-pruned-emaonly.ckpt

Environment:
  HF_TOKEN, HUGGINGFACE_API_KEY, or HF_API_KEY
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys

FLUX2_PRESETS = {
    "flux2-klein-4b": {
        "model_id": "black-forest-labs/FLUX.2-klein-4B",
        "filename": "flux-2-klein-4b.safetensors",
        "output_name": "FLUX.2-klein-4B",
        "title": "FLUX.2 Klein 4B",
        "description": "Fast open-weight FLUX.2 for text-to-image and editing.",
        "model_meta_data": {
            "type": "flux2_model",
            "float_type": "bfloat16",
            "sd_type": "flux2_klein_4b",
            "family": "flux2",
        },
        "requires_hf_token": False,
    },
    "flux2-klein-9b": {
        "model_id": "black-forest-labs/FLUX.2-klein-9B",
        "filename": "flux-2-klein-9b.safetensors",
        "output_name": "FLUX.2-klein-9B",
        "title": "FLUX.2 Klein 9B",
        "description": "Higher-quality FLUX.2 Klein distilled model.",
        "model_meta_data": {
            "type": "flux2_model",
            "float_type": "bfloat16",
            "sd_type": "flux2_klein_9b",
            "family": "flux2",
        },
        "requires_hf_token": True,
    },
    "flux2-dev": {
        "model_id": "black-forest-labs/FLUX.2-dev",
        "filename": "flux2-dev.safetensors",
        "output_name": "FLUX.2-dev",
        "title": "FLUX.2 Dev",
        "description": "Full FLUX.2 development model.",
        "model_meta_data": {
            "type": "flux2_model",
            "float_type": "bfloat16",
            "sd_type": "flux2_dev",
            "family": "flux2",
        },
        "requires_hf_token": True,
    },
}


def print_header(msg: str) -> None:
    print(f"\n{'-'*60}")
    print(f" {msg}")
    print(f"{'-'*60}")


def resolve_hf_token(explicit: str | None = None) -> str:
    if explicit and explicit.strip():
        return explicit.strip()
    for key in ("HF_TOKEN", "HUGGINGFACE_API_KEY", "HF_API_KEY"):
        value = os.environ.get(key, "").strip()
        if value:
            return value
    return ""


def parse_args():
    parser = argparse.ArgumentParser(
        description="Download and install HuggingFace models for DiffusionBee",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )

    hf_token = resolve_hf_token()

    parser.add_argument(
        "--api-key",
        type=str,
        default=hf_token,
        help="HuggingFace API key (HF_TOKEN / HUGGINGFACE_API_KEY / HF_API_KEY)",
    )
    parser.add_argument(
        "--preset",
        type=str,
        choices=sorted(FLUX2_PRESETS.keys()),
        help="Install a built-in FLUX.2 model preset",
    )
    parser.add_argument("--model-id", type=str, help="HuggingFace model repo id")
    parser.add_argument("--filename", type=str, help="Filename to download from the repo")
    parser.add_argument(
        "--output-name",
        type=str,
        help="Asset id to register in DiffusionBee (defaults to preset or filename stem)",
    )
    parser.add_argument(
        "--flux2",
        action="store_true",
        help="Install as FLUX.2 safetensors without SD tdict conversion",
    )

    args = parser.parse_args()

    if args.preset:
        preset = FLUX2_PRESETS[args.preset]
        args.model_id = preset["model_id"]
        args.filename = preset["filename"]
        args.output_name = args.output_name or preset["output_name"]
        args.flux2 = True
        args._preset_meta = preset
    else:
        args._preset_meta = None
        if not args.model_id or not args.filename:
            parser.error("Provide --preset or both --model-id and --filename")

    if not args.output_name:
        args.output_name = os.path.splitext(os.path.basename(args.filename))[0]

    if not args.api_key:
        preset_meta = args._preset_meta or {}
        if preset_meta.get("requires_hf_token"):
            parser.error("This preset requires a HuggingFace API key in the environment")

    return args


def install_requirements() -> None:
    try:
        from huggingface_hub import HfApi, hf_hub_download  # noqa: F401
        import tqdm  # noqa: F401
    except ImportError:
        print_header("Installing Requirements")
        print("Installing huggingface_hub and tqdm...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "huggingface_hub", "tqdm"])
        print("Dependencies installed successfully.")


def check_model_access(api, model_id: str) -> bool:
    print_header(f"Checking Access: {model_id}")
    try:
        model_info = api.model_info(model_id)
        print(f"✅ Successfully authenticated and found model: {model_info.id}")
        return True
    except Exception as exc:
        print("❌ Error accessing model. Please check your API key and model ID.")
        print(f"Details: {exc}")
        return False


def download_model(model_id: str, filename: str, api_key: str | None) -> str | None:
    print_header(f"Downloading: {filename}")
    from huggingface_hub import hf_hub_download

    try:
        downloaded_path = hf_hub_download(
            repo_id=model_id,
            filename=filename,
            token=api_key or None,
            local_dir_use_symlinks=False,
        )
        print(f"\n✅ Download complete: {downloaded_path}")
        return downloaded_path
    except Exception as exc:
        print(f"❌ Error downloading file: {exc}")
        return None


def register_downloaded_asset(asset: dict) -> None:
    home_dir = os.path.expanduser("~")
    assets_json_path = os.path.join(home_dir, ".diffusionbee", "downloaded_assets.json")
    os.makedirs(os.path.dirname(assets_json_path), exist_ok=True)

    assets = {}
    if os.path.exists(assets_json_path):
        with open(assets_json_path, "r", encoding="utf-8") as handle:
            content = handle.read().strip()
            if content:
                assets = json.loads(content)

    assets[asset["id"]] = asset
    with open(assets_json_path, "w", encoding="utf-8") as handle:
        json.dump(assets, handle, indent=2)

    print(f"✅ Registered model in {assets_json_path}")


def install_flux2_model(downloaded_path: str, args) -> None:
    print_header("Installing FLUX.2 model to DiffusionBee")

    home_dir = os.path.expanduser("~")
    assets_dir = os.path.join(home_dir, ".diffusionbee", "downloaded_assets")
    os.makedirs(assets_dir, exist_ok=True)

    preset = args._preset_meta or {}
    asset_id = args.output_name
    filename = os.path.basename(downloaded_path)
    dest_path = os.path.join(assets_dir, f"{asset_id}_{filename}")

    if os.path.abspath(downloaded_path) != os.path.abspath(dest_path):
        shutil.copy2(downloaded_path, dest_path)

    metadata = preset.get("model_meta_data") or {
        "type": "flux2_model",
        "float_type": "bfloat16",
        "sd_type": "flux2_model",
        "family": "flux2",
    }

    asset = {
        "id": asset_id,
        "filename": filename,
        "asset_path": dest_path,
        "asset_path_raw": dest_path,
        "title": preset.get("title") or asset_id,
        "description": preset.get("description") or f"Imported from HuggingFace: {args.model_id}",
        "source_page_url": f"https://huggingface.co/{args.model_id}",
        "download_source": "huggingface",
        "status": "done",
        "model_meta_data": metadata,
    }

    register_downloaded_asset(asset)
    print_header("Success!")
    print(f"The FLUX.2 model '{asset_id}' is now available in DiffusionBee.")
    print("Restart the application or refresh the models list to use it.")


def convert_and_install_model(downloaded_path: str, output_name: str) -> None:
    print_header("Installing to DiffusionBee")

    base_dir = os.getcwd()
    script_path = os.path.join(base_dir, "backends", "stable_diffusion", "diffusionbee_backend.py")

    if not os.path.exists(script_path):
        print(f"⚠️  Could not find diffusionbee_backend.py at {script_path}")
        print("Please run this script from the repository root to automatically convert the model.")
        print("\nAlternatively, import the downloaded file from the DiffusionBee UI:")
        print("1. Open DiffusionBee")
        print("2. Go to 'Models' tab")
        print("3. Click 'Import From Computer'")
        print(f"4. Select this file: {downloaded_path}")
        return

    home_dir = os.path.expanduser("~")
    models_path = os.path.join(home_dir, ".diffusionbee", "imported_models")
    os.makedirs(models_path, exist_ok=True)

    out_path = os.path.join(models_path, output_name + ".tdict")

    print("Converting model to DiffusionBee format (*.tdict)...")
    print("This may take a few minutes depending on your system.")

    cmd = [sys.executable, script_path, "convert_model", downloaded_path, out_path]
    process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    stdout, stderr = process.communicate()

    if process.returncode != 0:
        print(f"❌ Error during conversion:\n{stderr}")
        return

    print(f"✅ Model successfully converted and installed to: {out_path}")

    assets_json_path = os.path.join(home_dir, ".diffusionbee", "locally_loaded_assets.json")
    try:
        assets = {}
        if os.path.exists(assets_json_path):
            with open(assets_json_path, "r", encoding="utf-8") as handle:
                content = handle.read().strip()
                if content:
                    assets = json.loads(content)

        metadata = {"type": "sd_model"}
        for line in stdout.split("\n"):
            if "__converted_model_data__" in line:
                try:
                    metadata_str = line.replace("__converted_model_data__", "")
                    metadata.update(json.loads(metadata_str))
                except json.JSONDecodeError:
                    pass

        assets[output_name] = {
            "id": output_name,
            "filename": f"{output_name}.tdict",
            "asset_path": out_path,
            "asset_path_raw": downloaded_path,
            "is_locally_imported": True,
            "model_meta_data": metadata,
            "title": output_name,
            "description": f"Imported from HuggingFace: {output_name}",
        }

        with open(assets_json_path, "w", encoding="utf-8") as handle:
            json.dump(assets, handle, indent=4)

        print("✅ Registered model in DiffusionBee configuration.")
    except Exception as json_err:
        print(f"⚠️  Could not automatically register model in config: {json_err}")
        print(f"You may need to import {out_path} manually.")

    print_header("Success!")
    print(f"The model '{output_name}' is now available in DiffusionBee.")
    print("Restart the application or refresh the models list to use it.")


def main() -> None:
    print("DiffusionBee - HuggingFace Model Installer")
    print("==========================================")

    install_requirements()
    args = parse_args()

    from huggingface_hub import HfApi

    api = HfApi(token=args.api_key or None)
    if not check_model_access(api, args.model_id):
        sys.exit(1)

    downloaded_path = download_model(args.model_id, args.filename, args.api_key)
    if not downloaded_path:
        sys.exit(1)

    if args.flux2:
        install_flux2_model(downloaded_path, args)
    else:
        convert_and_install_model(downloaded_path, args.output_name)


if __name__ == "__main__":
    main()