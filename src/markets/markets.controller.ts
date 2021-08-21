import { Controller, Delete, Get, Param, Query } from '@nestjs/common';
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

  @Get('exchangeInfo')
  async getExchangeInfo() {
    return this.binanceService.getExchangeInfo();
  }

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
      .getKLines(symbol, interval, startTime, endTime, limit)
      .then((result) => {
        return this.marketService.insertKlines(result).then((saved) => saved);
      });
  }

  @ApiImplicitQuery({ name: 'currentTime', required: false })
  @ApiImplicitQuery({ name: 'limit', required: false })
  @Get('Ichimoku/:symbol')
  async getIchimoku(
    @Param('symbol') symbol: string,
    @Query('interval') interval: string,
    @Query('conversionLinePeriods') conversionLinePeriods: number,
    @Query('baseLinePeriods') baseLinePeriods: number,
    @Query('laggingSpanPeriods') laggingSpanPeriods: number,
    @Query('displacement') displacement: number,
    @Query('currentTime') currentTime?: number,
    @Query('limit') limit?: number,
  ) {
    if (currentTime == null) {
      currentTime = Date.now();
    }

    if (limit == null) {
      limit = laggingSpanPeriods;
    }

    return this.marketService
      .getIchimoku(
        symbol,
        conversionLinePeriods,
        baseLinePeriods,
        laggingSpanPeriods,
        displacement,
        currentTime,
        limit,
      )
      .then((result) => result);
  }

  @ApiImplicitQuery({ name: 'currentTime', required: false })
  @Get('HeikenAshi/:symbol')
  async getHeikenAshi(
    @Param('symbol') symbol: string,
    @Query('interval') interval: string,
    @Query('timePeriods') timePeriods: number,
    @Query('currentTime') currentTime?: number,
  ) {
    if (currentTime == null) {
      currentTime = Date.now();
    }

    return this.marketService
      .getHeikenAshi(symbol, timePeriods, currentTime)
      .then((result) => result);
  }

  @ApiImplicitQuery({ name: 'currentTime', required: false })
  @Get('MA/:symbol')
  async getSMA(
    @Param('symbol') symbol: string,
    @Query('interval') interval: string,
    @Query('timePeriods') timePeriods: number,
    @Query('currentTime') currentTime?: number,
  ) {
    if (currentTime == null) {
      currentTime = Date.now();
    }

    return this.marketService
      .getSMA(symbol, timePeriods, currentTime)
      .then((result) => result);
  }

  @ApiImplicitQuery({ name: 'currentTime', required: false })
  @Get('EMA/:symbol')
  async getEMA(
    @Param('symbol') symbol: string,
    @Query('interval') interval: string,
    @Query('timePeriods') timePeriods: number,
    @Query('currentTime') currentTime?: number,
  ) {
    if (currentTime == null) {
      currentTime = Date.now();
    }

    return this.marketService
      .getEMA(symbol, timePeriods, currentTime)
      .then((result) => result);
  }

  @ApiImplicitQuery({ name: 'currentTime', required: false })
  @Get('MACD/:symbol')
  async getMACD(
    @Param('symbol') symbol: string,
    @Query('interval') interval: string,
    @Query('slowTimePeriods') slowTimePeriods: number,
    @Query('fastTimePeriods') fastTimePeriods: number,
    @Query('signalTimePeriods') signalTimePeriods: number,
    @Query('currentTime') currentTime?: number,
  ) {
    if (currentTime == null) {
      currentTime = Date.now();
    }

    return this.marketService
      .getMACD(
        symbol,
        slowTimePeriods,
        fastTimePeriods,
        signalTimePeriods,
        currentTime,
      )
      .then((result) => result);
  }

  @ApiImplicitQuery({ name: 'currentTime', required: false })
  @Get('RSI/:symbol')
  async getRSI(
    @Param('symbol') symbol: string,
    @Query('timePeriods') timePeriods: number,
    @Query('currentTime') currentTime?: number,
  ) {
    if (currentTime == null) {
      currentTime = Date.now();
    }

    return this.marketService
      .getRSI(symbol, timePeriods, currentTime)
      .then((result) => result);
  }

  @Get('getOrder/:symbol')
  async getOrder(
    @Param('symbol') symbol: string,
    @Query('origClientOrderId') origClientOrderId: string,
  ) {
    return this.binanceService
      .getOrder(symbol, origClientOrderId)
      .then((result) => result);
  }

  @Delete('getOrder/:symbol')
  async cancelOrder(
    @Param('symbol') symbol: string,
    @Query('origClientOrderId') origClientOrderId: string,
  ) {
    return this.binanceService
      .cancelOrder(symbol, origClientOrderId)
      .then((result) => result);
  }

  @Get('getAllOrders/:symbol')
  async getAllOrders(@Param('symbol') symbol: string) {
    return this.binanceService.getAllOrders(symbol).then((result) => result);
  }

  @Get('getAllOpenOrders/:symbol')
  async getAllOpenOrders(@Param('symbol') symbol: string) {
    return this.binanceService
      .getAllOpenOrders(symbol)
      .then((result) => result);
  }

  @Get('getPositionInformation/:symbol')
  async getPositionInformation(@Param('symbol') symbol: string) {
    return this.binanceService
      .getPositionInformation(symbol)
      .then((result) => result);
  }

  @Get('setLeverage/:symbol')
  async setLeverage(
    @Param('symbol') symbol: string,
    @Query('leverage') leverage: number,
  ) {
    return this.binanceService
      .setLeverage(symbol, Number(leverage))
      .then((result) => result);
  }

  @Get('newBuyMarket/:symbol')
  async newBuyMarket(
    @Param('symbol') symbol: string,
    @Query('quantity') quantity: number,
  ) {
    return this.binanceService
      .newBuyMarket(symbol, Number(quantity))
      .then((result) => result);
  }

  @Get('newTakeProfitMarket/:symbol')
  async newTakeProfitMarket(
    @Param('symbol') symbol: string,
    @Query('quantity') quantity: number,
    @Query('stopPrice') stopPrice: number,
  ) {
    return this.binanceService
      .newTakeProfitMarket(symbol, Number(quantity), Number(stopPrice))
      .then((result) => result);
  }

  @Get('newStopMarket/:symbol')
  async newStopMarket(
    @Param('symbol') symbol: string,
    @Query('quantity') quantity: number,
    @Query('stopPrice') stopPrice: number,
  ) {
    return this.binanceService
      .newStopMarket(symbol, Number(quantity), Number(stopPrice))
      .then((result) => result);
  }
}
