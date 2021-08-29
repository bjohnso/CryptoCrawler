import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { BinanceService } from './binance/binance.service';
import { MarketsService } from './markets/markets.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Crypto Scalper')
    .setDescription('The Crypto Scalper API description')
    .setVersion('1.0')
    .addTag('crypto_scalper')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);

  const binanceService = app.get(BinanceService);
  const marketsService = app.get(MarketsService);

  const marketInfo = await binanceService.getExchangeInfo();
  const symbols = marketInfo.symbols.filter((symbol) =>
    symbol.symbol.includes('USDT'),
  );

  await marketsService.deleteAllSymbolInfos();
  await marketsService.insertSymbolInfos(symbols);

  binanceService.openKlineStream(
    symbols.map((symbol) => symbol.symbol.toLowerCase()),
    '1h',
  );

  binanceService.openKlineStream(
    symbols.map((symbol) => symbol.symbol.toLowerCase()),
    '4h',
  );
}
bootstrap().then((r) => r);
