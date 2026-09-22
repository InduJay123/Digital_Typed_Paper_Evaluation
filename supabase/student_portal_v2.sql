-- Commerce College Online — Student Portal v2
-- Structured MCQ result + written AI marking + overall result.
-- Requires existing public.generated_assessments and public.generated_assessment_questions.
-- Safe to run on the current project: CREATE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS + CREATE OR REPLACE RPCs.

create extension if not exists pgcrypto;

-- ---------- Profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "Students read own profile" on public.profiles;
create policy "Students read own profile" on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists "Students update own profile" on public.profiles;
create policy "Students update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
grant select, update on public.profiles to authenticated;

create or replace function public.cco_handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,display_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',split_part(coalesce(new.email,''),'@',1))) on conflict(id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created_cco on auth.users;
create trigger on_auth_user_created_cco after insert on auth.users for each row execute function public.cco_handle_new_user();

-- Backfill profiles for users that existed before this script.
insert into public.profiles(id,display_name)
select id,coalesce(raw_user_meta_data->>'full_name',split_part(coalesce(email,''),'@',1)) from auth.users
on conflict(id) do nothing;

-- ---------- Attempts ----------
create table if not exists public.student_assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.generated_assessments(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'in_progress',
  mcq_score numeric not null default 0,
  mcq_max_marks numeric not null default 0,
  written_score numeric not null default 0,
  written_max_marks numeric not null default 0,
  total_score numeric not null default 0,
  total_max_marks numeric not null default 0,
  percentage numeric not null default 0,
  started_at timestamptz not null default now(),
  mcq_submitted_at timestamptz,
  written_uploaded_at timestamptz,
  submitted_at timestamptz,
  marked_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.student_assessment_attempts add column if not exists error_message text;
alter table public.student_assessment_attempts add column if not exists marked_at timestamptz;
alter table public.student_assessment_attempts add column if not exists updated_at timestamptz not null default now();
create index if not exists student_attempt_student_assessment_idx on public.student_assessment_attempts(student_id,assessment_id,created_at desc);
alter table public.student_assessment_attempts enable row level security;
drop policy if exists "Students read own attempts" on public.student_assessment_attempts;
create policy "Students read own attempts" on public.student_assessment_attempts for select to authenticated using(student_id=auth.uid());
grant select on public.student_assessment_attempts to authenticated;

-- ---------- MCQ answers ----------
create table if not exists public.student_mcq_answers (
 id uuid primary key default gen_random_uuid(),
 attempt_id uuid not null references public.student_assessment_attempts(id) on delete cascade,
 question_id uuid not null references public.generated_assessment_questions(id) on delete cascade,
 selected_option text,
 is_correct boolean not null default false,
 awarded_marks numeric not null default 0,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(attempt_id,question_id)
);
alter table public.student_mcq_answers enable row level security;
drop policy if exists "Students read own mcq answers" on public.student_mcq_answers;
create policy "Students read own mcq answers" on public.student_mcq_answers for select to authenticated using(exists(select 1 from public.student_assessment_attempts a where a.id=attempt_id and a.student_id=auth.uid()));
grant select on public.student_mcq_answers to authenticated;

-- ---------- PDF uploads ----------
create table if not exists public.student_answer_uploads (
 id uuid primary key default gen_random_uuid(),
 attempt_id uuid not null references public.student_assessment_attempts(id) on delete cascade,
 assessment_id uuid not null references public.generated_assessments(id) on delete cascade,
 student_id uuid not null references auth.users(id) on delete cascade,
 storage_bucket text not null default 'assessment-answers',
 storage_path text not null,
 original_file_name text,
 mime_type text not null default 'application/pdf',
 file_size_bytes bigint,
 status text default 'uploaded',
 quality_report jsonb,
 uploaded_at timestamptz not null default now(),
 processed_at timestamptz,
 quality_status text not null default 'pending',
 processing_status text not null default 'uploaded',
 error_message text,
 updated_at timestamptz not null default now()
);
alter table public.student_answer_uploads add column if not exists quality_status text not null default 'pending';
alter table public.student_answer_uploads add column if not exists processing_status text not null default 'uploaded';
alter table public.student_answer_uploads add column if not exists error_message text;
alter table public.student_answer_uploads add column if not exists updated_at timestamptz not null default now();
alter table public.student_answer_uploads enable row level security;
drop policy if exists "Students read own uploads" on public.student_answer_uploads;
create policy "Students read own uploads" on public.student_answer_uploads for select to authenticated using(student_id=auth.uid());
grant select on public.student_answer_uploads to authenticated;

-- ---------- Written MARKING results only (student transcription is not persisted) ----------
create table if not exists public.student_written_answer_results (
 id uuid primary key default gen_random_uuid(),
 attempt_id uuid not null references public.student_assessment_attempts(id) on delete cascade,
 upload_id uuid references public.student_answer_uploads(id) on delete set null,
 question_id uuid not null references public.generated_assessment_questions(id) on delete cascade,
 question_number text,
 awarded_marks numeric not null default 0,
 max_marks numeric not null default 0,
 feedback text not null default '',
 marking_confidence numeric not null default 0,
 needs_review boolean not null default false,
 matched_marking_points jsonb not null default '[]'::jsonb,
 level_awarded text not null default '',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.student_written_answer_results add column if not exists upload_id uuid references public.student_answer_uploads(id) on delete set null;
alter table public.student_written_answer_results add column if not exists question_number text;
alter table public.student_written_answer_results add column if not exists awarded_marks numeric not null default 0;
alter table public.student_written_answer_results add column if not exists max_marks numeric not null default 0;
alter table public.student_written_answer_results add column if not exists feedback text not null default '';
alter table public.student_written_answer_results add column if not exists marking_confidence numeric not null default 0;
alter table public.student_written_answer_results add column if not exists needs_review boolean not null default false;
alter table public.student_written_answer_results add column if not exists matched_marking_points jsonb not null default '[]'::jsonb;
alter table public.student_written_answer_results add column if not exists level_awarded text not null default '';
alter table public.student_written_answer_results add column if not exists updated_at timestamptz not null default now();
create unique index if not exists student_written_attempt_question_uidx on public.student_written_answer_results(attempt_id,question_id);
alter table public.student_written_answer_results enable row level security;
drop policy if exists "Students read own written results" on public.student_written_answer_results;
create policy "Students read own written results" on public.student_written_answer_results for select to authenticated using(exists(select 1 from public.student_assessment_attempts a where a.id=attempt_id and a.student_id=auth.uid()));
grant select on public.student_written_answer_results to authenticated;

-- ---------- Storage ----------
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('assessment-answers','assessment-answers',false,26214400,array['application/pdf']::text[])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "Students upload own answer PDFs" on storage.objects;
create policy "Students upload own answer PDFs" on storage.objects for insert to authenticated with check(bucket_id='assessment-answers' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "Students read own answer PDFs" on storage.objects;
create policy "Students read own answer PDFs" on storage.objects for select to authenticated using(bucket_id='assessment-answers' and (storage.foldername(name))[1]=auth.uid()::text);

-- Do not let the browser query hidden answer-key rows directly.
revoke all on public.generated_assessment_questions from anon, authenticated;

-- ---------- Student: assessment list with progress ----------
create or replace function public.rpc_student_list_assessments() returns jsonb language sql stable security definer set search_path=public as $$
select coalesce(jsonb_agg(jsonb_build_object(
 'id',ga.id,'title',ga.title,'subject_code',ga.subject_code,'subject_name',ga.subject_name,'total_questions',ga.total_questions,'total_marks',ga.total_marks,
 'attempt_id',a.id,'attempt_status',a.status,
 'mcq_score',coalesce(a.mcq_score,0),'mcq_max_marks',coalesce(a.mcq_max_marks,0),
 'written_score',coalesce(a.written_score,0),'written_max_marks',coalesce(a.written_max_marks,0),
 'total_score',coalesce(a.total_score,0),'total_max_marks',coalesce(a.total_max_marks,0),'percentage',coalesce(a.percentage,0),
 'mcq_status',case when a.mcq_submitted_at is not null or a.status in('mcq_submitted','written_uploaded','processing','reupload_required','review_required','marked') then 'completed' else 'not_started' end,
 'written_status',case when a.status in('marked','review_required') then 'completed' when a.status='reupload_required' then 'reupload_required' when u.processing_status in('uploaded','quality_checking','extracting','marking') or a.status in('written_uploaded','processing') then 'processing' else 'not_submitted' end,
 'overall_status',case when a.status in('marked','review_required') then 'completed' when a.id is null then 'not_started' else 'in_progress' end
) order by ga.created_at desc),'[]'::jsonb)
from public.generated_assessments ga
left join lateral (select * from public.student_assessment_attempts x where x.assessment_id=ga.id and x.student_id=auth.uid() order by x.created_at desc limit 1) a on true
left join lateral (select * from public.student_answer_uploads x where x.attempt_id=a.id order by x.uploaded_at desc limit 1) u on true
where ga.status in('ready','published'); $$;

-- ---------- Student: safe paper detail ----------
create or replace function public.rpc_student_get_assessment_detail(p_assessment_id uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_student uuid:=auth.uid(); v_a public.generated_assessments%rowtype; v_attempt public.student_assessment_attempts%rowtype; v_upload public.student_answer_uploads%rowtype; v_questions jsonb;
begin
 if v_student is null then raise exception 'Authentication required'; end if;
 select * into v_a from public.generated_assessments where id=p_assessment_id and status in('ready','published'); if not found then return jsonb_build_object('ok',false); end if;
 select * into v_attempt from public.student_assessment_attempts where assessment_id=p_assessment_id and student_id=v_student order by created_at desc limit 1;
 if v_attempt.id is not null then select * into v_upload from public.student_answer_uploads where attempt_id=v_attempt.id order by uploaded_at desc limit 1; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'order_index',q.order_index,'question_number',q.question_number,'section',q.section,'question_type',q.question_type,'question_text',q.question_text,'options',case when q.question_type='mcq' then q.options else null end,'marks',q.marks) order by q.order_index),'[]'::jsonb) into v_questions from public.generated_assessment_questions q where q.assessment_id=p_assessment_id;
 return jsonb_build_object('ok',true,
  'assessment',jsonb_build_object('id',v_a.id,'title',v_a.title,'subject_code',v_a.subject_code,'subject_name',v_a.subject_name,'total_questions',v_a.total_questions,'total_marks',v_a.total_marks,'status',v_a.status),
  'questions',v_questions,
  'attempt',case when v_attempt.id is null then null else jsonb_build_object('id',v_attempt.id,'status',v_attempt.status,'mcq_score',v_attempt.mcq_score,'mcq_max_marks',v_attempt.mcq_max_marks,'written_score',v_attempt.written_score,'written_max_marks',v_attempt.written_max_marks,'total_score',v_attempt.total_score,'total_max_marks',v_attempt.total_max_marks,'percentage',v_attempt.percentage) end,
  'latest_upload',case when v_upload.id is null then null else jsonb_build_object('id',v_upload.id,'processing_status',v_upload.processing_status,'quality_status',v_upload.quality_status,'original_file_name',v_upload.original_file_name,'uploaded_at',v_upload.uploaded_at) end,
  'progress',jsonb_build_object(
   'mcq_status',case when v_attempt.id is not null and (v_attempt.mcq_submitted_at is not null or v_attempt.status in('mcq_submitted','written_uploaded','processing','reupload_required','review_required','marked')) then 'completed' else 'not_started' end,
   'written_status',case when v_attempt.status in('marked','review_required') then 'completed' when v_attempt.status='reupload_required' then 'reupload_required' when v_upload.processing_status in('uploaded','quality_checking','extracting','marking') or v_attempt.status in('written_uploaded','processing') then 'processing' else 'not_submitted' end,
   'overall_status',case when v_attempt.status in('marked','review_required') then 'completed' when v_attempt.id is null then 'not_started' else 'in_progress' end));
end; $$;

-- ---------- Student: get/create one active attempt ----------
create or replace function public.rpc_student_get_or_create_attempt(p_assessment_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_student uuid:=auth.uid(); v_attempt public.student_assessment_attempts%rowtype; v_total numeric;
begin
 if v_student is null then raise exception 'Authentication required'; end if;
 if not exists(select 1 from public.generated_assessments where id=p_assessment_id and status in('ready','published')) then raise exception 'Assessment not found'; end if;
 select * into v_attempt from public.student_assessment_attempts where assessment_id=p_assessment_id and student_id=v_student order by created_at desc limit 1;
 if v_attempt.id is null then select coalesce(sum(marks),0) into v_total from public.generated_assessment_questions where assessment_id=p_assessment_id; insert into public.student_assessment_attempts(assessment_id,student_id,status,total_max_marks) values(p_assessment_id,v_student,'in_progress',v_total) returning * into v_attempt; end if;
 return jsonb_build_object('ok',true,'attempt_id',v_attempt.id,'assessment_id',v_attempt.assessment_id,'status',v_attempt.status);
end; $$;

-- ---------- Student: submit MCQ once ----------
create or replace function public.rpc_student_submit_mcq(p_attempt_id uuid,p_answers jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_student uuid:=auth.uid(); v_attempt public.student_assessment_attempts%rowtype; v_item jsonb; v_q public.generated_assessment_questions%rowtype; v_sel text; v_score numeric; v_max numeric; v_count int; v_total int;
begin
 if v_student is null then raise exception 'Authentication required'; end if;
 select * into v_attempt from public.student_assessment_attempts where id=p_attempt_id for update; if not found or v_attempt.student_id<>v_student then raise exception 'Attempt not found'; end if;
 if v_attempt.mcq_submitted_at is not null or v_attempt.status in('mcq_submitted','written_uploaded','processing','reupload_required','review_required','marked') then raise exception 'MCQ has already been submitted'; end if;
 if jsonb_typeof(p_answers)<>'array' then raise exception 'p_answers must be an array'; end if;
 select count(*) into v_total from public.generated_assessment_questions where assessment_id=v_attempt.assessment_id and question_type='mcq'; if jsonb_array_length(p_answers)<>v_total then raise exception 'All MCQ questions must be answered'; end if;
 for v_item in select * from jsonb_array_elements(p_answers) loop
  select * into v_q from public.generated_assessment_questions where id=(v_item->>'question_id')::uuid and assessment_id=v_attempt.assessment_id and question_type='mcq'; if not found then raise exception 'Invalid question'; end if;
  v_sel:=upper(trim(coalesce(v_item->>'selected_option',''))); if v_sel not in('A','B','C','D') then raise exception 'Invalid option'; end if;
  insert into public.student_mcq_answers(attempt_id,question_id,selected_option,is_correct,awarded_marks) values(p_attempt_id,v_q.id,v_sel,v_sel=upper(trim(v_q.correct_option)),case when v_sel=upper(trim(v_q.correct_option)) then v_q.marks else 0 end)
  on conflict(attempt_id,question_id) do update set selected_option=excluded.selected_option,is_correct=excluded.is_correct,awarded_marks=excluded.awarded_marks,updated_at=now();
 end loop;
 select coalesce(sum(a.awarded_marks),0),count(*) into v_score,v_count from public.student_mcq_answers a join public.generated_assessment_questions q on q.id=a.question_id where a.attempt_id=p_attempt_id and q.question_type='mcq';
 select coalesce(sum(marks),0) into v_max from public.generated_assessment_questions where assessment_id=v_attempt.assessment_id and question_type='mcq';
 update public.student_assessment_attempts set mcq_score=v_score,mcq_max_marks=v_max,status='mcq_submitted',mcq_submitted_at=now(),updated_at=now() where id=p_attempt_id;
 return jsonb_build_object('ok',true,'attempt_id',p_attempt_id,'score',v_score,'max_score',v_max,'percentage',case when v_max>0 then round(v_score/v_max*100,2) else 0 end,'answered',v_count,'total_mcq_questions',v_total);
end; $$;

-- ---------- Student: MCQ result (no answer key exposed) ----------
create or replace function public.rpc_student_get_mcq_result(p_assessment_id uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_student uuid:=auth.uid(); v_a public.student_assessment_attempts%rowtype; v_questions jsonb; v_correct int; v_incorrect int; v_total int;
begin
 select * into v_a from public.student_assessment_attempts where assessment_id=p_assessment_id and student_id=v_student order by created_at desc limit 1;
 if v_a.id is null or v_a.mcq_submitted_at is null then return jsonb_build_object('ok',false,'status','not_submitted'); end if;
 select count(*) filter(where a.is_correct),count(*) filter(where not a.is_correct),count(*) into v_correct,v_incorrect,v_total from public.student_mcq_answers a where a.attempt_id=v_a.id;
 select coalesce(jsonb_agg(jsonb_build_object('question_id',q.id,'question_number',q.question_number,'question_text',q.question_text,'selected_option',a.selected_option,'is_correct',a.is_correct,'awarded_marks',a.awarded_marks,'max_marks',q.marks) order by q.order_index),'[]'::jsonb) into v_questions from public.student_mcq_answers a join public.generated_assessment_questions q on q.id=a.question_id where a.attempt_id=v_a.id;
 return jsonb_build_object('ok',true,'attempt_id',v_a.id,'score',v_a.mcq_score,'max_score',v_a.mcq_max_marks,'percentage',case when v_a.mcq_max_marks>0 then round(v_a.mcq_score/v_a.mcq_max_marks*100,2) else 0 end,'correct_count',v_correct,'incorrect_count',v_incorrect,'answered_count',v_total,'total_questions',v_total,'questions',v_questions,'overall_status',case when v_a.status in('marked','review_required') then 'completed' else 'pending' end,'total_score',v_a.total_score,'total_max_marks',v_a.total_max_marks,'total_percentage',v_a.percentage);
end; $$;

-- ---------- Student: register uploaded PDF ----------
create or replace function public.rpc_student_register_answer_upload(p_attempt_id uuid,p_storage_path text,p_original_file_name text default null,p_mime_type text default 'application/pdf',p_file_size_bytes bigint default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_student uuid:=auth.uid(); v_a public.student_assessment_attempts%rowtype; v_upload uuid;
begin
 select * into v_a from public.student_assessment_attempts where id=p_attempt_id; if not found or v_a.student_id<>v_student then raise exception 'Attempt not found'; end if;
 if p_mime_type<>'application/pdf' then raise exception 'Only PDF is allowed'; end if; if p_file_size_bytes is not null and p_file_size_bytes>26214400 then raise exception 'PDF exceeds 25 MB'; end if;
 if position(v_student::text||'/' in p_storage_path)<>1 then raise exception 'Invalid storage path'; end if;
 insert into public.student_answer_uploads(attempt_id,assessment_id,student_id,storage_path,original_file_name,mime_type,file_size_bytes,quality_status,processing_status) values(v_a.id,v_a.assessment_id,v_student,p_storage_path,p_original_file_name,p_mime_type,p_file_size_bytes,'pending','uploaded') returning id into v_upload;
 update public.student_assessment_attempts set status='written_uploaded',written_uploaded_at=now(),updated_at=now() where id=v_a.id;
 return jsonb_build_object('ok',true,'upload_id',v_upload,'attempt_id',v_a.id,'assessment_id',v_a.assessment_id,'processing_status','uploaded');
end; $$;

-- ---------- Student: combined result ----------
create or replace function public.rpc_student_get_results(p_assessment_id uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_student uuid:=auth.uid(); v_a public.student_assessment_attempts%rowtype; v_ga public.generated_assessments%rowtype; v_u public.student_answer_uploads%rowtype; v_written jsonb:='[]'::jsonb;
begin
 if v_student is null then raise exception 'Authentication required'; end if;
 select * into v_a from public.student_assessment_attempts where assessment_id=p_assessment_id and student_id=v_student order by created_at desc limit 1; if v_a.id is null then return jsonb_build_object('ok',false,'status','not_started'); end if;
 select * into v_ga from public.generated_assessments where id=p_assessment_id;
 select * into v_u from public.student_answer_uploads where attempt_id=v_a.id order by uploaded_at desc limit 1;
 if v_a.status in('marked','review_required') then select coalesce(jsonb_agg(jsonb_build_object('question_id',q.id,'question_number',q.question_number,'question_text',q.question_text,'question_type',q.question_type,'awarded_marks',r.awarded_marks,'max_marks',r.max_marks,'feedback',r.feedback,'marking_confidence',r.marking_confidence,'needs_review',r.needs_review,'level_awarded',r.level_awarded) order by q.order_index),'[]'::jsonb) into v_written from public.student_written_answer_results r join public.generated_assessment_questions q on q.id=r.question_id where r.attempt_id=v_a.id; end if;
 return jsonb_build_object('ok',true,'attempt_id',v_a.id,'assessment_id',v_a.assessment_id,'title',v_ga.title,'subject_name',v_ga.subject_name,'status',v_a.status,'processing_status',coalesce(v_u.processing_status,'not_uploaded'),'quality_status',coalesce(v_u.quality_status,'pending'),'summary',jsonb_build_object('mcq_score',v_a.mcq_score,'mcq_max_marks',v_a.mcq_max_marks,'written_score',v_a.written_score,'written_max_marks',v_a.written_max_marks,'total_score',v_a.total_score,'total_max_marks',v_a.total_max_marks,'percentage',v_a.percentage,'needs_review',v_a.status='review_required'),'written_results',v_written);
end; $$;

-- ---------- n8n/service-role: exact paper + hidden scheme ----------
create or replace function public.rpc_marking_get_context(p_attempt_id uuid,p_upload_id uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_result jsonb;
begin
 select jsonb_build_object('attempt',jsonb_build_object('id',a.id,'assessment_id',a.assessment_id,'student_id',a.student_id,'status',a.status,'mcq_score',a.mcq_score,'mcq_max_marks',a.mcq_max_marks),'upload',jsonb_build_object('id',u.id,'storage_bucket',u.storage_bucket,'storage_path',u.storage_path,'original_file_name',u.original_file_name,'mime_type',u.mime_type,'file_size_bytes',u.file_size_bytes,'processing_status',u.processing_status),'assessment',jsonb_build_object('id',ga.id,'title',ga.title,'subject_code',ga.subject_code,'subject_name',ga.subject_name,'total_marks',ga.total_marks),'written_questions',coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'order_index',q.order_index,'question_number',q.question_number,'section',q.section,'question_type',q.question_type,'question_text',q.question_text,'marks',q.marks,'model_answer',q.model_answer,'marking_scheme',q.marking_scheme) order by q.order_index) from public.generated_assessment_questions q where q.assessment_id=ga.id and q.question_type<>'mcq'),'[]'::jsonb)) into v_result from public.student_assessment_attempts a join public.student_answer_uploads u on u.attempt_id=a.id and u.id=p_upload_id join public.generated_assessments ga on ga.id=a.assessment_id where a.id=p_attempt_id;
 if v_result is null then raise exception 'Attempt/upload context not found'; end if; return v_result;
end; $$;

create or replace function public.rpc_marking_update_upload_status(p_upload_id uuid,p_processing_status text,p_quality_status text default null,p_quality_report jsonb default null,p_error_message text default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_attempt uuid;
begin
 update public.student_answer_uploads set processing_status=p_processing_status,quality_status=coalesce(p_quality_status,quality_status),quality_report=coalesce(p_quality_report,quality_report),error_message=p_error_message,processed_at=case when p_processing_status in('marked','reupload_required','failed') then now() else processed_at end,updated_at=now() where id=p_upload_id returning attempt_id into v_attempt; if v_attempt is null then raise exception 'Upload not found'; end if;
 if p_processing_status in('quality_checking','extracting','marking') then update public.student_assessment_attempts set status='processing',error_message=null,updated_at=now() where id=v_attempt and status not in('marked','review_required'); elsif p_processing_status='reupload_required' then update public.student_assessment_attempts set status='reupload_required',updated_at=now() where id=v_attempt; elsif p_processing_status='failed' then update public.student_assessment_attempts set status='failed',error_message=p_error_message,updated_at=now() where id=v_attempt; end if;
 return jsonb_build_object('ok',true,'upload_id',p_upload_id,'attempt_id',v_attempt,'processing_status',p_processing_status,'quality_status',coalesce(p_quality_status,'unchanged'));
end; $$;

-- Only marks/feedback are persisted. Extracted handwriting remains temporary in n8n.
create or replace function public.rpc_marking_save_written_results(p_attempt_id uuid,p_upload_id uuid,p_results jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_a public.student_assessment_attempts%rowtype; v_item jsonb; v_q public.generated_assessment_questions%rowtype; v_awarded numeric; v_conf numeric; v_count int:=0;
begin
 select * into v_a from public.student_assessment_attempts where id=p_attempt_id; if not found then raise exception 'Attempt not found'; end if;
 if not exists(select 1 from public.student_answer_uploads where id=p_upload_id and attempt_id=p_attempt_id) then raise exception 'Upload does not belong to attempt'; end if; if jsonb_typeof(p_results)<>'array' then raise exception 'p_results must be an array'; end if;
 for v_item in select * from jsonb_array_elements(p_results) loop
  select * into v_q from public.generated_assessment_questions where id=(v_item->>'question_id')::uuid and assessment_id=v_a.assessment_id and question_type<>'mcq'; if not found then raise exception 'Invalid written question'; end if;
  v_awarded:=greatest(0,least(coalesce((v_item->>'awarded_marks')::numeric,0),v_q.marks)); v_conf:=greatest(0,least(coalesce((v_item->>'marking_confidence')::numeric,0),1));
  insert into public.student_written_answer_results(attempt_id,upload_id,question_id,question_number,awarded_marks,max_marks,feedback,marking_confidence,needs_review,matched_marking_points,level_awarded)
  values(p_attempt_id,p_upload_id,v_q.id,v_q.question_number,v_awarded,v_q.marks,coalesce(v_item->>'feedback',''),v_conf,coalesce((v_item->>'needs_review')::boolean,false),coalesce(v_item->'matched_marking_points','[]'::jsonb),coalesce(v_item->>'level_awarded',''))
  on conflict(attempt_id,question_id) do update set upload_id=excluded.upload_id,question_number=excluded.question_number,awarded_marks=excluded.awarded_marks,max_marks=excluded.max_marks,feedback=excluded.feedback,marking_confidence=excluded.marking_confidence,needs_review=excluded.needs_review,matched_marking_points=excluded.matched_marking_points,level_awarded=excluded.level_awarded,updated_at=now(); v_count:=v_count+1;
 end loop;
 update public.student_answer_uploads set processing_status='marked',processed_at=now(),updated_at=now() where id=p_upload_id;
 return jsonb_build_object('ok',true,'saved_results',v_count);
end; $$;

create or replace function public.rpc_marking_finalize_attempt(p_attempt_id uuid,p_upload_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_a public.student_assessment_attempts%rowtype; v_expected int; v_saved int; v_written numeric; v_written_max numeric; v_mcq_max numeric; v_total numeric; v_total_max numeric; v_pct numeric; v_review boolean; v_status text;
begin
 select * into v_a from public.student_assessment_attempts where id=p_attempt_id for update; if not found then raise exception 'Attempt not found'; end if;
 select count(*),coalesce(sum(marks),0) into v_expected,v_written_max from public.generated_assessment_questions where assessment_id=v_a.assessment_id and question_type<>'mcq';
 select count(*),coalesce(sum(awarded_marks),0),coalesce(bool_or(needs_review),false) into v_saved,v_written,v_review from public.student_written_answer_results where attempt_id=p_attempt_id; if v_saved<>v_expected then raise exception 'Cannot finalize: % of % written questions have results',v_saved,v_expected; end if;
 select coalesce(sum(marks),0) into v_mcq_max from public.generated_assessment_questions where assessment_id=v_a.assessment_id and question_type='mcq'; v_total:=coalesce(v_a.mcq_score,0)+v_written; v_total_max:=v_mcq_max+v_written_max; v_pct:=case when v_total_max>0 then round(v_total/v_total_max*100,2) else 0 end; v_status:=case when v_review then 'review_required' else 'marked' end;
 update public.student_assessment_attempts set status=v_status,mcq_max_marks=v_mcq_max,written_score=v_written,written_max_marks=v_written_max,total_score=v_total,total_max_marks=v_total_max,percentage=v_pct,marked_at=now(),error_message=null,updated_at=now() where id=p_attempt_id;
 update public.student_answer_uploads set processing_status='marked',processed_at=now(),updated_at=now() where id=p_upload_id;
 return jsonb_build_object('ok',true,'attempt_id',p_attempt_id,'status',v_status,'mcq_score',coalesce(v_a.mcq_score,0),'mcq_max_marks',v_mcq_max,'written_score',v_written,'written_max_marks',v_written_max,'total_score',v_total,'total_max_marks',v_total_max,'percentage',v_pct,'needs_review',v_review);
end; $$;

-- ---------- Grants ----------
revoke all on function public.rpc_student_list_assessments() from public,anon;
revoke all on function public.rpc_student_get_assessment_detail(uuid) from public,anon;
revoke all on function public.rpc_student_get_or_create_attempt(uuid) from public,anon;
revoke all on function public.rpc_student_submit_mcq(uuid,jsonb) from public,anon;
revoke all on function public.rpc_student_get_mcq_result(uuid) from public,anon;
revoke all on function public.rpc_student_register_answer_upload(uuid,text,text,text,bigint) from public,anon;
revoke all on function public.rpc_student_get_results(uuid) from public,anon;
grant execute on function public.rpc_student_list_assessments() to authenticated;
grant execute on function public.rpc_student_get_assessment_detail(uuid) to authenticated;
grant execute on function public.rpc_student_get_or_create_attempt(uuid) to authenticated;
grant execute on function public.rpc_student_submit_mcq(uuid,jsonb) to authenticated;
grant execute on function public.rpc_student_get_mcq_result(uuid) to authenticated;
grant execute on function public.rpc_student_register_answer_upload(uuid,text,text,text,bigint) to authenticated;
grant execute on function public.rpc_student_get_results(uuid) to authenticated;

revoke all on function public.rpc_marking_get_context(uuid,uuid) from public,anon,authenticated;
revoke all on function public.rpc_marking_update_upload_status(uuid,text,text,jsonb,text) from public,anon,authenticated;
revoke all on function public.rpc_marking_save_written_results(uuid,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.rpc_marking_finalize_attempt(uuid,uuid) from public,anon,authenticated;
grant execute on function public.rpc_marking_get_context(uuid,uuid) to service_role;
grant execute on function public.rpc_marking_update_upload_status(uuid,text,text,jsonb,text) to service_role;
grant execute on function public.rpc_marking_save_written_results(uuid,uuid,jsonb) to service_role;
grant execute on function public.rpc_marking_finalize_attempt(uuid,uuid) to service_role;

notify pgrst,'reload schema';
