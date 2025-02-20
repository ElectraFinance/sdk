import type { BonusProgram } from './BonusProgram.js';

export type BonusItem = {
  id: string
  value: number
  program: BonusProgram
  startTimestamp: number
  endTimestamp: number
  tradingVolume: number
  requiredTradingVolume: number
  readyToClaim: boolean
  claimed: boolean
}
