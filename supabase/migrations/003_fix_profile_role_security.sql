-- ============================================================
-- AMORI: profiles.role 권한 상승 취약점 수정
-- ============================================================
-- 배경:
--   002_align_schema_with_application.sql은
--     REVOKE UPDATE (role) ON public.profiles FROM authenticated, anon;
--   로 role 컬럼 변경을 막으려 했다. 그러나 Supabase가 프로젝트
--   생성 시 기본으로 부여하는 테이블 단위 권한
--     GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
--   은 컬럼 단위 REVOKE로 무효화되지 않는다(둘은 서로 독립적인 ACL
--   이다). 실제로 amori-staging에서
--     has_column_privilege('authenticated','profiles','role','UPDATE')
--   가 true로 나왔고, "본인 수정" RLS 정책도 role 값 자체는 검사하지
--   않아 로그인한 일반 사용자가
--     UPDATE profiles SET role='admin' WHERE id = auth.uid();
--   을 실행하면 성공하는 권한 상승 취약점이 실측으로 확인됐다.
--
-- 이 migration은 독립된 두 개의 방어 계층을 적용한다.
--   1) 컬럼 단위 권한: authenticated의 테이블 단위 UPDATE를 걷어내고
--      고객이 실제로 수정하는 안전한 컬럼(name, phone,
--      marketing_agreed)만 컬럼 단위로 재부여한다. anon은 UPDATE
--      권한 자체를 제거한다. id/role/created_at/updated_at 은
--      권한·식별·시스템 컬럼이므로 authenticated에게 부여하지 않는다.
--   2) 트리거 방어선: role 값이 실제로 바뀌는 UPDATE는
--      auth.role() = 'service_role' 이거나 SQL Editor처럼
--      current_user가 'postgres'인 세션이 아니면 예외를 던져
--      차단한다. 향후 GRANT 설정 실수가 있더라도 최후 방어선이
--      되도록 한다.
--
-- 부수 수정(회원가입 트리거 복구):
--   002가 profiles.user_id 컬럼을 id로 rename했는데,
--   public.handle_new_user() 트리거 함수는 여전히 옛 컬럼명
--   user_id를 참조하고 있어 002 적용 이후 신규 회원가입 시
--   INSERT가 실패하는 상태였다. 이 migration에서 함께 고친다.
--
-- 안전 원칙: DROP TABLE 없음. 무손실 컬럼 변경 없음(컬럼명/데이터
--   변경 없이 권한과 트리거만 조정). 전부 CREATE OR REPLACE /
--   DROP ... IF EXISTS 계열로 재실행 안전하게 작성.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. handle_new_user(): user_id → id 컬럼명 수정
--    (002 이후 깨져 있던 회원가입 자동 프로필 생성 트리거 복구)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, name, marketing_agreed)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'name',
    COALESCE((NEW.raw_user_meta_data ->> 'marketing_agreed')::boolean, false)
  );
  RETURN NEW;
END;
$function$;


-- ────────────────────────────────────────────────────────────
-- 2. 테이블 단위 UPDATE 권한 제거
--    (Supabase 기본 GRANT ALL ON ALL TABLES IN SCHEMA public 무력화)
-- ────────────────────────────────────────────────────────────
REVOKE UPDATE ON public.profiles FROM authenticated;
REVOKE UPDATE ON public.profiles FROM anon;


-- ────────────────────────────────────────────────────────────
-- 3. authenticated에는 고객이 실제로 수정하는 안전한 컬럼만
--    컬럼 단위로 재부여. anon은 UPDATE 권한을 아예 받지 않는다.
--    (id, role, created_at, updated_at 은 제외 — 식별/권한/시스템 컬럼)
-- ────────────────────────────────────────────────────────────
GRANT UPDATE (name, phone, marketing_agreed) ON public.profiles TO authenticated;


-- ────────────────────────────────────────────────────────────
-- 4. 방어 계층: role이 실제로 바뀌는 UPDATE는 service_role(API 요청)
--    또는 postgres(SQL Editor·migration) 세션이 아니면 트리거에서
--    차단한다. 컬럼 권한 설정이 나중에 실수로 풀리더라도 이 트리거가
--    최후 방어선이 된다. is_admin()이 true인 일반 로그인 세션이라도
--    이 경로로는 role을 바꿀 수 없다 — role 변경은 반드시
--    service_role(또는 postgres) 경로로만 이뤄져야 한다.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT (
      auth.role() = 'service_role'
      OR current_user IN ('postgres', 'service_role')
    ) THEN
      RAISE EXCEPTION 'role 컬럼은 service_role 권한으로만 변경할 수 있습니다.'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.protect_profile_role() FROM public;

DROP TRIGGER IF EXISTS protect_profile_role_trigger ON public.profiles;
CREATE TRIGGER protect_profile_role_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();


-- ────────────────────────────────────────────────────────────
-- 5. updated_at 자동 갱신 (다른 테이블들과 동일한 패턴).
--    클라이언트가 updated_at을 직접 쓸 권한이 없어도(3번에서 제외됨)
--    서버 트리거가 항상 최신 시각으로 갱신한다.
--    002_align_schema_with_application.sql에서 정의한
--    public.set_updated_at()을 재사용한다.
-- ────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- 끝. 이 migration은 amori-staging에만 적용되어야 한다.
-- ============================================================
