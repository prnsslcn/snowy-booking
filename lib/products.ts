import 'server-only';

import { facilityByType, type FacilityContent } from '@/lib/content/facilities';
import { createAdminClient } from '@/lib/supabase/admin';

/** 판매 중 상품(DB: 이름·인원·요금) + 소개 콘텐츠. 요금·인원은 DB가 권위. */
export interface Product {
  type: string;
  name: string;
  slug: string;
  maxCapacity: number;
  priceWeekday: number;
  priceWeekend: number;
  content: FacilityContent | undefined;
}

export async function getProducts(): Promise<Product[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('product_types')
    .select('type, name, slug, max_capacity, price_weekday, price_weekend, sort')
    .eq('is_active', true)
    .order('sort');
  return (data ?? []).map((p) => ({
    type: p.type,
    name: p.name,
    slug: p.slug,
    maxCapacity: p.max_capacity,
    priceWeekday: p.price_weekday,
    priceWeekend: p.price_weekend,
    content: facilityByType(p.type),
  }));
}
