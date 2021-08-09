import { Injectable } from '@nestjs/common';
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

  private pairs = [
    'BTCUSDT',
    // 'BNBUSDT',
    // 'ETHUSDT',
    // 'ADAUSDT',
    // 'XRPUSDT',
    // 'DOTUSDT',
  ];

  @Cron(CronExpression.EVERY_MINUTE, {
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
      await this.trade(pair);
    }
  }

  private async trade(pair: string) {
    const canEnter = await this.canEnter(pair);

    if (canEnter) {
      const entries = await this.strategyService.getHeikenCloudEntries(
        pair,
        Date.now(),
        2,
      );

      if (entries.length > 0) {
        const entry = entries[0];
        const quantity = 0.001; //BTC
        const stop = entries[1];
        const profit = entries[2];

        const buyOrder = await this.binanceService.newBuyMarket(pair, quantity);
        const stopOrder = await this.binanceService.newStopMarket(pair, stop);
        const takeProfitOrder = await this.binanceService.newTakeProfitMarket(
          pair,
          profit,
        );

        console.log(buyOrder, stopOrder, takeProfitOrder);
      }
    }
  }

  private async canEnter(pair: string) {
    const openOrders = await this.binanceService.getAllOpenOrders(pair);
    return openOrders.length < 1;
  }
}
