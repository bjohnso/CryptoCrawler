import { HttpModule, Module } from '@nestjs/common';
import { BinanceService } from './binance.service';

@Module({
  imports: [HttpModule],
  providers: [BinanceService],
  exports: [BinanceService],
})
export class BinanceModule {}
