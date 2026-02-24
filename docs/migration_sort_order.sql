-- DHC_PMO: sort_order 컬럼 추가 마이그레이션
-- Supabase > SQL Editor에서 실행

-- 1. projects 테이블에 sort_order 추가
ALTER TABLE projects ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- 2. threads 테이블에 sort_order 추가
ALTER TABLE threads ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- 3. 기존 데이터: created_at 순서대로 sort_order 초기화
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) - 1 AS rn
  FROM projects
)
UPDATE projects SET sort_order = numbered.rn FROM numbered WHERE projects.id = numbered.id;

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at ASC) - 1 AS rn
  FROM threads
)
UPDATE threads SET sort_order = numbered.rn FROM numbered WHERE threads.id = numbered.id;
