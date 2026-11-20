'use client';

import { useEffect } from 'react';

/**
 * 매출 기간을 '일회성'으로(grill-booking 동일): 서버가 ?from&to 로 그린 뒤 주소창 쿼리만 비워,
 * 새로고침하면 기본 기간(이번 달)으로 돌아오게 한다. 지금 화면 데이터는 그대로.
 */
export function EphemeralRange({ deps }: { deps: string }) {
  useEffect(() => {
    if (window.location.search) window.history.replaceState(null, '', window.location.pathname);
  }, [deps]);
  return null;
}
