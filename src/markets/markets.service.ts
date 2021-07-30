import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KlineDto } from '../dtos/kline.dto';
import { SpotOrderDto } from '../dtos/spot-order.dto';

@Injectable()
export class MarketsService {
  constructor(
    @InjectRepository(KlineDto)
    private klineRepository: Repository<KlineDto>,
    @InjectRepository(SpotOrderDto)
    private spotOrderRepository: Repository<SpotOrderDto>,
  ) {}

  insertKlines(klines: KlineDto[]) {
    const promises = [];
    klines.forEach((kline) => {
      promises.push(this.insertKline(kline));
    });
    return Promise.all(promises);
  }

  insertSpotOrders(spotOrders: SpotOrderDto[]) {
    const promises = [];
    spotOrders.forEach((spotOrder) => {
      promises.push(this.insertSpotOrder(spotOrder));
    });
    return Promise.all(promises);
  }

  async insertKline(kline: KlineDto) {
    const existing = await this.klineRepository.findOne({
      where: {
        klineId: kline.klineId,
      },
    });

    if (existing != null) {
      return this.klineRepository.update(existing, kline);
    } else {
      return this.klineRepository.save(kline);
    }
  }

  async insertSpotOrder(spotOrder: SpotOrderDto) {
    const existing = await this.spotOrderRepository.findOne({
      where: {
        clientOrderId: spotOrder.clientOrderId,
      },
    });

    if (existing != null) {
      return this.spotOrderRepository.update(existing, spotOrder);
    } else {
      return this.spotOrderRepository.save(spotOrder);
    }
  }

  async getEntryOrder(stopOrderId: string) {
    return await this.spotOrderRepository.findOne({
      where: { stopOrderId: stopOrderId },
    });
  }

  // Indicators

  getSMA(symbol: string, timePeriods: number, currentTime: number) {
    return this.klineRepository
      .find({
        where: {
          symbol: symbol,
          openTime: { $lte: Number(currentTime) },
        },
        order: {
          openTime: 1,
        },
        take: 2000,
      })
      .then((results) =>
        MarketsService.calculateSMA(results, Number(timePeriods)),
      );
  }

  getEMA(symbol: string, timePeriods: number, currentTime: number) {
    return this.klineRepository
      .find({
        where: {
          symbol: symbol,
          openTime: { $lte: Number(currentTime) },
        },
        order: {
          openTime: -1,
        },
        take: Number(timePeriods) * Number(timePeriods),
      })
      .then((results) =>
        MarketsService.calculateEMA(results.reverse(), Number(timePeriods)),
      );
  }

  getMACD(
    symbol: string,
    slowTimePeriods: number,
    fastTimePeriods: number,
    signalTimePeriods: number,
    currentTime: number,
  ) {
    return this.klineRepository
      .find({
        where: {
          symbol: symbol,
          openTime: { $lte: Number(currentTime) },
        },
        order: {
          openTime: -1,
        },
        take: Number(slowTimePeriods) * Number(slowTimePeriods),
      })
      .then((results) =>
        MarketsService.calculateMACD(
          results.reverse(),
          Number(slowTimePeriods),
          Number(fastTimePeriods),
          Number(signalTimePeriods),
        ),
      );
  }

  getRSI(symbol: string, timePeriods: number, currentTime: number) {
    return this.klineRepository
      .find({
        where: {
          symbol: symbol,
          openTime: { $lte: Number(currentTime) },
        },
        order: {
          openTime: 1,
        },
        take: 2000,
      })
      .then((results) => {
        const RSIPoints = [];

        const initialDataPoints = results
          .slice(0, Number(timePeriods) + 1)
          .reverse();

        const initialGainAndLoss = MarketsService.calculateAverageGainAndLoss(
          initialDataPoints,
          Number(timePeriods),
        );

        let averageGain = initialGainAndLoss[0] / Number(timePeriods);
        let averageLoss = (initialGainAndLoss[1] * -1) / Number(timePeriods);
        let rsi = 100 - 100 / (1 + averageGain / averageLoss);

        RSIPoints.push(rsi);

        for (let i = Number(timePeriods) + 1; i < results.length; i++) {
          if (i > 0) {
            let currentGain = 0;
            let currentLoss = 0;
            const close = Number(results[i].close);
            const prevClose = Number(results[i - 1].close);
            const gain = close - prevClose;

            if (gain > 0) {
              currentGain = gain;
            } else if (gain < 0) {
              currentLoss = gain * -1;
            }

            averageGain =
              (averageGain * (Number(timePeriods) - 1) + currentGain) /
              Number(timePeriods);
            averageLoss =
              (averageLoss * (Number(timePeriods) - 1) + currentLoss) /
              Number(timePeriods);
            rsi = 100 - 100 / (1 + averageGain / averageLoss);
            RSIPoints.push(rsi);
          }
        }
        return RSIPoints;
      });
  }

  getHeikenAshi(symbol: string, timePeriods: number, currentTime: number) {
    return this.klineRepository
      .find({
        where: {
          symbol: symbol,
          openTime: { $lte: Number(currentTime) },
        },
        order: {
          openTime: -1,
        },
        take: Number(timePeriods),
      })
      .then((results) => MarketsService.calculateHeikenAshi(results.reverse()));
  }

  getIchimoku(
    symbol: string,
    conversionLinePeriods: number,
    baseLinePeriods: number,
    laggingSpanPeriods: number,
    displacement: number,
    currentTime: number,
  ) {
    return this.klineRepository
      .find({
        where: {
          symbol: symbol,
          openTime: { $lte: Number(currentTime) },
        },
        order: {
          openTime: -1,
        },
        take: 2000,
      })
      .then((results) =>
        MarketsService.calculateIchimoku(
          results.reverse(),
          Number(conversionLinePeriods),
          Number(baseLinePeriods),
          Number(laggingSpanPeriods),
          Number(displacement),
        ),
      );
  }

  private static calculateSMA(klines, timePeriods) {
    const SMAPoints = [];

    for (let i = 0; i < klines.length; i++) {
      if (i >= timePeriods - 1) {
        let average = 0;
        for (let j = i; j > i - timePeriods; j--) {
          average += Number(klines[j].close);
        }
        SMAPoints.push(average / timePeriods);
      }
    }

    return SMAPoints;
  }

  private static calculateEMA(klines, timePeriods) {
    const EMAPoints = [];
    const smoothK = 2 / (Number(timePeriods) + 1);

    for (let i = 0; i < klines.length; i++) {
      if (i >= timePeriods - 1) {
        if (EMAPoints.length < 1) {
          const SMA = MarketsService.calculateSMA(
            klines.slice(i - (timePeriods - 1), i + 1),
            timePeriods,
          )[0];
          EMAPoints.push(SMA);
        } else {
          const EMAPrev = EMAPoints[EMAPoints.length - 1];
          const close = Number(klines[i].close);
          const EMA = (close - EMAPrev) * smoothK + EMAPrev;
          EMAPoints.push(EMA);
        }
      }
    }

    return EMAPoints;
  }

  private static calculateIndicatorEMA(indicatorPoints, timePeriods) {
    const EMAPoints = [];
    const smoothK = 2 / (Number(timePeriods) + 1);

    for (let i = 0; i < indicatorPoints.length; i++) {
      if (i >= timePeriods - 1) {
        if (EMAPoints.length < 1) {
          EMAPoints.push(indicatorPoints[i]);
        } else {
          const EMAPrev = EMAPoints[EMAPoints.length - 1];
          const close = indicatorPoints[i];
          const EMA = (close - EMAPrev) * smoothK + EMAPrev;
          EMAPoints.push(EMA);
        }
      }
    }

    return EMAPoints;
  }

  private static calculateMACD(
    klines,
    slowTimePeriods,
    fastTimePeriods,
    signalTimePeriods,
  ) {
    const MACDPoints = [];

    const slowEMAPoints = MarketsService.calculateEMA(klines, slowTimePeriods);
    let fastEMAPoints = MarketsService.calculateEMA(klines, fastTimePeriods);
    let indicatorEMAPoints = [];

    fastEMAPoints = fastEMAPoints.slice(
      fastEMAPoints.length - slowEMAPoints.length,
    );

    for (let i = 0; i < slowEMAPoints.length; i++) {
      indicatorEMAPoints.push(fastEMAPoints[i] - slowEMAPoints[i]);
    }

    const signalEMAPoints = MarketsService.calculateIndicatorEMA(
      indicatorEMAPoints,
      signalTimePeriods,
    );

    indicatorEMAPoints = indicatorEMAPoints.slice(
      indicatorEMAPoints.length - signalEMAPoints.length,
    );

    for (let i = 0; i < indicatorEMAPoints.length; i++) {
      const MACD = indicatorEMAPoints[i];
      const signal = signalEMAPoints[i];
      const hist = MACD - signal;
      MACDPoints.push([MACD, signal, hist]);
    }

    return MACDPoints;
  }

  private static calculateAverageGainAndLoss(
    dataPoints: KlineDto[],
    timePeriods: number,
  ) {
    let averageGain = 0;
    let averageLoss = 0;

    for (let i = 0; i < dataPoints.length; i++) {
      if (i < dataPoints.length - 1) {
        const close = Number(dataPoints[i].close);
        const prevClose = Number(dataPoints[i + 1].close);
        let gain = close - prevClose;
        if (gain != 0) {
          gain = (gain / prevClose) * 100;
          if (gain > 0) {
            averageGain += gain;
          } else {
            averageLoss += gain;
          }
        }
      }
    }

    if (averageGain != 0) {
      averageGain /= timePeriods;
    }

    if (averageLoss != 0) {
      averageLoss /= timePeriods;
    }

    return [averageGain, averageLoss];
  }

  private static calculateHeikenAshi(klines) {
    const heikenAshis = [];
    for (let i = 0; i < klines.length; i++) {
      if (i > 0) {
        const ashi = klines[i];
        const prev = klines[i - 1];

        const origOpen = Number(ashi.open);
        const origClose = Number(ashi.close);
        const origHigh = Number(ashi.high);
        const origLow = Number(ashi.low);

        const close = 0.25 * (origOpen + origHigh + origLow + origClose);
        const open = 0.5 * (Number(prev.open) + Number(prev.close));
        const high = Math.max(origHigh, origOpen, origClose);
        const low = Math.min(origLow, origOpen, origClose);

        ashi.open = open;
        ashi.high = high;
        ashi.close = close;
        ashi.low = low;

        heikenAshis.push(ashi);
      }
    }
    return heikenAshis;
  }

  private static calculateIchimoku(
    klines,
    conversionLinePeriods,
    baseLinePeriods,
    laggingSpanPeriods,
    displacement,
  ) {
    const ichimokuPoints = [];

    for (let i = 0; i < klines.length + displacement - 1; i++) {
      if (i >= klines.length - laggingSpanPeriods) {
        let conversion = null; // Tenkan-sen
        let baseLine = null; // Kijun-sen
        let laggingSpan = null; // Chikou Span
        let leadingSpanA = null; // Senkou Span A
        let leadingSpanB = null; // Senkou Span B

        if (i < klines.length) {
          conversion = this.calculateHighLowRangeMidPoint(
            klines.slice(i - conversionLinePeriods + 1, i + 1),
          );

          baseLine = this.calculateHighLowRangeMidPoint(
            klines.slice(i - baseLinePeriods + 1, i + 1),
          );

          if (i <= klines.length - laggingSpanPeriods + displacement) {
            laggingSpan = Number(klines[i + displacement - 1].close);
          }
        }

        const displacedConversion = this.calculateHighLowRangeMidPoint(
          klines.slice(
            i - conversionLinePeriods - displacement + 2,
            i - displacement + 2,
          ),
        );

        const displacedBaseLine = this.calculateHighLowRangeMidPoint(
          klines.slice(
            i - baseLinePeriods - displacement + 2,
            i - displacement + 2,
          ),
        );

        // Senkou Span A
        leadingSpanA = (displacedConversion + displacedBaseLine) / 2;

        // Senkou Span B
        leadingSpanB = this.calculateHighLowRangeMidPoint(
          klines.slice(
            i - laggingSpanPeriods - displacement + 2,
            i - displacement + 2,
          ),
        );

        ichimokuPoints.push([
          conversion,
          baseLine,
          leadingSpanA,
          leadingSpanB,
          laggingSpan,
        ]);
      }
    }

    return ichimokuPoints;
  }

  private static calculateHighLowRangeMidPoint(klines) {
    let highest = Number(klines[0].high);
    let lowest = Number(klines[0].low);

    for (let i = 1; i < klines.length; i++) {
      highest = Math.max(highest, Number(klines[i].high));
      lowest = Math.min(lowest, Number(klines[i].low));
    }
    return (highest + lowest) / 2;
  }
}
