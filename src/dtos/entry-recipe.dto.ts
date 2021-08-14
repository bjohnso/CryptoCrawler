export class EntryRecipeDto {
  constructor(symbol: string, quantity: number) {
    this.symbol = symbol;
    this.quantity = quantity;
  }
  symbol: string;
  quantity: number;
}
