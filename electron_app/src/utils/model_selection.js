const { isFlux2Model, resolveModelCapability } = require('./flux2_catalog.js');

const FALLBACK_SD15_MODEL = {
  id: 'Default_SD1.5',
  filename: 'sd-v1-5_fp16.tdict',
  md5: 'a36c79b8edb4b21b75e50d5834d1f4ae',
  is_stock_model: true,
  url: 'https://huggingface.co/divamgupta/stable_diffusion_mps/resolve/main/sd-v1-5_fp16.tdict',
  title: 'Stable Diffusion 1.5 (Default)',
  model_meta_data: { type: 'sd_model', float_type: 'float16', sd_type: 'SD_1x' },
};

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function getRuntimeSystemMemoryInfo() {
  if (typeof process !== 'undefined' && process && typeof process.getSystemMemoryInfo === 'function') {
    try {
      return process.getSystemMemoryInfo() || {};
    } catch (error) {
      return {};
    }
  }

  return {};
}

function getMachineProfile() {
  const systemMemoryInfo = getRuntimeSystemMemoryInfo();
  const deviceMemoryGb = typeof navigator !== 'undefined' && Number.isFinite(navigator.deviceMemory) ? Number(navigator.deviceMemory) : 0;
  const totalMemBytes = Number.isFinite(systemMemoryInfo.total)
    ? Number(systemMemoryInfo.total) * 1024
    : (deviceMemoryGb > 0 ? deviceMemoryGb * 1024 * 1024 * 1024 : 0);
  const freeMemBytes = Number.isFinite(systemMemoryInfo.free)
    ? Number(systemMemoryInfo.free) * 1024
    : 0;
  const cpuModel = typeof navigator !== 'undefined' ? String(navigator.userAgent || '') : '';
  const platform = typeof process !== 'undefined' && process ? String(process.platform || '') : '';
  const arch = typeof process !== 'undefined' && process ? String(process.arch || '') : '';

  return {
    platform,
    arch,
    cpuModel,
    totalMemBytes,
    freeMemBytes,
    totalMemGB: totalMemBytes / (1024 * 1024 * 1024),
    freeMemGB: freeMemBytes / (1024 * 1024 * 1024),
    isAppleSilicon: platform === 'darwin' && arch === 'arm64',
  };
}

function getModelSearchText(model) {
  if (!model) return '';

  const title = normalizeText(model.title);
  const id = normalizeText(model.id);
  const desc = normalizeText(model.description);
  const sdType = normalizeText(model.model_meta_data && model.model_meta_data.sd_type);
  const type = normalizeText(model.model_meta_data && model.model_meta_data.type);

  return [title, id, desc, sdType, type].filter(Boolean).join(' ');
}

function getModelSdType(model) {
  return normalizeText(model && model.model_meta_data && model.model_meta_data.sd_type);
}

function isSelectableStableDiffusionModel(model) {
  const text = getModelSearchText(model);
  if (!text) return false;
  // Per-backend capability gate: only `runnable` models are selectable for
  // generation. This kills both traps — the SDXL dev-backend trap (sdxl_base is
  // `unsupported` on dev-tf) and the FLUX.1 over-block (flux_nnc is
  // `unverified` on the packaged binary, so it is still not auto-selected, but
  // it is no longer hidden by a flat allowlist that also hid a working feature).
  if (resolveModelCapability(model) !== 'runnable') return false;
  if (isFlux2Model(model)) return false;
  if (text.includes('flux')) return false;
  if (text.includes('controlnet')) return false;
  if (text.includes('embedding')) return false;
  if (text.includes('lora')) return false;
  return true;
}

function isSelectableOnboardingModel(model) {
  if (!model || !model.id || !model.url) return false;
  // Onboarding must never recommend a model the backend can't generate with
  // (the FLUX trap: recommend → download → refuse at generation time). The
  // capability gate in isSelectableStableDiffusionModel now backs this per
  // backend kind, so `preferFlux2` can never resurrect a non-runnable pick.
  return isSelectableStableDiffusionModel(model);
}

function scoreFlux2Model(model, profile = getMachineProfile()) {
  if (!isFlux2Model(model)) return -1000;

  let score = 120;
  const sdType = getModelSdType(model);

  if (sdType.includes('flux2_klein_4b')) {
    score += 80;
  } else if (sdType.includes('flux2_klein_9b')) {
    score += 70;
  } else if (sdType.includes('flux2_dev')) {
    score += 55;
  }

  if (profile.totalMemGB >= 32 && sdType.includes('flux2_dev')) {
    score += 30;
  } else if (profile.totalMemGB >= 24 && sdType.includes('flux2_klein_9b')) {
    score += 28;
  } else if (profile.totalMemGB >= 16 && sdType.includes('flux2_klein_4b')) {
    score += 32;
  } else if (profile.totalMemGB >= 13 && sdType.includes('flux2_klein_4b')) {
    score += 24;
  } else {
    score -= 40;
  }

  if (profile.isAppleSilicon) {
    score += 8;
  }

  if (model.recommended_for_onboarding) {
    score += 20;
  }

  if (model.requires_hf_token) {
    score -= 6;
  }

  return score;
}

function scoreStableDiffusionModel(model, profile = getMachineProfile()) {
  if (!model) {
    return -1000;
  }

  if (isFlux2Model(model)) {
    return scoreFlux2Model(model, profile);
  }

  if (!isSelectableStableDiffusionModel(model)) {
    return -1000;
  }

  const text = getModelSearchText(model);
  const sdType = getModelSdType(model);
  let score = 0;

  if (sdType.includes('sdxl_base')) {
    score += 100;
  } else if (sdType.includes('sdxl')) {
    score += 92;
  } else if (sdType.includes('sd_1x')) {
    score += 72;
  } else if (sdType.includes('sd2')) {
    score += 58;
  } else {
    score += 44;
  }

  if (profile.totalMemGB >= 24) {
    if (sdType.includes('sdxl')) {
      score += 45;
    } else if (sdType.includes('sd_1x')) {
      score += 12;
    }
  } else if (profile.totalMemGB >= 16) {
    if (sdType.includes('sdxl')) {
      score += 24;
    } else if (sdType.includes('sd_1x')) {
      score += 16;
    }
  } else {
    if (sdType.includes('sdxl')) {
      score -= 38;
    } else if (sdType.includes('sd_1x')) {
      score += 24;
    }
  }

  if (profile.isAppleSilicon) {
    score += 5;
  }

  const positiveKeywords = [
    ['juggernaut xl 10', 68],
    ['juggernautxl', 64],
    ['juggernaut', 60],
    ['realvisxl', 58],
    ['realvis xl', 58],
    ['epicrealismxl', 52],
    ['epicrealism', 48],
    ['dreamshaperxl', 46],
    ['dreamshaper xl', 46],
    ['dreamshaper', 34],
    ['cyberrealistic', 38],
    ['deliberate', 30],
    ['dreamlike diffusion', 26],
    ['revanimated', 28],
    ['rev animated', 28],
    ['animagine', 28],
    ['anything xl', 22],
    ['pony realism', 20],
    ['protovision', 18],
    ['dynavision', 14],
    ['base 1.0', 24],
    ['sdxl base', 24],
    ['stable diffusion xl', 24],
    ['xl base', 20],
    ['photoreal', 12],
    ['cinematic', 10],
  ];

  for (const [needle, bonus] of positiveKeywords) {
    if (text.includes(needle)) {
      score += bonus;
    }
  }

  const negativeKeywords = [
    ['inpaint', 70],
    ['refiner', 80],
    ['controlnet', 40],
    ['flux', 1000],
    ['lcm', 16],
    ['lightning', 18],
    ['turbo', 12],
    ['tiny', 18],
    ['small', 16],
    ['test', 10],
    ['prototype', 8],
    ['anime', 8],
    ['cartoon', 8],
    ['stylized', 10],
    ['hyper', 6],
  ];

  for (const [needle, penalty] of negativeKeywords) {
    if (text.includes(needle)) {
      score -= penalty;
    }
  }

  if (model.is_locally_imported) {
    score += 2;
  }

  return score;
}

function sortStableDiffusionModelsBestFirst(models, profile = getMachineProfile()) {
  return (models || [])
    .slice()
    .sort((a, b) => {
      const scoreDiff = scoreStableDiffusionModel(b, profile) - scoreStableDiffusionModel(a, profile);
      if (scoreDiff !== 0) return scoreDiff;

      const titleDiff = normalizeText(a && a.title).localeCompare(normalizeText(b && b.title));
      if (titleDiff !== 0) return titleDiff;

      return normalizeText(a && a.id).localeCompare(normalizeText(b && b.id));
    });
}

function pickOptimalStableDiffusionModel(models, profile = getMachineProfile()) {
  const sorted = sortStableDiffusionModelsBestFirst(models, profile);
  return sorted.length > 0 ? sorted[0] : null;
}

// `pickOptimalOnboardingModel` is the synchronous entry point used by the
// setup overlay. Because the HF lookup is async/network-bound, the caller is
// expected to `await enrichOnboardingCandidatesWithHuggingFace(profile)` first
// (it returns a *new* models array that already includes HF-sourced candidates
// ranked by download popularity + machine fit). The synchronous picker then
// just treats them like any other catalog entry.
async function enrichOnboardingCandidatesWithHuggingFace(models = [], profile = getMachineProfile()) {
  const hfModels = await fetchBestHuggingFaceImageModel(profile);
  if (hfModels.length === 0) return models || [];
  // HF candidates go first (popular + fit-checked) but the synchronous picker's
  // scoring still re-ranks; we keep them in the pool so catalog/SD1.5 can win if
  // their score is higher for this machine.
  return [...hfModels, ...(models || [])];
}

function pickOptimalOnboardingModel(models, profile = getMachineProfile(), options = {}) {
  const hasHfToken = Boolean(options.hasHfToken);
  // FLUX preference is DISABLED while no backend can run FLUX. Flip to
  // `options.preferFlux2 !== false` (default-on) when a real FLUX backend
  // ships — resolveModelCapability gates it either way.
  const preferFlux2 = options.preferFlux2 === true;

  const candidates = (models || []).filter((model) => isSelectableOnboardingModel(model, {
    profile,
    hasHfToken,
  }));

  if (preferFlux2) {
    const flux2Candidates = candidates.filter(isFlux2Model);
    const bestFlux2 = pickOptimalStableDiffusionModel(flux2Candidates, profile);
    if (bestFlux2) {
      return bestFlux2;
    }
  }

  const sdCandidates = candidates.filter((model) => !isFlux2Model(model));
  return pickOptimalStableDiffusionModel(sdCandidates.length > 0 ? sdCandidates : candidates, profile);
}

// ── Hugging Face Hub integration ────────────────────────────────────────────
// Onboarding cross-checks the live HF Hub listing for the best image-generation
// model that fits the user's machine (RAM / Apple-Silicon aware). The Hub is a
// *recommendation source only* — the pick is still gated by resolveModelCapability
// and min_ram/size fit, and we fall back to the bundled catalog + SD1.5 default.

const HF_API_BASE = 'https://huggingface.co/api';

// Models we never want to surface from a blind Hub search (too large, unsafe,
// or not consumable by the backend even if popular).
const HF_BLOCKLIST_SUBSTRINGS = ['flux-1-dev', 'flux1-dev', 'sdxl-turbo', 'lcm'];

function getHfHeaders() {
  const headers = { Accept: 'application/json' };
  // Best-effort: a user-provided token (env only) widens gated-model access.
  try {
    if (typeof process !== 'undefined' && process && process.env && process.env.HF_TOKEN) {
      headers.Authorization = `Bearer ${process.env.HF_TOKEN}`;
    }
  } catch (error) {
    // ignore — anonymous access is fine for public models
  }
  return headers;
}

async function fetchJson(url, timeoutMs = 8000) {
  if (typeof fetch !== 'function') return null;
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const res = await fetch(url, { headers: getHfHeaders(), signal: controller ? controller.signal : undefined });
    if (!res || !res.ok) return null;
    return await res.json();
  } catch (error) {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Parse usable safetensors/size metadata from an HF model card + siblings.
function extractHfModelSizeBytes(model) {
  if (!model) return 0;
  let bytes = 0;
  const siblings = Array.isArray(model.siblings) ? model.siblings : [];
  for (const s of siblings) {
    if (s && /\.safetensors$/i.test(s.rfilename || '')) {
      const lfs = s.lfs || {};
      const size = Number.isFinite(lfs.size) ? lfs.size : 0;
      if (size > bytes) bytes = size;
    }
  }
  // Fallback: some cards expose total size on the model object.
  if (!bytes && Number.isFinite(model.usedStorageBytes)) {
    bytes = model.usedStorageBytes;
  }
  return bytes;
}

// Map an HF repo into the same shape isSelectableOnboardingModel expects.
function normalizeHfModel(model, profile = getMachineProfile()) {
  if (!model || !model.id) return null;
  const id = String(model.id);
  const lowerId = id.toLowerCase();

  if (HF_BLOCKLIST_SUBSTRINGS.some((s) => lowerId.includes(s))) return null;
  // Only consider checkpoints that are clearly Stable Diffusion / SDXL.
  if (!/(sd|sdxl|stable[-_]?diffusion|dreamshaper|deliberate|realvis|juggernaut|epicrealism|cyberrealistic)/i.test(lowerId)) {
    return null;
  }
  if (/(flux|controlnet|embedding|lora|inpaint|refiner|vae|upscaler|animatediff)/i.test(lowerId)) {
    return null;
  }

  const sizeBytes = extractHfModelSizeBytes(model);
  const sizeGB = sizeBytes / (1024 * 1024 * 1024);
  // Conservative RAM budget: the checkpoint plus runtime overhead.
  const estimatedRamGb = sizeGB > 0 ? sizeGB * 1.6 + 2 : 8;
  if (sizeGB > 0 && estimatedRamGb > profile.totalMemGB * 0.85) {
    return null; // would likely OOM on this machine
  }

  const isSdxl = /(sdxl|xl)/i.test(lowerId);
  const sdType = isSdxl ? 'SDXL_base' : 'SD_1x';
  const base = isSdxl ? 'sdxl' : 'sd15';

  return {
    id: `hf:${id}`,
    hf_id: id,
    url: `${HF_API_BASE.replace(/\/api$/, '')}/${id}/resolve/main/${isSdxl ? 'sd_xl_base_1.0.safetensors' : 'v1-5-pruned-emaonly.safetensors'}`,
    title: id.split('/').pop().replace(/[-_]/g, ' '),
    description: model.description || '',
    size_bytes: sizeBytes,
    estimated_ram_gb: estimatedRamGb,
    is_locally_imported: false,
    is_stock_model: false,
    model_meta_data: { type: 'sd_model', float_type: 'float16', sd_type: sdType, source: 'huggingface', base },
    downloads: Number.isFinite(model.downloads) ? model.downloads : 0,
    hf_source: true,
  };
}

// Fetch + rank the top HF models fit for this machine. Returns [] on any failure.
async function fetchBestHuggingFaceImageModel(profile = getMachineProfile()) {
  const query = encodeURIComponent('stable diffusion sdxl');
  const url = `${HF_API_BASE}/models?search=${query}&sort=downloads&direction=-1&limit=30&full=false`;
  const list = await fetchJson(url);
  if (!Array.isArray(list) || list.length === 0) return [];

  const ranked = list
    .map((m) => normalizeHfModel(m, profile))
    .filter(Boolean)
    .sort((a, b) => b.downloads - a.downloads);

  return ranked;
}

function getFallbackDefaultStableDiffusionAsset() {
  return JSON.parse(JSON.stringify(FALLBACK_SD15_MODEL));
}

module.exports = {
  FALLBACK_SD15_MODEL,
  getFallbackDefaultStableDiffusionAsset,
  getMachineProfile,
  getModelSearchText,
  getModelSdType,
  isFlux2Model,
  isSelectableOnboardingModel,
  isSelectableStableDiffusionModel,
  enrichOnboardingCandidatesWithHuggingFace,
  fetchBestHuggingFaceImageModel,
  pickOptimalOnboardingModel,
  pickOptimalStableDiffusionModel,
  scoreFlux2Model,
  scoreStableDiffusionModel,
  sortStableDiffusionModelsBestFirst,
};
