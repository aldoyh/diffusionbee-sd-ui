# -*- mode: python ; coding: utf-8 -*-
# Windows PyInstaller spec for the DiffusionBee backend.
# Run from backends/stable_diffusion/ with: pyinstaller diffusionbee_backend.spec
# Produces a FLAT dist/diffusionbee_backend/ directory (exe + DLLs together),
# matching the layout electron's bridge.js and prepare_backend_for_packaging.js expect.

from PyInstaller.utils.hooks import collect_submodules, collect_data_files

hiddenimports = (
    collect_submodules('tensorflow')
    + collect_submodules('onnxruntime')
    + collect_submodules('scipy')
    + collect_submodules('skimage')
    + ['cv2', 'safetensors', 'safetensors.numpy', 'pandas', 'numexpr', 'ftfy', 'regex']
)

datas = (
    collect_data_files('tensorflow')
    + collect_data_files('onnxruntime')
)

a = Analysis(
    ['diffusionbee_backend.py'],
    pathex=['.', '../model_converter', '../stable_diffusion_tf_models'],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='diffusionbee_backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=True,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='diffusionbee_backend',
)
