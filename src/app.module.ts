import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GraphQLModule } from '@nestjs/graphql';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SpotModule } from './spot/spot.module';
import { BinanceModule } from './binance/binance.module';
import { MarketsModule } from './markets/markets.module';
import { SpotResolver } from './spot/spot.resolver';
import { SpotBalanceDto } from './dtos/spot-balance.dto';
import { KlineDto } from './dtos/kline.dto';
import { ScheduleModule } from '@nestjs/schedule';
import { MarketsService } from './markets/markets.service';
import { StrategyModule } from './strategy/strategy.module';
import { SymbolInfoDto } from './dtos/symbol-info.dto';

@Module({
  imports: [
    SpotModule,
    BinanceModule,
    MarketsModule,
    StrategyModule,
    GraphQLModule.forRoot({
      autoSchemaFile: true,
    }),
    TypeOrmModule.forRoot({
      type: 'mongodb',
      url: 'mongodb://localhost/spot',
      synchronize: false,
      useUnifiedTopology: true,
      useNewUrlParser: true,
      entities: [SpotBalanceDto, KlineDto, SymbolInfoDto],
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService, MarketsService, SpotResolver],
})
export class AppModule {}
