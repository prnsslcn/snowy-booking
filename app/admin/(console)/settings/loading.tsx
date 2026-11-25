import { SkField, SkLine, SkPage, SkPanel, SkPanelHead, SkPill, SkTitle } from '@/components/admin/Skeleton';

/** 운영 설정 불러오는 동안 — 안내 한 줄 · 영업 종료 · 시즌 기간 · 공지 */
const toggle = <SkPill w="48px" h={28} />;

export default function SettingsLoading() {
  return (
    <SkPage>
      <SkTitle w="8rem" />
      <SkLine h={20} bar={11} w="min(24rem, 90%)" className="mb-4" />
      <div className="space-y-5">
        <SkPanel>
          <SkPanelHead w="4.5rem" sub="min(36rem, 80%)" aside={toggle} />
          <SkField label="4rem" className="mt-5" />
          <SkLine h={20} bar={10} w="16rem" className="mt-1.5" />
          <div className="mt-4">
            <SkLine h={18} bar={10} w="4rem" className="mb-1.5" />
            <SkPill w="100%" h={88} className="!rounded-xl" />
          </div>
          <SkLine h={20} bar={10} w="14rem" className="mt-1.5" />
        </SkPanel>
        <SkPanel>
          <SkPanelHead w="6.5rem" sub="min(30rem, 80%)" />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <SkField label="2rem" />
            <SkField label="1.5rem" />
          </div>
        </SkPanel>
        <SkPanel>
          <SkPanelHead w="2.5rem" sub="min(22rem, 80%)" aside={toggle} />
          <SkField label="2rem" className="mt-5" />
        </SkPanel>
      </div>
    </SkPage>
  );
}
