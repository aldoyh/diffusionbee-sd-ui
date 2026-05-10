#!/usr/bin/env python3
"""
DiffusionBee Automated Top Models Installer
===========================================

This script automates fetching the top downloaded text-to-image models
from DiffusionBee's native list, and falls back to Hugging Face
if more models are requested.

Usage:
  python3 install_top_hf_models.py --api-key YOUR_HF_TOKEN --limit 5

Or set HF_TOKEN environment variable:
  export HF_TOKEN=YOUR_HF_TOKEN
  python3 install_top_hf_models.py --limit 5
"""

import argparse
import sys
import os
import subprocess
import json
import urllib.request
import time

def print_header(msg):
    print(f"\n{'-'*60}")
    print(f" {msg}")
    print(f"{'-'*60}")

def parse_args():
    parser = argparse.ArgumentParser(
        description="Automated top models installer from DiffusionBee and HuggingFace",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )

    hf_token = os.environ.get("HF_TOKEN")

    parser.add_argument("--api-key", type=str, required=not bool(hf_token), default=hf_token,
                        help="HuggingFace API Key (can also be set via HF_TOKEN env var)")
    parser.add_argument("--limit", type=int, default=3,
                        help="Number of top models to find and install (default: 3)")

    return parser.parse_args()

def install_requirements():
    try:
        from huggingface_hub import HfApi, hf_hub_download
    except ImportError:
        print_header("Installing Requirements")
        print("Installing huggingface_hub...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "huggingface_hub"])
        print("Dependencies installed successfully.")

def get_native_models():
    print_header("Querying DiffusionBee Native Models")
    try:
        url = "https://models.diffusionbee.com/list_models"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
        print(f"Found {len(data)} native models.")
        return data
    except Exception as e:
        print(f"❌ Error querying DiffusionBee native models: {e}")
        return []

def get_top_hf_models(api, limit):
    print_header(f"Querying Top {limit} text-to-image models from Hugging Face")
    try:
        models = list(api.list_models(filter="text-to-image", sort="likes", limit=limit))
        print(f"Found {len(models)} Hugging Face models.")
        return models
    except Exception as e:
        print(f"❌ Error querying Hugging Face API: {e}")
        return []

def find_suitable_weight_file(api, repo_id):
    try:
        files = api.list_repo_files(repo_id=repo_id)
        candidates = []
        for f in files:
            if f.endswith('.safetensors') or f.endswith('.ckpt'):
                candidates.append(f)

        if not candidates:
            return None

        primary_candidates = [c for c in candidates if not any(x in c for x in ['vae', 'text_encoder', 'safety_checker', 'controlnet'])]

        if primary_candidates:
            primary_candidates.sort(key=len)
            return primary_candidates[0]

        return candidates[0]
    except Exception as e:
        print(f"  ⚠️ Could not list files for {repo_id}: {e}")
        return None

def download_hf_model(api_key, repo_id, filename):
    print(f"  Downloading: {filename}")
    from huggingface_hub import hf_hub_download
    try:
        downloaded_path = hf_hub_download(
            repo_id=repo_id,
            filename=filename,
            token=api_key,
            local_dir_use_symlinks=False
        )
        print(f"  ✅ Download complete: {downloaded_path}")
        return downloaded_path
    except Exception as e:
        print(f"  ❌ Error downloading file: {e}")
        return None

def download_native_model(url, filename):
    print(f"  Downloading native model: {filename}")
    home_dir = os.path.expanduser("~")
    download_dir = os.path.join(home_dir, ".diffusionbee", "downloads")
    os.makedirs(download_dir, exist_ok=True)

    downloaded_path = os.path.join(download_dir, filename)
    if os.path.exists(downloaded_path):
        print(f"  ✅ Already downloaded: {downloaded_path}")
        return downloaded_path

    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            with open(downloaded_path, 'wb') as f:
                shutil.copyfileobj(response, f)
        print(f"  ✅ Download complete: {downloaded_path}")
        return downloaded_path
    except Exception as e:
        print(f"  ❌ Error downloading file: {e}")
        return None

def convert_model(downloaded_path, output_name):
    base_dir = os.getcwd()
    script_path = os.path.join(base_dir, "backends", "stable_diffusion", "diffusionbee_backend.py")

    if not os.path.exists(script_path):
        print(f"  ⚠️ Could not find diffusionbee_backend.py at {script_path}")
        return downloaded_path, {"type": "sd_model"} # if native tdict, fallback to original path

    home_dir = os.path.expanduser("~")
    models_path = os.path.join(home_dir, ".diffusionbee", "imported_models")
    os.makedirs(models_path, exist_ok=True)

    out_path = os.path.join(models_path, output_name + ".tdict")

    print(f"  Converting model to DiffusionBee format (*.tdict)...")
    try:
        cmd = [sys.executable, script_path, "convert_model", downloaded_path, out_path]
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        stdout, stderr = process.communicate()

        if process.returncode != 0:
            print(f"  ❌ Error during conversion:\n{stderr}")
            return None, None

        print(f"  ✅ Converted successfully to: {out_path}")
        metadata = {"type": "sd_model"}
        for line in stdout.split('\n'):
            if "__converted_model_data__" in line:
                try:
                    metadata_str = line.replace("__converted_model_data__", "")
                    metadata.update(json.loads(metadata_str))
                except:
                    pass
        return out_path, metadata
    except Exception as e:
        print(f"  ❌ Error during execution: {e}")
        return None, None

def register_in_diffusionbee(output_name, out_path, downloaded_path, metadata, description=""):
    home_dir = os.path.expanduser("~")
    assets_json_path = os.path.join(home_dir, ".diffusionbee", "locally_loaded_assets.json")
    try:
        assets = {}
        if os.path.exists(assets_json_path):
            with open(assets_json_path, 'r') as f:
                content = f.read()
                if content:
                    assets = json.loads(content)

        asset_id = output_name
        assets[asset_id] = {
            "id": asset_id,
            "filename": f"{output_name}.tdict",
            "asset_path": out_path,
            "asset_path_raw": downloaded_path,
            "is_locally_imported": True,
            "model_meta_data": metadata,
            "title": output_name,
            "description": description or f"Automated Import: {output_name}"
        }

        with open(assets_json_path, 'w') as f:
            json.dump(assets, f, indent=4)
        print(f"  ✅ Registered model '{output_name}' in DiffusionBee.")
    except Exception as e:
        print(f"  ⚠️ Could not automatically register model: {e}")

import shutil

def main():
    print("DiffusionBee - Automated Top Models Installer")
    print("=============================================")

    install_requirements()
    args = parse_args()

    from huggingface_hub import HfApi
    api = HfApi(token=args.api_key)

    installed_count = 0

    # 1. Try Native Models first
    native_models = get_native_models()
    for index, model in enumerate(native_models, 1):
        if installed_count >= args.limit:
            break

        print_header(f"[{installed_count+1}/{args.limit}] Processing Native: {model.get('title', model.get('id'))}")
        download_url = model.get('fallback_url') or model.get('url')
        if not download_url:
            print(f"  ❌ No valid URL found for {model.get('id')}. Skipping.")
            continue

        filename = model.get('filename') or download_url.split('/')[-1].split('?')[0]
        downloaded_path = download_native_model(download_url, filename)

        if not downloaded_path:
            continue

        output_name = model.get('id')
        out_path = downloaded_path
        metadata = model.get('model_meta_data', {"type": "sd_model"})

        # If it needs conversion or is safetensors
        if model.get('post_process') == 'convert_sd_to_tdict' or downloaded_path.endswith('.safetensors') or downloaded_path.endswith('.ckpt'):
            c_out_path, c_metadata = convert_model(downloaded_path, output_name)
            if c_out_path:
                out_path = c_out_path
                metadata.update(c_metadata)
            else:
                continue

        register_in_diffusionbee(output_name, out_path, downloaded_path, metadata, description=model.get('description'))
        installed_count += 1

    # 2. Fallback to HF Models if limit not reached
    if installed_count < args.limit:
        remaining = args.limit - installed_count
        print_header(f"Fetching {remaining} more from Hugging Face...")

        hf_models = get_top_hf_models(api, remaining + 5) # Fetch a bit more in case some fail

        for model in hf_models:
            if installed_count >= args.limit:
                break

            print_header(f"[{installed_count+1}/{args.limit}] Processing HF: {model.id} (Likes: {model.likes})")
            filename = find_suitable_weight_file(api, model.id)
            if not filename:
                print(f"  ❌ No suitable weight file found for {model.id}. Skipping.")
                continue

            downloaded_path = download_hf_model(args.api_key, model.id, filename)
            if not downloaded_path:
                continue

            output_name = model.id.replace('/', '_')
            out_path, metadata = convert_model(downloaded_path, output_name)

            if out_path:
                register_in_diffusionbee(output_name, out_path, downloaded_path, metadata, description=f"HuggingFace: {model.id}")
                installed_count += 1

    print_header("Process Complete!")
    print("Restart DiffusionBee or refresh the models list to use your new models.")

if __name__ == "__main__":
    main()
