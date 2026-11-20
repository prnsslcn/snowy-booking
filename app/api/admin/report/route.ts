import ExcelJS from 'exceljs';

import { getAdminUser } from '@/lib/admin/auth';
import { PAY_METHOD_LABEL } from '@/lib/admin/labels';
import { getSales, salesRanges, type SalesRow } from '@/lib/admin/sales';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/*
  월말보고 xlsx(grill-booking 이식) — 이용일 기준, 확정·입실·퇴실만.
  시트: 요약 / 온라인(토스) / 유선. 무상·취소·환불 제외(요약에 무상 건수만).
*/

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** ISO(UTC) → KST 'YYYY-MM-DD HH:mm' */
function kstDateTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}
const phone = (p: string | null) => (p ? p.replace(/^(\d{3})(\d{3,4})(\d{4})$/, '$1-$2-$3') : '');

function style(ws: ExcelJS.Worksheet) {
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).eachCell((c) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE1EBF5' } };
    c.alignment = { vertical: 'middle' };
  });
  ws.views = [{ state: 'frozen', ySplit: 1 }];
}

function detailSheet(ws: ExcelJS.Worksheet, rows: SalesRow[], kind: 'online' | 'offline') {
  ws.columns = [
    { header: '이용일', key: 'date', width: 12 },
    { header: '상품', key: 'type', width: 12 },
    { header: '유닛', key: 'unit', width: 14 },
    { header: kind === 'online' ? '예약번호' : '주문번호', key: 'no', width: kind === 'online' ? 10 : 28 },
    { header: '예약자', key: 'name', width: 12 },
    { header: '연락처', key: 'phone', width: 15 },
    { header: '인원', key: 'guests', width: 6 },
    { header: '금액(원)', key: 'amount', width: 13 },
    { header: '결제수단', key: 'method', width: 10 },
    { header: kind === 'online' ? '결제일시' : '현장 조정·메모', key: 'extra', width: kind === 'online' ? 18 : 36 },
    ...(kind === 'online' ? [{ header: '주문번호', key: 'order', width: 28 }] : []),
  ];
  for (const r of rows) {
    ws.addRow({
      date: r.date,
      type: r.typeName,
      unit: r.unitLabel,
      no: kind === 'online' ? (r.lookupCode ?? '') : r.orderId,
      name: r.guestName,
      phone: phone(r.guestPhone),
      guests: r.guestCount ?? '',
      amount: r.amount,
      method: kind === 'online' ? (r.method ?? '') : (PAY_METHOD_LABEL[r.method ?? ''] ?? ''),
      extra: kind === 'online' ? kstDateTime(r.paidAt) : r.memo,
      order: r.orderId,
    });
  }
  const total = ws.addRow({ name: `${rows.length}건`, amount: rows.reduce((s, r) => s + r.amount, 0), method: '합계' });
  total.font = { bold: true };
  ws.getColumn('amount').numFmt = '#,##0';
  style(ws);
}

export async function GET(req: Request): Promise<Response> {
  if (!(await getAdminUser())) return new Response('Unauthorized', { status: 401 });

  const { searchParams } = new URL(req.url);
  const def = salesRanges().thisMonth;
  const fromQ = searchParams.get('from') ?? '';
  const toQ = searchParams.get('to') ?? '';
  const from = DATE.test(fromQ) ? fromQ : def.from;
  const to = DATE.test(toQ) && toQ >= from ? toQ : def.to;
  if ((Date.parse(to) - Date.parse(from)) / 86400000 > 400) return new Response('기간은 400일까지입니다.', { status: 400 });

  const s = await getSales(from, to);
  const wb = new ExcelJS.Workbook();
  wb.creator = '스노위 카바나·카라반';

  // 요약
  const sum = wb.addWorksheet('요약');
  sum.columns = [
    { header: '구분', key: 'k', width: 22 },
    { header: '건수', key: 'c', width: 10 },
    { header: '금액(원)', key: 'a', width: 16 },
  ];
  sum.addRow({ k: `기간 ${from} ~ ${to} (이용일 기준)` });
  sum.addRow({ k: '온라인(토스)', c: s.online.count, a: s.online.amount });
  for (const [m, v] of Object.entries(s.offline.byMethod)) sum.addRow({ k: `유선 · ${PAY_METHOD_LABEL[m] ?? m}`, c: v.count, a: v.amount });
  sum.addRow({ k: '유선 합계', c: s.offline.count, a: s.offline.amount });
  sum.addRow({ k: '총 매출', c: s.total.count, a: s.total.amount }).font = { bold: true };
  sum.addRow({});
  for (const t of s.byType) sum.addRow({ k: `${t.name}${t.capacity ? ` (점유율 ${Math.round((t.sold / t.capacity) * 1000) / 10}%)` : ''}`, c: t.count, a: t.amount });
  sum.addRow({});
  sum.addRow({ k: '무상 예약(매출 제외)', c: s.compCount });
  sum.addRow({ k: '※ 확정·입실·퇴실만 합산. 무상·취소·환불 제외.' });
  sum.getColumn('a').numFmt = '#,##0';
  style(sum);

  detailSheet(wb.addWorksheet('온라인(토스)'), s.rows.filter((r) => r.source === 'online'), 'online');
  detailSheet(wb.addWorksheet('유선'), s.rows.filter((r) => r.source === 'offline'), 'offline');

  const buf = await wb.xlsx.writeBuffer();
  const filename = `월말보고_${from}_${to}.xlsx`;
  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'no-store',
    },
  });
}
