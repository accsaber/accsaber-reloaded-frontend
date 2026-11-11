<script setup lang="ts">
import RichTextEditor from '@/components/common/RichTextEditor.vue'
import ProfileFold from '@/views/profile/ProfileFold.vue'

defineProps<{
  bio: string | null
  editing: boolean
  maxChars: number
  canUseEffects: boolean
}>()

const draft = defineModel<string>('draft', { required: true })
</script>

<template>
  <section v-if="editing" class="profile-bio" aria-label="Edit bio">
    <RichTextEditor v-model="draft" aria-label="Bio" :allow-rich-effects="canUseEffects" />
    <span class="profile-bio__counter" :class="{ 'profile-bio__counter--over': draft.length > maxChars }">
      {{ draft.length.toLocaleString() }} / {{ maxChars.toLocaleString() }}
    </span>
  </section>
  <ProfileFold v-else-if="bio" label="About" storage-key="about" aria-label="About this player">
    <div class="profile-bio__body" v-html="bio" />
  </ProfileFold>
</template>

<style scoped>
.profile-bio {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding-block: var(--space-sm) var(--space-md);
}

.profile-bio__counter {
  align-self: flex-end;
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.profile-bio__counter--over {
  color: var(--error);
}

.profile-bio__body {
  color: var(--text-primary);
  font-size: var(--text-body);
  line-height: 1.65;
  text-wrap: pretty;
}

.profile-bio__body :deep(*:first-child) {
  margin-top: 0;
}

.profile-bio__body :deep(*:last-child) {
  margin-bottom: 0;
}

.profile-bio__body :deep(h3) {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 1.4em 0 0.4em;
}

.profile-bio__body :deep(h4),
.profile-bio__body :deep(h5),
.profile-bio__body :deep(h6) {
  font-size: 1rem;
  font-weight: 600;
  margin: 1.2em 0 0.4em;
}

.profile-bio__body :deep(p) {
  margin: 0 0 0.8em;
}

.profile-bio__body :deep(ul),
.profile-bio__body :deep(ol) {
  padding-left: 1.4em;
  margin: 0 0 0.8em;
}

.profile-bio__body :deep(li) {
  margin-bottom: 0.2em;
}

.profile-bio__body :deep(blockquote) {
  margin: 0.6em 0 1em;
  padding-left: var(--space-md);
  color: var(--text-secondary);
  border-left: 1px solid var(--bg-overlay);
}

.profile-bio__body :deep(code),
.profile-bio__body :deep(tt) {
  font-family: var(--font-mono);
  font-size: 0.9em;
  padding: 1px 5px;
  border-radius: var(--radius-pill);
  background: var(--bg-elevated);
  color: var(--accent);
}

.profile-bio__body :deep(pre) {
  font-family: var(--font-mono);
  font-size: 0.85em;
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-card);
  background: var(--bg-elevated);
  overflow-x: auto;
  margin: 0 0 0.8em;
}

.profile-bio__body :deep(pre code) {
  padding: 0;
  background: transparent;
  color: var(--text-primary);
}

.profile-bio__body :deep(a) {
  color: var(--accent);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
}

.profile-bio__body :deep(a:hover) {
  text-decoration-thickness: 2px;
}

.profile-bio__body :deep(hr) {
  border: none;
  border-top: 1px solid var(--bg-overlay);
  margin: 1.2em 0;
}

.profile-bio__body :deep(small) {
  font-size: 0.85em;
  color: var(--text-secondary);
}
</style>
