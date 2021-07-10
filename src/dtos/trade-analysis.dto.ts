import { Column, Entity, ObjectIdColumn, PrimaryColumn } from 'typeorm';

@Entity('TradeAnalysis')
export class TradeAnalysisDto {
  @ObjectIdColumn()
  _id: string;
  @PrimaryColumn({
    type: 'string',
  })
  clientOrderId: string;
  @Column()
  MA5: number;
  @Column()
  MA20: number;
  @Column()
  MA50: number;
  @Column()
  MA100: number;
  @Column()
  MA200: number;
  @Column()
  gradient: number;
  @Column()
  RSI: number;
  @Column()
  stopPrice: number;
  @Column()
  limitPrice: number;
  @Column()
  profit: number;
}
