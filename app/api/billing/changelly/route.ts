import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CHANGELLY_PARTNER_ID = process.env.CHANGELLY_PARTNER_ID || '';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { destination_address, source_currency } = body as {
      destination_address?: string;
      source_currency?: string;
    };

    if (!destination_address) {
      return NextResponse.json({ error: 'missing destination_address' }, { status: 400 });
    }

    const params = new URLSearchParams({
      output: 'TON',
      address: destination_address,
      ref: CHANGELLY_PARTNER_ID,
    });

    if (source_currency) {
      params.set('input', source_currency);
    }

    const changellyUrl = `https://widget.changelly.com/?${params.toString()}`;

    return NextResponse.json({
      ok: true,
      url: changellyUrl,
      partner_id: CHANGELLY_PARTNER_ID || null,
    });
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
