import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const telegramBotToken = process.env.TELEGRAM_SUPPORT_BOT_TOKEN || '';
const cronSecret = process.env.CRON_SECRET || '';

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

async function sendTelegramMessage(chatId: string, text: string, inlineKeyboard?: unknown): Promise<void> {
  if (!telegramBotToken) return;
  try {
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    };
    if (inlineKeyboard) {
      body.reply_markup = inlineKeyboard;
    }
    await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    // best-effort — user may have blocked the bot
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabase();
    const now = new Date();
    const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const in72Hours = new Date(now.getTime() + 72 * 60 * 60 * 1000);

    const { data: expiringUsers } = await supabase
      .from('user_subscriptions')
      .select('telegram_user_id, language, pro_expiration_date')
      .eq('tier', 'pro')
      .gte('pro_expiration_date', in48Hours.toISOString())
      .lte('pro_expiration_date', in72Hours.toISOString());

    if (!expiringUsers || expiringUsers.length === 0) {
      return NextResponse.json({ ok: true, checked: 0 });
    }

    let dispatched = 0;
    for (const user of expiringUsers) {
      const lang = (user as { language?: string }).language || 'EN';
      const tgId = (user as { telegram_user_id: string }).telegram_user_id;

      const message = lang === 'RU'
        ? '🛡️ Уведомление о продлении: До конца действия ваших PRO-фильтров сканирования инсайдерских кластеров Base/BSC осталось менее 72 часов. Нажмите кнопку ниже для мгновенного продления Pro-тарифа.'
        : '🛡️ Pro Access Expiration Notice: Your aDEX Terminal premium filters and insider whale distribution scan depths expire in less than 72 hours. Tap the link below to seamlessly renew your access block instantly.';

      const inlineKeyboard = {
        inline_keyboard: [[
          {
            text: lang === 'RU' ? '💎 Продлить Pro' : '💎 Renew Pro',
            url: 'https://t.me/aDEX_Live_Support_bot?start=renew',
          },
        ]],
      };

      await sendTelegramMessage(tgId, message, inlineKeyboard);
      dispatched++;
    }

    return NextResponse.json({ ok: true, checked: expiringUsers.length, dispatched });
  } catch {
    return NextResponse.json({ ok: true, error: 'check_failed' });
  }
}
