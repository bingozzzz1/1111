<script setup>
import { formatDate, getProviderLabel } from '@/utils/format'

const props = defineProps({
  history: { type: Array, required: true },
  currentResult: { type: String, default: '' }
})

const emit = defineEmits(['load-item', 'preview-item', 'download-item', 'delete-item', 'clear-history'])
</script>

<template>
  <section class="panel">
    <div class="history-head">
      <h3>图片历史记录</h3>
      <div class="inline-buttons">
        <button type="button" class="warn" @click="emit('clear-history')">清空历史</button>
      </div>
    </div>
    <div class="tip">默认最多保留最近 8 条，数据保存在当前浏览器 localStorage。</div>

    <div v-if="!history.length" class="history-empty">暂无历史记录</div>

    <div v-else class="history-list">
      <div v-for="item in history" :key="item.id" class="history-item">
        <img class="history-thumb" :src="item.resultSrc" alt="历史结果" />
        <div class="history-meta">
          <div class="history-time">{{ formatDate(item.time) }}</div>
          <div class="history-prompt">{{ item.prompt }}</div>
          <div class="tags">
            <span class="tag">{{ item.mode === 'edit' ? '图生图' : '文生图' }}</span>
            <span class="tag">接口 {{ getProviderLabel(item.provider) }}</span>
            <span class="tag">{{ item.model }}</span>
            <span class="tag">尺寸 {{ item.sizeLabel }}</span>
            <span class="tag">size {{ item.size }}</span>
            <span class="tag">参考图 {{ item.sourceCount }} 张</span>
          </div>
          <div class="history-actions">
            <button type="button" class="secondary" @click="emit('load-item', item.id)">载入参数</button>
            <button type="button" class="secondary" @click="emit('preview-item', item.resultSrc)">预览结果</button>
            <button type="button" class="secondary" @click="emit('download-item', item.resultSrc)">下载</button>
            <button type="button" class="warn" @click="emit('delete-item', item.id)">删除</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
