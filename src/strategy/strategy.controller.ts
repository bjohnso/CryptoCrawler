import { Controller, Get, Param, Query } from '@nestjs/common';
import { BinanceService } from '../binance/binance.service';
import { MarketsService } from '../markets/markets.service';
import { StrategyService } from './strategy.service';
import { ApiImplicitQuery } from '@nestjs/swagger/dist/decorators/api-implicit-query.decorator';

@Controller('strategy')
export class StrategyController {
  constructor(
    private binanceService: BinanceService,
    private marketService: MarketsService,
    private strategyService: StrategyService,
  ) {}

  @ApiImplicitQuery({ name: 'currentTime', required: false })
  @ApiImplicitQuery({ name: 'limit', required: false })
  @Get('HeikenCloud1H/:symbol')
  async get(
    @Param('symbol') symbol: string,
    @Query('currentTime') currentTime?: number,
    @Query('limit') limit?: number,
  ) {
    if (currentTime == null) {
      currentTime = Date.now();
    }
    if (limit == null) {
      limit = 1;
    }
    return this.strategyService
      .getHeikenCloudEntries(symbol, currentTime, limit)
      .then((result) => result);
  }
}
