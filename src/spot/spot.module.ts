import { Module } from '@nestjs/common';
import { SpotController } from './spot.controller';
import { SpotService } from './spot.service';
import { BinanceModule } from '../binance/binance.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpotBalanceDto } from '../dtos/spot-balance-dto';

@Module({
  imports: [BinanceModule, TypeOrmModule.forFeature([SpotBalanceDto])],
  controllers: [SpotController],
  providers: [SpotService],
})
export class SpotModule {}
