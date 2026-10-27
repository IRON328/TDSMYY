<template>
  <div class="composer">
    <textarea
      :value="modelValue"
      rows="2"
      placeholder="输入市场调查题目，或上传题目文件..."
      aria-label="输入研究题目"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <div class="cbar">
      <button type="button" class="btn-ghost" @click="pickFile">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="M17 8l-5-5-5 5" />
          <path d="M12 3v12" />
        </svg>
        上传题目文件
      </button>
      <span class="hint">{{ hintText }}</span>
      <div class="spacer" />
      <button type="button" class="btn-send" :disabled="!modelValue.trim()" @click="emit('submit')">
        开始研究
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>
    </div>
    <input ref="fileEl" type="file" multiple hidden @change="onFiles" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

/**
 * 首页输入区（原型 `.composer.big`）。
 *
 * 选文件只在本地记名字：当前没有上传接口，直接说「已上传」是假话。
 * 所以文案改成「已选择 N 个文件」，并且明说接入后随研究一并提交。
 */
defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string]; submit: []; files: [names: string[]] }>()

const DEFAULT_HINT = '支持 PDF / Word / 图片 / Excel 数据附件'
const fileEl = ref<HTMLInputElement | null>(null)
const names = ref<string[]>([])

const hintText = computed(() =>
  names.value.length
    ? `已选择 ${names.value.length} 个文件：${names.value.join('、')}（接入后随研究一并提交）`
    : DEFAULT_HINT,
)

function pickFile() {
  fileEl.value?.click()
}

function onFiles(event: Event) {
  const files = (event.target as HTMLInputElement).files
  names.value = files ? Array.from(files).map((f) => f.name) : []
  emit('files', names.value)
}
</script>

<style scoped>
.composer {
  position: relative;
  max-width: 820px;
  margin: 34px auto 0;
  border: 1px solid var(--hp-line);
  border-radius: 18px;
  background: #fff;
  box-shadow: var(--hp-sh2);
  overflow: hidden;
  text-align: left;
  transition: 0.2s;
}
.composer:focus-within {
  border-color: var(--hp-blue-400);
  box-shadow: 0 8px 28px rgba(11, 110, 104, 0.14);
}
.composer textarea {
  display: block;
  width: 100%;
  min-height: 74px;
  max-height: 200px;
  padding: 20px 22px 8px;
  border: 0;
  outline: none;
  resize: none;
  background: none;
  color: var(--hp-ink);
  font-family: inherit;
  font-size: 15px;
  line-height: 1.7;
}
.composer textarea::placeholder {
  color: var(--hp-ink-4);
}
.cbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px 12px;
  border-top: 1px solid var(--hp-line-2);
  background: #f8fcfc;
}
.spacer {
  flex: 1;
}
.hint {
  font-size: 12px;
  color: var(--hp-ink-4);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.btn-ghost {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 7px;
  padding: 8px 14px;
  border: 1px solid var(--hp-line);
  border-radius: 10px;
  background: #fff;
  color: var(--hp-ink-2);
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.18s;
}
.btn-ghost:hover {
  border-color: var(--hp-blue-300);
  color: var(--hp-blue-700);
  background: var(--hp-blue-50);
}
.btn-send {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 7px;
  padding: 9px 22px;
  border: 0;
  border-radius: 10px;
  background: var(--hp-grad);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  box-shadow: 0 3px 10px rgba(11, 110, 104, 0.28);
  cursor: pointer;
  transition: 0.18s;
}
.btn-send:hover {
  filter: brightness(1.06);
  transform: translateY(-1px);
}
.btn-send[disabled] {
  opacity: 0.45;
  pointer-events: none;
}
@media (max-width: 720px) {
  .hint {
    display: none;
  }
}
</style>
