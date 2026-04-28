export const COMFLY_GENERATE_API_URL = 'https://ai.comfly.chat/v1/images/generations'
export const COMFLY_EDIT_API_URL = 'https://ai.comfly.chat/v1/images/edits'
export const COMFLY_CHAT_API_URL = 'https://ai.comfly.chat/v1/chat/completions'
export const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

export const HISTORY_KEY = 'hotstrip_image_history_vite_vue_electron'
export const CHAT_HISTORY_KEY = 'hotstrip_chat_history_vite_vue_electron'
export const HISTORY_LIMIT = 8
export const MAX_REFERENCE_IMAGES = 10
export const MAX_CHAT_IMAGES = 10

export const SIZE_PRESETS = [
  { label: 'auto', key: 'auto', note: 'auto' },
  { label: '1：1', key: '1:1', note: '1:1' },
  { label: '3：4', key: '3:4', note: '3:4' },
  { label: '4：3', key: '4:3', note: '4:3' },
  { label: '16：9', key: '16:9', note: '16:9' },
  { label: '9：16', key: '9:16', note: '9:16' },
  { label: '21：9', key: '21:9', note: '21:9' },
  { label: '2：3', key: '2:3', note: '2:3' },
  { label: '3：2', key: '3:2', note: '3:2' }
]

export const RESOLUTION_PRESETS = [
  { label: 'auto', key: 'auto' },
  { label: '1K', key: '1k' },
  { label: '2K', key: '2k' },
  { label: '4K', key: '4k' }
]

export const SIZE_MATRIX = {
  '1k': {
    '1:1': '1024x1024',
    '3:4': '960x1280',
    '4:3': '1280x960',
    '16:9': '1280x720',
    '9:16': '720x1280',
    '21:9': '1344x576',
    '2:3': '960x1440',
    '3:2': '1440x960'
  },
  '2k': {
    '1:1': '2048x2048',
    '3:4': '1536x2048',
    '4:3': '2048x1536',
    '16:9': '2048x1152',
    '9:16': '1152x2048',
    '21:9': '2016x864',
    '2:3': '1344x2016',
    '3:2': '2016x1344'
  },
  '4k': {
    '1:1': '2880x2880',
    '3:4': '2448x3264',
    '4:3': '3264x2448',
    '16:9': '3840x2160',
    '9:16': '2160x3840',
    '21:9': '3696x1584',
    '2:3': '2336x3504',
    '3:2': '3504x2336'
  }
}

export const IMAGE_PROVIDER_LABELS = {
  comfly: 'Comfly',
  'gemini-flash': 'Nano Banana 2',
  'gemini-pro': 'Nano Banana Pro'
}

export const CHAT_PROVIDER_LABELS = {
  comfly: 'Comfly',
  gemini: 'Gemini'
}

export function isGeminiImageProvider(provider) {
  return provider === 'gemini-flash' || provider === 'gemini-pro'
}

export function getDefaultImageModel(provider, mode) {
  if (provider === 'gemini-flash') return 'gemini-3.1-flash-image-preview'
  if (provider === 'gemini-pro') return 'gemini-3-pro-image-preview'
  return mode === 'edit' ? 'gpt-image-2' : 'gpt-image-1'
}

export function getDefaultChatModel(provider) {
  return provider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini'
}

export function toGeminiImageSize(resolutionKey) {
  return ({ '1k': '1K', '2k': '2K', '4k': '4K' })[resolutionKey] || ''
}

export function makeGeminiEndpoint(model) {
  return `${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent`
}
