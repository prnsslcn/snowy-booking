import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { Faq, type FaqItem } from '@/components/site/Faq';
import { SubPage } from '@/components/site/SubPage';
import { TLink } from '@/components/site/TLink';
import { buttonClass } from '@/components/ui/Button';
import { formatKrw } from '@/lib/format';
import { getProducts } from '@/lib/products';
import { ONE_PER_DAY_NOTICE, PARKING_NOTICE, TICKET_NOTICE } from '@/lib/site-config';

export const metadata: Metadata = { title: '이용 안내', description: '스노위 카바나·카라반 이용 시간, 예약, 요금, 취소·환불 안내' };

/*
  이용 안내 — 확정 사실만 카드로(이용 시간 · 예약 · 상품과 요금 · 현장 이용 · 취소와 환불) + 자주 묻는 질문(#faq).
  상품 이름·최대 인원·요금은 DB(product_types)가 권위.
*/
export const dynamic = 'force-dynamic';

function Card({ label, title, wide = false, children }: { label: string; title?: string; wide?: boolean; children?: ReactNode }) {
  return (
    <section className={`rounded-3xl bg-white p-6 md:p-7 ${wide ? 'md:col-span-2' : ''}`}>
      <h2 className="text-[13px] font-semibold text-ice-600">{label}</h2>
      {title && <p className="mt-2 text-[19px] font-bold leading-snug tracking-[-0.015em] md:text-[22px]">{title}</p>}
      {children}
    </section>
  );
}

function Notes({ items }: { items: ReactNode[] }) {
  return (
    <ul className="mt-4 space-y-1.5 text-[14px] leading-relaxed text-ink/70 md:text-[15px]">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2.5">
          <span aria-hidden className="mt-[0.62em] h-1 w-1 flex-none rounded-full bg-ice-400" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

const TABLE = 'mt-4 w-full border-separate border-spacing-0 overflow-hidden rounded-2xl border border-ice-700/15 text-[14px] md:text-[15px]';
const TH = 'bg-ice-100 px-4 py-3 text-left font-semibold';
const TD = 'border-t border-ice-700/10 px-4 py-3 tabular-nums';

const FAQ: FaqItem[] = [
  { q: '스노위랜드 입장권이 포함되어 있나요?', a: TICKET_NOTICE },
  { q: '몇 호를 이용하게 되나요?', a: '자리(호수)는 이용 당일 현장에서 배정합니다.' },
  { q: '이용 시간을 늘리거나 일찍 들어갈 수 있나요?', a: '이용 시간은 10:00~17:00이며, 조기 입실·연장 이용은 없습니다.' },
  { q: '영유아도 인원에 포함되나요?', a: '네, 최대 인원에는 영유아가 포함됩니다. 최소 인원 제한은 없습니다.' },
  { q: '하루에 여러 동을 예약할 수 있나요?', a: ONE_PER_DAY_NOTICE },
  { q: '예약 날짜를 바꿀 수 있나요?', a: '날짜 변경은 제공하지 않습니다. 예약을 취소한 뒤 다시 예약해 주세요. 이때 취소·환불 규정이 적용됩니다.' },
  { q: '이용 당일에도 취소할 수 있나요?', a: '입실 전이라면 예약 조회·취소에서 직접 취소할 수 있습니다. 다만 당일 취소는 환불되지 않습니다.' },
  { q: '예약번호는 어디서 확인하나요?', a: '예약이 확정되면 문자로 4자리 예약번호를 안내합니다. 조회·취소할 때 휴대폰 번호와 함께 입력합니다.' },
  { q: '주차는 어디에 하나요?', a: PARKING_NOTICE },
];

export default async function GuidePage() {
  const products = await getProducts();

  return (
    <SubPage display="Guide" sub="이용 안내">
      <div className="grid gap-3 md:grid-cols-2 md:gap-4">
        <Card label="이용 시간" title="시즌 중 매일 10:00~17:00">
          <Notes items={['당일 이용, 하루 1회입니다.', '조기 입실·연장 이용은 없습니다.']} />
        </Card>

        <Card label="예약" title="오늘부터 1개월 이내">
          <Notes items={['당일 예약은 16:00까지 받습니다.', '전액 선결제로 예약이 확정됩니다.', ONE_PER_DAY_NOTICE]} />
        </Card>

        <Card label="상품과 요금" wide>
          <table className={TABLE}>
            <thead>
              <tr>
                <th className={TH}>상품</th>
                <th className={TH}>최대 인원</th>
                <th className={TH}>요금</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.type}>
                  <td className={`${TD} font-semibold`}>{p.name}</td>
                  <td className={TD}>{p.maxCapacity}인</td>
                  <td className={TD}>
                    {formatKrw(p.priceWeekday)} ~ {formatKrw(p.priceWeekend)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Notes
            items={[
              '요금은 1동(1대) 1일 기준입니다.',
              '금·토·일, 공휴일과 그 전날, 동계 성수기에는 주말 요금이 적용됩니다.',
              '최대 인원에는 영유아가 포함되며, 최소 인원 제한은 없습니다.',
            ]}
          />
        </Card>

        <Card label="현장 이용" title="자리는 이용 당일 현장에서 배정합니다">
          <Notes items={[TICKET_NOTICE, PARKING_NOTICE]} />
        </Card>

        <Card label="취소와 환불" title="이용 2일 전까지 100% 환불">
          <Notes
            items={[
              '이용 1일 전 50%, 이용 당일·노쇼는 환불되지 않습니다.',
              '날짜 변경은 없으며, 취소 후 다시 예약해 주세요.',
              <>
                <TLink href="/booking/lookup" className="font-medium text-glacier underline decoration-ice-300 underline-offset-4">
                  예약 조회·취소
                </TLink>
                에서 휴대폰 번호와 예약번호 4자리로 직접 취소할 수 있습니다.
              </>,
            ]}
          />
          <TLink href="/refund-policy" className={buttonClass('secondary', 'sm', 'mt-5')}>
            취소·환불정책 보기
          </TLink>
        </Card>
      </div>

      {/* 자주 묻는 질문 */}
      <section id="faq" className="mt-16 scroll-mt-28 md:mt-20">
        <h2 className="mb-5 text-[22px] font-bold tracking-[-0.02em] md:text-[28px]">자주 묻는 질문</h2>
        <Faq items={FAQ} />
      </section>

      <div className="mt-12 flex justify-center">
        <TLink href="/booking" className={buttonClass('primary', 'md')}>
          예약하기
        </TLink>
      </div>
    </SubPage>
  );
}
