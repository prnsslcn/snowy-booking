/* eslint-disable @next/next/no-img-element -- 키트 마크업은 일반 <img>; srcset 은 Next 이미지 최적화 주소 */
/**
 * 키트용 일반 <img> + Next 이미지 최적화 srcset(원본 1600px·~0.5MB 를 화면 폭에 맞게 줄여 보냄).
 * 너비는 next.config 기본 deviceSizes 안의 값만 쓴다.
 */
const WIDTHS = [640, 1080, 1920, 2048];

export function optimized(src: string, w: number): string {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=75`;
}

export function KitImg({
  src,
  alt,
  sizes = '100vw',
  className,
  style,
  eager = false,
  ...rest
}: {
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
  style?: React.CSSProperties;
  eager?: boolean;
} & Record<`data-${string}`, string | boolean | undefined>) {
  return (
    <img
      src={optimized(src, 1080)}
      srcSet={WIDTHS.map((w) => `${optimized(src, w)} ${w}w`).join(', ')}
      sizes={sizes}
      alt={alt}
      className={className}
      style={style}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : undefined}
      decoding="async"
      data-source="client"
      {...rest}
    />
  );
}

/** 히어로: 넓은 화면은 가로 사진, 폰(639px 이하)은 4:5 잘라낸 사진(layout.css picture.hero__bg) */
export function KitHeroPicture({ src, phoneSrc, alt, pos }: { src: string; phoneSrc?: string; alt: string; pos?: string }) {
  return (
    <picture className="hero__bg" data-phone-fill="" style={pos ? ({ ['--ly-pos' as string]: pos } as React.CSSProperties) : undefined}>
      {phoneSrc && (
        <source media="(max-width: 639px)" srcSet={`${optimized(phoneSrc, 640)} 640w, ${optimized(phoneSrc, 1080)} 1080w`} sizes="100vw" />
      )}
      <img
        src={optimized(src, 1920)}
        srcSet={WIDTHS.map((w) => `${optimized(src, w)} ${w}w`).join(', ')}
        sizes="100vw"
        alt={alt}
        fetchPriority="high"
        loading="eager"
        decoding="async"
        data-source="client"
      />
    </picture>
  );
}
