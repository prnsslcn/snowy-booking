/*
  현장 배치도(Beta) — 위에서 본 자리 배치. 운영자 스프레드시트(2026-11-23)를 바탕으로, 화면에 맞게 당겨 그린 칸 좌표.
  좌표 = 화면 그리드 열 번호(1부터), 줄 = 'top' / 'bottom'.

    위 줄:   카라반 1~9 · S1 · S2 · (빈 칸) · 카바나 14동
    아래 줄: 단체 G2 · G1 · (빈 칸) · 카바나 16동 · (빈 칸) · 푸드트레일러(2칸 폭)

  - 자리는 예약 순서와 무관하다(운영자 2026-11-23): 손님이 도착하면 원하는 빈자리를 주고 그 자리로 입실 처리.
    예약의 유닛은 그 전까지 가배정일 뿐(admin_seat_booking 이 도착 시 맞바꿈).
  - S1·S2 = 특수(예약 오류·지인 방문 등, 관리자 유선 등록 전용, 온라인 판매 안 함).

  ⚠ 칸 번호 ↔ 유닛 대응(어디서부터 1번인지)은 아직 미정 — 운영자가 추후 알려주기로 함.
  지금은 임시로 상품별 왼쪽 → 오른쪽(카바나는 아래 줄 다음 위 줄) 순서. 확정되면 SLOT_ORDER 만 바꾼다.
  단체는 운영자 표시대로 G1 = 1호, G2 = 2호.
*/

export type SlotType = 'cabana' | 'caravan' | 'caravan_group' | 'special';
export type MapRow = 'top' | 'bottom';

export interface MapSlot {
  id: string;
  type: SlotType;
  /** 화면 그리드 열(1부터) */
  col: number;
  row: MapRow;
}

const run = (type: SlotType, row: MapRow, from: number, count: number): MapSlot[] =>
  Array.from({ length: count }, (_, i) => ({ id: `${row}-${from + i}`, type, col: from + i, row }));

/** 특수(S1·S2)를 카라반 9 에서 살짝 띄우는 거리(px). 오른쪽 빈 칸 안에서 밀어 카바나와는 여전히 떨어져 있다 */
export const SPECIAL_NUDGE_PX = 6;

/** 가로 칸 수 */
export const MAP_COLS = 26;

// 위 줄
const CARAVAN = run('caravan', 'top', 1, 9); //     1~9
const SPECIAL = run('special', 'top', 10, 2); //    10~11 (S1, S2)
const CABANA_TOP = run('cabana', 'top', 13, 14); // 13~26

// 아래 줄
const GROUP_G2: MapSlot = { id: 'bottom-1', type: 'caravan_group', col: 1, row: 'bottom' };
const GROUP_G1: MapSlot = { id: 'bottom-2', type: 'caravan_group', col: 2, row: 'bottom' };
const CABANA_BOTTOM = run('cabana', 'bottom', 4, 16); // 4~19

/** 푸드트레일러(2칸 폭) */
export const MAP_BASE = { col: 21, span: 2, row: 'bottom' as MapRow, label: 'Food Trailer' };

/** 같은 상품이 이어진 묶음 — 이름표 */
export const MAP_BLOCKS: { label: string; row: MapRow; from: number; to: number }[] = [
  { label: '카라반', row: 'top', from: 1, to: 9 },
  { label: '특수', row: 'top', from: 10, to: 11 },
  { label: '카바나', row: 'top', from: 13, to: 26 },
  { label: '단체', row: 'bottom', from: 1, to: 2 },
  { label: '카바나', row: 'bottom', from: 4, to: 19 },
];

/**
 * 상품별 자리 순서 = 유닛 정렬 순서(앞에서부터 1호, 2호 …).  ⚠ 임시 — 운영자 확정 후 교체.
 */
export const SLOT_ORDER: Record<SlotType, MapSlot[]> = {
  cabana: [...CABANA_BOTTOM, ...CABANA_TOP],
  caravan: CARAVAN,
  caravan_group: [GROUP_G1, GROUP_G2],
  special: SPECIAL,
};

/** 번호 순서가 아직 임시인지(화면에 안내) */
export const SLOT_ORDER_TENTATIVE = true;
