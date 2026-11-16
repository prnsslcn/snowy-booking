// 임시 placeholder — 마이그레이션 적용 후 아래 명령으로 덮어쓴다:
//   pnpm exec supabase gen types typescript --local > types/database.ts
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
