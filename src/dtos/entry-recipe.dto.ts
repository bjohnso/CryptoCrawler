export class EntryRecipeDto {
  constructor(symbol: string, quantity: number, leverage: number) {
    this.symbol = symbol;
    this.quantity = quantity;
    this.leverage = leverage;
  }
  symbol: string;
  quantity: number;
  leverage: number;
  pricePrecision: number;
  quantityPrecision: number;
}
