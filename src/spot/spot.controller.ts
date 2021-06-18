import { Controller, Get } from '@nestjs/common';
import { SpotService } from './spot.service';
import { BinanceService } from '../binance/binance.service';

@Controller('spot')
export class SpotController {
  constructor(
    private spotService: SpotService,
    private binanceService: BinanceService,
  ) {}

  @Get('balances')
  async getBalances() {
    return await this.binanceService.getSpotBalances().then((result) => {
      this.spotService.insertSpotBalances(result);
      return result;
    });
  }
}
