'use client';

import { useEffect } from 'react';

/**
 * 키트 스크립트(system.js · motion.js · layout.js)를 React 하이드레이션이 끝난 뒤에 붙인다.
 * 하이드레이션 전에 실행되면 키트가 바꾼 DOM(메뉴 시트·연출 표시 등)과 서버 HTML 이 어긋나
 * React 가 트리를 다시 그리며(오류 #418) 키트 상태를 지운다.
 */
const SRC = ['/assets/system.js', '/assets/motion/motion.js', '/assets/layout/layout.js'];

export function KitScripts() {
  useEffect(() => {
    for (const src of SRC) {
      if (document.querySelector(`script[data-kit="${src}"]`)) continue;
      const s = document.createElement('script');
      s.type = 'module';
      s.src = src;
      s.dataset.kit = src;
      document.body.appendChild(s);
    }
  }, []);
  return null;
}
