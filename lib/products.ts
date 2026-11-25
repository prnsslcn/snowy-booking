import 'server-only';

import { unstable_cache } from 'next/cache';

import { facilityByType, type FacilityContent } from '@/lib/content/facilities';
import { createAdminClient } from '@/lib/supabase/admin';

/** 판매 중 상품(DB: 이름·인원·요금·운영 유닛 수) + 사진. 요금·인원·수량은 DB가 권위. */
export interface Product {
  type: string;
  name: string;
  slug: string;
  maxCapacity: number;
  priceWeekday: number;
  priceWeekend: number;
  /** 활성 유닛 수(카바나 30동 등) */
  unitCount: number;
  content: FacilityContent | undefined;
}

/** 관리자가 요금·유닛을 바꾸면 이 태그로 캐시를 지운다(lib/admin/config-actions.ts) */
export const PRODUCTS_TAG = 'products';

type ProductRow = Omit<Product, 'content'>;

/** DB 원본 — 읽지 못하면 throw(실패한 결과는 캐시에 남기지 않기 위해) */
async function fetchProducts(): Promise<ProductRow[]> {
  const supabase = createAdminClient();
  const [{ data, error }, { data: units, error: unitsError }] = await Promise.all([
    supabase
      .from('product_types')
      .select('type, name, slug, max_capacity, price_weekday, price_weekend, sort')
      .eq('is_active', true)
      .order('sort'),
    supabase.from('units').select('type').eq('is_active', true),
  ]);
  if (error || unitsError || !data) throw new Error('PRODUCTS_LOAD_FAILED');

  const counts = new Map<string, number>();
  for (const u of units ?? []) counts.set(u.type, (counts.get(u.type) ?? 0) + 1);

  return data.map((p) => ({
    type: p.type,
    name: p.name,
    slug: p.slug,
    maxCapacity: p.max_capacity,
    priceWeekday: p.price_weekday,
    priceWeekend: p.price_weekend,
    unitCount: counts.get(p.type) ?? 0,
  }));
}

/** 홈·시설 안내·이용 안내가 화면마다 DB 에 묻지 않게 서버 데이터 캐시(5분, 관리자 변경 시 태그로 즉시 비움) */
const fetchProductsCached = unstable_cache(fetchProducts, ['products'], { tags: [PRODUCTS_TAG], revalidate: 300 });

/**
 * 판매 중 상품. DB 를 읽지 못하면 null — 화면은 상품을 조용히 빼지 말고 '잠시 후 다시' 안내를 보여 준다.
 */
export async function getProducts(): Promise<Product[] | null> {
  try {
    const rows = await fetchProductsCached();
    return rows.map((p) => ({ ...p, content: facilityByType(p.type) }));
  } catch {
    return null;
  }
}

/** 수량 단위: 카바나는 동, 카라반류는 대 */
export function unitWord(type: string): string {
  return type === 'cabana' ? '동' : '대';
}
