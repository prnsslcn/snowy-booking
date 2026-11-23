/**
 * 시설 사진 목록. 요금·최대 인원은 DB(product_types)가 권위.
 * 소개 문구·편의시설은 운영자 자료를 받으면 여기에 추가한다(임의 문구 넣지 않음).
 */

export interface FacilityPhoto {
  src: string;
  alt: string;
  /** 영문 대체 문구(손님 화면 영어 보기) */
  altEn?: string;
  orientation: 'portrait' | 'landscape';
}

export interface FacilityContent {
  type: 'cabana' | 'caravan' | 'caravan_group';
  slug: string;
  photos: FacilityPhoto[];
}

const p = (file: string, alt: string, orientation: FacilityPhoto['orientation'] = 'portrait', altEn?: string): FacilityPhoto => ({
  src: `/images/facilities/${file}`,
  alt,
  altEn,
  orientation,
});

/** 언어에 맞는 대체 문구 */
export function photoAlt(photo: Pick<FacilityPhoto, 'alt' | 'altEn'>, locale: 'ko' | 'en'): string {
  return locale === 'en' && photo.altEn ? photo.altEn : photo.alt;
}

export const FACILITIES: FacilityContent[] = [
  {
    type: 'cabana',
    slug: 'cabana',
    photos: [
      p('cabana-1.jpg', '카바나 외관', 'portrait', 'Cabana exterior'),
      p('cabana-2.jpg', '카바나 내부', 'portrait', 'Cabana interior'),
      p('cabana-3.jpg', '카바나 내부 벽면', 'portrait', 'Cabana interior wall'),
    ],
  },
  {
    type: 'caravan',
    slug: 'caravan',
    photos: [
      p('caravan-1.jpg', '카라반 외관', 'landscape', 'Caravan exterior'),
      p('caravan-2.jpg', '카라반 내부', 'portrait', 'Caravan interior'),
      p('caravan-3.jpg', '카라반 침대', 'portrait', 'Caravan beds'),
      p('caravan-4.jpg', '카라반 온도 조절기', 'portrait', 'Caravan thermostat'),
    ],
  },
  {
    type: 'caravan_group',
    slug: 'caravan-group',
    photos: [
      p('caravan-group-1.jpg', '단체카라반 외관', 'landscape', 'Group caravan exterior'),
      p('caravan-group-3.jpg', '단체카라반 내부', 'portrait', 'Group caravan interior'),
      p('caravan-group-2.jpg', '단체카라반 침대', 'portrait', 'Group caravan beds'),
    ],
  },
];

/** 홈 히어로(데스크톱 가로 / 폰 세로 크롭) */
export const PHOTO = {
  hero: p('caravan-group-1-hero.jpg', '눈 덮인 소나무 앞 설원 위의 단체카라반 두 대', 'landscape', 'Two group caravans on a snowfield in front of snow-covered pines'),
  heroPhone: p('caravan-group-1-phone.jpg', '눈 덮인 소나무 앞 설원 위의 단체카라반 두 대', 'portrait', 'Two group caravans on a snowfield in front of snow-covered pines'),
};

export function facilityByType(type: string): FacilityContent | undefined {
  return FACILITIES.find((f) => f.type === type);
}

/** 예약·조회 화면 썸네일 — 상품 대표(외관) 사진 */
export function thumbOf(type: string): FacilityPhoto | undefined {
  return facilityByType(type)?.photos[0];
}
