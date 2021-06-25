import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KlineDto } from '../dtos/kline.dto';

@Injectable()
export class MarketsService {
  constructor(
    @InjectRepository(KlineDto)
    private marketRepository: Repository<KlineDto>,
  ) {}

  insertKline(kline: KlineDto) {
    return this.marketRepository.save(kline);
  }

  insertKlines(klines: KlineDto[]) {
    const promises = [];
    klines.forEach((kline) => {
      promises.push(this.insertKline(kline));
    });
    return Promise.all(promises);
  }

  calculate50MA(symbol: string, currentTime: number) {
    return this.marketRepository
      .find({
        where: {
          openTime: { $lte: Number(currentTime) },
        },
        order: {
          openTime: -1,
        },
        take: 50,
      })
      .then((results) => {
        let total = 0;
        results.forEach((result) => {
          total += Number(result.close);
        });

        if (results.length > 0) {
          return total / results.length;
        }
        return 0;
      });
  }

  calculate200MA(symbol: string, currentTime: number) {
    return this.marketRepository
      .find({
        where: {
          openTime: { $lte: Number(currentTime) },
        },
        order: {
          openTime: -1,
        },
        take: 200,
      })
      .then((results) => {
        let total = 0;
        results.forEach((result) => {
          total += Number(result.close);
        });

        if (results.length > 0) {
          return total / results.length;
        }
        return 0;
      });
  }

  calculateAverageGainAndLoss(dataPoints: KlineDto[], timePeriods: number) {
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

  calculateRSI(symbol: string, currentTime: number, timePeriods: number) {
    return this.marketRepository
      .find({
        where: {
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
}
