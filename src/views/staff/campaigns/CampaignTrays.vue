<script setup lang="ts">
import { h, type Component } from 'vue'
import { useCampaignEditorContext } from './campaignEditorContext'
import type { TrayId } from './useCampaignTrays'
import BarrierAffectedTray from './trays/BarrierAffectedTray.vue'
import BarrierConditionTray from './trays/BarrierConditionTray.vue'
import BarrierStyleTray from './trays/BarrierStyleTray.vue'
import BulkTray from './trays/BulkTray.vue'
import CollaboratorsTray from './trays/CollaboratorsTray.vue'
import ConnectionTray from './trays/ConnectionTray.vue'
import EndingTray from './trays/EndingTray.vue'
import IdentityTray from './trays/IdentityTray.vue'
import ImagesTray from './trays/ImagesTray.vue'
import MilestoneTray from './trays/MilestoneTray.vue'
import RequirementTray from './trays/RequirementTray.vue'
import RewardsTray from './trays/RewardsTray.vue'
import SettingsTray from './trays/SettingsTray.vue'
import ShapeTray from './trays/ShapeTray.vue'
import StatusTray from './trays/StatusTray.vue'
import TagsTray from './trays/TagsTray.vue'
import TextTray from './trays/TextTray.vue'
import UnlockTray from './trays/UnlockTray.vue'

const rewardsTray =
  (target: 'completion' | 'node' | 'barrier'): Component =>
  () =>
    h(RewardsTray, { target })

const TRAYS: Record<TrayId, Component> = {
  status: StatusTray,
  identity: IdentityTray,
  settings: SettingsTray,
  images: ImagesTray,
  completion: rewardsTray('completion'),
  collaborators: CollaboratorsTray,
  tags: TagsTray,
  requirement: RequirementTray,
  ending: EndingTray,
  milestone: MilestoneTray,
  shape: ShapeTray,
  unlock: UnlockTray,
  rewards: rewardsTray('node'),
  bulk: BulkTray,
  barrierCondition: BarrierConditionTray,
  barrierAffected: BarrierAffectedTray,
  barrierStyle: BarrierStyleTray,
  barrierRewards: rewardsTray('barrier'),
  text: TextTray,
  connection: ConnectionTray,
}

const { activeTray } = useCampaignEditorContext().trays
</script>

<template>
  <component :is="TRAYS[activeTray]" v-if="activeTray" />
</template>
