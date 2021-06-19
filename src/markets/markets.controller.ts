import { Controller, Get, Param, Query } from '@nestjs/common';
import { BinanceService } from '../binance/binance.service';
import { ApiImplicitParam } from '@nestjs/swagger/dist/decorators/api-implicit-param.decorator';
import { ApiImplicitQuery } from '@nestjs/swagger/dist/decorators/api-implicit-query.decorator';
import { MarketsService } from './markets.service';

@Controller('markets')
export class MarketsController {
  constructor(
    private binanceService: BinanceService,
    private marketService: MarketsService,
  ) {}

  @ApiImplicitQuery({ name: 'limit', required: false })
  @Get('currentTickerPrice/:symbol')
  async getCurrentTickerPrice(@Param('symbol') symbol: string) {
    return this.binanceService.getPriceTicker(symbol).then((result) => result);
  }

  @ApiImplicitQuery({ name: 'limit', required: false })
  @Get('orderBookDepth/:symbol')
  async getOrderBookDepth(
    @Param('symbol') symbol: string,
    @Query('limit') limit?: number,
  ) {
    return this.binanceService.getOrderBookDepth(symbol, limit);
  }

  @ApiImplicitParam({ name: 'startTime', required: false })
  @ApiImplicitParam({ name: 'endTime', required: false })
  @ApiImplicitQuery({ name: 'limit', required: false })
  @Get('klines/:symbol')
  async getKlines(
    @Param('symbol') symbol: string,
    @Query('interval') interval: string,
    @Query('startTime') startTime?: number,
    @Query('endTime') endTime?: number,
    @Query('limit') limit?: number,
  ) {
    return this.binanceService
      .getKLines(symbol, interval, startTime, endTime)
      .then((result) => {
        this.marketService.insertKlines(result);
        return result;
      });
  }
}
