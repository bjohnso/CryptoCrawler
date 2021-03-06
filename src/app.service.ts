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
    pollKlinesHistory: false,
    trade: false,
  };

  constructor(
    private binanceService: BinanceService,
    private marketService: MarketsService,
    private strategyService: StrategyService,
  ) {}

  private intervals = ['1h', '4h'];
  private recipes = [
    new EntryRecipeDto('BTCUSDT', 0.1, 50),
    new EntryRecipeDto('ETHUSDT', 1, 50),
    new EntryRecipeDto('XMRUSDT', 10, 50),
    new EntryRecipeDto('BNBUSDT', 10, 50),
    new EntryRecipeDto('AAVEUSDT', 10, 50),
    new EntryRecipeDto('COMPUSDT', 10, 50),
    new EntryRecipeDto('DASHUSDT', 10, 50),
    new EntryRecipeDto('KSMUSDT', 10, 50),
    new EntryRecipeDto('EGLDUSDT', 10, 50),
    new EntryRecipeDto('ICPUSDT', 10, 50),
    new EntryRecipeDto('AXSUSDT', 10, 50),
    new EntryRecipeDto('UNIUSDT', 100, 50),
    new EntryRecipeDto('DOTUSDT', 100, 50),
    new EntryRecipeDto('SOLUSDT', 100, 50),
    new EntryRecipeDto('AXSUSDT', 100, 50),
    new EntryRecipeDto('AVAXUSDT', 100, 50),
    new EntryRecipeDto('LINKUSDT', 100, 50),
    new EntryRecipeDto('LUNAUSDT', 100, 50),
    new EntryRecipeDto('SNXUSDT', 100, 50),
    new EntryRecipeDto('SRMUSDT', 100, 50),
    new EntryRecipeDto('THETAUSDT', 100, 50),
    new EntryRecipeDto('XRPUSDT', 500, 50),
    new EntryRecipeDto('MATICUSDT', 500, 50),
    new EntryRecipeDto('GRTUSDT', 500, 50),
    new EntryRecipeDto('COTIUSDT', 500, 50),
    new EntryRecipeDto('1INCHUSDT', 500, 50),
    new EntryRecipeDto('SUSHIUSDT', 500, 50),
    new EntryRecipeDto('ADAUSDT', 500, 50),
    new EntryRecipeDto('RUNEUSDT', 500, 50),
    new EntryRecipeDto('MANAUSDT', 500, 50),
    new EntryRecipeDto('ENJUSDT', 500, 50),
    new EntryRecipeDto('FTMUSDT', 1000, 50),
    new EntryRecipeDto('HOTUSDT', 1000, 50),
    new EntryRecipeDto('VETUSDT', 1000, 50),
    new EntryRecipeDto('DOGEUSDT', 1000, 50),
    new EntryRecipeDto('1000SHIBUSDT', 1000, 50),
    new EntryRecipeDto('ANKRUSDT', 1000, 50),
    new EntryRecipeDto('BLZUSDT', 1000, 50),
    new EntryRecipeDto('LINAUSDT', 10000, 50),
    new EntryRecipeDto('REEFUSDT', 10000, 50),
    new EntryRecipeDto('BTTUSDT', 10000, 50),
  ];

  @Cron(CronExpression.EVERY_4_HOURS, {
    name: 'pollMarketInfo',
  })
  private async pollMarketInfo() {
    if (this.activeChronJobs.pollMarketInfo) {
      return;
    }
    this.activeChronJobs.pollMarketInfo = true;

    console.log('Polling Market Info...', Date.now());

    try {
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

  @Cron(CronExpression.EVERY_MINUTE, {
    name: 'pollKlines',
  })
  private async pollKlines() {
    if (
      this.activeChronJobs.pollKlines ||
      this.activeChronJobs.pollKlinesHistory
    ) {
      return;
    }
    this.activeChronJobs.pollKlines = true;

    try {
      console.log('Polling Klines...', Date.now());
      const klinesStream = this.binanceService.getKlineStream();
      const klines = [];

      for (const pair in klinesStream) {
        klines.push(klinesStream[pair]);
      }

      await this.marketService.insertKlines(klines);
      console.log('Polling Klines Complete!', Date.now());
    } catch (e) {
      console.log('Something went horribly wrong', e);
    }

    this.activeChronJobs.pollKlines = false;
  }

  @Cron(CronExpression.EVERY_5_MINUTES, {
    name: 'trade',
  })
  private async trade() {
    if (
      this.activeChronJobs.pollKlinesHistory ||
      this.activeChronJobs.pollMarketInfo
    ) {
      return;
    }

    this.activeChronJobs.trade = true;

    try {
      console.log('Trading...', Date.now());

      for (const recipe of this.recipes) {
        const symbolInfo = await this.marketService.getSymbol(recipe.symbol);

        if (symbolInfo != null) {
          recipe.quantityPrecision = Number(symbolInfo.quantityPrecision);
          recipe.pricePrecision = Number(symbolInfo.pricePrecision);

          const canEnter = await this.manageActiveOrders(recipe);

          try {
            if (canEnter) {
              const entries = await this.strategyService.getHeikenCloudEntries(
                recipe.symbol,
                '4h',
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
                  recipe.quantityPrecision,
                );

                console.log('NEW BUY', buyOrder);

                const stopOrder = await this.binanceService.newStopMarket(
                  recipe.symbol,
                  recipe.quantity,
                  stop,
                  recipe.pricePrecision,
                  recipe.quantityPrecision,
                );

                console.log('NEW STOP', stopOrder);

                for (let i = 0; i < profitPoints.length; i++) {
                  const takeProfitOrder =
                    await this.binanceService.newTakeProfitMarket(
                      recipe.symbol,
                      recipe.quantity / profitPoints.length,
                      Number(profitPoints[i]),
                      recipe.pricePrecision,
                      recipe.quantityPrecision,
                    );

                  console.log('NEW TAKE PROFIT', takeProfitOrder);
                }
              }
            }
          } catch (e) {
            console.log('Something went horribly wrong', e);
          }
        }
      }
      console.log('Trading Complete!', Date.now());
    } catch (e) {
      console.log('Something went horribly wrong', e);
    }

    this.activeChronJobs.trade = false;
  }

  @Cron(CronExpression.EVERY_HOUR, {
    name: 'pollKlinesHistory',
  })
  private async pollKlinesHistory() {
    this.activeChronJobs.pollKlinesHistory = true;

    if (this.activeChronJobs.pollMarketInfo) {
      return;
    }

    console.log('Polling Klines History...', Date.now());

    try {
      const symbols = await this.marketService.getSymbols();
      for (const symbol of symbols) {
        for (const interval of this.intervals) {
          const klines = await this.binanceService.getKLines(
            symbol.symbol,
            interval,
            null,
            null,
            500,
          );
          await this.marketService.insertKlines(klines);
        }
      }
      console.log('Polling Klines History Complete!', Date.now());
    } catch (e) {
      console.log('Something went horribly wrong', e);
    }

    this.activeChronJobs.pollKlinesHistory = false;
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
      ).toFixed(recipe.pricePrecision),
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
        recipe.pricePrecision,
        recipe.quantityPrecision,
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
