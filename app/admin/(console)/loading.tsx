import { SkBars, SkLine, SkPage, SkPanel, SkPanelHead, SkStats, SkTable, SkTitle } from '@/components/admin/Skeleton';

/**
 * 대시보드 불러오는 동안 — 실제 화면과 같은 배치(오늘 띠 · 상품별 점유 · 오늘 예약 표).
 * 다른 관리자 화면은 각자 폴더의 loading.tsx 가 자기 배치로 그린다.
 */
export default function DashboardLoading() {
  return (
    <SkPage>
      <SkTitle sub={false} w="7.5rem" />
      <SkStats
        glacier
        head={
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div>
              <SkLine dark h={20} bar={11} w="3rem" />
              <SkLine dark h={32} bar={22} w="9rem" className="mt-1" />
            </div>
            <div className="w-full md:w-72">
              <SkLine dark h={18} bar={10} w="100%" />
              <SkLine dark h={10} bar={5} w="100%" className="mt-2" />
            </div>
          </div>
        }
      />
      <SkPanel className="mt-6">
        <SkPanelHead w="8rem" />
        <SkBars />
      </SkPanel>
      <SkPanel className="mt-6">
        <SkPanelHead w="6rem" aside={<SkLine h={22} bar={12} w="3.5rem" />} />
        <div className="mt-3">
          <SkTable rows={3} cols={['3rem', '3rem', '6.5rem', '2.5rem', '4.5rem', '4rem']} />
        </div>
      </SkPanel>
    </SkPage>
  );
}
