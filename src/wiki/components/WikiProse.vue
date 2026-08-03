<template>
  <div class="wiki-prose">
    <slot />
  </div>
</template>

<style scoped>
.wiki-prose {
  color: var(--text-primary);
  font-size: 1rem;
  line-height: 1.7;
}

.wiki-prose :deep(p) {
  margin: 0 0 var(--space-md);
  max-width: 72ch;
}

.wiki-prose :deep(a) {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.wiki-prose :deep(a:hover) {
  filter: brightness(1.15);
}

.wiki-prose :deep(ul),
.wiki-prose :deep(ol) {
  margin: 0 0 var(--space-md);
  padding-left: var(--space-lg);
  max-width: 72ch;
}

.wiki-prose :deep(li) {
  margin-bottom: var(--space-xs);
}

.wiki-prose :deep(strong) {
  font-weight: 600;
}

.wiki-prose :deep(:not(pre) > code) {
  font-family: var(--font-code);
  font-size: 0.85em;
  padding: 1px 6px;
  border-radius: var(--radius-btn);
  background: var(--bg-elevated);
  border: 1px solid var(--bg-overlay);
}

.wiki-prose :deep(hr) {
  border: none;
  border-top: 1px solid var(--bg-overlay);
  margin: var(--space-lg) 0;
}

.wiki-prose :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0 0 var(--space-md);
}

.wiki-prose :deep(th),
.wiki-prose :deep(td) {
  padding: var(--space-sm);
  border-bottom: 1px solid var(--bg-overlay);
  text-align: left;
}

.wiki-prose :deep(th) {
  color: var(--text-secondary);
  font-weight: 600;
  font-size: var(--text-caption);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
</style>
