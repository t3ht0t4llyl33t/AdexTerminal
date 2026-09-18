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
  { id: 'dedust', label: 'DeDust TWA', url: 'https://t.me/dedustBot' },
  { id: 'stonfi', label: 'STON.fi TWA', url: 'https://t.me/STONfi_bot' },
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
  if (network === 'TON') {
    if (settings.ton_service === 'stonfi') {
      return `https://t.me/STONfi_bot?start=swap_${tokenAddress}`;
    }
    return `https://t.me/dedustBot?start=swap_${tokenAddress}`;
  }

  // EVM chains (BSC, BASE)
  const evm = settings.evm_service;
  if (evm === 'maestro') {
    return `https://t.me/MaestroSniperBot?start=r-${MAESTRO_REFERRAL_ID}-${tokenAddress}`;
  }
  return `https://t.me/BananaGun_bot?start=${BANANA_REFERRAL_ID}-evm_${tokenAddress}`;
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
