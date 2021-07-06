import { HttpService, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as binance_config from '../constants/binance_config.json';
import { SpotInfoDto } from '../dtos/spot-info.dto';
import { MarketPriceTickerDto } from '../dtos/market-price-ticker.dto';
import { OrderBookDepthDto } from '../dtos/order-book-depth.dto';
import { client as WebSocketClient } from 'websocket';
import { KlineDto } from '../dtos/kline.dto';
import { SpotOrderDto } from '../dtos/spot-order.dto';
import { TradeStreamDto } from '../dtos/trade-stream.dto';

@Injectable()
export class BinanceService {
  constructor(private httpService: HttpService) {}

  private btcTradeStream: TradeStreamDto;

  getBtcPrice() {
    return this.btcTradeStream.p;
  }

  // SPOT

  async getSpotBalances(): Promise<any> {
    const timestamp = Date.now().toString();
    const recvWindow = 5000;

    const params = {
      timestamp,
      recvWindow,
    };

    params['signature'] = this.generateAPISignature(params);

    return await this.httpService
      .get(binance_config.base_url + binance_config.spot_account_information, {
        params,
        headers: { 'X-MBX-APIKEY': binance_config.api_key },
      })
      .toPromise()
      .then((resp) => resp.data['balances'] as SpotInfoDto[])
      .catch((error) => error);
  }

  // MARKET

  async getPriceTicker(symbol: string): Promise<any> {
    const params = { symbol };

    return await this.httpService
      .get(binance_config.base_url + binance_config.current_ticker_price, {
        params,
        headers: { 'X-MBX-APIKEY': binance_config.api_key },
      })
      .toPromise()
      .then((resp) => resp.data as MarketPriceTickerDto)
      .catch((error) => error);
  }

  async getOrderBookDepth(symbol: string, limit: number): Promise<any> {
    const params = { symbol, limit };

    return await this.httpService
      .get(binance_config.base_url + binance_config.order_book_depth, {
        params,
        headers: { 'X-MBX-APIKEY': binance_config.api_key },
      })
      .toPromise()
      .then((resp) => resp.data as OrderBookDepthDto)
      .catch((error) => error);
  }

  async getKLines(
    symbol: string,
    interval: string,
    startTime: number,
    endTime: number,
    limit: number,
  ) {
    const params = { symbol, interval, startTime, endTime, limit };

    return this.httpService
      .get(binance_config.base_url + binance_config.klines, {
        params,
        headers: { 'X-MBX-APIKEY': binance_config.api_key },
      })
      .toPromise()
      .then((resp) => {
        return resp.data.map((kline) => new KlineDto(symbol, kline));
      })
      .catch((error) => error);
  }

  // SPOT TRADE

  async spotMarketOrder(symbol: string, quantity: number) {
    const timestamp = Date.now().toString();
    const recvWindow = 5000;
    const side = 'BUY';
    const type = 'MARKET';

    const params = {
      symbol,
      side,
      type,
      quantity,
      timestamp,
      recvWindow,
    };

    params['signature'] = this.generateAPISignature(params);

    return await this.httpService
      .get(binance_config.base_url + binance_config.new_order, {
        params,
        headers: { 'X-MBX-APIKEY': binance_config.api_key },
      })
      .toPromise()
      .then((resp) => resp.data as SpotOrderDto)
      .catch((error) => error);
  }

  // STREAM

  openTradeStream() {
    const client = new WebSocketClient();

    client.on('connect', (connection) => {
      console.log('Websocket Client Connected!');

      connection.on('close', () => {
        console.log('Websocket Client Connection Closed!');
        this.openTradeStream();
      });

      connection.on('message', (message) => {
        this.btcTradeStream = JSON.parse(message.utf8Data) as TradeStreamDto;
      });
    });

    client.on('connectFailed', (err) => {
      console.log(err);
      this.openTradeStream();
    });

    client.connect(`${binance_config.base_url_stream}/ws/btcusdt@trade`);
  }

  // API

  generateAPISignature(params: Record<string, unknown>) {
    let digestString = '';
    const keys = Object.keys(params);

    for (let i = 0; i < keys.length; i++) {
      digestString += keys[i] + '=' + params[keys[i]];
      if (i < keys.length - 1) {
        digestString += '&';
      }
    }

    return crypto
      .createHmac('sha256', binance_config.api_secret)
      .update(digestString)
      .digest('hex');
  }
}
