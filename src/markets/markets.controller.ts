import { Controller, Get, Param, Query } from '@nestjs/common';
import { MarketsService } from './markets.service';
import { BinanceService } from '../binance/binance.service';

@Controller('markets')
export class MarketsController {
  constructor(
    private binanceService: BinanceService,
    private marketsService: MarketsService,
  ) {}

  @Get('currentTickerPrice/:symbol')
  async getCurrentTickerPrice(@Param('symbol') symbol) {
    return this.binanceService.getPriceTicker(symbol).then((result) => result);
  }

  @Get('orderBookDepth/:symbol')
  async getOrderBookDepth(@Param('symbol') symbol, @Query('limit') limit) {
    return this.binanceService.getOrderBookDepth(symbol, limit);
  }
}
