import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BinanceService } from './binance/binance.service';
import { MarketsService } from './markets/markets.service';
import { StrategyService } from './strategy/strategy.service';
import { EntryRecipeDto } from './dtos/entry-recipe.dto';

@Injectable()
export class AppService {
  constructor(
    private binanceService: BinanceService,
    private marketService: MarketsService,
    private strategyService: StrategyService,
  ) {}

  private pairs = [
    new EntryRecipeDto('BTCUSDT', 0.005, 20),
    new EntryRecipeDto('ETHUSDT', 0.05, 20),
    new EntryRecipeDto('UNIUSDT', 5, 20),
    new EntryRecipeDto('1INCHUSDT', 50, 20),
    new EntryRecipeDto('ADAUSDT', 50, 20),
    new EntryRecipeDto('DOTUSDT', 5, 20),
    new EntryRecipeDto('KSMUSDT', 0.5, 20),
    new EntryRecipeDto('SOLUSDT', 5, 20),
    new EntryRecipeDto('XRPUSDT', 50, 20),
    new EntryRecipeDto('LUNAUSDT', 5, 20),
    new EntryRecipeDto('MATICUSDT', 50, 20),
    new EntryRecipeDto('LINKUSDT', 5, 20),
    new EntryRecipeDto('GRTUSDT', 50, 20),
    new EntryRecipeDto('DOGEUSDT', 500, 20),
    new EntryRecipeDto('ANKRUSDT', 500, 20),
    new EntryRecipeDto('RUNEUSDT', 50, 20),
    new EntryRecipeDto('BNBUSDT', 0.5, 20),
  ];

  @Cron(CronExpression.EVERY_MINUTE, {
    name: 'fetchData',
  })
  private async pollKlineData() {
    for (const pair of this.pairs) {
      const klines = await this.binanceService.getKLines(
        pair.symbol,
        '1h',
        null,
        null,
        500,
      );
      await this.marketService.insertKlines(klines);

      if (pair.symbol != 'BTCUSDT') {
        await this.trade(pair);
      }
    }
  }

  private async trade(pair: EntryRecipeDto) {
    const canEnter = await this.manageActiveOrders(pair);

    if (canEnter) {
      const entries = await this.strategyService.getHeikenCloudEntries(
        pair.symbol,
        Date.now(),
        2,
      );

      if (entries.length > 0) {
        const entry = entries[0];
        const stop = Number(entry[1]);
        const profitPoints = entry.slice(2);

        const setLeverage = await this.binanceService.setLeverage(
          pair.symbol,
          pair.leverage,
        );

        console.log('NEW LEVERAGE', setLeverage);

        const buyOrder = await this.binanceService.newBuyMarket(
          pair.symbol,
          pair.quantity,
        );

        console.log('NEW BUY', buyOrder);

        const stopOrder = await this.binanceService.newStopMarket(
          pair.symbol,
          pair.quantity,
          stop,
        );

        console.log('NEW STOP', stopOrder);

        for (let i = 0; i < profitPoints.length; i++) {
          const takeProfitOrder = await this.binanceService.newTakeProfitMarket(
            pair.symbol,
            pair.quantity / profitPoints.length,
            Number(profitPoints[i]),
          );

          console.log('NEW TAKE PROFIT', takeProfitOrder);
        }
      }
    }
  }

  private async manageActiveOrders(pair: EntryRecipeDto) {
    const positions = await this.binanceService.getPositionInformation(
      pair.symbol,
    );

    let activePosition = null;

    for (const position of positions) {
      if (Number(position.positionAmt) > 0) {
        activePosition = position;
        break;
      }
    }

    if (activePosition == null) {
      await this.cleanOpenOrders(pair.symbol);
      return true;
    } else {
      await this.trailStop(
        pair,
        Number(activePosition.entryPrice),
        Number(activePosition.positionAmt),
      );
      return false;
    }
  }

  private async trailStop(
    pair: EntryRecipeDto,
    entryPrice: number,
    quantity: number,
  ) {
    const openOrders = await this.binanceService.getAllOpenOrders(pair.symbol);
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
      6;

    const stopPrice = Number(
      (
        Number(lowestTP.stopPrice) -
        (Number(highestTP.stopPrice) / 100) * (percentageDiff * 4)
      ).toFixed(3),
    );

    if (currentStop == null || Number(currentStop.stopPrice) < stopPrice) {
      if (currentStop != null) {
        await this.binanceService.cancelOrder(
          pair.symbol,
          currentStop.clientOrderId,
        );
      }

      const stopOrder = await this.binanceService.newStopMarket(
        pair.symbol,
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
