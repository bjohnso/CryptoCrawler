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
    this.marketRepository.save(kline).then((r) => r);
  }

  insertKlines(klines: KlineDto[]) {
    klines.forEach((kline) => {
      this.insertKline(kline);
    });
  }
}
