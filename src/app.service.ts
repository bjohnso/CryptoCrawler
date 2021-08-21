import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BinanceService } from './binance/binance.service';
import { MarketsService } from './markets/markets.service';
import { StrategyService } from './strategy/strategy.service';
import { EntryRecipeDto } from './dtos/entry-recipe.dto';

@Injectable()
export class AppService {
  private isPolling = false;
  private isTrading = false;

  constructor(
    private binanceService: BinanceService,
    private marketService: MarketsService,
    private strategyService: StrategyService,
  ) {}

  private recipes = [
    new EntryRecipeDto('BTCUSDT', 0.01, 50, 2),
    new EntryRecipeDto('ETHUSDT', 0.1, 50, 2),
    new EntryRecipeDto('XMRUSDT', 1, 50, 3),
    new EntryRecipeDto('BNBUSDT', 1, 50, 3),
    new EntryRecipeDto('DASHUSDT', 1, 50, 3),
    new EntryRecipeDto('KSMUSDT', 1, 50, 3),
    new EntryRecipeDto('EGLDUSDT', 1, 50, 3),
    new EntryRecipeDto('ICPUSDT', 1, 50, 3),
    new EntryRecipeDto('AXSUSDT', 1, 50, 3),
    new EntryRecipeDto('UNIUSDT', 10, 50, 3),
    new EntryRecipeDto('DOTUSDT', 10, 50, 3),
    new EntryRecipeDto('SOLUSDT', 10, 50, 3),
    new EntryRecipeDto('LINKUSDT', 10, 50, 3),
    new EntryRecipeDto('LUNAUSDT', 10, 50, 3),
    new EntryRecipeDto('SNXUSDT', 10, 50, 3),
    new EntryRecipeDto('SRMUSDT', 10, 50, 3),
    new EntryRecipeDto('THETAUSDT', 10, 50, 3),
    new EntryRecipeDto('XRPUSDT', 100, 50, 3),
    new EntryRecipeDto('MATICUSDT', 100, 50, 3),
    new EntryRecipeDto('GRTUSDT', 100, 50, 3),
    new EntryRecipeDto('COTIUSDT', 100, 50, 3),
    new EntryRecipeDto('1INCHUSDT', 100, 50, 3),
    new EntryRecipeDto('SUSHIUSDT', 100, 50, 3),
    new EntryRecipeDto('ADAUSDT', 100, 50, 3),
    new EntryRecipeDto('RUNEUSDT', 100, 50, 3),
    new EntryRecipeDto('MANAUSDT', 100, 50, 3),
    new EntryRecipeDto('ENJUSDT', 100, 50, 3),
    new EntryRecipeDto('HOTUSDT', 1000, 50, 3),
    new EntryRecipeDto('VETUSDT', 1000, 50, 3),
    new EntryRecipeDto('DOGEUSDT', 1000, 50, 3),
    new EntryRecipeDto('1000SHIBUSDT', 1000, 50, 3),
    new EntryRecipeDto('ANKRUSDT', 1000, 50, 3),
  ];

  @Cron(CronExpression.EVERY_5_MINUTES, {
    name: 'pollData',
  })
  private async pollMarketData() {
    if (this.isPolling) {
      return;
    }

    try {
      this.isPolling = true;

      console.log('Polling data...', Date.now());

      const marketInfo = await this.binanceService.getExchangeInfo();
      const symbols = marketInfo.symbols.filter((symbol) =>
        symbol.symbol.includes('USDT'),
      );

      await this.marketService.deleteAllSymbolInfos();
      await this.marketService.insertSymbolInfos(symbols);

      for (const symbol of symbols) {
        const klines = await this.binanceService.getKLines(
          symbol.symbol,
          '1h',
          null,
          null,
          500,
        );
        await this.marketService.insertKlines(klines);
      }
      console.log('Polling complete!', Date.now());
    } catch (e) {
      console.log('Something went horribly wrong', e);
    }
    this.isPolling = false;
  }

  @Cron(CronExpression.EVERY_MINUTE, {
    name: 'trade',
  })
  private async trade() {
    if (this.isTrading) {
      return;
    }

    try {
      this.isTrading = true;

      console.log('Trading...', Date.now());

      for (const recipe of this.recipes) {
        const canEnter = await this.manageActiveOrders(recipe);

        if (canEnter) {
          const entries = await this.strategyService.getHeikenCloudEntries(
            recipe.symbol,
            Date.now(),
            2,
          );

          if (entries.length > 0) {
            const entry = entries[0];
            const stop = Number(entry[1]);
            const profitPoints = entry.slice(2);

            const setLeverage = await this.binanceService.setLeverage(
              recipe.symbol,
              recipe.leverage,
            );

            console.log('NEW LEVERAGE', setLeverage);

            const buyOrder = await this.binanceService.newBuyMarket(
              recipe.symbol,
              recipe.quantity,
            );

            console.log('NEW BUY', buyOrder);

            const stopOrder = await this.binanceService.newStopMarket(
              recipe.symbol,
              recipe.quantity,
              stop,
            );

            console.log('NEW STOP', stopOrder);

            for (let i = 0; i < profitPoints.length; i++) {
              const takeProfitOrder =
                await this.binanceService.newTakeProfitMarket(
                  recipe.symbol,
                  recipe.quantity / profitPoints.length,
                  Number(profitPoints[i]),
                );

              console.log('NEW TAKE PROFIT', takeProfitOrder);
            }
          }
        }
      }
      console.log('Trading complete!', Date.now());
    } catch (e) {
      console.log('Something went horribly wrong', e);
    }
    this.isTrading = false;
  }

  private async manageActiveOrders(recipe: EntryRecipeDto) {
    const positions = await this.binanceService.getPositionInformation(
      recipe.symbol,
    );

    let activePosition = null;

    for (const position of positions) {
      if (Number(position.positionAmt) > 0) {
        activePosition = position;
        break;
      }
    }

    if (activePosition == null) {
      await this.cleanOpenOrders(recipe.symbol);
      return true;
    } else {
      await this.trailStop(
        recipe,
        Number(activePosition.entryPrice),
        Number(activePosition.positionAmt),
      );
      return false;
    }
  }

  private async trailStop(
    recipe: EntryRecipeDto,
    entryPrice: number,
    quantity: number,
  ) {
    const openOrders = await this.binanceService.getAllOpenOrders(
      recipe.symbol,
    );
    let currentStop = null;
    let lowestTP = null;
    let highestTP = null;

    for (const order of openOrders) {
      if (order.type == 'STOP_MARKET') {
        currentStop = order;
      } else if (order.type == 'TAKE_PROFIT_MARKET') {
        if (
          lowestTP == null ||
          Number(lowestTP.stopPrice) > Number(order.stopPrice)
        ) {
          lowestTP = order;
        }
        if (
          highestTP == null ||
          Number(highestTP.stopPrice) < Number(order.stopPrice)
        ) {
          highestTP = order;
        }
      }
    }

    const percentageDiff =
      (((Number(highestTP.stopPrice) - entryPrice) /
        Number(highestTP.stopPrice)) *
        100) /
      (this.strategyService.NUM_TP_POINTS + 1);

    const stopPrice = Number(
      (
        Number(lowestTP.stopPrice) -
        (Number(highestTP.stopPrice) / 100) * (percentageDiff * 4)
      ).toFixed(recipe.maxPrecision),
    );

    if (currentStop == null || Number(currentStop.stopPrice) < stopPrice) {
      if (currentStop != null) {
        await this.binanceService.cancelOrder(
          recipe.symbol,
          currentStop.clientOrderId,
        );
      }

      const stopOrder = await this.binanceService.newStopMarket(
        recipe.symbol,
        quantity,
        stopPrice,
      );

      console.log('TRAIL STOP', stopOrder);
    }
  }

  private async cleanOpenOrders(symbol: string) {
    const openOrders = await this.binanceService.getAllOpenOrders(symbol);

    for (const order of openOrders) {
      await this.binanceService.cancelOrder(symbol, order.clientOrderId);
    }
  }
}
