import type { ChatMessageResponse, SendChatMessageRequest } from '@/types/api/chat'
import type {
  ClanAllianceResponse,
  ClanAuditEntryResponse,
  ClanItemResponse,
  ClanJoinRequestResponse,
  ClanLevelResponse,
  ClanLevelStepResponse,
  ClanListParams,
  ClanMissionListParams,
  ClanResponse,
  ClanRivalListParams,
  ClanRivalResponse,
  ClanSeasonResponse,
  ClanStandingEventParams,
  ClanStandingEventResponse,
  ClanStandingParams,
  ClanStandingResponse,
  ClanWarDetailResponse,
  ClanWarHitResponse,
  ClanWarListParams,
  ClanWarLoanListParams,
  ClanWarLoanResponse,
  ClanWarParticipantResponse,
  ClanWarResponse,
  ClanXpGrantResponse,
  CreateClanAllianceRequest,
  CreateClanJoinRequest,
  CreateClanRequest,
  CreateClanRivalRequest,
  DeclareClanWarRequest,
  EquipClanItemRequest,
  OfferClanWarLoanRequest,
  ResolveClanAllianceRequest,
  ResolveClanJoinRequest,
  ResolveClanWarLoanRequest,
  SubmitClanWarPicksRequest,
  TransferClanFounderRequest,
  UpdateClanMemberRequest,
  UpdateClanRequest,
  UpdateClanWarRequest,
} from '@/types/api/clans'
import type { PlayerRef } from '@/types/api/common'
import type { ItemResponse } from '@/types/api/items'
import type { MissionContributorResponse, MissionResponse } from '@/types/api/missions'
import type { Page, PaginationParams } from '@/types/pagination'
import { del, get, getFile, patch, post, put, type DownloadedFile } from './client'
import { buildQuery } from './utils'

export function getClans(params?: ClanListParams): Promise<Page<ClanResponse>> {
  return get<Page<ClanResponse>>(`/clans${buildQuery(params)}`)
}

export function createClan(req: CreateClanRequest): Promise<ClanResponse> {
  return post<ClanResponse>('/clans', req)
}

export function getClan(slugOrId: string): Promise<ClanResponse> {
  return get<ClanResponse>(`/clans/${encodeURIComponent(slugOrId)}`)
}

export function updateClan(clanId: string, req: UpdateClanRequest): Promise<ClanResponse> {
  return patch<ClanResponse>(`/clans/${clanId}`, req)
}

export function disbandClan(clanId: string): Promise<void> {
  return del<void>(`/clans/${clanId}`)
}

export function getClanAudit(
  clanId: string,
  params?: PaginationParams,
): Promise<Page<ClanAuditEntryResponse>> {
  return get<Page<ClanAuditEntryResponse>>(`/clans/${clanId}/audit${buildQuery(params)}`)
}

export function getClanMembers(
  clanId: string,
  params?: PaginationParams,
): Promise<Page<PlayerRef>> {
  return get<Page<PlayerRef>>(`/clans/${clanId}/members${buildQuery(params)}`)
}

export function updateClanMember(
  clanId: string,
  userId: string,
  req: UpdateClanMemberRequest,
): Promise<PlayerRef> {
  return patch<PlayerRef>(`/clans/${clanId}/members/${userId}`, req)
}

export function removeClanMember(clanId: string, userId: string): Promise<void> {
  return del<void>(`/clans/${clanId}/members/${userId}`)
}

export function transferClanFounder(
  clanId: string,
  req: TransferClanFounderRequest,
): Promise<PlayerRef> {
  return patch<PlayerRef>(`/clans/${clanId}/founder`, req)
}

export function createClanJoinRequest(
  clanId: string,
  req: CreateClanJoinRequest,
): Promise<ClanJoinRequestResponse> {
  return post<ClanJoinRequestResponse>(`/clans/${clanId}/join-requests`, req)
}

export function getClanJoinRequests(
  clanId: string,
  params?: PaginationParams,
): Promise<Page<ClanJoinRequestResponse>> {
  return get<Page<ClanJoinRequestResponse>>(`/clans/${clanId}/join-requests${buildQuery(params)}`)
}

export function getMyClanJoinRequests(
  params?: PaginationParams,
): Promise<Page<ClanJoinRequestResponse>> {
  return get<Page<ClanJoinRequestResponse>>(`/clans/join-requests${buildQuery(params)}`)
}

export function resolveClanJoinRequest(
  requestId: string,
  req: ResolveClanJoinRequest,
): Promise<ClanJoinRequestResponse> {
  return patch<ClanJoinRequestResponse>(`/clans/join-requests/${requestId}`, req)
}

export function getClanLevels(): Promise<ClanLevelStepResponse[]> {
  return get<ClanLevelStepResponse[]>('/clans/levels')
}

export function getClanLevel(clanId: string): Promise<ClanLevelResponse> {
  return get<ClanLevelResponse>(`/clans/${clanId}/level`)
}

export function getClanXp(
  clanId: string,
  params?: PaginationParams,
): Promise<Page<ClanXpGrantResponse>> {
  return get<Page<ClanXpGrantResponse>>(`/clans/${clanId}/xp${buildQuery(params)}`)
}

export function getClanItems(
  clanId: string,
  params?: PaginationParams,
): Promise<Page<ClanItemResponse>> {
  return get<Page<ClanItemResponse>>(`/clans/${clanId}/items${buildQuery(params)}`)
}

export function equipClanItem(clanId: string, req: EquipClanItemRequest): Promise<ItemResponse[]> {
  return put<ItemResponse[]>(`/clans/${clanId}/equipped`, req)
}

export function unequipClanItem(clanId: string, itemTypeKey: string): Promise<void> {
  return del<void>(`/clans/${clanId}/equipped/${encodeURIComponent(itemTypeKey)}`)
}

export function getClanSeasons(params?: PaginationParams): Promise<Page<ClanSeasonResponse>> {
  return get<Page<ClanSeasonResponse>>(`/clans/seasons${buildQuery(params)}`)
}

export function getClanSeason(slugOrId: string): Promise<ClanSeasonResponse> {
  return get<ClanSeasonResponse>(`/clans/seasons/${encodeURIComponent(slugOrId)}`)
}

export function getClanSeasonStandings(
  slugOrId: string,
  params?: PaginationParams,
): Promise<Page<ClanStandingResponse>> {
  return get<Page<ClanStandingResponse>>(
    `/clans/seasons/${encodeURIComponent(slugOrId)}/standings${buildQuery(params)}`,
  )
}

export function getClanStanding(
  clanId: string,
  params?: ClanStandingParams,
): Promise<ClanStandingResponse> {
  return get<ClanStandingResponse>(`/clans/${clanId}/standing${buildQuery(params)}`)
}

export function getClanStandingEvents(
  clanId: string,
  params?: ClanStandingEventParams,
): Promise<Page<ClanStandingEventResponse>> {
  return get<Page<ClanStandingEventResponse>>(
    `/clans/${clanId}/standing/events${buildQuery(params)}`,
  )
}

export function getClanChat(
  clanId: string,
  params?: PaginationParams,
): Promise<Page<ChatMessageResponse>> {
  return get<Page<ChatMessageResponse>>(`/clans/${clanId}/chat${buildQuery(params)}`)
}

export function sendClanChatMessage(
  clanId: string,
  req: SendChatMessageRequest,
): Promise<ChatMessageResponse> {
  return post<ChatMessageResponse>(`/clans/${clanId}/chat`, req)
}

export function getClanRivals(
  clanId: string,
  params?: ClanRivalListParams,
): Promise<Page<ClanRivalResponse>> {
  return get<Page<ClanRivalResponse>>(`/clans/${clanId}/rivals${buildQuery(params)}`)
}

export function declareClanRival(
  clanId: string,
  req: CreateClanRivalRequest,
): Promise<ClanRivalResponse> {
  return post<ClanRivalResponse>(`/clans/${clanId}/rivals`, req)
}

export function dropClanRival(clanId: string, rivalClanId: string): Promise<void> {
  return del<void>(`/clans/${clanId}/rivals/${rivalClanId}`)
}

export function getClanMissions(
  clanId: string,
  params?: ClanMissionListParams,
): Promise<Page<MissionResponse>> {
  return get<Page<MissionResponse>>(`/clans/${clanId}/missions${buildQuery(params)}`)
}

export function getClanMissionContributors(
  clanId: string,
  missionId: string,
  params?: PaginationParams,
): Promise<Page<MissionContributorResponse>> {
  return get<Page<MissionContributorResponse>>(
    `/clans/${clanId}/missions/${missionId}/contributors${buildQuery(params)}`,
  )
}

export function getClanAlliances(
  clanId: string,
  params?: PaginationParams,
): Promise<Page<ClanAllianceResponse>> {
  return get<Page<ClanAllianceResponse>>(`/clans/${clanId}/alliances${buildQuery(params)}`)
}

export function getClanAllianceProposals(
  clanId: string,
  params?: PaginationParams,
): Promise<Page<ClanAllianceResponse>> {
  return get<Page<ClanAllianceResponse>>(
    `/clans/${clanId}/alliances/proposals${buildQuery(params)}`,
  )
}

export function proposeClanAlliance(
  clanId: string,
  req: CreateClanAllianceRequest,
): Promise<ClanAllianceResponse> {
  return post<ClanAllianceResponse>(`/clans/${clanId}/alliances`, req)
}

export function resolveClanAlliance(
  allianceId: string,
  req: ResolveClanAllianceRequest,
): Promise<ClanAllianceResponse> {
  return patch<ClanAllianceResponse>(`/clans/alliances/${allianceId}`, req)
}

export function getClanWars(params?: ClanWarListParams): Promise<Page<ClanWarResponse>> {
  return get<Page<ClanWarResponse>>(`/clans/wars${buildQuery(params)}`)
}

export function declareClanWar(
  clanId: string,
  req: DeclareClanWarRequest,
): Promise<ClanWarDetailResponse> {
  return post<ClanWarDetailResponse>(`/clans/${clanId}/wars`, req)
}

export function getClanWar(warId: string): Promise<ClanWarDetailResponse> {
  return get<ClanWarDetailResponse>(`/clans/wars/${warId}`)
}

export function submitClanWarPicks(
  warId: string,
  req: SubmitClanWarPicksRequest,
): Promise<ClanWarDetailResponse> {
  return put<ClanWarDetailResponse>(`/clans/wars/${warId}/picks`, req)
}

export function updateClanWar(warId: string, req: UpdateClanWarRequest): Promise<ClanWarResponse> {
  return patch<ClanWarResponse>(`/clans/wars/${warId}`, req)
}

export function getClanWarParticipants(
  warId: string,
  params?: PaginationParams,
): Promise<Page<ClanWarParticipantResponse>> {
  return get<Page<ClanWarParticipantResponse>>(
    `/clans/wars/${warId}/participants${buildQuery(params)}`,
  )
}

export function getClanWarHits(
  warId: string,
  params?: PaginationParams & { userId?: string },
): Promise<Page<ClanWarHitResponse>> {
  return get<Page<ClanWarHitResponse>>(`/clans/wars/${warId}/hits${buildQuery(params)}`)
}

export function offerClanWarLoan(
  warId: string,
  req: OfferClanWarLoanRequest,
): Promise<ClanWarLoanResponse> {
  return post<ClanWarLoanResponse>(`/clans/wars/${warId}/loans`, req)
}

export function resolveClanWarLoan(
  loanId: string,
  req: ResolveClanWarLoanRequest,
): Promise<ClanWarLoanResponse> {
  return patch<ClanWarLoanResponse>(`/clans/wars/loans/${loanId}`, req)
}

export function getClanWarLoans(
  warId: string,
  params?: ClanWarLoanListParams,
): Promise<Page<ClanWarLoanResponse>> {
  return get<Page<ClanWarLoanResponse>>(`/clans/wars/${warId}/loans${buildQuery(params)}`)
}

export function getMyClanWarLoans(params?: ClanWarLoanListParams): Promise<Page<ClanWarLoanResponse>> {
  return get<Page<ClanWarLoanResponse>>(`/clans/wars/loans${buildQuery(params)}`)
}

export function downloadClanWarPlaylist(warId: string): Promise<DownloadedFile> {
  return getFile(`/playlists/clan-war/${warId}`)
}
