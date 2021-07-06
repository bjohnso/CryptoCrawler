import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BinanceService } from './binance/binance.service';
import { MarketsService } from './markets/markets.service';

@Injectable()
export class AppService {
  constructor(
    private binanceService: BinanceService,
    private marketService: MarketsService,
  ) {}
  private readonly logger = new Logger(AppService.name);

  // Every minute on the 45th second
  @Cron('45 * * * * *', {
    name: 'fetchData',
  })
  private async pollKlineData() {
    const klines = await this.binanceService.getKLines(
      'BTCUSDT',
      '1m',
      null,
      null,
      250,
    );
    await this.marketService.insertKlines(klines);
    await this.analyseTrade();
  }

  private async analyseTrade() {
    const pair = 'BTCUSDT';
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

    if (above20 && above50 && above100 && above200) {
      if (MA5G >= 25) {
        this.logger.debug(
          'Trade conditions met: above20 && above50 && above100 && above200 && MA5G >= 25 : ' +
            MA5G,
        );
        return;
      }
    } else if (!above20 && above50 && above100 && above200) {
      if (MA5G >= 20) {
        this.logger.debug(
          'Trade conditions met: !above20 && above50 && above100 && above200 && MA5G >= 25 : ' +
            MA5G,
        );
        return;
        return;
      }
    } else if (!above20 && !above50 && above100 && above200) {
      if (MA5G >= 18) {
        this.logger.debug(
          'Trade conditions met: !above20 && !above50 && above100 && above200 && MA5G >= 25 : ' +
            MA5G,
        );
        return;
      }
    } else if (above20 && above50 && above100 && !above200) {
      if (MA5G >= 15) {
        this.logger.debug(
          'Trade conditions met: above20 && above50 && above100 && !above200 && MA5G >= 25 : ' +
            MA5G,
        );
        return;
      }
    } else if (!above20 && !above50 && !above100 && above200) {
      if (MA5G >= 15) {
        this.logger.debug(
          'Trade conditions met: !above20 && !above50 && !above100 && above200 && MA5G >= 25 : ' +
            MA5G,
        );
        return;
      }
    } else if (above20 && above50 && !above100 && !above200) {
      if (MA5G >= 13) {
        this.logger.debug(
          'Trade conditions met: above20 && above50 && !above100 && !above200 && MA5G >= 25 : ' +
            MA5G,
        );
        return;
      }
    } else if (above20 && !above50 && !above100 && !above200) {
      if (MA5G >= 13) {
        this.logger.debug(
          'Trade conditions met: above20 && !above50 && !above100 && !above200 && MA5G >= 25 : ' +
            MA5G,
        );
        return;
      }
    } else if (!above20 && !above50 && !above100 && !above200) {
      if (MA5G >= 10) {
        this.logger.debug(
          'Trade conditions met: !above20 && !above50 && !above100 && !above200 && MA5G >= 25 : ' +
            MA5G,
        );
        return;
      }
    }
  }

  async trade() {
    const tradeAmount = 100;
    const marketPricePrice = this.binanceService.getBtcPrice();
    const quantity = tradeAmount / marketPricePrice;

    this.logger.debug(
      'Trade executed: Quantity: ' + quantity + ' at price ' + marketPricePrice,
    );
  }
}
