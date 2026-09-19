import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { CheckCircle2, Loader2, Sparkles, Map } from 'lucide-react';
import { getSupabase } from '@/lib/supabase-server';

export const metadata: Metadata = {
  title: 'Roadmap · aDEX Terminal',
  description:
    'Shipped milestones, work in progress and upcoming features for aDEX Terminal — the Telegram-native DEX radar for TON, BSC and Base.',
};

export const revalidate = 300;
export const dynamic = 'force-dynamic';

type Category = 'shipped' | 'in_progress' | 'next';

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  category: Category;
  position: number;
}

const LANES: {
  key: Category;
  title: string;
  hint: string;
  icon: typeof CheckCircle2;
  accent: string;
  ring: string;
}[] = [
  {
    key: 'shipped',
    title: 'Shipped',
    hint: 'Already live inside the Mini App.',
    icon: CheckCircle2,
    accent: 'text-emerald-300',
    ring: 'ring-emerald-400/25',
  },
  {
    key: 'in_progress',
    title: 'In progress',
    hint: 'Currently being built and polished.',
    icon: Loader2,
    accent: 'text-[#00D4FF]',
    ring: 'ring-[#00D4FF]/25',
  },
  {
    key: 'next',
    title: 'Up next',
    hint: 'Scheduled to arrive in the coming weeks.',
    icon: Sparkles,
    accent: 'text-amber-200',
    ring: 'ring-amber-300/25',
  },
];

async function loadItems(): Promise<Record<Category, RoadmapItem[]>> {
  const empty: Record<Category, RoadmapItem[]> = {
    shipped: [],
    in_progress: [],
    next: [],
  };
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('roadmap_items')
      .select('id, title, description, category, position')
      .eq('published', true)
      .order('category', { ascending: true })
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    if (!data) return empty;
    for (const row of data as RoadmapItem[]) {
      if (row.category in empty) {
        empty[row.category].push(row);
      }
    }
    return empty;
  } catch {
    return empty;
  }
}

export default async function RoadmapPage() {
  const items = await loadItems();

  return (
    <div className="min-h-screen w-full bg-[#050510] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_-10%,rgba(0,152,234,0.14),transparent_55%),radial-gradient(circle_at_80%_120%,rgba(139,92,246,0.08),transparent_60%)]" />

      <header className="relative z-10 border-b border-white/5 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link href="/welcome" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="aDEX Terminal" width={30} height={30} className="rounded-md" />
            <span className="text-sm font-black tracking-tight text-white/95">aDEX Terminal</span>
          </Link>
          <nav className="flex items-center gap-5 text-xs font-medium text-white/60">
            <Link href="/welcome" className="hover:text-white">Home</Link>
            <Link href="/security" className="hover:text-white">Security</Link>
            <Link href="/status" className="hover:text-white">Status</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-16">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-mono uppercase tracking-[0.22em] text-white/60">
          <Map className="h-3 w-3" /> Product roadmap
        </span>
        <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight md:text-5xl">
          What we shipped, what we&rsquo;re building, what&rsquo;s next.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/70">
          A living map of the aDEX Terminal product. Milestones move from &ldquo;up next&rdquo; to &ldquo;in progress&rdquo;
          to &ldquo;shipped&rdquo; as they land inside the Mini App.
        </p>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {LANES.map((lane) => {
            const Icon = lane.icon;
            const rows = items[lane.key];
            return (
              <section
                key={lane.key}
                className={`rounded-2xl border border-white/10 bg-white/[0.02] p-6 ring-1 ${lane.ring}`}
              >
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-white/[0.06] to-transparent ring-1 ring-white/10">
                    <Icon className={`h-4 w-4 ${lane.accent}`} strokeWidth={1.75} />
                  </div>
                  <div>
                    <h2 className="text-base font-black tracking-tight text-white">{lane.title}</h2>
                    <p className="text-[11px] font-mono uppercase tracking-widest text-white/40">
                      {lane.hint}
                    </p>
                  </div>
                </div>

                <ul className="mt-6 space-y-4">
                  {rows.length === 0 ? (
                    <li className="rounded-lg border border-dashed border-white/8 bg-white/[0.01] px-3 py-4 text-xs text-white/45">
                      New updates appear here as they are planned.
                    </li>
                  ) : (
                    rows.map((item) => (
                      <li
                        key={item.id}
                        className="rounded-lg border border-white/8 bg-white/[0.02] p-4"
                      >
                        <h3 className="text-sm font-bold text-white">{item.title}</h3>
                        <p className="mt-1.5 text-[13px] leading-relaxed text-white/60">
                          {item.description}
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              </section>
            );
          })}
        </div>
      </main>

      <footer className="relative border-t border-white/5 px-5 py-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 text-xs text-white/50">
          <span>© {new Date().getFullYear()} aDEX Terminal</span>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/privacy" className="hover:text-white/80">Privacy</Link>
            <Link href="/terms" className="hover:text-white/80">Terms</Link>
            <Link href="/security" className="hover:text-white/80">Security</Link>
            <Link href="/status" className="hover:text-white/80">Status</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
