export const positionSides = [
  'LONG',
  'SHORT'
] as const

const positionStatuses = [
  ...positionSides,
  'CLOSING',
  'LIQUIDATION',
  'ZERO',
] as const;

export default positionStatuses;
