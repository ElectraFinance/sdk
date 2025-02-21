export { default as cancelOrderTypes } from './cancelOrderTypes.js';
export { default as orderStatuses } from './orderStatuses.js';
export { default as subOrderStatuses } from './subOrderStatuses.js';
export { default as networkCodes } from './networkCodes.js';
export { default as setLeverageTypes } from './setLeverageTypes.js';

export * from './orderSides';
export * from './chains.js';
export * from './precisions.js';
export * from './gasLimits.js';

export const DEFAULT_EXPIRATION = 364 * 24 * 60 * 60 * 1000; // 364 days
