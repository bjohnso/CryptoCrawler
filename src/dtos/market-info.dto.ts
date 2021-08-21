import { SymbolInfoDto } from './symbol-info.dto';

export class MarketInfoDto {
  exchangeFilters: [];
  rateLimits: [];
  serverTime: number;
  assets: [];
  symbols: SymbolInfoDto[];
  timezone: string;
}
