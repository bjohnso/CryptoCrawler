import { Field, ObjectType } from '@nestjs/graphql';
import { Column, Entity, ObjectIdColumn, PrimaryColumn } from 'typeorm';

@ObjectType('SpotBalance')
@Entity('SpotBalance')
export class SpotBalanceDto {
  @ObjectIdColumn()
  _id: string;

  @Field()
  @PrimaryColumn()
  asset: string;

  @Field()
  @Column()
  free: string;

  @Field()
  @Column()
  locked: string;
}
