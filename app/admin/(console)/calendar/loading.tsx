import { Sk, SkLine, SkPage, SkPill, SkTitle } from '@/components/admin/Skeleton';

/** 운영 달력 불러오는 동안 — 달 이름 · 이전/다음 · 7칸 달력 · 범례 */
export default function CalendarLoading() {
  return (
    <SkPage>
      <SkTitle w="8rem" />
      <div className="mb-4 flex items-center justify-between gap-3">
        <SkLine h={40} bar={22} w="6rem" />
        <div className="flex gap-2">
          <SkPill w="44px" h={40} />
          <SkPill w="44px" h={40} />
        </div>
      </div>
      <div className="rounded-2xl border border-line bg-white p-2 md:p-4">
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="flex h-8 items-center justify-center">
              <Sk style={{ height: 11, width: 14 }} />
            </div>
          ))}
          {Array.from({ length: 35 }, (_, i) => (
            <Sk key={i} className="!rounded-xl opacity-70" style={{ height: 'clamp(56px, 9vw, 92px)' }} />
          ))}
        </div>
      </div>
      <SkLine h={18} bar={10} w="min(30rem, 90%)" className="mt-3 px-1" />
    </SkPage>
  );
}
