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
}
