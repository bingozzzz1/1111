<script setup>
import { ref, watch } from 'vue'
import { formatFileSize } from '@/utils/format'

const props = defineProps({
  slots: { type: Array, required: true }
})

const emit = defineEmits(['set-file', 'clear-slot', 'fill-empty'])
const batchInput = ref(null)

watch(() => props.slots, () => {
  if (batchInput.value) batchInput.value.value = ''
})

function openBatch() {
  batchInput.value?.click()
}

function handleBatchChange(event) {
  const files = event.target.files
  emit('fill-empty', files)
  event.target.value = ''
}

function handleInputChange(index, event) {
  const file = event.target.files?.[0]
  if (file) emit('set-file', { index, file })
  event.target.value = ''
}

function handleDrop(index, event) {
  const file = Array.from(event.dataTransfer?.files || []).find((item) => /^image\//.test(item.type || ''))
  if (file) emit('set-file', { index, file })
}
</script>

<template>
  <div class="stack-12">
    <div class="inline-buttons">
      <button type="button" class="secondary" @click="openBatch">批量填充空格子</button>
      <input ref="batchInput" type="file" accept="image/png,image/jpeg,image/webp" multiple class="hidden-input" @change="handleBatchChange" />
    </div>

    <div class="upload-grid">
      <div
        v-for="(slot, index) in slots"
        :key="index"
        class="upload-slot"
        @dragenter.prevent
        @dragover.prevent
        @drop.prevent="handleDrop(index, $event)"
      >
        <button v-if="slot.file" type="button" class="slot-clear" @click.stop="emit('clear-slot', index)">清除</button>
        <input :id="`slot-${index}`" class="hidden-input" type="file" accept="image/png,image/jpeg,image/webp" @change="handleInputChange(index, $event)" />
        <label class="slot-surface" :for="`slot-${index}`">
          <img v-if="slot.previewUrl" class="slot-preview" :src="slot.previewUrl" :alt="`参考图 ${index + 1}`" />
          <div v-else class="slot-inner">
            <div class="slot-plus">+</div>
            <div>第 {{ index + 1 }} 张参考图</div>
            <div>点击上传 / 拖拽到此</div>
          </div>
        </label>
        <div class="thumb-meta">
          <template v-if="slot.file">
            {{ slot.file.name }}<br />{{ formatFileSize(slot.file.size) }}
          </template>
          <template v-else>未上传</template>
        </div>
      </div>
    </div>
  </div>
</template>
