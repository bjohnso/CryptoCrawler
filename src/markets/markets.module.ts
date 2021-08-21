import { Module } from '@nestjs/common';
import { MarketsController } from './markets.controller';
import { MarketsService } from './markets.service';
import { BinanceModule } from '../binance/binance.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KlineDto } from '../dtos/kline.dto';
import { SymbolInfoDto } from '../dtos/symbol-info.dto';

@Module({
  imports: [BinanceModule, TypeOrmModule.forFeature([KlineDto, SymbolInfoDto])],
  controllers: [MarketsController],
  providers: [MarketsService],
  exports: [
    MarketsService,
    TypeOrmModule.forFeature([KlineDto, SymbolInfoDto]),
  ],
})
export class MarketsModule {}
