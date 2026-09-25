'use client';

import Script from 'next/script';

const TELEGRAM_SCRIPT_SRC = 'https://telegram.org/js/telegram-web-app.js';

export default function TelegramScript() {
  return (
    <Script
      src={TELEGRAM_SCRIPT_SRC}
      strategy="beforeInteractive"
    />
  );
}
