import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BinanceService } from './binance/binance.service';
import { MarketsService } from './markets/markets.service';
import { TradeAnalysisDto } from './dtos/trade-analysis.dto';
import { SpotOrderDto } from './dtos/spot-order.dto';

@Injectable()
export class AppService {
  constructor(
    private binanceService: BinanceService,
    private marketService: MarketsService,
  ) {}
  private readonly logger = new Logger(AppService.name);
  private pairs = [
    // 'BTCUSDT',
    'BNBUSDT',
    // 'ETHUSDT',
    // 'ADAUSDT',
    // 'XRPUSDT',
    // 'DOTUSDT',
  ];

  // Every minute on the 45th second
  @Cron(CronExpression.EVERY_30_SECONDS, {
    name: 'fetchData',
  })
  private async pollKlineData() {
    for (const pair of this.pairs) {
      const klines = await this.binanceService.getKLines(
        pair,
        '1m',
        null,
        null,
        250,
      );

      await this.marketService.insertKlines(klines);

      const openOrders = await this.binanceService.getAllOpenOrders(pair);
      const openOrderCount = this.countOpenOrders(pair, openOrders);
      await this.analyseCurrentOrders(pair, openOrders);

      if (openOrderCount < 1) {
        await this.trade(pair);
      }
    }
  }

  async analyseCurrentOrders(pair: string, openOrders: SpotOrderDto[]) {
    for (const order of openOrders) {
      if (order.type == 'STOP_LOSS_LIMIT' && order.side == 'SELL') {
        const entryOrder = await this.marketService.getEntryOrder(
          order.clientOrderId,
        );

        if (entryOrder) {
          const entryPrice = this.calculateEntryPrice(entryOrder);
          const assetQuantity = Number(entryOrder.executedQty);
          const cumulativeQuote = Number(entryOrder.cummulativeQuoteQty);

          const trailStop = await this.trailStop(
            entryOrder.symbol,
            entryPrice,
            Number(order.stopPrice),
            Number(order.price),
          );

          if (trailStop) {
            const stopPrice = trailStop[0];
            const limitPrice = trailStop[1];
            const cancel = await this.binanceService.cancelOrder(
              pair,
              order.clientOrderId,
            );

            if (cancel.clientOrderId) {
              this.logger.debug(`STOP CANCELLED ${cancel.clientOrderId}`);

              const exitOrder =
                await this.binanceService.spotMarketStopLimitOrder(
                  pair,
                  assetQuantity,
                  stopPrice,
                  limitPrice,
                );

              if (exitOrder.clientOrderId) {
                this.logger.debug(`NEW STOP ${exitOrder.clientOrderId}`);

                exitOrder.stopPrice = stopPrice;
                exitOrder.price = limitPrice;

                if (entryOrder.stops == null) {
                  entryOrder.stops = [];
                }

                entryOrder.stops.push(exitOrder);
                entryOrder.stopOrderId = exitOrder.clientOrderId;
                entryOrder.analysis.profit = this.calculateProfit(
                  cumulativeQuote,
                  entryPrice,
                  limitPrice,
                );
                await this.marketService.insertSpotOrder(entryOrder);
              } else {
                this.logger.error(
                  `STOP LIMIT FAILED! ${entryOrder.clientOrderId}`,
                );
                console.log(exitOrder);
              }
            } else {
              this.logger.error(`CANCEL FAILED! ${entryOrder.clientOrderId}`);
              console.log(cancel);
            }
          }
        }
      }
    }
  }

  async trade(pair: string) {
    const RSI = await this.marketService.calculateRSI(pair, 14, Date.now());
    const currentRSI = RSI.slice(-1)[0];
    const analysis = await this.analyseEntry(pair, currentRSI);

    if (analysis == null) {
      return;
    }

    const quoteOrderQty = 100;

    const entryOrder = await this.binanceService.spotMarketOrder(
      pair,
      quoteOrderQty,
    );

    if (entryOrder.clientOrderId) {
      this.logger.debug('NEW ENTRY');

      const assetQuantity = Number(entryOrder.executedQty);
      const cumulativeQuote = Number(entryOrder.cummulativeQuoteQty);
      const entryPrice = this.calculateEntryPrice(entryOrder);

      const stop = await this.calculateStop(pair, entryPrice);

      const stopPrice = stop[0];
      const limitPrice = stop[1];

      const profit = this.calculateProfit(
        cumulativeQuote,
        entryPrice,
        limitPrice,
      );

      const exitOrder = await this.binanceService.spotMarketStopLimitOrder(
        pair,
        assetQuantity,
        stopPrice,
        limitPrice,
      );

      if (exitOrder.clientOrderId) {
        this.logger.debug(`NEW STOP ${exitOrder.clientOrderId}`);

        exitOrder.price = limitPrice;
        exitOrder.stopPrice = stopPrice;

        if (entryOrder.stops == null) {
          entryOrder.stops = [];
        }

        entryOrder.stops.push(exitOrder);
        entryOrder.stopOrderId = exitOrder.clientOrderId;
        analysis.stopPrice = stopPrice;
        analysis.limitPrice = limitPrice;
        analysis.profit = profit;
      } else {
        this.logger.error(`STOP LIMIT FAILED! ${entryOrder.clientOrderId}`);
        console.log(exitOrder);
      }

      entryOrder.analysis = analysis;
      await this.marketService.insertSpotOrder(entryOrder);
    }
  }

  private async analyseEntry(
    pair: string,
    RSI: number,
  ): Promise<TradeAnalysisDto> {
    const gradient = await this.marketService.calculateMAGradient(
      pair,
      1,
      5,
      Date.now(),
    );

    const MA5s = await this.marketService.calculateMA(pair, 5, Date.now());
    const MA20s = await this.marketService.calculateMA(pair, 20, Date.now());
    const MA50s = await this.marketService.calculateMA(pair, 50, Date.now());
    const MA100s = await this.marketService.calculateMA(pair, 100, Date.now());
    const MA200s = await this.marketService.calculateMA(pair, 200, Date.now());

    const MA5: number = MA5s.slice(-1)[0];
    const MA20: number = MA20s.slice(-1)[0];
    const MA50: number = MA50s.slice(-1)[0];
    const MA100: number = MA100s.slice(-1)[0];
    const MA200: number = MA200s.slice(-1)[0];

    const above20 = MA5 > MA20;
    const above50 = MA5 > MA50;
    const above100 = MA5 > MA100;
    const above200 = MA5 > MA200;

    const gradientRules = {
      base: 4,
      above20: 1,
      above50: 1,
      above100: 1,
      above200: 1,
    };

    const rsiRules = {
      overBought: 2,
      average: 1,
      underBought: 0,
    };

    let requiredGradient = gradientRules.base;

    if (above20) {
      requiredGradient += gradientRules.above20;
    }

    if (above50) {
      requiredGradient += gradientRules.above50;
    }

    if (above100) {
      requiredGradient += gradientRules.above100;
    }

    if (above200) {
      requiredGradient += gradientRules.above200;
    }

    if (RSI <= 33) {
      requiredGradient += rsiRules.underBought;
    } else if (RSI <= 66) {
      requiredGradient += rsiRules.average;
    } else {
      requiredGradient += rsiRules.overBought;
    }

    const analysis = new TradeAnalysisDto();
    Object.assign(analysis, {
      MA5,
      MA20,
      MA50,
      MA100,
      MA200,
      RSI,
      gradient,
    });

    console.log(pair, analysis);

    if (gradient < requiredGradient) {
      return null;
    }

    return analysis;
  }

  trailStop(
    pair: string,
    entryPrice: number,
    stopPrice: number,
    limitPrice: number,
  ): number[] {
    const marketPrice = this.binanceService.getStreamPrice(pair);
    const profit = marketPrice - entryPrice;
    const stopIncreasePercentage = (profit / entryPrice) * 100;

    if (stopIncreasePercentage > 0.3) {
      const stop = marketPrice(pair, marketPrice);
      const newStopPrice = stop[0];
      const newLimitPrice = stop[1];

      if (newStopPrice > stopPrice && newLimitPrice > limitPrice) {
        return [newStopPrice, newLimitPrice];
      }
    }
    return null;
  }

  calculateStop(pair, entryPrice): number[] {
    let stopPrice = entryPrice;
    let limitPrice = entryPrice;

    stopPrice -= (entryPrice / 100) * 0.3;
    limitPrice -= (entryPrice / 100) * 0.4;
    return [stopPrice, limitPrice];
  }

  calculateEntryPrice(entryOrder: SpotOrderDto) {
    let price = 0;
    for (const fill of entryOrder.fills) {
      price += Number(fill.price);
    }

    if (price > 0) {
      return price / entryOrder.fills.length;
    }
    return 0;
  }

  calculateProfit(
    cumulativeQuote: number,
    entryPrice: number,
    exitPrice: number,
  ) {
    const profit = exitPrice - entryPrice;
    const percentage = (profit / entryPrice) * 100;
    return (cumulativeQuote / 100) * percentage;
  }

  countOpenOrders(pair: string, openOrders: SpotOrderDto[]) {
    let count = 0;

    for (const order of openOrders) {
      if (
        order.symbol == pair &&
        order.type == 'STOP_LOSS_LIMIT' &&
        order.side == 'SELL'
      ) {
        count++;
      }
    }

    return count;
  }
}
