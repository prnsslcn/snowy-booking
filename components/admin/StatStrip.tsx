import type { ReactNode } from 'react';

/**
 * 숫자 띠 — 한 판 안에 칸을 가는 선으로 나눈다. 폰 2칸, PC 4칸.
 * tone='glacier' = 홈 상품 장과 같은 겨울 파랑 판(대시보드 첫 판), 'light' = 흰 판.
 * head 를 주면 판 위쪽에 머리(날짜 등)를 둔다.
 */
export type Stat = { label: string; value: string; unit?: string; note?: ReactNode };

export function StatStrip({ items, tone = 'light', head }: { items: Stat[]; tone?: 'light' | 'glacier'; head?: ReactNode }) {
  const g = tone === 'glacier';
  return (
    <div className={`overflow-hidden rounded-2xl ${g ? 'bg-glacier text-ice-50' : 'border border-line bg-white text-ink'}`}>
      {head && <div className={`px-5 pt-5 md:px-7 md:pt-7 ${g ? '' : ''}`}>{head}</div>}
      <div className={`grid grid-cols-2 md:grid-cols-4 ${head ? 'mt-1' : ''}`}>
        {items.map((s, i) => (
          <div
            key={s.label}
            className={`p-5 md:p-7 ${i % 2 ? 'border-l' : ''} ${i > 1 ? 'border-t md:border-t-0' : ''} ${i === 2 ? 'md:border-l' : ''} ${
              g ? 'border-ice-50/[.12]' : 'border-line'
            }`}
          >
            <p className={`text-[12px] font-medium ${g ? 'text-ice-100/70' : 'text-ink-2'}`}>{s.label}</p>
            <p className="mt-3 flex items-baseline gap-1">
              <span className="stat text-[30px] leading-none md:text-[38px]">{s.value}</span>
              {s.unit && <span className={`text-[14px] ${g ? 'text-ice-100/60' : 'text-ink-3'}`}>{s.unit}</span>}
            </p>
            {s.note && <p className={`mt-2.5 text-[12px] leading-relaxed ${g ? 'text-ice-100/60' : 'text-ink-3'}`}>{s.note}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
