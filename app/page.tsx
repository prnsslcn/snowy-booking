// 임시 홈 — 예약 흐름 구현 후 시즌 소개·예약하기 CTA·공지 팝업으로 교체 (CLAUDE.md §7).
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-3 px-6">
      <p className="text-sm text-muted">홍천 비발디파크</p>
      <h1 className="text-3xl font-bold">스노위랜드 카바나·카라반</h1>
      <p className="text-muted">당일 이용 10:00 ~ 17:00 · 온라인 예약 준비 중입니다.</p>
    </main>
  );
}
