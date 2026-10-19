import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Как менялась цена золота',
  description: 'Интерактивный график цены золота с переключением мобильной и десктопной версии',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <head>
        <link rel="preload" href="/fonts/T-Sans_Medium.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/neue-haas-unica-regular.ttf" as="font" type="font/otf" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
