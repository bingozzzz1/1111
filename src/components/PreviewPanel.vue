<script setup>
import { formatFileSize } from '@/utils/format'

const props = defineProps({
  sourceList: { type: Array, required: true },
  sourceMeta: { type: String, required: true },
  resultSrc: { type: String, default: '' },
  resultMeta: { type: String, required: true }
})
</script>

<template>
  <aside>
    <div class="panel">
      <h2 class="section-title">预览</h2>
      <div class="preview-card">
        <h3>参考图预览</h3>
        <div class="img-frame">
          <span v-if="!sourceList.length">图生图模式下，上传参考图后会显示在这里。</span>
          <div v-else class="source-list">
            <div v-for="(slot, index) in sourceList" :key="index" class="thumb-card">
              <img :src="slot.previewUrl" :alt="`参考图 ${index + 1}`" />
              <div class="thumb-meta">{{ slot.file.name }}<br />{{ formatFileSize(slot.file.size) }}</div>
            </div>
          </div>
        </div>
        <div class="small">{{ sourceMeta }}</div>
      </div>

      <div class="preview-card">
        <h3>生成结果</h3>
        <div class="img-frame">
          <span v-if="!resultSrc">生成完成后会显示在这里。</span>
          <img v-else class="result-visible" :src="resultSrc" alt="生成结果" />
        </div>
        <div class="small">{{ resultMeta }}</div>
      </div>
    </div>
  </aside>
</template>
