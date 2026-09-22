import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ListChecks,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import QuizForm from "@/components/assessment/QuizForm";
import type { SafeQuestion } from "@/lib/types";

// ============================================================
// TYPES
// ============================================================

type Assessment = {
  id: string;
  title: string;
  subject_code?: string | null;
  subject_name?: string | null;
  total_questions?: number | null;
  total_marks?: number | null;
  status?: string | null;
};

type AssessmentDetailResponse = {
  ok?: boolean;

  data?: {
    assessment?: Assessment;
    questions?: SafeQuestion[];
  };

  assessment?: Assessment;
  questions?: SafeQuestion[];

  error?: string;
  message?: string;
};

type AssessmentProgress = {
  id?: string;
  assessment_id?: string;

  attempt_id?: string | null;
  attempt_status?: string | null;

  mcq_score?: number;
  mcq_max_marks?: number;

  mcq_status?: string;
  written_status?: string;
  overall_status?: string;
};

type AttemptResponse = {
  ok?: boolean;

  attempt_id?: string;
  id?: string;

  assessment_id?: string;
  status?: string;

  data?: {
    attempt_id?: string;
    id?: string;
    assessment_id?: string;
    status?: string;
  };
};

// ============================================================
// PAGE
// ============================================================

export default async function QuizPage({
  params,
}: {
  params: {
    id: string;
  };
}) {
  const id = params.id;

  const supabase = createClient();

  // ==========================================================
  // 1. LOAD ASSESSMENT
  // ==========================================================

  const {
    data: detailRpcData,
    error: detailRpcError,
  } = await supabase.rpc(
    "rpc_student_get_assessment_detail",
    {
      p_assessment_id: id,
    }
  );

  if (detailRpcError) {
    return (
      <main className="content">
        <div className="error-box">
          <strong>
            Could not load Section A.
          </strong>

          <div
            style={{
              marginTop: 6,
            }}
          >
            {detailRpcError.message}
          </div>

          <div
            style={{
              marginTop: 18,
            }}
          >
            <Link
              className="button secondary"
              href="/assessments"
            >
              Back to assessments
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const rawDetail = (
    Array.isArray(detailRpcData)
      ? detailRpcData[0]
      : detailRpcData
  ) as AssessmentDetailResponse | null;

  // ==========================================================
  // SUPPORT BOTH RPC RESPONSE FORMATS
  //
  // New:
  //
  // {
  //   ok: true,
  //   data: {
  //     assessment: {...},
  //     questions: [...]
  //   }
  // }
  //
  // Old:
  //
  // {
  //   ok: true,
  //   assessment: {...},
  //   questions: [...]
  // }
  // ==========================================================

  const assessment =
    rawDetail?.data?.assessment ??
    rawDetail?.assessment ??
    null;

  const questions =
    rawDetail?.data?.questions ??
    rawDetail?.questions ??
    [];

  if (!assessment) {
    return (
      <main className="content">
        <div className="error-box">
          <strong>
            Assessment could not be loaded.
          </strong>

          <div
            style={{
              marginTop: 6,
            }}
          >
            {rawDetail?.error ??
              rawDetail?.message ??
              "Assessment details were not returned correctly."}
          </div>

          <div
            style={{
              marginTop: 18,
            }}
          >
            <Link
              className="button secondary"
              href="/assessments"
            >
              Back to assessments
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================================
  // 2. GET STUDENT PROGRESS
  // ==========================================================

  const {
    data: progressRpcData,
    error: progressRpcError,
  } = await supabase.rpc(
    "rpc_student_list_assessments"
  );

  if (progressRpcError) {
    console.error(
      "Progress RPC error:",
      progressRpcError
    );
  }

  const progressList =
    Array.isArray(progressRpcData)
      ? (progressRpcData as AssessmentProgress[])
      : [];

  const progress =
    progressList.find(
      (item) =>
        item.id === id ||
        item.assessment_id === id
    ) ?? null;

  const mcqCompleted =
    progress?.mcq_status ===
      "completed" ||
    progress?.attempt_status ===
      "mcq_submitted" ||
    progress?.attempt_status ===
      "written_uploaded" ||
    progress?.attempt_status ===
      "processing" ||
    progress?.attempt_status ===
      "reupload_required" ||
    progress?.attempt_status ===
      "review_required" ||
    progress?.attempt_status ===
      "marked";

  // ==========================================================
  // 3. IF ALREADY SUBMITTED, DON'T ALLOW RETAKE
  // ==========================================================

  if (mcqCompleted) {
    return (
      <main className="content">
        <div
          className="panel"
          style={{
            maxWidth: 760,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              display: "grid",
              placeItems: "center",
              background:
                "var(--sage-soft)",
              marginBottom: 18,
            }}
          >
            <CheckCircle2
              size={21}
            />
          </div>

          <div className="eyebrow">
            Section A
          </div>

          <h1>
            MCQ already submitted
          </h1>

          <p>
            Your Section A answers have
            already been submitted and
            marked. You cannot submit
            this section again.
          </p>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 22,
            }}
          >
            <Link
              className="button"
              href={`/assessments/${id}/quiz/result`}
            >
              View MCQ result
            </Link>

            <Link
              className="button secondary"
              href={`/assessments/${id}`}
            >
              Back to assessment
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================================
  // 4. FILTER MCQ QUESTIONS
  // ==========================================================

  const mcqs =
    questions.filter(
      (question) =>
        String(
          question.question_type ??
            ""
        )
          .trim()
          .toLowerCase() ===
        "mcq"
    );

  if (mcqs.length === 0) {
    return (
      <main className="content">
        <div className="error-box">
          <strong>
            Section A has no MCQ
            questions.
          </strong>

          <div
            style={{
              marginTop: 8,
            }}
          >
            The assessment loaded
            successfully, but no
            questions with
            question_type = "mcq"
            were returned.
          </div>

          <div
            style={{
              marginTop: 18,
            }}
          >
            <Link
              className="button secondary"
              href={`/assessments/${id}`}
            >
              Back to assessment
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================================
  // 5. GET OR CREATE ATTEMPT
  // ==========================================================

  const {
    data: attemptRpcData,
    error: attemptRpcError,
  } = await supabase.rpc(
    "rpc_student_get_or_create_attempt",
    {
      p_assessment_id: id,
    }
  );

  if (attemptRpcError) {
    return (
      <main className="content">
        <div className="error-box">
          <strong>
            Could not start the
            assessment.
          </strong>

          <div
            style={{
              marginTop: 6,
            }}
          >
            {attemptRpcError.message}
          </div>

          <div
            style={{
              marginTop: 18,
            }}
          >
            <Link
              className="button secondary"
              href={`/assessments/${id}`}
            >
              Back to assessment
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const rawAttempt = (
    Array.isArray(attemptRpcData)
      ? attemptRpcData[0]
      : attemptRpcData
  ) as AttemptResponse | null;

  // Support both flat and nested attempt RPC responses

  const attemptId =
    rawAttempt?.attempt_id ??
    rawAttempt?.id ??
    rawAttempt?.data?.attempt_id ??
    rawAttempt?.data?.id ??
    null;

  if (!attemptId) {
    return (
      <main className="content">
        <div className="error-box">
          <strong>
            Attempt could not be
            created.
          </strong>

          <div
            style={{
              marginTop: 6,
            }}
          >
            The assessment was loaded,
            but Supabase did not return
            an attempt ID.
          </div>

          <div
            style={{
              marginTop: 18,
            }}
          >
            <Link
              className="button secondary"
              href={`/assessments/${id}`}
            >
              Back to assessment
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================================
  // 6. PAGE
  // ==========================================================

  return (
    <main className="content">

      {/* ====================================================
          HEADER
      ==================================================== */}

      <div className="page-heading">
        <div>
          <div className="eyebrow">
            Section A
          </div>

          <h1>
            {assessment.title}
          </h1>

          <p>
            {mcqs.length} multiple-choice
            questions. Answer every
            question before submitting
            Section A.
          </p>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginTop: 12,
            }}
          >
            <span className="badge">
              <ListChecks
                size={13}
              />
              {mcqs.length} questions
            </span>

            <span className="badge">
              {mcqs.reduce(
                (
                  total,
                  question
                ) =>
                  total +
                  Number(
                    question.marks ??
                      0
                  ),
                0
              )}{" "}
              marks
            </span>
          </div>
        </div>

        <Link
          className="button secondary"
          href={`/assessments/${id}`}
        >
          <ArrowLeft
            size={16}
          />

          Back to paper
        </Link>
      </div>

      {/* ====================================================
          QUIZ INSTRUCTIONS
      ==================================================== */}

      <section
        className="panel"
        style={{
          marginBottom: 22,
        }}
      >
        <div className="eyebrow">
          Instructions
        </div>

        <h2
          style={{
            marginBottom: 8,
          }}
        >
          Complete Section A
        </h2>

        <p
          style={{
            marginBottom: 0,
          }}
        >
          Select one answer for every
          question. When you submit,
          your MCQs will be marked
          immediately and you will be
          taken to your Section A
          result.
        </p>
      </section>

      {/* ====================================================
          QUIZ
      ==================================================== */}

      <QuizForm
        assessmentId={id}
        attemptId={attemptId}
        questions={mcqs}
      />

    </main>
  );
}