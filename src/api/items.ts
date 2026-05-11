import type {
  EquipItemRequest,
  EquippedItemsResponse,
  InventoryListParams,
  ItemListParams,
  ItemModifierResponse,
  ItemResponse,
  ItemTypeResponse,
  UserItemListParams,
  UserItemResponse,
} from '@/types/api/items'
import type { Page } from '@/types/pagination'
import { del, get, post } from './client'
import { buildQuery } from './utils'

export function getItemTypes(): Promise<ItemTypeResponse[]> {
  return get<ItemTypeResponse[]>('/item-types')
}

export function getItemModifiers(): Promise<ItemModifierResponse[]> {
  return get<ItemModifierResponse[]>('/item-modifiers')
}

export function getItems(params?: ItemListParams): Promise<ItemResponse[]> {
  return get<ItemResponse[]>(`/items${buildQuery(params)}`)
}

export function getItem(id: string): Promise<ItemResponse> {
  return get<ItemResponse>(`/items/${id}`)
}

export function getUserItems(
  userId: string,
  params?: UserItemListParams,
): Promise<UserItemResponse[]> {
  return get<UserItemResponse[]>(`/users/${userId}/items${buildQuery(params)}`)
}

export function getUserEquippedItems(userId: string): Promise<EquippedItemsResponse> {
  return get<EquippedItemsResponse>(`/users/${userId}/items/equipped`)
}

export function getUserInventory(
  userId: string,
  params?: InventoryListParams,
): Promise<Page<UserItemResponse>> {
  return get<Page<UserItemResponse>>(`/users/${userId}/inventory${buildQuery(params)}`)
}

export function equipItem(req: EquipItemRequest): Promise<void> {
  return post<void>('/users/me/items/equip', req)
}

export function unequipItem(typeKey: string): Promise<void> {
  return del<void>(`/users/me/items/equip/${typeKey}`)
}
