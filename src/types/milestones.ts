import type { MilestoneSetResponse, SetGroupResponse } from './api/milestones'

export interface ResolvedSetGroup {
  group: SetGroupResponse
  sets: MilestoneSetResponse[]
}
