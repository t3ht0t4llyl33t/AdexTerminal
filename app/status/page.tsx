'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Activity, Radar, Bell, Coins, CreditCard, Sparkles, RefreshCw } from 'lucide-react';

type HealthState = 'green' | 'yellow' | 'red';

interface SourceHealth {
  name: string;
  state: HealthState;
  lastSuccessIso: string | null;
  lastErrorIso: string | null;
  lastError: string | null;
}

interface HealthPayload {
  ok: boolean;
  updated_at: string;
  sources: SourceHealth[];
  overall: HealthState;
}

const POLL_INTERVAL = 60_000;

const SERVICE_META: Record<string, { title: string; description: string; icon: typeof Activity }> = {
  TonAPI: { title: 'TonAPI', description: 'TON jetton metadata, holders, and verification data.', icon: Radar },
  GeckoTerminal: { title: 'GeckoTerminal', description: 'Liquidity pools and trending tokens for TON, BSC, Base.', icon: Activity },
  GoPlus: { title: 'GoPlus Security', description: 'EVM contract audit signals for BSC and Base.', icon: Bell },
  Groq: { title: 'Groq AI', description: 'AI support assistant and moderation engine.', icon: Sparkles },
  Supabase: { title: 'Supabase', description: 'Database, auth, and edge function infrastructure.', icon: CreditCard },
};

function formatRelative(iso: string | null): string {
  if (!iso) return 'No data';
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 60_000) return 'moments ago';
  const min = Math.round(diffMs / 60_000);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} h ago`;
  const days = Math.round(hr / 24);
  return `${days} d ago`;
}

function stateLabel(state: HealthState): string {
  if (state === 'green') return 'Operational';
  if (state === 'yellow') return 'Degraded';
  return 'Down';
}

function stateStyle(state: HealthState): { dot: string; ring: string; text: string; border: string } {
  if (state === 'green') {
    return {
      dot: 'bg-emerald-400',
      ring: 'ring-emerald-400/30',
      text: 'text-emerald-300',
      border: 'border-emerald-400/20',
    };
  }
  if (state === 'yellow') {
    return {
      dot: 'bg-amber-300',
      ring: 'ring-amber-300/30',
      text: 'text-amber-200',
      border: 'border-amber-300/20',
    };
  }
  return {
    dot: 'bg-red-400',
    ring: 'ring-red-400/30',
    text: 'text-red-300',
    border: 'border-red-400/20',
  };
}

function overallHeadline(state: HealthState): { title: string; body: string } {
  if (state === 'green') {
    return {
      title: 'All systems operational',
      body: 'Every data source is responding within its expected freshness window.',
    };
  }
  if (state === 'yellow') {
    return {
      title: 'Partial degradation',
      body: 'One or more sources are slower than usual. The app remains usable with cached data.',
    };
  }
  return {
    title: 'Service disruption',
    body: 'At least one data source is not responding. Some features may show stale or unavailable data.',
  };
}

export default function StatusPage() {
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastPoll, setLastPoll] = useState<number>(Date.now());

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health', { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as HealthPayload;
        setHealth(data);
      }
    } catch {
      // keep previous state
    } finally {
      setLoading(false);
      setLastPoll(Date.now());
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const timer = setInterval(fetchHealth, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchHealth]);

  const overall = health?.overall ?? 'red';
  const sources = health?.sources ?? [];
  const headline = overallHeadline(overall);
  const overallStyle = stateStyle(overall);

  return (
    <div className="min-h-screen w-full bg-[#050510] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_-10%,rgba(0,152,234,0.14),transparent_55%),radial-gradient(circle_at_80%_120%,rgba(139,92,246,0.08),transparent_60%)]" />

      <header className="relative z-10 border-b border-white/5 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <Link href="/welcome" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="aDEX Terminal" width={30} height={30} className="rounded-md" />
            <span className="text-sm font-black tracking-tight text-white/95">aDEX Terminal</span>
          </Link>
          <nav className="flex items-center gap-5 text-xs font-medium text-white/60">
            <Link href="/welcome" className="hover:text-white">Home</Link>
            <Link href="/security" className="hover:text-white">Security</Link>
            <Link href="/roadmap" className="hover:text-white">Roadmap</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-16">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-mono uppercase tracking-[0.22em] text-white/60">
            <Activity className="h-3 w-3" /> Live operational status
          </span>
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/[0.06] transition-all disabled:opacity-40"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className={`mt-6 flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-6 ring-1 ${overallStyle.ring}`}>
          <span className={`mt-1 inline-flex h-3 w-3 shrink-0 items-center justify-center rounded-full ${overallStyle.dot} shadow-[0_0_10px_currentColor]`} />
          <div>
            <h1 className="text-2xl font-black tracking-tight md:text-3xl">{headline.title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-white/65">{headline.body}</p>
          </div>
        </div>

        <section className="mt-10 space-y-3">
          {sources.length === 0 && loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-5 w-5 animate-spin text-white/40" />
            </div>
          ) : (
            sources.map((s) => {
              const style = stateStyle(s.state);
              const meta = SERVICE_META[s.name] ?? { title: s.name, description: '', icon: Activity };
              const Icon = meta.icon;
              return (
                <div
                  key={s.name}
                  className={`flex items-center justify-between gap-4 rounded-xl border bg-white/[0.02] p-5 ${style.border}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-white/[0.06] to-transparent ring-1 ring-white/10">
                      <Icon className="h-4 w-4 text-white/80" strokeWidth={1.6} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-white">{meta.title}</h2>
                      <p className="mt-1 text-xs leading-relaxed text-white/50">{meta.description}</p>
                      {s.state === 'red' && s.lastError && (
                        <p className="mt-1 text-[10px] font-mono text-red-300/60 truncate max-w-xs">
                          {s.lastError}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[11px] font-semibold ${style.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                      {stateLabel(s.state)}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">
                      {formatRelative(s.lastSuccessIso)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </section>

        <p className="mt-10 text-center text-xs text-white/45">
          Auto-refreshes every 60 seconds. Last checked {formatRelative(new Date(lastPoll).toISOString())}.
        </p>
      </main>

      <footer className="relative border-t border-white/5 px-5 py-8">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 text-xs text-white/50">
          <span>© {new Date().getFullYear()} aDEX Terminal</span>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/privacy" className="hover:text-white/80">Privacy</Link>
            <Link href="/terms" className="hover:text-white/80">Terms</Link>
            <Link href="/security" className="hover:text-white/80">Security</Link>
            <Link href="/roadmap" className="hover:text-white/80">Roadmap</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
