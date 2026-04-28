<script setup>
import HeaderHero from '@/components/HeaderHero.vue'
import ImageWorkspace from '@/components/ImageWorkspace.vue'
import PreviewPanel from '@/components/PreviewPanel.vue'
import ChatWorkspace from '@/components/ChatWorkspace.vue'
import HistoryPanel from '@/components/HistoryPanel.vue'
import { useImageStudio } from '@/composables/useImageStudio'
import { useChatStudio } from '@/composables/useChatStudio'

const imageStudio = useImageStudio()
const chatStudio = useChatStudio({
  getApiKey: () => imageStudio.state.apiKey,
  getCurrentResultImage: () => imageStudio.state.resultSrc
})

function downloadResult(url, prefix = 'hotstrip_image') {
  if (!url) return
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${prefix}_${Date.now()}.png`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}
</script>

<template>
  <main class="wrap">
    <HeaderHero />

    <section class="grid">
      <div>
        <ImageWorkspace :studio="imageStudio" @download-result="downloadResult" />
      </div>
      <PreviewPanel
        :source-list="imageStudio.sourcePreviewList()"
        :source-meta="imageStudio.sourceMetaText()"
        :result-src="imageStudio.state.resultSrc"
        :result-meta="imageStudio.state.resultMeta"
      />
    </section>

    <ChatWorkspace :chat="chatStudio" :has-current-image="!!imageStudio.state.resultSrc" />

    <HistoryPanel
      :history="imageStudio.state.history"
      :current-result="imageStudio.state.resultSrc"
      @load-item="imageStudio.loadHistoryItem"
      @preview-item="(src) => imageStudio.showResult(src, 'history')"
      @download-item="(src) => downloadResult(src, 'history_image')"
      @delete-item="imageStudio.deleteHistoryItem"
      @clear-history="imageStudio.clearHistory"
    />
  </main>
</template>
