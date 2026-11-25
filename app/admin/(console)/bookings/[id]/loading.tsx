import { Sk, SkLine, SkPage, SkPanel, SkPanelHead, SkPill, SkTitle } from '@/components/admin/Skeleton';

/** 예약 상세 불러오는 동안 — 예약 정보(왼쪽) · 현장 · 취소·환불 · 기록(오른쪽) */
export default function BookingDetailLoading() {
  return (
    <SkPage>
      <SkLine h={21} bar={12} w="4.5rem" className="mb-3" />
      <SkTitle w="6rem" aside={<SkPill w="4rem" h={22} />} />
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <SkPanel>
          <SkPanelHead w="5rem" />
          <div className="mt-3 divide-y divide-line">
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i} className="flex items-center justify-between" style={{ height: 42 }}>
                <Sk style={{ height: 12, width: '3.5rem' }} />
                <Sk style={{ height: 12, width: `${6 + ((i * 3) % 5)}rem` }} />
              </div>
            ))}
          </div>
        </SkPanel>
        <div className="space-y-4">
          <SkPanel>
            <SkPanelHead w="2.5rem" />
            <SkLine h={22} bar={12} w="7rem" className="mt-3" />
            <SkLine h={20} bar={10} w="90%" className="mt-2" />
            <SkPill w="100%" className="mt-3" />
          </SkPanel>
          <SkPanel>
            <SkPanelHead w="4rem" />
            <SkPill w="100%" className="mt-3" />
            <SkPill w="100%" className="mt-2.5" />
            <SkLine h={40} bar={10} w="90%" className="mt-2" />
          </SkPanel>
          <SkPanel>
            <SkPanelHead w="2.5rem" />
            <SkLine h={22} bar={12} w="6rem" className="mt-3" />
          </SkPanel>
        </div>
      </div>
    </SkPage>
  );
}
