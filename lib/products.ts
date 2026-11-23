import 'server-only';

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

/**
 * 판매 중 상품. DB 를 읽지 못하면 null — 화면은 상품을 조용히 빼지 말고 '잠시 후 다시' 안내를 보여 준다.
 */
export async function getProducts(): Promise<Product[] | null> {
  const supabase = createAdminClient();
  const [{ data, error }, { data: units, error: unitsError }] = await Promise.all([
    supabase
      .from('product_types')
      .select('type, name, slug, max_capacity, price_weekday, price_weekend, sort')
      .eq('is_active', true)
      .order('sort'),
    supabase.from('units').select('type').eq('is_active', true),
  ]);
  if (error || unitsError || !data) return null;

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
    content: facilityByType(p.type),
  }));
}

/** 수량 단위: 카바나는 동, 카라반류는 대 */
export function unitWord(type: string): string {
  return type === 'cabana' ? '동' : '대';
}
