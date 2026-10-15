<script setup lang="ts">
import ProfileBioEditor from '@/views/profile/ProfileBioEditor.vue'

defineProps<{
  bio: string | null
  editing: boolean
  maxChars: number
  canUseEffects: boolean
}>()

defineEmits<{
  saved: [bio: string]
  cancel: []
}>()
</script>

<template>
  <section v-if="editing" class="profile-bio" aria-label="Edit bio">
    <h2 class="profile-bio__label">About</h2>
    <ProfileBioEditor :initial-bio="bio ?? ''" :max-chars="maxChars" :can-use-effects="canUseEffects"
      @saved="$emit('saved', $event)" @cancel="$emit('cancel')" />
  </section>
  <section v-else-if="bio" class="profile-bio" aria-label="About this player">
    <h2 class="profile-bio__label">About</h2>
    <div class="profile-bio__body" v-html="bio" />
  </section>
</template>

<style scoped>
.profile-bio {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding-block: var(--space-sm) var(--space-md);
}

.profile-bio__label {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-tertiary);
  margin: 0;
}

.profile-bio__body {
  color: var(--text-primary);
  font-size: var(--text-body);
  line-height: 1.65;
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
  font-style: italic;
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
  transition: opacity 120ms ease;
}

.profile-bio__body :deep(a:hover) {
  opacity: 0.8;
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
