-- DHC_PMO 스키마 수정 마이그레이션
-- Supabase > SQL Editor에서 실행

-- 1. threads.thread_type: 'development', 'research' 추가
ALTER TABLE threads DROP CONSTRAINT IF EXISTS threads_thread_type_check;
ALTER TABLE threads ADD CONSTRAINT threads_thread_type_check
  CHECK (thread_type IN ('negotiation', 'execution', 'development', 'research'));

-- 2. threads.status: 'on_hold' 추가
ALTER TABLE threads DROP CONSTRAINT IF EXISTS threads_status_check;
ALTER TABLE threads ADD CONSTRAINT threads_status_check
  CHECK (status IN ('todo', 'active', 'in_progress', 'done', 'completed', 'on_hold'));
