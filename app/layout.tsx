import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import TelegramScript from '@/components/shared/TelegramScript';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  adjustFontFallback: false,
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  metadataBase: new URL('https://adexterminal.com'),
  title: 'aDEX Terminal — Real-time DEX radar for TON, BSC and Base',
  description:
    'aDEX Terminal — A Telegram-native quant terminal for spotting volume spikes, tracking whale wallets and scanning contract safety across TON, BSC and Base.',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/logo.png', type: 'image/png' },
    ],
    apple: '/logo.png',
  },
  openGraph: {
    title: 'aDEX Terminal — Real-time DEX radar for TON, BSC and Base',
    description:
      'A Telegram-native quant terminal for spotting volume spikes, tracking whale wallets and scanning contract safety across TON, BSC and Base.',
    url: 'https://adexterminal.com',
    siteName: 'aDEX Terminal',
    images: [
      { url: '/logo.png', width: 512, height: 512, alt: 'aDEX Terminal' },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'aDEX Terminal',
    description:
      'Telegram-native DEX radar for TON, BSC and Base — volume spikes, whale wallets and contract safety in one tap.',
    images: ['/logo.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#0B0B0F',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrains.variable} font-sans`} suppressHydrationWarning>
        <TelegramScript />
        {children}
      </body>
    </html>
  );
}
