import { SkField, SkLine, SkPage, SkPanel, SkPanelHead, SkPill, SkTitle } from '@/components/admin/Skeleton';

/** 요금 불러오는 동안 — 상품 셋 × (주중 · 주말 칸 + 저장) */
export default function PricingLoading() {
  return (
    <SkPage>
      <SkTitle w="4.5rem" />
      <SkPanel>
        <SkPanelHead w="6rem" sub="min(18rem, 80%)" />
        <div className="mt-3 divide-y divide-line">
          {[0, 1, 2].map((i) => (
            <div key={i} className="grid grid-cols-2 items-end gap-3 py-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-center">
              <SkLine h={40} bar={13} w="5rem" className="col-span-2 md:col-span-1 md:mt-5" />
              <SkField label="2rem" />
              <SkField label="6rem" />
              <SkPill w="60px" className="col-span-2 md:col-span-1 md:mt-5" />
            </div>
          ))}
        </div>
      </SkPanel>
    </SkPage>
  );
}
