/*
  한/영 전환 때 '바뀌는 조각'만 사라졌다가 순서대로 다시 나타나게 하는 DOM 도우미(PageTransition.replay).

  조각 고르기:
  - 글자를 가진 요소(제목·문단·목록·버튼·링크·입력칸 등)에서 위로 올라가며, 바탕색·테두리·그림자가 있는
    '상자'(카드·버튼·입력칸·목록 묶음 등) 중 가장 바깥 것을 조각으로 삼는다 → 상자째 사라졌다 다시 생김.
  - 상자 안에 있지 않은 글자는 그 글자 요소가 조각.
  - 화면을 꽉 채우는 장(섹션)·바탕·사진은 조각이 아니다(움직이지 않음).
  - 조각 안의 조각은 바깥 것 하나로 합친다.
  - 글자 없는 장식이라도 data-swap-piece 를 붙이면 조각(nav 구분선 등).

  숨김·등장은 data-swap 속성 + site.css 규칙으로(등장 애니메이션이 남긴 인라인 스타일보다 우선).
*/

const TEXT = 'h1, h2, h3, h4, p, li, dt, dd, th, td, label, legend, a, button, small, strong, b, input, textarea, select';

function hasBox(el: Element): boolean {
  const s = getComputedStyle(el);
  const bg = s.backgroundColor;
  const bgVisible = bg !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(bg);
  const border =
    ['Top', 'Right', 'Bottom', 'Left'].some((side) => parseFloat(s.getPropertyValue(`border-${side.toLowerCase()}-width`)) > 0) &&
    !/rgba\([^)]*,\s*0\)$/.test(s.borderTopColor);
  return bgVisible || border || s.boxShadow !== 'none';
}

/** 화면 거의 전체를 덮는 것(장·본문 틀)은 상자가 아니다 */
function tooBig(el: Element): boolean {
  const r = el.getBoundingClientRect();
  return r.width > window.innerWidth * 0.92 || r.height > window.innerHeight * 0.85;
}

export function collectPieces(roots: Element[]): HTMLElement[] {
  const pieces = new Set<HTMLElement>();
  for (const root of roots) {
    // 글자는 없지만 함께 사라졌다 나타날 장식(nav 구분선 등)
    for (const el of root.querySelectorAll<HTMLElement>('[data-swap-piece]')) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 || r.height > 0) pieces.add(el);
    }
    for (const el of root.querySelectorAll<HTMLElement>(TEXT)) {
      const isField = el.matches('input, textarea, select');
      if (!isField && !el.textContent?.trim()) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue; // 숨은 것
      // 가장 바깥 '상자'까지 올라간다(뿌리·너무 큰 것 직전에서 멈춤)
      let piece: HTMLElement = el;
      for (let p = el.parentElement; p && p !== root && !tooBig(p); p = p.parentElement) {
        if (hasBox(p)) piece = p;
      }
      if (piece === el && hasBox(el) && tooBig(el)) continue;
      pieces.add(piece);
    }
  }
  // 다른 조각 안에 든 조각은 빼고 바깥 것만
  const list = [...pieces];
  return list.filter((p) => !list.some((q) => q !== p && q.contains(p)));
}

/** 위에서 아래(같은 줄이면 왼쪽부터) 순서 */
export function byPosition(pieces: HTMLElement[]): HTMLElement[] {
  return pieces
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .sort((a, b) => Math.round(a.r.top / 8) - Math.round(b.r.top / 8) || a.r.left - b.r.left)
    .map((x) => x.el);
}

export function inView(el: Element): boolean {
  const r = el.getBoundingClientRect();
  return r.bottom > 0 && r.top < window.innerHeight;
}
