# Migration from the current CCO student portal

## Recommended: use this package as the new clean frontend

1. Back up your current project folder.
2. Keep your current `.env.local` **privately**; do not commit or send it anywhere.
3. Copy the values into this package's `.env.local` using `.env.example` as the template.
4. Run `supabase/student_portal_v2.sql` once in Supabase SQL Editor.
5. Import `n8n/CCO_Written_PDF_AI_Marking_Optimized_v3.json` or apply the same node changes to your live configured workflow.
6. Configure the n8n project Variables listed in README.
7. Run `npm install` and `npm run dev`.
8. Test in this order:
   - sign in
   - open an assessment
   - submit all 20 MCQs
   - verify immediate MCQ result page
   - continue to written section
   - upload PDF
   - verify marking status page
   - verify final MCQ + Written + Overall result

## Data is not reset

The SQL uses the existing generated assessments and preserves student data. It creates/replaces student RPCs and adds missing columns/indexes where required.

## Do not copy the old `.env.local` into Git

Only `.env.example` belongs in source control. The frontend must never contain the Supabase service-role key or OpenAI key.
