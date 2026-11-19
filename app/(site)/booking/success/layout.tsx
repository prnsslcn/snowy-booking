import type { Metadata } from 'next';

/** 클라이언트 화면이라 제목은 여기서 */
export const metadata: Metadata = { title: '결제 확인' };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
