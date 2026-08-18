/**
 * FLUX.2 model catalog — sourced from Hugging Face (black-forest-labs).
 * Not yet in models.diffusionbee.com; merged into the app catalog at runtime.
 */

const HF_RESOLVE_BASE = 'https://huggingface.co';

const FLUX2_MODELS = [
  {
    id: 'FLUX.2-klein-4B',
    title: 'FLUX.2 Klein 4B',
    description: 'Fast open-weight FLUX.2 for text-to-image and editing. Apache 2.0, ~13GB VRAM.',
    filename: 'flux-2-klein-4b.safetensors',
    hf_repo_id: 'black-forest-labs/FLUX.2-klein-4B',
    hf_filename: 'flux-2-klein-4b.safetensors',
    source_page_url: 'https://huggingface.co/black-forest-labs/FLUX.2-klein-4B',
    is_stock_model: false,
    requires_hf_token: false,
    min_ram_gb: 13,
    recommended_for_onboarding: true,
    size_bytes: 7751105712,
    model_meta_data: {
      type: 'flux2_model',
      float_type: 'bfloat16',
      sd_type: 'flux2_klein_4b',
      family: 'flux2',
    },
  },
  {
    id: 'FLUX.2-klein-9B',
    title: 'FLUX.2 Klein 9B',
    description: 'Higher-quality FLUX.2 Klein distilled model. Gated on Hugging Face.',
    filename: 'flux-2-klein-9b.safetensors',
    hf_repo_id: 'black-forest-labs/FLUX.2-klein-9B',
    hf_filename: 'flux-2-klein-9b.safetensors',
    source_page_url: 'https://huggingface.co/black-forest-labs/FLUX.2-klein-9B',
    is_stock_model: false,
    requires_hf_token: true,
    min_ram_gb: 20,
    recommended_for_onboarding: false,
    size_bytes: 19000000000,
    model_meta_data: {
      type: 'flux2_model',
      float_type: 'bfloat16',
      sd_type: 'flux2_klein_9b',
      family: 'flux2',
    },
  },
  {
    id: 'FLUX.2-dev',
    title: 'FLUX.2 Dev',
    description: 'Full FLUX.2 development model. Best quality, largest download. Gated on Hugging Face.',
    filename: 'flux2-dev.safetensors',
    hf_repo_id: 'black-forest-labs/FLUX.2-dev',
    hf_filename: 'flux2-dev.safetensors',
    source_page_url: 'https://huggingface.co/black-forest-labs/FLUX.2-dev',
    is_stock_model: false,
    requires_hf_token: true,
    min_ram_gb: 28,
    recommended_for_onboarding: false,
    size_bytes: 54000000000,
    model_meta_data: {
      type: 'flux2_model',
      float_type: 'bfloat16',
      sd_type: 'flux2_dev',
      family: 'flux2',
    },
  },
];

/**
 * Per-backend capability contract (M0.1).
 *
 * The fork runs TWO backends that genuinely differ in what they can run (see
 * recon/2026-08-18-full-uiux-models-onboarding.md §3.3):
 *
 *   - `dev-tf`: the source TensorFlow 2.10 backend (venv311). Its
 *     ModelInterface.avail_models is ["sd_1x","sd_2x","sd_1x_inpaint",
 *     "sd_1x_controlnet"] — NO sdxl_base, NO flux.
 *   - `packaged-binary`: the reused upstream 2.5.3 binary. Its NNC interface
 *     (int_1) runs sd_1x + sdxl + FLUX (`flux_nnc`). FLUX.1 is *reachable* in
 *     the frozen binary (the FLUX DiT binding + flux_dylib.dylib are present),
 *     but it has never been runtime-verified for this fork — so it resolves to
 *     `unverified`, not `runnable`.
 *
 * A flat allowlist cannot express this. `resolveModelCapability(model, caps)`
 * is the single predicate every picker derives from. Each backend's manifest
 * maps `model_meta_data.type` → { sd_types: [], status }, with semantics:
 *   - missing type                              → `unsupported`
 *   - entry.status === 'unsupported'            → `unsupported`
 *   - empty `sd_types`                          → any sd_type allowed → entry.status
 *   - non-empty `sd_types`                      → model.sd_type must fuzzy-match one, else `unsupported`
 *
 * The active caps come from (in order): the backend's `sdbk caps` self-report
 * (dev backend only — the frozen binary can't self-report), then the
 * `backend_kind` tag from bridge.js, then the conservative default below.
 */
const GENERATABLE_MODEL_TYPES = ['sd_model', 'sd_model_inpaint'];

const BACKEND_CAPABILITY_MANIFEST = {
  'dev-tf': {
    sd_model:         { sd_types: ['sd_1x', 'sd_2x'], status: 'runnable' },
    sd_model_inpaint: { sd_types: [],                   status: 'runnable' },
    flux_nnc:         { sd_types: [],                   status: 'unsupported' },
    flux2_model:      { sd_types: [],                   status: 'unsupported' },
  },
  'packaged-binary': {
    sd_model:         { sd_types: ['sd_1x', 'sd_2x', 'sdxl_base'], status: 'runnable' },
    sd_model_inpaint: { sd_types: [],                              status: 'runnable' },
    flux_nnc:         { sd_types: ['flux_schnell', 'flux_dev'],    status: 'unverified' },
    flux2_model:      { sd_types: [],                              status: 'unsupported' },
  },
};

const DEFAULT_BACKEND_KIND = 'dev-tf';

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function normalizeBackendCaps(caps) {
  // Accepts either the internal manifest entry shape or a backend self-report
  // object; always returns the internal { model_type: { sd_types, status } } shape.
  if (!caps || typeof caps !== 'object') {
    return normalizeBackendCaps(BACKEND_CAPABILITY_MANIFEST[DEFAULT_BACKEND_KIND]);
  }
  const out = {};
  for (const [type, entry] of Object.entries(caps)) {
    if (entry && typeof entry === 'object' && entry.status) {
      out[type] = {
        sd_types: Array.isArray(entry.sd_types) ? entry.sd_types.map(normalizeText) : [],
        status: entry.status,
      };
    } else if (Array.isArray(entry)) {
      // Tolerate the simpler "type -> [sd_types]" self-report shape.
      out[type] = { sd_types: entry.map(normalizeText), status: 'runnable' };
    }
  }
  if (Object.keys(out).length === 0) {
    return normalizeBackendCaps(BACKEND_CAPABILITY_MANIFEST[DEFAULT_BACKEND_KIND]);
  }
  return out;
}

let activeBackendCaps = normalizeBackendCaps(BACKEND_CAPABILITY_MANIFEST[DEFAULT_BACKEND_KIND]);

function setActiveBackendKind(kind) {
  if (kind && BACKEND_CAPABILITY_MANIFEST[kind]) {
    activeBackendCaps = normalizeBackendCaps(BACKEND_CAPABILITY_MANIFEST[kind]);
  }
}

function setActiveBackendCaps(caps) {
  activeBackendCaps = normalizeBackendCaps(caps);
}

function getActiveBackendCaps() {
  return activeBackendCaps;
}

function resolveModelCapability(model, backendCaps) {
  const caps = backendCaps || activeBackendCaps;
  const type = normalizeText(model && model.model_meta_data && model.model_meta_data.type);
  if (!type) return 'unsupported';

  const entry = caps[type];
  if (!entry) return 'unsupported';
  if (entry.status === 'unsupported') return 'unsupported';

  const allowedSdTypes = entry.sd_types || [];
  if (allowedSdTypes.length === 0) return entry.status || 'runnable';

  const sdType = normalizeText(model && model.model_meta_data && model.model_meta_data.sd_type);
  if (!sdType) return 'unsupported';

  const matches = allowedSdTypes.some((allowed) => sdType.includes(allowed) || allowed.includes(sdType));
  return matches ? (entry.status || 'runnable') : 'unsupported';
}

function buildHfResolveUrl(repoId, filename, revision = 'main') {
  const repo = String(repoId || '').replace(/^\/+|\/+$/g, '');
  const file = String(filename || '').replace(/^\//, '');
  return `${HF_RESOLVE_BASE}/${repo}/resolve/${revision}/${file}`;
}

function enrichFlux2Model(model, hfToken) {
  if (!model || !model.hf_repo_id || !model.hf_filename) {
    return null;
  }

  const needsToken = Boolean(model.requires_hf_token);
  if (needsToken && !hfToken) {
    return null;
  }

  const enriched = JSON.parse(JSON.stringify(model));
  enriched.url = buildHfResolveUrl(model.hf_repo_id, model.hf_filename);
  enriched.download_source = 'huggingface';
  // NOTE: no skip_checksum here — downloads now carry integrity via the
  // LFS/Xet ETag (content SHA-256) recorded at download time and cross-checked
  // on resume (see native_functions.js download-file). FLUX models have no
  // catalog md5, so verification is etag-based rather than 'skip everything'.
  enriched.hf_auth_required = needsToken || Boolean(hfToken);
  return enriched;
}

function getFlux2Catalog(hfToken) {
  return FLUX2_MODELS
    .map((model) => enrichFlux2Model(model, hfToken))
    .filter(Boolean);
}

/**
 * Static sidecar for catalog models that predate the size/ram/license/tier
 * schema (M1, DoD #8). Only values we actually know are populated — size_bytes
 * is deliberately absent here because the community catalog does not carry it;
 * the renderer falls back to the on-disk size once downloaded and shows
 * "Size unknown" otherwise (never a fabricated byte count).
 */
const MODEL_METADATA_SIDECAR = {
  'Default_SD1.5':          { min_ram_gb: 4,  tier: 'stock',     license: 'CreativeML OpenRAIL-M' },
  'DreamShaper_6_baked_vae':{ min_ram_gb: 4,  tier: 'community', license: null },
  'CyberRealistic__v3.1':   { min_ram_gb: 4,  tier: 'community', license: null },
  'Juggernaut_X':           { min_ram_gb: 12, tier: 'community', license: null },
};

function enrichModelMetadata(model) {
  if (!model || !model.id) return model;
  const sidecar = MODEL_METADATA_SIDECAR[model.id];
  if (!sidecar) return model;
  const out = Object.assign({}, model);
  for (const key of ['min_ram_gb', 'tier', 'license']) {
    if (sidecar[key] != null && out[key] == null) {
      out[key] = sidecar[key];
    }
  }
  return out;
}

function mergeFlux2IntoCatalog(catalog, hfToken) {
  const base = (Array.isArray(catalog) ? catalog.slice() : []).map((m) => enrichModelMetadata(m));
  const flux2 = getFlux2Catalog(hfToken).map((m) => enrichModelMetadata(m));
  const existingIds = new Set(base.map((m) => m && m.id).filter(Boolean));

  for (const model of flux2) {
    if (!existingIds.has(model.id)) {
      base.unshift(model);
    }
  }

  return base;
}

function isFlux2Model(model) {
  const family = model && model.model_meta_data && model.model_meta_data.family;
  if (family === 'flux2') return true;
  const sdType = String((model && model.model_meta_data && model.model_meta_data.sd_type) || '').toLowerCase();
  return sdType.startsWith('flux2');
}

function isGeneratableModelType(type) {
  return GENERATABLE_MODEL_TYPES.includes(type);
}

function isInstalledModel(model) {
  return resolveModelCapability(model) === 'runnable';
}

function isRunnableModel(model) {
  return resolveModelCapability(model) === 'runnable';
}

function isDownloadableModel(model) {
  const capability = resolveModelCapability(model);
  return capability === 'runnable' || capability === 'unverified';
}

module.exports = {
  FLUX2_MODELS,
  GENERATABLE_MODEL_TYPES,
  BACKEND_CAPABILITY_MANIFEST,
  MODEL_METADATA_SIDECAR,
  buildHfResolveUrl,
  enrichFlux2Model,
  enrichModelMetadata,
  getFlux2Catalog,
  mergeFlux2IntoCatalog,
  isFlux2Model,
  isGeneratableModelType,
  isInstalledModel,
  isRunnableModel,
  isDownloadableModel,
  resolveModelCapability,
  setActiveBackendKind,
  setActiveBackendCaps,
  getActiveBackendCaps,
};