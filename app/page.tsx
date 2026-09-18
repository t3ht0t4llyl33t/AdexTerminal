'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/shared/Header';
import { Sidebar } from '@/components/shared/Sidebar';
import { BottomTabBar } from '@/components/shared/BottomTabBar';
import { PaywallModal } from '@/components/shared/PaywallModal';
import { DesktopGate } from '@/components/shared/DesktopGate';
import { RadarScreen } from '@/components/screens/RadarScreen';
import { WhalesScreen } from '@/components/screens/WhalesScreen';
import { ScannerScreen } from '@/components/screens/ScannerScreen';
import { ProfileScreen } from '@/components/screens/ProfileScreen';
import { PartnersScreen } from '@/components/screens/PartnersScreen';
import type {
  TabId,
  Language,
  Network,
  NetworkSelection,
  TokenRow,
  WhaleAlert,
  SecurityScan,
  AlertConfig,
  ProSettings,
} from '@/lib/types';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { DEFAULT_TRADE_SETTINGS, type TradeSettings } from '@/lib/trade-links';
import { initTelegramWebApp } from '@/lib/telegram-webapp';

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

function getTgUserId(): string {
  try {
    const params = new URLSearchParams(window.location.search);
    const tgData = params.get('tgWebAppData') || '';
    const match = tgData.match(/user.*?"id":(\d+)/);
    return match ? match[1] : 'demo_user';
  } catch { return 'demo_user'; }
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
  }, []);

  useEffect(() => {
    const { tgUserId, startParam } = (() => {
      try {
        const params = new URLSearchParams(window.location.search);
        const tgData = params.get('tgWebAppData') || '';
        const match = tgData.match(/user.*?"id":(\d+)/);
        const id = match ? match[1] : 'demo_user';
        const spMatch = tgData.match(/"start_param"\s*:\s*"([^"]+)"/);
        const sp = spMatch ? spMatch[1] : (params.get('start_param') || params.get('startapp') || '');
        return { tgUserId: id, startParam: sp };
      } catch { return { tgUserId: 'demo_user', startParam: '' }; }
    })();

    if (tgUserId !== 'demo_user') {
      if (startParam) {
        fetch('/api/scout-pass', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ start_param: startParam, telegram_user_id: tgUserId }),
        })
          .then((res) => res.ok ? res.json() : null)
          .then((data) => {
            if (data?.is_premium) {
              setIsPro(true);
            }
          })
          .catch(() => {});
      }

      fetch('/api/referral-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_user_id: tgUserId, lang: 'EN' }),
      })
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.ok && data.stats?.isPro) {
            setIsPro(true);
          }
        })
        .catch(() => {});

      // Load PRO filter settings
      fetch('/api/pro-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_user_id: tgUserId, action: 'get' }),
      })
        .then((res) => res.ok ? res.json() : null)
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

      // Load alerts from DB
      fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_user_id: tgUserId, action: 'get' }),
      })
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.ok && Array.isArray(data.alerts)) {
            setAlerts(data.alerts);
          }
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        const [radarRes, whalesRes, scansRes] = await Promise.allSettled([
          fetch('/api/radar', { signal: controller.signal }),
          fetch('/api/whales', { signal: controller.signal }),
          fetch('/api/scanner', { signal: controller.signal }),
        ]);

        if (radarRes.status === 'fulfilled' && radarRes.value.ok) {
          const json = await radarRes.value.json();
          if (json.data && Array.isArray(json.data) && json.data.length > 0) {
            setTokens(json.data);
            setIsLive(json.source === 'live');
          }
        }
        if (whalesRes.status === 'fulfilled' && whalesRes.value.ok) {
          const json = await whalesRes.value.json();
          if (json.data && Array.isArray(json.data)) {
            setWhales(json.data);
          }
        }
        if (scansRes.status === 'fulfilled' && scansRes.value.ok) {
          const json = await scansRes.value.json();
          if (json.data && Array.isArray(json.data) && json.data.length > 0) {
            setScans(json.data);
          }
        }
      } catch {
        // keep previous data on fetch failure
      }
    };

    fetchData();
    let interval: ReturnType<typeof setInterval> | null = setInterval(fetchData, 60000);

    const handleVisibility = () => {
      if (document.hidden) {
        if (interval) { clearInterval(interval); interval = null; }
      } else {
        if (!interval) { fetchData(); interval = setInterval(fetchData, 60000); }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const tgUserId = (() => {
      try {
        const params = new URLSearchParams(window.location.search);
        const tgData = params.get('tgWebAppData') || '';
        const match = tgData.match(/user.*?"id":(\d+)/);
        return match ? match[1] : 'demo_user';
      } catch { return 'demo_user'; }
    })();
    fetch('/api/trade-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegram_user_id: tgUserId, action: 'get' }),
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.ok && data.settings) {
          setTradeSettings({
            ton_service: data.settings.ton_service,
            evm_service: data.settings.evm_service,
          });
        }
      })
      .catch(() => {});

    return () => {
      controller.abort();
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const toggleLang = useCallback(() => {
    setLang((l) => (l === 'EN' ? 'RU' : 'EN'));
  }, []);

  const handleLockedClick = useCallback(() => {
    setPaywallOpen(true);
  }, []);

  const handleProSettingsChange = useCallback((partial: Partial<ProSettings>) => {
    setProSettings((prev) => {
      const next = { ...prev, ...partial };
      const tgUserId = getTgUserId();
      if (tgUserId !== 'demo_user') {
        fetch('/api/pro-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegram_user_id: tgUserId, action: 'save', ...next }),
        }).catch(() => {});
      }
      return next;
    });
  }, []);

  const handleAddAlert = useCallback((alert: AlertConfig) => {
    const tgUserId = getTgUserId();
    if (tgUserId !== 'demo_user') {
      fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_user_id: tgUserId,
          action: 'save',
          type: alert.type,
          threshold: alert.threshold,
          networks: alert.networks,
          enabled: alert.enabled,
          label: alert.label,
        }),
      })
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.ok && Array.isArray(data.alerts)) {
            setAlerts(data.alerts);
          }
        })
        .catch(() => {});
    } else {
      setAlerts((prev) => [...prev, alert]);
    }
  }, []);

  const handleDeleteAlert = useCallback((id: string) => {
    const tgUserId = getTgUserId();
    if (tgUserId !== 'demo_user') {
      fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_user_id: tgUserId, action: 'delete', alert_id: id }),
      })
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.ok && Array.isArray(data.alerts)) {
            setAlerts(data.alerts);
          }
        })
        .catch(() => {});
    } else {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    }
  }, []);

  const handleToggleAlert = useCallback((id: string) => {
    const tgUserId = getTgUserId();
    if (tgUserId !== 'demo_user') {
      fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_user_id: tgUserId, action: 'toggle', alert_id: id }),
      })
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.ok && Array.isArray(data.alerts)) {
            setAlerts(data.alerts);
          }
        })
        .catch(() => {});
    } else {
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)),
      );
    }
  }, []);

  const handleUpgrade = useCallback(() => {
    setPaywallOpen(true);
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
        <Sidebar active={activeTab} onChange={setActiveTab} lang={lang} />

        <main className="flex-grow overflow-hidden flex flex-col min-h-0">
          <div className="flex-grow overflow-hidden min-h-0 flex flex-col">
            {activeTab === 'radar' && (
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
              />
            )}
            {activeTab === 'whales' && (
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
            )}
            {activeTab === 'scanner' && (
              <ScannerScreen scans={scans} lang={lang} networks={selectedNetworks} onNetworksChange={setSelectedNetworks} />
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
              />
            )}
            {activeTab === 'partners' && (
              <PartnersScreen
                stats={{
                  totalReferrals: 0,
                  activeReferrals: 0,
                  totalEarnings: 0,
                  pendingPayouts: 0,
                  referralCode: '',
                  referralLink: '',
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

      <BottomTabBar active={activeTab} onChange={setActiveTab} lang={lang} />

      <PaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        lang={lang}
        isMiniApp={isMiniApp}
      />
    </div>
    <DesktopGate lang={lang} />
    </TonConnectUIProvider>
  );
}
