const { getMachineProfile } = require('./model_selection.js');

const DEFAULT_OLLAMA_BASE_URL = 'http://127.0.0.1:11434';
const OLLAMA_MODEL_CACHE_TTL_MS = 15000;

let ollamaModelCache = {
  fetchedAt: 0,
  models: [],
};

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function getModelName(model) {
  if (!model) return '';
  return String(model.name || model.model || model.id || '').trim();
}

function getModelSizeBytes(model) {
  const size = Number(model && model.size);
  return Number.isFinite(size) ? size : 0;
}

function getModelSizeGb(model) {
  return getModelSizeBytes(model) / (1024 * 1024 * 1024);
}

function formatOllamaModelLabel(model) {
  const name = getModelName(model) || 'Unknown model';
  const sizeGb = getModelSizeGb(model);
  if (!sizeGb) return name;
  return `${name} · ${sizeGb.toFixed(1)} GB`;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function listOllamaModels({ baseUrl = DEFAULT_OLLAMA_BASE_URL, forceRefresh = false } = {}) {
  const now = Date.now();
  if (!forceRefresh && ollamaModelCache.models.length > 0 && (now - ollamaModelCache.fetchedAt) < OLLAMA_MODEL_CACHE_TTL_MS) {
    return ollamaModelCache.models.slice();
  }

  try {
    const payload = await fetchJson(`${baseUrl.replace(/\/$/, '')}/api/tags`, { cache: 'no-store' });
    const models = Array.isArray(payload && payload.models) ? payload.models : [];
    ollamaModelCache = {
      fetchedAt: now,
      models,
    };
    return models.slice();
  } catch (error) {
    ollamaModelCache = {
      fetchedAt: now,
      models: [],
    };
    return [];
  }
}

function scoreOllamaModel(model, profile = getMachineProfile()) {
  if (!model) return -1000;

  const name = normalizeText(getModelName(model));
  if (!name) return -1000;

  let score = 0;
  const sizeGb = getModelSizeGb(model);

  const familyBonuses = [
    ['qwen3.5', 64],
    ['qwen3', 58],
    ['qwen', 52],
    ['gemma4', 48],
    ['gemma3', 42],
    ['gemma', 36],
    ['llama3.2', 34],
    ['llama3', 32],
    ['llama', 26],
    ['granite', 20],
    ['north-mini', 10],
  ];

  for (const [needle, bonus] of familyBonuses) {
    if (name.includes(needle)) {
      score += bonus;
    }
  }

  const formatBonuses = [
    ['latest', 8],
    ['it', 8],
    ['instruct', 10],
    ['chat', 12],
    ['assistant', 8],
    ['mlx', 6],
    ['q4', 6],
    ['q5', 5],
    ['q6', 4],
    ['q8', 3],
  ];

  for (const [needle, bonus] of formatBonuses) {
    if (name.includes(needle)) {
      score += bonus;
    }
  }

  const negativeBonuses = [
    ['code', 30],
    ['starcoder', 30],
    ['moondream', 24],
    ['vision', 18],
    ['vl', 18],
    ['embedding', 24],
    ['nomic', 12],
    ['small', 10],
    ['mini', 8],
  ];

  for (const [needle, penalty] of negativeBonuses) {
    if (name.includes(needle)) {
      score -= penalty;
    }
  }

  if (profile.totalMemGB >= 24) {
    if (sizeGb >= 8 && sizeGb <= 18) {
      score += 28;
    } else if (sizeGb > 18) {
      score += 12;
    } else if (sizeGb > 0 && sizeGb < 4) {
      score -= 6;
    }
  } else if (profile.totalMemGB >= 16) {
    if (sizeGb >= 4 && sizeGb <= 12) {
      score += 24;
    } else if (sizeGb > 16) {
      score -= 18;
    }
  } else {
    if (sizeGb > 0 && sizeGb <= 4) {
      score += 20;
    } else if (sizeGb > 8) {
      score -= 30;
    }
  }

  if (profile.isAppleSilicon) {
    score += 4;
  }

  return score;
}

function sortOllamaModelsBestFirst(models, profile = getMachineProfile()) {
  return (models || [])
    .slice()
    .sort((a, b) => {
      const scoreDiff = scoreOllamaModel(b, profile) - scoreOllamaModel(a, profile);
      if (scoreDiff !== 0) return scoreDiff;

      const nameDiff = normalizeText(getModelName(a)).localeCompare(normalizeText(getModelName(b)));
      if (nameDiff !== 0) return nameDiff;

      return getModelSizeBytes(a) - getModelSizeBytes(b);
    });
}

function pickBestOllamaModel(models, profile = getMachineProfile()) {
  const sorted = sortOllamaModelsBestFirst(models, profile);
  return sorted.length > 0 ? sorted[0] : null;
}

function normalizeGeneratedPrompt(text) {
  if (!text) return '';

  let prompt = String(text)
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ');

  prompt = prompt.replace(/^(prompt|output|answer|stable diffusion prompt)\s*:\s*/i, '');
  prompt = prompt.replace(/^[-*•]+\s*/, '');
  prompt = prompt.replace(/^["'`]+|["'`]+$/g, '');
  prompt = prompt.replace(/\s{2,}/g, ' ').trim();
  return prompt;
}

function buildPromptInstruction({
  sourcePrompt,
  category,
  style,
  locale = 'en',
} = {}) {
  const parts = [];

  parts.push('Write exactly one Stable Diffusion prompt.');
  parts.push('Return only the prompt text.');
  parts.push('Do not add markdown, labels, bullet points, or a negative prompt.');
  parts.push('Keep it vivid, specific, and visually rich.');
  parts.push('Include subject, environment, lighting, composition, and material/detail cues.');
  parts.push('Aim for roughly 40 to 90 words.');
  parts.push('If the input references an idea, remix it rather than copying it.');

  if (locale === 'ar') {
    parts.push('Still answer in English because the target image model performs best with English prompts.');
  }

  if (category) {
    parts.push(`Category hint: ${category}.`);
  }

  if (style) {
    parts.push(`Style hint: ${style}.`);
  }

  if (sourcePrompt) {
    parts.push(`Seed idea: ${sourcePrompt}.`);
  }

  return parts.join(' ');
}

async function generatePromptWithOllama({
  baseUrl = DEFAULT_OLLAMA_BASE_URL,
  modelName,
  sourcePrompt,
  category,
  style,
  locale = 'en',
  temperature = 1.05,
  numPredict = 120,
  forceRefreshModels = false,
} = {}) {
  const models = await listOllamaModels({ baseUrl, forceRefresh: forceRefreshModels });
  const bestModel = pickBestOllamaModel(models);
  const chosenModel = modelName || (bestModel && getModelName(bestModel));

  if (!chosenModel) {
    throw new Error('No Ollama models are available.');
  }

  const systemMessage = [
    'You are a prompt engineer for image generation.',
    'You write only one prompt at a time.',
    'Do not explain your answer.',
  ].join(' ');

  const userMessage = buildPromptInstruction({
    sourcePrompt,
    category,
    style,
    locale,
  });

  const response = await fetchJson(`${baseUrl.replace(/\/$/, '')}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: chosenModel,
      stream: false,
      options: {
        temperature,
        top_p: 0.95,
        num_predict: numPredict,
      },
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage },
      ],
    }),
  });

  const rawPrompt = normalizeGeneratedPrompt(
    (response && response.message && response.message.content) ||
    response.response ||
    response.content ||
    ''
  );

  if (!rawPrompt) {
    throw new Error('Ollama returned an empty prompt.');
  }

  return {
    prompt: rawPrompt,
    model_name: chosenModel,
    raw_response: response,
  };
}

module.exports = {
  DEFAULT_OLLAMA_BASE_URL,
  buildPromptInstruction,
  fetchJson,
  formatOllamaModelLabel,
  generatePromptWithOllama,
  getModelName,
  getModelSizeBytes,
  getModelSizeGb,
  listOllamaModels,
  normalizeGeneratedPrompt,
  pickBestOllamaModel,
  scoreOllamaModel,
  sortOllamaModelsBestFirst,
};
