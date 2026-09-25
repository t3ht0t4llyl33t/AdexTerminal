import type { Network } from './types';
import { validateTonAddress } from './ton-scanner';

export type TonService = 'dedust' | 'stonfi';
export type EvmService = 'maestro';

const EVM_ADDRESS_RE = /^0x[a-f0-9]{40}$/i;

export interface TradeSettings {
  ton_service: TonService;
  evm_service: EvmService;
}

export const DEFAULT_TRADE_SETTINGS: TradeSettings = {
  ton_service: 'dedust',
  evm_service: 'maestro',
};

const MAESTRO_REFERRAL_ID = '44678c3f';

export const TON_SERVICES: { id: TonService; label: string; url: string }[] = [
  { id: 'dedust', label: 'DeDust', url: 'https://dedust.io/' },
  { id: 'stonfi', label: 'STON.fi', url: 'https://app.ston.fi/' },
];

export const EVM_SERVICES: { id: EvmService; label: string; url: string }[] = [
  { id: 'maestro', label: 'Maestro Sniper Bot', url: `https://t.me/MaestroSniperBot?start=${MAESTRO_REFERRAL_ID}` },
];

export function isValidTokenAddress(network: Network, tokenAddress: string): boolean {
  if (!tokenAddress) return false;
  if (network === 'TON') {
    return validateTonAddress(tokenAddress).ok;
  }
  return EVM_ADDRESS_RE.test(tokenAddress.trim());
}

export function isValidTokenAddressAny(tokenAddress: string): boolean {
  if (!tokenAddress) return false;
  if (validateTonAddress(tokenAddress).ok) return true;
  return EVM_ADDRESS_RE.test(tokenAddress.trim());
}

export function buildTradeLink(
  network: Network,
  tokenAddress: string,
  settings: TradeSettings,
): string | null {
  if (!isValidTokenAddress(network, tokenAddress)) return null;
  const addr = encodeURIComponent(tokenAddress.trim());

  if (network === 'TON') {
    if (settings.ton_service === 'stonfi') {
      return `https://app.ston.fi/swap?chartVisible=false&ft=TON&tt=${addr}`;
    }
    return `https://dedust.io/swap/TON/${addr}`;
  }

  return `https://t.me/MaestroSniperBot?start=${addr}-${MAESTRO_REFERRAL_ID}`;
}

export function getServiceBotUrl(settings: TradeSettings, isEvm: boolean): string {
  if (isEvm) {
    return `https://t.me/MaestroSniperBot?start=${MAESTRO_REFERRAL_ID}`;
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

export function openTradeLink(url: string): void {
  if (typeof window === 'undefined') return;

  const tg = (window as unknown as {
    Telegram?: {
      WebApp?: {
        openTelegramLink?: (url: string) => void;
        openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
      };
    };
  }).Telegram;

  const isTelegramLink = url.startsWith('https://t.me/') || url.startsWith('tg://');

  if (isTelegramLink && tg?.WebApp?.openTelegramLink) {
    tg.WebApp.openTelegramLink(url);
  } else if (!isTelegramLink && tg?.WebApp?.openLink) {
    tg.WebApp.openLink(url, { try_instant_view: true });
  } else {
    window.open(url, '_blank');
  }
}
