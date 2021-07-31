import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BinanceService } from './binance/binance.service';
import { MarketsService } from './markets/markets.service';
import { StrategyService } from './strategy/strategy.service';

@Injectable()
export class AppService {
  constructor(
    private binanceService: BinanceService,
    private marketService: MarketsService,
    private strategyService: StrategyService,
  ) {}
  startTime = 1626325200000;
  private readonly logger = new Logger(AppService.name);
  private pairs = [
    'BTCUSDT',
    // 'BNBUSDT',
    // 'ETHUSDT',
    // 'ADAUSDT',
    // 'XRPUSDT',
    // 'DOTUSDT',
  ];

  @Cron(CronExpression.EVERY_30_SECONDS, {
    name: 'fetchData',
  })
  private async pollKlineData() {
    for (const pair of this.pairs) {
      const klines = await this.binanceService.getKLines(
        pair,
        '1h',
        null,
        null,
        500,
      );

      await this.marketService.insertKlines(klines);
      await this.simulateTrade();
      this.startTime += 3600000;

      // const openOrders = await this.binanceService.getAllOpenOrders(pair);
      // const openOrderCount = this.countOpenOrders(pair, openOrders);
      // await this.analyseCurrentOrders(pair, openOrders);
      //
      // if (openOrderCount < 1) {
      //   await this.trade(pair);
      // }
    }
  }

  private async simulateTrade() {
    const entry = await this.strategyService.getHeikenCloudEntries(
      'BTCUSDT',
      this.startTime,
      2,
    );

    if (entry.length > 1) {
      console.log(entry);
    }
  }
}
