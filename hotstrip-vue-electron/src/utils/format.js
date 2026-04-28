import { CHAT_PROVIDER_LABELS, IMAGE_PROVIDER_LABELS, RESOLUTION_PRESETS, SIZE_PRESETS, SIZE_MATRIX } from '@/config/constants'

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function formatDate(ts) {
  const date = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export function getProviderLabel(provider, kind = 'image') {
  if (kind === 'chat') return CHAT_PROVIDER_LABELS[provider] || provider || '未知接口'
  return IMAGE_PROVIDER_LABELS[provider] || provider || '未知接口'
}

export function getRatioLabel(key) {
  return (SIZE_PRESETS.find((item) => item.key === key) || {}).label || key
}

export function getResolutionLabel(key) {
  return (RESOLUTION_PRESETS.find((item) => item.key === key) || {}).label || key
}

export function computeSize(ratio, resolution) {
  if (!ratio || !resolution || ratio === 'auto' || resolution === 'auto') return 'auto'
  return (SIZE_MATRIX[resolution] || {})[ratio] || 'auto'
}

export function sizeLabel(ratio, resolution) {
  if (ratio === 'auto' || resolution === 'auto') return 'auto'
  return `${getRatioLabel(ratio)} · ${getResolutionLabel(resolution)}`
}
