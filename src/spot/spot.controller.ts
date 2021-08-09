import { Controller, Get } from '@nestjs/common';
import { SpotService } from './spot.service';
import { BinanceService } from '../binance/binance.service';

@Controller('spot')
export class SpotController {
  constructor(
    private spotService: SpotService,
    private binanceService: BinanceService,
  ) {}
}
