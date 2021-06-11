import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WalletsModule } from './wallets/wallets.module';
import { BinanceModule } from './binance/binance.module';
import { MarketsModule } from './markets/markets.module';

@Module({
  imports: [WalletsModule, BinanceModule, MarketsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
