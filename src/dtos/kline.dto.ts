import { Column, Entity, ObjectIdColumn, PrimaryColumn } from 'typeorm';

@Entity('Kline')
export class KlineDto {
  constructor(symbol: string, interval: string, kline: Array<any>) {
    if (kline != null) {
      this.openTime = kline[0];
      this.symbol = symbol;
      this.interval = interval;
      this.open = kline[1];
      this.high = kline[2];
      this.low = kline[3];
      this.close = kline[4];
      this.vol = kline[5];
      this.closeTime = kline[6];
      this.quoteAssetVol = kline[7];
      this.numberOfTrades = kline[8];
      this.takerBuyBaseAssetVol = kline[9];
      this.takerBuyQuoteAssetVol = kline[10];
      this.ignore = kline[11];
      this.klineId = `${this.symbol}_${this.openTime}_${interval}`;
    }
  }

  @ObjectIdColumn()
  _id: string;

  @PrimaryColumn({
    type: 'string',
  })
  klineId: string;

  @Column()
  openTime: number;

  @Column()
  symbol: string;

  @Column()
  interval: string;

  @Column()
  open: string;

  @Column()
  high: string;

  @Column()
  low: string;

  @Column()
  close: string;

  @Column()
  vol: string;

  @Column()
  closeTime: number;

  @Column()
  quoteAssetVol: string;

  @Column()
  numberOfTrades: number;

  @Column()
  takerBuyBaseAssetVol: string;

  @Column()
  takerBuyQuoteAssetVol: string;

  @Column()
  ignore: string;
}
