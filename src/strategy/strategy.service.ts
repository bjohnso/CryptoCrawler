import { Injectable } from '@nestjs/common';
import { BinanceService } from '../binance/binance.service';
import { MarketsService } from '../markets/markets.service';

@Injectable()
export class StrategyService {
  MAX_STOP_LIMIT = 3;
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
      laggingSpanPeriods,
    );

    for (let i = 0; i < limit - 1; i++) {
      const reverseHeiken = heikenAshi.slice(-3 - i, -1 - i);
      const reverseIchimoku = ichimoku.slice(-3 - i, -1 - i);
      if (reverseHeiken != null && reverseIchimoku != null) {
        heikenCloudEntries.push(
          this.ichimokuCalculateEntry(
            reverseHeiken[1],
            reverseHeiken[0],
            reverseIchimoku[1],
            reverseIchimoku[0],
          ),
        );
      }
    }

    return heikenCloudEntries;
  }

  private ichimokuCalculateEntry(
    currentHeiken,
    prevHeiken,
    currentMoku,
    prevMoku,
  ) {
    const ichimokuEntry = [currentHeiken];

    const currentClose = Number(currentHeiken.close);
    const currentOpen = Number(currentHeiken.open);
    const currentLow = Number(currentHeiken.low);

    const prevClose = Number(prevHeiken.close);
    const prevOpen = Number(prevHeiken.open);
    const prevLow = Number(prevHeiken.low);

    const currentConversion = Number(currentMoku[0]);
    const currentBaseline = Number(currentMoku[1]);
    const currentLeadingSpanA = Number(currentMoku[2]);
    const currentLeadingSpanB = Number(currentMoku[3]);

    const prevConversion = Number(prevMoku[0]);

    const isCurrentBullish =
      currentOpen > currentClose &&
      currentOpen.toFixed(0) >= currentLow.toFixed(0) &&
      currentClose > prevClose;

    const isPrevBullish =
      prevOpen > prevClose && prevOpen.toFixed(0) >= prevLow.toFixed(0);

    const isHeikenCloudBullish =
      currentClose > currentConversion && currentClose > currentLeadingSpanA;

    const isMokuBullish =
      currentConversion > currentBaseline &&
      currentLeadingSpanA > currentLeadingSpanB &&
      currentConversion - prevConversion > 0;

    const isBullish =
      isCurrentBullish &&
      isPrevBullish &&
      isHeikenCloudBullish &&
      isMokuBullish;

    if (isBullish) {
      const stopPercent =
        ((currentClose - currentLeadingSpanB) / currentClose) * 100;
      const isWorthTheRisk = stopPercent <= this.MAX_STOP_LIMIT;

      if (isWorthTheRisk) {
        const profitPercent = stopPercent * this.TP_FACTOR;
        const profit = currentClose + (profitPercent / currentClose) * 100;
        ichimokuEntry.push(currentLeadingSpanB, profit);
      }
    }

    return ichimokuEntry;
  }
}
