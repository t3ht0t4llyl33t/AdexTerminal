import { filterWhaleTrades, WHALE_THRESHOLD_USD, type RawTrade } from '../lib/whale-filters';

const T = 1_700_000_000_000;
const mk = (
  kind: 'buy' | 'sell',
  usd: number,
  ts: number,
  wallet: string,
  tokens: number,
  hash: string,
): RawTrade => ({ kind, usd, ts, txHash: hash, walletAddress: wallet, tokenAmount: tokens, nativeAmount: 1 });

// Same pool -> token price stays near $10; impact = |price - prev.price| / prev.price
const trades: RawTrade[] = [
  mk('buy', 4000, T, '0xWHALE', 400, '0x1'),          // first trade: no prev price -> dropped
  mk('buy', 3500, T + 1000, '0xSMALLPRICE', 349.65, '0x2'), // impact 0.1% -> dropped
  mk('buy', 2500, T + 2000, '0xNOBODY', 250, '0x3'),   // below $3k -> dropped
  mk('sell', 4100, T + 30_000, '0xSELLER', 405.94, '0x4'), // impact 0.9% -> kept
  mk('buy', 5000, T + 40_000, '0xMEV', 500, '0x5'),    // MEV round-trip...
  mk('sell', 5050, T + 70_000, '0xMEV', 500.0, '0x6'),  // ...both legs dropped, wallet muted
  mk('buy', 6000, T + 200_000, '0xMEV', 600, '0x7'),   // muted wallet -> dropped
  mk('buy', 3300, T + 300_000, '0xCLEAN', 320, '0x8'), // price 10.31 vs muted bot's 10 -> ~3% impact -> kept
  mk('sell', 3300, T + 400_000, '0xCLEAN', 300, '0x9'),// impact 10%, 100s after 0x8 (no MEV) -> kept
];

const kept = filterWhaleTrades(trades);
const keptHashes = kept.map((t) => t.txHash);
console.log('kept:', keptHashes.join(','));

console.assert(!keptHashes.includes('0x1'), '0x1 first trade (no prev price) dropped');
console.assert(!keptHashes.includes('0x2'), '0x2 low price impact dropped');
console.assert(!keptHashes.includes('0x3'), '0x3 below $3k dropped');
console.assert(keptHashes.includes('0x4'), '0x4 sell with 0.9% impact kept');
console.assert(!keptHashes.includes('0x5') && !keptHashes.includes('0x6'), 'MEV round-trip both legs dropped');
console.assert(!keptHashes.includes('0x7'), 'wash wallet muted 10min -> later trade dropped');
console.assert(keptHashes.includes('0x8') && keptHashes.includes('0x9'), 'clean wallet trades kept');
console.assert(WHALE_THRESHOLD_USD === 3000, 'threshold is $3,000');

const tx4 = kept.find((t) => t.txHash === '0x4');
console.assert(tx4 !== undefined && tx4.priceImpact >= 0.005 && tx4.priceImpact < 0.02, 'kept trade reports its price impact');

// Empty and single-trade inputs must not throw
console.assert(filterWhaleTrades([]).length === 0, 'empty input ok');
console.assert(filterWhaleTrades([mk('buy', 10_000, T, '0xA', 1000, '0xS')]).length === 0, 'single trade has no prev price -> conservatively dropped');

// Round-trip beyond 60s must NOT be treated as MEV
const slow = [
  mk('buy', 10_000, T, '0xD', 1000, '0xD1'),
  mk('sell', 10_100, T + 120_000, '0xD', 1000, '0xD2'), // 120s apart -> kept if impact ok
];
const slowKept = filterWhaleTrades(slow);
console.assert(slowKept.length === 1 && slowKept[0].txHash === '0xD2', 'slow round-trip not flagged as MEV (first still lacks prev price)');

console.log('all filter tests passed');
