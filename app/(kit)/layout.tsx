/* eslint-disable @next/next/no-css-tags, @next/next/no-page-custom-font -- taste 키트 CSS(public/assets)를 원본 그대로 연결 */
import type { Metadata, Viewport } from 'next';

import { KitScripts } from '@/components/kit/KitScripts';

/*
  고객용 소개 페이지(홈·시설) — taste-skill(design-taste-frontend) 키트로 만든다.
  type: place · palette olive-on-bone · type zilla · buttons arrow · mark ring · radius soft(place 는 각진 사진·2px 버튼)
  키트 파일은 public/assets (스킬 원본 그대로, 수정 금지). Tailwind 는 이 그룹에 로드하지 않는다
  (클래스 이름이 겹침: .grid 등) — 예약 화면은 (app) 그룹이 따로 최상위 레이아웃을 가진다.
  한글: 뽑힌 Zilla Slab / Rethink Sans 에 한글이 없어 같은 성격의 Google 한글 글꼴(Hahmlet / IBM Plex Sans KR)을 뒤에 둔다.
*/

export const metadata: Metadata = {
  title: '스노위랜드: 홍천 비발디파크의 카바나·카라반 당일 이용',
  description: '홍천 비발디파크 스노위랜드 안 카바나·카라반·단체카라반을 매일 10:00–17:00 당일 이용으로 온라인 예약합니다.',
  openGraph: {
    type: 'website',
    title: '스노위랜드: 홍천 비발디파크의 카바나·카라반 당일 이용',
    description: '카바나·카라반·단체카라반 당일 이용 온라인 예약',
    images: ['/images/facilities/caravan-group-1.jpg'],
  },
  twitter: { card: 'summary_large_image' },
  other: { 'site-kind': 'other', 'page-type': 'place', 'page-kind': 'place' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#ecebe7',
};

const ROOT_CSS = `
:root {
  --p-bg: #ecebe7; --p-surface: #e1dfd9; --p-ink: #38450f; --p-muted: #5a6537;
  --p-accent: #38450f; --p-accent-ink: #ecebe7; --p-action: #38450f; --p-action-ink: #ecebe7;
  --p-inv-bg: #38450f; --p-inv-surface: #435020; --p-inv-ink: #ecebe7; --p-inv-muted: #bbbfaf;
  --p-inv-accent: #ecebe7; --p-inv-accent-ink: #38450f; --p-inv-action: #ecebe7; --p-inv-action-ink: #38450f;
  --font-display: "Zilla Slab", "Hahmlet", Georgia, serif;
  --font-text: "Rethink Sans", "IBM Plex Sans KR", system-ui, sans-serif;
  --display-weight: 400;
  --display-tracking: -0.018em;
}
:lang(ko) h1, :lang(ko) h2, :lang(ko) h3 { word-break: keep-all; }
:lang(ko) body { word-break: keep-all; }
`;

const PAGE_CSS = `
/* 마무리 사진: 폰은 세로 원본(<picture>), 칸을 채움 */
.close__media > picture, .close__media > picture > img { position: absolute; inset: 0; width: 100%; height: 100%; max-width: none; object-fit: cover; }
/* 섹션 머리줄: h2 는 왼쪽 선, 한 줄 설명은 분할선(7열)에서 */
.head-row { align-items: start; margin-bottom: var(--head-gap, 48px); }
.head-row > h2 { margin: 0; }
.head-row > p { margin: 0; }
/* trio: 태블릿·모바일은 첫 장 전체 폭, 나머지 두 장 2열(sections.md trio at 390) */
/* 공간 3장: 태블릿에서도 한 줄(2+1 로 접히면 한 화면을 넘김) */
@media (min-width: 640px) and (max-width: 1023px) {
  #rooms .grid > .tile { grid-column: auto / span 4; --tile-ratio: 2 / 3; }
  #rooms .grid > .tile .tile__head { flex-wrap: wrap; gap: 0 var(--s-2); }
}
@media (max-width: 1023px) {
  #inside .grid > a { grid-column: span 6; }
  #inside .grid > a:first-child { grid-column: 1 / -1; }
  #inside .grid > a:first-child .pl-photo > img { --pl-r: 1.3333; aspect-ratio: 4 / 3; }
  #inside .grid > a:not(:first-child) .pl-photo > img { aspect-ratio: 1; }
}
.type-moment { margin: 0; }
.type-moment a { font: var(--display-weight) clamp(44px, 5.6vw, 80px)/1.08 var(--font-display); letter-spacing: -0.03em; color: var(--ink); text-decoration: none; }
`;

export default function KitLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" data-type="place" data-radius="soft" data-buttons="arrow" data-motion="" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Zilla+Slab:wght@400;500&family=Rethink+Sans:wght@400..600&family=Hahmlet:wght@400&family=IBM+Plex+Sans+KR:wght@400;500&display=swap"
        />
        <link rel="stylesheet" href="/assets/system.css" />
        <link rel="stylesheet" href="/assets/ui/cards.css" />
        <link rel="stylesheet" href="/assets/motion/motion.css" />
        <link rel="stylesheet" href="/assets/layout/layout.css" />
        <link rel="stylesheet" href="/assets/icons/icon.css" />
        <style dangerouslySetInnerHTML={{ __html: ROOT_CSS + PAGE_CSS }} />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "document.documentElement.classList.add('m-enter');setTimeout(()=>document.documentElement.classList.add('m-enter-done'),700);" +
              "document.documentElement.classList.add('mo-js');setTimeout(()=>document.documentElement.classList.add('mo-safe'),2500);",
          }}
        />
        <link rel="modulepreload" href="/assets/moments/moments.js" />
        <link rel="modulepreload" href="/assets/moments/lib.js" />
        <link rel="modulepreload" href="/assets/moments/picture-develops/moment.js" />
      </head>
      <body suppressHydrationWarning>
        {children}
        <KitScripts />
      </body>
    </html>
  );
}
