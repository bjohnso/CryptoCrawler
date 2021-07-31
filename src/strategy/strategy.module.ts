import { Module } from '@nestjs/common';
import { BinanceModule } from '../binance/binance.module';
import { StrategyService } from './strategy.service';
import { MarketsModule } from '../markets/markets.module';
import { StrategyController } from './strategy.controller';

@Module({
  imports: [BinanceModule, MarketsModule],
  controllers: [StrategyController],
  providers: [StrategyService],
  exports: [StrategyService],
})
export class StrategyModule {}
