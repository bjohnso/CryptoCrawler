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

  calculateMA(symbol: string, timePeriods: number, currentTime: number) {
    return this.klineRepository
      .find({
        where: {
          symbol: symbol,
          openTime: { $lte: Number(currentTime) },
        },
        order: {
          openTime: 1,
        },
        take: 20000,
      })
      .then((results) => {
        const MAPoints = [];

        for (let i = 0; i < results.length; i++) {
          if (i >= timePeriods - 1) {
            let average = 0;
            for (let j = i; j > i - timePeriods; j--) {
              average += Number(results[j].close);
            }
            MAPoints.push(average / timePeriods);
          }
        }

        return MAPoints;
      });
  }

  calculateMAGradient(
    symbol: string,
    timePeriods: number,
    gradientWidth: number,
    currentTime: number,
  ) {
    if (gradientWidth <= 0) {
      return 0;
    }

    return this.calculateMA(symbol, timePeriods, currentTime).then(
      (maPoints) => {
        const reversed = maPoints.reverse();
        const y2 = reversed[0];
        const y1 = reversed[gradientWidth - 1];

        return (y2 - y1) / (gradientWidth * timePeriods);
      },
    );
  }

  calculateRSI(symbol: string, timePeriods: number, currentTime: number) {
    return this.klineRepository
      .find({
        where: {
          symbol: symbol,
          openTime: { $lte: Number(currentTime) },
        },
        order: {
          openTime: 1,
        },
        take: 250,
      })
      .then((results) => {
        const RSIPoints = [];

        const initialDataPoints = results
          .slice(0, Number(timePeriods) + 1)
          .reverse();

        const initialGainAndLoss = this.calculateAverageGainAndLoss(
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

  private calculateAverageGainAndLoss(
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
}
