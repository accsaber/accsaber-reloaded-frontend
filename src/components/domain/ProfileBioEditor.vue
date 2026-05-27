<script setup lang="ts">
import { getApiErrorMessage } from '@/api/client'
import { updateMyProfile } from '@/api/users'
import BaseButton from '@/components/common/BaseButton.vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const BIO_MAX_STANDARD = 4000

const props = withDefaults(
  defineProps<{
    initialBio: string
    maxChars?: number
  }>(),
  { maxChars: BIO_MAX_STANDARD },
)

const BIO_MAX = computed(() => props.maxChars)
const isPerkBoosted = computed(() => props.maxChars > BIO_MAX_STANDARD)

const emit = defineEmits<{
  saved: [bio: string]
  cancel: []
}>()

const editorRef = ref<HTMLDivElement | null>(null)
const bioHtml = ref(props.initialBio)
const charCount = ref(props.initialBio.length)
const submitting = ref(false)
const errorMessage = ref<string | null>(null)
const overLimit = ref(false)
const savedAt = ref(0)
let savedClearTimer: ReturnType<typeof setTimeout> | null = null

const linkComposerOpen = ref(false)
const linkUrl = ref('')
let savedRange: Range | null = null

onMounted(async () => {
  await nextTick()
  if (editorRef.value) {
    editorRef.value.innerHTML = props.initialBio
    editorRef.value.focus()
  }
})

onBeforeUnmount(() => {
  if (savedClearTimer) clearTimeout(savedClearTimer)
})

function onInput() {
  const el = editorRef.value
  if (!el) return
  bioHtml.value = el.innerHTML
  charCount.value = el.innerHTML.length
  overLimit.value = charCount.value > BIO_MAX.value
}

function focusEditor() {
  editorRef.value?.focus()
}

function runCommand(command: string, value?: string) {
  focusEditor()
  document.execCommand(command, false, value)
  onInput()
}

function toggleBlock(tag: string) {
  focusEditor()
  document.execCommand('formatBlock', false, tag)
  onInput()
}

function wrapInTag(tag: 'code' | 'sub' | 'sup') {
  focusEditor()
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return
  const range = selection.getRangeAt(0)
  if (range.collapsed) return
  const node = document.createElement(tag)
  node.textContent = range.toString()
  range.deleteContents()
  range.insertNode(node)
  range.setStartAfter(node)
  range.setEndAfter(node)
  selection.removeAllRanges()
  selection.addRange(range)
  onInput()
}

function openLinkComposer() {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || selection.toString().length === 0) return
  savedRange = selection.getRangeAt(0).cloneRange()
  linkUrl.value = ''
  linkComposerOpen.value = true
}

function applyLink() {
  const url = linkUrl.value.trim()
  if (!url || !/^https?:\/\//i.test(url)) {
    linkComposerOpen.value = false
    return
  }
  if (savedRange && editorRef.value) {
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(savedRange)
    editorRef.value.focus()
    document.execCommand('createLink', false, url)
    onInput()
  }
  linkComposerOpen.value = false
  savedRange = null
}

function cancelLink() {
  linkComposerOpen.value = false
  savedRange = null
}

function clearFormatting() {
  focusEditor()
  document.execCommand('removeFormat')
  document.execCommand('unlink')
  onInput()
}

function flashSaved() {
  savedAt.value = Date.now()
  if (savedClearTimer) clearTimeout(savedClearTimer)
  savedClearTimer = setTimeout(() => { savedAt.value = 0 }, 2500)
}

async function onSave() {
  if (overLimit.value) return
  if (bioHtml.value === props.initialBio) {
    emit('saved', bioHtml.value)
    flashSaved()
    return
  }
  submitting.value = true
  errorMessage.value = null
  try {
    await updateMyProfile({ bio: bioHtml.value })
    emit('saved', bioHtml.value)
    flashSaved()
  } catch (err) {
    errorMessage.value = getApiErrorMessage(err, 'Could not save your bio.')
  } finally {
    submitting.value = false
  }
}

interface FormatButton {
  key: string
  label: string
  title: string
  action: () => void
}

const formatGroups: FormatButton[][] = [
  [
    { key: 'b', label: 'B', title: 'Bold', action: () => runCommand('bold') },
    { key: 'i', label: 'I', title: 'Italic', action: () => runCommand('italic') },
    { key: 'u', label: 'U', title: 'Underline', action: () => runCommand('underline') },
    { key: 's', label: 'S', title: 'Strikethrough', action: () => runCommand('strikeThrough') },
    { key: 'code', label: '<>', title: 'Inline code', action: () => wrapInTag('code') },
  ],
  [
    { key: 'h3', label: 'H3', title: 'Heading 3', action: () => toggleBlock('h3') },
    { key: 'h4', label: 'H4', title: 'Heading 4', action: () => toggleBlock('h4') },
    { key: 'p', label: 'P', title: 'Paragraph', action: () => toggleBlock('p') },
  ],
  [
    { key: 'ul', label: '\u2022 List', title: 'Bullet list', action: () => runCommand('insertUnorderedList') },
    { key: 'ol', label: '1. List', title: 'Numbered list', action: () => runCommand('insertOrderedList') },
    { key: 'quote', label: '\u201C\u201D', title: 'Blockquote', action: () => toggleBlock('blockquote') },
  ],
]
</script>

<template>
  <div class="bio-editor">
    <div class="bio-editor__toolbar" role="toolbar" aria-label="Bio formatting">
      <template v-for="(group, gi) in formatGroups" :key="gi">
        <span v-if="gi > 0" class="bio-editor__tb-divider" />
        <button v-for="btn in group" :key="btn.key" type="button" class="bio-editor__tb-btn" :title="btn.title"
          :aria-label="btn.title" @click="btn.action">{{ btn.label }}</button>
      </template>
      <span class="bio-editor__tb-divider" />
      <button type="button" class="bio-editor__tb-btn" title="Align left" aria-label="Align left"
        @click="runCommand('justifyLeft')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <line x1="21" y1="6" x2="3" y2="6" />
          <line x1="15" y1="12" x2="3" y2="12" />
          <line x1="17" y1="18" x2="3" y2="18" />
        </svg>
      </button>
      <button type="button" class="bio-editor__tb-btn" title="Align center" aria-label="Align center"
        @click="runCommand('justifyCenter')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <line x1="21" y1="6" x2="3" y2="6" />
          <line x1="17" y1="12" x2="7" y2="12" />
          <line x1="19" y1="18" x2="5" y2="18" />
        </svg>
      </button>
      <button type="button" class="bio-editor__tb-btn" title="Align right" aria-label="Align right"
        @click="runCommand('justifyRight')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <line x1="21" y1="6" x2="3" y2="6" />
          <line x1="21" y1="12" x2="9" y2="12" />
          <line x1="21" y1="18" x2="7" y2="18" />
        </svg>
      </button>
      <span class="bio-editor__tb-divider" />
      <button type="button" class="bio-editor__tb-btn" title="Link selected text" aria-label="Link"
        @click="openLinkComposer">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      </button>
      <button type="button" class="bio-editor__tb-btn" title="Remove link" aria-label="Unlink"
        @click="runCommand('unlink')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <path d="M18.84 12.25l1.72-1.71a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M5.17 11.75l-1.71 1.71a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          <line x1="8" y1="2" x2="8" y2="5" />
          <line x1="2" y1="8" x2="5" y2="8" />
          <line x1="16" y1="19" x2="16" y2="22" />
          <line x1="19" y1="16" x2="22" y2="16" />
        </svg>
      </button>
      <span class="bio-editor__tb-spacer" />
      <button type="button" class="bio-editor__tb-btn bio-editor__tb-btn--text" title="Clear formatting"
        aria-label="Clear formatting" @click="clearFormatting">
        Clear
      </button>
    </div>

    <div v-if="linkComposerOpen" class="bio-editor__link-row">
      <input v-model="linkUrl" type="url" placeholder="https://example.com" class="bio-editor__link-input" autofocus
        @keydown.enter.prevent="applyLink" @keydown.escape.prevent="cancelLink" />
      <BaseButton type="button" size="sm" variant="primary" @click="applyLink">Apply</BaseButton>
      <BaseButton type="button" size="sm" @click="cancelLink">Cancel</BaseButton>
    </div>

    <div ref="editorRef" class="bio-editor__body" contenteditable="true" role="textbox" aria-multiline="true"
      aria-label="Bio editor" @input="onInput" />

    <div class="bio-editor__footer">
      <div class="bio-editor__footer-info">
        <span v-if="overLimit" class="bio-editor__error">Bio is over the {{ BIO_MAX.toLocaleString() }} character limit.</span>
        <span v-else-if="errorMessage" class="bio-editor__error">{{ errorMessage }}</span>
        <span v-else-if="savedAt" class="bio-editor__saved">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Saved
        </span>
        <span v-else class="bio-editor__hint">Server strips disallowed tags on save.</span>
        <span class="bio-editor__counter-row">
          <span class="bio-editor__counter" :class="{ 'bio-editor__counter--over': overLimit }">
            {{ charCount.toLocaleString() }} / {{ BIO_MAX.toLocaleString() }}
          </span>
          <span v-if="isPerkBoosted" class="bio-editor__perk" title="Supporters get a higher character limit">
            Supporter perk
          </span>
        </span>
      </div>
      <div class="bio-editor__footer-actions">
        <BaseButton type="button" size="sm" @click="emit('cancel')">Cancel</BaseButton>
        <BaseButton type="button" size="sm" variant="primary" :loading="submitting" :disabled="overLimit"
          @click="onSave">Save bio</BaseButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bio-editor {
  display: flex;
  flex-direction: column;
}

.bio-editor__toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
  padding: 4px;
  border: 1px solid var(--bg-overlay);
  border-bottom: none;
  border-top-left-radius: var(--radius-input);
  border-top-right-radius: var(--radius-input);
  background: var(--bg-base);
}

.bio-editor__tb-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 6px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  font-weight: 600;
  cursor: pointer;
  border-radius: var(--radius-btn);
  transition: background-color 120ms ease, color 120ms ease;
}

.bio-editor__tb-btn:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.bio-editor__tb-btn--text {
  font-weight: 500;
  letter-spacing: 0.04em;
}

.bio-editor__tb-divider {
  width: 1px;
  height: 18px;
  background: var(--bg-overlay);
  margin: 0 4px;
}

.bio-editor__tb-spacer {
  flex: 1;
}

.bio-editor__link-row {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs);
  border-left: 1px solid var(--bg-overlay);
  border-right: 1px solid var(--bg-overlay);
  background: var(--bg-base);
}

.bio-editor__link-input {
  flex: 1;
  padding: 6px var(--space-sm);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-input);
  background: var(--bg-elevated);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  outline: none;
  transition: border-color 120ms ease;
}

.bio-editor__link-input:focus {
  border-color: var(--accent);
}

.bio-editor__body {
  min-height: 180px;
  max-height: 360px;
  overflow-y: auto;
  padding: var(--space-md);
  border: 1px solid var(--bg-overlay);
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--text-body);
  line-height: 1.6;
  outline: none;
  transition: border-color 120ms ease;
}

.bio-editor__body:focus {
  border-color: var(--accent);
}

.bio-editor__body :deep(h3) {
  font-size: 1.15rem;
  font-weight: 600;
  margin: 0.6em 0 0.3em;
}

.bio-editor__body :deep(h4) {
  font-size: 1rem;
  font-weight: 600;
  margin: 0.6em 0 0.3em;
}

.bio-editor__body :deep(p) {
  margin: 0 0 0.6em;
}

.bio-editor__body :deep(ul),
.bio-editor__body :deep(ol) {
  padding-left: 1.5em;
  margin: 0 0 0.6em;
}

.bio-editor__body :deep(blockquote) {
  margin: 0 0 0.6em;
  padding: 0 var(--space-md);
  color: var(--text-secondary);
  border-left: 1px solid var(--bg-overlay);
}

.bio-editor__body :deep(code) {
  font-family: var(--font-mono);
  font-size: 0.9em;
  padding: 0 4px;
  border-radius: 3px;
  background: var(--bg-elevated);
  color: var(--accent);
}

.bio-editor__body :deep(a) {
  color: var(--accent);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
}

.bio-editor__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--bg-overlay);
  border-top: none;
  border-bottom-left-radius: var(--radius-input);
  border-bottom-right-radius: var(--radius-input);
  background: var(--bg-base);
}

.bio-editor__footer-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  font-size: var(--text-caption);
}

.bio-editor__footer-actions {
  display: flex;
  gap: var(--space-xs);
  flex-shrink: 0;
}

.bio-editor__hint {
  color: var(--text-tertiary);
}

.bio-editor__counter-row {
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-sm);
}

.bio-editor__counter {
  font-family: var(--font-mono);
  color: var(--text-tertiary);
}

.bio-editor__counter--over {
  color: var(--error);
}

.bio-editor__perk {
  font-family: var(--font-sans);
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.bio-editor__error {
  color: var(--error);
}

.bio-editor__saved {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--success);
}

@media (max-width: 599px) {
  .bio-editor__footer {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
