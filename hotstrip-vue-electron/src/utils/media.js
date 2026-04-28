export async function parseJsonResponse(response) {
  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch {
    return { __raw: text }
  }
}

export function stripDataUrlPrefix(dataUrl) {
  const value = String(dataUrl || '')
  const idx = value.indexOf(',')
  return idx >= 0 ? value.slice(idx + 1) : value
}

export function getMimeTypeFromDataUrl(dataUrl, fallback = 'image/png') {
  const value = String(dataUrl || '')
  const match = value.match(/^data:([^;]+);base64,/i)
  return match ? match[1] : fallback
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(stripDataUrlPrefix(String(reader.result || '')))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function urlToDataUrl(url) {
  if (!url) return ''
  if (String(url).startsWith('data:')) return url
  const response = await fetch(url)
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export async function fileToGeminiInlineData(file) {
  return {
    inline_data: {
      mime_type: file.type || 'image/png',
      data: await fileToBase64(file)
    }
  }
}

export async function dataUrlToGeminiInlineData(dataUrl) {
  return {
    inline_data: {
      mime_type: getMimeTypeFromDataUrl(dataUrl, 'image/png'),
      data: stripDataUrlPrefix(dataUrl)
    }
  }
}

export function extractGeminiImageResult(data) {
  const candidates = data?.candidates || []
  for (const candidate of candidates) {
    const parts = candidate?.content?.parts || []
    for (const part of parts) {
      const inline = part.inlineData || part.inline_data
      if (inline?.data) {
        const mime = inline.mimeType || inline.mime_type || 'image/png'
        return {
          src: `data:${mime};base64,${inline.data}`,
          sourceType: 'gemini-inline-data',
          mime
        }
      }
    }
  }
  return null
}

export function extractGeminiTextResult(data) {
  const candidates = data?.candidates || []
  const texts = []
  for (const candidate of candidates) {
    const parts = candidate?.content?.parts || []
    for (const part of parts) {
      if (typeof part?.text === 'string' && part.text.trim()) {
        texts.push(part.text.trim())
      }
    }
  }
  return texts.join('\n\n').trim()
}

export function revokeObjectUrl(url) {
  if (url && url.startsWith('blob:')) URL.revokeObjectURL(url)
}
