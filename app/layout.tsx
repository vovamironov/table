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
      <body>{children}</body>
    </html>
  );
}
