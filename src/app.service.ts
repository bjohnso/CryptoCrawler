import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BinanceService } from './binance/binance.service';
import { MarketsService } from './markets/markets.service';
import { StrategyService } from './strategy/strategy.service';
import { EntryRecipeDto } from './dtos/entry-recipe.dto';

@Injectable()
export class AppService {
  private activeChronJobs = {
    pollMarketInfo: false,
    pollKlines: false,
    trade: false,
  };

  constructor(
    private binanceService: BinanceService,
    private marketService: MarketsService,
    private strategyService: StrategyService,
  ) {}

  private recipes = [
    new EntryRecipeDto('BTCUSDT', 0.02, 50, 2),
    new EntryRecipeDto('ETHUSDT', 0.2, 50, 2),
    new EntryRecipeDto('XMRUSDT', 2, 50, 2),
    new EntryRecipeDto('BNBUSDT', 2, 50, 2),
    new EntryRecipeDto('COMPUSDT', 2, 50, 2),
    new EntryRecipeDto('DASHUSDT', 2, 50, 2),
    new EntryRecipeDto('KSMUSDT', 2, 50, 2),
    new EntryRecipeDto('EGLDUSDT', 2, 50, 2),
    new EntryRecipeDto('ICPUSDT', 2, 50, 2),
    new EntryRecipeDto('AXSUSDT', 2, 50, 2),
    new EntryRecipeDto('UNIUSDT', 20, 50, 3),
    new EntryRecipeDto('DOTUSDT', 20, 50, 3),
    new EntryRecipeDto('SOLUSDT', 20, 50, 3),
    new EntryRecipeDto('LINKUSDT', 20, 50, 3),
    new EntryRecipeDto('LUNAUSDT', 20, 50, 3),
    new EntryRecipeDto('SNXUSDT', 20, 50, 3),
    new EntryRecipeDto('SRMUSDT', 20, 50, 3),
    new EntryRecipeDto('THETAUSDT', 20, 50, 3),
    new EntryRecipeDto('XRPUSDT', 200, 50, 3),
    new EntryRecipeDto('MATICUSDT', 200, 50, 3),
    new EntryRecipeDto('GRTUSDT', 200, 50, 3),
    new EntryRecipeDto('COTIUSDT', 200, 50, 3),
    new EntryRecipeDto('1INCHUSDT', 200, 50, 3),
    new EntryRecipeDto('SUSHIUSDT', 200, 50, 3),
    new EntryRecipeDto('ADAUSDT', 200, 50, 3),
    new EntryRecipeDto('RUNEUSDT', 200, 50, 3),
    new EntryRecipeDto('MANAUSDT', 200, 50, 3),
    new EntryRecipeDto('ENJUSDT', 200, 50, 3),
    new EntryRecipeDto('HOTUSDT', 2000, 50, 4),
    new EntryRecipeDto('VETUSDT', 2000, 50, 4),
    new EntryRecipeDto('DOGEUSDT', 2000, 50, 4),
    new EntryRecipeDto('1000SHIBUSDT', 2000, 50, 4),
    new EntryRecipeDto('ANKRUSDT', 2000, 50, 4),
  ];

  @Cron(CronExpression.EVERY_HOUR, {
    name: 'pollMarketInfo',
  })
  private async pollMarketInfo() {
    if (this.activeChronJobs.pollMarketInfo) {
      return;
    }

    try {
      this.activeChronJobs.pollMarketInfo = true;

      console.log('Polling Market Info...', Date.now());

      const marketInfo = await this.binanceService.getExchangeInfo();
      const symbols = marketInfo.symbols.filter((symbol) =>
        symbol.symbol.includes('USDT'),
      );

      await this.marketService.deleteAllSymbolInfos();
      await this.marketService.insertSymbolInfos(symbols);

      console.log('Polling Market Info Complete!', Date.now());
    } catch (e) {
      console.log('Something went horribly wrong', e);
    }
    this.activeChronJobs.pollMarketInfo = false;
  }

  @Cron(CronExpression.EVERY_5_MINUTES, {
    name: 'pollKlines',
  })
  private async pollKlines() {
    if (
      this.activeChronJobs.pollMarketInfo ||
      this.activeChronJobs.pollKlines
    ) {
      return;
    }

    try {
      this.activeChronJobs.pollKlines = true;

      console.log('Polling Klines...', Date.now());

      const marketInfo = await this.binanceService.getExchangeInfo();
      const symbols = marketInfo.symbols.filter((symbol) =>
        symbol.symbol.includes('USDT'),
      );

      await this.marketService.deleteAllSymbolInfos();
      await this.marketService.insertSymbolInfos(symbols);

      for (const symbol of symbols) {
        const klines = await this.binanceService.getKLines(
          symbol.symbol,
          '1d',
          null,
          null,
          500,
        );
        await this.marketService.insertKlines(klines);
      }
      console.log('Polling Klines Complete!', Date.now());
    } catch (e) {
      console.log('Something went horribly wrong', e);
    }
    this.activeChronJobs.pollKlines = false;
  }

  @Cron(CronExpression.EVERY_MINUTE, {
    name: 'trade',
  })
  private async trade() {
    for (const chron in this.activeChronJobs) {
      if (this.activeChronJobs[chron]) {
        return;
      }
    }

    try {
      this.activeChronJobs.trade = true;

      console.log('Trading...', Date.now());

      for (const recipe of this.recipes) {
        const canEnter = await this.manageActiveOrders(recipe);

        if (canEnter) {
          const entries = await this.strategyService.getHeikenCloudEntries(
            recipe.symbol,
            Date.now(),
            2,
            this.strategyService.STRATEGY_BULLISH_ENTRY,
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
              recipe.maxPrecision,
            );

            console.log('NEW BUY', buyOrder);

            const stopOrder = await this.binanceService.newStopMarket(
              recipe.symbol,
              recipe.quantity,
              stop,
              recipe.maxPrecision,
            );

            console.log('NEW STOP', stopOrder);

            for (let i = 0; i < profitPoints.length; i++) {
              const takeProfitOrder =
                await this.binanceService.newTakeProfitMarket(
                  recipe.symbol,
                  recipe.quantity / profitPoints.length,
                  Number(profitPoints[i]),
                  recipe.maxPrecision,
                );

              console.log('NEW TAKE PROFIT', takeProfitOrder);
            }
          }
        }
      }
      console.log('Trading Complete!', Date.now());
    } catch (e) {
      console.log('Something went horribly wrong', e);
    }
    this.activeChronJobs.trade = false;
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
        recipe.maxPrecision,
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
