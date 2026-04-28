<script setup>
import { computed, nextTick } from 'vue'
import { formatFileSize, getProviderLabel } from '@/utils/format'

const props = defineProps({
  chat: { type: Object, required: true },
  hasCurrentImage: { type: Boolean, default: false }
})

const state = props.chat.state
const canAttachCurrentResult = computed(() => props.hasCurrentImage)

function onInputKeydown(event) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    props.chat.sendMessage().then(() => nextTick(() => event.target.focus()))
  }
}

function handleProviderChange(event) {
  props.chat.updateProvider(event.target.value)
}

function selectFiles(event) {
  props.chat.addUploadedImages(event.target.files)
  event.target.value = ''
}

function dropFiles(event) {
  props.chat.addUploadedImages(event.dataTransfer?.files)
}
</script>

<template>
  <section class="panel">
    <div class="history-head">
      <h3>文字对话助手</h3>
      <div class="inline-buttons">
        <button type="button" class="secondary" @click="props.chat.exportConversationText">复制对话</button>
        <button type="button" class="warn" @click="props.chat.clearConversation">清空对话</button>
      </div>
    </div>
    <div class="tip">文字对话默认共用上方 API Key。支持 Comfly/OpenAI 兼容对话接口和 Gemini 对话接口，也支持上传图片或读取当前生成结果图。</div>

    <div class="chat-panel" style="margin-top: 14px;">
      <div>
        <div class="row-2">
          <div class="block">
            <label for="chatProvider">文字接口</label>
            <select id="chatProvider" :value="state.provider" @change="handleProviderChange">
              <option value="comfly">Comfly / OpenAI 兼容</option>
              <option value="gemini">Gemini 对话</option>
            </select>
          </div>
          <div class="block">
            <label for="chatModel">文字模型</label>
            <input id="chatModel" v-model="state.model" type="text" placeholder="请输入文字模型名称" />
          </div>
        </div>

        <div class="block">
          <label for="systemPrompt">助手设定</label>
          <textarea id="systemPrompt" v-model="state.systemPrompt" placeholder="例如：你是一个专业的电商产品设计助手，回答要简洁、结构清晰。" />
        </div>

        <div class="chat-options">
          <label class="check-line">
            <input v-model="state.includeCurrentImage" :disabled="!canAttachCurrentResult" type="checkbox" />
            <span>带上当前生成结果图一起提问</span>
          </label>
          <div class="tip">{{ canAttachCurrentResult ? '勾选后，文字模型会同时收到上方“生成结果”里的图片。' : '当前还没有生成结果图，因此这里暂时不可勾选。' }}</div>
        </div>

        <div class="chat-upload-area">
          <label>上传聊天参考图</label>
          <label class="chat-upload-drop" @dragenter.prevent @dragover.prevent @drop.prevent="dropFiles">
            点击上传图片，或把图片拖拽到这里<br />支持 PNG / JPG / WebP，可一次选择多张
            <input type="file" accept="image/png,image/jpeg,image/webp" multiple class="hidden-input" @change="selectFiles" />
          </label>
          <div class="chat-upload-preview">
            <div v-for="(item, index) in state.uploadedImages" :key="`${item.file.name}-${index}`" class="chat-upload-thumb" @click="props.chat.removeUploadedImage(index)">
              <img :src="item.previewUrl" :alt="`聊天参考图 ${index + 1}`" />
              <div>{{ item.file.name }}<br />{{ formatFileSize(item.file.size) }}</div>
            </div>
          </div>
          <div class="inline-buttons">
            <button type="button" class="secondary" @click="props.chat.clearUploadedImages">清空聊天图片</button>
          </div>
          <div class="tip">
            {{ state.uploadedImages.length ? `已上传 ${state.uploadedImages.length} 张聊天图片，点击缩略图可单独移除。` : '当前未上传聊天图片。上传后的图片会随下一条消息一起发送。' }}
          </div>
        </div>

        <div class="block chat-input-area">
          <label for="chatInput">输入消息</label>
          <textarea id="chatInput" v-model="state.input" placeholder="例如：请分析上面这张生成图的画面问题，并给我一版优化 prompt。按 Ctrl + Enter 可快速发送。" @keydown="onInputKeydown" />
        </div>

        <div class="toolbar">
          <button type="button" class="primary" :disabled="state.isSending" @click="props.chat.sendMessage">{{ state.isSending ? '发送中...' : '发送消息' }}</button>
        </div>
        <div class="status chat-status" :class="state.statusType">{{ state.statusMessage }}</div>
      </div>

      <div>
        <label>对话记录</label>
        <div class="chat-box">
          <div v-if="!state.messages.length" class="chat-empty">
            还没有对话。你可以让它帮你写 prompt、优化图片描述、分析设计方案或生成文案。
          </div>
          <template v-else>
            <div v-for="(item, index) in state.messages" :key="`${item.time}-${index}`" class="chat-message" :class="item.role === 'user' ? 'user' : 'assistant'">
              <div class="chat-role">{{ item.role === 'user' ? '你' : `AI 助手 · ${getProviderLabel(state.provider, 'chat')}` }}</div>
              <div class="chat-bubble">
                {{ item.content }}
                <div v-if="item.hasCurrentImage || item.uploadedImageCount" class="image-attached-note">
                  <template v-if="item.hasCurrentImage">已附带当前生成图</template>
                  <template v-if="item.uploadedImageCount">{{ item.hasCurrentImage ? ' / ' : '' }}已附带上传图 {{ item.uploadedImageCount }} 张</template>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </section>
</template>
