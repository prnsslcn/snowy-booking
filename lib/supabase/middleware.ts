import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { publicEnv } from '@/lib/env.public';

/**
 * 매 요청마다 Supabase 세션 토큰을 갱신해 쿠키에 반영한다.
 * 서버 컴포넌트/액션이 최신 세션을 읽을 수 있게 하는 표준 패턴.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser()가 토큰 갱신을 트리거한다.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 관리자 화면은 입구에서 한 번 더 막는다(로그인 안 됐으면 로그인으로).
  // 화면 이동(RSC) 요청은 레이아웃의 확인을 건너뛸 수 있어서 — 관리자 여부(admins)는 화면·데이터 함수가 다시 확인.
  const path = request.nextUrl.pathname;
  if (!user && path.startsWith('/admin') && !path.startsWith('/admin/login')) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}
