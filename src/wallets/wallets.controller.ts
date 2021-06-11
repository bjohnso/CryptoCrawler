import { Controller, Get } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { BinanceService } from '../binance/binance.service';

@Controller('wallets')
export class WalletsController {
  constructor(
    private walletsService: WalletsService,
    private binanceService: BinanceService,
  ) {}

  @Get()
  async getBalances() {
    return await this.binanceService
      .getSpotAccountInformation()
      .then((result) => result);
  }
}
