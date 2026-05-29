# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_all

# --- 1. Collect everything for complex AI libraries ---
# We use collect_all to get hidden imports, data files, and binaries automatically
datas = []
binaries = []
hiddenimports = []

# List of libraries that need help
libs_to_collect = [
    'chromadb', 
    'sentence_transformers', 
    'tiktoken', 
    'huggingface_hub',
    'tqdm',
    'regex'
]

for lib in libs_to_collect:
    try:
        tmp_ret = collect_all(lib)
        datas += tmp_ret[0]
        binaries += tmp_ret[1]
        hiddenimports += tmp_ret[2]
    except Exception as e:
        print(f"Warning: Could not collect {lib}: {e}")

# --- 2. Add your specific project files ---
# Copy templates and static folders
datas += [
    ('templates', 'templates'),
    ('static', 'static'),
]

block_cipher = None

a = Analysis(
    ['app.py'],
    pathex=[],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='KnowledgeVaultAI',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True, # Keep True for now to see errors. Set to False later.
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='KnowledgeVaultAI',
)