import { HttpService, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as binance_config from '../constants/binance_config.json';
import { SpotAccountInfoDto } from '../dtos/spot-account-info-dto';
import { MarketPriceTickerDto } from '../dtos/market-price-ticker-dto';
import { OrderBookDepthDto } from "../dtos/order-book-depth-dto";

@Injectable()
export class BinanceService {
  constructor(private httpService: HttpService) {}

  // SPOT ACCOUNT

  async getSpotAccountInformation(): Promise<any> {
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
      .then((resp) => resp.data['balances'] as SpotAccountInfoDto[])
      .catch((error) => error);
  }

  // MARKET DATA

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
