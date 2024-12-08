export { default as cancelOrderTypes } from './cancelOrderTypes.js';
export { default as orderStatuses } from './orderStatuses.js';
export { default as subOrderStatuses } from './subOrderStatuses.js';
export { default as networkCodes } from './networkCodes.js';

export * from './orderSides';
export * from './chains.js';
export * from './precisions.js';
export * from './gasLimits.js';

export const DEFAULT_EXPIRATION = 365 * 24 * 60 * 60 * 1000; // 365 days
