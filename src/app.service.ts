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
  private pairs = [
    'BTCUSDT',
    'BNBUSDT',
    'ETHUSDT',
    'ADAUSDT',
    'XRPUSDT',
    'DOTUSDT',
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
      await this.trade(pair);
    }
  }

  private async analyseEntry(pair: string): Promise<boolean> {
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
      base: 8,
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
      return false;
    }

    this.logger.debug(
      '\nabove20: ' +
        above20 +
        '\nabove50: ' +
        above50 +
        '\nabove100: ' +
        above100 +
        '\nabove200: ' +
        above200 +
        '\nRequired m: ' +
        requiredGradient +
        '\nm: ' +
        MA5G,
    );

    return true;
  }

  async calculateStopLoss(pair, marketPrice): Promise<number> {
    const RSI = await this.marketService.calculateRSI(pair, 14, Date.now());

    const currentRSI = RSI.slice(-1)[0];

    let stop = marketPrice;

    if (currentRSI <= 33) {
      stop -= (marketPrice / 100) * 0.3;
    } else if (currentRSI <= 66) {
      stop -= (marketPrice / 100) * 0.2;
    } else {
      stop -= (marketPrice / 100) * 0.1;
    }
    return stop;
  }

  async trade(pair: string) {
    const canEnter = await this.analyseEntry(pair);

    if (!canEnter) {
      return;
    }

    const tradeAmount = 100;
    const marketPricePrice = this.binanceService.getStreamPrice(pair);
    const quantity = tradeAmount / marketPricePrice;
    const stop = await this.calculateStopLoss(pair, marketPricePrice);

    this.logger.debug(
      `\nTRADE EXECUTED\nPair: ${pair}\nQuantity: ${quantity}\nPrice: ${marketPricePrice}\nStop: ${stop}`,
    );
  }
}
