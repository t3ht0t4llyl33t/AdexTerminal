import type { Network } from './types';

export type TonService = 'dedust' | 'stonfi';
export type EvmService = 'banana' | 'maestro';

export interface TradeSettings {
  ton_service: TonService;
  evm_service: EvmService;
}

export const DEFAULT_TRADE_SETTINGS: TradeSettings = {
  ton_service: 'dedust',
  evm_service: 'banana',
};

export const TON_SERVICES: { id: TonService; label: string; url: string }[] = [
  { id: 'dedust', label: 'DeDust', url: 'https://dedust.io/' },
  { id: 'stonfi', label: 'STON.fi', url: 'https://app.ston.fi/' },
];

export const EVM_SERVICES: { id: EvmService; label: string; url: string }[] = [
  { id: 'banana', label: 'Banana Gun Bot', url: 'https://t.me/BananaGun_bot' },
  { id: 'maestro', label: 'Maestro Sniper Bot', url: 'https://t.me/MaestroSniperBot' },
];

const MAESTRO_REFERRAL_ID = '44678c3f';
const BANANA_REFERRAL_ID = 'qa9zlCQ2';

export function buildTradeLink(
  network: Network,
  tokenAddress: string,
  settings: TradeSettings,
): string {
  const addr = encodeURIComponent(tokenAddress);

  if (network === 'TON') {
    if (settings.ton_service === 'stonfi') {
      return `https://app.ston.fi/swap?chartVisible=false&ft=TON&tt=${addr}`;
    }
    return `https://dedust.io/swap/TON/${addr}`;
  }

  // EVM chains (BSC, BASE)
  const evm = settings.evm_service;
  if (evm === 'maestro') {
    return `https://t.me/MaestroSniperBot?start=${addr}-${MAESTRO_REFERRAL_ID}`;
  }
  return `https://t.me/BananaGun_bot?start=snipe_${addr}_${BANANA_REFERRAL_ID}`;
}

export function getServiceUrl(settings: TradeSettings, isEvm: boolean): string {
  if (isEvm) {
    return EVM_SERVICES.find((s) => s.id === settings.evm_service)?.url || EVM_SERVICES[0].url;
  }
  return TON_SERVICES.find((s) => s.id === settings.ton_service)?.url || TON_SERVICES[0].url;
}

export function buildExplorerTxLink(network: Network, txHash: string): string {
  if (!txHash) return '#';
  if (network === 'TON') {
    return `https://tonviewer.com/transaction/${txHash}`;
  }
  if (network === 'BSC') {
    return `https://bscscan.com/tx/${txHash}`;
  }
  return `https://basescan.org/tx/${txHash}`;
}
