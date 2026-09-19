import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Activity, Radar, Bell, Coins, CreditCard, Sparkles } from 'lucide-react';
import { getSupabase } from '@/lib/supabase-server';

export const metadata: Metadata = {
  title: 'Status · aDEX Terminal',
  description:
    'Live operational status for every part of aDEX Terminal — radar refresh, alerts engine, price feed, subscriptions and payouts.',
};

export const revalidate = 60;
export const dynamic = 'force-dynamic';

type State = 'active' | 'syncing' | 'maintenance';

interface ServiceRow {
  key: string;
  title: string;
  description: string;
  icon: typeof Activity;
  jobName: string;
  activeWithinMinutes: number;
  syncingWithinMinutes: number;
}

const SERVICES: ServiceRow[] = [
  {
    key: 'radar',
    title: 'Market Radar',
    description: 'Volume spike scan across TON, BSC and Base.',
    icon: Radar,
    jobName: 'tick',
    activeWithinMinutes: 10,
    syncingWithinMinutes: 60,
  },
  {
    key: 'alerts',
    title: 'Alerts Engine',
    description: 'Telegram delivery for spike and whale alerts.',
    icon: Bell,
    jobName: 'alert-check',
    activeWithinMinutes: 15,
    syncingWithinMinutes: 90,
  },
  {
    key: 'price',
    title: 'TON Price Feed',
    description: 'Reference rate used for pricing and PRO checkout.',
    icon: Coins,
    jobName: 'refresh-ton-price',
    activeWithinMinutes: 30,
    syncingWithinMinutes: 180,
  },
  {
    key: 'subscriptions',
    title: 'Subscriptions',
    description: 'PRO subscription lifecycle and expiration checks.',
    icon: CreditCard,
    jobName: 'subscription-check',
    activeWithinMinutes: 90,
    syncingWithinMinutes: 360,
  },
  {
    key: 'payouts',
    title: 'Referral Payouts',
    description: 'Automated TON payouts from the highload wallet.',
    icon: Sparkles,
    jobName: 'highload-sweep',
    activeWithinMinutes: 120,
    syncingWithinMinutes: 720,
  },
];

interface ServiceState {
  key: string;
  title: string;
  description: string;
  icon: typeof Activity;
  state: State;
  lastActivityIso: string | null;
}

async function loadStates(): Promise<ServiceState[]> {
  try {
    const supabase = getSupabase();
    const now = Date.now();

    const results = await Promise.all(
      SERVICES.map(async (svc) => {
        const { data } = await supabase
          .from('cron_runs')
          .select('started_at, status')
          .eq('job_name', svc.jobName)
          .eq('status', 'ok')
          .order('started_at', { ascending: false })
          .limit(1);

        const last = data?.[0]?.started_at ?? null;
        let state: State = 'maintenance';
        if (last) {
          const diffMin = (now - new Date(last).getTime()) / 60_000;
          if (diffMin <= svc.activeWithinMinutes) state = 'active';
          else if (diffMin <= svc.syncingWithinMinutes) state = 'syncing';
        }

        return {
          key: svc.key,
          title: svc.title,
          description: svc.description,
          icon: svc.icon,
          state,
          lastActivityIso: last,
        } satisfies ServiceState;
      })
    );

    return results;
  } catch {
    return SERVICES.map((svc) => ({
      key: svc.key,
      title: svc.title,
      description: svc.description,
      icon: svc.icon,
      state: 'syncing' as State,
      lastActivityIso: null,
    }));
  }
}

function formatRelative(iso: string | null): string {
  if (!iso) return 'Preparing';
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 60_000) return 'moments ago';
  const min = Math.round(diffMs / 60_000);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} h ago`;
  const days = Math.round(hr / 24);
  return `${days} d ago`;
}

function stateLabel(state: State): string {
  if (state === 'active') return 'Active';
  if (state === 'syncing') return 'Syncing';
  return 'Maintenance';
}

function stateStyle(state: State): { dot: string; ring: string; text: string } {
  if (state === 'active') {
    return {
      dot: 'bg-emerald-400',
      ring: 'ring-emerald-400/30',
      text: 'text-emerald-300',
    };
  }
  if (state === 'syncing') {
    return {
      dot: 'bg-amber-300',
      ring: 'ring-amber-300/30',
      text: 'text-amber-200',
    };
  }
  return {
    dot: 'bg-sky-300',
    ring: 'ring-sky-300/30',
    text: 'text-sky-200',
  };
}

function overallState(states: ServiceState[]): State {
  if (states.every((s) => s.state === 'active')) return 'active';
  if (states.some((s) => s.state === 'maintenance')) return 'maintenance';
  return 'syncing';
}

function overallHeadline(state: State): { title: string; body: string } {
  if (state === 'active') {
    return {
      title: 'All systems active',
      body: 'Every module of aDEX Terminal is responding on schedule.',
    };
  }
  if (state === 'syncing') {
    return {
      title: 'Modules are syncing',
      body: 'Data is refreshing in the background. The Mini App remains fully usable.',
    };
  }
  return {
    title: 'Scheduled maintenance',
    body: 'A module is taking a maintenance window. The rest of the terminal is unaffected.',
  };
}

export default async function StatusPage() {
  const states = await loadStates();
  const overall = overallState(states);
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
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-mono uppercase tracking-[0.22em] text-white/60">
          <Activity className="h-3 w-3" /> Live operational status
        </span>

        <div
          className={`mt-6 flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-6 ring-1 ${overallStyle.ring}`}
        >
          <span
            className={`mt-1 inline-flex h-3 w-3 shrink-0 items-center justify-center rounded-full ${overallStyle.dot} shadow-[0_0_10px_currentColor]`}
          />
          <div>
            <h1 className="text-2xl font-black tracking-tight md:text-3xl">{headline.title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-white/65">{headline.body}</p>
          </div>
        </div>

        <section className="mt-10 space-y-3">
          {states.map((s) => {
            const style = stateStyle(s.state);
            const Icon = s.icon;
            return (
              <div
                key={s.key}
                className="flex items-center justify-between gap-4 rounded-xl border border-white/8 bg-white/[0.02] p-5"
              >
                <div className="flex items-center gap-4">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-white/[0.06] to-transparent ring-1 ring-white/10">
                    <Icon className="h-4 w-4 text-white/80" strokeWidth={1.6} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">{s.title}</h2>
                    <p className="mt-1 text-xs leading-relaxed text-white/50">{s.description}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[11px] font-semibold ${style.text}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                    {stateLabel(s.state)}
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">
                    {formatRelative(s.lastActivityIso)}
                  </span>
                </div>
              </div>
            );
          })}
        </section>

        <p className="mt-10 text-center text-xs text-white/45">
          Status refreshes every minute. Times are shown relative to the last successful run.
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
