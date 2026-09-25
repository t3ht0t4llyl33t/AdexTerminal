export type Network = 'TON' | 'BSC' | 'BASE';

export type NetworkFilter = 'ALL' | Network;

export type NetworkSelection = Network[];

export type Language = 'RU' | 'EN';

export type TabId = 'radar' | 'whales' | 'scanner' | 'profile' | 'partners';

export interface TokenRow {
  id: string;
  symbol: string;
  name: string;
  address: string;
  network: Network;
  volume24h: number;
  volumeSpike15m: number;
  buyPressure15m: number;
  sellPressure15m: number;
  whaleSellVolume15m: number;
  whaleBuyVolume15m: number;
  lpLocked: boolean;
  devCluster: boolean;
  liquidity: number;
  price: number;
  priceChange24h: number;
}

export interface WhaleAlert {
  id: string;
  tokenSymbol: string;
  network: Network;
  type: 'buy' | 'sell';
  amountUsd: number;
  amountTokens: number;
  nativeAmount: number;
  nativeCurrency: string;
  timestamp: number;
  txHash: string;
  walletAddress: string;
  walletLabel: string;
  crossChainWallet: boolean;
  insiderDistribution: boolean;
  tokenAddress: string;
}

export type TonMintStatus = 'not_mintable' | 'mintable' | 'unknown';
export type TonOwnerStatus = 'renounced' | 'active_admin' | 'unknown';

export interface TonSafetyDetails {
  score: number;
  mintStatus: TonMintStatus;
  ownerStatus: TonOwnerStatus;
  lpTotalUsd: number;
  lpDexList: string[];
  nonSystemTopHolderPct: number;
  jettonAgeDays: number | null;
  verifiedByTonapi: boolean;
}

export interface SecurityScan {
  id: string;
  tokenSymbol: string;
  network: Network;
  address: string;
  lpLocked: boolean;
  lpLockedUntil: string | null;
  lpLockPercent: number;
  devCluster: boolean;
  devClusterSeverity: 'safe' | 'warning' | 'danger';
  devWalletCount: number;
  honeypot: boolean;
  buyTax: number;
  sellTax: number;
  contractVerified: boolean;
  canRenounce: boolean;
  ownerRenounced: boolean;
  totalHolders: number;
  topHolderPercent: number;
  riskScore: number;
  ton?: TonSafetyDetails;
}

export interface AlertConfig {
  id: string;
  type: 'spike' | 'whale-buy';
  threshold: number;
  networks: NetworkFilter[];
  enabled: boolean;
  label: string;
  last_fired_token_id?: string | null;
  last_fired_ts?: number | null;
}

export interface ProSettings {
  radar_min_liquidity: number;
  radar_min_spike: number;
  whale_min_volume: number;
  whale_buys_only: boolean;
}

export interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  pendingPayouts: number;
  totalStars: number;
  referralCode: string;
  referralLink: string;
  referralLinkFallback: string;
  tier: string;
  commissionRate: number;
  isPro: boolean;
}

export interface ApiResponse<T> {
  data: T;
  cached: boolean;
  timestamp: number;
  source: 'cache' | 'live' | 'mock';
}
