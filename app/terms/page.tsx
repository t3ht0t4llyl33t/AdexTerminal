import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Use — aDEX Terminal',
  description:
    'Terms of use for aDEX Terminal — the Telegram-first on-chain analytics terminal for TON, BSC and Base.',
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#0B0B0F] text-white/85 px-5 py-10 md:px-10 md:py-14">
      <div className="max-w-2xl mx-auto flex flex-col gap-6 leading-relaxed">
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-white/40">
            aDEX Terminal
          </span>
          <h1 className="text-2xl font-black tracking-tight">Terms of Use</h1>
          <p className="text-xs text-white/40">Last updated: 18 September 2026</p>
        </div>

        <p className="text-sm text-white/70">
          aDEX Terminal is an on-chain analytics terminal delivered as a Telegram Mini App.
          By opening the terminal you agree to the terms below. If you do not agree, please
          close the app.
        </p>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white">1. What the terminal does</h2>
          <p className="text-sm text-white/65">
            The terminal aggregates public on-chain data (volumes, trades, holder distribution)
            from TON, BNB Smart Chain and Base networks and presents it in three modules — Radar,
            Whales and Scanner. All data is derived from public sources such as GeckoTerminal,
            TonAPI, and GoPlus Security. Nothing shown in the terminal is investment advice.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white">2. Not financial advice</h2>
          <p className="text-sm text-white/65">
            Signals, scores and verdicts inside the terminal are rule-based interpretations of
            public data. They are informational only and do not constitute a recommendation to buy,
            sell or hold any asset. You are solely responsible for your trading decisions and for
            the safety of your funds and wallets.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white">3. Pro subscription</h2>
          <p className="text-sm text-white/65">
            The Pro tier is priced at a fixed USD target (currently $9.9/month) and charged in
            TON. The TON amount is refreshed from a public rate feed twice per day and rounded
            down to the nearest 0.1 TON, so the actual charge is never higher than the stated USD
            target. Subscriptions are billed monthly and do not auto-renew — you must renew
            manually.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white">4. On-chain payments</h2>
          <p className="text-sm text-white/65">
            Payments are processed on-chain via TON Connect or Crypto Pay. On-chain transactions
            are final. If a payment fails to activate Pro within 30 minutes, contact support and
            provide your transaction hash — we will resolve it manually.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white">5. Prohibited use</h2>
          <p className="text-sm text-white/65">
            You may not use the terminal to scrape data at industrial scale, resell aggregated
            output, or attempt to disrupt the service. Automated abuse triggers rate-limit and, on
            repeat, an account block.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white">6. Availability and changes</h2>
          <p className="text-sm text-white/65">
            The terminal depends on third-party public data sources. Outages, rate limits or
            upstream data errors may temporarily degrade features. We reserve the right to change
            these terms; the current version always lives at this URL with the &ldquo;Last updated&rdquo;
            date above.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white">7. Contact</h2>
          <p className="text-sm text-white/65">
            Support and legal enquiries:{' '}
            <a
              href="https://t.me/aDEX_Live_Support_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-300 hover:text-sky-200 underline underline-offset-4"
            >
              @aDEX_Live_Support_bot
            </a>
            .
          </p>
        </section>

        <div className="pt-4">
          <Link
            href="/"
            className="text-xs text-white/40 hover:text-white/70 transition-colors underline underline-offset-4"
          >
            Return to terminal
          </Link>
        </div>
      </div>
    </main>
  );
}
