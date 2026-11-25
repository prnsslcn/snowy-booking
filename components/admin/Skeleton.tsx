import type { CSSProperties, ReactNode } from 'react';

/*
  관리자 화면 불러오는 동안 자리 표시 — 화면마다 app/admin/(console)/…/loading.tsx 가 이 조각으로
  실제 화면과 같은 크기·배치의 패널을 그린다(도착하면 그 자리에 실제 내용이 BlockIn 으로 나타남).
  .skel / .skel-dark 은 admin.css(얼음빛 면 + 지나가는 빛).
*/

/** 막대 하나 */
export function Sk({ className = '', style, dark = false }: { className?: string; style?: CSSProperties; dark?: boolean }) {
  return <div className={`${dark ? 'skel-dark' : 'skel'} rounded-md ${className}`} style={style} />;
}

/** 글줄 높이 안에 가운데 놓인 막대(실제 글자 줄과 높이를 맞춤) */
export function SkLine({ h, bar, w, className = '', dark = false }: { h: number; bar: number; w: string; className?: string; dark?: boolean }) {
  return (
    <div className={`flex items-center ${className}`} style={{ height: h }}>
      <Sk dark={dark} style={{ height: bar, width: w, maxWidth: '100%' }} />
    </div>
  );
}

/** 화면 바탕 — loading.tsx 의 맨 바깥(BlockIn 대신 0.12초 뒤 옅게 나타남) */
export function SkPage({ children }: { children: ReactNode }) {
  return (
    <div style={{ animation: 'admin-skel-in 0.2s ease-out 0.12s backwards' }} aria-busy="true" aria-label="불러오는 중">
      {children}
    </div>
  );
}

/** AdminTitle 과 같은 높이: 영문 머리글 · 제목 · (설명) + 오른쪽 */
export function SkTitle({ sub = true, aside, w = '9rem' }: { sub?: boolean; aside?: ReactNode; w?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 md:mb-8">
      <div className="min-w-0 flex-1">
        <SkLine h={19.5} bar={11} w="4.5rem" className="mb-1.5" />
        <SkLine h={36} bar={28} w={w} className="md:!h-[45px]" />
        {sub && <SkLine h={21} bar={13} w="min(24rem, 90%)" className="mt-1.5" />}
      </div>
      {aside}
    </div>
  );
}

/** 흰 패널 */
export function SkPanel({ children, className = '', style }: { children?: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={`panel ${className}`} style={style}>
      {children}
    </div>
  );
}

/** 패널 제목(+설명) */
export function SkPanelHead({ w = '7rem', sub, aside }: { w?: string; sub?: string; aside?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <SkLine h={22} bar={13} w={w} />
        {sub && <SkLine h={20} bar={11} w={sub} className="mt-1" />}
      </div>
      {aside}
    </div>
  );
}

/** 표: 머리줄 + 줄들(선으로 나뉨) */
export function SkTable({ rows, cols, rowH = 46 }: { rows: number; cols: string[]; rowH?: number }) {
  const grid = { gridTemplateColumns: cols.map(() => 'minmax(0,1fr)').join(' ') };
  return (
    <div>
      <div className="grid gap-4 pb-2.5" style={grid}>
        {cols.map((w, i) => (
          <SkLine key={i} h={18} bar={10} w={w} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="grid items-center gap-4 border-t border-line" style={{ ...grid, height: rowH }}>
          {cols.map((w, i) => (
            <Sk key={i} style={{ height: 13, width: w }} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** StatStrip 과 같은 4칸 숫자 띠(진한 파랑 또는 흰 바탕) */
export function SkStats({ glacier = false, head }: { glacier?: boolean; head?: ReactNode }) {
  const line = glacier ? 'border-white/10' : 'border-line';
  return (
    <div className={`overflow-hidden rounded-2xl ${glacier ? 'bg-glacier' : 'border border-line bg-white'}`}>
      {head && <div className="px-5 pt-5 md:px-7 md:pt-7">{head}</div>}
      <div className={`grid grid-cols-2 md:grid-cols-4 ${head ? 'mt-1' : ''}`}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`p-5 md:p-7 ${line} ${i % 2 ? 'border-l' : ''} ${i > 1 ? 'border-t md:border-t-0' : ''} ${i === 2 ? 'md:border-l' : ''}`}>
            <SkLine dark={glacier} h={18} bar={10} w="3.5rem" />
            <SkLine dark={glacier} h={38} bar={30} w="7rem" className="mt-3" />
            <SkLine dark={glacier} h={20} bar={10} w="8rem" className="mt-2.5" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** 이름 + 오른쪽 숫자 + 아래 막대 줄(상품별 점유·매출) */
export function SkBars({ rows = 3 }: { rows?: number }) {
  return (
    <div className="mt-4 space-y-5">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i}>
          <div className="flex items-center justify-between">
            <Sk style={{ height: 13, width: '4.5rem' }} />
            <Sk style={{ height: 12, width: '6rem' }} />
          </div>
          <Sk className="mt-3 !rounded-full" style={{ height: 6, width: '100%' }} />
        </div>
      ))}
    </div>
  );
}

/** 입력칸(이름 + 칸) */
export function SkField({ label = '3.5rem', className = '' }: { label?: string; className?: string }) {
  return (
    <div className={className}>
      <SkLine h={18} bar={10} w={label} className="mb-1.5" />
      <Sk className="!rounded-xl" style={{ height: 40, width: '100%' }} />
    </div>
  );
}

/** 알약 버튼 */
export function SkPill({ w = '5rem', h = 40, className = '' }: { w?: string; h?: number; className?: string }) {
  return <Sk className={`!rounded-full ${className}`} style={{ height: h, width: w }} />;
}
