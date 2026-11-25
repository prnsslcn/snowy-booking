import { SkBars, SkField, SkLine, SkPage, SkPanel, SkPanelHead, SkPill, SkStats, SkTitle } from '@/components/admin/Skeleton';

/** 매출 불러오는 동안 — 기간 고르기 · 숫자 4칸 · 상품별 · 일별 */
export default function SalesLoading() {
  return (
    <SkPage>
      <SkTitle w="5rem" aside={<SkPill w="9rem" />} />
      <div className="mb-5 rounded-2xl border border-line bg-white p-4 md:p-5">
        <SkPill w="18rem" h={44} />
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <SkField label="4rem" className="w-[176px]" />
          <SkField label="3.5rem" className="w-[176px]" />
          <SkPill w="60px" />
        </div>
      </div>
      <SkStats />
      <SkPanel className="mt-5">
        <SkPanelHead w="4rem" />
        <SkBars />
      </SkPanel>
      <SkPanel className="mt-5">
        <SkPanelHead w="9rem" />
        <div className="mt-2 divide-y divide-line">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex items-center justify-between" style={{ height: 44 }}>
              <SkLine h={20} bar={12} w="5.5rem" />
              <SkLine h={20} bar={12} w="6.5rem" />
            </div>
          ))}
        </div>
      </SkPanel>
    </SkPage>
  );
}
