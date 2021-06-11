import { Module } from '@nestjs/common';
import { MarketsController } from './markets.controller';
import { MarketsService } from './markets.service';
import { BinanceModule } from '../binance/binance.module';

@Module({
  imports: [BinanceModule],
  controllers: [MarketsController],
  providers: [MarketsService],
})
export class MarketsModule {}
