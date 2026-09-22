# Commerce College Online — Complete Student Portal v2

This package is the structured student-facing project for the existing Commerce College Online assessment-generation system.

## Included

- Supabase email/password authentication and student profile
- Dashboard with available / in-progress / completed assessment counts
- Assessment list with MCQ, written and overall progress
- Structured assessment overview
- Section A interactive MCQ quiz
- Immediate MCQ result page after submission
- Per-question MCQ correct/incorrect review without exposing the answer key
- Section B/C written questions
- Private PDF answer upload (25 MB max)
- Next.js server proxy to n8n (no browser CORS issue, n8n URL hidden)
- AI marking status page
- Final overall result page: MCQ / Written / Total
- Written feedback grouped into Section B and Section C
- Supabase SQL with student-safe RPCs + marking service RPCs
- n8n optimized single-PDF-read marking workflow v3
- AI token/cost calculator node in n8n

## Existing dependency

Your assessment-generation schema must already contain:

- `public.generated_assessments`
- `public.generated_assessment_questions`

The student SQL does not recreate those tables.

## 1. Supabase

Run:

```text
supabase/student_portal_v2.sql
```

This is designed as an idempotent upgrade for the existing student portal. It intentionally does not persist the AI handwriting transcription: the original PDF remains in private Storage and `student_written_answer_results` stores marks/feedback only.

## 2. Environment

Copy `.env.example` to `.env.local` and fill in values.

Never put the Supabase service-role key in the Next.js frontend environment.

## 3. n8n

Import:

```text
n8n/CCO_Written_PDF_AI_Marking_Optimized_v3.json
```

Create these n8n project Variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

The workflow uses `/mark-written-pdf` and responds early with `{ "ok": true, "status": "processing" }`, allowing the student browser to move to the results/status page while marking continues.

Activate the workflow, then set `.env.local`:

```env
N8N_MARK_WRITTEN_WEBHOOK_URL=https://YOUR_N8N_DOMAIN/webhook/mark-written-pdf
```

## 4. Install

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Main student flow

```text
Assessments
→ Assessment overview
→ Start Section A
→ Submit MCQs
→ Immediate MCQ result
→ Continue to written section
→ Upload PDF
→ AI marking status
→ Full result (MCQ + Written + Overall)
```

## Routes

- `/login`
- `/register`
- `/dashboard`
- `/assessments`
- `/assessments/[id]`
- `/assessments/[id]/quiz`
- `/assessments/[id]/quiz/result`
- `/assessments/[id]/results`
- `/profile`

## Security

- Browser uses only Supabase anon/public key.
- Hidden `correct_option`, `model_answer`, and `marking_scheme` are never returned by the student assessment RPC.
- MCQ marking happens in a `SECURITY DEFINER` PostgreSQL RPC.
- Written marking context is callable only by `service_role`.
- PDFs are stored in a private `assessment-answers` bucket under `<student-id>/<attempt-id>/...`.
- The Next.js n8n proxy validates that the attempt belongs to the authenticated student.

## Important production note

The supplied `package.json` preserves the Next.js 14.2.30 version from the current portal for compatibility. Before public production deployment, upgrade to a currently patched Next.js release and re-run the build/test suite.


## v3 professional matte redesign

The student portal UI now uses a restrained matte palette (warm stone, deep slate, muted sage, sand and clay), stronger visual hierarchy, clearer progress cards and a dedicated `/results` centre. The frontend remains React through Next.js. Individual MCQ results and full assessment results remain separate so students can understand section performance before the written paper is complete.
