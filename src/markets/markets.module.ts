import { Module } from '@nestjs/common';
import { MarketsController } from './markets.controller';
import { MarketsService } from './markets.service';
import { BinanceModule } from '../binance/binance.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KlineDto } from '../dtos/kline.dto';
import { SpotOrderDto } from '../dtos/spot-order.dto';

@Module({
  imports: [BinanceModule, TypeOrmModule.forFeature([KlineDto, SpotOrderDto])],
  controllers: [MarketsController],
  providers: [MarketsService],
  exports: [TypeOrmModule.forFeature([KlineDto, SpotOrderDto])],
})
export class MarketsModule {}
