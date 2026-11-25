import { SkLine, SkPage, SkPanel, SkPanelHead, SkPill, SkTitle } from '@/components/admin/Skeleton';

/** 유닛·점검 불러오는 동안 — 상품별 유닛 칩 패널 넷 · 안내 · 점검 기간 등록 */
function Chips({ n }: { n: number }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {Array.from({ length: n }, (_, i) => (
        <SkPill key={i} w="3.25rem" h={36} />
      ))}
      <SkPill w="5.5rem" h={36} />
    </div>
  );
}

export default function UnitsLoading() {
  return (
    <SkPage>
      <SkTitle w="8rem" />
      <div className="space-y-5">
        {[30, 9, 2, 2].map((n, i) => (
          <SkPanel key={i}>
            <SkPanelHead w={i === 2 ? '5rem' : '3rem'} aside={<SkLine h={22} bar={11} w="5.5rem" />} />
            <Chips n={n} />
          </SkPanel>
        ))}
        <SkLine h={20} bar={10} w="min(30rem, 90%)" className="px-1" />
        <SkPanel>
          <SkPanelHead w="6rem" sub="min(20rem, 80%)" />
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-1.5">
                <SkLine h={18} bar={10} w="3rem" />
                <SkPill w="100%" h={40} className="!rounded-xl" />
              </div>
            ))}
          </div>
        </SkPanel>
      </div>
    </SkPage>
  );
}
