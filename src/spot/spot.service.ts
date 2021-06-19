import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SpotBalanceDto } from '../dtos/spot-balance.dto';
import { Repository } from 'typeorm';

@Injectable()
export class SpotService {
  constructor(
    @InjectRepository(SpotBalanceDto)
    private spotRepository: Repository<SpotBalanceDto>,
  ) {}

  insertSpotBalance(spotBalance: SpotBalanceDto) {
    return this.spotRepository.save(spotBalance);
  }

  insertSpotBalances(spotBalances: SpotBalanceDto[]) {
    spotBalances.forEach((balance) => {
      this.insertSpotBalance(balance).then((r) => r);
    });
  }
}
