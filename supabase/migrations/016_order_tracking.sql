-- 016_order_tracking.sql
--
-- 주문 관리 강화(P1-B): 송장(택배사·운송장번호) 컬럼 추가.

alter table public.orders add column if not exists courier text;         -- 택배사명
alter table public.orders add column if not exists tracking_number text;  -- 운송장 번호

-- Rollback: alter table public.orders drop column if exists courier, drop column if exists tracking_number;
