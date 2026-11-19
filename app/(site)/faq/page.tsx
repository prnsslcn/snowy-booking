import { redirect } from 'next/navigation';

/** /faq → 이용 안내의 자주 묻는 질문(#faq) */
export default function FaqPage() {
  redirect('/guide#faq');
}
