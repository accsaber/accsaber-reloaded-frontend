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

.wiki-prose :deep(p:not([class])) {
  margin: 0 0 var(--space-md);
  max-width: 50ch;
  text-wrap: pretty;
}

.wiki-prose :deep(a:not([data-wiki-raw] a)) {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.wiki-prose :deep(a:not([data-wiki-raw] a):hover) {
  filter: brightness(1.15);
}

.wiki-prose :deep(ul:not([class])),
.wiki-prose :deep(ol:not([class])) {
  margin: 0 0 var(--space-md);
  padding-left: var(--space-lg);
  max-width: 50ch;
}

.wiki-prose :deep(li:not([class])) {
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
}

.wiki-prose :deep(math[display='block']) {
  margin: 0 0 var(--space-md);
  padding: var(--space-md);
  overflow-x: auto;
  font-size: 1.15em;
  color: var(--text-primary);
  background: var(--bg-base);
  border-radius: var(--radius-card);
}

.wiki-prose :deep(math mn) {
  color: var(--accent);
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
  padding: var(--space-sm) var(--space-md);
  text-align: left;
}

.wiki-prose :deep(thead th) {
  color: var(--text-secondary);
  font-weight: 600;
  font-size: var(--text-caption);
}

.wiki-prose :deep(tbody tr:nth-child(odd)) {
  background: var(--bg-elevated);
}

@media (max-width: 639px) {
  .wiki-prose :deep(table) {
    font-size: var(--text-body);
    line-height: 1.4;
  }

  .wiki-prose :deep(th),
  .wiki-prose :deep(td) {
    padding: var(--space-sm) var(--space-xs);
    overflow-wrap: anywhere;
  }
}
</style>
