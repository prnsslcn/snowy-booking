/**
 * 시설 소개 콘텐츠 — 사진·소개 문구·특징.
 * 요금·최대 인원은 DB(product_types)가 권위이고 여기 두지 않는다.
 *
 * [미정] 소개 문구·편의시설은 운영자 확정 전 임시. 특징은 '사진으로 확인되는 것'만 적었다.
 * 운영자 문구를 받으면 이 파일만 고치면 된다.
 */

export interface FacilityPhoto {
  src: string;
  alt: string;
  /** 원본 비율 — 갤러리 레이아웃용 */
  orientation: 'portrait' | 'landscape';
}

export interface FacilityContent {
  type: 'cabana' | 'caravan' | 'caravan_group';
  slug: string;
  tagline: string;
  description: string;
  features: string[];
  cover: FacilityPhoto;
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
    tagline: '눈 속의 작은 원목 오두막',
    description: '삼각 지붕 아래 원목으로 마감한 아늑한 공간. 소규모 가족·친구와 하루를 보내기 좋습니다.',
    features: ['원목 실내', '좌식 테이블', '난방'],
    cover: p('cabana-1.jpg', '눈 덮인 삼각 지붕 원목 카바나 외관'),
    photos: [
      p('cabana-1.jpg', '눈 덮인 삼각 지붕 원목 카바나 외관'),
      p('cabana-2.jpg', '삼각 원목 천장과 좌식 테이블이 있는 카바나 내부'),
      p('cabana-3.jpg', '원목 벽과 난방 패널이 있는 카바나 내부'),
    ],
  },
  {
    type: 'caravan',
    slug: 'caravan',
    tagline: '라운지와 2층 침대가 있는 카라반',
    description: '소파 라운지와 2층 침대를 갖춘 카라반. 난방을 직접 조절하며 따뜻하게 쉬어 갈 수 있습니다.',
    features: ['소파 라운지', '테이블', '2층 침대', '난방 온도 조절'],
    cover: p('caravan-1.jpg', '파란 하늘 아래 눈이 쌓인 흰색 카라반 외관', 'landscape'),
    photos: [
      p('caravan-1.jpg', '파란 하늘 아래 눈이 쌓인 흰색 카라반 외관', 'landscape'),
      p('caravan-2.jpg', 'ㄷ자 소파와 원목 테이블이 있는 카라반 라운지'),
      p('caravan-3.jpg', '카라반 내부 2층 침대'),
      p('caravan-4.jpg', '카라반 난방 온도 조절기'),
    ],
  },
  {
    type: 'caravan_group',
    slug: 'caravan-group',
    tagline: '단체를 위한 넓은 카라반',
    description: '넓은 거실과 복층 침대를 갖춘 단체용 카라반. 여럿이 함께 머물기 좋은 공간입니다.',
    features: ['넓은 거실', '복층 침대', '좌식 테이블', '난방'],
    // 홈 히어로가 caravan-group-1 이라 대표(카드·썸네일)는 거실 사진으로 — 같은 사진 반복 방지
    cover: p('caravan-group-3.jpg', '창이 두 개 있는 단체 카라반 거실'),
    photos: [
      p('caravan-group-1.jpg', '눈 덮인 소나무 앞 설원 위의 단체 카라반 두 대', 'landscape'),
      p('caravan-group-3.jpg', '창이 두 개 있는 단체 카라반 거실'),
      p('caravan-group-2.jpg', '사다리가 있는 단체 카라반 복층 침대'),
    ],
  },
];

export const HERO_PHOTO = p('caravan-group-1.jpg', '파란 하늘 아래 눈 덮인 설원과 카라반', 'landscape');

export function facilityByType(type: string): FacilityContent | undefined {
  return FACILITIES.find((f) => f.type === type);
}

export function facilityBySlug(slug: string): FacilityContent | undefined {
  return FACILITIES.find((f) => f.slug === slug);
}
