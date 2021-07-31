import { Injectable } from '@nestjs/common';
import { BinanceService } from '../binance/binance.service';
import { MarketsService } from '../markets/markets.service';

@Injectable()
export class StrategyService {
  MAX_STOP_LIMIT = 2;
  TP_FACTOR = 2;

  constructor(
    private binanceService: BinanceService,
    private marketService: MarketsService,
  ) {}

  async getHeikenCloudEntries(
    symbol: string,
    currentTime: number,
    limit: number,
  ) {
    const heikenCloudEntries = [];
    const timeFrame = '1h';
    const conversionLinePeriods = 9;
    const baseLinePeriods = 26;
    const laggingSpanPeriods = 52;
    const displacement = 1;

    const klines = await this.marketService.getCandles(
      symbol,
      2000,
      currentTime,
    );

    const heikenAshi = this.marketService.calculateHeikenAshi(klines);

    const ichimoku = this.marketService.calculateIchimoku(
      klines,
      conversionLinePeriods,
      baseLinePeriods,
      laggingSpanPeriods,
      displacement,
    );

    let resultSetLength = Number(limit);
    if (resultSetLength > laggingSpanPeriods) {
      resultSetLength = laggingSpanPeriods;
    }

    for (let i = 0; i < resultSetLength - 1; i++) {
      const reverseHeiken = heikenAshi.slice(-2 - i, -1 - i);
      const reverseIchimoku = ichimoku.slice(-2 - i, -1 - i);
      if (reverseHeiken != null && reverseIchimoku != null) {
        heikenCloudEntries.push(
          this.ichimokuCalculateEntry(reverseHeiken[0], reverseIchimoku[0]),
        );
      }
    }

    return heikenCloudEntries;
  }

  private ichimokuCalculateEntry(heikenAshi, ichimoku) {
    const ichimokuEntry = [heikenAshi];

    const heikenClose = Number(heikenAshi.close);
    const heikenOpen = Number(heikenAshi.open);
    const mokuConversion = Number(ichimoku[0]);
    const mokuBaseline = Number(ichimoku[1]);
    const mokuLeadingSpanA = Number(ichimoku[2]);
    const mokuLeadingSpanB = Number(ichimoku[3]);

    const isBullish =
      heikenClose > heikenOpen &&
      heikenClose > mokuConversion &&
      heikenClose > mokuLeadingSpanA &&
      mokuConversion > mokuBaseline &&
      mokuLeadingSpanA > mokuLeadingSpanB;

    if (isBullish) {
      const stopPercent =
        ((heikenClose - mokuLeadingSpanB) / heikenClose) * 100;
      const isWorthTheRisk = stopPercent <= this.MAX_STOP_LIMIT;

      if (isWorthTheRisk) {
        const profitPercent = stopPercent * this.TP_FACTOR;
        const profit = heikenClose + (profitPercent / heikenClose) * 100;
        ichimokuEntry.push(mokuLeadingSpanB, profit);
        console.log('TRADE', heikenAshi.close, stopPercent, profitPercent);
      }
    }

    return ichimokuEntry;
  }
}
