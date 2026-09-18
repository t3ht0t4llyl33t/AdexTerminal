export interface RawTrade {
  kind: 'buy' | 'sell';
  usd: number;
  ts: number;
  txHash: string;
  walletAddress: string;
  tokenAmount: number;
  nativeAmount: number;
}

export interface FilteredTrade extends RawTrade {
  priceImpact: number;
}

export const WHALE_THRESHOLD_USD = 3_000;
export const ANTI_MEV_WINDOW_MS = 60_000;
export const WASH_TRADING_COOLDOWN_MS = 10 * 60_000;
export const MIN_PRICE_IMPACT = 0.005;

/**
 * Price impact of a trade relative to the previous trade of the same pool.
 * Free GeckoTerminal /trades responses carry no price_impact_percent field,
 * so the impact is derived from the trade price (usd / token amount) shift.
 */
function priceImpactAt(trades: RawTrade[], index: number): number {
  const trade = trades[index];
  if (trade.usd <= 0 || trade.tokenAmount <= 0) return 0;
  const price = trade.usd / trade.tokenAmount;
  for (let j = index - 1; j >= 0; j--) {
    const prev = trades[j];
    if (prev.usd <= 0 || prev.tokenAmount <= 0) continue;
    const prevPrice = prev.usd / prev.tokenAmount;
    if (prevPrice > 0) return Math.abs(price - prevPrice) / prevPrice;
  }
  return 0;
}

/**
 * Filters raw pool trades into the whale feed. Drops:
 * - trades below WHALE_THRESHOLD_USD ($3,000 by default),
 * - MEV/arbitrage round-trips: same wallet buying AND selling the same
 *   token within 60 seconds — both legs are removed,
 * - wash-trading wallets: a wallet caught round-tripping is muted for
 *   10 minutes and all its trades are ignored inside that window,
 * - low-impact trades that moved the pool price by less than 0.5%.
 */
export function filterWhaleTrades(raw: RawTrade[]): FilteredTrade[] {
  const trades = [...raw].sort((a, b) => a.ts - b.ts);
  const impacts = trades.map((_, i) => priceImpactAt(trades, i));

  const mevHashes = new Set<string>();
  const mutedWallets = new Map<string, number>();

  const aboveThreshold = trades
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => t.usd >= WHALE_THRESHOLD_USD);

  for (let a = 0; a < aboveThreshold.length; a++) {
    const first = aboveThreshold[a];
    for (let b = a + 1; b < aboveThreshold.length; b++) {
      const second = aboveThreshold[b];
      if (second.t.ts - first.t.ts > ANTI_MEV_WINDOW_MS) break;
      if (second.t.walletAddress !== first.t.walletAddress) continue;
      if (second.t.kind === first.t.kind) continue;
      mevHashes.add(first.t.txHash);
      mevHashes.add(second.t.txHash);
      const wallet = first.t.walletAddress;
      mutedWallets.set(
        wallet,
        Math.max(mutedWallets.get(wallet) ?? 0, second.t.ts + WASH_TRADING_COOLDOWN_MS),
      );
    }
  }

  const result: FilteredTrade[] = [];
  for (let i = 0; i < trades.length; i++) {
    const trade = trades[i];
    if (trade.usd < WHALE_THRESHOLD_USD) continue;
    if (mevHashes.has(trade.txHash)) continue;
    const mutedUntil = mutedWallets.get(trade.walletAddress);
    if (mutedUntil !== undefined && trade.ts < mutedUntil) continue;
    if (impacts[i] < MIN_PRICE_IMPACT) continue;
    result.push({ ...trade, priceImpact: impacts[i] });
  }
  return result;
}
