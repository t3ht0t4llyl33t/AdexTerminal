'use client';

import { useEffect } from 'react';

const TELEGRAM_SCRIPT_SRC = 'https://telegram.org/js/telegram-web-app.js';

export default function TelegramScript() {
  useEffect(() => {
    if (document.querySelector(`script[src="${TELEGRAM_SCRIPT_SRC}"]`)) return;

    const script = document.createElement('script');
    script.src = TELEGRAM_SCRIPT_SRC;
    script.async = false;
    document.head.appendChild(script);
  }, []);

  return null;
}
