import { ANONYMOUS, loadTossPayments, type TossPaymentsWidgets } from '@tosspayments/tosspayments-sdk';

/**
 * 토스 결제위젯(v2 주문서형) — https://docs.tosspayments.com/guides/v2/payment-widget/integration
 *
 * 1) mountTossWidget: 결제 단계 화면에 결제수단 UI·약관 UI를 그린다(금액은 화면 표시 금액으로 먼저 설정).
 * 2) requestTossPayment: 손님이 결제하기를 누르면 서버 선점(reserve)으로 받은 금액으로 다시 맞춘 뒤 결제 요청.
 *    성공 → successUrl(paymentKey·orderId·amount) → 서버 confirm 재검증. 실패·취소 → failUrl(?orderId) → 선점 즉시 반환.
 *
 * 키: 결제위젯 연동 키(클라이언트 test_gck_/live_gck_, 시크릿 test_gsk_/live_gsk_) — 클라이언트·시크릿은 같은 쌍이어야 한다.
 *
 * 결제 UI(variantKey): 결제위젯 키는 사업자 계정에 하나뿐(MID별 키 아님). 결제가 어느 상점(MID)으로 들어갈지는
 * 토스 개발자센터 '결제 UI 설정'에서 UI 마다 연결한 MID 로 정해진다 → 스노위 MID 에 연결한 'SNOWY' UI(2026-11-28 생성).
 * 'DEFAULT' 는 기존 MID(grill-booking abcbbq2pkt — grill 은 위젯이 아니라 MID별 API 개별 키·결제창 사용)에 걸려 있을 수 있어 쓰지 않는다.
 * 기본값을 SNOWY 로 두고 필요할 때만 환경변수로 바꾼다.
 */
const PAYMENT_UI_VARIANT = process.env.NEXT_PUBLIC_TOSS_VARIANT_KEY || 'SNOWY';

export const PAYMENT_METHODS_ID = 'toss-payment-methods';
export const AGREEMENT_ID = 'toss-agreement';

export interface MountedWidget {
  widgets: TossPaymentsWidgets;
  /** 손님이 고른 결제수단이 받는 범위(카드 결제창과 같은 CARD — 신용·체크카드, 토스페이·카카오페이 등 간편결제)인지 */
  isAllowedMethod: () => Promise<boolean>;
  destroy: () => Promise<void>;
}

/*
  토스 SDK 는 결제수단·약관 UI 를 페이지에 하나씩만 허용한다. 단계 이동·React 재마운트로 그리기와 지우기가
  겹치면 "하나의 결제수단 위젯만…" 오류가 나므로, 그리기·지우기를 한 줄로 세워 차례로 실행한다.
*/
let chain: Promise<unknown> = Promise.resolve();
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const p = chain.then(fn);
  chain = p.catch(() => {});
  return p;
}

async function render(amount: number): Promise<MountedWidget> {
  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
  if (!clientKey) throw new Error('NEXT_PUBLIC_TOSS_CLIENT_KEY 가 설정되지 않았습니다.');

  const tossPayments = await loadTossPayments(clientKey);
  const widgets = tossPayments.widgets({ customerKey: ANONYMOUS }); // 비회원 결제
  await widgets.setAmount({ currency: 'KRW', value: amount }); // 결제수단 UI 보다 먼저
  const methods = await widgets.renderPaymentMethods({ selector: `#${PAYMENT_METHODS_ID}`, variantKey: PAYMENT_UI_VARIANT });
  const agreement = await widgets.renderAgreement({ selector: `#${AGREEMENT_ID}`, variantKey: 'AGREEMENT' }).catch(async (err: unknown) => {
    await methods.destroy().catch(() => {});
    throw err;
  });
  return {
    widgets,
    isAllowedMethod: async () => {
      // 퀵계좌이체(TRANSFER)·가상계좌·휴대폰 등은 받지 않는다(grill-booking 의 method: 'CARD' 와 같은 범위)
      const selected = await methods.getSelectedPaymentMethod().catch(() => null);
      return !selected || selected.method === 'CARD';
    },
    destroy: async () => {
      await Promise.allSettled([methods.destroy(), agreement.destroy()]);
    },
  };
}

/** 결제수단·약관 UI 를 그린다(앞선 그리기·지우기가 끝난 뒤). */
export function mountTossWidget(amount: number): Promise<MountedWidget> {
  return enqueue(() => render(amount));
}

/** mountTossWidget 으로 그린 것을 지운다(그리기가 아직 진행 중이어도 끝난 뒤 지움). */
export function unmountTossWidget(mounting: Promise<MountedWidget>): void {
  void enqueue(async () => {
    const w = await mounting.catch(() => null);
    await w?.destroy();
  });
}

export async function requestTossPayment(
  widgets: TossPaymentsWidgets,
  params: {
    amount: number;
    orderId: string;
    orderName: string;
    customerName: string;
    customerMobilePhone?: string;
  },
): Promise<void> {
  // 결제 금액은 서버 선점 결과가 권위 — 화면 금액과 달라도 이 값으로 맞춰 요청(서버 confirm 이 다시 검증)
  await widgets.setAmount({ currency: 'KRW', value: params.amount });
  const origin = window.location.origin;
  await widgets.requestPayment({
    orderId: params.orderId,
    orderName: params.orderName,
    successUrl: `${origin}/booking/success`,
    failUrl: `${origin}/booking/fail?orderId=${encodeURIComponent(params.orderId)}`,
    customerName: params.customerName,
    ...(params.customerMobilePhone ? { customerMobilePhone: params.customerMobilePhone } : {}),
  });
}
