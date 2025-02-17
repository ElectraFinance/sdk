import type {
  ClaimBonusResponse,
  DepositConditionResponse,
  GetBonusesByAddressResponse,
  ClaimBonusRequest,
} from './types';

export class BonusSystem {
  constructor(private readonly apiUrl: string) {}

  async getBonusesByAddress(address: string): Promise<GetBonusesByAddressResponse> {
    const response = await fetch(
      `${this.apiUrl}/api/v1/bonus/${address}`,
      {
        headers: {
          'Content-type': 'application/json',
        },
        method: 'GET',
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: GetBonusesByAddressResponse = await response.json();
    return data;
  }

  async claimBonus(request: ClaimBonusRequest): Promise<ClaimBonusResponse> {
    const response = await fetch(
      `${this.apiUrl}/api/v1/bonus/claim`,
      {
        headers: {
          'Content-type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify(request),
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: ClaimBonusResponse = await response.json();
    return data;
  }

  async getDepositConditions(amount: string): Promise<DepositConditionResponse> {
    const response = await fetch(
      `${this.apiUrl}/api/v1/bonuses/conditions/deposit?amount=${amount}`,
      {
        headers: {
          'Content-type': 'application/json',
        },
        method: 'GET',
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: DepositConditionResponse = await response.json();
    return data;
  }
}

export * as types from './types/index.js';
