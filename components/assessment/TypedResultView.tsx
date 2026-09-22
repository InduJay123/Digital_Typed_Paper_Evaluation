"use client";

import Link from "next/link";

import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Loader2,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

// ============================================================
// TYPES
// ============================================================

type WrittenResult = {
  question_id: string;

  question_number:
    | string
    | number;

  section?:
    | string
    | null;

  question_type?:
    | string
    | null;

  question_text: string;

  student_answer: string;

  awarded_marks: number;

  max_marks: number;

  feedback: string;

  marking_confidence:
    number;

  needs_review:
    boolean;

  matched_marking_points:
    unknown[];

  level_awarded:
    string;
};

type TypedResult = {
  ok: boolean;

  status: string;

  attempt_id?: string;

  assessment_id:
    string;

  summary?: {
    mcq_score?:
      number;

    mcq_max_marks?:
      number;

    written_score?:
      number;

    written_max_marks?:
      number;

    total_score?:
      number;

    total_max_marks?:
      number;

    percentage?:
      number;
  };

  written_results?:
    WrittenResult[];
};

// ============================================================
// COMPONENT
// ============================================================

export default function TypedResultView({
  assessmentId,
}: {
  assessmentId: string;
}) {
  const [result, setResult] =
    useState<
      TypedResult | null
    >(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // ==========================================================
  // LOAD RESULT
  // ==========================================================

  const loadResult =
    useCallback(
      async () => {
        const supabase =
          createClient();

        const {
          data,
          error,
        } =
          await supabase.rpc(
            "rpc_student_get_typed_result",
            {
              p_assessment_id:
                assessmentId,
            }
          );

        if (error) {
          setError(
            error.message
          );

          setLoading(
            false
          );

          return null;
        }

        const payload =
          data as TypedResult;

        setResult(
          payload
        );

        setError("");

        setLoading(
          false
        );

        return payload;
      },
      [assessmentId]
    );

  // ==========================================================
  // INITIAL LOAD + POLLING
  // ==========================================================

  useEffect(() => {
    let active =
      true;

    let timer:
      | ReturnType<
          typeof setTimeout
        >
      | null = null;

    async function poll() {
      const payload =
        await loadResult();

      if (!active) {
        return;
      }

      const status =
        String(
          payload?.status ||
            ""
        ).toLowerCase();

      const complete =
        [
          "marked",
          "completed",
          "finalized",
        ].includes(
          status
        );

      if (!complete) {
        timer =
          setTimeout(
            poll,
            3000
          );
      }
    }

    void poll();

    return () => {
      active = false;

      if (timer) {
        clearTimeout(
          timer
        );
      }
    };
  }, [loadResult]);

  // ==========================================================
  // DERIVED
  // ==========================================================

  const status =
    String(
      result?.status ||
        ""
    ).toLowerCase();

  const completed =
    [
      "marked",
      "completed",
      "finalized",
    ].includes(
      status
    );

  const summary =
    result?.summary;

  const results =
    result?.written_results ||
    [];

  const sectionB =
    useMemo(
      () =>
        results.filter(
          (item) =>
            Number(
              item.question_number
            ) <= 30
        ),
      [results]
    );

  const sectionC =
    useMemo(
      () =>
        results.filter(
          (item) =>
            Number(
              item.question_number
            ) >= 31
        ),
      [results]
    );

  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    loading &&
    !result
  ) {
    return (
      <div className="typed-result-processing">

        <Loader2
          className="written-spin"
          size={27}
        />

        <h1>
          Loading result
        </h1>

        <p>
          Please wait…
        </p>

      </div>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (
    error &&
    !result
  ) {
    return (
      <div className="error-box">
        {error}
      </div>
    );
  }

  // ==========================================================
  // AI MARKING IN PROGRESS
  // ==========================================================

  if (!completed) {
    return (
      <div className="typed-result-processing">

        <div className="typed-result-processing-icon">
          <Clock3
            size={25}
          />
        </div>

        <div className="eyebrow">
          AI marking
        </div>

        <h1>
          Marking your written
          answers…
        </h1>

        <p>
          Your answers have been
          submitted successfully.
          This page will update
          automatically when your
          result is ready.
        </p>

        <div className="typed-processing-line">
          <Loader2
            className="written-spin"
            size={15}
          />

          Checking for result
        </div>

      </div>
    );
  }

  // ==========================================================
  // FINAL RESULT
  // ==========================================================

  const totalScore =
    Number(
      summary?.total_score ??
        0
    );

  const totalMax =
    Number(
      summary?.total_max_marks ??
        100
    );

  const percentage =
    Number(
      summary?.percentage ??
        0
    );

  return (
    <div className="typed-result-page">

      {/* ====================================================
          SUMMARY
      ==================================================== */}

      <section className="typed-result-hero">

        <div>
          <div className="eyebrow">
            Assessment result
          </div>

          <h1>
            Marking complete
          </h1>

          <p>
            Review your score and
            feedback for every
            written question.
          </p>
        </div>

        <div className="typed-result-score">
          <strong>
            {totalScore}
          </strong>

          <span>
            / {totalMax}
          </span>

          <small>
            {percentage}%
          </small>
        </div>

      </section>

      {/* ====================================================
          SCORE CARDS
      ==================================================== */}

      <div className="typed-result-summary-grid">

        <ScoreCard
          label="Section A"
          title="MCQ"
          score={
            summary?.mcq_score
          }
          max={
            summary?.mcq_max_marks
          }
        />

        <ScoreCard
          label="Sections B & C"
          title="Written"
          score={
            summary?.written_score
          }
          max={
            summary?.written_max_marks
          }
        />

        <ScoreCard
          label="Overall"
          title="Total"
          score={
            summary?.total_score
          }
          max={
            summary?.total_max_marks
          }
        />

      </div>

      {/* ====================================================
          SECTION B
      ==================================================== */}

      {sectionB.length >
      0 ? (
        <ResultSection
          title="Section B"
          subtitle="Short and structured answers"
          results={
            sectionB
          }
        />
      ) : null}

      {/* ====================================================
          SECTION C
      ==================================================== */}

      {sectionC.length >
      0 ? (
        <ResultSection
          title="Section C"
          subtitle="Extended and essay answers"
          results={
            sectionC
          }
        />
      ) : null}

      <div className="typed-result-actions">

        <Link
          href="/assessments"
          className="button secondary"
        >
          Back to assessments
        </Link>

        <Link
          href="/results"
          className="button"
        >
          All results
        </Link>

      </div>

    </div>
  );
}

// ============================================================
// SCORE CARD
// ============================================================

function ScoreCard({
  label,
  title,
  score,
  max,
}: {
  label: string;
  title: string;
  score?:
    number;
  max?:
    number;
}) {
  return (
    <div className="typed-score-card">

      <span>
        {label}
      </span>

      <h3>
        {title}
      </h3>

      <strong>
        {Number(
          score ?? 0
        )}
        {" / "}
        {Number(
          max ?? 0
        )}
      </strong>

    </div>
  );
}

// ============================================================
// RESULT SECTION
// ============================================================

function ResultSection({
  title,
  subtitle,
  results,
}: {
  title: string;
  subtitle: string;
  results: WrittenResult[];
}) {
  return (
    <section className="typed-result-section">

      <div className="typed-result-section-heading">
        <div>
          <div className="eyebrow">
            {title}
          </div>

          <h2>
            {subtitle}
          </h2>
        </div>
      </div>

      <div className="typed-feedback-list">

        {results.map(
          (item) => (
            <article
              key={
                item.question_id
              }
              className="typed-feedback-card"
            >

              <div className="typed-feedback-top">

                <span>
                  Question{" "}
                  {
                    item.question_number
                  }
                </span>

                <strong>
                  {
                    item.awarded_marks
                  }
                  {" / "}
                  {
                    item.max_marks
                  }
                </strong>

              </div>

              <h3>
                {
                  item.question_text
                }
              </h3>

              <div className="typed-student-answer">

                <span>
                  Your answer
                </span>

                <p>
                  {item.student_answer ||
                    "No answer submitted."}
                </p>

              </div>

              <div className="typed-feedback-box">

                <span>
                  Feedback
                </span>

                <p>
                  {item.feedback ||
                    "No feedback available."}
                </p>

              </div>

              {item.level_awarded ? (
                <div className="typed-level">
                  {
                    item.level_awarded
                  }
                </div>
              ) : null}

              

            </article>
          )
        )}

      </div>

    </section>
  );
}