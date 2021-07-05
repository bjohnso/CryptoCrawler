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
    this.logger.debug('Fetching Binance Kline Data at ' + Date.now());
    const klines = await this.binanceService.getKLines(
      'BTCUSDT',
      '1m',
      null,
      null,
      250,
    );
    await this.marketService.insertKlines(klines);
  }
}
