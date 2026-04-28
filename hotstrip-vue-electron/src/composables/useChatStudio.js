import { reactive } from 'vue'
import {
  CHAT_HISTORY_KEY,
  COMFLY_CHAT_API_URL,
  getDefaultChatModel,
  makeGeminiEndpoint,
  MAX_CHAT_IMAGES
} from '@/config/constants'
import { extractGeminiTextResult, parseJsonResponse, fileToDataUrl, urlToDataUrl, dataUrlToGeminiInlineData, revokeObjectUrl } from '@/utils/media'
import { loadJson, saveJson } from '@/utils/storage'

export function useChatStudio({ getApiKey, getCurrentResultImage }) {
  const state = reactive({
    provider: 'comfly',
    model: getDefaultChatModel('comfly'),
    systemPrompt: '你是一个专业、清晰、实用的 AI 助手。请用中文回答，必要时给出步骤和示例。',
    input: '',
    includeCurrentImage: false,
    uploadedImages: [],
    messages: loadJson(CHAT_HISTORY_KEY, []),
    statusMessage: '等待对话',
    statusType: '',
    isSending: false
  })

  function setStatus(message, type = '') {
    state.statusMessage = message
    state.statusType = type
  }

  function updateProvider(provider, syncModel = true) {
    state.provider = provider
    if (syncModel) state.model = getDefaultChatModel(provider)
  }

  function persistMessages() {
    try {
      saveJson(CHAT_HISTORY_KEY, state.messages.slice(-40))
    } catch {
      state.messages = state.messages.slice(-10)
      saveJson(CHAT_HISTORY_KEY, state.messages)
    }
  }

  function clearConversation() {
    state.messages = []
    localStorage.removeItem(CHAT_HISTORY_KEY)
  }

  function exportConversationText() {
    if (!state.messages.length) {
      setStatus('当前没有可复制的对话。', 'error')
      return
    }
    const text = state.messages.map((item) => {
      const role = item.role === 'user' ? '你' : 'AI 助手'
      const flags = []
      if (item.hasCurrentImage) flags.push('已附带当前生成图')
      if (item.uploadedImageCount) flags.push(`已附带上传图 ${item.uploadedImageCount} 张`)
      return `${role}:\n${item.content}${flags.length ? `\n[${flags.join(' / ')}]` : ''}`
    }).join('\n\n')

    navigator.clipboard.writeText(text)
      .then(() => setStatus('对话内容已复制到剪贴板。', 'success'))
      .catch(() => setStatus('复制失败，你可以手动选择对话内容复制。', 'error'))
  }

  function addUploadedImages(files) {
    const imageFiles = Array.from(files || []).filter((file) => /^image\//.test(file.type || ''))
    if (!imageFiles.length) return
    const remaining = Math.max(0, MAX_CHAT_IMAGES - state.uploadedImages.length)
    const selected = imageFiles.slice(0, remaining)
    selected.forEach((file) => {
      state.uploadedImages.push({
        file,
        previewUrl: URL.createObjectURL(file)
      })
    })
    if (imageFiles.length > selected.length) {
      setStatus('聊天图片最多保留 10 张，多余图片已自动忽略。', 'error')
    }
  }

  function removeUploadedImage(index) {
    const item = state.uploadedImages[index]
    if (item?.previewUrl) revokeObjectUrl(item.previewUrl)
    state.uploadedImages.splice(index, 1)
  }

  function clearUploadedImages() {
    state.uploadedImages.forEach((item) => item.previewUrl && revokeObjectUrl(item.previewUrl))
    state.uploadedImages = []
  }

  async function sendMessage() {
    const apiKey = getApiKey().trim()
    const content = state.input.trim()
    const currentImage = state.includeCurrentImage ? getCurrentResultImage() : ''

    if (!apiKey) return setStatus('请先在上方输入 API Key。', 'error')
    if (!state.model.trim()) return setStatus('请输入文字模型名称。', 'error')
    if (!content) return setStatus('请输入要发送的消息。', 'error')
    if (state.includeCurrentImage && !currentImage) {
      return setStatus('你勾选了“带上当前生成结果图”，但当前还没有生成结果。', 'error')
    }

    let uploadedImageUrls = []
    try {
      uploadedImageUrls = await Promise.all(state.uploadedImages.map((item) => fileToDataUrl(item.file)))
    } catch (error) {
      return setStatus(`聊天图片读取失败：\n${error.message}`, 'error')
    }

    const attachedImages = []
    if (currentImage) attachedImages.push(currentImage)
    uploadedImageUrls.forEach((url) => url && attachedImages.push(url))

    state.messages.push({
      role: 'user',
      content,
      time: Date.now(),
      hasImage: attachedImages.length > 0,
      hasCurrentImage: !!currentImage,
      uploadedImageCount: uploadedImageUrls.length
    })
    state.input = ''
    if (uploadedImageUrls.length) clearUploadedImages()
    persistMessages()
    state.isSending = true
    setStatus(attachedImages.length ? '正在带图发送并等待回复...' : '正在回复...')

    try {
      let reply = ''

      if (state.provider === 'gemini') {
        const recentMessages = state.messages.slice(-20)
        const contents = []
        for (let index = 0; index < recentMessages.length; index += 1) {
          const item = recentMessages[index]
          const isLatestUserWithImage = index === recentMessages.length - 1 && item.role === 'user' && attachedImages.length
          const parts = []
          if (item.content) parts.push({ text: item.content })
          if (isLatestUserWithImage) {
            for (const url of attachedImages) {
              const safeDataUrl = await urlToDataUrl(url)
              parts.push(await dataUrlToGeminiInlineData(safeDataUrl))
            }
          }
          contents.push({ role: item.role === 'assistant' ? 'model' : 'user', parts })
        }

        const payload = { contents }
        if (state.systemPrompt.trim()) {
          payload.systemInstruction = { parts: [{ text: state.systemPrompt.trim() }] }
        }

        const response = await fetch(makeGeminiEndpoint(state.model.trim()), {
          method: 'POST',
          headers: {
            'x-goog-api-key': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })
        const data = await parseJsonResponse(response)
        if (!response.ok) {
          const detail = data.__raw || JSON.stringify(data, null, 2)
          return setStatus(`文字对话请求失败\n状态码：${response.status}\n\n${detail}`, 'error')
        }
        reply = extractGeminiTextResult(data)
      } else {
        const messages = []
        if (state.systemPrompt.trim()) messages.push({ role: 'system', content: state.systemPrompt.trim() })
        const recentMessages = state.messages.slice(-20)
        recentMessages.forEach((item, index) => {
          const isLatestUserWithImage = index === recentMessages.length - 1 && item.role === 'user' && attachedImages.length
          if (isLatestUserWithImage) {
            messages.push({
              role: 'user',
              content: [
                { type: 'text', text: item.content },
                ...attachedImages.map((url) => ({ type: 'image_url', image_url: { url } }))
              ]
            })
          } else {
            messages.push({ role: item.role, content: item.content })
          }
        })

        const response = await fetch(COMFLY_CHAT_API_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: state.model.trim(),
            messages,
            temperature: 0.7
          })
        })
        const data = await parseJsonResponse(response)
        if (!response.ok) {
          const detail = data.__raw || JSON.stringify(data, null, 2)
          return setStatus(`文字对话请求失败\n状态码：${response.status}\n\n${detail}`, 'error')
        }
        reply = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || ''
      }

      if (!reply) return setStatus('请求成功，但没有识别到回复内容。', 'error')
      state.messages.push({ role: 'assistant', content: reply, time: Date.now() })
      persistMessages()
      setStatus(attachedImages.length ? '带图分析完成。' : '回复完成。', 'success')
    } catch (error) {
      setStatus(`文字对话请求异常：\n${error.message}`, 'error')
    } finally {
      state.isSending = false
    }
  }

  return {
    state,
    setStatus,
    updateProvider,
    clearConversation,
    exportConversationText,
    addUploadedImages,
    removeUploadedImage,
    clearUploadedImages,
    sendMessage
  }
}
