import { Sk, SkLine, SkPage, SkPanel, SkPanelHead, SkPill, SkTable, SkTitle } from '@/components/admin/Skeleton';

/** 현장 배정 불러오는 동안 — 날짜 이동 · 찾기 · 배치도 · 오늘 예약 표 */
function Tiles({ n }: { n: number }) {
  return (
    <div className="flex gap-1.5 overflow-hidden">
      {Array.from({ length: n }, (_, i) => (
        <Sk key={i} className="flex-none !rounded-lg" style={{ height: 72, width: 38 }} />
      ))}
    </div>
  );
}

export default function BoardLoading() {
  return (
    <SkPage>
      <SkTitle
        w="8rem"
        sub
        aside={
          <div className="flex items-center gap-2">
            <SkPill w="44px" h={44} />
            <Sk className="!rounded-xl" style={{ height: 40, width: 170 }} />
            <SkPill w="44px" h={44} />
          </div>
        }
      />
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <Sk className="!rounded-xl" style={{ height: 40, width: 320, maxWidth: '100%' }} />
          <SkLine h={20} bar={11} w="20rem" />
        </div>
        <SkPanel className="!p-5">
          <SkLine h={20} bar={10} w="100%" className="opacity-60" />
          <div className="mt-2">
            <Tiles n={26} />
          </div>
          <Sk className="my-12 !rounded-full" style={{ height: 26, width: '100%' }} />
          <Tiles n={20} />
          <SkLine h={20} bar={10} w="100%" className="mt-2 opacity-60" />
          <SkLine h={22} bar={11} w="24rem" className="mt-6" />
        </SkPanel>
        <div className="rounded-2xl border border-dashed border-line-strong p-5">
          <SkLine h={20} bar={11} w="min(34rem, 90%)" />
        </div>
        <SkPanel>
          <SkPanelHead w="5.5rem" />
          <div className="mt-3">
            <SkTable rows={3} rowH={53} cols={['3.5rem', '3.5rem', '3.5rem', '3rem', '4rem']} />
          </div>
        </SkPanel>
      </div>
    </SkPage>
  );
}
