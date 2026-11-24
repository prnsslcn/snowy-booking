import type { Metadata, Viewport } from 'next';
import { Outfit } from 'next/font/google';
import 'lenis/dist/lenis.css';

import './site.css';

import { LocaleProvider } from '@/components/site/LocaleProvider';
import { Navbar } from '@/components/site/Navbar';
import { PageTransition } from '@/components/site/PageTransition';
import { SmoothScroll } from '@/components/site/SmoothScroll';
import { DialogHost } from '@/components/ui/Dialog';
import { SiteStatusProvider } from '@/components/site/SiteStatus';
import { getLocale } from '@/lib/i18n/server';
import { getSiteSettings } from '@/lib/site-settings';

/*
  홈 — aftc(ABC 비행교육원) 홈 구조 이식: 픽셀아트 Hero(sticky) → 위로 덮는 다크 #intro,
  progressive blur 고정 nav(섹션 data-nav-theme 로 라이트/다크 전환), 모바일 풀스크린 clip-path 메뉴,
  첫 진입 블라인드(PageTransition). 내용은 스노위랜드 확정 사실만.
*/

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit', display: 'swap' });

export async function generateMetadata(): Promise<Metadata> {
  if ((await getLocale()) === 'en') {
    return {
      title: { default: 'Snowy Cabana & Caravan: Day Use at Vivaldi Park Snowyland, Hongcheon', template: '%s · Snowy Cabana & Caravan' },
      description: 'Book a cabana, caravan or group caravan for day use (10:00–17:00) at Snowyland, Vivaldi Park, Hongcheon.',
      openGraph: {
        type: 'website',
        locale: 'en_US',
        title: 'Snowy Cabana & Caravan: Day Use at Vivaldi Park Snowyland, Hongcheon',
        description: 'Online booking for day-use cabanas, caravans and group caravans',
        images: ['/images/facilities/caravan-group-1.jpg'],
      },
      twitter: { card: 'summary_large_image' },
    };
  }
  return {
    title: { default: '스노위 카바나·카라반: 홍천 비발디파크 스노위랜드 당일 이용', template: '%s · 스노위 카바나·카라반' },
    description: '홍천 비발디파크 스노위랜드 안 카바나·카라반·단체카라반을 매일 10:00–17:00 당일 이용으로 온라인 예약합니다.',
    openGraph: {
      type: 'website',
      locale: 'ko_KR',
      title: '스노위 카바나·카라반: 홍천 비발디파크 스노위랜드 당일 이용',
      description: '카바나·카라반·단체카라반 당일 이용 온라인 예약',
      images: ['/images/facilities/caravan-group-1.jpg'],
    },
    twitter: { card: 'summary_large_image' },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f0f5fa',
};

export default async function HomeLayout({ children }: { children: React.ReactNode }) {
  const [locale, settings] = await Promise.all([getLocale(), getSiteSettings()]);
  return (
    <html lang={locale} className={`${outfit.variable} antialiased`}>
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
      </head>
      <body className="flex min-h-[100dvh] flex-col">
        <script dangerouslySetInnerHTML={{ __html: "history.scrollRestoration='manual';window.scrollTo(0,0);" }} />
        <LocaleProvider locale={locale}>
          <SiteStatusProvider closed={settings.businessClosed}>
            <SmoothScroll>
              <PageTransition navbar={<Navbar />}>{children}</PageTransition>
            </SmoothScroll>
            <DialogHost />
          </SiteStatusProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
