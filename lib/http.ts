/** API 라우트 입력 파싱 헬퍼. */

export async function readJson<T extends object>(request: Request): Promise<Partial<Record<keyof T, unknown>> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === 'object' ? (body as Partial<Record<keyof T, unknown>>) : null;
  } catch {
    return null;
  }
}

export function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export function int(v: unknown): number | null {
  return typeof v === 'number' && Number.isInteger(v) ? v : null;
}

export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
