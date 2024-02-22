import { fetchWithValidation } from 'simple-typed-fetch';
import {
  errorSchema,
  linkSchema,
  aggregatedHistorySchema,
  leaderboardSchema,
  accountDetailsSchema,
  accountReferralsSchema,
} from './schemas/index.js';
import type { SupportedChainId } from '../../types.js';

export type { AccountDetails, AccountReferrals, Leaderboard } from './schemas';

type SubscribePayloadType = {
  ref_target: string
  referral: string
};

type AddressType = {
  address: string
}

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
  }

  /* getRewardsMapping = (
    referralAddress: string,
    page = 1,
    positionsPerPage = 10
  ) =>
    fetchWithValidation(
      `${this.apiUrl}/referer/view/rewards-mapping?n_per_page=${positionsPerPage}&page=${page}`,
      rewardsMappingSchema,
      {
        headers: {
          referral: referralAddress,
        },
      }
    ); */

  /* claimRewards = (payload: ClaimRewardsPayload, signature: SignatureType) =>
    fetchWithValidation(
      `${this.apiUrl}/referer/governance/claim-rewards`,
      rewardsClaimedSchema,
      {
        headers: {
          'Content-type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({ payload, signature }),
      }
    ); */

  subscribeToReferral = (
    payload: SubscribePayloadType
  ) =>
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
      errorSchema
    );

  /* getContractsAddresses = () =>
    fetchWithValidation(
      `${this.apiUrl}/referer/view/contracts`,
      contractsAddressesSchema,
      undefined,
      errorSchema
    ); */

  /* getClaimInfo = (refererAddress: string) =>
    fetchWithValidation(
      `${this.apiUrl}/referer/view/claim-info-with-stats?&suppress_error=1`,
      claimInfoSchema,
      {
        headers: {
          'referer-address': refererAddress,
        },
      },
      errorSchema
    ); */

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
      suppress_error: 1
    };

    if (chainId !== undefined) {
      queryParams['chain_id'] = chainId;
    }

    if (types !== undefined) {
      queryParams['history_filter'] = encodeURIComponent(types.join(','));
    }

    const queryString = Object.entries(queryParams).map(([k, v]) => `${k}=${v}`).join('&')

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
  }

  getLeaderboard = ({
    page = 1
  }: { page: number }) => {
    return fetchWithValidation(
      `${this.apiUrl}/referer/futures/leaderboard?page=${page}`,
      leaderboardSchema
    );
  }

  getAccountDetails = ({ address }: AddressType) => {
    return fetchWithValidation(
      `${this.apiUrl}/referer/futures/account-details?address=${address}`,
      accountDetailsSchema,
    );
  }

  getAccountReferrals = ({ address, page = 1 }: AddressType & { page: number }) => {
    return fetchWithValidation(
      `${this.apiUrl}/referer/futures/account-referrals?address=${address}&page=${page}`,
      accountReferralsSchema,
    );
  }
}

export * as schemas from './schemas/index.js';
export { ReferralSystem };
