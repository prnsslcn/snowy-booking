import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: '스노위랜드 카바나·카라반 예약',
  description: '홍천 비발디파크 스노위랜드 카바나·카라반 당일 이용(10:00~17:00) 온라인 예약.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css"
        />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
