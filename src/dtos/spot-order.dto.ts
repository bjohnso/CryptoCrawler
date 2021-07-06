import { Column, Entity, ObjectIdColumn, PrimaryColumn } from 'typeorm';

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
}
