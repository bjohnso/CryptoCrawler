import { Column, Entity, ObjectIdColumn } from 'typeorm';

@Entity('SymbolInfo')
export class SymbolInfoDto {
  @ObjectIdColumn()
  _id: string;

  @Column()
  symbol: string;

  @Column()
  pair: string;

  @Column()
  contractType: string;

  @Column()
  deliveryDate: number;

  @Column()
  onboardDate: number;

  @Column()
  status: string;

  @Column()
  maintMarginPercent: string;

  @Column()
  requiredMarginPercent: string;

  @Column()
  baseAsset: string;

  @Column()
  quoteAsset: string;

  @Column()
  marginAsset: string;

  @Column()
  pricePrecision: number;

  @Column()
  quantityPrecision: number;

  @Column()
  baseAssetPrecision: number;

  @Column()
  quotePrecision: number;

  @Column()
  underlyingType: string;

  @Column()
  underlyingSubType: string[];

  @Column()
  settlePlan: number;

  @Column()
  triggerProtect: string;

  @Column()
  filters: [];

  @Column()
  OrderType: string[];

  @Column()
  timeInForce: string[];

  @Column()
  liquidationFee: string;

  @Column()
  marketTakeBound: string;
}
