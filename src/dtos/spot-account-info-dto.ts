import { SpotAccountBalanceDto } from './spot-account-balance-dto';

export class SpotAccountInfoDto {
  makerCommission: number;
  takerCommission: number;
  buyerCommission: number;
  sellerCommission: number;
  canTrade: boolean;
  canWithdraw: boolean;
  canDeposit: boolean;
  updateTime: number;
  accountType: string;
  balances: SpotAccountBalanceDto[];
  permissions: string[];
}
