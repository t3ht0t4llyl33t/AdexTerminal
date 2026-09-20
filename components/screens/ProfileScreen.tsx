'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bell,
  Plus,
  Trash2,
  Wallet,
  Crown,
  Zap,
  TrendingUp,
  Lock,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ArrowRightLeft,
  MessageCircle,
  Sliders,
  Users,
  Sparkles,
  Copy,
  Check,
  Infinity as InfinityIcon,
  Mail,
} from 'lucide-react';
import type { AlertConfig, Language, NetworkFilter } from '@/lib/types';
import { translate } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useTonConnectUI } from '@tonconnect/ui-react';
import {
  DEFAULT_TRADE_SETTINGS,
  TON_SERVICES,
  EVM_SERVICES,
  getServiceUrl,
  type TradeSettings,
  type TonService,
  type EvmService,
} from '@/lib/trade-links';
import { authFetch } from '@/lib/api-client';
import { getTelegramUserIdUnsafe } from '@/lib/telegram-webapp';

interface ProfileScreenProps {
  lang: Language;
  alerts: AlertConfig[];
  onAddAlert: (alert: AlertConfig) => void;
  onDeleteAlert: (id: string) => void;
  onToggleAlert: (id: string) => void;
  isPro: boolean;
  onUpgrade: () => void;
}

const MAX_ALERTS = 2;

const alertTypeIcons: Record<AlertConfig['type'], typeof Zap> = {
  spike: TrendingUp,
  'whale-buy': TrendingUp,
};

export function ProfileScreen({
  lang,
  alerts,
  onAddAlert,
  onDeleteAlert,
  onToggleAlert,
  isPro,
  onUpgrade,
}: ProfileScreenProps) {
  const [tonConnectUI] = useTonConnectUI();
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAlertType, setNewAlertType] = useState<AlertConfig['type']>('spike');
  const [newAlertThreshold, setNewAlertThreshold] = useState(300);
  const [newAlertNetwork, setNewAlertNetwork] = useState<NetworkFilter>('ALL');
  const [openAccordion, setOpenAccordion] = useState<number | null>(null);
  const [tradeSettings, setTradeSettings] = useState<TradeSettings>(DEFAULT_TRADE_SETTINGS);
  const [tradeSettingsLoaded, setTradeSettingsLoaded] = useState(false);
  const [openTradeMenu, setOpenTradeMenu] = useState<'ton' | 'evm' | null>(null);
  const tonMenuRef = useRef<HTMLDivElement>(null);
  const evmMenuRef = useRef<HTMLDivElement>(null);
  const [digestEnabled, setDigestEnabled] = useState(true);

  const thresholdUnit = newAlertType === 'spike'
    ? translate(lang, 'profile.thresholdUnitPct')
    : translate(lang, 'profile.thresholdUnitUsd');

  const thresholdPlaceholder = newAlertType === 'spike' ? 300 : 30000;
  const thresholdMin = newAlertType === 'spike' ? 50 : 3000;
  const thresholdMax = newAlertType === 'spike' ? 1000 : 1000000;

  const handleAdd = () => {
    onAddAlert({
      id: `alert-${Date.now()}`,
      type: newAlertType,
      threshold: newAlertThreshold,
      networks: [newAlertNetwork],
      enabled: true,
      label: newAlertType === 'spike'
        ? `${translate(lang, 'profile.alertSpike')} > ${newAlertThreshold}%`
        : `${translate(lang, 'profile.alertWhale')} > $${newAlertThreshold.toLocaleString()}`,
    });
    setShowAddForm(false);
    setNewAlertThreshold(300);
  };

  useEffect(() => {
    const hasSession = getTelegramUserIdUnsafe() !== '';

    authFetch('/api/trade-settings', {
      method: 'POST',
      body: JSON.stringify({ action: 'get' }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.ok && data.settings) {
          setTradeSettings({
            ton_service: data.settings.ton_service as TonService,
            evm_service: data.settings.evm_service as EvmService,
          });
        }
        setTradeSettingsLoaded(true);
      })
      .catch(() => setTradeSettingsLoaded(true));

    if (hasSession) {
      authFetch('/api/digest-prefs', {
        method: 'POST',
        body: JSON.stringify({ action: 'get' }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.ok) setDigestEnabled(Boolean(data.enabled));
        })
        .catch(() => {});
    }
  }, []);

  const toggleDigest = useCallback(() => {
    const hasSession = getTelegramUserIdUnsafe() !== '';
    setDigestEnabled((prev) => {
      const next = !prev;
      if (hasSession) {
        authFetch('/api/digest-prefs', {
          method: 'POST',
          body: JSON.stringify({ action: 'save', enabled: next }),
        }).catch(() => {});
      }
      return next;
    });
  }, []);

  const saveTradeSettings = useCallback((newSettings: TradeSettings) => {
    setTradeSettings(newSettings);
    authFetch('/api/trade-settings', {
      method: 'POST',
      body: JSON.stringify({
        action: 'save',
        ton_service: newSettings.ton_service,
        evm_service: newSettings.evm_service,
      }),
    }).catch(() => {});
  }, []);

  const openServiceUrl = (isEvm: boolean) => {
    const url = getServiceUrl(tradeSettings, isEvm);
    if (typeof window !== 'undefined') {
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
        tg.WebApp.openLink(url);
      } else {
        window.open(url, '_blank');
      }
    }
  };

  useEffect(() => {
    const handleOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!tonMenuRef.current?.contains(target) && !evmMenuRef.current?.contains(target)) {
        setOpenTradeMenu(null);
      }
    };
    document.addEventListener('pointerdown', handleOutsideClick);
    return () => document.removeEventListener('pointerdown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!tonConnectUI) return;

    const currentWallet = tonConnectUI.wallet;
    if (currentWallet) {
      setWalletAddress(currentWallet.account.address);
      setWalletConnected(true);
    }

    const unsubscribe = tonConnectUI.onStatusChange((wallet) => {
      if (wallet) {
        setWalletAddress(wallet.account.address);
        setWalletConnected(true);
      } else {
        setWalletAddress(null);
        setWalletConnected(false);
      }
    });
    return () => { unsubscribe(); };
  }, [tonConnectUI]);

  const handleConnectWallet = () => {
    tonConnectUI?.openModal();
  };

  const handleDisconnectWallet = () => {
    tonConnectUI?.disconnect();
    setWalletAddress(null);
    setWalletConnected(false);
  };

  const handleLockedFeature = () => {
    if (!isPro) {
      onUpgrade();
    }
  };

  const handleCopyWallet = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress).catch(() => {});
    setCopiedWallet(true);
    setTimeout(() => setCopiedWallet(false), 2000);
  };

  const handleSupportClick = () => {
    const url = 'https://t.me/aDex_Live_support_bot';
    if (typeof window !== 'undefined') {
      const tg = (window as unknown as { Telegram?: { WebApp?: { openTelegramLink?: (url: string) => void } } }).Telegram;
      if (tg?.WebApp?.openTelegramLink) {
        tg.WebApp.openTelegramLink(url);
      } else {
        window.open(url, '_blank');
      }
    }
  };

  const handleB2BClick = () => {
    const url = 'https://t.me/aDex_Terminal_Official';
    if (typeof window !== 'undefined') {
      const tg = (window as unknown as { Telegram?: { WebApp?: { openTelegramLink?: (url: string) => void } } }).Telegram;
      if (tg?.WebApp?.openTelegramLink) {
        tg.WebApp.openTelegramLink(url);
      } else {
        window.open(url, '_blank');
      }
    }
  };

  const academyRules = [
    {
      title: translate(lang, 'profile.academyRuleA'),
      content: translate(lang, 'profile.academyRuleAContent'),
    },
    {
      title: translate(lang, 'profile.academyRuleB'),
      content: translate(lang, 'profile.academyRuleBContent'),
    },
    {
      title: translate(lang, 'profile.academyRuleC'),
      content: translate(lang, 'profile.academyRuleCContent'),
    },
    {
      title: translate(lang, 'profile.academyProTitle'),
      content: translate(lang, 'profile.academyProContent'),
      isPro: true,
    },
  ];

  const shortAddr = walletAddress
    ? (walletAddress.length > 14
      ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-6)}`
      : walletAddress)
    : '';

  const alertsFull = alerts.length >= MAX_ALERTS;

  return (
    <div className="w-full flex-1 overflow-y-auto overflow-x-hidden px-4 py-3 space-y-4 scrollbar-none pb-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-fuchsia-400/30 bg-gradient-to-br from-[#120a2e] via-[#0a0820] to-[#050414] shadow-[0_0_24px_rgba(192,38,211,0.12)]">
        <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-fuchsia-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-32 h-32 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-3 p-3 sm:p-4">
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-fuchsia-400/50 flex-shrink-0 shadow-[0_0_14px_rgba(192,38,211,0.25)] bg-gradient-to-br from-fuchsia-400/15 to-violet-500/10 flex items-center justify-center">
            <img
              src="/Profile_icon.webp"
              alt="Profile verification"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-grow">
            <h1 className="text-base sm:text-lg font-black tracking-[0.06em] text-white uppercase truncate">
              {translate(lang, 'profile.title')}
            </h1>
            <p className="text-[10px] sm:text-xs text-fuchsia-200/60 mt-0.5 tracking-[0.08em] uppercase leading-tight line-clamp-2 whitespace-pre-line">
              {translate(lang, 'profile.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Wallet Card */}
      <div className="relative overflow-hidden rounded-2xl border border-fuchsia-400/25 bg-gradient-to-br from-[#120a2e] via-[#0a0820] to-[#050414] p-4 sm:p-5 shadow-[0_0_22px_rgba(192,38,211,0.1)]">
        <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-fuchsia-500/8 blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-3 sm:gap-4">
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-fuchsia-400/20 via-violet-500/10 to-fuchsia-600/15 border border-fuchsia-300/40 flex items-center justify-center flex-shrink-0 shadow-[0_0_18px_rgba(192,38,211,0.25)]">
            <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-fuchsia-200" />
          </div>
          <div className="min-w-0 flex-grow">
            {walletConnected ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                  <span className="text-xs sm:text-sm font-bold text-white truncate">
                    {translate(lang, 'profile.walletConnected')}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <button
                    onClick={handleCopyWallet}
                    className="flex items-center gap-1.5 group"
                  >
                    <span className="text-[10px] sm:text-xs font-mono text-fuchsia-200/50 group-hover:text-fuchsia-200/80 transition-colors">
                      {shortAddr}
                    </span>
                    {copiedWallet ? (
                      <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <Copy className="w-3 h-3 text-fuchsia-200/30 group-hover:text-fuchsia-200/60 transition-colors flex-shrink-0" />
                    )}
                  </button>
                  <button
                    onClick={handleDisconnectWallet}
                    className="text-[9px] font-mono text-red-300/60 hover:text-red-300 transition-colors"
                  >
                    {translate(lang, 'profile.disconnect')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-white/30 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-white/60 truncate">
                    {translate(lang, 'profile.noWallet')}
                  </span>
                </div>
                <button
                  onClick={handleConnectWallet}
                  className="mt-1.5 text-[10px] sm:text-xs font-bold text-fuchsia-200 hover:text-fuchsia-100 transition-colors"
                >
                  {translate(lang, 'profile.connectWallet')}
                </button>
              </>
            )}
          </div>
          <div className="flex-shrink-0">
            <span className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border',
              isPro
                ? 'bg-amber-400/10 border-amber-300/40 text-amber-200 shadow-[0_0_10px_rgba(251,191,36,0.15)]'
                : 'bg-white/5 border-white/15 text-white/50',
            )}>
              <Crown className="w-2.5 h-2.5" />
              {isPro ? translate(lang, 'profile.planPro') : translate(lang, 'profile.planFree')}
            </span>
          </div>
        </div>
      </div>

      {/* Trade Service Settings */}
      <div className="relative overflow-visible rounded-2xl border border-fuchsia-400/25 bg-[#0a0820]/80 shadow-[0_0_18px_rgba(192,38,211,0.1)]">
        <div className="p-3.5 sm:p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-fuchsia-400/10 border border-fuchsia-300/30 flex items-center justify-center shadow-[0_0_10px_rgba(192,38,211,0.15)]">
              <ArrowRightLeft className="w-3.5 h-3.5 text-fuchsia-200" />
            </div>
            <span className="text-[11px] font-bold text-fuchsia-200/80 uppercase tracking-wider">
              {lang === 'RU' ? 'Настройки торговли' : 'Trade Settings'}
            </span>
          </div>

          <div className="grid grid-cols-[auto_1fr_auto] gap-x-2.5 items-center">
            {/* Row 1: TON */}
            <div className="flex items-center gap-1.5 min-w-0 py-1 h-10">
              <span className="text-sm flex-shrink-0">💎</span>
              <div className="grid min-w-0 h-full grid-rows-[1fr_auto_1fr] items-center">
                <div className="text-[11px] font-bold text-white truncate leading-tight">TON</div>
                <div className="text-[8px] text-white/30 truncate leading-tight">{lang === 'RU' ? 'Web3-апп' : 'Web3 app'}</div>
              </div>
            </div>
            <div ref={tonMenuRef} className="relative min-w-0 py-1">
              <button
                type="button"
                onClick={() => setOpenTradeMenu(openTradeMenu === 'ton' ? null : 'ton')}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-lg border bg-gradient-to-r from-[#110d2b] to-[#08091b] px-2.5 py-2 text-left text-[11px] font-mono font-bold text-fuchsia-100 outline-none transition-all',
                  openTradeMenu === 'ton'
                    ? 'border-fuchsia-200/70 ring-1 ring-fuchsia-400/25 from-[#171039] to-[#0b0d24]'
                    : 'border-fuchsia-300/25 hover:border-fuchsia-300/45 hover:from-[#171039] hover:to-[#0b0d24]',
                )}
                aria-haspopup="listbox"
                aria-expanded={openTradeMenu === 'ton'}
              >
                <span className="truncate">
                  {TON_SERVICES.find((svc) => svc.id === tradeSettings.ton_service)?.label}
                </span>
                <ChevronDown className={cn('h-3.5 w-3.5 flex-shrink-0 text-fuchsia-200/70 transition-transform', openTradeMenu === 'ton' && 'rotate-180')} />
              </button>
              {openTradeMenu === 'ton' && (
                <div role="listbox" className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 min-w-[170px] overflow-hidden rounded-lg border border-fuchsia-300/35 bg-[#0b0a20] p-1 shadow-[0_12px_30px_rgba(0,0,0,0.55),0_0_18px_rgba(192,38,211,0.14)]">
                  {TON_SERVICES.map((svc) => (
                    <button
                      key={svc.id}
                      type="button"
                      role="option"
                      aria-selected={tradeSettings.ton_service === svc.id}
                      onClick={() => {
                        saveTradeSettings({ ...tradeSettings, ton_service: svc.id });
                        setOpenTradeMenu(null);
                      }}
                      className={cn(
                        'flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-[10px] font-mono transition-colors',
                        tradeSettings.ton_service === svc.id ? 'bg-fuchsia-400/15 text-fuchsia-100' : 'text-white/65 hover:bg-fuchsia-400/10 hover:text-white',
                      )}
                    >
                      <span>{svc.label}</span>
                      {tradeSettings.ton_service === svc.id && <Check className="h-3 w-3 text-fuchsia-200" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => openServiceUrl(false)}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-fuchsia-400/15 border border-fuchsia-300/40 text-fuchsia-200 hover:bg-fuchsia-400/25 hover:border-fuchsia-300/60 transition-all flex-shrink-0"
              aria-label="Open service"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Divider */}
            <div className="col-span-3 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-1" />

            {/* Row 2: BASE and BSC (stacked vertically) */}
            <div className="flex min-w-0 flex-col justify-center gap-0.5 py-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-sm flex-shrink-0">🔵</span>
                <span className="text-[11px] font-bold text-white leading-tight">BASE</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm flex-shrink-0">🟡</span>
                <span className="text-[11px] font-bold text-white leading-tight">BSC</span>
              </div>
              <div className="pl-[26px] text-[8px] text-white/30 leading-tight">{lang === 'RU' ? 'Торговые боты' : 'Trade bots'}</div>
            </div>
            <div ref={evmMenuRef} className="relative min-w-0 py-1">
              <button
                type="button"
                onClick={() => setOpenTradeMenu(openTradeMenu === 'evm' ? null : 'evm')}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-lg border bg-gradient-to-r from-[#110d2b] to-[#08091b] px-2.5 py-2 text-left text-[11px] font-mono font-bold text-fuchsia-100 outline-none transition-all',
                  openTradeMenu === 'evm'
                    ? 'border-fuchsia-200/70 ring-1 ring-fuchsia-400/25 from-[#171039] to-[#0b0d24]'
                    : 'border-fuchsia-300/25 hover:border-fuchsia-300/45 hover:from-[#171039] hover:to-[#0b0d24]',
                )}
                aria-haspopup="listbox"
                aria-expanded={openTradeMenu === 'evm'}
              >
                <span className="truncate">
                  {EVM_SERVICES.find((svc) => svc.id === tradeSettings.evm_service)?.label}
                </span>
                <ChevronDown className={cn('h-3.5 w-3.5 flex-shrink-0 text-fuchsia-200/70 transition-transform', openTradeMenu === 'evm' && 'rotate-180')} />
              </button>
              {openTradeMenu === 'evm' && (
                <div role="listbox" className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 min-w-[170px] overflow-hidden rounded-lg border border-fuchsia-300/35 bg-[#0b0a20] p-1 shadow-[0_12px_30px_rgba(0,0,0,0.55),0_0_18px_rgba(192,38,211,0.14)]">
                  {EVM_SERVICES.map((svc) => (
                    <button
                      key={svc.id}
                      type="button"
                      role="option"
                      aria-selected={tradeSettings.evm_service === svc.id}
                      onClick={() => {
                        saveTradeSettings({ ...tradeSettings, evm_service: svc.id });
                        setOpenTradeMenu(null);
                      }}
                      className={cn(
                        'flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-[10px] font-mono transition-colors',
                        tradeSettings.evm_service === svc.id ? 'bg-fuchsia-400/15 text-fuchsia-100' : 'text-white/65 hover:bg-fuchsia-400/10 hover:text-white',
                      )}
                    >
                      <span>{svc.label}</span>
                      {tradeSettings.evm_service === svc.id && <Check className="h-3 w-3 text-fuchsia-200" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => openServiceUrl(true)}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-fuchsia-400/15 border border-fuchsia-300/40 text-fuchsia-200 hover:bg-fuchsia-400/25 hover:border-fuchsia-300/60 transition-all flex-shrink-0"
              aria-label="Open service"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {!tradeSettingsLoaded && (
            <div className="text-[9px] text-white/20 mt-2">{lang === 'RU' ? 'Загрузка...' : 'Loading...'}</div>
          )}
        </div>
      </div>

      {/* Subscription / Upgrade Card */}
      {!isPro && (
        <div className="relative overflow-hidden rounded-2xl border border-fuchsia-300/30 bg-gradient-to-r from-[#120a2e] via-[#0a0820] to-[#050414] shadow-[0_0_24px_rgba(192,38,211,0.12)]">
          <div className="absolute -left-10 -bottom-10 w-32 h-32 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-fuchsia-400/8 blur-3xl pointer-events-none" />
          <div className="relative flex items-center justify-between gap-3 p-4 sm:p-5">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-fuchsia-300" />
                <span className="text-[10px] sm:text-xs font-bold text-fuchsia-200 uppercase tracking-wider">
                  {translate(lang, 'profile.upgrade')}
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-white/40 leading-relaxed">
                {translate(lang, 'paywall.miniapp.body')}
              </p>
            </div>
            <button
              onClick={onUpgrade}
              className="flex-shrink-0 px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl bg-gradient-to-r from-fuchsia-500/20 to-violet-500/20 border border-fuchsia-300/50 text-fuchsia-100 text-xs sm:text-sm font-bold hover:from-fuchsia-500/30 hover:to-violet-500/30 transition-all shadow-[0_0_18px_rgba(192,38,211,0.2)] whitespace-nowrap"
            >
              $9.90<span className="text-fuchsia-200/50 text-[10px]">/mo</span>
            </button>
          </div>
        </div>
      )}

      {/* Pro Configuration: Alerts */}
      <div className="relative overflow-hidden rounded-2xl border border-fuchsia-400/20 bg-[#0a0820]/80 shadow-[0_0_18px_rgba(192,38,211,0.08)]">
        <div className="relative p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-fuchsia-400/10 border border-fuchsia-300/30 flex items-center justify-center shadow-[0_0_10px_rgba(192,38,211,0.15)]">
                <Bell className="w-4 h-4 text-fuchsia-200" />
              </div>
              <span className="text-xs font-bold text-fuchsia-200/80 uppercase tracking-wider">
                {translate(lang, 'profile.alerts')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                'inline-flex items-center gap-0.5 text-[10px] font-mono font-bold px-2 py-1 rounded-md border whitespace-nowrap min-w-[44px] justify-center',
                alertsFull
                  ? 'bg-amber-400/10 border-amber-300/30 text-amber-200'
                  : 'bg-emerald-400/10 border-emerald-300/30 text-emerald-200',
              )}>
                {alerts.length}/{MAX_ALERTS}
              </span>
              <button
                onClick={() => isPro ? setShowAddForm(!showAddForm) : handleLockedFeature()}
                disabled={isPro && alertsFull}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-fuchsia-200 text-[10px] font-bold transition-all',
                  isPro && alertsFull
                    ? 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed'
                    : 'bg-violet-500/10 border-fuchsia-300/30 hover:bg-violet-500/20',
                )}
              >
                <Plus className="w-3 h-3" />
                {translate(lang, 'profile.addAlert')}
              </button>
            </div>
          </div>

          <div className={cn(!isPro && 'pointer-events-none select-none')}>
            <div className={cn(!isPro && 'backdrop-blur-[0.5px] opacity-70')}>

              {/* Add Alert Form */}
              {showAddForm && isPro && !alertsFull && (
                <div className="mb-4 p-3 border border-fuchsia-400/25 rounded-xl bg-[#0a0820]/80 animate-fade-in">
                  {/* Template Selector */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <button
                      onClick={() => {
                        setNewAlertType('spike');
                        setNewAlertThreshold(300);
                      }}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-all',
                        newAlertType === 'spike'
                          ? 'border-fuchsia-300/60 bg-fuchsia-400/15 text-fuchsia-100'
                          : 'border-fuchsia-400/20 bg-[#050414] text-white/50 hover:border-fuchsia-300/40',
                      )}
                    >
                      <TrendingUp className="w-4 h-4 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase truncate">
                          {translate(lang, 'profile.alertSpike')}
                        </div>
                        <div className="text-[8px] text-white/40 truncate">
                          {lang === 'RU' ? 'Спайк объёма' : 'Volume spike'}
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setNewAlertType('whale-buy');
                        setNewAlertThreshold(30000);
                      }}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-all',
                        newAlertType === 'whale-buy'
                          ? 'border-fuchsia-300/60 bg-fuchsia-400/15 text-fuchsia-100'
                          : 'border-fuchsia-400/20 bg-[#050414] text-white/50 hover:border-fuchsia-300/40',
                      )}
                    >
                      <Zap className="w-4 h-4 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase truncate">
                          {translate(lang, 'profile.alertWhale')}
                        </div>
                        <div className="text-[8px] text-white/40 truncate">
                          {lang === 'RU' ? 'Крупный кит' : 'Mega whale'}
                        </div>
                      </div>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[9px] text-white/40 uppercase block mb-1 font-bold">
                        {translate(lang, 'profile.threshold')}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={newAlertThreshold}
                          min={thresholdMin}
                          max={thresholdMax}
                          onChange={(e) => setNewAlertThreshold(Math.max(thresholdMin, Math.min(thresholdMax, parseInt(e.target.value) || thresholdPlaceholder)))}
                          className="w-full bg-[#050414] border border-fuchsia-400/25 rounded-lg px-2 py-1.5 pr-6 text-xs text-white outline-none focus:border-fuchsia-300/50"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/30 pointer-events-none">
                          {thresholdUnit}
                        </span>
                      </div>
                      <div className="text-[8px] text-white/25 mt-0.5">
                        {newAlertType === 'spike'
                          ? (lang === 'RU' ? 'От +50% до +1000%' : 'From +50% to +1000%')
                          : (lang === 'RU' ? 'От $3K до $1M+' : 'From $3K to $1M+')}
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] text-white/40 uppercase block mb-1 font-bold">
                        {translate(lang, 'profile.alertNetwork')}
                      </label>
                      <select
                        value={newAlertNetwork}
                        onChange={(e) => setNewAlertNetwork(e.target.value as NetworkFilter)}
                        className="w-full bg-[#050414] border border-fuchsia-400/25 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-fuchsia-300/50"
                      >
                        <option value="ALL">{translate(lang, 'common.all')}</option>
                        <option value="TON">TON</option>
                        <option value="BSC">BSC</option>
                        <option value="BASE">BASE</option>
                      </select>
                      <div className="text-[8px] text-white/25 mt-0.5">
                        {newAlertType === 'spike'
                          ? (lang === 'RU' ? 'Сеть для спайка' : 'Network for spike')
                          : (lang === 'RU' ? 'Сеть для кита' : 'Network for whale')}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleAdd}
                      className="px-3 py-1.5 rounded-lg bg-fuchsia-500/15 border border-fuchsia-300/40 text-fuchsia-200 text-[10px] font-bold hover:bg-fuchsia-500/25 transition-all"
                    >
                      {translate(lang, 'common.save')}
                    </button>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 text-white/50 text-[10px] font-bold hover:text-white/80 transition-all"
                    >
                      {translate(lang, 'common.cancel')}
                    </button>
                  </div>
                </div>
              )}

              {/* Alerts List */}
              {alerts.length === 0 ? (
                <div className="text-center text-white/25 text-sm py-6">
                  {translate(lang, 'profile.noAlerts')}
                </div>
              ) : (
                <div className="space-y-2">
                  {alerts.map((alert) => {
                    const Icon = alertTypeIcons[alert.type] || Zap;
                    return (
                      <div
                        key={alert.id}
                        className="flex items-center justify-between p-2.5 border border-fuchsia-400/15 rounded-xl bg-[#0a0820]/60 hover:border-fuchsia-400/25 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-fuchsia-400/8 border border-fuchsia-300/20 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-3.5 h-3.5 text-fuchsia-300" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">
                              {alert.label}
                            </div>
                            <div className="text-[9px] text-white/30 mt-0.5">
                              {alert.networks.join(', ')}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => onToggleAlert(alert.id)}
                            className={cn(
                              'relative w-9 h-5 rounded-full transition-colors',
                              alert.enabled ? 'bg-emerald-400/30 border border-emerald-300/30' : 'bg-white/5 border border-white/10',
                            )}
                          >
                            <div
                              className={cn(
                                'absolute top-0.5 w-4 h-4 rounded-full transition-all',
                                alert.enabled ? 'left-4 bg-emerald-300 shadow-[0_0_6px_rgba(52,211,153,0.6)]' : 'left-0.5 bg-white/40',
                              )}
                            />
                          </button>
                          <button
                            onClick={() => onDeleteAlert(alert.id)}
                            className="text-white/25 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </div>

          {/* Lock overlay for free users */}
          {!isPro && (
            <div
              className="absolute inset-0 flex items-center justify-center cursor-pointer z-10 bg-[#0a0820]/40 backdrop-blur-[1px] rounded-2xl"
              onClick={handleLockedFeature}
            >
              <div className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#0a0820] border border-fuchsia-300/40 cursor-pointer hover:border-fuchsia-300/60 transition-colors shadow-[0_0_18px_rgba(192,38,211,0.25)]">
                <Lock className="w-5 h-5 text-fuchsia-200" />
                <span className="text-sm font-mono font-bold text-fuchsia-100 uppercase tracking-wider">
                  PRO
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Academy Section */}
      <div className="relative overflow-hidden rounded-2xl border border-fuchsia-400/20 bg-gradient-to-br from-sky-500/[0.04] to-fuchsia-500/[0.04] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-400/10 border border-sky-300/25 flex items-center justify-center flex-shrink-0">
            <Mail className="w-4 h-4 text-sky-200" />
          </div>
          <div className="min-w-0 flex-grow">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  {lang === 'RU' ? 'Утренний дайджест' : 'Morning digest'}
                </h3>
                <p className="mt-1 text-[10px] leading-relaxed text-white/60">
                  {lang === 'RU'
                    ? 'Одно короткое сообщение в Telegram: ваш список за сутки, свежие сигналы риска и ваш реферальный прогресс.'
                    : 'One short Telegram message per day: your watchlist changes, fresh risk signals and your referral progress.'}
                </p>
                {digestEnabled && (
                  <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-sky-200/60">
                    {lang === 'RU' ? 'Следующая отправка ~12:00 UTC' : 'Next send ~12:00 UTC'}
                  </p>
                )}
              </div>
              <button
                onClick={toggleDigest}
                aria-pressed={digestEnabled}
                className={cn(
                  'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full border transition-colors',
                  digestEnabled ? 'border-sky-300/50 bg-sky-400/25' : 'border-white/15 bg-white/[0.04]',
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
                    digestEnabled ? 'translate-x-6' : 'translate-x-1',
                  )}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Academy Section */}
      <div className="relative overflow-hidden rounded-2xl border border-fuchsia-400/20 bg-[#0a0820]/80 shadow-[0_0_16px_rgba(192,38,211,0.08)]">
        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-fuchsia-400/10 border border-fuchsia-300/30 flex items-center justify-center shadow-[0_0_10px_rgba(192,38,211,0.15)]">
              <BookOpen className="w-4 h-4 text-fuchsia-200" />
            </div>
            <span className="text-xs font-bold text-fuchsia-200/80 uppercase tracking-wider">
              {translate(lang, 'profile.academyTitle')}
            </span>
          </div>

          <div className="space-y-1.5">
            {academyRules.map((rule, idx) => (
              <div key={idx} className={cn(
                'border rounded-xl overflow-hidden transition-colors',
                rule.isPro
                  ? 'border-amber-300/30 hover:border-amber-300/50 bg-gradient-to-br from-amber-400/5 to-fuchsia-400/5'
                  : 'border-fuchsia-400/15 hover:border-fuchsia-400/25'
              )}>
                <button
                  onClick={() => setOpenAccordion(openAccordion === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-3 hover:bg-fuchsia-400/5 transition-colors"
                >
                  <span className={cn(
                    'text-[11px] font-bold text-left flex items-center gap-1.5',
                    rule.isPro ? 'text-amber-200' : 'text-white/70'
                  )}>
                    {rule.isPro && <Crown className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />}
                    {rule.title}
                  </span>
                  {openAccordion === idx ? (
                    <ChevronDown className={cn('w-3.5 h-3.5 flex-shrink-0', rule.isPro ? 'text-amber-300' : 'text-fuchsia-300')} />
                  ) : (
                    <ChevronRight className={cn('w-3.5 h-3.5 flex-shrink-0', rule.isPro ? 'text-amber-300/50' : 'text-white/30')} />
                  )}
                </button>
                {openAccordion === idx && (
                  <div className="px-3 pb-3 pt-1 animate-fade-in">
                    <p className={cn(
                      'text-[10px] leading-relaxed',
                      rule.isPro ? 'text-amber-100/60' : 'text-white/50'
                    )}>
                      {rule.content}
                    </p>
                    {rule.isPro && !isPro && (
                      <button
                        onClick={onUpgrade}
                        className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-amber-400/15 to-fuchsia-400/15 border border-amber-300/40 text-amber-100 text-xs font-bold hover:from-amber-400/25 hover:to-fuchsia-400/25 transition-all shadow-[0_0_16px_rgba(251,191,36,0.15)]"
                      >
                        <Crown className="w-3.5 h-3.5" />
                        {translate(lang, 'profile.academyProCta')}
                      </button>
                    )}
                    {rule.isPro && isPro && (
                      <div className="mt-3 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-400/10 border border-emerald-300/30">
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider">
                          {translate(lang, 'profile.planPro')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Support Bridge */}
      <div className="relative overflow-hidden rounded-2xl border border-fuchsia-400/20 bg-[#0a0820]/80 shadow-[0_0_16px_rgba(192,38,211,0.08)]">
        <div className="p-4 sm:p-5">
          <p className="text-[10px] text-white/40 leading-relaxed mb-3">
            {translate(lang, 'profile.supportPrompt')}
          </p>
          <button
            onClick={handleSupportClick}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-fuchsia-500/15 to-violet-500/15 border border-fuchsia-300/40 text-fuchsia-100 text-xs font-bold hover:from-fuchsia-500/25 hover:to-violet-500/25 transition-all shadow-[0_0_16px_rgba(192,38,211,0.15)]"
          >
            <MessageCircle className="w-4 h-4" />
            {translate(lang, 'profile.supportButton')}
          </button>
        </div>
      </div>

      {/* Community Discussion */}
      <div className="relative overflow-hidden rounded-2xl border border-fuchsia-400/20 bg-[#0a0820]/80 shadow-[0_0_16px_rgba(192,38,211,0.08)]">
        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-fuchsia-400/10 border border-fuchsia-300/30 flex items-center justify-center shadow-[0_0_10px_rgba(192,38,211,0.15)]">
              <Users className="w-4 h-4 text-fuchsia-200" />
            </div>
            <span className="text-xs font-bold text-fuchsia-200/80 uppercase tracking-wider">
              {translate(lang, 'profile.b2bTitle')}
            </span>
          </div>
          <button
            onClick={handleB2BClick}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-fuchsia-500/15 to-violet-500/15 border border-fuchsia-300/40 text-fuchsia-100 text-xs font-bold hover:from-fuchsia-500/25 hover:to-violet-500/25 transition-all shadow-[0_0_16px_rgba(192,38,211,0.15)]"
          >
            <Users className="w-4 h-4" />
            {translate(lang, 'profile.b2bButton')}
          </button>
        </div>
      </div>
    </div>
  );
}
