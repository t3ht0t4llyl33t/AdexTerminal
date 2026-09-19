import './globals.css';
import Script from 'next/script';
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://adexterminal.com'),
  title: 'aDEX Terminal — Real-time DEX radar for TON, BSC and Base',
  description:
    'aDEX Terminal — A Telegram-native quant terminal for spotting volume spikes, tracking whale wallets and scanning contract safety across TON, BSC and Base.',
  themeColor: '#0B0B0F',
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
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrains.variable} font-sans`}>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        {children}
      </body>
    </html>
  );
}
