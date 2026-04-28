import { reactive, watch } from 'vue'
import {
  COMFLY_EDIT_API_URL,
  COMFLY_GENERATE_API_URL,
  getDefaultImageModel,
  HISTORY_KEY,
  HISTORY_LIMIT,
  isGeminiImageProvider,
  makeGeminiEndpoint,
  MAX_REFERENCE_IMAGES,
  toGeminiImageSize
} from '@/config/constants'
import { computeSize, formatFileSize, sizeLabel } from '@/utils/format'
import { dataUrlToGeminiInlineData, extractGeminiImageResult, parseJsonResponse, revokeObjectUrl } from '@/utils/media'
import { loadJson, saveJson } from '@/utils/storage'

function createEmptySlot() {
  return { file: null, previewUrl: '' }
}

export function useImageStudio() {
  const state = reactive({
    apiKey: '',
    currentMode: 'generate',
    imageProvider: 'comfly',
    model: getDefaultImageModel('comfly', 'generate'),
    prompt: '',
    imageCount: 1,
    uploadSlots: [createEmptySlot()],
    ratio: '1:1',
    resolution: 'auto',
    sizeValue: 'auto',
    quality: 'auto',
    responseFormat: 'b64_json',
    statusMessage: '等待操作',
    statusType: '',
    resultSrc: '',
    resultMeta: '暂无结果',
    resultSourceType: '',
    history: loadJson(HISTORY_KEY, []),
    isRunning: false
  })

  watch(
    () => [state.ratio, state.resolution],
    () => {
      state.sizeValue = computeSize(state.ratio, state.resolution)
    },
    { immediate: true }
  )

  const sourcePreviewList = () => state.uploadSlots.filter((slot) => slot.file && slot.previewUrl)
  const sourceMetaText = () => {
    const files = state.uploadSlots.filter((slot) => slot.file).map((slot) => slot.file)
    if (!files.length) return '未上传图片'
    const total = files.reduce((sum, file) => sum + (file.size || 0), 0)
    return `已上传 ${files.length} / ${state.imageCount} 张参考图 · 总大小 ${formatFileSize(total)}`
  }

  function setStatus(message, type = '') {
    state.statusMessage = message
    state.statusType = type
  }

  function updateMode(mode, syncModel = true) {
    state.currentMode = mode
    if (syncModel) state.model = getDefaultImageModel(state.imageProvider, mode)
  }

  function updateProvider(provider, syncModel = true) {
    state.imageProvider = provider
    if (syncModel) state.model = getDefaultImageModel(provider, state.currentMode)
  }

  function setImageCount(count) {
    const nextCount = Math.max(1, Math.min(MAX_REFERENCE_IMAGES, Number(count) || 1))
    const old = state.uploadSlots.slice()
    state.imageCount = nextCount
    state.uploadSlots = Array.from({ length: nextCount }, (_, index) => old[index] || createEmptySlot())
  }

  function setSlotFile(index, file) {
    if (!file || !/^image\//.test(file.type || '')) return
    const old = state.uploadSlots[index]
    if (old?.previewUrl) revokeObjectUrl(old.previewUrl)
    state.uploadSlots[index] = {
      file,
      previewUrl: URL.createObjectURL(file)
    }
  }

  function clearSlot(index) {
    const old = state.uploadSlots[index]
    if (old?.previewUrl) revokeObjectUrl(old.previewUrl)
    state.uploadSlots[index] = createEmptySlot()
  }

  function clearAllReferenceImages() {
    state.uploadSlots.forEach((slot) => slot.previewUrl && revokeObjectUrl(slot.previewUrl))
    state.uploadSlots = Array.from({ length: state.imageCount }, () => createEmptySlot())
  }

  function fillEmptySlots(files) {
    const imageFiles = Array.from(files || []).filter((file) => /^image\//.test(file.type || ''))
    let pointer = 0
    for (let i = 0; i < state.uploadSlots.length && pointer < imageFiles.length; i += 1) {
      if (!state.uploadSlots[i].file) {
        setSlotFile(i, imageFiles[pointer])
        pointer += 1
      }
    }
  }

  function clearResult() {
    state.resultSrc = ''
    state.resultMeta = '暂无结果'
    state.resultSourceType = ''
  }

  function showResult(src, sourceType) {
    state.resultSrc = src
    state.resultSourceType = sourceType
    state.resultMeta = `结果来源：${sourceType}`
  }

  function saveHistory(record) {
    let history = [record, ...loadJson(HISTORY_KEY, [])]
    if (history.length > HISTORY_LIMIT) history = history.slice(0, HISTORY_LIMIT)
    while (history.length) {
      try {
        saveJson(HISTORY_KEY, history)
        break
      } catch {
        history.pop()
      }
    }
    state.history = loadJson(HISTORY_KEY, [])
  }

  function deleteHistoryItem(id) {
    saveJson(HISTORY_KEY, loadJson(HISTORY_KEY, []).filter((item) => item.id !== id))
    state.history = loadJson(HISTORY_KEY, [])
  }

  function clearHistory() {
    localStorage.removeItem(HISTORY_KEY)
    state.history = []
  }

  function loadHistoryItem(id) {
    const item = loadJson(HISTORY_KEY, []).find((entry) => entry.id === id)
    if (!item) return
    updateProvider(item.provider || 'comfly', false)
    updateMode(item.mode || 'generate', false)
    state.model = item.model || getDefaultImageModel(state.imageProvider, state.currentMode)
    state.prompt = item.prompt || ''
    state.ratio = item.ratio || '1:1'
    state.resolution = item.resolution || 'auto'
    state.quality = item.quality || 'auto'
    state.responseFormat = item.responseFormat || 'b64_json'
    setImageCount(item.sourceCount || 1)
    setStatus('已载入历史参数。参考图文件需要重新上传。', 'success')
  }

  async function runGenerate() {
    const apiKey = state.apiKey.trim()
    const prompt = state.prompt.trim()
    if (!apiKey) return setStatus('请先输入 API Key', 'error')
    if (!prompt) return setStatus('请输入 Prompt', 'error')

    const validSlots = state.uploadSlots.filter((slot) => slot.file)
    if (state.currentMode === 'edit' && validSlots.length < state.imageCount) {
      return setStatus(`当前设置了 ${state.imageCount} 个参考图格子，请先补齐后再生成。`, 'error')
    }

    state.isRunning = true
    clearResult()
    setStatus(state.currentMode === 'edit' ? '正在上传参考图并生成，请稍候...' : '正在生成图片，请稍候...')

    try {
      const isGemini = isGeminiImageProvider(state.imageProvider)
      let result = null

      if (isGemini) {
        const parts = []
        if (state.currentMode === 'edit') {
          for (const slot of validSlots) {
            parts.push(await dataUrlToGeminiInlineData(slot.previewUrl))
          }
        }
        parts.push({ text: state.prompt })

        const payload = {
          contents: [{ role: 'user', parts }]
        }

        const geminiSize = toGeminiImageSize(state.resolution)
        if (geminiSize) {
          payload.generationConfig = { mediaResolution: geminiSize }
        }

        const response = await fetch(makeGeminiEndpoint(state.model), {
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
          return setStatus(`图片请求失败\n状态码：${response.status}\n\n${detail}`, 'error')
        }

        result = extractGeminiImageResult(data)
      } else if (state.currentMode === 'edit') {
        const formData = new FormData()
        validSlots.forEach((slot) => formData.append('image', slot.file))
        formData.append('prompt', state.prompt)
        formData.append('model', state.model)
        if (state.sizeValue) formData.append('size', state.sizeValue)
        if (state.quality) formData.append('quality', state.quality)
        if (state.responseFormat) formData.append('response_format', state.responseFormat)

        const response = await fetch(COMFLY_EDIT_API_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}` },
          body: formData
        })
        const data = await parseJsonResponse(response)
        if (!response.ok) {
          const detail = data.__raw || JSON.stringify(data, null, 2)
          return setStatus(`图片请求失败\n状态码：${response.status}\n\n${detail}`, 'error')
        }

        const item = data?.data?.[0]
        if (item?.b64_json) result = { src: `data:image/png;base64,${item.b64_json}`, sourceType: 'b64_json' }
        if (item?.url) result = { src: item.url, sourceType: 'url' }
      } else {
        const response = await fetch(COMFLY_GENERATE_API_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: state.model,
            prompt: state.prompt,
            size: state.sizeValue,
            quality: state.quality,
            response_format: state.responseFormat
          })
        })

        const data = await parseJsonResponse(response)
        if (!response.ok) {
          const detail = data.__raw || JSON.stringify(data, null, 2)
          return setStatus(`图片请求失败\n状态码：${response.status}\n\n${detail}`, 'error')
        }

        const item = data?.data?.[0]
        if (item?.b64_json) result = { src: `data:image/png;base64,${item.b64_json}`, sourceType: 'b64_json' }
        if (item?.url) result = { src: item.url, sourceType: 'url' }
      }

      if (!result?.src) {
        return setStatus('请求成功，但没有识别到图片结果字段。', 'error')
      }

      showResult(result.src, result.sourceType)
      saveHistory({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        time: Date.now(),
        provider: state.imageProvider,
        mode: state.currentMode,
        model: state.model,
        prompt: state.prompt,
        ratio: state.ratio,
        resolution: state.resolution,
        size: state.sizeValue,
        sizeLabel: sizeLabel(state.ratio, state.resolution),
        quality: state.quality,
        responseFormat: state.responseFormat,
        sourceCount: validSlots.length,
        sourceNames: validSlots.map((slot) => slot.file.name),
        resultSrc: result.src
      })
      state.history = loadJson(HISTORY_KEY, [])
      setStatus(state.currentMode === 'edit' ? '图生图成功' : '文生图成功', 'success')
    } catch (error) {
      setStatus(`请求异常：\n${error.message}`, 'error')
    } finally {
      state.isRunning = false
    }
  }

  return {
    state,
    sourcePreviewList,
    sourceMetaText,
    setStatus,
    updateMode,
    updateProvider,
    setImageCount,
    setSlotFile,
    clearSlot,
    clearAllReferenceImages,
    fillEmptySlots,
    clearResult,
    showResult,
    saveHistory,
    deleteHistoryItem,
    clearHistory,
    loadHistoryItem,
    runGenerate
  }
}
