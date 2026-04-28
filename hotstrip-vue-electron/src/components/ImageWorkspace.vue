<script setup>
import { computed } from 'vue'
import UploadSlots from './UploadSlots.vue'
import { RESOLUTION_PRESETS, SIZE_PRESETS, getDefaultImageModel, isGeminiImageProvider } from '@/config/constants'

const props = defineProps({
  studio: { type: Object, required: true }
})

const emit = defineEmits(['download-result'])

const state = props.studio.state

const providerTip = computed(() => {
  return isGeminiImageProvider(state.imageProvider)
    ? '当前为 Gemini / Nano Banana 图片接口：使用 generateContent 与 x-goog-api-key。图生图会把参考图与文本一起发送。'
    : '当前为 Comfly / OpenAI 兼容图片接口：文生图走 /v1/images/generations，图生图走 /v1/images/edits。'
})

const modelTip = computed(() => {
  if (isGeminiImageProvider(state.imageProvider)) {
    return state.currentMode === 'edit'
      ? '图生图当前使用 Gemini / Nano Banana，文本和参考图会一起发送给 generateContent 接口。'
      : '文生图当前使用 Gemini / Nano Banana，图片会从 generateContent 的 inline image 返回中提取。'
  }
  return state.currentMode === 'edit'
    ? '图生图默认使用 gpt-image-2，并调用 /v1/images/edits 接口。'
    : '文生图默认使用 gpt-image-1，并调用 /v1/images/generations 接口。'
})

function handleMode(mode) {
  props.studio.updateMode(mode)
}

function handleProviderChange(event) {
  const provider = event.target.value
  props.studio.updateProvider(provider)
  props.studio.updateMode(state.currentMode)
  state.model = getDefaultImageModel(provider, state.currentMode)
}
</script>

<template>
  <div class="panel">
    <h2 class="section-title">生成参数</h2>

    <div class="block">
      <label>模式</label>
      <div class="mode-tabs">
        <button type="button" class="tab-btn" :class="{ active: state.currentMode === 'generate' }" @click="handleMode('generate')">文生图</button>
        <button type="button" class="tab-btn" :class="{ active: state.currentMode === 'edit' }" @click="handleMode('edit')">图生图</button>
      </div>
    </div>

    <div class="block">
      <label for="apiKey">API Key</label>
      <input id="apiKey" v-model="state.apiKey" type="password" placeholder="请输入你的 API Key" autocomplete="off" />
      <div class="tip">纯前端会在浏览器里直接携带 Key 发请求。桌面壳层只负责打包，不会替你托管密钥。</div>
    </div>

    <div class="row-2">
      <div class="block">
        <label for="imageProvider">图片接口</label>
        <select id="imageProvider" :value="state.imageProvider" @change="handleProviderChange">
          <option value="comfly">Comfly / OpenAI 兼容</option>
          <option value="gemini-flash">Nano Banana 2（Gemini 3.1 Flash Image）</option>
          <option value="gemini-pro">Nano Banana Pro（Gemini 3 Pro Image）</option>
        </select>
        <div class="tip">{{ providerTip }}</div>
      </div>
      <div class="block">
        <label for="imageModel">模型</label>
        <input id="imageModel" v-model="state.model" type="text" placeholder="请输入模型名" />
        <div class="tip">{{ modelTip }}</div>
      </div>
    </div>

    <div class="block">
      <label for="prompt">Prompt</label>
      <textarea
        id="prompt"
        v-model="state.prompt"
        :placeholder="state.currentMode === 'edit' ? '例如：保留参考图人物姿势，替换为高级国风服装，画面整体更统一。' : '例如：一只坐在窗边的橘猫，电影感，柔和晨光，高级摄影质感。'"
      />
    </div>

    <div v-if="state.currentMode === 'edit'" class="block">
      <div class="row-2">
        <div>
          <label for="imageCount">参考图张数</label>
          <select id="imageCount" v-model.number="state.imageCount" @change="props.studio.setImageCount(state.imageCount)">
            <option v-for="n in 10" :key="n" :value="n">{{ n }} 张</option>
          </select>
        </div>
        <div>
          <label>参考图操作</label>
          <div class="inline-buttons">
            <button type="button" class="secondary" @click="props.studio.clearAllReferenceImages">清空参考图</button>
          </div>
        </div>
      </div>
      <div class="tip">选择参考图张数后，下方会自动生成对应上传格子。每个格子都支持点击上传或拖拽上传。</div>

      <div class="block" style="margin-top: 13px;">
        <label>上传参考图</label>
        <UploadSlots
          :slots="state.uploadSlots"
          @set-file="({ index, file }) => props.studio.setSlotFile(index, file)"
          @clear-slot="props.studio.clearSlot"
          @fill-empty="props.studio.fillEmptySlots"
        />
        <div class="inline-note">
          {{ state.uploadSlots.filter((slot) => slot.file).length ? `已上传 ${state.uploadSlots.filter((slot) => slot.file).length} / ${state.imageCount} 张参考图` : `当前未选择图片（共 ${state.imageCount} 个格子）` }}
        </div>
      </div>
    </div>

    <div class="block">
      <label>尺寸比例快捷选项</label>
      <div class="chips">
        <button
          v-for="item in SIZE_PRESETS"
          :key="item.key"
          type="button"
          class="chip"
          :class="{ active: state.ratio === item.key }"
          @click="state.ratio = item.key"
        >
          {{ item.label }}
        </button>
      </div>
    </div>

    <div class="row-2">
      <div class="block">
        <label for="ratio">当前尺寸比例</label>
        <select id="ratio" v-model="state.ratio">
          <option v-for="item in SIZE_PRESETS" :key="item.key" :value="item.key">{{ item.label }}（{{ item.note }}）</option>
        </select>
      </div>
      <div class="block">
        <label for="resolution">分辨率</label>
        <select id="resolution" v-model="state.resolution">
          <option v-for="item in RESOLUTION_PRESETS" :key="item.key" :value="item.key">{{ item.label }}</option>
        </select>
        <div class="tip">选择 auto 时，会把 size 参数设置为 auto。</div>
      </div>
    </div>

    <div class="row-3">
      <div class="block">
        <label for="sizeValue">实际 size 参数</label>
        <input id="sizeValue" :value="state.sizeValue" type="text" readonly />
      </div>
      <div class="block">
        <label for="quality">质量</label>
        <select id="quality" v-model="state.quality" :disabled="isGeminiImageProvider(state.imageProvider)">
          <option value="auto">auto</option>
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
        </select>
      </div>
      <div class="block">
        <label for="responseFormat">返回格式</label>
        <select id="responseFormat" v-model="state.responseFormat" :disabled="isGeminiImageProvider(state.imageProvider)">
          <option value="b64_json">b64_json</option>
          <option value="url">url</option>
        </select>
      </div>
    </div>

    <div class="toolbar">
      <button type="button" class="primary" :disabled="state.isRunning" @click="props.studio.runGenerate">
        {{ state.isRunning ? '生成中...' : state.currentMode === 'edit' ? '开始图生图' : '开始生成' }}
      </button>
      <button type="button" class="secondary" :disabled="!state.resultSrc" @click="emit('download-result', state.resultSrc)">下载结果</button>
    </div>

    <div class="status" :class="state.statusType">{{ state.statusMessage }}</div>
  </div>
</template>
