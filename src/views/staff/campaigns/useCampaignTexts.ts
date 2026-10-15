import {
  addPlayerCampaignText,
  deletePlayerCampaignText,
  updatePlayerCampaignText,
} from '@/api/campaigns'
import { parseApiError } from '@/api/client'
import type { CampaignTextRequest } from '@/types/api/admin'
import type { CampaignTextResponse } from '@/types/api/campaigns'
import { onBeforeUnmount, ref, watch, type ComputedRef, type Ref } from 'vue'
import { fieldPatch, type CampaignDocument } from './useCampaignDocument'
import type { CampaignSelection } from './useCampaignSelection'
import type { TrayId } from './useCampaignTrays'
import type { CampaignVertices } from './useCampaignVertices'

const MAX_TEXTS = 100

export const TEXT_EFFECTS = ['glow', 'outline', 'shadow'] as const

type TextField = 'content' | 'font' | 'scale' | 'color' | 'effects'

interface TextsContext {
  doc: CampaignDocument
  selection: CampaignSelection
  vertices: CampaignVertices
  editable: ComputedRef<boolean>
  activeTray: Ref<TrayId | null>
}

export function useCampaignTexts(ctx: TextsContext) {
  const { campaign, actionPending, actionError, replaceRow, ensureCampaign, load } = ctx.doc
  const { selectedId, selectOnly, clearSelection } = ctx.selection
  const { selectedText, textById, allocateCells } = ctx.vertices
  const { editable, activeTray } = ctx

  const pendingTextIds = new Set<string>()
  const cancelledTextIds = new Set<string>()
  let tempTextSeq = 0

  function isPendingText(id: string): boolean {
    return pendingTextIds.has(id)
  }

  function cancelPendingText(id: string): boolean {
    if (!pendingTextIds.delete(id)) return false
    cancelledTextIds.add(id)
    return true
  }

  const formText = ref<{
    content: string
    font: string
    scale: number
    color: string
    effects: string
  }>({
    content: '',
    font: '',
    scale: 1,
    color: '',
    effects: '',
  })

  let textContentTimer: ReturnType<typeof setTimeout> | null = null

  function cancelTextContentCommit() {
    if (textContentTimer) {
      clearTimeout(textContentTimer)
      textContentTimer = null
    }
  }

  function onTextContentInput(html: string) {
    formText.value.content = html
    if (!editable.value) return
    cancelTextContentCommit()
    textContentTimer = setTimeout(() => {
      textContentTimer = null
      commitTextField('content')
    }, 500)
  }

  onBeforeUnmount(cancelTextContentCommit)

  let lastSyncedTextId: string | null = null

  function syncFormFromText() {
    const t = selectedText.value
    if (!t) {
      lastSyncedTextId = null
      cancelTextContentCommit()
      return
    }
    if (t.id !== lastSyncedTextId) cancelTextContentCommit()
    lastSyncedTextId = t.id
    formText.value = {
      content: t.content ?? '',
      font: t.font ?? '',
      scale: t.scale ?? 1,
      color: t.color ?? '',
      effects: t.effects ?? '',
    }
  }

  watch(selectedText, syncFormFromText, { immediate: true })

  async function applyTextPatch(id: string, partial: Partial<CampaignTextRequest>) {
    const t = textById.value.get(id)
    if (!t) return
    if (isPendingText(id)) {
      replaceRow('texts', id, (x) => ({ ...x, ...partial }) as CampaignTextResponse)
      return
    }
    const req: CampaignTextRequest = {
      positionX: t.positionX,
      positionY: t.positionY,
      ...partial,
    }
    try {
      actionError.value = null
      const updated = await updatePlayerCampaignText(id, req)
      replaceRow('texts', id, () =>
        selectedId.value === id ? { ...updated, content: formText.value.content } : updated,
      )
    } catch (err) {
      actionError.value = parseApiError(err, 'Failed to update text').message
    }
  }

  function commitTextField(field: TextField) {
    const t = selectedText.value
    if (!editable.value || !t) return
    const patch = fieldPatch(formText.value, t, field, null)
    if (patch) void applyTextPatch(t.id, patch as Partial<CampaignTextRequest>)
  }

  function textEffectActive(effect: string): boolean {
    return formText.value.effects.split(/\s+/).includes(effect)
  }

  function toggleTextEffect(effect: string) {
    if (!editable.value) return
    const set = new Set(formText.value.effects.split(/\s+/).filter(Boolean))
    if (set.has(effect)) set.delete(effect)
    else set.add(effect)
    formText.value.effects = Array.from(set).join(' ')
    commitTextField('effects')
  }

  function resetTextColor() {
    formText.value.color = ''
    commitTextField('color')
  }

  async function addText() {
    if (!editable.value) return
    let c = campaign.value
    if (!c || c.id === '') {
      c = await ensureCampaign()
      if (!c) return
    }
    if ((c.texts?.length ?? 0) >= MAX_TEXTS) {
      actionError.value = `Campaigns can have at most ${MAX_TEXTS} text elements.`
      return
    }
    actionError.value = null
    const [cell] = allocateCells(1)
    const positionX = cell?.x ?? 0
    const positionY = cell?.y ?? 0
    const tempId = `temp-text-${++tempTextSeq}`
    const optimistic: CampaignTextResponse = {
      id: tempId,
      content: 'New text',
      positionX,
      positionY,
      font: null,
      scale: 1,
      color: null,
      effects: null,
    }
    pendingTextIds.add(tempId)
    campaign.value = { ...c, texts: [...(c.texts ?? []), optimistic] }
    selectOnly(tempId)
    activeTray.value = 'text'

    const req: CampaignTextRequest = { content: 'New text', positionX, positionY }
    void addPlayerCampaignText(c.id, req).then(
      (created) => finalizeTextCreate(tempId, created),
      (err) => rollbackTextCreate(tempId, err),
    )
  }

  async function discardCreatedText(tempId: string, createdId: string): Promise<boolean> {
    if (!cancelledTextIds.delete(tempId)) return false
    const campaignId = campaign.value?.id
    if (campaignId) {
      try {
        await deletePlayerCampaignText(campaignId, createdId)
      } catch {
        void 0
      }
    }
    return true
  }

  function textDiffers(local: CampaignTextResponse, created: CampaignTextResponse, content: string) {
    return (
      content !== created.content ||
      local.positionX !== created.positionX ||
      local.positionY !== created.positionY ||
      (local.font ?? '') !== (created.font ?? '') ||
      (local.scale ?? 1) !== (created.scale ?? 1) ||
      (local.color ?? '') !== (created.color ?? '') ||
      (local.effects ?? '') !== (created.effects ?? '')
    )
  }

  async function finalizeTextCreate(tempId: string, created: CampaignTextResponse) {
    pendingTextIds.delete(tempId)
    if (await discardCreatedText(tempId, created.id)) return
    const local = campaign.value?.texts.find((t) => t.id === tempId)
    if (!campaign.value || !local) return
    const freshContent = selectedId.value === tempId ? formText.value.content : local.content
    const merged: CampaignTextResponse = {
      ...created,
      content: freshContent,
      positionX: local.positionX,
      positionY: local.positionY,
      font: local.font,
      scale: local.scale,
      color: local.color,
      effects: local.effects,
    }
    replaceRow('texts', tempId, () => merged)
    if (selectedId.value === tempId) {
      const tray = activeTray.value
      selectOnly(created.id)
      activeTray.value = tray
    }
    if (!textDiffers(local, created, freshContent)) return
    await applyTextPatch(created.id, {
      content: merged.content,
      positionX: merged.positionX,
      positionY: merged.positionY,
      font: merged.font ?? '',
      scale: merged.scale ?? 1,
      color: merged.color ?? '',
      effects: merged.effects ?? '',
    })
  }

  function rollbackTextCreate(tempId: string, err: unknown) {
    pendingTextIds.delete(tempId)
    if (campaign.value) {
      campaign.value = {
        ...campaign.value,
        texts: campaign.value.texts.filter((t) => t.id !== tempId),
      }
    }
    if (selectedId.value === tempId) clearSelection()
    actionError.value = parseApiError(err, 'Failed to add text').message
  }

  async function removeSelectedText() {
    const t = selectedText.value
    if (!editable.value || !t || !campaign.value) return
    if (!window.confirm('Remove this text element?')) return
    if (cancelPendingText(t.id)) {
      campaign.value = {
        ...campaign.value,
        texts: campaign.value.texts.filter((x) => x.id !== t.id),
      }
      clearSelection()
      return
    }
    actionPending.value = true
    actionError.value = null
    try {
      await deletePlayerCampaignText(campaign.value.id, t.id)
      clearSelection()
      await load(true)
    } catch (err) {
      actionError.value = parseApiError(err, 'Failed to remove text').message
    } finally {
      actionPending.value = false
    }
  }

  return {
    isPendingText,
    cancelPendingText,
    formText,
    commitTextField,
    onTextContentInput,
    textEffectActive,
    toggleTextEffect,
    resetTextColor,
    addText,
    removeSelectedText,
  }
}
