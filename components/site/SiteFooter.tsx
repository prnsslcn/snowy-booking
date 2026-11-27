'use client';

import { BusinessInfo } from '@/components/site/BusinessInfo';
import { useLocale } from '@/components/site/LocaleProvider';
import { useBusinessClosed } from '@/components/site/SiteStatus';
import { TLink } from '@/components/site/TLink';
import { tr } from '@/lib/i18n';

/**
 * 하위 화면(예약·조회·결과) 공용 푸터 — 홈 마지막 장과 같은 모양.
 * 사업자 정보는 전자상거래법 제10조에 따라 결제 사이트에 필수 → 항상 펼쳐 보임(BusinessInfo).
 */
export function SiteFooter({ dark = false, glacier = false }: { dark?: boolean; /** 겨울 파랑 바탕(베타 시설 안내 카바나·단체카라반) */ glacier?: boolean }) {
  const onBlue = dark || glacier;
  const text = glacier ? 'text-ice-100/60' : dark ? 'text-white/45' : 'text-ink/50';
  const link = onBlue ? 'text-white/80 hover:text-white' : 'text-ink/80 hover:text-ink';
  const rule = glacier ? 'border-white/[.15]' : dark ? 'border-white/[.08]' : 'border-black/[.12]';
  const t = tr(useLocale());
  const closed = useBusinessClosed();
  return (
    <footer className={`mt-auto px-5 pb-6 pt-16 md:px-8 lg:px-10 ${glacier ? 'bg-glacier' : dark ? 'bg-ink' : 'bg-ice-50'}`}>
      <div className={`flex flex-col gap-1.5 border-t ${rule} pt-5 text-[12px] leading-relaxed md:gap-2 md:text-[13px] ${text}`}>
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          <TLink href="/terms" className={link}>
            {t('이용약관', 'Terms of Service')}
          </TLink>
          <TLink href="/privacy" className={`font-semibold ${link}`}>
            {t('개인정보처리방침', 'Privacy Policy')}
          </TLink>
          <TLink href="/refund-policy" className={link}>
            {t('취소·환불정책', 'Cancellation & Refund Policy')}
          </TLink>
          {!closed && (
            <TLink href="/booking/lookup" className={link}>
              {t('예약 조회·취소', 'Find or Cancel a Booking')}
            </TLink>
          )}
        </p>
        <BusinessInfo />
      </div>
    </footer>
  );
}
