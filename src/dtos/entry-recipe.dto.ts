export class EntryRecipeDto {
  constructor(
    symbol: string,
    quantity: number,
    leverage: number,
    maxPrecision: number,
  ) {
    this.symbol = symbol;
    this.quantity = quantity;
    this.leverage = leverage;
    this.maxPrecision = maxPrecision;
  }
  symbol: string;
  quantity: number;
  leverage: number;
  maxPrecision: number;
}
