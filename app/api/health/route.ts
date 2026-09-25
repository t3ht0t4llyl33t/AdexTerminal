import { NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase-server';
import { cachedJson } from '@/lib/edge-cache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

const SOURCES = [
  { name: 'TonAPI', jobName: 'tick', greenMins: 10, yellowMins: 30 },
  { name: 'GeckoTerminal', jobName: 'tick', greenMins: 10, yellowMins: 30 },
  { name: 'GoPlus', jobName: 'tick', greenMins: 10, yellowMins: 30 },
  { name: 'Groq', jobName: 'alert-check', greenMins: 15, yellowMins: 60 },
  { name: 'Supabase', jobName: 'daily', greenMins: 90, yellowMins: 360 },
] as const;

function classify(lastSuccessIso: string | null, greenMins: number, yellowMins: number): HealthState {
  if (!lastSuccessIso) return 'red';
  const ageMin = (Date.now() - new Date(lastSuccessIso).getTime()) / 60_000;
  if (ageMin <= greenMins) return 'green';
  if (ageMin <= yellowMins) return 'yellow';
  return 'red';
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();

    const results = await Promise.all(
      SOURCES.map(async (src) => {
        const [okRes, errRes] = await Promise.all([
          supabase
            .from('cron_runs')
            .select('finished_at')
            .eq('job_name', src.jobName)
            .eq('status', 'ok')
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('cron_runs')
            .select('finished_at,error_message')
            .eq('job_name', src.jobName)
            .eq('status', 'error')
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        const lastSuccessIso = okRes.data?.finished_at ?? null;
        const lastErrorIso = errRes.data?.finished_at ?? null;
        const lastError = errRes.data?.error_message ?? null;
        const state = classify(lastSuccessIso, src.greenMins, src.yellowMins);

        return {
          name: src.name,
          state,
          lastSuccessIso,
          lastErrorIso,
          lastError,
        } satisfies SourceHealth;
      }),
    );

    const overall: HealthState = results.every((r) => r.state === 'green')
      ? 'green'
      : results.some((r) => r.state === 'red')
        ? 'red'
        : 'yellow';

    const payload: HealthPayload = {
      ok: true,
      updated_at: new Date().toISOString(),
      sources: results,
      overall,
    };

    return cachedJson(req, payload, { sMaxAge: 30, swr: 60 }, 'live');
  } catch {
    const fallback: HealthPayload = {
      ok: false,
      updated_at: new Date().toISOString(),
      sources: SOURCES.map((s) => ({
        name: s.name,
        state: 'red' as HealthState,
        lastSuccessIso: null,
        lastErrorIso: null,
        lastError: 'health endpoint error',
      })),
      overall: 'red',
    };
    return cachedJson(req, fallback, { sMaxAge: 15, swr: 30 }, 'fallback');
  }
}
