/*
  현장 배치도(Beta) — 위에서 본 유닛 위치. 운영자 스프레드시트(2026-11-23) 그대로 옮김.
  - 열 = 시트의 열 문자(D … AU), 줄 = 'top'(위 줄) / 'bottom'(아래 줄)
  - 위 줄:   카라반 9대(X~AF) · 빈 열(AG) · 카바나 14동(AH~AU)
  - 아래 줄: 단체카라반 G2(D)·G1(E) · 빈 열(F) · 카바나 16동(G~V) · Base(AC)

  ⚠ 유닛 번호 ↔ 자리 대응은 아직 미정(운영자가 '어디서부터 1번인지' 추후 알려주기로 함).
  지금은 임시로 상품별 왼쪽 → 오른쪽(카바나는 아래 줄 다음 위 줄) 순서로 유닛 1호부터 앉힌다.
  확정되면 SLOT_ORDER 의 순서만 바꾸면 된다(배치·화면 코드는 그대로).
  단체카라반만 운영자 표시대로 G1 = 1호, G2 = 2호.
*/

export type SlotType = 'cabana' | 'caravan' | 'caravan_group';
export type MapRow = 'top' | 'bottom';

export interface MapSlot {
  /** 자리 이름(시트 열 + 줄). 유닛 번호와 무관 */
  id: string;
  type: SlotType;
  col: string;
  row: MapRow;
}

/** 시트 열 문자 → 번호(A=1) */
export function colIndex(col: string): number {
  return [...col].reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0);
}

function colsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let i = colIndex(from); i <= colIndex(to); i++) {
    let n = i;
    let s = '';
    while (n > 0) {
      const r = (n - 1) % 26;
      s = String.fromCharCode(65 + r) + s;
      n = Math.floor((n - 1) / 26);
    }
    out.push(s);
  }
  return out;
}

const slots = (type: SlotType, row: MapRow, from: string, to: string): MapSlot[] =>
  colsBetween(from, to).map((col) => ({ id: `${row}-${col}`, type, col, row }));

/** 배치도 가로 범위(시트 열) */
export const MAP_FIRST_COL = 'D';
export const MAP_LAST_COL = 'AU';

/** Base(관리 거점) 위치 */
export const MAP_BASE = { col: 'AC', row: 'bottom' as MapRow, label: 'Base' };

/** 같은 상품이 이어진 묶음 — 배치도 위 이름표 */
export const MAP_BLOCKS: { type: SlotType; row: MapRow; from: string; to: string }[] = [
  { type: 'caravan', row: 'top', from: 'X', to: 'AF' },
  { type: 'cabana', row: 'top', from: 'AH', to: 'AU' },
  { type: 'caravan_group', row: 'bottom', from: 'D', to: 'E' },
  { type: 'cabana', row: 'bottom', from: 'G', to: 'V' },
];

/**
 * 상품별 자리 순서 = 유닛 번호 순서(앞에서부터 1호, 2호 …).  ⚠ 임시 — 운영자 확정 후 교체.
 */
export const SLOT_ORDER: Record<SlotType, MapSlot[]> = {
  cabana: [...slots('cabana', 'bottom', 'G', 'V'), ...slots('cabana', 'top', 'AH', 'AU')],
  caravan: slots('caravan', 'top', 'X', 'AF'),
  // 운영자 표시: E = G1, D = G2
  caravan_group: [
    { id: 'bottom-E', type: 'caravan_group', col: 'E', row: 'bottom' },
    { id: 'bottom-D', type: 'caravan_group', col: 'D', row: 'bottom' },
  ],
};

/** 번호 순서가 아직 임시인지(화면에 안내) */
export const SLOT_ORDER_TENTATIVE = true;
