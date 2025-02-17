import type { BonusItem } from './BonusItem.js';

export type GetBonusesByAddressResponse = {
  address: string
  bonuses: BonusItem[]
  hasNextPage: boolean
}
