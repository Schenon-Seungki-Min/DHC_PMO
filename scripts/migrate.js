/**
 * 1회 실행 마이그레이션 스크립트: data.json → Supabase
 *
 * 실행 방법:
 *   node scripts/migrate.js
 *
 * 전제조건:
 *   1. .env 파일에 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 설정
 *   2. Supabase SQL Editor에서 스키마 먼저 생성 (docs/schema.sql 참고)
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DATA_FILE = path.join(__dirname, '../data/data.json');

async function upsert(table, rows, label) {
  if (!rows || rows.length === 0) {
    console.log(`  [SKIP] ${label}: 0 rows`);
    return;
  }
  const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
  if (error) {
    console.error(`  [ERROR] ${label}:`, error.message);
    throw error;
  }
  console.log(`  [OK] ${label}: ${rows.length} rows`);
}

async function run() {
  console.log('📦 DHC_PMO Migration: data.json → Supabase\n');

  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  const data = JSON.parse(raw);

  // 1. Projects
  await upsert('projects', data.projects, 'projects');

  // 2. Team Members
  const members = (data.team_members || []).map(m => ({
    id: m.id,
    name: m.name,
    role: m.role,
    color: m.color || '#374151',
    is_active: m.is_active !== false
  }));
  await upsert('team_members', members, 'team_members');

  // 3. Thread Templates
  await upsert('thread_templates', data.thread_templates || [], 'thread_templates');

  // 4. Threads
  const threads = (data.threads || []).map(t => ({
    id: t.id,
    project_id: t.project_id,
    title: t.title,
    thread_type: t.thread_type || 'execution',
    start_date: t.start_date || null,
    due_date: t.due_date || null,
    status: t.status || 'in_progress',
    outcome_goal: t.outcome_goal || null,
    stakeholder_text: t.stakeholder_text || ''
  }));
  await upsert('threads', threads, 'threads');

  // 5. Tasks (assigned_to → assignee_id 통일)
  const tasks = (data.tasks || []).map(t => ({
    id: t.id,
    thread_id: t.thread_id,
    title: t.title,
    assignee_id: t.assignee_id || t.assigned_to || null,
    start_date: t.start_date || null,
    due_date: t.due_date || null,
    status: t.status || 'todo',
    priority: t.priority || 'medium',
    notes: t.notes || ''
  }));
  await upsert('tasks', tasks, 'tasks');

  // 6. Thread Assignments
  const assignments = (data.thread_assignments || []).map(a => ({
    id: a.id,
    thread_id: a.thread_id,
    member_id: a.member_id,
    role: a.role || 'lead',
    grabbed_at: a.grabbed_at || new Date().toISOString(),
    released_at: a.released_at || null,
    note: a.note || ''
  }));
  await upsert('thread_assignments', assignments, 'thread_assignments');

  // 7. Template Tasks
  await upsert('template_tasks', data.template_tasks || [], 'template_tasks');

  console.log('\n✅ Migration complete!');
}

run().catch(err => {
  console.error('\n❌ Migration failed:', err.message);
  process.exit(1);
});
