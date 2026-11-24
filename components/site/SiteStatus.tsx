'use client';

import { usePathname } from 'next/navigation';
import { createContext, useContext } from 'react';

/*
  영업 종료 여부(관리자 운영 설정) — 레이아웃이 읽어 손님 화면 클라이언트 컴포넌트에 내려 준다.
  종료 중(또는 /off 화면)에는 예약하기·예약 조회 버튼·링크(nav·상품 장·마지막 장·하위 화면 푸터)를 숨긴다.
  /off 는 홈과 같은 구성이라 시설 소개(상품 장)는 그대로 스크롤해서 볼 수 있다.
*/
const ClosedContext = createContext(false);

export function SiteStatusProvider({ closed, children }: { closed: boolean; children: React.ReactNode }) {
  return <ClosedContext.Provider value={closed}>{children}</ClosedContext.Provider>;
}

export function useBusinessClosed(): boolean {
  const closed = useContext(ClosedContext);
  const pathname = usePathname();
  return closed || pathname === '/off';
}
