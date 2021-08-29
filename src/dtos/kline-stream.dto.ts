export class KlineStreamDto {
  t: number; // Kline start time
  T: number; // Kline close time
  i: string; // Interval
  f: number; // First trade ID
  L: number; // Last trade ID" +
  o: string; // Open price
  c: string; // Close price
  h: string; // High price
  l: string; // Low price
  v: string; // volume
  n: number; // Number of trades
  x: boolean; // Is this kline closed?
  q: string; // Quote asset volume
  V: string; // Taker buy volume
  Q: string; //Taker buy quote asset volume
  B: string; // Ignore
}
