<script setup lang="ts">
import HintTooltip from '@/components/common/HintTooltip.vue'
import { useCampaignEditorContext } from '../campaignEditorContext'

const { doc, access, meta } = useCampaignEditorContext()
const { campaign } = doc
const { editable } = access
const { formMeta, commitMetaField } = meta
</script>

<template>
  <fieldset v-if="campaign" class="campaign-editor__section" :disabled="!editable">
    <label class="campaign-editor__field">
      <span>Name</span>
      <input v-model="formMeta.name" type="text" @blur="commitMetaField('name')" />
    </label>
    <label class="campaign-editor__field">
      <span>Creator alias</span>
      <input
        v-model="formMeta.creatorAlias"
        type="text"
        :placeholder="campaign.creatorName ?? 'Creator name'"
        @blur="commitMetaField('creatorAlias')"
      />
    </label>
    <label class="campaign-editor__field">
      <span>Slug</span>
      <input
        v-model="formMeta.slug"
        type="text"
        placeholder="auto from name"
        @blur="commitMetaField('slug')"
      />
    </label>
    <label class="campaign-editor__field">
      <span>Summary</span>
      <input v-model="formMeta.summary" type="text" @blur="commitMetaField('summary')" />
    </label>
    <label class="campaign-editor__field">
      <span>Description <HintTooltip text="Markdown supported." /></span>
      <textarea v-model="formMeta.description" rows="4" @blur="commitMetaField('description')" />
    </label>
  </fieldset>
</template>
