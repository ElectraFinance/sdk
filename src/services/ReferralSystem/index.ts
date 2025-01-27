import { fetchWithValidation } from 'simple-typed-fetch';
import {
  errorSchema,
  linkSchema,
  aggregatedCommissionHistorySchema,
  aggregatedHistorySchema,
  leaderboardSchema,
  accountDetailsSchema,
  accountReferralsSchema,
  subscribeToReferralErrorSchema,
  isWhitelistedSchema,
} from './schemas/index.js';
import type { SupportedChainId } from '../../types.js';
import { claimRewardsSchema } from './schemas/claimRewardsSchema.js';

export type { AccountDetails, AccountReferrals, Leaderboard } from './schemas';

type SubscribePayloadType = {
  ref_target?: string;
  referral: string;
  tg_user_id?: number;
  tg_init_data?: Record<string, any>;
};

type AddressType = {
  address: string;
};

class ReferralSystem {
  private readonly apiUrl: string;

  get api() {
    return this.apiUrl;
  }

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;

    this.subscribeToReferral = this.subscribeToReferral.bind(this);
    this.getAggregatedHistory = this.getAggregatedHistory.bind(this);
    this.getLeaderboard = this.getLeaderboard.bind(this);
    this.getAccountDetails = this.getAccountDetails.bind(this);
    this.getAccountReferrals = this.getAccountReferrals.bind(this);
    this.getIsWhitelisted = this.getIsWhitelisted.bind(this);
    this.getClaimRewards = this.getClaimRewards.bind(this);
  }

  getClaimRewards = (address: string) =>
    fetchWithValidation(
      `${this.apiUrl}/v3/claim-rewards`,
      claimRewardsSchema,
      {
        headers: {
          'Content-type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({ payload: { reward_recipient: address } }),
      },
      errorSchema
    );

  subscribeToReferral = (payload: SubscribePayloadType) =>
    fetchWithValidation(
      `${this.apiUrl}/referer/subscribe2`,
      linkSchema,
      {
        headers: {
          'Content-type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify(payload),
      },
      subscribeToReferralErrorSchema
    );

  getAggregatedCommissionHistory = (
    refererAddress: string,
    chainId: SupportedChainId | undefined,
    types: string[] | undefined,
    itemPerPage: number,
    page: number
  ) => {
    const queryParams: Record<string, string | number> = {
      n_per_page: itemPerPage,
      address: refererAddress,
      page,
      suppress_error: 1,
    };

    if (chainId !== undefined) {
      queryParams['chain_id'] = chainId;
    }

    if (types !== undefined) {
      queryParams['history_filter'] = encodeURIComponent(types.join(','));
    }

    const queryString = Object.entries(queryParams)
      .map(([k, v]) => `${k}=${v}`)
      .join('&');

    return fetchWithValidation(
      `${this.apiUrl}/v3/accruals?${queryString}`,
      aggregatedCommissionHistorySchema,
      {
        headers: {
          'referer-address': refererAddress,
        },
      },
      errorSchema
    );
  };

  getAggregatedHistory = (
    refererAddress: string,
    chainId: SupportedChainId | undefined,
    types: string[] | undefined,
    itemPerPage: number,
    page: number
  ) => {
    const queryParams: Record<string, string | number> = {
      n_per_page: itemPerPage,
      page,
      suppress_error: 1,
    };

    if (chainId !== undefined) {
      queryParams['chain_id'] = chainId;
    }

    if (types !== undefined) {
      queryParams['history_filter'] = encodeURIComponent(types.join(','));
    }

    const queryString = Object.entries(queryParams)
      .map(([k, v]) => `${k}=${v}`)
      .join('&');

    return fetchWithValidation(
      `${this.apiUrl}/referer/view/aggregated-history?${queryString}`,
      aggregatedHistorySchema,
      {
        headers: {
          'referer-address': refererAddress,
        },
      },
      errorSchema
    );
  };

  getLeaderboard = ({ page = 1 }: { page: number }) => {
    return fetchWithValidation(
      `${this.apiUrl}/referer/futures/leaderboard?page=${page}`,
      leaderboardSchema
    );
  };

  getAccountDetails = ({ address }: AddressType) => {
    return fetchWithValidation(
      `${this.apiUrl}/referer/futures/account-details?address=${address}`,
      accountDetailsSchema
    );
  };

  getAccountReferrals = ({
    address,
    page = 1,
  }: AddressType & { page: number }) => {
    return fetchWithValidation(
      `${this.apiUrl}/referer/futures/account-referrals?address=${address}&page=${page}`,
      accountReferralsSchema
    );
  };

  getIsWhitelisted = ({ address }: AddressType) => {
    return fetchWithValidation(
      `${this.apiUrl}/referer/futures/is_whitelisted?address=${address}`,
      isWhitelistedSchema
    );
  };
}

export * as schemas from './schemas/index.js';
export { ReferralSystem };
