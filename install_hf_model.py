#!/usr/bin/env python3
"""
DiffusionBee HuggingFace Model Installer
========================================

A seamless and intuitive script to download, install and configure
HuggingFace models directly into DiffusionBee.

Usage:
  python3 install_hf_model.py --api-key YOUR_HF_TOKEN --model-id runwayml/stable-diffusion-v1-5 --filename v1-5-pruned-emaonly.ckpt

Or set HF_TOKEN environment variable:
  export HF_TOKEN=YOUR_HF_TOKEN
  python3 install_hf_model.py --model-id runwayml/stable-diffusion-v1-5 --filename v1-5-pruned-emaonly.ckpt
"""

import argparse
import sys
import os
import subprocess
import json

def print_header(msg):
    print(f"\n{'-'*60}")
    print(f" {msg}")
    print(f"{'-'*60}")

def parse_args():
    parser = argparse.ArgumentParser(
        description="Download and install HuggingFace models for DiffusionBee",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )

    hf_token = os.environ.get("HF_TOKEN")

    parser.add_argument("--api-key", type=str, required=not bool(hf_token), default=hf_token,
                        help="HuggingFace API Key (can also be set via HF_TOKEN env var)")
    parser.add_argument("--model-id", type=str, required=True,
                        help="HuggingFace Model ID (e.g., runwayml/stable-diffusion-v1-5)")
    parser.add_argument("--filename", type=str, required=True,
                        help="Filename to download (e.g., v1-5-pruned-emaonly.ckpt or v1-5-pruned.safetensors)")
    parser.add_argument("--output-name", type=str, required=False,
                        help="Name to save the model as in DiffusionBee (defaults to filename without extension)")

    return parser.parse_args()

def install_requirements():
    try:
        from huggingface_hub import HfApi, hf_hub_download
        import tqdm
    except ImportError:
        print_header("Installing Requirements")
        print("Installing huggingface_hub and tqdm...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "huggingface_hub", "tqdm"])
        print("Dependencies installed successfully.")

def check_model_access(api, model_id):
    print_header(f"Checking Access: {model_id}")
    try:
        model_info = api.model_info(model_id)
        print(f"✅ Successfully authenticated and found model: {model_info.id}")
        return True
    except Exception as e:
        print(f"❌ Error accessing model. Please check your API key and model ID.")
        print(f"Details: {e}")
        return False

def download_model(model_id, filename, api_key):
    print_header(f"Downloading: {filename}")
    from huggingface_hub import hf_hub_download

    try:
        # Use hf_hub_download which shows a nice progress bar automatically
        downloaded_path = hf_hub_download(
            repo_id=model_id,
            filename=filename,
            token=api_key,
            local_dir_use_symlinks=False
        )
        print(f"\n✅ Download complete: {downloaded_path}")
        return downloaded_path
    except Exception as e:
        print(f"❌ Error downloading file: {e}")
        return None

def convert_and_install_model(downloaded_path, output_name):
    print_header("Installing to DiffusionBee")

    # Check if we are inside diffusionbee repo
    base_dir = os.getcwd()
    script_path = os.path.join(base_dir, "backends", "stable_diffusion", "diffusionbee_backend.py")

    if not os.path.exists(script_path):
        print(f"⚠️  Could not find diffusionbee_backend.py at {script_path}")
        print("Please run this script from the root of the diffusionbee-stable-diffusion-ui repository to automatically convert the model.")
        print("\nAlternatively, you can manually import the downloaded file from the DiffusionBee UI:")
        print("1. Open DiffusionBee")
        print("2. Go to 'Models' tab")
        print("3. Click 'Import From Computer'")
        print(f"4. Select this file: {downloaded_path}")
        return

    # Setup directories
    home_dir = os.path.expanduser("~")
    models_path = os.path.join(home_dir, ".diffusionbee", "imported_models")
    os.makedirs(models_path, exist_ok=True)

    out_path = os.path.join(models_path, output_name + ".tdict")

    print(f"Converting model to DiffusionBee format (*.tdict)...")
    print(f"This may take a few minutes depending on your system.")

    try:
        # Run conversion script
        cmd = [sys.executable, script_path, "convert_model", downloaded_path, out_path]

        # Run process and stream output
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        # Wait for completion
        stdout, stderr = process.communicate()

        if process.returncode != 0:
            print(f"❌ Error during conversion:\n{stderr}")
            return

        print(f"✅ Model successfully converted and installed to: {out_path}")

        # Try to update the locally_loaded_assets.json if possible to make it show up in the UI automatically
        assets_json_path = os.path.join(home_dir, ".diffusionbee", "locally_loaded_assets.json")
        try:
            assets = {}
            if os.path.exists(assets_json_path):
                with open(assets_json_path, 'r') as f:
                    content = f.read()
                    if content:
                        assets = json.loads(content)

            # Extract metadata if available in stdout
            metadata = {"type": "sd_model"}
            for line in stdout.split('\n'):
                if "__converted_model_data__" in line:
                    try:
                        metadata_str = line.replace("__converted_model_data__", "")
                        metadata.update(json.loads(metadata_str))
                    except:
                        pass

            asset_id = output_name
            assets[asset_id] = {
                "id": asset_id,
                "filename": f"{output_name}.tdict",
                "asset_path": out_path,
                "asset_path_raw": downloaded_path,
                "is_locally_imported": True,
                "model_meta_data": metadata,
                "title": output_name,
                "description": f"Imported from HuggingFace: {output_name}"
            }

            with open(assets_json_path, 'w') as f:
                json.dump(assets, f, indent=4)

            print(f"✅ Registered model in DiffusionBee configuration.")

        except Exception as json_err:
            print(f"⚠️  Could not automatically register model in config: {json_err}")
            print(f"You may need to import {out_path} manually.")

        print_header("Success!")
        print(f"The model '{output_name}' is now available in DiffusionBee.")
        print("Restart the application or refresh the models list to use it.")

    except Exception as e:
        print(f"❌ Error during execution: {e}")

def main():
    print("DiffusionBee - HuggingFace Model Installer")
    print("==========================================")

    install_requirements()
    args = parse_args()

    from huggingface_hub import HfApi
    api = HfApi(token=args.api_key)

    if not check_model_access(api, args.model_id):
        sys.exit(1)

    downloaded_path = download_model(args.model_id, args.filename, args.api_key)
    if not downloaded_path:
        sys.exit(1)

    output_name = args.output_name if args.output_name else os.path.splitext(args.filename)[0]
    convert_and_install_model(downloaded_path, output_name)

if __name__ == "__main__":
    main()
