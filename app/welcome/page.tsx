import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ScamodarCard } from '@/components/shared/ScamodarCard';
import { WelcomeTracker } from '@/components/shared/WelcomeTracker';
import {
  Activity,
  ArrowRight,
  BellRing,
  ExternalLink,
  Gauge,
  Layers,
  Radar,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  Waves,
} from 'lucide-react';

const TELEGRAM_MINIAPP_URL = 'https://t.me/aDEX_Live_Support_bot/app';

export const metadata: Metadata = {
  title: 'aDEX Terminal — Real-time DEX radar for TON, BSC and Base',
  description:
    'A Telegram-native quant terminal for spotting volume spikes, tracking whale wallets and scanning contract safety across TON, BSC and Base. Launch in one tap.',
  openGraph: {
    title: 'aDEX Terminal — Real-time DEX radar for TON, BSC and Base',
    description:
      'A Telegram-native quant terminal for spotting volume spikes, tracking whale wallets and scanning contract safety across TON, BSC and Base.',
    url: 'https://adexterminal.com/welcome',
    siteName: 'aDEX Terminal',
    images: [
      {
        url: 'https://adexterminal.com/logo.png',
        width: 512,
        height: 512,
        alt: 'aDEX Terminal',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'aDEX Terminal',
    description:
      'Telegram-native DEX radar for TON, BSC and Base — volume spikes, whale wallets and contract safety in one tap.',
    images: ['https://adexterminal.com/logo.png'],
  },
};

const PRIMARY_MODULES = [
  {
    icon: Radar,
    title: 'Volume Radar',
    body: 'Fresh 15-minute pulse of every liquid pair on TON, BSC and Base. Spot new momentum the moment it forms.',
  },
  {
    icon: Waves,
    title: 'Whale X-Ray',
    body: 'Live whale wallet feed with size, direction and cross-chain footprint. See the money that moves the market.',
  },
  {
    icon: ShieldCheck,
    title: 'Contract Vault',
    body: 'Instant safety scan powered by GoPlus signals — LP status, dev cluster, honeypot and tax checks in seconds.',
  },
];

const SECONDARY_FEATURES = [
  { icon: BellRing, title: 'Telegram alerts', body: 'Spike and whale-buy notifications delivered right into the chat.' },
  { icon: Wallet, title: 'TON Connect payments', body: 'Upgrade to PRO with your existing wallet — no card, no bridge.' },
  { icon: Users, title: 'Referral rewards', body: 'Earn TON directly for every friend who upgrades. Instant payouts.' },
  { icon: Layers, title: 'Three chains, one view', body: 'Unified table for TON, BSC and Base. Switch chains without losing context.' },
  { icon: Sparkles, title: 'PRO filters', body: 'Custom liquidity, spike and volume thresholds tuned to your playbook.' },
  { icon: Gauge, title: 'Snapshot portfolios', body: 'Peek into any whale wallet: current holdings, USD value and risk flags.' },
];

const TRUST_POINTS = [
  { label: 'Chains covered', value: 'TON · BSC · Base' },
  { label: 'Data refresh', value: 'Every 60 seconds' },
  { label: 'Signal sources', value: 'GeckoTerminal · TonAPI · GoPlus' },
  { label: 'Payments', value: 'TON Connect · Crypto Pay' },
];

const STEPS = [
  {
    title: 'Open the Mini App',
    body: 'Launch aDEX Terminal directly inside Telegram. No sign-up, no seed phrase — the Mini App picks up your Telegram identity.',
  },
  {
    title: 'Scan the market',
    body: 'The radar boots straight into the freshest movers. Switch to Whales for live wallet flow, or drop a contract into the Vault for a safety readout.',
  },
  {
    title: 'Set alerts and go PRO',
    body: 'Turn on Telegram alerts for spikes and whale buys, then unlock PRO filters and unlimited scans with a single TON Connect signature.',
  },
];

export default function WelcomePage() {
  return (
    <div className="min-h-screen w-full bg-[#050510] text-white">
      <WelcomeTracker />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_-10%,rgba(0,152,234,0.18),transparent_55%),radial-gradient(circle_at_80%_10%,rgba(0,212,255,0.12),transparent_55%),radial-gradient(circle_at_50%_120%,rgba(139,92,246,0.12),transparent_65%)]" />

      <header className="relative z-10 border-b border-white/5 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/welcome" className="flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="aDEX Terminal"
              width={36}
              height={36}
              className="rounded-md"
              priority
            />
            <span className="text-sm font-black tracking-tight text-white/95">
              aDEX Terminal
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-xs font-medium text-white/60 md:flex">
            <Link href="#modules" className="transition-colors hover:text-white">Modules</Link>
            <Link href="#howitworks" className="transition-colors hover:text-white">How it works</Link>
            <Link href="/security" className="transition-colors hover:text-white">Security</Link>
            <Link href="/roadmap" className="transition-colors hover:text-white">Roadmap</Link>
            <Link href="/status" className="transition-colors hover:text-white">Status</Link>
          </nav>
          <a
            href={TELEGRAM_MINIAPP_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="group inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#0098EA] to-[#00D4FF] px-3.5 py-2 text-xs font-bold text-white shadow-[0_0_20px_rgba(0,212,255,0.25)] transition-all hover:shadow-[0_0_28px_rgba(0,212,255,0.4)]"
          >
            Open in Telegram
            <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </header>

      <section className="relative overflow-hidden px-5 pb-16 pt-20 md:pt-28">
        <div className="mx-auto grid max-w-6xl gap-14 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:items-center md:gap-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-mono uppercase tracking-[0.22em] text-white/60">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Live · TON · BSC · Base
            </span>
            <h1 className="mt-6 text-4xl font-black leading-[1.05] tracking-tight text-balance md:text-6xl">
              The real-time DEX radar
              <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-[#0098EA] via-[#00D4FF] to-[#8B5CF6] bg-clip-text text-transparent">
                built for Telegram traders.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/70 md:text-lg">
              aDEX Terminal watches TON, BSC and Base for you: volume spikes, whale wallets and contract risk — all in one tap
              from Telegram. No downloads, no seed phrase, no context switch.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href={TELEGRAM_MINIAPP_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0098EA] to-[#00D4FF] px-5 py-3 text-sm font-bold text-white shadow-[0_0_32px_rgba(0,212,255,0.32)] transition-all hover:shadow-[0_0_42px_rgba(0,212,255,0.5)]"
              >
                Open the Mini App
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="#modules"
                className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.02] px-5 py-3 text-sm font-semibold text-white/80 transition-colors hover:bg-white/[0.06]"
              >
                See what it does
              </Link>
            </div>

            <dl className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {TRUST_POINTS.map((p) => (
                <div
                  key={p.label}
                  className="rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-3"
                >
                  <dt className="text-[10px] font-mono uppercase tracking-widest text-white/45">
                    {p.label}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-white/90">{p.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative mx-auto w-full max-w-md md:mx-0">
            <div className="absolute -inset-6 -z-10 rounded-[36px] bg-[radial-gradient(circle_at_50%_20%,rgba(0,212,255,0.25),transparent_65%)] blur-2xl" />
            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-[#0B0B14] to-[#050510] p-2 shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
              <div className="overflow-hidden rounded-[22px] border border-white/5 bg-black/40 aspect-[9/16]">
                <Image
                  src="/logo.png"
                  alt="aDEX Terminal preview"
                  width={520}
                  height={924}
                  className="h-full w-full object-contain p-8"
                  priority
                />
              </div>
              <div className="absolute inset-x-6 -bottom-3 h-6 rounded-full bg-[radial-gradient(circle,rgba(0,212,255,0.32),transparent_70%)] blur-md" />
            </div>
          </div>
        </div>
      </section>

      <section id="modules" className="relative px-5 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_360px]">
            <div className="max-w-2xl">
              <span className="text-[11px] font-mono uppercase tracking-[0.24em] text-white/45">Three modules, one terminal</span>
              <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
                Everything a Telegram trader needs, without leaving the chat.
              </h2>
            </div>
            <ScamodarCard lang="EN" variant="landing" />
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {PRIMARY_MODULES.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="group relative overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-b from-white/[0.04] to-transparent p-6 transition-all hover:-translate-y-0.5 hover:border-white/20"
              >
                <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#0098EA]/25 to-[#00D4FF]/10 ring-1 ring-white/10">
                  <Icon className="h-5 w-5 text-[#00D4FF]" strokeWidth={1.75} />
                </div>
                <h3 className="text-lg font-bold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{body}</p>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            ))}
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SECONDARY_FEATURES.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-xl border border-white/6 bg-white/[0.02] p-5"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-white/70" strokeWidth={1.6} />
                  <h4 className="text-sm font-semibold text-white/90">{title}</h4>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="howitworks" className="relative px-5 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <span className="text-[11px] font-mono uppercase tracking-[0.24em] text-white/45">How it works</span>
            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
              From tap to trade in under a minute.
            </h2>
          </div>

          <ol className="mt-12 grid gap-5 md:grid-cols-3">
            {STEPS.map((s, idx) => (
              <li
                key={s.title}
                className="relative rounded-2xl border border-white/8 bg-white/[0.02] p-6"
              >
                <span className="absolute right-5 top-5 font-mono text-[11px] uppercase tracking-widest text-white/30">
                  0{idx + 1}
                </span>
                <h3 className="pr-10 text-lg font-bold text-white">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/60">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="relative px-5 py-20">
        <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0B0B14] to-[#080814] p-8 text-center shadow-[0_30px_90px_rgba(0,0,0,0.5)] md:p-14">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_-20%,rgba(0,212,255,0.25),transparent_60%)]" />
          <Activity className="mx-auto h-8 w-8 text-[#00D4FF]" strokeWidth={1.6} />
          <h2 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
            Ready when you are.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/65">
            Open aDEX Terminal directly inside Telegram — the Mini App is live, TON Connect is wired up, and your first
            batch of scans is free.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href={TELEGRAM_MINIAPP_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0098EA] to-[#00D4FF] px-5 py-3 text-sm font-bold text-white shadow-[0_0_32px_rgba(0,212,255,0.32)] transition-all hover:shadow-[0_0_42px_rgba(0,212,255,0.5)]"
            >
              Launch the Mini App
              <ExternalLink className="h-4 w-4" />
            </a>
            <Link
              href="/security"
              className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.02] px-5 py-3 text-sm font-semibold text-white/80 transition-colors hover:bg-white/[0.06]"
            >
              Read the security notes
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative border-t border-white/5 px-5 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-center gap-2.5">
            <Image src="/icon.svg" alt="" width={22} height={22} className="opacity-80" />
            <span className="text-xs text-white/50">© {new Date().getFullYear()} aDEX Terminal</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/50">
            <Link href="/privacy" className="hover:text-white/80">Privacy</Link>
            <Link href="/terms" className="hover:text-white/80">Terms</Link>
            <Link href="/security" className="hover:text-white/80">Security</Link>
            <Link href="/status" className="hover:text-white/80">Status</Link>
            <Link href="/roadmap" className="hover:text-white/80">Roadmap</Link>
            <a
              href={TELEGRAM_MINIAPP_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="hover:text-white/80"
            >
              Open in Telegram
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
