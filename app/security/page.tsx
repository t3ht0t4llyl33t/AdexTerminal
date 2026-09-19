import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ShieldCheck, Lock, Wallet, EyeOff, ScanLine, Mail } from 'lucide-react';

const TELEGRAM_SUPPORT_URL = 'https://t.me/aDEX_Live_Support_bot';

export const metadata: Metadata = {
  title: 'Security · aDEX Terminal',
  description:
    'How aDEX Terminal keeps user data, wallets and contracts safe. TON Connect, GoPlus signals and hardened row-level security.',
};

const PRINCIPLES = [
  {
    icon: Wallet,
    title: 'Your wallet stays yours',
    body:
      'aDEX Terminal never asks for a seed phrase, private key or wallet password. Every on-chain interaction is authorised in your own wallet through TON Connect.',
  },
  {
    icon: Lock,
    title: 'Hardened data layer',
    body:
      'All user tables run with row-level security enabled — each user reads only their own rows, and privileged mutations pass through server-side checks with the service role only.',
  },
  {
    icon: ScanLine,
    title: 'Independent risk signals',
    body:
      'Contract safety is powered by GoPlus Security signals for BSC and Base, and by on-chain heuristics for TON. Verdicts are shown with the sources so you can double-check.',
  },
  {
    icon: EyeOff,
    title: 'Minimal footprint',
    body:
      'We store what is required to run the product: your Telegram user id, your PRO settings and your alert preferences. No emails, no addresses, no chat history.',
  },
];

export default function SecurityPage() {
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
            <Link href="/roadmap" className="hover:text-white">Roadmap</Link>
            <Link href="/status" className="hover:text-white">Status</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-16">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-mono uppercase tracking-[0.22em] text-white/60">
          <ShieldCheck className="h-3 w-3" /> Security notes
        </span>
        <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight md:text-5xl">
          Built to trade, built to protect.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/70">
          aDEX Terminal is a read-only research surface for the Telegram trader. Custody stays in your wallet, data stays
          scoped to your account, and every third-party integration is chosen for its track record.
        </p>

        <section className="mt-12 grid gap-4 md:grid-cols-2">
          {PRINCIPLES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
            >
              <div className="flex items-center gap-3">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#0098EA]/25 to-[#00D4FF]/10 ring-1 ring-white/10">
                  <Icon className="h-4 w-4 text-[#00D4FF]" strokeWidth={1.75} />
                </div>
                <h3 className="text-base font-bold text-white">{title}</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-white/60">{body}</p>
            </div>
          ))}
        </section>

        <section className="mt-14 rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
          <h2 className="text-xl font-black tracking-tight">What we take seriously</h2>
          <ul className="mt-5 grid gap-4 text-sm leading-relaxed text-white/70 md:grid-cols-2">
            <li>
              <span className="font-semibold text-white/90">TON Connect only.</span> Payments and subscription upgrades go
              through TON Connect signatures — the funds move from your wallet directly to the payout address you can
              verify on-chain.
            </li>
            <li>
              <span className="font-semibold text-white/90">Server-only secrets.</span> API keys, service role and payout
              wallet mnemonics live only on the server. They never reach the browser.
            </li>
            <li>
              <span className="font-semibold text-white/90">Rate-limited endpoints.</span> Public API routes are throttled
              per IP and per Telegram user to keep the service responsive for everyone.
            </li>
            <li>
              <span className="font-semibold text-white/90">Signed webhooks.</span> Every payment webhook is verified with
              its provider signature before we credit your subscription.
            </li>
            <li>
              <span className="font-semibold text-white/90">Cached read-through.</span> Market data lives in a short-lived
              server cache with jittered refresh, so no user query fans out to third-party APIs on every keystroke.
            </li>
            <li>
              <span className="font-semibold text-white/90">Scoped audit trail.</span> Every scan and every referral event
              is journaled in an append-only table, retained just long enough to serve you.
            </li>
          </ul>
        </section>

        <section className="mt-14 rounded-2xl border border-white/10 bg-gradient-to-br from-[#0B0B14] to-[#080814] p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#0098EA]/25 to-[#00D4FF]/10 ring-1 ring-white/10">
              <Mail className="h-4 w-4 text-[#00D4FF]" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">Report a security issue</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/70">
                Found something that looks off? Reach the maintainers through the official support bot on Telegram. Please
                describe the issue, list the steps to reproduce it, and — if the finding is sensitive — do not share it
                publicly until we have had a chance to respond.
              </p>
              <a
                href={TELEGRAM_SUPPORT_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0098EA] to-[#00D4FF] px-4 py-2.5 text-sm font-bold text-white shadow-[0_0_24px_rgba(0,212,255,0.28)] transition-all hover:shadow-[0_0_32px_rgba(0,212,255,0.42)]"
              >
                Contact aDEX Support
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-white/5 px-5 py-8">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 text-xs text-white/50">
          <span>© {new Date().getFullYear()} aDEX Terminal</span>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/privacy" className="hover:text-white/80">Privacy</Link>
            <Link href="/terms" className="hover:text-white/80">Terms</Link>
            <Link href="/status" className="hover:text-white/80">Status</Link>
            <Link href="/roadmap" className="hover:text-white/80">Roadmap</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
