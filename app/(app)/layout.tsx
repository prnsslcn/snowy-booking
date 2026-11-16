/* eslint-disable @next/next/no-page-custom-font -- 최상위 레이아웃이 그룹마다 따로라 여기서 글꼴을 연결 */
import type { Metadata } from 'next';

import './globals.css';

/* 예약·조회·결과 화면(Tailwind). 색·글꼴·모서리는 (kit) 그룹의 taste 키트와 같은 값(globals.css). */
export const metadata: Metadata = {
  title: '스노위랜드 예약',
  description: '홍천 비발디파크 스노위랜드 카바나·카라반 당일 이용 예약과 조회.',
};

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Zilla+Slab:wght@400;500&family=Rethink+Sans:wght@400..600&family=Hahmlet:wght@400&family=IBM+Plex+Sans+KR:wght@400;500&display=swap"
        />
        <meta name="theme-color" content="#ecebe7" />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
