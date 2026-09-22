# Project structure

```text
cco-student-portal-complete/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── layout.tsx
│   ├── (portal)/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── assessments/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       ├── quiz/page.tsx
│   │   │       ├── quiz/result/page.tsx
│   │   │       └── results/page.tsx
│   │   ├── results/page.tsx
│   │   └── profile/page.tsx
│   ├── api/mark-written-paper/route.ts
│   ├── auth/callback/route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── assessment/PdfUpload.tsx
│   ├── assessment/QuizForm.tsx
│   ├── auth/LoginForm.tsx
│   ├── auth/RegisterForm.tsx
│   ├── LogoutButton.tsx
│   └── ProfileForm.tsx
├── lib/
│   ├── supabase/client.ts
│   ├── supabase/server.ts
│   ├── supabase/middleware.ts
│   └── types.ts
├── supabase/student_portal_v2.sql
├── n8n/CCO_Written_PDF_AI_Marking_Optimized_v3.json
├── UI_REDESIGN_NOTES.md
└── README.md
```
