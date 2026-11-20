import type { Metadata, Viewport } from 'next';
import { Outfit } from 'next/font/google';

import './admin.css';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit', display: 'swap' });

export const metadata: Metadata = {
  title: { default: '운영 콘솔', template: '%s · 운영 콘솔' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0f1d2e' };

/** 관리자 최상위 레이아웃 — 손님 화면(app/(site))과 별도. */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${outfit.variable} antialiased`}>
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css" />
      </head>
      <body className="min-h-[100dvh]">{children}</body>
    </html>
  );
}
