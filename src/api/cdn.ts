import type { CampaignResponse } from '@/types/api/campaigns'
import type { UserResponse } from '@/types/api/users'
import { del, get, postMultipart } from './client'

export interface CdnLimits {
  maxUploadBytes: number
  maxDimension: number
  allowedMimeTypes: string[]
}

let limitsCache: Promise<CdnLimits> | null = null

export function getCdnLimits(): Promise<CdnLimits> {
  if (!limitsCache) {
    limitsCache = get<CdnLimits>('/cdn/limits').catch((err) => {
      limitsCache = null
      throw err
    })
  }
  return limitsCache
}

function multipartFile(file: File): FormData {
  const form = new FormData()
  form.append('file', file)
  return form
}

export function uploadCampaignBackground(
  campaignId: string,
  file: File,
  admin = false,
): Promise<CampaignResponse> {
  const base = admin ? '/admin/campaigns' : '/campaigns'
  return postMultipart<CampaignResponse>(
    `${base}/${campaignId}/background`,
    multipartFile(file),
  )
}

export function deleteCampaignBackground(
  campaignId: string,
  admin = false,
): Promise<CampaignResponse> {
  const base = admin ? '/admin/campaigns' : '/campaigns'
  return del<CampaignResponse>(`${base}/${campaignId}/background`)
}

export function uploadCampaignIcon(
  campaignId: string,
  file: File,
  admin = false,
): Promise<CampaignResponse> {
  const base = admin ? '/admin/campaigns' : '/campaigns'
  return postMultipart<CampaignResponse>(
    `${base}/${campaignId}/icon`,
    multipartFile(file),
  )
}

export function deleteCampaignIcon(
  campaignId: string,
  admin = false,
): Promise<CampaignResponse> {
  const base = admin ? '/admin/campaigns' : '/campaigns'
  return del<CampaignResponse>(`${base}/${campaignId}/icon`)
}

export function uploadMyAvatar(file: File): Promise<UserResponse> {
  return postMultipart<UserResponse>('/users/me/avatar', multipartFile(file))
}
