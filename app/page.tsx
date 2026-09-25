'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/shared/Header';
import { Sidebar } from '@/components/shared/Sidebar';
import { BottomTabBar } from '@/components/shared/BottomTabBar';
import { PaywallModal } from '@/components/shared/PaywallModal';
import { DesktopGate } from '@/components/shared/DesktopGate';
import { OnboardingOverlay } from '@/components/shared/OnboardingOverlay';
import { RadarScreen } from '@/components/screens/RadarScreen';
import { WhalesScreen } from '@/components/screens/WhalesScreen';
import { ScannerScreen } from '@/components/screens/ScannerScreen';
import { ProfileScreen } from '@/components/screens/ProfileScreen';
import { PartnersScreen } from '@/components/screens/PartnersScreen';
import type {
  TabId,
  Language,
  NetworkSelection,
  TokenRow,
  WhaleAlert,
  SecurityScan,
  AlertConfig,
  ProSettings,
} from '@/lib/types';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { DEFAULT_TRADE_SETTINGS, type TradeSettings } from '@/lib/trade-links';
import { initTelegramWebApp, getTelegramUserIdUnsafe, getStartParamUnsafe } from '@/lib/telegram-webapp';
import { trackEvent } from '@/lib/product-events';
import { authFetch } from '@/lib/api-client';
import { ErrorState } from '@/components/shared/ErrorState';
import type { WatchlistKey } from '@/components/screens/RadarScreen';

const DEFAULT_PRO_SETTINGS: ProSettings = {
  radar_min_liquidity: 0,
  radar_min_spike: 50,
  whale_min_volume: 3000,
  whale_buys_only: false,
};

const DEFAULT_ALERTS: AlertConfig[] = [
  {
    id: 'default-spike',
    type: 'spike',
    threshold: 300,
    networks: ['ALL'],
    enabled: false,
    label: 'Super Spike > 300%',
  },
  {
    id: 'default-whale',
    type: 'whale-buy',
    threshold: 30000,
    networks: ['ALL'],
    enabled: false,
    label: 'Mega Whale > $30K',
  },
];

function hasTelegramSession(): boolean {
  if (typeof window === 'undefined') return false;
  return getTelegramUserIdUnsafe() !== '';
}

export default function Home() {
  const [lang, setLang] = useState<Language>('EN');
  const [selectedNetworks, setSelectedNetworks] = useState<NetworkSelection>(['TON', 'BSC', 'BASE']);
  const [activeTab, setActiveTab] = useState<TabId>('radar');
  const [isPro, setIsPro] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [whales, setWhales] = useState<WhaleAlert[]>([]);
  const [scans, setScans] = useState<SecurityScan[]>([]);
  const [alerts, setAlerts] = useState<AlertConfig[]>(DEFAULT_ALERTS);
  const [proSettings, setProSettings] = useState<ProSettings>(DEFAULT_PRO_SETTINGS);
  const [isLive, setIsLive] = useState(false);
  const [tradeSettings, setTradeSettings] = useState<TradeSettings>(DEFAULT_TRADE_SETTINGS);
  const [watchlist, setWatchlist] = useState<WatchlistKey[]>([]);
  const [watchlistLimit, setWatchlistLimit] = useState<number | null>(5);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [fetchTick, setFetchTick] = useState(0);

  const isMiniApp =
    typeof window !== 'undefined' &&
    (() => {
      try {
        return (
          window.location !== window.parent.location ||
          new URLSearchParams(window.location.search).has('tgWebAppData') ||
          (window as unknown as Record<string, unknown>).TelegramWebview !== undefined ||
          navigator.userAgent.includes('Telegram')
        );
      } catch {
        return true;
      }
    })();

  useEffect(() => {
    initTelegramWebApp();
    try {
      const startParam = getStartParamUnsafe();
      if (startParam.startsWith('digest_')) {
        trackEvent('digest_opened', { date: startParam.slice(7) });
      } else {
        trackEvent('app_opened', {});
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!hasTelegramSession()) return;

    const startParam = getStartParamUnsafe();
    if (startParam) {
      if (/^aDEX-[A-Z0-9]{4}$/.test(startParam)) {
        authFetch('/api/referral/claim', {
          method: 'POST',
          body: JSON.stringify({ referral_code: startParam }),
        }).catch(() => {});
      } else {
        authFetch('/api/scout-pass', {
          method: 'POST',
          body: JSON.stringify({ start_param: startParam }),
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.is_premium) setIsPro(true);
          })
          .catch(() => {});
      }
    }

    authFetch('/api/referral-stats', {
      method: 'POST',
      body: JSON.stringify({ lang: 'EN' }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.ok && data.stats?.isPro) setIsPro(true);
      })
      .catch(() => {});

    authFetch('/api/pro-settings', {
      method: 'POST',
      body: JSON.stringify({ action: 'get' }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.ok && data.settings) {
          setProSettings({
            radar_min_liquidity: data.settings.radar_min_liquidity ?? 0,
            radar_min_spike: data.settings.radar_min_spike ?? 50,
            whale_min_volume: data.settings.whale_min_volume ?? 3000,
            whale_buys_only: data.settings.whale_buys_only ?? false,
          });
        }
      })
      .catch(() => {});

    authFetch('/api/alerts', {
      method: 'POST',
      body: JSON.stringify({ action: 'get' }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.ok && Array.isArray(data.alerts)) setAlerts(data.alerts);
      })
      .catch(() => {});

    authFetch('/api/watchlist', {
      method: 'POST',
      body: JSON.stringify({ action: 'list' }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.ok && Array.isArray(data.items)) {
          setWatchlist(
            data.items.map((r: { network: string; token_address: string }) => ({
              network: r.network,
              address: r.token_address,
            })),
          );
          setWatchlistLimit(data.limit ?? null);
        }
      })
      .catch(() => {});

    authFetch('/api/onboarding/state', { method: 'GET' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.ok || !data.state) return;
        const s = data.state as {
          is_new: boolean;
          step_completed: number;
          completed_at: string | null;
          skipped_at: string | null;
        };
        const eligible =
          s.is_new || (!s.completed_at && !s.skipped_at && s.step_completed < 3);
        if (eligible) setShowOnboarding(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const etags: Record<string, string> = {};
    void fetchTick; // re-trigger on retry

    const withEtag = (key: string): RequestInit => {
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (etags[key]) headers['If-None-Match'] = etags[key];
      return { signal: controller.signal, headers };
    };

    const watchlistEtag = { current: '' };
    const alertsEtag = { current: '' };

    const watchlistKey = (w: { network: string; address: string }) =>
      `${w.network}:${w.address.toLowerCase()}`;

    const watchlistEqual = (a: WatchlistKey[], b: WatchlistKey[]) => {
      if (a.length !== b.length) return false;
      const sa = new Set(a.map(watchlistKey));
      for (const w of b) if (!sa.has(watchlistKey(w))) return false;
      return true;
    };

    const alertsEqual = (a: AlertConfig[], b: AlertConfig[]) => {
      if (a.length !== b.length) return false;
      const ma = new Map(a.map((al) => [al.id, al]));
      for (const al of b) {
        const ex = ma.get(al.id);
        if (!ex) return false;
        if (ex.enabled !== al.enabled || ex.threshold !== al.threshold) return false;
        if (ex.type !== al.type || ex.label !== al.label) return false;
        if (JSON.stringify(ex.networks) !== JSON.stringify(al.networks)) return false;
      }
      return true;
    };

    const fetchUserState = async () => {
      if (!hasTelegramSession()) return;
      try {
        const [wlRes, alRes] = await Promise.allSettled([
          authFetch('/api/watchlist', {
            method: 'POST',
            body: JSON.stringify({ action: 'list' }),
            headers: watchlistEtag.current
              ? { 'If-None-Match': watchlistEtag.current }
              : undefined,
          }),
          authFetch('/api/alerts', {
            method: 'POST',
            body: JSON.stringify({ action: 'get' }),
            headers: alertsEtag.current
              ? { 'If-None-Match': alertsEtag.current }
              : undefined,
          }),
        ]);

        if (wlRes.status === 'fulfilled') {
          const r = wlRes.value;
          if (r.status === 304) return;
          if (r.status === 200) {
            const et = r.headers.get('etag');
            if (et) watchlistEtag.current = et;
            const json = await r.json();
            if (json?.ok && Array.isArray(json.items)) {
              const next = json.items.map(
                (r: { network: string; token_address: string }) => ({
                  network: r.network,
                  address: r.token_address,
                }),
              );
              setWatchlist((prev) =>
                watchlistEqual(prev, next) ? prev : next,
              );
              setWatchlistLimit(json.limit ?? null);
            }
          }
        }
        if (alRes.status === 'fulfilled') {
          const r = alRes.value;
          if (r.status === 304) return;
          if (r.status === 200) {
            const et = r.headers.get('etag');
            if (et) alertsEtag.current = et;
            const json = await r.json();
            if (json?.ok && Array.isArray(json.alerts)) {
              setAlerts((prev) =>
                alertsEqual(prev, json.alerts) ? prev : json.alerts,
              );
            }
          }
        }
      } catch {
        // keep previous state on fetch failure
      }
    };

    const fetchData = async () => {
      let anyData = false;
      try {
        const [radarRes, whalesRes, scansRes] = await Promise.allSettled([
          fetch('/api/radar', withEtag('radar')),
          fetch('/api/whales', withEtag('whales')),
          authFetch('/api/scanner', withEtag('scanner')),
        ]);

        if (radarRes.status === 'fulfilled') {
          const r = radarRes.value;
          if (r.status === 200) {
            const et = r.headers.get('etag');
            if (et) etags['radar'] = et;
            const json = await r.json();
            if (json.data && Array.isArray(json.data) && json.data.length > 0) {
              setTokens(json.data);
              setIsLive(json.source === 'live');
              anyData = true;
            }
          }
        }
        if (whalesRes.status === 'fulfilled') {
          const r = whalesRes.value;
          if (r.status === 200) {
            const et = r.headers.get('etag');
            if (et) etags['whales'] = et;
            const json = await r.json();
            if (json.data && Array.isArray(json.data)) {
              setWhales(json.data);
              anyData = true;
            }
          }
        }
        if (scansRes.status === 'fulfilled') {
          const r = scansRes.value;
          if (r.status === 200) {
            const et = r.headers.get('etag');
            if (et) etags['scanner'] = et;
            const json = await r.json();
            if (json.data && Array.isArray(json.data) && json.data.length > 0) {
              setScans(json.data);
              anyData = true;
            }
          }
        }
      } catch {
        // keep previous data on fetch failure
      }
      setFetchError(!anyData);
    };

    let timer: ReturnType<typeof setTimeout> | null = null;
    const jitteredDelay = () => 60_000 + Math.floor(Math.random() * 30_000) - 15_000;
    const schedule = () => {
      timer = setTimeout(async () => {
        await Promise.allSettled([fetchData(), fetchUserState()]);
        if (timer !== null) schedule();
      }, jitteredDelay());
    };

    fetchData();
    fetchUserState();
    schedule();

    const handleVisibility = () => {
      if (document.hidden) {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      } else if (!timer) {
        fetchData();
        fetchUserState();
        schedule();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    if (hasTelegramSession()) {
      authFetch('/api/trade-settings', {
        method: 'POST',
        body: JSON.stringify({ action: 'get' }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.ok && data.settings) {
            setTradeSettings({
              ton_service: data.settings.ton_service,
              evm_service: data.settings.evm_service,
            });
          }
        })
        .catch(() => {});
    }

    return () => {
      controller.abort();
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchTick]);

  const toggleLang = useCallback(() => {
    setLang((l) => (l === 'EN' ? 'RU' : 'EN'));
  }, []);

  const handleLockedClick = useCallback(() => {
    setPaywallOpen(true);
    trackEvent('paywall_shown', { source: 'locked_filter' });
  }, []);

  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
    trackEvent('tab_switched', { tab });
  }, []);

  const handleToggleWatch = useCallback((token: TokenRow, next: boolean) => {
    if (!hasTelegramSession()) return;
    const key = { network: token.network, address: token.address };
    if (next) {
      setWatchlist((prev) => {
        if (
          prev.some(
            (w) => w.network === key.network && w.address.toLowerCase() === key.address.toLowerCase(),
          )
        )
          return prev;
        return [key, ...prev];
      });
      authFetch('/api/watchlist', {
        method: 'POST',
        body: JSON.stringify({
          action: 'add',
          network: token.network,
          token_address: token.address,
          token_symbol: token.symbol,
        }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.ok === false && data.error === 'limit_reached') {
            setWatchlist((prev) =>
              prev.filter(
                (w) =>
                  !(w.network === key.network && w.address.toLowerCase() === key.address.toLowerCase()),
              ),
            );
            setPaywallOpen(true);
            trackEvent('paywall_shown', { source: 'watchlist_limit' });
          } else if (data?.ok) {
            trackEvent('watchlist_added', { network: token.network });
          }
        })
        .catch(() => {});
    } else {
      setWatchlist((prev) =>
        prev.filter(
          (w) =>
            !(w.network === key.network && w.address.toLowerCase() === key.address.toLowerCase()),
        ),
      );
      authFetch('/api/watchlist', {
        method: 'POST',
        body: JSON.stringify({
          action: 'remove',
          network: token.network,
          token_address: token.address,
        }),
      }).catch(() => {});
      trackEvent('watchlist_removed', { network: token.network });
    }
  }, []);

  const handleProSettingsChange = useCallback((partial: Partial<ProSettings>) => {
    setProSettings((prev) => {
      const next = { ...prev, ...partial };
      if (hasTelegramSession()) {
        authFetch('/api/pro-settings', {
          method: 'POST',
          body: JSON.stringify({ action: 'save', ...next }),
        }).catch(() => {});
      }
      return next;
    });
  }, []);

  const handleAddAlert = useCallback((alert: AlertConfig) => {
    if (hasTelegramSession()) {
      authFetch('/api/alerts', {
        method: 'POST',
        body: JSON.stringify({
          action: 'save',
          type: alert.type,
          threshold: alert.threshold,
          networks: alert.networks,
          enabled: alert.enabled,
          label: alert.label,
        }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.ok && Array.isArray(data.alerts)) setAlerts(data.alerts);
        })
        .catch(() => {});
    } else {
      setAlerts((prev) => [...prev, alert]);
    }
  }, []);

  const handleDeleteAlert = useCallback((id: string) => {
    if (hasTelegramSession()) {
      authFetch('/api/alerts', {
        method: 'POST',
        body: JSON.stringify({ action: 'delete', alert_id: id }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.ok && Array.isArray(data.alerts)) setAlerts(data.alerts);
        })
        .catch(() => {});
    } else {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    }
  }, []);

  const handleToggleAlert = useCallback((id: string) => {
    if (hasTelegramSession()) {
      authFetch('/api/alerts', {
        method: 'POST',
        body: JSON.stringify({ action: 'toggle', alert_id: id }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.ok && Array.isArray(data.alerts)) setAlerts(data.alerts);
        })
        .catch(() => {});
    } else {
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)));
    }
  }, []);

  const handleUpgrade = useCallback(() => {
    setPaywallOpen(true);
    trackEvent('paywall_shown', { source: 'upgrade_cta' });
  }, []);

  const handleRetryFetch = useCallback(() => {
    setFetchError(false);
    setFetchTick((t) => t + 1);
  }, []);

  return (
    <TonConnectUIProvider manifestUrl="https://adexterminal.com/tonconnect-manifest.json">
      <div className="w-full h-screen h-[100dvh] flex flex-col overflow-hidden select-none bg-[#0B0B0F] text-white">
        <Header
          lang={lang}
          onToggleLang={toggleLang}
          isLive={isLive}
          activeTab={activeTab}
          isPro={isPro}
        />

        <div className="flex flex-grow overflow-hidden min-h-0">
          <Sidebar active={activeTab} onChange={handleTabChange} lang={lang} />

          <main className="flex-grow overflow-hidden flex flex-col min-h-0">
            <div className="flex-grow overflow-hidden min-h-0 flex flex-col">
              {activeTab === 'radar' && (
                fetchError && tokens.length === 0 ? (
                  <ErrorState lang={lang} onRetry={handleRetryFetch} />
                ) : (
                <RadarScreen
                  tokens={tokens}
                  lang={lang}
                  networks={selectedNetworks}
                  onNetworksChange={setSelectedNetworks}
                  isPro={isPro}
                  onLockedClick={handleLockedClick}
                  tradeSettings={tradeSettings}
                  proSettings={proSettings}
                  onProSettingsChange={handleProSettingsChange}
                  watchlist={watchlist}
                  watchlistLimit={watchlistLimit}
                  onToggleWatch={handleToggleWatch}
                />
                )
              )}
              {activeTab === 'whales' && (
                fetchError && whales.length === 0 ? (
                  <ErrorState lang={lang} onRetry={handleRetryFetch} />
                ) : (
                <WhalesScreen
                  whales={whales}
                  lang={lang}
                  networks={selectedNetworks}
                  onNetworksChange={setSelectedNetworks}
                  isPro={isPro}
                  onUpgrade={handleUpgrade}
                  tradeSettings={tradeSettings}
                  proSettings={proSettings}
                  onProSettingsChange={handleProSettingsChange}
                />
                )
              )}
              {activeTab === 'scanner' && (
                fetchError && scans.length === 0 ? (
                  <ErrorState lang={lang} onRetry={handleRetryFetch} />
                ) : (
                <ScannerScreen
                  scans={scans}
                  lang={lang}
                  networks={selectedNetworks}
                  onNetworksChange={setSelectedNetworks}
                />
                )
              )}
              {activeTab === 'profile' && (
                <ProfileScreen
                  lang={lang}
                  alerts={alerts}
                  onAddAlert={handleAddAlert}
                  onDeleteAlert={handleDeleteAlert}
                  onToggleAlert={handleToggleAlert}
                  isPro={isPro}
                  onUpgrade={handleUpgrade}
                  onTradeSettingsChange={setTradeSettings}
                />
              )}
              {activeTab === 'partners' && (
                <PartnersScreen
                  stats={{
                    totalReferrals: 0,
                    activeReferrals: 0,
                    totalEarnings: 0,
                    pendingPayouts: 0,
                    totalStars: 0,
                    referralCode: '',
                    referralLink: '',
                    referralLinkFallback: '',
                    tier: 'New Partner',
                    commissionRate: 20,
                    isPro,
                  }}
                  lang={lang}
                />
              )}
            </div>
          </main>
        </div>

        <BottomTabBar active={activeTab} onChange={handleTabChange} lang={lang} />

        <PaywallModal
          open={paywallOpen}
          onClose={() => setPaywallOpen(false)}
          lang={lang}
          isMiniApp={isMiniApp}
        />

        {showOnboarding && (
          <OnboardingOverlay
            lang={lang}
            onDismiss={() => setShowOnboarding(false)}
            onStartScan={() => {
              setActiveTab('scanner');
              setShowOnboarding(false);
            }}
          />
        )}
      </div>
      <DesktopGate lang={lang} />
    </TonConnectUIProvider>
  );
}
