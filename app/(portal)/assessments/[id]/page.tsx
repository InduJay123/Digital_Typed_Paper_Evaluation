import Link from "next/link";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  Lock,
} from "lucide-react";

import WrittenAnswerForm from "@/components/assessment/WrittenAnswerForm";

import { createClient } from "@/lib/supabase/server";

// ============================================================
// TYPES
// ============================================================

type Question = {
  id: string;

  question_number:
    | string
    | number;

  section:
    | string
    | null;

  question_type:
    | string
    | null;

  question_text: string;

  options?: unknown;

  marks: number;

  order_index?: number;
};

type Assessment = {
  id: string;

  title: string;

  status?: string | null;

  subject_code?:
    | string
    | null;

  subject_name?:
    | string
    | null;

  total_questions?:
    | number
    | null;

  total_marks?:
    | number
    | null;

  content_scope?:
    | string
    | null;
};

type Progress = {
  id?: string;
  assessment_id?: string;

  mcq_status?:
    | string
    | null;

  written_status?:
    | string
    | null;

  overall_status?:
    | string
    | null;

  status?:
    | string
    | null;

  mcq_score?:
    | number
    | null;

  mcq_max_marks?:
    | number
    | null;

  written_score?:
    | number
    | null;

  written_max_marks?:
    | number
    | null;

  total_score?:
    | number
    | null;

  total_max_marks?:
    | number
    | null;

  percentage?:
    | number
    | null;
};

// ============================================================
// UUID
// ============================================================

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ============================================================
// NORMALIZE ASSESSMENT DETAIL
//
// YOUR LIVE RPC RETURNS:
//
// {
//   id,
//   title,
//   status,
//   questions: [...],
//   total_marks,
//   subject_code,
//   subject_name,
//   content_scope,
//   total_questions
// }
//
// This helper also supports older nested formats.
// ============================================================

function normalizeAssessmentDetail(
  raw: any
): {
  assessment:
    | Assessment
    | null;

  questions: Question[];
} {
  if (!raw) {
    return {
      assessment: null,
      questions: [],
    };
  }

  const first =
    Array.isArray(raw)
      ? raw[0]
      : raw;

  if (!first) {
    return {
      assessment: null,
      questions: [],
    };
  }

  // ==========================================================
  // SHAPE:
  // {
  //   data: {
  //      assessment: {},
  //      questions: []
  //   }
  // }
  // ==========================================================

  if (
    first?.data
      ?.assessment
  ) {
    return {
      assessment:
        first.data.assessment,

      questions:
        Array.isArray(
          first.data
            .questions
        )
          ? first.data
              .questions
          : [],
    };
  }

  // ==========================================================
  // SHAPE:
  // {
  //    assessment: {},
  //    questions: []
  // }
  // ==========================================================

  if (
    first?.assessment
  ) {
    return {
      assessment:
        first.assessment,

      questions:
        Array.isArray(
          first.questions
        )
          ? first.questions
          : [],
    };
  }

  // ==========================================================
  // LIVE SHAPE:
  //
  // {
  //   id: "...",
  //   title: "...",
  //   questions: [...]
  // }
  // ==========================================================

  if (
    first?.id &&
    first?.title
  ) {
    const {
      questions:
        questionList,
      ...assessmentData
    } = first;

    return {
      assessment:
        assessmentData as Assessment,

      questions:
        Array.isArray(
          questionList
        )
          ? questionList
          : [],
    };
  }

  return {
    assessment: null,
    questions: [],
  };
}

// ============================================================
// NORMALIZE ATTEMPT ID
// ============================================================

function extractAttemptId(
  raw: any
): string | null {
  if (!raw) {
    return null;
  }

  if (
    typeof raw ===
    "string"
  ) {
    return raw;
  }

  const first =
    Array.isArray(raw)
      ? raw[0]
      : raw;

  const id =
    first?.attempt_id ??
    first?.id ??
    first?.data
      ?.attempt_id ??
    first?.data?.id ??
    null;

  if (!id) {
    return null;
  }

  return String(
    id
  ).trim();
}

// ============================================================
// NORMALIZE ASSESSMENT LIST
// ============================================================

function normalizeAssessmentList(
  raw: any
): Progress[] {
  if (
    Array.isArray(raw)
  ) {
    return raw;
  }

  if (
    Array.isArray(
      raw?.data
    )
  ) {
    return raw.data;
  }

  if (
    Array.isArray(
      raw?.assessments
    )
  ) {
    return raw.assessments;
  }

  if (
    Array.isArray(
      raw?.data
        ?.assessments
    )
  ) {
    return raw.data
      .assessments;
  }

  return [];
}

// ============================================================
// STATUS HELPER
// ============================================================

function normalizeStatus(
  value: unknown
) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
}

// ============================================================
// PAGE
// ============================================================

export default async function AssessmentPage({
  params,
}: {
  params: {
    id: string;
  };
}) {
  const assessmentId =
    String(
      params.id || ""
    ).trim();

  // ==========================================================
  // INVALID ASSESSMENT ID
  // ==========================================================

  if (
    !UUID_RE.test(
      assessmentId
    )
  ) {
    return (
      <main className="content">

        <Link
          href="/assessments"
          className="back-link"
        >
          <ArrowLeft
            size={16}
          />

          Back to assessments
        </Link>

        <div
          className="error-box"
          style={{
            marginTop: 24,
          }}
        >
          <strong>
            Invalid assessment
            link.
          </strong>

          <div
            style={{
              marginTop: 8,
            }}
          >
            {
              assessmentId
            }
          </div>
        </div>

      </main>
    );
  }

  const supabase =
    createClient();

  // ==========================================================
  // LOAD ASSESSMENT
  // ==========================================================

  const {
    data: detailRaw,
    error:
      detailError,
  } =
    await supabase.rpc(
      "rpc_student_get_assessment",
      {
        p_assessment_id:
          assessmentId,
      }
    );

  if (detailError) {
    console.error(
      "rpc_student_get_assessment:",
      detailError
    );

    return (
      <main className="content">

        <Link
          href="/assessments"
          className="back-link"
        >
          <ArrowLeft
            size={16}
          />

          Back to assessments
        </Link>

        <div
          className="error-box"
          style={{
            marginTop: 24,
          }}
        >
          <strong>
            Could not load this
            assessment.
          </strong>

          <div
            style={{
              marginTop: 8,
            }}
          >
            {
              detailError.message
            }
          </div>
        </div>

      </main>
    );
  }

  // ==========================================================
  // NORMALIZE
  // ==========================================================

  const {
    assessment,
    questions,
  } =
    normalizeAssessmentDetail(
      detailRaw
    );

  if (!assessment) {
    console.error(
      "Assessment RPC returned unexpected shape:",
      detailRaw
    );

    return (
      <main className="content">

        <Link
          href="/assessments"
          className="back-link"
        >
          <ArrowLeft
            size={16}
          />

          Back to assessments
        </Link>

        <div
          className="error-box"
          style={{
            marginTop: 24,
          }}
        >
          <strong>
            Assessment data could
            not be loaded.
          </strong>
        </div>

      </main>
    );
  }

  // ==========================================================
  // SORT QUESTIONS
  // ==========================================================

  const sortedQuestions =
    [...questions].sort(
      (a, b) =>
        Number(
          a.order_index ??
            a.question_number ??
            0
        ) -
        Number(
          b.order_index ??
            b.question_number ??
            0
        )
    );

  // ==========================================================
  // QUESTION GROUPS
  // ==========================================================

  const mcqs =
    sortedQuestions.filter(
      (question) => {
        const section =
          normalizeStatus(
            question.section
          ).toUpperCase();

        const type =
          normalizeStatus(
            question.question_type
          );

        return (
          section === "A" ||
          type === "mcq"
        );
      }
    );

  const sectionB =
    sortedQuestions.filter(
      (question) =>
        String(
          question.section ||
            ""
        )
          .trim()
          .toUpperCase() ===
        "B"
    );

  const sectionC =
    sortedQuestions.filter(
      (question) =>
        String(
          question.section ||
            ""
        )
          .trim()
          .toUpperCase() ===
        "C"
    );

  // ==========================================================
  // WRITTEN QUESTIONS Q21-Q35
  //
  // THESE ARE PASSED DIRECTLY TO THE CLIENT FORM.
  // NO STUDENT ANSWER DB AUTOSAVE.
  // ==========================================================

  const writtenQuestions =
    sortedQuestions.filter(
      (question) => {
        const section =
          String(
            question.section ||
              ""
          )
            .trim()
            .toUpperCase();

        return (
          section ===
            "B" ||
          section ===
            "C"
        );
      }
    );

  // ==========================================================
  // GET / CREATE STUDENT ATTEMPT
  // ==========================================================

  const {
    data: attemptRaw,
    error:
      attemptError,
  } =
    await supabase.rpc(
      "rpc_student_get_or_create_attempt",
      {
        p_assessment_id:
          assessmentId,
      }
    );

  if (attemptError) {
    console.error(
      "rpc_student_get_or_create_attempt:",
      attemptError
    );
  }

  const attemptId =
    extractAttemptId(
      attemptRaw
    );

  // ==========================================================
  // LOAD STUDENT PROGRESS
  // ==========================================================

  const {
    data: listRaw,
    error:
      listError,
  } =
    await supabase.rpc(
      "rpc_student_list_assessments"
    );

  if (listError) {
    console.error(
      "rpc_student_list_assessments:",
      listError
    );
  }

  const assessmentList =
    normalizeAssessmentList(
      listRaw
    );

  const progress =
    assessmentList.find(
      (item) =>
        String(
          item.id ??
            item.assessment_id ??
            ""
        ).trim() ===
        assessmentId
    ) ?? null;

  // ==========================================================
  // MCQ STATUS
  // ==========================================================

  const mcqStatus =
    normalizeStatus(
      progress?.mcq_status
    );

  const rawMcqScore =
    progress?.mcq_score;

  const mcqCompleted =
    rawMcqScore !==
      null &&
    rawMcqScore !==
      undefined
      ? true
      : [
          "completed",
          "submitted",
          "mcq_submitted",
          "marked",
        ].includes(
          mcqStatus
        );

  const mcqScore =
    Number(
      rawMcqScore ??
        0
    );

  // ==========================================================
  // FIX OLD 0/0 DISPLAY
  //
  // If DB returns 0 or null for max,
  // this paper still has 20 MCQ marks.
  // ==========================================================

  const rawMcqMax =
    Number(
      progress
        ?.mcq_max_marks ??
        0
    );

  const mcqMax =
    rawMcqMax > 0
      ? rawMcqMax
      : 20;

  // ==========================================================
  // OVERALL STATUS
  // ==========================================================

  const overallStatus =
    normalizeStatus(
      progress
        ?.overall_status ??
        progress?.status
    );

  const fullyMarked =
    [
      "completed",
      "marked",
      "finalized",
    ].includes(
      overallStatus
    );

  // ==========================================================
  // WRITTEN SCORE
  // ==========================================================

  const writtenScore =
    Number(
      progress
        ?.written_score ??
        0
    );

  const rawWrittenMax =
    Number(
      progress
        ?.written_max_marks ??
        0
    );

  const writtenMax =
    rawWrittenMax > 0
      ? rawWrittenMax
      : 80;

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <main className="content">

      {/* ====================================================
          BACK
      ==================================================== */}

      <Link
        href={
          assessment.subject_code
            ? `/assessments?subject=${encodeURIComponent(
                assessment.subject_code
              )}`
            : "/assessments"
        }
        className="back-link"
      >
        <ArrowLeft
          size={16}
        />

        Back to assessments
      </Link>

      <div
        className="assessment-page"
        style={{
          marginTop: 24,
        }}
      >

        {/* ==================================================
            HEADER
        ================================================== */}

        <section className="assessment-page-header">

          <div>

            <div className="eyebrow">
              {assessment.subject_name ||
                assessment.subject_code ||
                "Assessment"}
            </div>

            <h1>
              {
                assessment.title
              }
            </h1>

            <p>
              {assessment.total_questions ??
                sortedQuestions.length}{" "}
              questions ·{" "}
              {assessment.total_marks ??
                100}{" "}
              marks
            </p>

          </div>

          {fullyMarked ? (
            <Link
              href={`/assessments/${assessmentId}/results`}
              className="button"
            >
              View result

              <ArrowRight
                size={16}
              />
            </Link>
          ) : null}

        </section>

        {/* ==================================================
            PAPER STRUCTURE
        ================================================== */}

        <div className="assessment-overview-grid">

          <div className="assessment-summary-card">

            <span>
              Section A
            </span>

            <strong>
              {mcqs.length} MCQs
            </strong>

            <small>
              20 marks
            </small>

          </div>

          <div className="assessment-summary-card">

            <span>
              Section B
            </span>

            <strong>
              {sectionB.length}{" "}
              questions
            </strong>

            <small>
              30 marks
            </small>

          </div>

          <div className="assessment-summary-card">

            <span>
              Section C
            </span>

            <strong>
              {sectionC.length}{" "}
              essays
            </strong>

            <small>
              50 marks
            </small>

          </div>

        </div>

        {/* ==================================================
            SECTION A
        ================================================== */}

        <section className="assessment-action-card">

          <div className="assessment-action-icon">

            {mcqCompleted ? (
              <CheckCircle2
                size={21}
              />
            ) : (
              <FileText
                size={21}
              />
            )}

          </div>

          <div className="assessment-action-content">

            <div className="eyebrow">
              Section A
            </div>

            <h2>
              Multiple choice
            </h2>

            {mcqCompleted ? (
              <p>
                Completed ·{" "}
                {mcqScore}
                {" / "}
                {mcqMax}
              </p>
            ) : (
              <p>
                Complete the 20
                multiple-choice
                questions before
                starting Sections B
                and C.
              </p>
            )}

          </div>

          <Link
            href={
              mcqCompleted
                ? `/assessments/${assessmentId}/quiz/result`
                : `/assessments/${assessmentId}/quiz`
            }
            className="button"
          >
            {mcqCompleted
              ? "View MCQ result"
              : "Start Section A"}

            <ArrowRight
              size={16}
            />
          </Link>

        </section>

        {/* ==================================================
            NO ATTEMPT
        ================================================== */}

        {!attemptId ? (
          <div className="error-box">

            <strong>
              Assessment attempt
              could not be loaded.
            </strong>

            {attemptError ? (
              <div
                style={{
                  marginTop: 8,
                }}
              >
                {
                  attemptError.message
                }
              </div>
            ) : null}

          </div>
        ) : null}

        {/* ==================================================
            COMPLETED ASSESSMENT
        ================================================== */}

        {attemptId &&
        fullyMarked ? (
          <section className="written-entry-card">

            <div>

              <div className="eyebrow">
                Sections B & C
              </div>

              <h2>
                Written section
                completed
              </h2>

              <p>
                Written score:{" "}
                {writtenScore}
                {" / "}
                {writtenMax}
              </p>

            </div>

            <Link
              href={`/assessments/${assessmentId}/results`}
              className="button"
            >
              View full result

              <ArrowRight
                size={16}
              />
            </Link>

          </section>
        ) : null}

        {/* ==================================================
            WRITTEN SECTION LOCKED
        ================================================== */}

        {attemptId &&
        !fullyMarked &&
        !mcqCompleted ? (
          <section className="written-entry-card written-entry-locked">

            <div className="written-lock-icon">

              <Lock
                size={19}
              />

            </div>

            <div>

              <div className="eyebrow">
                Sections B & C
              </div>

              <h2>
                Written answers
              </h2>

              <p>
                Complete Section A
                first. Sections B
                and C will unlock
                after your MCQ
                submission.
              </p>

            </div>

          </section>
        ) : null}

        {/* ==================================================
            DIRECT-TO-N8N WRITTEN FORM
        ================================================== */}

        {attemptId &&
        !fullyMarked &&
        mcqCompleted ? (
          <WrittenAnswerForm
            attemptId={
              attemptId
            }
            assessmentId={
              assessmentId
            }
            questions={
              writtenQuestions
            }
          />
        ) : null}

      </div>

    </main>
  );
}