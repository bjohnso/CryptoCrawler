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
  @Get('HeikenCloudBullish/:symbol')
  async getHeikenCloudBullish(
    @Param('symbol') symbol: string,
    @Query('interval') interval: string,
    @Query('currentTime') currentTime?: number,
    @Query('limit') limit?: number,
  ) {
    if (currentTime == null) {
      currentTime = Date.now();
    }
    if (limit == null) {
      limit = 2;
    }
    return this.strategyService
      .getHeikenCloudEntries(
        symbol,
        interval,
        currentTime,
        limit,
        this.strategyService.STRATEGY_BULLISH_ENTRY,
      )
      .then((result) => result);
  }

  @ApiImplicitQuery({ name: 'currentTime', required: false })
  @ApiImplicitQuery({ name: 'limit', required: false })
  @Get('HeikenCloudBearish/:symbol')
  async getHeikenCloudBearish(
    @Param('symbol') symbol: string,
    @Query('interval') interval: string,
    @Query('currentTime') currentTime?: number,
    @Query('limit') limit?: number,
  ) {
    if (currentTime == null) {
      currentTime = Date.now();
    }
    if (limit == null) {
      limit = 2;
    }
    return this.strategyService
      .getHeikenCloudEntries(
        symbol,
        interval,
        currentTime,
        limit,
        this.strategyService.STRATEGY_BEARISH_ENTRY,
      )
      .then((result) => result);
  }

  @ApiImplicitQuery({ name: 'currentTime', required: false })
  @ApiImplicitQuery({ name: 'limit', required: false })
  @Get('scoutAssetsBullish/:quoteCurrency')
  async scoutAssets(
    @Param('quoteCurrency') quoteCurrency: string,
    @Query('interval') interval: string,
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
      .scoutAssets(
        quoteCurrency,
        interval,
        currentTime,
        limit,
        this.strategyService.STRATEGY_PREDICT_BULLISH_ENTRY,
      )
      .then((result) => result);
  }
}
