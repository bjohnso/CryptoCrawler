import { Injectable } from '@nestjs/common';
import { BinanceService } from '../binance/binance.service';
import { MarketsService } from '../markets/markets.service';

@Injectable()
export class StrategyService {
  NUM_TP_POINTS = 9;
  BULLISH_KUMO_REVERSAL_THRESHOLD = 0.05;
  BEARISH_KUMO_REVERSAL_THRESHOLD = -0.05;

  BULLISH_HEIKEN_DIFF = 0.01;
  BEARISH_HEIKEN_DIFF = -0.01;

  STRATEGY_BULLISH_ENTRY = 0;
  STRATEGY_PREDICT_BULLISH_ENTRY = 1;
  STRATEGY_BEARISH_ENTRY = 2;

  constructor(
    private binanceService: BinanceService,
    private marketService: MarketsService,
  ) {}

  async scoutAssets(
    quoteCurrency: string,
    interval: string,
    currentTime: number,
    limit: number,
    strategy: number,
  ) {
    const info = await this.marketService.getSymbols();
    const symbols = info.filter((symbol) =>
      symbol.symbol.includes(quoteCurrency),
    );

    const heikenEntries = [];

    console.log('Scouting for Entries...', Date.now());

    for (const s of symbols) {
      try {
        console.log('Analysing pair', s.symbol);
        const entry = await this.getHeikenCloudEntries(
          s.symbol,
          interval,
          currentTime,
          limit,
          strategy,
        );
        if (entry != null && entry.length > 0) {
          heikenEntries.push(entry);
        }
      } catch (e) {
        console.log('Something went horribly wrong', s.symbol);
      }
    }

    console.log('Scouting for Entries Complete', Date.now());

    return heikenEntries;
  }

  async getHeikenCloudEntries(
    symbol: string,
    interval: string,
    currentTime: number,
    limit: number,
    strategy: number,
  ) {
    const heikenCloudEntries = [];
    const conversionLinePeriods = 1;
    const baseLinePeriods = 26;
    const laggingSpanPeriods = 52;
    const displacement = 1;

    const klines = await this.marketService.getCandles(
      symbol,
      interval,
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
          strategy,
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
    strategy: number,
  ) {
    let ichimokuEntry = null;

    const currentClose = Number(currentHeiken.close);
    const currentOpen = Number(currentHeiken.open);
    const currentHigh = Number(currentHeiken.high);
    const currentLow = Number(currentHeiken.low);

    const prevClose = Number(prevHeiken.close);

    const currentConversion = Number(currentMoku[0]);
    const currentLeadingSpanA = Number(currentMoku[2]);
    const currentLeadingSpanB = Number(currentMoku[3]);

    const prevLeadingSpanA = Number(prevMoku[2]);
    const prevLeadingSpanB = Number(prevMoku[3]);

    const prevConversion = Number(prevMoku[0]);

    let canEnter = false;

    switch (strategy) {
      case this.STRATEGY_PREDICT_BULLISH_ENTRY:
        canEnter = this.isBullishPrediction(
          currentClose,
          currentOpen,
          currentHigh,
          currentLow,
          currentConversion,
          currentLeadingSpanA,
          currentLeadingSpanB,
          prevClose,
          prevLeadingSpanA,
          prevLeadingSpanB,
          prevConversion,
        );
        break;
      case this.STRATEGY_BULLISH_ENTRY:
        canEnter = this.isBullishEntry(
          currentClose,
          currentOpen,
          currentLow,
          currentConversion,
          currentLeadingSpanA,
          currentLeadingSpanB,
          prevClose,
          prevLeadingSpanA,
          prevLeadingSpanB,
          prevConversion,
        );
        break;
      case this.STRATEGY_BEARISH_ENTRY:
        canEnter = this.isBearishEntry(
          currentClose,
          currentOpen,
          currentHigh,
          currentConversion,
          currentLeadingSpanA,
          currentLeadingSpanB,
          prevClose,
          prevLeadingSpanA,
          prevLeadingSpanB,
          prevConversion,
        );
    }

    if (canEnter) {
      ichimokuEntry = [currentHeiken, currentLeadingSpanB];

      const stopPercent =
        ((currentClose - Math.min(currentLeadingSpanB, prevLeadingSpanB)) /
          currentClose) *
        100;

      for (let i = 1; i <= this.NUM_TP_POINTS; i++) {
        const profitPercent = stopPercent * (i + 1);
        const profit = currentClose + (currentClose / 100) * profitPercent;
        ichimokuEntry.push(profit);
      }
    }

    return ichimokuEntry;
  }

  private isBullishEntry(
    currentClose: number,
    currentOpen: number,
    currentLow: number,
    currentConversion: number,
    currentLeadingSpanA: number,
    currentLeadingSpanB: number,
    prevClose: number,
    prevLeadingSpanA: number,
    prevLeadingSpanB: number,
    prevConversion: number,
  ) {
    const currentOpenAndLowDiff =
      ((currentOpen - currentLow) / currentOpen) * 100;

    const isCurrentBullish =
      currentClose > currentOpen &&
      currentOpenAndLowDiff <= this.BULLISH_HEIKEN_DIFF &&
      currentClose > prevClose;

    const isHeikenCloudBullish =
      currentClose > currentLeadingSpanA &&
      currentClose > currentLeadingSpanB &&
      currentLow > currentLeadingSpanA;

    const prevKumo =
      ((prevLeadingSpanA - prevLeadingSpanB) / prevLeadingSpanA) * 100;

    const bullishKumoReversal =
      currentLeadingSpanA - currentLeadingSpanB >= 0 &&
      prevKumo <= this.BULLISH_KUMO_REVERSAL_THRESHOLD;

    const isMokuBullish =
      bullishKumoReversal && currentConversion - prevConversion > 0;

    return isCurrentBullish && isHeikenCloudBullish && isMokuBullish;
  }

  private isBullishPrediction(
    currentClose: number,
    currentOpen: number,
    currentHigh: number,
    currentLow: number,
    currentConversion: number,
    currentLeadingSpanA: number,
    currentLeadingSpanB: number,
    prevClose: number,
    prevLeadingSpanA: number,
    prevLeadingSpanB: number,
    prevConversion: number,
  ) {
    const currentOpenAndLowDiff =
      ((currentOpen - currentLow) / currentOpen) * 100;

    const isCurrentBullish =
      currentClose > currentOpen &&
      currentOpenAndLowDiff <= this.BULLISH_HEIKEN_DIFF &&
      currentClose > prevClose;

    const isHeikenCloudBullishPrediction =
      currentHigh > currentLeadingSpanA && currentHigh > currentLeadingSpanB;

    const prevKumo =
      ((prevLeadingSpanA - prevLeadingSpanB) / prevLeadingSpanA) * 100;

    const bullishKumoReversalPrediction =
      currentLeadingSpanA - currentLeadingSpanB <= 0 &&
      prevKumo <= this.BULLISH_KUMO_REVERSAL_THRESHOLD;

    const isMokuBullish =
      bullishKumoReversalPrediction && currentConversion - prevConversion > 0;

    return isCurrentBullish && isHeikenCloudBullishPrediction && isMokuBullish;
  }

  private isBearishEntry(
    currentClose: number,
    currentOpen: number,
    currentHigh: number,
    currentConversion: number,
    currentLeadingSpanA: number,
    currentLeadingSpanB: number,
    prevClose: number,
    prevLeadingSpanA: number,
    prevLeadingSpanB: number,
    prevConversion: number,
  ) {
    const currentOpenAndLowDiff =
      ((currentOpen - currentHigh) / currentOpen) * 100;

    const isCurrentBearish =
      currentClose < currentOpen &&
      currentOpenAndLowDiff <= this.BEARISH_HEIKEN_DIFF &&
      currentClose < prevClose;

    const isHeikenCloudBearish =
      currentClose < currentLeadingSpanA &&
      currentClose < currentLeadingSpanB &&
      currentHigh < currentLeadingSpanA;

    const prevKumo =
      ((prevLeadingSpanA - prevLeadingSpanB) / prevLeadingSpanA) * 100;

    const bearishKumoReversal =
      currentLeadingSpanA - currentLeadingSpanB <= 0 &&
      prevKumo >= this.BEARISH_KUMO_REVERSAL_THRESHOLD;

    const isMokuBearish =
      bearishKumoReversal && currentConversion - prevConversion < 0;

    return isCurrentBearish && isHeikenCloudBearish && isMokuBearish;
  }
}
