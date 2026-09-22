import Link from "next/link";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Layers3,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

type Assessment = {
  id: string;

  title: string;

  subject_code?: string | null;
  subject_name?: string | null;

  total_questions?: number | null;
  total_marks?: number | null;

  mcq_status?: string | null;
  written_status?: string | null;
  overall_status?: string | null;

  mcq_score?: number | null;
  mcq_max_marks?: number | null;

  written_score?: number | null;
  written_max_marks?: number | null;

  total_score?: number | null;
  total_max_marks?: number | null;

  percentage?: number | null;
};

type SubjectGroup = {
  code: string;
  name: string;

  total: number;
  completed: number;
  inProgress: number;

  assessments: Assessment[];
};

// ============================================================
// HELPERS
// ============================================================

function normalizeAssessments(
  raw: unknown
): Assessment[] {
  if (Array.isArray(raw)) {
    return raw as Assessment[];
  }

  const value = raw as any;

  if (Array.isArray(value?.data)) {
    return value.data;
  }

  if (
    Array.isArray(
      value?.assessments
    )
  ) {
    return value.assessments;
  }

  if (
    Array.isArray(
      value?.data?.assessments
    )
  ) {
    return value.data.assessments;
  }

  return [];
}

function statusOf(
  assessment: Assessment
) {
  return String(
    assessment.overall_status ||
      ""
  ).toLowerCase();
}

function isCompleted(
  assessment: Assessment
) {
  return [
    "completed",
    "marked",
    "finalized",
  ].includes(
    statusOf(assessment)
  );
}

function isInProgress(
  assessment: Assessment
) {
  const status =
    statusOf(assessment);

  if (
    [
      "in_progress",
      "started",
      "mcq_submitted",
      "written_submitted",
      "processing",
      "marking",
      "review_required",
    ].includes(status)
  ) {
    return true;
  }

  return (
    assessment.mcq_score !==
      null &&
    assessment.mcq_score !==
      undefined &&
    !isCompleted(assessment)
  );
}

function assessmentHref(
  id: string
) {
  return `/assessments/${encodeURIComponent(
    String(id).trim()
  )}`;
}

// ============================================================
// PAGE
// ============================================================

export default async function AssessmentsPage({
  searchParams,
}: {
  searchParams?: {
    subject?:
      | string
      | string[];
  };
}) {
  const supabase =
    createClient();

  // ==========================================================
  // LOAD ASSESSMENTS
  // ==========================================================

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "rpc_student_list_assessments"
    );

  if (error) {
    console.error(
      "rpc_student_list_assessments:",
      error
    );
  }

  const assessments =
    normalizeAssessments(
      data
    );

  // ==========================================================
  // SUBJECT QUERY PARAM
  // ==========================================================

  const rawSubject =
    searchParams?.subject;

  const selectedSubject =
    Array.isArray(rawSubject)
      ? rawSubject[0]
      : rawSubject ||
        null;

  // ==========================================================
  // GROUP BY SUBJECT
  // ==========================================================

  const subjectMap =
    new Map<
      string,
      Assessment[]
    >();

  for (
    const assessment of
    assessments
  ) {
    if (!assessment?.id) {
      continue;
    }

    const code =
      assessment.subject_code ||
      assessment.subject_name ||
      "OTHER";

    const existing =
      subjectMap.get(code) ||
      [];

    existing.push(
      assessment
    );

    subjectMap.set(
      code,
      existing
    );
  }

  const subjects: SubjectGroup[] =
    Array.from(
      subjectMap.entries()
    )
      .map(
        ([code, items]) => {
          const completed =
            items.filter(
              isCompleted
            ).length;

          const inProgress =
            items.filter(
              isInProgress
            ).length;

          return {
            code,

            name:
              items[0]
                ?.subject_name ||
              code,

            total:
              items.length,

            completed,

            inProgress,

            assessments:
              items,
          };
        }
      )
      .sort((a, b) =>
        a.name.localeCompare(
          b.name
        )
      );

  // ==========================================================
  // MODULE LIST
  // ==========================================================

  if (!selectedSubject) {
    return (
      <main className="content">

        <div className="page-heading">

          <div>

            <div className="eyebrow">
              Assessments
            </div>

            <h1>
              Your modules
            </h1>

            <p>
              Select a module to
              view its available
              assessment papers.
            </p>

          </div>

          <span className="badge yellow">
            {subjects.length}{" "}
            modules
          </span>

        </div>

        {error ? (
          <div className="error-box">
            {error.message}
          </div>
        ) : null}

        {!subjects.length ? (
          <div className="empty-state">
            No modules are
            available.
          </div>
        ) : (
          <div className="module-grid">

            {subjects.map(
              (subject) => (
                <article
                  className="module-card"
                  key={
                    subject.code
                  }
                >

                  <div className="module-card-content">

                    <h2>
                      {subject.name}
                    </h2>

                    <p>
                      {
                        subject.total
                      }{" "}
                      assessment{" "}
                      {subject.total ===
                      1
                        ? "paper"
                        : "papers"}
                    </p>

                  </div>

                  <div className="module-stats">

                    <div className="module-stat">

                      <Layers3
                        size={16}
                      />

                      <div>
                        <span>
                          Available
                        </span>

                        <strong>
                          {
                            subject.total
                          }
                        </strong>
                      </div>

                    </div>

                    <div className="module-stat">

                      <CheckCircle2
                        size={16}
                      />

                      <div>
                        <span>
                          Completed
                        </span>

                        <strong>
                          {
                            subject.completed
                          }
                        </strong>
                      </div>

                    </div>

                    <div className="module-stat">

                      <Clock3
                        size={16}
                      />

                      <div>
                        <span>
                          In progress
                        </span>

                        <strong>
                          {
                            subject.inProgress
                          }
                        </strong>
                      </div>

                    </div>

                  </div>

                  <Link
                    className="module-open-button"
                    href={`/assessments?subject=${encodeURIComponent(
                      subject.code
                    )}`}
                  >
                    Open{" "}
                    {subject.name}

                    <ArrowRight
                      size={17}
                    />
                  </Link>

                </article>
              )
            )}

          </div>
        )}

      </main>
    );
  }

  // ==========================================================
  // SELECTED SUBJECT
  // ==========================================================

  const subject =
    subjects.find(
      (item) =>
        item.code.toLowerCase() ===
        selectedSubject.toLowerCase()
    );

  if (!subject) {
    return (
      <main className="content">

        <Link
          href="/assessments"
          className="back-link"
        >
          <ArrowLeft
            size={16}
          />

          All modules
        </Link>

        <div
          className="error-box"
          style={{
            marginTop: 24,
          }}
        >
          Module not found.
        </div>

      </main>
    );
  }

  const subjectAssessments =
    subject.assessments;

  const completed =
    subjectAssessments.filter(
      isCompleted
    ).length;

  const active =
    subjectAssessments.filter(
      isInProgress
    ).length;

  // ==========================================================
  // PAPERS
  // ==========================================================

  return (
    <main className="content">

      <Link
        href="/assessments"
        className="back-link"
      >
        <ArrowLeft
          size={16}
        />

        All modules
      </Link>

      <div
        className="page-heading"
        style={{
          marginTop: 24,
        }}
      >

        <div>

          <div className="eyebrow">
            Module
          </div>

          <h1>
            {subject.name}
          </h1>

        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >

          <span className="badge">
            {
              subjectAssessments.length
            }{" "}
            available
          </span>

          <span className="badge warning">
            {active} in progress
          </span>

          <span className="badge good">
            {completed} completed
          </span>

        </div>

      </div>

      {!subjectAssessments.length ? (
        <div className="empty-state">
          No assessment papers are
          available.
        </div>
      ) : (
        <div className="grid grid-2">

          {subjectAssessments.map(
            (assessment) => {
              const completed =
                isCompleted(
                  assessment
                );

              const mcqCompleted =
                assessment.mcq_score !==
                  null &&
                assessment.mcq_score !==
                  undefined;

              const writtenCompleted =
                assessment.written_score !==
                  null &&
                assessment.written_score !==
                  undefined &&
                completed;

              return (
                <article
                  className="assessment-card"
                  key={
                    assessment.id
                  }
                >

                  <div className="assessment-card-head">

                    <div>

                      <div className="eyebrow">
                        {assessment.subject_name ||
                          subject.name}
                      </div>

                      <h2
                        style={{
                          fontSize: 24,
                        }}
                      >
                        {
                          assessment.title
                        }
                      </h2>

                      <div className="helper-text">
                        {assessment.total_questions ??
                          35}{" "}
                        questions ·{" "}
                        {assessment.total_marks ??
                          100}{" "}
                        marks
                      </div>

                    </div>

                    <span
                      className={`badge ${
                        completed
                          ? "good"
                          : isInProgress(
                                assessment
                              )
                            ? "warning"
                            : ""
                      }`}
                    >
                      {pretty(
                        assessment.overall_status ||
                          "not_started"
                      )}
                    </span>

                  </div>

                  <div className="score-line">

                    <Mini
                      label="MCQ"
                      value={
                        mcqCompleted
                          ? `${assessment.mcq_score ?? 0}/${assessment.mcq_max_marks ?? 20}`
                          : "Not completed"
                      }
                      percentage={pct(
                        Number(
                          assessment.mcq_score ??
                            0
                        ),
                        Number(
                          assessment.mcq_max_marks ??
                            20
                        )
                      )}
                    />

                    <Mini
                      label="Written"
                      value={
                        writtenCompleted
                          ? `${assessment.written_score ?? 0}/${assessment.written_max_marks ?? 80}`
                          : pretty(
                              assessment.written_status ||
                                "not_submitted"
                            )
                      }
                      percentage={pct(
                        Number(
                          assessment.written_score ??
                            0
                        ),
                        Number(
                          assessment.written_max_marks ??
                            80
                        )
                      )}
                    />

                    <Mini
                      label="Overall"
                      value={
                        completed
                          ? `${assessment.total_score ?? 0}/${assessment.total_max_marks ?? 100}`
                          : "Pending"
                      }
                      percentage={Number(
                        assessment.percentage ??
                          0
                      )}
                    />

                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >

                    <Link
                      className="button secondary"
                      href={assessmentHref(
                        assessment.id
                      )}
                    >
                      {statusOf(
                        assessment
                      ) ===
                      "not_started"
                        ? "Start assessment"
                        : "Open assessment"}

                      <ArrowRight
                        size={16}
                      />
                    </Link>

                    {completed ? (
                      <Link
                        className="button soft"
                        href={`${assessmentHref(
                          assessment.id
                        )}/results`}
                      >
                        View result
                      </Link>
                    ) : null}

                  </div>

                </article>
              );
            }
          )}

        </div>
      )}

    </main>
  );
}

// ============================================================
// MINI SCORE
// ============================================================

function Mini({
  label,
  value,
  percentage,
}: {
  label: string;
  value: string;
  percentage: number;
}) {
  return (
    <div className="score-mini">

      <span className="helper-text">
        {label}
      </span>

      <strong>
        {value}
      </strong>

      <div className="bar">

        <span
          style={{
            width: `${Math.max(
              0,
              Math.min(
                100,
                percentage
              )
            )}%`,
          }}
        />

      </div>

    </div>
  );
}

// ============================================================
// HELPERS
// ============================================================

function pct(
  score: number,
  max: number
) {
  return max > 0
    ? Math.round(
        (score / max) *
          100
      )
    : 0;
}

function pretty(
  value?: string | null
) {
  const text =
    String(
      value || ""
    ).trim();

  if (!text) {
    return "Not started";
  }

  return text
    .replaceAll(
      "_",
      " "
    )
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
}