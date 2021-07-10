import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
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
    'BTCUSDT',
    'BNBUSDT',
    'ETHUSDT',
    // 'ADAUSDT',
    'XRPUSDT',
    // 'DOTUSDT',
  ];

  // Every minute on the 45th second
  @Cron('45 * * * * *', {
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
      await this.analyseCurrentOrders(pair);
      await this.trade(pair);
    }
  }

  async analyseCurrentOrders(pair: string) {
    const openOrders = await this.binanceService.getAllOpenOrders(pair);

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
            order.stopPrice,
            order.price,
          );

          if (trailStop) {
            const stopPrice = trailStop[0];
            const limitPrice = trailStop[1];

            this.logger.debug(`NEW STOP CALCULATED ${trailStop}`);
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
              }
            }
          }
        }
      }
    }
  }

  async trade(pair: string) {
    const analysis = await this.analyseEntry(pair);

    if (analysis == null) {
      return;
    }

    const quoteOrderQty = 50;

    const entryOrder = await this.binanceService.spotMarketOrder(
      pair,
      quoteOrderQty,
    );

    if (entryOrder.clientOrderId) {
      this.logger.debug('NEW ENTRY');

      const assetQuantity = Number(entryOrder.executedQty);
      const cumulativeQuote = Number(entryOrder.cummulativeQuoteQty);
      const entryPrice = this.calculateEntryPrice(entryOrder);

      const RSI = await this.marketService.calculateRSI(pair, 14, Date.now());
      const currentRSI = RSI.slice(-1)[0];
      const stop = await this.calculateStop(pair, entryPrice, currentRSI);

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

      console.log(exitOrder);

      if (exitOrder.clientOrderId) {
        this.logger.debug(`NEW STOP ${exitOrder.clientOrderId}`);

        entryOrder.stopOrderId = exitOrder.clientOrderId;
        analysis.RSI = currentRSI;
        analysis.stopPrice = stopPrice;
        analysis.limitPrice = limitPrice;
        analysis.profit = profit;
      } else {
        this.logger.error(`STOP LIMIT FAILED! ${entryOrder.clientOrderId}`);
      }

      entryOrder.analysis = analysis;
      await this.marketService.insertSpotOrder(entryOrder);
    }
  }

  private async analyseEntry(pair: string): Promise<TradeAnalysisDto> {
    const MA5G = await this.marketService.calculateMAGradient(
      pair,
      5,
      3,
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
      base: 6,
      above20: 2,
      above50: 2,
      above100: 2,
      above200: 4,
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

    if (MA5G < requiredGradient) {
      return null;
    }

    const analysis = new TradeAnalysisDto();
    Object.assign(analysis, {
      MA5,
      MA20,
      MA50,
      MA100,
      MA200,
      gradient: MA5G,
    });

    console.log(analysis);

    return analysis;
  }

  trailStop(
    pair: string,
    entryPrice: number,
    stopPrice: number,
    limitPrice: number,
  ) {
    const marketPrice = this.binanceService.getStreamPrice(pair);
    const profit = marketPrice - entryPrice;
    const stopIncreasePercentage = (profit / entryPrice) * 100;

    if (stopIncreasePercentage > 0.1) {
      const newStopPrice =
        stopPrice + (stopPrice / 100) * stopIncreasePercentage;
      const newLimitPrice =
        limitPrice + (limitPrice / 100) * stopIncreasePercentage;
      return [newStopPrice, newLimitPrice];
    }
    return null;
  }

  calculateStop(pair, entryPrice, RSI): number[] {
    let stopPrice = entryPrice;
    let limitPrice = entryPrice;

    if (RSI <= 33) {
      stopPrice -= (entryPrice / 100) * 0.3;
      limitPrice -= (entryPrice / 100) * 0.4;
    } else if (RSI <= 66) {
      stopPrice -= (entryPrice / 100) * 0.2;
      limitPrice -= (entryPrice / 100) * 0.3;
    } else {
      stopPrice -= (entryPrice / 100) * 0.1;
      limitPrice -= (entryPrice / 100) * 0.2;
    }
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
}
