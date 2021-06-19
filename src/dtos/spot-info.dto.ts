import { SpotBalanceDto } from './spot-balance.dto';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SpotInfoDto {
  @Field()
  makerCommission: number;

  @Field()
  takerCommission: number;

  @Field()
  buyerCommission: number;

  @Field()
  sellerCommission: number;

  @Field()
  canTrade: boolean;

  @Field()
  canWithdraw: boolean;

  @Field()
  canDeposit: boolean;

  @Field()
  updateTime: number;

  @Field()
  accountType: string;

  @Field()
  balances: SpotBalanceDto[];

  @Field()
  permissions: string[];
}
