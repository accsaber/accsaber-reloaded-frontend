<script setup lang="ts">
import BaseBanner from '@/components/common/BaseBanner.vue'
import BaseButton from '@/components/common/BaseButton.vue'
</script>

<template>
  <div class="quest-install">
    <ol class="quest-install__list">
      <li>
        On a desktop or laptop, open
        <a href="https://mbf.bsquest.xyz" target="_blank" rel="noopener noreferrer">ModsBeforeFriday</a>
        in Chrome or Edge.
      </li>
      <li>
        Plug the headset into the computer with a USB cable, put the headset on, and accept the
        connection prompt inside it.
      </li>
      <li>
        If Beat Saber has never been modded, let ModsBeforeFriday patch it first. It walks you
        through every step.
      </li>
      <li>
        Drag the <code>.qmod</code> file you generated into ModsBeforeFriday. It installs the mod
        and downloads everything the mod needs.
      </li>
      <li>
        Launch Beat Saber and reach the main menu once. Your headset is now linked, and scores on
        ranked maps upload automatically from then on.
      </li>
    </ol>

    <BaseButton href="https://mbf.bsquest.xyz" variant="primary">Open ModsBeforeFriday</BaseButton>

    <BaseBanner variant="error" role="alert" :dismissible="false">
      Still do not share the <code>.qmod</code> file - it carries your private AccSaber session.
      Need a clean one? Come back here and generate again.
    </BaseBanner>
  </div>
</template>

<style scoped>
.quest-install {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-lg);
}

.quest-install__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin: 0;
  padding-left: var(--space-lg);
  color: var(--text-secondary);
  font-size: var(--text-body);
  line-height: 1.6;
}

.quest-install__list::marker,
.quest-install__list li::marker {
  color: var(--page-accent, var(--accent));
  font-family: var(--font-mono);
  font-weight: 600;
}

.quest-install a {
  color: var(--page-accent, var(--accent));
  text-decoration: none;
  border-bottom: 1px solid color-mix(in srgb, var(--page-accent, var(--accent)) 40%, transparent);
}

.quest-install a:hover {
  border-bottom-color: var(--page-accent, var(--accent));
}

code {
  font-family: var(--font-code);
  font-size: 0.8125em;
  background: var(--bg-elevated);
  color: var(--text-primary);
  padding: 1px 6px;
  border-radius: var(--radius-btn);
}

.quest-install :deep(.banner) {
  max-width: none;
  margin: 0;
}
</style>
