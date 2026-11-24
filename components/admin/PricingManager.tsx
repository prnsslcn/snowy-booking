'use client';

import { useState } from 'react';

import { Note, useAct } from '@/components/admin/act';
import { Button } from '@/components/ui/Button';
import { confirmDialog } from '@/components/ui/Dialog';
import { fieldClass } from '@/components/ui/Field';
import { updatePricesAction } from '@/lib/admin/config-actions';
import { formatWon } from '@/lib/format';

/*
  요금 — 상품별 주중·주말(공휴일·성수기 포함) 요금. 성수기·공휴일 날짜는 운영 설정 화면.
  주말 요금일 = 성수기 ∪ 금·토·일 ∪ 공휴일 ∪ 공휴일 전날 (DB is_weekend_rate 단일 출처).
*/

function PriceRow({ p }: { p: { type: string; name: string; weekday: number; weekend: number } }) {
  const [wd, setWd] = useState(String(p.weekday));
  const [we, setWe] = useState(String(p.weekend));
  const { pending, msg, act } = useAct();
  const changed = Number(wd) !== p.weekday || Number(we) !== p.weekend;
  return (
    <li className="py-3">
      <div className="grid grid-cols-2 items-end gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
        <p className="col-span-2 text-[15px] font-semibold md:col-span-1 md:pb-3">{p.name}</p>
        <label>
          <span className="field-label">주중</span>
          <input value={wd} onChange={(e) => setWd(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className={fieldClass('light', 'tabular-nums', 'cs')} />
        </label>
        <label>
          <span className="field-label">주말·공휴일·성수기</span>
          <input value={we} onChange={(e) => setWe(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className={fieldClass('light', 'tabular-nums', 'cs')} />
        </label>
        <Button
          size="cs"
          className="col-span-2 md:col-span-1"
          disabled={pending || !changed}
          onClick={async () =>
            (await confirmDialog(`${p.name} 요금을 주중 ${formatWon(Number(wd))} / 주말·공휴일·성수기 ${formatWon(Number(we))}로 바꿀까요?\n이미 받은 예약 금액은 바뀌지 않습니다.`, { confirmLabel: '저장' })) &&
            act(() => updatePricesAction(p.type, Number(wd), Number(we)), '저장했습니다.')
          }
        >
          저장
        </Button>
      </div>
      <Note msg={msg} />
    </li>
  );
}

export function PricingManager({ products }: { products: { type: string; name: string; weekday: number; weekend: number }[] }) {
  return (
    <div className="space-y-5">
      <section className="panel">
        <h2 className="panel-title">상품별 요금</h2>
        <p className="mt-1 text-[13px] text-ink-2">1동(1대) 1일 기준. 바꾼 요금은 새 예약부터 적용됩니다.</p>
        <ul className="mt-2 divide-y divide-line">
          {products.map((p) => (
            <PriceRow key={p.type} p={p} />
          ))}
        </ul>
      </section>
    </div>
  );
}
