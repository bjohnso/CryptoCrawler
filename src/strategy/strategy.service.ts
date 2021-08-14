import { Injectable } from '@nestjs/common';
import { BinanceService } from '../binance/binance.service';
import { MarketsService } from '../markets/markets.service';

@Injectable()
export class StrategyService {
  NUM_TP_POINTS = 5;
  BULLISH_KUMO_REVERSAL_THRESHOLD = 0.05;
  BULLISH_HEIKEN_DIFF = 0.01;

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
    const conversionLinePeriods = 1;
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
      klines.length - laggingSpanPeriods,
    );

    for (let i = 0; i < limit - 1; i++) {
      const reverseHeiken = heikenAshi.slice(-3 - i, -1 - i);
      const reverseIchimoku = ichimoku.slice(-3 - i, -1 - i);
      if (reverseHeiken != null && reverseIchimoku != null) {
        const entry = this.ichimokuCalculateEntry(
          reverseHeiken[1],
          reverseHeiken[0],
          reverseIchimoku[1],
          reverseIchimoku[0],
        );

        if (entry != null) {
          heikenCloudEntries.push(entry);
        }
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
    let ichimokuEntry = null;

    const currentClose = Number(currentHeiken.close);
    const currentOpen = Number(currentHeiken.open);
    const currentLow = Number(currentHeiken.low);

    const prevClose = Number(prevHeiken.close);

    const currentConversion = Number(currentMoku[0]);
    const currentLeadingSpanA = Number(currentMoku[2]);
    const currentLeadingSpanB = Number(currentMoku[3]);

    const prevLeadingSpanA = Number(prevMoku[2]);
    const prevLeadingSpanB = Number(prevMoku[3]);

    const prevConversion = Number(prevMoku[0]);

    const currentOpenAndLowDiff =
      ((currentOpen - currentLow) / currentOpen) * 100;

    const isCurrentBullish =
      currentClose > currentOpen &&
      currentOpenAndLowDiff <= this.BULLISH_HEIKEN_DIFF &&
      currentClose > prevClose;

    const isHeikenCloudBullish =
      currentClose > currentLeadingSpanA && currentClose > currentLeadingSpanB;

    const prevKumo =
      ((prevLeadingSpanA - prevLeadingSpanB) / prevLeadingSpanA) * 100;

    const bullishKumoReversal =
      currentLeadingSpanA - currentLeadingSpanB > 0 &&
      prevKumo <= this.BULLISH_KUMO_REVERSAL_THRESHOLD;

    const isMokuBullish =
      bullishKumoReversal && currentConversion - prevConversion > 0;

    const isBullish = isCurrentBullish && isHeikenCloudBullish && isMokuBullish;

    if (isBullish) {
      ichimokuEntry = [currentHeiken, currentLeadingSpanB];

      const stopPercent =
        ((currentClose - currentLeadingSpanB) / currentClose) * 100;

      for (let i = 1; i <= this.NUM_TP_POINTS; i++) {
        const profitPercent = stopPercent * (i + 1);
        const profit = currentClose + (currentClose / 100) * profitPercent;
        ichimokuEntry.push(profit);
      }
    }

    return ichimokuEntry;
  }
}
