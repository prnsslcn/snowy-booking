import type { ReactNode } from 'react';

/**
 * 숫자 띠 — 한 판(흰 패널) 안에 칸을 가는 선으로 나눈다. 폰 2칸, PC 4칸.
 * 숫자는 Outfit 400 크게, 단위는 옅게.
 */
export type Stat = { label: string; value: string; unit?: string; note?: ReactNode };

export function StatStrip({ items }: { items: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-4">
      {items.map((s) => (
        <div key={s.label} className="bg-white p-5 md:p-6">
          <p className="eyebrow">{s.label}</p>
          <p className="mt-3 flex items-baseline gap-1">
            <span className="stat text-[28px] leading-none md:text-[34px]">{s.value}</span>
            {s.unit && <span className="text-[14px] text-ink-3">{s.unit}</span>}
          </p>
          {s.note && <p className="mt-2.5 text-[12px] leading-relaxed text-ink-3">{s.note}</p>}
        </div>
      ))}
    </div>
  );
}
