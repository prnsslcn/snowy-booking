import 'server-only';

import { serverEnv } from '@/lib/env';

/**
 * 공공데이터포털 한국천문연구원 특일 정보 — 공휴일(getRestDeInfo). 대체·임시공휴일 포함(지정 시 반영).
 * 서비스 키는 포털에서 받은 인코딩/디코딩 키 어느 쪽이든 받는다(이미 인코딩돼 있으면 그대로).
 */
const ENDPOINT = 'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo';

type Item = { locdate: number | string; dateName: string; isHoliday?: string };

export async function fetchHolidays(year: number): Promise<{ date: string; name: string }[]> {
  const raw = serverEnv.holidayApiKey;
  const key = /%[0-9A-F]{2}/i.test(raw) ? raw : encodeURIComponent(raw);
  const url = `${ENDPOINT}?serviceKey=${key}&solYear=${year}&numOfRows=100&_type=json`;
  const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(10_000) });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  let json: { response?: { header?: { resultCode?: string; resultMsg?: string }; body?: { items?: { item?: Item | Item[] } | '' } } };
  try {
    json = JSON.parse(text);
  } catch {
    // 키 오류 등은 XML 로 온다
    const msg = text.match(/<returnAuthMsg>([^<]+)<\/returnAuthMsg>|<resultMsg>([^<]+)<\/resultMsg>/);
    throw new Error(msg?.[1] ?? msg?.[2] ?? '응답을 읽을 수 없습니다');
  }
  const header = json.response?.header;
  if (header?.resultCode && header.resultCode !== '00') throw new Error(header.resultMsg ?? header.resultCode);
  const items = json.response?.body?.items;
  const list: Item[] = !items ? [] : Array.isArray(items.item) ? items.item : items.item ? [items.item] : [];
  return list
    .filter((i) => (i.isHoliday ?? 'Y') === 'Y')
    .map((i) => {
      const s = String(i.locdate);
      return { date: `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`, name: i.dateName === '기독탄신일' ? '성탄절' : i.dateName };
    });
}
