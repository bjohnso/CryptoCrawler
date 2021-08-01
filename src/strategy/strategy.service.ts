import { Injectable } from '@nestjs/common';
import { BinanceService } from '../binance/binance.service';
import { MarketsService } from '../markets/markets.service';

@Injectable()
export class StrategyService {
  MAX_STOP_LIMIT = 3;
  MIN_STOP_LIMIT = 2;
  TP_FACTOR = 3;
  BULLISH_HEIKEN_DIFF = 0.01;
  BULLISH_KUMO_LOW = -0.1;

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
      klines.length - laggingSpanPeriods,
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

    const currentOpenAndLowDiff =
      ((currentOpen - currentLow) / currentOpen) * 100;

    const prevOpenAndLowDiff = ((prevOpen - prevLow) / prevOpen) * 100;

    const isCurrentBullish =
      currentClose > currentOpen &&
      currentOpenAndLowDiff <= this.BULLISH_HEIKEN_DIFF &&
      currentClose > prevClose;

    const isPrevBullish =
      prevClose > prevOpen && prevOpenAndLowDiff <= this.BULLISH_HEIKEN_DIFF;

    const isHeikenCloudBullish =
      currentClose > currentConversion &&
      currentClose > currentLeadingSpanA &&
      currentClose > currentLeadingSpanB;

    const bullishKumoPrediction =
      ((currentLeadingSpanA - currentLeadingSpanB) / currentLeadingSpanA) *
        100 >=
      this.BULLISH_KUMO_LOW;

    const isMokuBullish =
      currentConversion > currentBaseline &&
      bullishKumoPrediction &&
      currentConversion - prevConversion > 0;

    const isBullish =
      isCurrentBullish &&
      isPrevBullish &&
      isHeikenCloudBullish &&
      isMokuBullish;

    if (isBullish) {
      let stopPercent =
        ((currentClose - currentLeadingSpanB) / currentClose) * 100;
      const isWorthTheRisk =
        stopPercent >= this.MIN_STOP_LIMIT &&
        stopPercent <= this.MAX_STOP_LIMIT;

      stopPercent = stopPercent / 2;

      if (isWorthTheRisk) {
        const profitPercent = stopPercent * this.TP_FACTOR;
        const profit = currentClose + (profitPercent / currentClose) * 100;
        ichimokuEntry.push(currentLeadingSpanB, profit);
        console.log(
          new Date(currentHeiken.openTime),
          currentClose,
          stopPercent,
          profitPercent,
        );
      }
    }

    return ichimokuEntry;
  }
}
