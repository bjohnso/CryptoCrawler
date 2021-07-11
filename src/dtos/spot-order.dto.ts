import { Column, Entity, ObjectIdColumn, PrimaryColumn } from 'typeorm';
import { TradeAnalysisDto } from './trade-analysis.dto';
import { OrderFillDto } from './order-fill.dto';
import { OrderAckDto } from './order-ack.dto';

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
  price: string;

  @Column()
  origQty: string;

  @Column()
  executedQty: string;

  @Column()
  cummulativeQuoteQty: string;

  @Column()
  status: string;

  @Column()
  timeInForce: string;

  @Column()
  type: string;

  @Column()
  side: string;

  @Column()
  stopPrice: string;

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

  @Column()
  analysis: TradeAnalysisDto;

  @Column()
  fills: OrderFillDto[];

  @Column()
  stops: OrderAckDto[];
}
