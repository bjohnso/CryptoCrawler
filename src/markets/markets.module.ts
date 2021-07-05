import { Module } from '@nestjs/common';
import { MarketsController } from './markets.controller';
import { MarketsService } from './markets.service';
import { BinanceModule } from '../binance/binance.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KlineDto } from '../dtos/kline.dto';

@Module({
  imports: [BinanceModule, TypeOrmModule.forFeature([KlineDto])],
  controllers: [MarketsController],
  providers: [MarketsService],
  exports: [TypeOrmModule.forFeature([KlineDto])],
})
export class MarketsModule {}
