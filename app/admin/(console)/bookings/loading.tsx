import { SkField, SkLine, SkPage, SkPill, SkTable, SkTitle } from '@/components/admin/Skeleton';

/** 예약 관리 불러오는 동안 — 검색 칸 줄 · 안내 한 줄 · 예약 표 */
export default function BookingsLoading() {
  return (
    <SkPage>
      <SkTitle w="8rem" />
      <div className="mb-5 grid grid-cols-2 items-end gap-2 rounded-2xl border border-line bg-white p-4 md:grid-cols-[1.6fr_1fr_0.85fr_0.85fr_auto] md:gap-3 md:p-5">
        <SkField label="2rem" className="col-span-2 md:col-span-1" />
        <SkField label="2rem" className="col-span-2 md:col-span-1" />
        <SkField label="3.5rem" />
        <SkField label="2rem" />
        <div className="col-span-2 flex gap-2 md:col-span-1">
          <SkPill w="60px" />
          <SkPill w="72px" />
        </div>
      </div>
      <SkLine h={18} bar={10} w="17rem" className="-mt-2 mb-4 px-1" />
      <section className="rounded-2xl border border-line bg-white p-3 md:p-5">
        <SkTable rows={12} cols={['4rem', '3rem', '3rem', '6.5rem', '2.5rem', '4.5rem', '4rem']} />
      </section>
    </SkPage>
  );
}
