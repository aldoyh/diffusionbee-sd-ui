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
 * THE GATE — the model types the ACTIVE generation backend can actually run.
 *
 * This is the single flip point for the whole FLUX story. The fork's TensorFlow
 * 2.10 backend has no FLUX inference (verified: the packaged upstream binary's
 * flux_dylib.dylib is unreferenced dead weight — nothing links or loads it), so
 * FLUX.1 / FLUX.2 must never be recommended, selected, or advertised as
 * generatable. Everything downstream — the onboarding picker, Homepage's model
 * picker, applet dropdowns, ModelStore badges — derives from this constant.
 *
 * When a real FLUX backend ships (upstream re-packaging or a decoupled MLX
 * sidecar), add the new model type(s) here (e.g. 'flux2_model', 'flux_nnc') and
 * flip `preferFlux2` in model_selection.js — no other code changes required.
 */
const GENERATABLE_MODEL_TYPES = ['sd_model', 'sd_model_inpaint'];

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
  enriched.skip_checksum = true;
  enriched.hf_auth_required = needsToken || Boolean(hfToken);
  return enriched;
}

function getFlux2Catalog(hfToken) {
  return FLUX2_MODELS
    .map((model) => enrichFlux2Model(model, hfToken))
    .filter(Boolean);
}

function mergeFlux2IntoCatalog(catalog, hfToken) {
  const base = Array.isArray(catalog) ? catalog.slice() : [];
  const flux2 = getFlux2Catalog(hfToken);
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
  return Boolean(
    model
    && model.model_meta_data
    && isGeneratableModelType(model.model_meta_data.type)
  );
}

module.exports = {
  FLUX2_MODELS,
  GENERATABLE_MODEL_TYPES,
  buildHfResolveUrl,
  enrichFlux2Model,
  getFlux2Catalog,
  mergeFlux2IntoCatalog,
  isFlux2Model,
  isGeneratableModelType,
  isInstalledModel,
};