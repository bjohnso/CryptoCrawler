import {
  Column,
  Entity,
  ObjectIdColumn,
  OneToOne,
  PrimaryColumn,
  JoinColumn,
} from 'typeorm';
import { TradeAnalysisDto } from './trade-analysis.dto';

@Entity('SpotOrder')
export class SpotOrderDto {
  @ObjectIdColumn()
  _id: string;

  @Column()
  symbol: string;

  @Column()
  orderId: number;

  @Column()
  orderListId: number;

  @PrimaryColumn({
    type: 'string',
  })
  clientOrderId: string;

  @Column()
  stopOrderId: string;

  @Column()
  transactTime: number;

  @Column()
  price: number;

  @Column()
  origQty: number;

  @Column()
  executedQty: number;

  @Column()
  cummulativeQuoteQty: number;

  @Column()
  status: string;

  @Column()
  timeInForce: string;

  @Column()
  type: string;

  @Column()
  side: string;

  @Column()
  stopPrice: number;

  @Column()
  icebergQty: string;

  @Column()
  time: number;

  @Column()
  updateTime: number;

  @Column()
  isWorking: boolean;

  @Column()
  origQuoteOrderQty: string;

  @OneToOne(() => TradeAnalysisDto)
  @JoinColumn()
  analysis: TradeAnalysisDto;
}
