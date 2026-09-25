import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — aDEX Terminal',
  description:
    'Privacy policy for aDEX Terminal — what we collect, what we never touch, and how the Telegram Mini App handles your data.',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#0B0B0F] text-white/85 px-5 py-10 md:px-10 md:py-14">
      <div className="max-w-2xl mx-auto flex flex-col gap-6 leading-relaxed">
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-white/40">
            aDEX Terminal
          </span>
          <h1 className="text-2xl font-black tracking-tight">Privacy Policy</h1>
          <p className="text-xs text-white/40">Last updated: 25 September 2026</p>
        </div>

        <p className="text-sm text-white/70">
          aDEX Terminal is designed to work with the minimum amount of personal data. This page
          explains exactly what is stored and why.
        </p>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white">1. What we store</h2>
          <ul className="text-sm text-white/65 list-disc pl-5 flex flex-col gap-1.5">
            <li>
              Your Telegram user ID (numeric), so we can remember your Pro status, alert
              preferences, and referral code.
            </li>
            <li>
              Your alert configuration and Pro filter settings — only the values you set yourself
              inside the app.
            </li>
            <li>
              Anonymised desktop-visit counters (hashed IP + user-agent) used to measure how
              many desktop visitors chose to open the app in Telegram vs continue in preview mode.
              Raw IP addresses are never stored.
            </li>
            <li>
              Payment records for Pro activation — the sender wallet address you connect via TON
              Connect, the transaction hash, the amount in TON and the fiat target. These are
              required for accounting and refund handling.
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white">2. What we never touch</h2>
          <ul className="text-sm text-white/65 list-disc pl-5 flex flex-col gap-1.5">
            <li>Private keys, seed phrases, or wallet passwords. We only receive the public address you sign the payment from.</li>
            <li>Your Telegram phone number, name, avatar, or contact list.</li>
            <li>Messages inside your Telegram chats.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white">3. Data sources</h2>
          <p className="text-sm text-white/65">
            All market data shown in the terminal is fetched from public APIs — GeckoTerminal,
            TonAPI, GoPlus Security, and public TON/EVM RPC nodes. Data returned to your session
            is briefly cached server-side to keep response times low and to stay within upstream
            rate limits.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white">4. Payments</h2>
          <p className="text-sm text-white/65">
            When you pay for Pro, the transaction happens directly on the TON blockchain via TON
            Connect, Telegram Stars, or Crypto Pay. We record the transaction hash and amount for
            activation. Card payments are not accepted.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white">5. Affiliate &amp; referral commissions</h2>
          <p className="text-sm text-white/65">
            Some third-party services linked from the terminal — for example the Maestro trading
            bot — are reached through our referral link. When you sign up or transact via that
            link, aDEX Terminal may receive a commission from the provider at no extra cost to you.
            This never affects the price you pay and never grants us access to your wallet or funds.
          </p>
          <p className="text-sm text-white/65">
            The in-app referral program works the same way: when another user unlocks Pro using your
            referral code, you receive 20% of their payment. Commissions are paid out through TON
            Connect to a wallet you control.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white">6. Retention</h2>
          <p className="text-sm text-white/65">
            Data lives only as long as it is useful. Automated database jobs prune older rows on a
            fixed schedule so nothing accumulates indefinitely.
          </p>
          <ul className="text-sm text-white/65 list-disc pl-5 flex flex-col gap-1.5 mt-1">
            <li>Contract scan cache — up to 3 days.</li>
            <li>Scheduled-job journal (cron runs) — up to 30 days.</li>
            <li>Session audit log — up to 90 days.</li>
            <li>Product analytics events — up to 90 days.</li>
            <li>Rate-limit buckets — pruned 30 days after your last activity.</li>
            <li>Payment records — up to 365 days (retained for accounting).</li>
            <li>Referral payout records — up to 365 days (retained for accounting).</li>
            <li>Anonymised desktop-visit counters — up to 90 days.</li>
            <li>Alert configurations and Pro settings — kept until you change or delete them.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white">7. Your rights</h2>
          <p className="text-sm text-white/65">
            You can request a copy or deletion of any data associated with your Telegram ID by
            contacting support. Deletion requests are processed within 14 days, except for payment
            records that we are legally required to keep.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white">8. Contact</h2>
          <p className="text-sm text-white/65">
            Privacy requests:{' '}
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
