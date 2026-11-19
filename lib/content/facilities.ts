/**
 * 시설 사진 목록. 요금·최대 인원은 DB(product_types)가 권위.
 * 소개 문구·편의시설은 운영자 자료를 받으면 여기에 추가한다(임의 문구 넣지 않음).
 */

export interface FacilityPhoto {
  src: string;
  alt: string;
  orientation: 'portrait' | 'landscape';
}

export interface FacilityContent {
  type: 'cabana' | 'caravan' | 'caravan_group';
  slug: string;
  photos: FacilityPhoto[];
}

const p = (file: string, alt: string, orientation: FacilityPhoto['orientation'] = 'portrait'): FacilityPhoto => ({
  src: `/images/facilities/${file}`,
  alt,
  orientation,
});

export const FACILITIES: FacilityContent[] = [
  {
    type: 'cabana',
    slug: 'cabana',
    photos: [
      p('cabana-1.jpg', '카바나 외관'),
      p('cabana-2.jpg', '카바나 내부'),
      p('cabana-3.jpg', '카바나 내부 벽면'),
    ],
  },
  {
    type: 'caravan',
    slug: 'caravan',
    photos: [
      p('caravan-1.jpg', '카라반 외관', 'landscape'),
      p('caravan-2.jpg', '카라반 내부'),
      p('caravan-3.jpg', '카라반 침대'),
      p('caravan-4.jpg', '카라반 온도 조절기'),
    ],
  },
  {
    type: 'caravan_group',
    slug: 'caravan-group',
    photos: [
      p('caravan-group-1.jpg', '단체카라반 외관', 'landscape'),
      p('caravan-group-3.jpg', '단체카라반 내부'),
      p('caravan-group-2.jpg', '단체카라반 침대'),
    ],
  },
];

/** 홈 히어로(데스크톱 가로 / 폰 세로 크롭) */
export const PHOTO = {
  hero: p('caravan-group-1-hero.jpg', '눈 덮인 소나무 앞 설원 위의 단체카라반 두 대', 'landscape'),
  heroPhone: p('caravan-group-1-phone.jpg', '눈 덮인 소나무 앞 설원 위의 단체카라반 두 대'),
};

export function facilityByType(type: string): FacilityContent | undefined {
  return FACILITIES.find((f) => f.type === type);
}

/** 예약·조회 화면 썸네일 — 상품 대표(외관) 사진 */
export function thumbOf(type: string): FacilityPhoto | undefined {
  return facilityByType(type)?.photos[0];
}
