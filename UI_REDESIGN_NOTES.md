# CCO Student Portal — Matte Professional UI v3

## Visual direction

- Matte warm-stone background
- Deep slate/navy navigation
- Muted sage as the main academic accent
- Sand/clay secondary accents
- Thin borders and restrained shadows
- No gradients, glass effects, neon colors, or oversized decorative UI

## Main student routes

- `/dashboard` — overview, current action, recent papers
- `/assessments` — all available papers and progress
- `/results` — dedicated all-results centre
- `/assessments/[id]` — paper overview + written upload
- `/assessments/[id]/quiz` — Section A
- `/assessments/[id]/quiz/result` — immediate MCQ result
- `/assessments/[id]/results` — detailed full result and written feedback
- `/profile` — student profile

## Result model

The UI intentionally separates:

1. Section A MCQ result
2. Sections B & C written result
3. Overall result /100

The dedicated `/results` page gives students one place to revisit every completed result.
