import { get_tokens } from './clip_tokeniser/clip_encoder.js'

/** CLIP text encoder limit: 75 content tokens + start (49406) + end (49407). */
export const CLIP_MAX_CONTENT_TOKENS = 75
export const CLIP_START_TOKEN = 49406
export const CLIP_END_TOKEN = 49407

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/

const ARABIC_WORD_MAP = {
  'منظر': 'scenic view',
  'جميل': 'beautiful',
  'جميلة': 'beautiful',
  'إطلالة': 'vista',
  'اطلالة': 'vista',
  'لإطلالة': 'vista of',
  'لاطلالة': 'vista of',
  'على': 'over',
  'البحر': 'the sea',
  'بحر': 'sea',
  'سماء': 'sky',
  'غروب': 'sunset',
  'شروق': 'sunrise',
  'جبل': 'mountain',
  'جبال': 'mountains',
  'غابة': 'forest',
  'مدينة': 'city',
  'ليل': 'night',
  'ليلي': 'night',
  'نهار': 'day',
  'طبيعة': 'nature',
  'زهور': 'flowers',
  'ورد': 'roses',
  'قمر': 'moon',
  'شمس': 'sun',
  'مطر': 'rain',
  'ثلج': 'snow',
  'صحراء': 'desert',
  'وادي': 'valley',
  'نهر': 'river',
  'بحيرة': 'lake',
  'شاطئ': 'beach',
  'جسر': 'bridge',
  'قصر': 'palace',
  'قلعة': 'castle',
  'مبنى': 'building',
  'شارع': 'street',
  'سوق': 'market',
  'طعام': 'food',
  'قطة': 'cat',
  'كلب': 'dog',
  'طائر': 'bird',
  'حصان': 'horse',
  'أسد': 'lion',
  'تنين': 'dragon',
  'فتاة': 'girl',
  'فتى': 'boy',
  'رجل': 'man',
  'امرأة': 'woman',
  'طفل': 'child',
  'سينمائي': 'cinematic',
  'واقعي': 'photorealistic',
  'فني': 'artistic',
  'رسم': 'painting',
  'زيتي': 'oil painting',
  'أنمي': 'anime',
  'انمي': 'anime',
  'خيالي': 'fantasy',
  'سايبربانك': 'cyberpunk',
  'مستقبلي': 'futuristic',
  'قديم': 'vintage',
  'حديث': 'modern',
  'فاخر': 'luxurious',
  'هادئ': 'peaceful',
  'درامي': 'dramatic',
  'مضيء': 'bright',
  'مظلم': 'dark',
  'ضبابي': 'misty',
  'مفصل': 'highly detailed',
  'واضح': 'sharp',
}

export function containsArabic(text) {
  return ARABIC_RE.test(text || '')
}

export function countClipContentTokens(text) {
  if (!text || !String(text).trim()) {
    return 0
  }
  return get_tokens(String(text)).filter((id) => id !== undefined && id !== null).length
}

export function getClipTokenIds(text) {
  const content = get_tokens(String(text || '')).filter((id) => id !== undefined && id !== null)
  return [CLIP_START_TOKEN, ...content.slice(0, CLIP_MAX_CONTENT_TOKENS), CLIP_END_TOKEN]
}

export function validatePromptLength(text, isArabic = false) {
  const trimmed = (text || '').trim()
  if (!trimmed) {
    return {
      valid: false,
      tokenCount: 0,
      message: isArabic
        ? 'تحتاج إلى إدخال موجه.'
        : 'You need to enter a prompt.',
    }
  }

  const tokenCount = countClipContentTokens(trimmed)
  if (tokenCount > CLIP_MAX_CONTENT_TOKENS) {
    return {
      valid: false,
      tokenCount,
      message: isArabic
        ? `الموجه طويل جدًا. يرجى الإبقاء على الموجه ضمن ${CLIP_MAX_CONTENT_TOKENS} رمز CLIP (حوالي 77 رمزًا).`
        : `Prompt is too long. Please keep your prompt under ${CLIP_MAX_CONTENT_TOKENS} CLIP tokens (77 total).`,
    }
  }

  return { valid: true, tokenCount, message: '' }
}

export function translateArabicPrompt(text) {
  const trimmed = (text || '').trim()
  if (!trimmed || !containsArabic(trimmed)) {
    return trimmed
  }

  const words = trimmed.split(/\s+/).filter(Boolean)
  const translated = words.map((word) => {
    const clean = word.replace(/[،,.!?؛:]/g, '')
    return ARABIC_WORD_MAP[clean] || ARABIC_WORD_MAP[clean.replace(/^ال/, '')] || null
  })

  const known = translated.filter(Boolean)
  if (known.length >= Math.max(2, Math.ceil(words.length * 0.45))) {
    return `${known.join(', ')}, highly detailed, cinematic lighting, 8k`
  }

  // Fallback: keep original text for backend tokenization instead of stripping it.
  return trimmed
}

export function preparePromptForSd(text, isArabicUi = false) {
  const trimmed = (text || '').trim()
  if (!trimmed) {
    return { prompt: '', originalPrompt: '', wasTranslated: false }
  }

  let prompt = trimmed
  let wasTranslated = false

  if (isArabicUi || containsArabic(trimmed)) {
    const translated = translateArabicPrompt(trimmed)
    if (translated !== trimmed) {
      prompt = translated
      wasTranslated = true
    }
  }

  return { prompt, originalPrompt: trimmed, wasTranslated }
}