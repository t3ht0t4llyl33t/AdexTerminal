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
          <p className="text-xs text-white/40">Last updated: 18 September 2026</p>
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
            Connect or Crypto Pay. We record the transaction hash and amount for activation. Card
            payments are not accepted.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white">5. Retention</h2>
          <p className="text-sm text-white/65">
            Cached market data is retained for at most 3 days. Payment records are retained as
            long as required for accounting. Alert configurations remain until you delete them.
            Anonymised desktop-visit counters are retained for 90 days.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white">6. Your rights</h2>
          <p className="text-sm text-white/65">
            You can request a copy or deletion of any data associated with your Telegram ID by
            contacting support. Deletion requests are processed within 14 days, except for payment
            records that we are legally required to keep.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white">7. Contact</h2>
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
